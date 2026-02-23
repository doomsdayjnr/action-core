import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { ACTIONS_CORS_HEADERS } from '@solana/actions';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> | { slug: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const slug = resolvedParams.slug;

    if (!slug) {
      return Response.json({ error: 'Slug required' }, { status: 400 });
    }

    const blink = await prisma.blink.findUnique({
      where: { slug },
      include: {
        merchant: { select: { walletAddress: true, payoutAddress: true } },
        token: true
      }
    });

    if (!blink || !blink.active) {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }

    // Always return HTML with embedded JSON for actions
    const actionUrl = `/api/blinks/action/${slug}`;
    
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(blink.title)}</title>
  <meta name="description" content="${escapeHtml(blink.description)}">
  <meta property="og:title" content="${escapeHtml(blink.title)}">
  <meta property="og:description" content="${escapeHtml(blink.description)}">
  <meta property="og:image" content="${blink.icon || blink.imageUrl || 'https://actioncore.com/og.png'}">
  <meta property="og:type" content="product">
  <meta property="og:url" content="${request.url}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:site" content="@actioncore">
  <meta name="twitter:title" content="${escapeHtml(blink.title)}">
  <meta name="twitter:description" content="${escapeHtml(blink.description)}">
  <meta name="twitter:image" content="${blink.icon || blink.imageUrl || 'https://actioncore.com/og.png'}">
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-50">
  <div class="max-w-md mx-auto p-4">
    <div class="text-center py-4">
      <span class="font-bold text-xl">⚡ ActionCore</span>
    </div>
    
    <div class="bg-white rounded-2xl shadow-lg overflow-hidden">
      ${blink.icon || blink.imageUrl ? `<div class="aspect-square bg-gray-100"><img src="${blink.icon || blink.imageUrl}" class="w-full h-full object-cover"></div>` : ''}
      
      <div class="p-6">
        <h1 class="text-2xl font-bold mb-2">${escapeHtml(blink.title)}</h1>
        <p class="text-gray-600 text-sm mb-4">${escapeHtml(blink.description)}</p>
        <p class="text-3xl font-bold text-purple-600 mb-4">${blink.amount} ${blink.currency}</p>
        
        <a href="${actionUrl}" class="block w-full py-4 bg-purple-600 text-white text-center font-bold rounded-xl">
          ${escapeHtml(blink.label || 'Buy Now')}
        </a>
      </div>
    </div>
    
    <p class="text-center text-xs text-gray-400 mt-4">Powered by ActionCore</p>
  </div>
  
  <!-- Solana Actions Support -->
  <script>
    window.ACTIONS_API_ENDPOINT = '${actionUrl}';
  </script>
</body>
</html>`;

    // Update click count
    prisma.blink.update({
      where: { id: blink.id },
      data: { clickCount: { increment: 1 } }
    }).catch(() => {});

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'no-cache, no-store, must-revalidate, private',
        'Pragma': 'no-cache',
        'Expires': '-1',
        'Vary': 'Accept-Encoding',
        ...ACTIONS_CORS_HEADERS
      }
    });

  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/\n/g, ' ') // Remove newlines
    .replace(/\r/g, ' ') // Remove carriage returns
    .replace(/\s+/g, ' '); // Collapse multiple spaces
}

export const OPTIONS = async () => {
  return new Response(null, { headers: ACTIONS_CORS_HEADERS });
};
