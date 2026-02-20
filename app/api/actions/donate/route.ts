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
  SystemProgram, 
  Transaction, 
  LAMPORTS_PER_SOL,
  TransactionInstruction
} from "@solana/web3.js";
import { prisma } from "../../../../lib/prisma";
import { redis } from "../../../../lib/redis";
import { getConnection } from "../../../../lib/solana";

// Your Fee Wallet (Environment Variable)
const MYRA_FEE_WALLET = new PublicKey(process.env.MYRA_FEE_WALLET!);

// Service fee percentage (1% = 0.01)
const SERVICE_FEE_PERCENT = 0.01;

// Cache TTL for GET responses (300 seconds = 5 minutes)
const CACHE_TTL = 300;

// Rate limiting: 5 requests per minute per wallet
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW = 60; // seconds

type PhysicalFormData = {
  email: string;
  name: string;
  address: string;
  phone?: string;
};

/**
 * Generate a unique order ID for memo field
 */
function generateOrderId(): string {
  return `AC-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
}

/**
 * Rate limiting check using Redis
 */
async function checkRateLimit(walletAddress: string): Promise<boolean> {
  const key = `rate_limit:${walletAddress}`;
  const current = await redis.incr(key);
  
  // Set expiry on first request
  if (current === 1) {
    await redis.expire(key, RATE_LIMIT_WINDOW);
  }
  
  return current <= RATE_LIMIT_MAX;
}

// 1. GET: Display the Blink Metadata
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const apiKey = url.searchParams.get("apiKey");
    const isPhysical = url.searchParams.get("type") === "physical";

    // Validate API Key
    if (!apiKey) {
      return Response.json(
        { 
          title: "Error",
          icon: "https://actioncore.com/error-icon.png",
          description: "Missing API Key. Please provide a valid merchant API key.",
          label: "Invalid Configuration",
          disabled: true
        } as ActionGetResponse,
        { status: 400, headers: ACTIONS_CORS_HEADERS }
      );
    }

    // Check cache first
    const cacheKey = `blink_metadata:${apiKey}:${isPhysical}`;
    const cached = await redis.get(cacheKey);
    if (cached) {
      return Response.json(JSON.parse(cached), { headers: ACTIONS_CORS_HEADERS });
    }

    // Fetch merchant data
    const merchant = await prisma.merchant.findUnique({
      where: { apiKey },
      include: { subscription: true }
    });

    if (!merchant) {
      return Response.json(
        { 
          title: "Merchant Not Found",
          icon: "https://actioncore.com/error-icon.png",
          description: "Invalid API Key. Please check your configuration.",
          label: "Invalid API Key",
          disabled: true
        } as ActionGetResponse,
        { status: 404, headers: ACTIONS_CORS_HEADERS }
      );
    }

    // Check subscription
    if (!merchant.subscription || merchant.subscription.status !== 'ACTIVE') {
      return Response.json(
        { 
          title: "Subscription Inactive",
          icon: "https://actioncore.com/error-icon.png",
          description: "This merchant's subscription is inactive. Please visit ActionCore.com to renew.",
          label: "Subscription Expired",
          disabled: true
        } as ActionGetResponse,
        { status: 403, headers: ACTIONS_CORS_HEADERS }
      );
    }

    // Build action links
    const links: { actions: LinkedAction[] } = {
      actions: []
    };

    if (isPhysical) {
      // Physical product: collect shipping details
      links.actions = [
        {
          type: "post",
          label: "Buy Now",
          href: `/api/actions/donate?apiKey=${apiKey}&type=physical`,
          parameters: [
            {
              name: "email",
              label: "Email Address",
              required: true
            },
            {
              name: "name",
              label: "Full Name",
              required: true
            },
            {
              name: "address",
              label: "Shipping Address",
              required: true
            },
            {
              name: "phone",
              label: "Phone Number",
              required: false
            }
          ]
        }
      ];
    } else {
      // Digital/standard donation
      links.actions = [
        {
          type: "post",
          label: "Donate 0.1 SOL",
          href: `/api/actions/donate?apiKey=${apiKey}`
        }
      ];
    }

    const payload: ActionGetResponse = {
      title: isPhysical ? "Buy Physical Product" : "Support Content Creator",
      icon: "https://your-icon-url.png",
      description: isPhysical 
        ? `Purchase this item from ${merchant.walletAddress.slice(0, 4)}...${merchant.walletAddress.slice(-4)}. Shipping details required.`
        : `Support this creator with a small SOL donation.`,
      label: isPhysical ? "Buy Product" : "Donate 0.1 SOL",
      links
    };

    // Cache the response
    await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(payload));

    // Track click analytics
    await redis.incr(`clicks:${apiKey}`);

    return Response.json(payload, { headers: ACTIONS_CORS_HEADERS });

  } catch (error) {
    console.error("[ActionCore] GET Error:", error);
    return Response.json(
      { 
        title: "Error",
        icon: "https://actioncore.com/error-icon.png",
        description: "An unexpected error occurred. Please try again.",
        label: "Error",
        disabled: true
      } as ActionGetResponse,
      { status: 500, headers: ACTIONS_CORS_HEADERS }
    );
  }
}

export const OPTIONS = async () =>
  new Response(null, { headers: ACTIONS_CORS_HEADERS });


// 2. POST: Handle the Transaction
export async function POST(req: Request) {
  try {
    const body: ActionPostRequest = await req.json();
    const account = new PublicKey(body.account);
    
    // Extract API Key
    const url = new URL(req.url);
    const apiKey = url.searchParams.get("apiKey");
    const isPhysical = url.searchParams.get("type") === "physical";

    if (!apiKey) {
      return Response.json(
        { message: "Missing API Key" },
        { status: 400, headers: ACTIONS_CORS_HEADERS }
      );
    }

    // Rate limiting check
    const walletAddress = account.toString();
    const isRateLimited = await checkRateLimit(walletAddress);
    if (!isRateLimited) {
      return Response.json(
        { message: "Rate limit exceeded. Please try again in a minute." },
        { status: 429, headers: ACTIONS_CORS_HEADERS }
      );
    }

    // Fetch merchant with subscription
    const merchant = await prisma.merchant.findUnique({
      where: { apiKey },
      include: { subscription: true }
    });

    if (!merchant) {
      return Response.json(
        { message: "Merchant not found" },
        { status: 404, headers: ACTIONS_CORS_HEADERS }
      );
    }

    if (!merchant.subscription || merchant.subscription.status !== 'ACTIVE') {
      return Response.json(
        { message: "Merchant subscription inactive. Visit ActionCore.com" },
        { status: 403, headers: ACTIONS_CORS_HEADERS }
      );
    }

    // Extract shipping details for physical products
    let customerEmail: string | undefined;
    let shippingName: string | undefined;
    let shippingAddress: string | undefined;
    let shippingPhone: string | undefined;

    if (isPhysical && body.data) {
      const form = body.data as unknown as PhysicalFormData;

      customerEmail = form.email;
      shippingName = form.name;
      shippingAddress = form.address;
      shippingPhone = form.phone;

      if (!customerEmail || !shippingName || !shippingAddress) {
        return Response.json(
          { message: "Missing required shipping information" },
          { status: 400, headers: ACTIONS_CORS_HEADERS }
        );
      }
    }

    // Generate unique order ID
    const orderIdMemo = generateOrderId();

    // Transaction amount (hardcoded 0.1 SOL for this demo - would come from Blink config)
    const totalAmount = 0.1;
    const feeAmount = totalAmount * SERVICE_FEE_PERCENT;
    const merchantAmount = totalAmount - feeAmount;

    // Create PENDING order record BEFORE transaction
    const order = await prisma.order.create({
      data: {
        merchantId: merchant.id,
        blinkId: "demo-blink-id", // Would come from Blink lookup
        customerWallet: walletAddress,
        customerEmail: customerEmail || null,
        shippingAddress: shippingAddress || null,
        shippingName: shippingName || null,
        shippingPhone: shippingPhone || null,
        amount: totalAmount,
        currency: "SOL",
        feeAmount: feeAmount,
        merchantAmount: merchantAmount,
        orderIdMemo: orderIdMemo,
        status: "PENDING"
      }
    });

    console.log(`[ActionCore] Created PENDING order: ${order.id} (${orderIdMemo})`);

    // Build Transaction
    const transaction = new Transaction();
    
    // Get merchant payout address
    const merchantWallet = new PublicKey(merchant.payoutAddress || merchant.walletAddress);

    // Instruction 1: Merchant's Cut (99%)
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: account,
        toPubkey: merchantWallet, 
        lamports: Math.round(merchantAmount * LAMPORTS_PER_SOL),
      })
    );

    // Instruction 2: Myra Service Fee (1%)
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: account,
        toPubkey: MYRA_FEE_WALLET,
        lamports: Math.round(feeAmount * LAMPORTS_PER_SOL),
      })
    );

    // Instruction 3: Memo with Order ID (for tracking)
    // This allows us to match on-chain payments to orders
    const memoProgram = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");
    transaction.add(
      new TransactionInstruction({
        keys: [],
        programId: memoProgram,
        data: Buffer.from(`AC:${orderIdMemo}`)
      })
    );

    // Set transaction properties
    transaction.feePayer = account;
    const connection = getConnection();
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;

    // Create the response with transaction
    const payload: ActionPostResponse = await createPostResponse({
      fields: {
        type: "transaction",
        transaction,
        message: isPhysical 
          ? `Order ${orderIdMemo} created! Complete payment to confirm your purchase.`
          : `Thanks for supporting ${merchant.walletAddress.slice(0, 4)}...${merchant.walletAddress.slice(-4)}!`,
      },
    });

    // Store order reference for confirmation webhook
    await redis.setex(
      `order_pending:${orderIdMemo}`,
      600, // 10 minute expiry
      JSON.stringify({
        orderId: order.id,
        merchantId: merchant.id,
        amount: totalAmount,
        customerWallet: walletAddress
      })
    );

    return Response.json(payload, { headers: ACTIONS_CORS_HEADERS });

  } catch (error) {
    console.error("[ActionCore] POST Error:", error);
    return Response.json(
      { message: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500, headers: ACTIONS_CORS_HEADERS }
    );
  }
}
