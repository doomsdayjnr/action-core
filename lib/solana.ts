import { Connection, Commitment } from "@solana/web3.js";

const DEFAULT_COMMITMENT: Commitment = "confirmed";

let cachedConnection: Connection | null = null;

export function getConnection(): Connection {
  if (cachedConnection) return cachedConnection;

  const rpcUrl = process.env.SOLANA_RPC_URL;

  if (!rpcUrl || !rpcUrl.startsWith("http")) {
    throw new Error("Invalid or missing SOLANA_RPC_URL");
  }

  cachedConnection = new Connection(rpcUrl, {
    commitment: DEFAULT_COMMITMENT,
    confirmTransactionInitialTimeout: 60000,
  });

  return cachedConnection;
}

export async function getLatestBlockhash() {
  const connection = getConnection();
  return connection.getLatestBlockhash();
}

export async function confirmTransaction(signature: string): Promise<boolean> {
  const connection = getConnection();
  try {
    const result = await connection.confirmTransaction(signature, "confirmed");
    return !result.value.err;
  } catch (error) {
    console.error("[Solana] Transaction confirmation error:", error);
    return false;
  }
}
