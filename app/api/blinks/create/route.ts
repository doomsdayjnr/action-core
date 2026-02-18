import { NextRequest } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { ACTIONS_CORS_HEADERS } from '@solana/actions';
import crypto from 'crypto';

// Generate unique slug
function generateSlug(): string {
  return `blink_${crypto.randomBytes(6).toString('hex')}`;
}

/**
 * POST: Create a new Blink (Direct Blink for users without websites)
 * Requires wallet authentication via header
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      walletAddress,  // Merchant's wallet (from connected wallet)
      title, 
      description, 
      icon, 
      imageUrl,
      label,
      amount, 
      currency = 'SOL',
      actionType = 'TRANSFER',
      requiresShipping = false,
      tokenMintId,
      deliveryMethod,
      deliveryConfig
    } = body;

    // Validation
    if (!walletAddress) {
      return Response.json(
        { error: 'Wallet address required' },
        { status: 400, headers: ACTIONS_CORS_HEADERS }
      );
    }

    if (!title || !description || !icon || !label || !amount) {
      return Response.json(
        { error: 'Missing required fields: title, description, icon, label, amount' },
        { status: 400, headers: ACTIONS_CORS_HEADERS }
      );
    }

    // Find or create merchant
    let merchant = await prisma.merchant.findUnique({
      where: { walletAddress }
    });

    if (!merchant) {
      // Auto-create merchant (same logic as merchant route)
      merchant = await prisma.merchant.create({
        data: {
          walletAddress: walletAddress,
          payoutAddress: walletAddress,
          apiKey: `ac_${crypto.randomBytes(16).toString('hex')}`,
          subscription: {
            create: {
              tier: 'FREE',
              status: 'ACTIVE',
              activeBlinksLimit: 3
            }
          }
        }
      });
    }

    // Check subscription limits
    const existingBlinks = await prisma.blink.count({
      where: { merchantId: merchant.id, active: true }
    });

    const subscription = await prisma.subscription.findUnique({
      where: { merchantId: merchant.id }
    });

    if (subscription && existingBlinks >= subscription.activeBlinksLimit) {
      return Response.json(
        { error: `Blink limit reached. Upgrade your plan to create more Blinks.` },
        { status: 403, headers: ACTIONS_CORS_HEADERS }
      );
    }

    // Generate unique slug
    const slug = generateSlug();
    const publicUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/b/${slug}`;

    // Create the Blink
    const blink = await prisma.blink.create({
      data: {
        merchantId: merchant.id,
        blinkType: 'DIRECT', // This is a Direct Blink (no website needed)
        title,
        description,
        icon,
        imageUrl: imageUrl || icon,
        label,
        amount: parseFloat(amount),
        currency: currency.toUpperCase(),
        actionType,
        requiresShipping,
        tokenMintId: tokenMintId || null,
        deliveryMethod: deliveryMethod || null,
        deliveryConfig: deliveryConfig || null,
        slug,
        publicUrl,
        active: true
      }
    });

    console.log(`[Blink Create] Created Direct Blink: ${blink.id} for merchant: ${merchant.id}`);

    return Response.json({
      success: true,
      blink: {
        id: blink.id,
        title: blink.title,
        description: blink.description,
        slug: blink.slug,
        publicUrl: blink.publicUrl,
        amount: blink.amount,
        currency: blink.currency,
        actionType: blink.actionType,
        createdAt: blink.createdAt
      },
      merchant: {
        id: merchant.id,
        apiKey: merchant.apiKey
      }
    }, { headers: ACTIONS_CORS_HEADERS });

  } catch (error: any) {
    console.error('[Blink Create] Error:', error);
    return Response.json(
      { error: error.message || 'Failed to create Blink' },
      { status: 500, headers: ACTIONS_CORS_HEADERS }
    );
  }
}

/**
 * GET: List all Blinks for a merchant
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const walletAddress = searchParams.get('wallet');

    if (!walletAddress) {
      return Response.json(
        { error: 'Wallet address required' },
        { status: 400, headers: ACTIONS_CORS_HEADERS }
      );
    }

    const merchant = await prisma.merchant.findUnique({
      where: { walletAddress },
      include: {
        blinks: {
          orderBy: { createdAt: 'desc' },
          include: {
            _count: {
              select: { orders: true }
            }
          }
        }
      }
    });

    if (!merchant) {
      return Response.json(
        { blinks: [] },
        { headers: ACTIONS_CORS_HEADERS }
      );
    }

    return Response.json({
      blinks: merchant.blinks.map(blink => ({
        id: blink.id,
        title: blink.title,
        description: blink.description,
        slug: blink.slug,
        publicUrl: blink.publicUrl,
        amount: blink.amount,
        currency: blink.currency,
        actionType: blink.actionType,
        active: blink.active,
        clickCount: blink.clickCount,
        totalVolume: blink.totalVolume,
        orderCount: blink._count.orders,
        createdAt: blink.createdAt
      }))
    }, { headers: ACTIONS_CORS_HEADERS });

  } catch (error: any) {
    console.error('[Blink List] Error:', error);
    return Response.json(
      { error: error.message },
      { status: 500, headers: ACTIONS_CORS_HEADERS }
    );
  }
}

export const OPTIONS = async () => {
  return new Response(null, { headers: ACTIONS_CORS_HEADERS });
};
