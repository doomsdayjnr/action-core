import { NextRequest } from 'next/server';
import { 
  ActionPostResponse, 
  ACTIONS_CORS_HEADERS, 
  createPostResponse, 
  ActionGetResponse, 
  ActionPostRequest,
  LinkedAction
} from "@solana/actions";
import { prisma } from '../../../../../lib/prisma';
import { redis } from '../../../../../lib/redis';
import { getConnection } from '../../../../../lib/solana';
import { buildSPLTokenTransaction, getTokenDecimals } from '../../../../../lib/spl-token';
import { PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";

const MYRA_FEE_WALLET = new PublicKey(process.env.MYRA_FEE_WALLET!);
const SERVICE_FEE_PERCENT = 0.01;

type ServiceData = {
  email?: string;
  name?: string;
  address?: string;
  phone?: string;
  amount?: string;
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
 * GET: Serve Solana Actions metadata for a Direct Blink
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params;

    const blink = await prisma.blink.findUnique({
      where: { slug },
      include: {
        merchant: {
          include: { subscription: true }
        },
        token: true
      }
    });

    if (!blink || !blink.active) {
      return Response.json(
        { 
          title: "Not Found",
          icon: "https://actioncore.com/error.png",
          description: "This Blink is no longer available.",
          label: "Unavailable",
          disabled: true
        } as ActionGetResponse,
        { status: 404, headers: ACTIONS_CORS_HEADERS }
      );
    }

    if (!blink.merchant.subscription || blink.merchant.subscription.status !== 'ACTIVE') {
      return Response.json(
        { 
          title: "Inactive",
          icon: "https://actioncore.com/error.png",
          description: "Merchant subscription is inactive.",
          label: "Unavailable",
          disabled: true
        } as ActionGetResponse,
        { status: 403, headers: ACTIONS_CORS_HEADERS }
      );
    }

    // Build action links based on type
    const links: { actions: LinkedAction[] } = {
      actions: []
    };

    const baseUrl = `/api/blinks/action/${slug}`;

    if (blink.actionType === 'PHYSICAL') {
      links.actions = [{
        type: "post",
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
      // Simple payment (TOKEN, DONATION, TRANSFER)
      links.actions = [{
        type: "post",
        label: blink.label || `Pay ${blink.amount} ${blink.currency}`,
        href: baseUrl
      }];
    }

    const payload: ActionGetResponse = {
      title: blink.title,
      icon: blink.icon,
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
        icon: "https://actioncore.com/error.png",
        description: "Failed to load Blink.",
        label: "Error",
        disabled: true
      } as ActionGetResponse,
      { status: 500, headers: ACTIONS_CORS_HEADERS }
    );
  }
}

/**
 * POST: Handle payment for a Direct Blink
 */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const body: ActionPostRequest = await req.json();
    const account = new PublicKey(body.account);
    const { slug } = await context.params;

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

      const form = body.data as unknown as ServiceData;

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
        tokenDecimals: blink.token?.decimals || 9,
        feeAmount,
        merchantAmount,
        orderIdMemo,
        status: "PENDING"
      }
    });

    // Build transaction
    const merchantWallet = new PublicKey(blink.merchant.payoutAddress || blink.merchant.walletAddress);
    let transaction: Transaction;

    if (blink.currency === 'SOL') {
      // SOL transfer
      transaction = new Transaction();
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
    } else if (blink.token) {
      // SPL token transfer
      transaction = await buildSPLTokenTransaction(
        account,
        merchantWallet,
        MYRA_FEE_WALLET,
        blink.token.mintAddress,
        totalAmount,
        blink.token.decimals,
        `AC:${orderIdMemo}`
      );
    } else {
      return Response.json({ message: "Invalid currency configuration" }, { status: 500, headers: ACTIONS_CORS_HEADERS });
    }

    transaction.feePayer = account;
    const connection = getConnection();
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;

    const payload: ActionPostResponse = await createPostResponse({
      fields: {
        type: "transaction",
        transaction,
        message: `Order ${orderIdMemo} created! Complete payment.`,
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
