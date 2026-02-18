import { NextRequest } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { ACTIONS_CORS_HEADERS } from '@solana/actions';
import crypto from 'crypto';

// Generate a unique API key
function generateApiKey(): string {
  return `ac_${crypto.randomBytes(16).toString('hex')}`;
}

export async function GET(req: NextRequest) {
  console.log('[Merchant API] Request received:', req.url);
  
  try {
    const { searchParams } = new URL(req.url);
    const walletAddress = searchParams.get('wallet');

    console.log('[Merchant API] Wallet param:', walletAddress?.slice(0, 8) + '...');

    if (!walletAddress) {
      console.log('[Merchant API] ERROR: No wallet address provided');
      return Response.json(
        { error: 'Wallet address required' },
        { status: 400, headers: ACTIONS_CORS_HEADERS }
      );
    }

    // Validate wallet address format (base58 check)
    if (walletAddress.length < 32 || walletAddress.length > 44) {
      console.log('[Merchant API] ERROR: Invalid wallet length:', walletAddress.length);
      return Response.json(
        { error: 'Invalid wallet address format' },
        { status: 400, headers: ACTIONS_CORS_HEADERS }
      );
    }

    // Test database connection first
    console.log('[Merchant API] Testing database connection...');
    try {
      await prisma.$connect();
      console.log('[Merchant API] Database connected OK');
    } catch (connError) {
      console.error('[Merchant API] Database connection failed:', connError);
      return Response.json(
        { error: 'Database connection failed. Check DATABASE_URL in .env' },
        { status: 500, headers: ACTIONS_CORS_HEADERS }
      );
    }

    try {
      // Find merchant by wallet address
      console.log('[Merchant API] Looking up merchant...');
      let merchant = await prisma.merchant.findUnique({
        where: { walletAddress },
        include: {
          subscription: true
        }
      });

      // Auto-create merchant if not found
      if (!merchant) {
        console.log(`[Merchant API] Merchant not found, creating new one...`);
        
        try {
          merchant = await prisma.merchant.create({
            data: {
              walletAddress: walletAddress,
              payoutAddress: walletAddress,
              apiKey: generateApiKey(),
              subscription: {
                create: {
                  tier: 'FREE',
                  status: 'ACTIVE',
                  activeBlinksLimit: 3
                }
              }
            },
            include: {
              subscription: true
            }
          });

          console.log(`[Merchant API] SUCCESS: Created merchant ${merchant.id}`);
        } catch (createError: any) {
          console.error('[Merchant API] Prisma create error:', createError.message);
          console.error('[Merchant API] Error code:', createError.code);
          console.error('[Merchant API] Error meta:', createError.meta);
          return Response.json(
            { error: `Database error: ${createError.message}` },
            { status: 500, headers: ACTIONS_CORS_HEADERS }
          );
        }
      } else {
        console.log(`[Merchant API] Found existing merchant: ${merchant.id}`);
      }

      return Response.json({
        id: merchant.id,
        walletAddress: merchant.walletAddress,
        email: merchant.email,
        apiKey: merchant.apiKey,
        subscription: merchant.subscription ? {
          status: merchant.subscription.status,
          tier: merchant.subscription.tier,
          activeBlinksLimit: merchant.subscription.activeBlinksLimit
        } : null
      }, { headers: ACTIONS_CORS_HEADERS });

    } catch (dbError: any) {
      console.error('[Merchant API] Database query error:', dbError.message);
      return Response.json(
        { error: `Database error: ${dbError.message}` },
        { status: 500, headers: ACTIONS_CORS_HEADERS }
      );
    }

  } catch (error: any) {
    console.error('[Merchant API] Unexpected error:', error.message);
    console.error('[Merchant API] Stack:', error.stack);
    return Response.json(
      { error: `Server error: ${error.message}` },
      { status: 500, headers: ACTIONS_CORS_HEADERS }
    );
  }
}

export const OPTIONS = async () => {
  return new Response(null, { headers: ACTIONS_CORS_HEADERS });
};
