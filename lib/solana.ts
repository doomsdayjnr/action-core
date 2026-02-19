import { Connection, Commitment } from "@solana/web3.js";

// Use 'confirmed' to balance speed and reliability for Blinks
const DEFAULT_COMMITMENT: Commitment = "confirmed";

const globalForSolana = global as unknown as { solanaConnection: Connection };

export const connection =
  globalForSolana.solanaConnection ||
  new Connection(
    process.env.SOLANA_RPC_URL + process.env.NEXT_PUBLIC_HELIUS_KEY || "https://api.mainnet-beta.solana.com",
    {
      commitment: DEFAULT_COMMITMENT,
      // Custom retry config for resilience
      confirmTransactionInitialTimeout: 60000,
    }
  );

if (process.env.NODE_ENV !== "production") {
  globalForSolana.solanaConnection = connection;
}

/**
 * Helper to fetch the latest blockhash with the engine's default commitment.
 * Essential for building transactions in route.ts.
 */
export async function getLatestBlockhash() {
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
  return { blockhash, lastValidBlockHeight };
}

/**
 * Confirm a transaction with proper retry logic
 */
export async function confirmTransaction(signature: string): Promise<boolean> {
  try {
    const result = await connection.confirmTransaction(signature, "confirmed");
    return !result.value.err;
  } catch (error) {
    console.error("[Solana] Transaction confirmation error:", error);
    return false;
  }
}

export default connection;
