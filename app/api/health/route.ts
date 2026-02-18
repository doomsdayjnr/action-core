import { NextRequest } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { ACTIONS_CORS_HEADERS } from '@solana/actions';

export async function GET(req: NextRequest) {
  const checks: any = {
    timestamp: new Date().toISOString(),
    status: 'checking'
  };

  try {
    // Check database connection
    console.log('[Health Check] Testing database...');
    await prisma.$connect();
    await prisma.$queryRaw`SELECT 1`;
    checks.database = 'OK';
    console.log('[Health Check] Database OK');
  } catch (dbError: any) {
    console.error('[Health Check] Database FAILED:', dbError.message);
    checks.database = `FAILED: ${dbError.message}`;
    checks.status = 'error';
  }

  try {
    // Check environment variables
    checks.env = {
      DATABASE_URL: process.env.DATABASE_URL ? 'Set' : 'MISSING',
      REDIS_URL: process.env.REDIS_URL ? 'Set' : 'MISSING',
      SOLANA_RPC_URL: process.env.SOLANA_RPC_URL ? 'Set' : 'MISSING',
      MYRA_FEE_WALLET: process.env.MYRA_FEE_WALLET ? 'Set' : 'MISSING',
      NODE_ENV: process.env.NODE_ENV || 'not set'
    };
  } catch (envError: any) {
    checks.env = `Error: ${envError.message}`;
  }

  // Check merchant count
  try {
    const merchantCount = await prisma.merchant.count();
    checks.merchants = `${merchantCount} in database`;
    console.log('[Health Check] Merchants:', merchantCount);
  } catch (countError: any) {
    checks.merchants = `Error: ${countError.message}`;
  }

  const allOk = checks.database === 'OK';
  checks.status = allOk ? 'healthy' : 'unhealthy';

  return Response.json(checks, { 
    status: allOk ? 200 : 500,
    headers: ACTIONS_CORS_HEADERS 
  });
}

export const OPTIONS = async () => {
  return new Response(null, { headers: ACTIONS_CORS_HEADERS });
};
