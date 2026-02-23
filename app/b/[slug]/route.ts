import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';

// Force dynamic rendering (no caching)
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// CORS headers for Solana Actions
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> | { slug: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const slug = resolvedParams.slug;

    if (!slug) {
      return new NextResponse('Slug required', { 
        status: 400,
        headers: { 
          'Content-Type': 'text/plain',
          ...CORS_HEADERS 
        }
      });
    }

    const blink = await prisma.blink.findUnique({
      where: { slug },
      include: {
        merchant: { select: { walletAddress: true, payoutAddress: true } },
        token: true
      }
    });

    if (!blink || !blink.active) {
      return new NextResponse('Not found', { 
        status: 404,
        headers: { 
          'Content-Type': 'text/plain',
          ...CORS_HEADERS 
        }
      });
    }

    const actionUrl = `https://memelend.tech/api/blinks/action/${slug}`;
    
    // Escape HTML to prevent XSS
    const safeTitle = escapeHtml(blink.title);
    const safeDesc = escapeHtml(blink.description);
    const safeLabel = escapeHtml(blink.label || 'Buy Now');
    const imageUrl = blink.icon || blink.imageUrl || 'https://memelend.tech/og.png';
    
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeTitle} | MemeLend</title>
  <meta name="description" content="${safeDesc}">
  
  <!-- Open Graph -->
  <meta property="og:title" content="${safeTitle}">
  <meta property="og:description" content="${safeDesc}">
  <meta property="og:image" content="${imageUrl}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://memelend.tech/b/${slug}">
  
  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${safeTitle}">
  <meta name="twitter:description" content="${safeDesc}">
  <meta name="twitter:image" content="${imageUrl}">
  
  <!-- Solana Actions - Critical for Blink functionality -->
  <meta name="solana-action" content="${actionUrl}">
  
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
  </style>
</head>
<body class="bg-gray-50 min-h-screen">
  <div class="max-w-md mx-auto p-4">
    <div class="text-center py-4">
      <span class="font-bold text-xl text-gray-900">⚡ MemeLend</span>
    </div>
    
    <div class="bg-white rounded-2xl shadow-xl overflow-hidden">
      ${blink.icon || blink.imageUrl ? 
        `<div class="aspect-square bg-gray-100">
          <img src="${imageUrl}" alt="${safeTitle}" class="w-full h-full object-cover" loading="eager" onerror="this.style.display='none'">
         </div>` 
        : ''}
      
      <div class="p-6">
        <h1 class="text-2xl font-bold text-gray-900 mb-2">${safeTitle}</h1>
        <p class="text-gray-600 text-sm mb-4 leading-relaxed">${safeDesc}</p>
        <p class="text-3xl font-bold text-purple-600 mb-4">${blink.amount} ${blink.currency}</p>
        
        <a href="${actionUrl}" 
           class="block w-full py-4 bg-purple-600 hover:bg-purple-700 text-white text-center font-bold rounded-xl transition-colors">
          ${safeLabel}
        </a>
      </div>
    </div>
    
    <p class="text-center text-xs text-gray-400 mt-4">Powered by MemeLend • Pay with Solana</p>
  </div>
</body>
</html>`;

    // Update click count (fire and forget)
    prisma.blink.update({
      where: { id: blink.id },
      data: { clickCount: { increment: 1 } }
    }).catch(() => {});

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'no-cache, no-store, must-revalidate, private',
        'Pragma': 'no-cache',
        'Expires': '-1',
        ...CORS_HEADERS
      }
    });

  } catch (error) {
    console.error('Route error:', error);
    return new NextResponse('Server error', { 
      status: 500,
      headers: { 
        'Content-Type': 'text/plain',
        ...CORS_HEADERS 
      }
    });
  }
}

// OPTIONS handler for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS
  });
}

function escapeHtml(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\n/g, ' ')
    .replace(/\r/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
