# ActionCore - Blink-as-a-Service Engine

A multi-tenant middleware that bridges E-commerce (WordPress/Shopify) with the Solana Blockchain. Convert traditional product URLs into Blinks (interactive blockchain links).

## Features

✅ **Multi-tenancy** - API key validation against Merchant and Subscription tables  
✅ **Dynamic Action Generation** - GET/POST handlers support physical products with shipping collection  
✅ **Atomic Transactions** - Single transaction with 99% to merchant, 1% to Myra fee  
✅ **Order Management** - PENDING orders created before transaction, updated on confirmation  
✅ **Rate Limiting** - Redis-based rate limiting (5 requests/min per wallet)  
✅ **Caching** - 5-minute cache for GET metadata responses  
✅ **CORS Compliant** - All endpoints return proper ACTIONS_CORS_HEADERS  
✅ **Merchant Dashboard** - Wallet-based authentication with order management  
✅ **Webhook System** - Automatic order confirmation from Solana transactions  

## Tech Stack

- **Framework:** Next.js 15+ (App Router)
- **Language:** TypeScript
- **Blockchain:** Solana (@solana/web3.js & @solana/actions)
- **Database:** PostgreSQL with Prisma ORM
- **Caching/Rate Limiting:** Redis (ioredis)
- **Wallet Adapter:** @solana/wallet-adapter-react

## Project Structure

```
action-core/
├── app/
│   ├── actions.json/route.ts       # Discovery rules for Solana wallets
│   ├── api/actions/donate/route.ts # Main Blink handler with multi-tenancy
│   ├── api/merchant/route.ts       # Merchant lookup API
│   ├── api/merchant/orders/route.ts # Orders API
│   ├── api/webhooks/solana/route.ts # Transaction confirmation webhook
│   └── dashboard/page.tsx          # Merchant dashboard with wallet auth
├── lib/
│   ├── prisma.ts                   # Prisma singleton
│   ├── redis.ts                    # Redis singleton with health check
│   └── solana.ts                   # Solana connection singleton
├── prisma/
│   └── schema.prisma               # Database schema
└── README.md
```

## Database Schema

### Merchant
- Root entity with API key authentication
- Links to Subscription and Blinks
- Used for dashboard wallet lookup

### Subscription
- Gating mechanism (must be ACTIVE)
- Tracks plan tier and usage limits

### Blink
- Represents a specific product/offer
- Contains metadata (title, description, icon, price)
- Links to Merchant

### Order
- Stores transaction results
- **Key fields:**
  - `customerWallet` - Who paid
  - `customerEmail` - For receipts
  - `shippingAddress` - For physical goods
  - `transactionSignature` - On-chain tx
  - `orderIdMemo` - Unique ID for matching
  - `status` - PENDING → CONFIRMED → SHIPPED → DELIVERED

## Environment Variables

Create a `.env` file:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/actioncore"

# Redis
REDIS_URL="redis://localhost:6379"

# Solana
SOLANA_RPC_URL="https://api.mainnet-beta.solana.com"
MYRA_FEE_WALLET="YOUR_SOLANA_WALLET_ADDRESS_FOR_FEES"

# Optional
NODE_ENV="development"
```

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Set up Database

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev --name init

# (Optional) Seed with test data
npx prisma db seed
```

### 3. Set up Redis

Make sure Redis is running locally or use a cloud provider (Upstash, Redis Cloud).

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## API Endpoints

### GET /api/actions/donate?apiKey={key}

Returns Blink metadata for wallet display.

**Query Parameters:**
- `apiKey` (required) - Merchant API key
- `type` (optional) - Set to "physical" for shipping collection

**Response:** ActionGetResponse

### POST /api/actions/donate?apiKey={key}

Creates transaction for payment.

**Query Parameters:**
- `apiKey` (required) - Merchant API key
- `type` (optional) - Set to "physical" for shipping collection

**Body:**
```json
{
  "account": "WALLET_ADDRESS",
  "data": {
    "email": "customer@example.com",
    "name": "John Doe",
    "address": "123 Main St, City, Country",
    "phone": "+1234567890"
  }
}
```

**Response:** ActionPostResponse with transaction

### GET /actions.json

Discovery endpoint for Solana wallets.

### GET /api/merchant?wallet={walletAddress}

Lookup merchant by wallet address (for dashboard).

### GET /api/merchant/orders?wallet={walletAddress}

Get all orders for a merchant.

### POST /api/webhooks/solana

Webhook for transaction confirmations.

**Body:**
```json
{
  "signature": "TRANSACTION_SIGNATURE",
  "orderIdMemo": "ORDER_ID_FROM_MEMO"
}
```

Or just provide signature and the webhook will parse the memo:
```json
{
  "signature": "TRANSACTION_SIGNATURE"
}
```

## Merchant Dashboard

### Access

Navigate to: `http://localhost:3000/dashboard`

### Features

1. **Wallet Connection** - Connect with Phantom or Solflare
2. **Merchant Info Display** - Shows API key, subscription status, plan tier
3. **Order Management** - View all orders with:
   - Customer email and wallet
   - Shipping address
   - Payment amount and status
   - Transaction signature
4. **Copy API Key** - One-click copy to clipboard

### Authentication

The dashboard uses wallet-based authentication:
1. Merchant connects their Solana wallet
2. System looks up merchant by wallet address
3. Displays merchant-specific data

## Transaction Flow

1. **GET Request:**
   - Validate API key
   - Check subscription status
   - Return metadata (cached for 5 min)

2. **POST Request:**
   - Rate limit check (5/min per wallet)
   - Validate API key & subscription
   - Extract shipping details (physical goods)
   - Create PENDING order in database
   - Build atomic transaction:
     - Instruction 1: 99% to merchant
     - Instruction 2: 1% to Myra fee
     - Instruction 3: Memo with order ID
   - Return transaction to wallet

3. **Confirmation (Webhook):**
   - Receive transaction signature
   - Parse memo to find order ID
   - Match to PENDING order
   - Update status to CONFIRMED
   - Store transaction signature

## Webhook Integration

### Manual Testing

```bash
# Check webhook status
curl http://localhost:3000/api/webhooks/solana

# Check order status
curl "http://localhost:3000/api/webhooks/solana?orderIdMemo=AC-1707560000-ABC123"

# Confirm order manually
curl -X POST http://localhost:3000/api/webhooks/solana \
  -H "Content-Type: application/json" \
  -d '{
    "signature": "TRANSACTION_SIGNATURE",
    "orderIdMemo": "AC-1707560000-ABC123"
  }'
```

### Helius Integration

To use with Helius webhooks:

1. Set up a Helius webhook pointing to `https://yourdomain.com/api/webhooks/solana`
2. Configure it to send transaction notifications
3. The webhook will automatically parse memos and confirm orders

## Testing

### Create a Test Merchant

```bash
npx prisma studio
```

Add a Merchant with:
- `walletAddress`: Your Solana wallet
- `payoutAddress`: Where to receive payments
- `apiKey`: Auto-generated or custom

Add a Subscription:
- `merchantId`: Link to merchant
- `status`: ACTIVE
- `tier`: FREE, BASE, PRO, or ENTERPRISE

Or use the seed script:
```bash
npx prisma db seed
```

This creates:
- Test merchant with API key: `test-api-key-12345`
- 2 sample Blinks (donation and physical product)
- 3 sample orders (CONFIRMED, PENDING, SHIPPED)

### Test the Blink

```bash
# GET metadata
curl "http://localhost:3000/api/actions/donate?apiKey=test-api-key-12345"

# POST transaction (replace body with actual wallet)
curl -X POST "http://localhost:3000/api/actions/donate?apiKey=test-api-key-12345" \
  -H "Content-Type: application/json" \
  -d '{"account": "WALLET_ADDRESS"}'
```

### Test the Dashboard

1. Go to `http://localhost:3000/dashboard`
2. Connect with wallet: `9aQSG3rJkT2WqNAJ2WRZQaVH7HbjEJx4xFYrSwKh1kuA`
3. View merchant info and orders

## Security Considerations

1. **API Key Validation** - Every request validates against Merchant table
2. **Subscription Gating** - Inactive subscriptions return 403
3. **Rate Limiting** - Redis-based protection against spam
4. **CORS Headers** - All endpoints return proper Solana Actions headers
5. **Atomic Transactions** - Both payments in single tx (all-or-nothing)
6. **Wallet-based Auth** - Dashboard uses wallet signature (not passwords)

## Next Steps

- [ ] Implement transaction confirmation polling
- [ ] Add NFT minting actions
- [ ] Implement analytics dashboard
- [ ] Add Stripe integration for fiat subscriptions
- [ ] Support SPL tokens (USDC, etc.)

## License

MIT
