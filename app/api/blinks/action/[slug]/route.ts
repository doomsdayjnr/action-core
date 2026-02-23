import { NextRequest } from 'next/server';
import { 
  ActionPostResponse, 
  ACTIONS_CORS_HEADERS, 
  createPostResponse, 
  ActionGetResponse, 
  ActionPostRequest,
  LinkedAction
} from "@solana/actions";
import { 
  PublicKey, 
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  TransactionInstruction
} from "@solana/web3.js";
import {
  createTransferInstruction,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAccount
} from "@solana/spl-token";
import { prisma } from '../../../../../lib/prisma';
import { redis } from '../../../../../lib/redis';
import { getConnection } from '../../../../../lib/solana';

const MYRA_FEE_WALLET = new PublicKey(process.env.MYRA_FEE_WALLET || '11111111111111111111111111111111');
const SERVICE_FEE_PERCENT = 0.01;

// USDC mint address
const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');

type PhysicalFormData = {
  email: string;
  name: string;
  address: string;
  phone?: string;
};

function generateOrderId(): string {
  return `AC-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
}

async function checkRateLimit(walletAddress: string): Promise<boolean> {
  const key = `rate_limit:${walletAddress}`;
  const current = await redis.incr(key);
  if (current === 1) {
    await redis.expire(key, 60);
  }
  return current <= 5;
}

/**
 * GET: Return Blink metadata for Solana Actions
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const blink = await prisma.blink.findUnique({
      where: { slug },
      include: {
        merchant: { include: { subscription: true } },
        token: true
      }
    });

    if (!blink || !blink.active) {
      return Response.json(
        { 
          title: "Not Found",
          icon: "https://memelend.tech/error.png",
          description: "This Blink is no longer available.",
          label: "Unavailable",
          disabled: true
        } as ActionGetResponse,
        { status: 404, headers: ACTIONS_CORS_HEADERS }
      );
    }

    // Build action links
    const links: { actions: LinkedAction[] } = {
      actions: []
    };

    const baseUrl = `/api/blinks/action/${slug}`;

    if (blink.actionType === 'PHYSICAL') {
      links.actions = [{
        type: 'post',
        label: `Buy for ${blink.amount} ${blink.currency}`,
        href: baseUrl,
        parameters: [
          { name: "email", label: "Email Address", required: true },
          { name: "name", label: "Full Name", required: true },
          { name: "address", label: "Shipping Address", required: true },
          { name: "phone", label: "Phone Number", required: false }
        ]
      }];
    } else {
      // Simple payment
      links.actions = [{
        type: 'post',
        label: blink.label || `Pay ${blink.amount} ${blink.currency}`,
        href: baseUrl
      }];
    }

    const payload: ActionGetResponse = {
      title: blink.title,
      icon: blink.icon || blink.imageUrl || 'https://memelend.tech/default.png',
      description: blink.description,
      label: blink.label || `Pay ${blink.amount} ${blink.currency}`,
      links
    };

    return Response.json(payload, { headers: ACTIONS_CORS_HEADERS });

  } catch (error) {
    console.error('[Blink Action GET] Error:', error);
    return Response.json(
      { 
        title: "Error",
        icon: "https://memelend.tech/error.png",
        description: "Failed to load Blink.",
        label: "Error",
        disabled: true
      } as ActionGetResponse,
      { status: 500, headers: ACTIONS_CORS_HEADERS }
    );
  }
}

/**
 * POST: Create transaction for the Blink
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const body: ActionPostRequest = await request.json();
    const account = new PublicKey(body.account);
    const { slug } = await params;

    const blink = await prisma.blink.findUnique({
      where: { slug },
      include: {
        merchant: { include: { subscription: true } },
        token: true
      }
    });

    if (!blink || !blink.active) {
      return Response.json({ message: "Blink not found" }, { status: 404, headers: ACTIONS_CORS_HEADERS });
    }

    // Rate limiting
    const walletAddress = account.toString();
    if (!(await checkRateLimit(walletAddress))) {
      return Response.json({ message: "Rate limit exceeded" }, { status: 429, headers: ACTIONS_CORS_HEADERS });
    }

    // Extract shipping details if physical
    let customerEmail, shippingName, shippingAddress, shippingPhone;
    if (blink.actionType === 'PHYSICAL' && body.data) {
      const form = body.data as unknown as PhysicalFormData;

      customerEmail = form.email;
      shippingName = form.name;
      shippingAddress = form.address;
      shippingPhone = form.phone;

      if (!customerEmail || !shippingName || !shippingAddress) {
        return Response.json({ message: "Missing shipping information" }, { status: 400, headers: ACTIONS_CORS_HEADERS });
      }
    }

    const orderIdMemo = generateOrderId();
    const totalAmount = blink.amount;
    const feeAmount = totalAmount * SERVICE_FEE_PERCENT;
    const merchantAmount = totalAmount - feeAmount;

    // Create order
    const order = await prisma.order.create({
      data: {
        merchantId: blink.merchantId,
        blinkId: blink.id,
        customerWallet: walletAddress,
        customerEmail: customerEmail || null,
        shippingName: shippingName || null,
        shippingAddress: shippingAddress || null,
        shippingPhone: shippingPhone || null,
        amount: totalAmount,
        currency: blink.currency,
        tokenMintId: blink.tokenMintId,
        tokenDecimals: blink.token?.decimals || (blink.currency === 'USDC' ? 6 : 9),
        feeAmount,
        merchantAmount,
        orderIdMemo,
        status: "PENDING"
      }
    });

    // Build transaction
    const merchantWallet = new PublicKey(blink.merchant.payoutAddress || blink.merchant.walletAddress);
    const transaction = new Transaction();

    if (blink.currency === 'SOL') {
      // SOL transfer
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: account,
          toPubkey: merchantWallet,
          lamports: Math.round(merchantAmount * LAMPORTS_PER_SOL)
        })
      );
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: account,
          toPubkey: MYRA_FEE_WALLET,
          lamports: Math.round(feeAmount * LAMPORTS_PER_SOL)
        })
      );
    } else if (blink.currency === 'USDC') {
      // USDC SPL token transfer
      const mint = USDC_MINT;
      const decimals = 6;
      
      // Calculate amounts with decimals
      const totalAmountRaw = Math.round(totalAmount * Math.pow(10, decimals));
      const merchantAmountRaw = Math.round(merchantAmount * Math.pow(10, decimals));
      const feeAmountRaw = totalAmountRaw - merchantAmountRaw; // Avoid rounding errors

      // Get token accounts
      const buyerATA = await getAssociatedTokenAddress(mint, account);
      const merchantATA = await getAssociatedTokenAddress(mint, merchantWallet);
      const feeATA = await getAssociatedTokenAddress(mint, MYRA_FEE_WALLET);

      // Check if buyer has USDC account
      try {
        const connection = getConnection();
        await getAccount(connection, buyerATA);
      } catch {
        return Response.json({ 
          message: "You don't have a USDC token account. Please create one first." 
        }, { status: 400, headers: ACTIONS_CORS_HEADERS });
      }

      // Create merchant ATA if needed
      try {
        const connection = getConnection();
        await getAccount(connection, merchantATA);
      } catch {
        transaction.add(
          createAssociatedTokenAccountInstruction(
            account,
            merchantATA,
            merchantWallet,
            mint
          )
        );
      }

      // Create fee ATA if needed
      try {
        const connection = getConnection();
        await getAccount(connection, feeATA);
      } catch {
        transaction.add(
          createAssociatedTokenAccountInstruction(
            account,
            feeATA,
            MYRA_FEE_WALLET,
            mint
          )
        );
      }

      // Transfer to merchant (99%)
      transaction.add(
        createTransferInstruction(
          buyerATA,
          merchantATA,
          account,
          merchantAmountRaw
        )
      );

      // Transfer fee to platform (1%)
      transaction.add(
        createTransferInstruction(
          buyerATA,
          feeATA,
          account,
          feeAmountRaw
        )
      );

    } else {
      return Response.json({ message: `${blink.currency} payments not yet supported` }, { status: 501, headers: ACTIONS_CORS_HEADERS });
    }

    // Add memo with order ID
    const memoProgram = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");
    transaction.add(
      new TransactionInstruction({
        keys: [],
        programId: memoProgram,
        data: Buffer.from(`AC:${orderIdMemo}`)
      })
    );

    transaction.feePayer = account;
    const connection = getConnection();
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;

    const payload: ActionPostResponse = await createPostResponse({
      fields: {
        type: "transaction",
        transaction,
        message: `Order ${orderIdMemo} created! Complete payment of ${totalAmount} ${blink.currency}.`,
      },
    });

    // Store pending order
    await redis.setex(
      `order_pending:${orderIdMemo}`,
      600,
      JSON.stringify({ orderId: order.id, merchantId: blink.merchantId })
    );

    return Response.json(payload, { headers: ACTIONS_CORS_HEADERS });

  } catch (error: any) {
    console.error('[Blink Action POST] Error:', error);
    return Response.json(
      { message: error.message || "Internal server error" },
      { status: 500, headers: ACTIONS_CORS_HEADERS }
    );
  }
}

export const OPTIONS = async () => {
  return new Response(null, { headers: ACTIONS_CORS_HEADERS });
};
