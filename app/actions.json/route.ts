import { ACTIONS_CORS_HEADERS, ActionsJson } from "@solana/actions";

export const GET = async () => {
  const payload: ActionsJson = {
    rules: [
      // Rule 1: SOL Donations
      {
        pathPattern: "/donate",
        apiPath: "/api/actions/donate",
      },
      // Rule 2: Physical products with SOL
      {
        pathPattern: "/buy",
        apiPath: "/api/actions/donate?type=physical",
      },
      // Rule 3: SPL Token payments (USDC, meme tokens)
      {
        pathPattern: "/pay",
        apiPath: "/api/actions/spl-token",
      },
      // Rule 4: SPL Token with physical goods
      {
        pathPattern: "/token-buy",
        apiPath: "/api/actions/spl-token?type=physical",
      },
      // Rule 5: Generic mapping for any future actions
      {
        pathPattern: "/api/actions/**",
        apiPath: "/api/actions/**",
      },
    ],
  };

  return Response.json(payload, {
    headers: ACTIONS_CORS_HEADERS,
  });
};

// DO NOT forget this! Wallets pre-flight check this.
export const OPTIONS = GET;
