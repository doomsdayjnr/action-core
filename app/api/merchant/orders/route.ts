import { NextRequest } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { ACTIONS_CORS_HEADERS } from '@solana/actions';

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

    // Find merchant by wallet address
    const merchant = await prisma.merchant.findUnique({
      where: { walletAddress },
      include: {
        orders: {
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    });

    if (!merchant) {
      return Response.json(
        { error: 'Merchant not found' },
        { status: 404, headers: ACTIONS_CORS_HEADERS }
      );
    }

    return Response.json({
      orders: merchant.orders
    }, { headers: ACTIONS_CORS_HEADERS });

  } catch (error) {
    console.error('[Merchant Orders API] Error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500, headers: ACTIONS_CORS_HEADERS }
    );
  }
}

export const OPTIONS = async () => {
  return new Response(null, { headers: ACTIONS_CORS_HEADERS });
};
