export const runtime = "nodejs";
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
  Transaction
} from "@solana/web3.js";
import { prisma } from "../../../../lib/prisma";
import { redis } from "../../../../lib/redis";
import { connection } from "../../../../lib/solana";
import { 
  buildSPLTokenTransaction,
  getTokenDecimals,
  getTokenPriceUSD,
  COMMON_TOKENS 
} from "../../../../lib/spl-token";

// Your Fee Wallet
const MYRA_FEE_WALLET = new PublicKey(process.env.MYRA_FEE_WALLET!);

// Service fee percentage (1% = 0.01)
const SERVICE_FEE_PERCENT = 0.01;

// Cache TTL for GET responses (300 seconds = 5 minutes)
const CACHE_TTL = 300;

// Rate limiting: 5 requests per minute per wallet
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW = 60; // seconds

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
  
  if (current === 1) {
    await redis.expire(key, RATE_LIMIT_WINDOW);
  }
  
  return current <= RATE_LIMIT_MAX;
}

/**
 * GET: Display SPL Token Payment Blink
 * Supports meme tokens, USDC, any SPL token
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const apiKey = url.searchParams.get("apiKey");
    const tokenSymbol = url.searchParams.get("token") || "USDC"; // Default to USDC
    const isPhysical = url.searchParams.get("type") === "physical";

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
    const cacheKey = `blink_token:${apiKey}:${tokenSymbol}:${isPhysical}`;
    const cached = await redis.get(cacheKey);
    if (cached) {
      return Response.json(JSON.parse(cached), { headers: ACTIONS_CORS_HEADERS });
    }

    // Fetch merchant
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

    // Find token info
    let token = await prisma.token.findUnique({
      where: { symbol: tokenSymbol.toUpperCase() }
    });

    // If not in DB, try common tokens
    let mintAddress = token?.mintAddress;
    if (!mintAddress && tokenSymbol.toUpperCase() === 'USDC') {
      mintAddress = COMMON_TOKENS.USDC;
    }

    if (!mintAddress) {
      return Response.json(
        { 
          title: "Token Not Supported",
          icon: "https://actioncore.com/error-icon.png",
          description: `Token ${tokenSymbol} is not supported. Please contact support.`,
          label: "Unsupported Token",
          disabled: true
        } as ActionGetResponse,
        { status: 400, headers: ACTIONS_CORS_HEADERS }
      );
    }

    // Get token price for display
    const tokenPrice = await getTokenPriceUSD(mintAddress);
    const priceDisplay = tokenPrice ? `($${tokenPrice.toFixed(4)} USD)` : '';

    // Build action links
    const links: { actions: LinkedAction[] } = {
      actions: []
    };

    const tokenParam = `&token=${tokenSymbol}`;
    
    if (isPhysical) {
      links.actions = [
        {
          label: `Pay 100 ${tokenSymbol} ${priceDisplay}`,
          href: `/api/actions/spl-token?apiKey=${apiKey}${tokenParam}&type=physical`,
          parameters: [
            { name: "email", label: "Email Address", required: true },
            { name: "name", label: "Full Name", required: true },
            { name: "address", label: "Shipping Address", required: true },
            { name: "phone", label: "Phone Number", required: false }
          ]
        }
      ];
    } else {
      // Digital/meme token payment
      links.actions = [
        {
          label: `Send 100 ${tokenSymbol} ${priceDisplay}`,
          href: `/api/actions/spl-token?apiKey=${apiKey}${tokenParam}`,
          parameters: [
            { name: "amount", label: `Amount (${tokenSymbol})`, required: true }
          ]
        }
      ];
    }

    const payload: ActionGetResponse = {
      title: isPhysical 
        ? `Buy with ${tokenSymbol}` 
        : `Pay with ${tokenSymbol}`,
      icon: token?.logoUrl || "https://actioncore.com/token-icon.png",
      description: isPhysical 
        ? `Purchase this item using ${tokenSymbol}. ${priceDisplay}`
        : `Send ${tokenSymbol} tokens. ${priceDisplay}`,
      label: `Pay with ${tokenSymbol}`,
      links
    };

    // Cache the response
    await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(payload));

    return Response.json(payload, { headers: ACTIONS_CORS_HEADERS });

  } catch (error) {
    console.error("[ActionCore SPL] GET Error:", error);
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

export const OPTIONS = GET;

/**
 * POST: Handle SPL Token Transaction
 * Supports USDC, meme tokens, any SPL token
 */
export async function POST(req: Request) {
  try {
    const body: ActionPostRequest = await req.json();
    const account = new PublicKey(body.account);
    
    // Extract params
    const url = new URL(req.url);
    const apiKey = url.searchParams.get("apiKey");
    const tokenSymbol = url.searchParams.get("token") || "USDC";
    const isPhysical = url.searchParams.get("type") === "physical";
    const customAmount = body.data?.amount as string;

    if (!apiKey) {
      return Response.json(
        { message: "Missing API Key" },
        { status: 400, headers: ACTIONS_CORS_HEADERS }
      );
    }

    // Rate limiting
    const walletAddress = account.toString();
    const isRateLimited = await checkRateLimit(walletAddress);
    if (!isRateLimited) {
      return Response.json(
        { message: "Rate limit exceeded. Please try again in a minute." },
        { status: 429, headers: ACTIONS_CORS_HEADERS }
      );
    }

    // Fetch merchant
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

    // Get token info
    let token = await prisma.token.findUnique({
      where: { symbol: tokenSymbol.toUpperCase() }
    });

    let mintAddress = token?.mintAddress;
    let decimals = token?.decimals ?? 6;

    // Default to USDC if not in DB
    if (!mintAddress && tokenSymbol.toUpperCase() === 'USDC') {
      mintAddress = COMMON_TOKENS.USDC;
      decimals = 6;
    }

    if (!mintAddress) {
      return Response.json(
        { message: `Token ${tokenSymbol} not supported` },
        { status: 400, headers: ACTIONS_CORS_HEADERS }
      );
    }

    // Get decimals from chain if not in DB
    if (!token?.decimals) {
      decimals = await getTokenDecimals(mintAddress);
    }

    // Extract shipping/customer details
    let customerEmail: string | undefined;
    let shippingName: string | undefined;
    let shippingAddress: string | undefined;
    let shippingPhone: string | undefined;

    if (isPhysical && body.data) {
      customerEmail = body.data.email as string;
      shippingName = body.data.name as string;
      shippingAddress = body.data.address as string;
      shippingPhone = body.data.phone as string;

      if (!customerEmail || !shippingName || !shippingAddress) {
        return Response.json(
          { message: "Missing required shipping information" },
          { status: 400, headers: ACTIONS_CORS_HEADERS }
        );
      }
    }

    // Determine amount (custom or default 100 tokens)
    const amount = customAmount ? parseFloat(customAmount) : 100;
    if (isNaN(amount) || amount <= 0) {
      return Response.json(
        { message: "Invalid amount" },
        { status: 400, headers: ACTIONS_CORS_HEADERS }
      );
    }

    // Generate unique order ID
    const orderIdMemo = generateOrderId();

    // Calculate amounts with fee split
    const totalAmount = amount;
    const feeAmount = totalAmount * SERVICE_FEE_PERCENT;
    const merchantAmount = totalAmount - feeAmount;

    // Create PENDING order
    const order = await prisma.order.create({
      data: {
        merchantId: merchant.id,
        blinkId: "spl-token-blink", // Would be dynamic
        customerWallet: walletAddress,
        customerEmail: customerEmail || null,
        shippingAddress: shippingAddress || null,
        shippingName: shippingName || null,
        shippingPhone: shippingPhone || null,
        amount: totalAmount,
        currency: tokenSymbol.toUpperCase(),
        tokenMintId: token?.id || null,
        tokenDecimals: decimals,
        feeAmount: feeAmount,
        merchantAmount: merchantAmount,
        orderIdMemo: orderIdMemo,
        status: "PENDING"
      }
    });

    console.log(`[ActionCore SPL] Created PENDING order: ${order.id} (${orderIdMemo})`);

    // Build SPL token transaction
    const merchantWallet = new PublicKey(merchant.payoutAddress || merchant.walletAddress);
    
    const transaction = await buildSPLTokenTransaction(
      account,
      merchantWallet,
      MYRA_FEE_WALLET,
      mintAddress,
      totalAmount,
      decimals,
      `AC:${orderIdMemo}`
    );

    // Set transaction properties
    transaction.feePayer = account;
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;

    const payload: ActionPostResponse = await createPostResponse({
      fields: {
        type: "transaction",
        transaction,
        message: isPhysical 
          ? `Order ${orderIdMemo} created! Complete payment with ${tokenSymbol}.`
          : `Send ${totalAmount} ${tokenSymbol} to ${merchant.walletAddress.slice(0, 4)}...`,
      },
    });

    // Store pending order in Redis
    await redis.setex(
      `order_pending:${orderIdMemo}`,
      600,
      JSON.stringify({
        orderId: order.id,
        merchantId: merchant.id,
        amount: totalAmount,
        currency: tokenSymbol,
        customerWallet: walletAddress
      })
    );

    return Response.json(payload, { headers: ACTIONS_CORS_HEADERS });

  } catch (error) {
    console.error("[ActionCore SPL] POST Error:", error);
    return Response.json(
      { message: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500, headers: ACTIONS_CORS_HEADERS }
    );
  }
}
