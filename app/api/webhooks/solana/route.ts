import { NextRequest } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { redis } from '../../../../lib/redis';
import { ACTIONS_CORS_HEADERS } from '@solana/actions';
import { Connection, clusterApiUrl, PublicKey } from '@solana/web3.js';

/**
 * Solana Webhook Handler
 * Receives transaction notifications and updates order status
 * 
 * This can be called by:
 * 1. Helius webhooks
 * 2. Custom polling mechanism
 * 3. Direct transaction monitoring
 */

// Initialize connection for tx verification
const connection = new Connection(
  process.env.SOLANA_RPC_URL || clusterApiUrl('mainnet-beta'),
  'confirmed'
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Support multiple webhook formats
    // Helius format: { signature, accountData, type, etc. }
    // Custom format: { signature, orderIdMemo }
    
    const signature = body.signature;
    const orderIdMemo = body.orderIdMemo;
    
    if (!signature) {
      return Response.json(
        { error: 'Transaction signature required' },
        { status: 400, headers: ACTIONS_CORS_HEADERS }
      );
    }

    console.log(`[Webhook] Processing transaction: ${signature}`);

    // If orderIdMemo is provided directly, use it
    let targetOrderId = orderIdMemo;
    
    // Otherwise, fetch transaction details and parse memo
    if (!targetOrderId) {
      try {
        const txDetails = await connection.getParsedTransaction(signature, {
          commitment: 'confirmed',
          maxSupportedTransactionVersion: 0
        });

        if (!txDetails) {
          return Response.json(
            { error: 'Transaction not found' },
            { status: 404, headers: ACTIONS_CORS_HEADERS }
          );
        }

        // Parse memo from transaction
        const memoInstruction = txDetails.transaction.message.instructions.find(
          (ix: any) => ix.programId.toString() === 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'
        );

        if (memoInstruction && memoInstruction.parsed) {
          const memoData = memoInstruction.parsed;
          // Extract order ID from memo format: "AC:ORDER-ID-HERE"
          if (memoData.startsWith('AC:')) {
            targetOrderId = memoData.substring(3);
          }
        }
      } catch (txError) {
        console.error('[Webhook] Error fetching transaction:', txError);
      }
    }

    if (!targetOrderId) {
      return Response.json(
        { error: 'Could not determine order ID from transaction' },
        { status: 400, headers: ACTIONS_CORS_HEADERS }
      );
    }

    console.log(`[Webhook] Looking up order: ${targetOrderId}`);

    // Find the order by orderIdMemo
    const order = await prisma.order.findUnique({
      where: { orderIdMemo: targetOrderId }
    });

    if (!order) {
      return Response.json(
        { error: 'Order not found' },
        { status: 404, headers: ACTIONS_CORS_HEADERS }
      );
    }

    // Check if already confirmed
    if (order.status === 'CONFIRMED' || order.status === 'PAID') {
      return Response.json(
        { 
          message: 'Order already confirmed',
          orderId: order.id,
          status: order.status
        },
        { headers: ACTIONS_CORS_HEADERS }
      );
    }

    // Update order status
    const updatedOrder = await prisma.order.update({
      where: { id: order.id },
      data: {
        status: 'CONFIRMED',
        transactionSignature: signature,
        confirmedAt: new Date()
      }
    });

    console.log(`[Webhook] Order ${order.id} confirmed with signature ${signature}`);

    // Clear from pending cache
    await redis.del(`order_pending:${targetOrderId}`);

    // Update merchant analytics
    await redis.incr(`merchant_volume:${order.merchantId}`);
    await redis.incrby(`merchant_revenue:${order.merchantId}`, Math.round(order.amount * 100));

    return Response.json({
      success: true,
      message: 'Order confirmed successfully',
      order: {
        id: updatedOrder.id,
        orderIdMemo: updatedOrder.orderIdMemo,
        status: updatedOrder.status,
        transactionSignature: updatedOrder.transactionSignature,
        confirmedAt: updatedOrder.confirmedAt
      }
    }, { headers: ACTIONS_CORS_HEADERS });

  } catch (error) {
    console.error('[Webhook] Error processing webhook:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500, headers: ACTIONS_CORS_HEADERS }
    );
  }
}

/**
 * GET handler for manual webhook testing
 * Can be used to check webhook status or manually trigger confirmations
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const signature = searchParams.get('signature');
    const orderIdMemo = searchParams.get('orderIdMemo');

    if (!signature && !orderIdMemo) {
      return Response.json(
        { 
          message: 'Solana Webhook Endpoint',
          usage: {
            post: 'POST with { signature, orderIdMemo? } to confirm order',
            get: 'GET ?signature=XXX or ?orderIdMemo=XXX to check status'
          }
        },
        { headers: ACTIONS_CORS_HEADERS }
      );
    }

    // If orderIdMemo provided, check order status
    if (orderIdMemo) {
      const order = await prisma.order.findUnique({
        where: { orderIdMemo }
      });

      if (!order) {
        return Response.json(
          { error: 'Order not found' },
          { status: 404, headers: ACTIONS_CORS_HEADERS }
        );
      }

      return Response.json({
        orderId: order.id,
        orderIdMemo: order.orderIdMemo,
        status: order.status,
        transactionSignature: order.transactionSignature,
        confirmedAt: order.confirmedAt
      }, { headers: ACTIONS_CORS_HEADERS });
    }

    // If signature provided, try to verify transaction
    if (signature) {
      const txDetails = await connection.getParsedTransaction(signature, {
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 0
      });

      return Response.json({
        signature,
        found: !!txDetails,
        details: txDetails ? {
          slot: txDetails.slot,
          blockTime: txDetails.blockTime,
          confirmations: txDetails.confirmations,
          status: txDetails.meta?.err ? 'failed' : 'confirmed'
        } : null
      }, { headers: ACTIONS_CORS_HEADERS });
    }

  } catch (error) {
    console.error('[Webhook GET] Error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500, headers: ACTIONS_CORS_HEADERS }
    );
  }
}

export const OPTIONS = async () => {
  return new Response(null, { headers: ACTIONS_CORS_HEADERS });
};
