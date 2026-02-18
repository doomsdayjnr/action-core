import { 
  Connection, 
  PublicKey, 
  Transaction, 
  SystemProgram,
  LAMPORTS_PER_SOL 
} from "@solana/web3.js";
import {
  createTransferInstruction,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAccount
} from "@solana/spl-token";
import { connection } from "./solana";

/**
 * SPL Token Utility Functions
 * Handles token transfers, ATA creation, and token metadata
 */

// Common token mints
export const COMMON_TOKENS = {
  USDC: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  USDT: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
  BONK: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
  RAY: "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R",
  // Add more as needed
};

/**
 * Get token decimals
 */
export async function getTokenDecimals(mintAddress: string): Promise<number> {
  try {
    const mintPublicKey = new PublicKey(mintAddress);
    const mintInfo = await connection.getTokenSupply(mintPublicKey);
    return mintInfo.value.decimals;
  } catch (error) {
    console.error("[SPL Token] Error getting decimals:", error);
    return 6; // Default to 6 (USDC standard)
  }
}

/**
 * Check if token account exists
 */
export async function tokenAccountExists(
  owner: PublicKey,
  mint: PublicKey
): Promise<boolean> {
  try {
    const ata = await getAssociatedTokenAddress(mint, owner);
    await getAccount(connection, ata);
    return true;
  } catch {
    return false;
  }
}

/**
 * Create SPL token transfer instruction with ATA creation if needed
 */
export async function createSPLTokenTransfer(
  fromWallet: PublicKey,
  toWallet: PublicKey,
  mintAddress: string,
  amount: number,
  decimals: number
): Promise<Transaction> {
  const mint = new PublicKey(mintAddress);
  const transaction = new Transaction();

  // Get ATA addresses
  const fromATA = await getAssociatedTokenAddress(mint, fromWallet);
  const toATA = await getAssociatedTokenAddress(mint, toWallet);

  // Check if sender ATA exists (should exist if they have tokens)
  try {
    await getAccount(connection, fromATA);
  } catch {
    throw new Error("Sender does not have a token account for this mint");
  }

  // Create recipient ATA if it doesn't exist
  try {
    await getAccount(connection, toATA);
  } catch {
    // ATA doesn't exist, create it
    transaction.add(
      createAssociatedTokenAccountInstruction(
        fromWallet, // payer
        toATA,      // associated token account
        toWallet,   // owner
        mint        // mint
      )
    );
  }

  // Calculate amount with decimals
  const amountWithDecimals = Math.round(amount * Math.pow(10, decimals));

  // Add transfer instruction
  transaction.add(
    createTransferInstruction(
      fromATA,  // source
      toATA,    // destination
      fromWallet, // owner
      amountWithDecimals
    )
  );

  return transaction;
}

/**
 * Build atomic transaction with SPL token fee split
 * 99% to merchant, 1% to Myra
 */
export async function buildSPLTokenTransaction(
  customerWallet: PublicKey,
  merchantWallet: PublicKey,
  myraFeeWallet: PublicKey,
  mintAddress: string,
  totalAmount: number,
  decimals: number,
  orderMemo: string
): Promise<Transaction> {
  const mint = new PublicKey(mintAddress);
  const transaction = new Transaction();

  // Calculate amounts
  const feeAmount = totalAmount * 0.01; // 1% fee
  const merchantAmount = totalAmount - feeAmount; // 99% to merchant

  // Get all ATA addresses
  const customerATA = await getAssociatedTokenAddress(mint, customerWallet);
  const merchantATA = await getAssociatedTokenAddress(mint, merchantWallet);
  const myraATA = await getAssociatedTokenAddress(mint, myraFeeWallet);

  // Verify customer has tokens
  try {
    await getAccount(connection, customerATA);
  } catch {
    throw new Error("Customer does not have a token account for this mint");
  }

  // Create merchant ATA if needed
  try {
    await getAccount(connection, merchantATA);
  } catch {
    transaction.add(
      createAssociatedTokenAccountInstruction(
        customerWallet,
        merchantATA,
        merchantWallet,
        mint
      )
    );
  }

  // Create Myra fee ATA if needed
  try {
    await getAccount(connection, myraATA);
  } catch {
    transaction.add(
      createAssociatedTokenAccountInstruction(
        customerWallet,
        myraATA,
        myraFeeWallet,
        mint
      )
    );
  }

  // Instruction 1: Transfer 99% to merchant
  const merchantAmountWithDecimals = Math.round(merchantAmount * Math.pow(10, decimals));
  transaction.add(
    createTransferInstruction(
      customerATA,
      merchantATA,
      customerWallet,
      merchantAmountWithDecimals
    )
  );

  // Instruction 2: Transfer 1% to Myra
  const feeAmountWithDecimals = Math.round(feeAmount * Math.pow(10, decimals));
  transaction.add(
    createTransferInstruction(
      customerATA,
      myraATA,
      customerWallet,
      feeAmountWithDecimals
    )
  );

  // Instruction 3: Memo with order ID
  const memoProgram = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");
  const encoder = new TextEncoder();
  transaction.add(
    new TransactionInstruction({
      keys: [],
      programId: memoProgram,
      data: encoder.encode(orderMemo)
    })
  );

  return transaction;
}

/**
 * Fetch token price from Jupiter API
 */
export async function getTokenPriceUSD(mintAddress: string): Promise<number | null> {
  try {
    // Use Jupiter price API
    const response = await fetch(
      `https://price.jup.ag/v4/price?ids=${mintAddress}`
    );
    const data = await response.json();
    
    if (data.data && data.data[mintAddress]) {
      return data.data[mintAddress].price;
    }
    return null;
  } catch (error) {
    console.error("[SPL Token] Error fetching price:", error);
    return null;
  }
}

/**
 * Format token amount for display
 */
export function formatTokenAmount(amount: number, decimals: number, symbol: string): string {
  const formatted = amount / Math.pow(10, decimals);
  return `${formatted.toLocaleString()} ${symbol}`;
}

export default {
  COMMON_TOKENS,
  getTokenDecimals,
  tokenAccountExists,
  createSPLTokenTransfer,
  buildSPLTokenTransaction,
  getTokenPriceUSD,
  formatTokenAmount
};
