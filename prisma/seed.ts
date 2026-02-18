import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Create supported tokens
  const usdcToken = await prisma.token.create({
    data: {
      mintAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6,
      logoUrl: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png',
      isStable: true
    }
  })
  console.log('💵 Created USDC token')

  const bonkToken = await prisma.token.create({
    data: {
      mintAddress: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
      symbol: 'BONK',
      name: 'Bonk',
      decimals: 5,
      logoUrl: 'https://cryptologos.cc/logos/bonk-bonk-logo.png',
      isStable: false
    }
  })
  console.log('🐕 Created BONK token')

  // Create test merchant
  const merchant = await prisma.merchant.create({
    data: {
      walletAddress: '9aQSG3rJkT2WqNAJ2WRZQaVH7HbjEJx4xFYrSwKh1kuA',
      payoutAddress: '9aQSG3rJkT2WqNAJ2WRZQaVH7HbjEJx4xFYrSwKh1kuA',
      email: 'test@actioncore.com',
      apiKey: 'test-api-key-12345',
      subscription: {
        create: {
          tier: 'FREE',
          status: 'ACTIVE',
          activeBlinksLimit: 5
        }
      },
      blinks: {
        create: [
          {
            title: 'Test Donation (SOL)',
            description: 'Support our test project with SOL',
            icon: 'https://actioncore.com/icon.png',
            label: 'Donate 0.1 SOL',
            amount: 0.1,
            currency: 'SOL',
            actionType: 'TRANSFER',
            requiresShipping: false,
            active: true,
            slug: 'test-donate'
          },
          {
            title: 'Test Product (SOL)',
            description: 'A physical test product paid with SOL',
            icon: 'https://actioncore.com/product.png',
            label: 'Buy Product',
            amount: 0.1,
            currency: 'SOL',
            actionType: 'PHYSICAL',
            requiresShipping: true,
            active: true,
            slug: 'test-product'
          },
          {
            title: 'Pay with USDC',
            description: 'Send USDC stablecoin',
            icon: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png',
            label: 'Send 100 USDC',
            amount: 100,
            currency: 'USDC',
            actionType: 'SPL_TOKEN',
            tokenMintId: usdcToken.id,
            requiresShipping: false,
            active: true,
            slug: 'pay-usdc'
          },
          {
            title: 'Buy with BONK',
            description: 'Buy using BONK meme token!',
            icon: 'https://cryptologos.cc/logos/bonk-bonk-logo.png',
            label: 'Pay with BONK',
            amount: 1000000, // 1M BONK
            currency: 'BONK',
            actionType: 'SPL_TOKEN',
            tokenMintId: bonkToken.id,
            requiresShipping: false,
            active: true,
            slug: 'pay-bonk'
          }
        ]
      }
    },
    include: {
      blinks: true
    }
  })

  console.log('✅ Created test merchant:', merchant.id)
  console.log('🔑 API Key:', merchant.apiKey)

  // Create sample orders
  const solBlink = merchant.blinks.find(b => b.slug === 'test-product')
  const usdcBlink = merchant.blinks.find(b => b.slug === 'pay-usdc')
  
  if (solBlink) {
    await prisma.order.createMany({
      data: [
        {
          merchantId: merchant.id,
          blinkId: solBlink.id,
          customerWallet: '5AypvYFxeoqktFUL2UB3MTSYZvBTmF6RJ4b6pyiUSpq2',
          customerEmail: 'customer1@example.com',
          shippingName: 'John Doe',
          shippingAddress: '123 Main St, New York, NY 10001, USA',
          shippingPhone: '+1-555-0123',
          amount: 0.1,
          currency: 'SOL',
          tokenDecimals: 9,
          feeAmount: 0.001,
          merchantAmount: 0.099,
          orderIdMemo: 'AC-1707560000-ABC123',
          transactionSignature: '5AypvYFxeoqktFUL2UB3MTSYZvBTmF6RJ4b6pyiUSpq2jeLM3dLW1Wnnda7v11TaFDEojtcKQKWKKFA19q1E3giY',
          status: 'CONFIRMED',
          confirmedAt: new Date()
        },
        {
          merchantId: merchant.id,
          blinkId: solBlink.id,
          customerWallet: '3QAPLYrkA1mpXgMHTznNkQRHrzLXMueCXvjdVV6k8Vnt',
          customerEmail: 'customer2@example.com',
          shippingName: 'Jane Smith',
          shippingAddress: '456 Oak Ave, Los Angeles, CA 90001, USA',
          shippingPhone: '+1-555-0456',
          amount: 0.1,
          currency: 'SOL',
          tokenDecimals: 9,
          feeAmount: 0.001,
          merchantAmount: 0.099,
          orderIdMemo: 'AC-1707560000-DEF456',
          transactionSignature: null,
          status: 'PENDING'
        },
        {
          merchantId: merchant.id,
          blinkId: solBlink.id,
          customerWallet: '44vaxvJZpDZqAZzhp69MfPwSkyo788TraVDRU4ZxGLsb',
          customerEmail: 'customer3@example.com',
          shippingName: 'Bob Johnson',
          shippingAddress: '789 Pine Rd, Chicago, IL 60001, USA',
          shippingPhone: null,
          amount: 0.1,
          currency: 'SOL',
          tokenDecimals: 9,
          feeAmount: 0.001,
          merchantAmount: 0.099,
          orderIdMemo: 'AC-1707560000-GHI789',
          transactionSignature: '4FLmPbxfR67b9xHaGLA2Mh3d8KG6jGwZBCbDfcmwXRcosTNoKM7SNLLC1Rhd9KQaSj2r1zPDn7RYBDMZfXrLV2d9',
          status: 'SHIPPED',
          confirmedAt: new Date(Date.now() - 86400000),
          shippedAt: new Date()
        }
      ]
    })
    console.log('📦 Created 3 SOL sample orders')
  }

  // Create USDC order sample
  if (usdcBlink) {
    await prisma.order.create({
      data: {
        merchantId: merchant.id,
        blinkId: usdcBlink.id,
        customerWallet: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
        customerEmail: 'usdc.customer@example.com',
        amount: 100,
        currency: 'USDC',
        tokenMintId: usdcToken.id,
        tokenDecimals: 6,
        feeAmount: 1,
        merchantAmount: 99,
        orderIdMemo: 'AC-1707560000-USDC001',
        transactionSignature: '3EqYlxjG9q2hWQwqh2cG8U3M8oGMwWVMhXTKSmW4JfP7tYyK2C4h2f2y8Lr4c9V8B5U3f4r9vM4x8J5s2cG9r2',
        status: 'CONFIRMED',
        confirmedAt: new Date()
      }
    })
    console.log('💵 Created 1 USDC sample order')
  }

  console.log('')
  console.log('🚀 Test URLs:')
  console.log(`  Dashboard: http://localhost:3000/dashboard`)
  console.log('')
  console.log('  SOL Payments:')
  console.log(`    GET  http://localhost:3000/api/actions/donate?apiKey=${merchant.apiKey}`)
  console.log(`    GET  http://localhost:3000/api/actions/donate?apiKey=${merchant.apiKey}&type=physical`)
  console.log('')
  console.log('  SPL Token Payments:')
  console.log(`    GET  http://localhost:3000/api/actions/spl-token?apiKey=${merchant.apiKey}&token=USDC`)
  console.log(`    GET  http://localhost:3000/api/actions/spl-token?apiKey=${merchant.apiKey}&token=BONK`)
  console.log('')
  console.log(`  Webhook: POST http://localhost:3000/api/webhooks/solana`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
