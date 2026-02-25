import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'X-Action-Version': '2.0',
  'X-Blockchain-Ids': 'solana',
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> | { slug: string } }
) {
  try {
    const { slug } = await Promise.resolve(params);

    const blink = await prisma.blink.findUnique({
      where: { slug },
      include: { merchant: true }
    });

    if (!blink || !blink.active) {
      return new NextResponse('Product not found or inactive', { status: 404 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `https://${request.headers.get('host')}`;
    const actionApiUrl = `${baseUrl}/api/blinks/action/${blink.id}`;
    
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(blink.title)} | ActionCore</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
    body { font-family: 'Inter', sans-serif; background: #f9fafb; }
    .glass { background: rgba(255, 255, 255, 0.8); backdrop-filter: blur(10px); }
  </style>
</head>
<body class="flex items-center justify-center min-h-screen p-4">
  <div class="max-w-md w-full glass rounded-3xl shadow-2xl overflow-hidden border border-white">
    ${blink.imageUrl ? `
      <div class="h-64 overflow-hidden relative border-b border-gray-100">
        <img src="${blink.imageUrl}" class="w-full h-full object-cover" alt="Product" />
        <div class="absolute top-4 right-4 bg-white/95 px-3 py-1 rounded-full text-sm font-bold text-purple-600 shadow-sm border border-white">
          ${blink.amount} ${blink.currency}
        </div>
      </div>
    ` : ''}

    <div class="p-8">
      <h1 class="text-2xl font-bold text-gray-900 mb-2">${escapeHtml(blink.title)}</h1>
      <p class="text-gray-500 text-sm mb-8 leading-relaxed">${escapeHtml(blink.description)}</p>

      <form id="blink-form" class="space-y-4">
        <div class="grid grid-cols-1 gap-4">
          <div class="space-y-1">
            <label class="text-[10px] uppercase tracking-widest font-bold text-gray-400 ml-1">Full Name</label>
            <input required name="name" type="text" placeholder="John Doe" 
              class="w-full px-4 py-3 bg-gray-50/50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none transition-all" />
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="space-y-1">
            <label class="text-[10px] uppercase tracking-widest font-bold text-gray-400 ml-1">Email Address</label>
            <input required name="email" type="email" placeholder="john@example.com" 
              class="w-full px-4 py-3 bg-gray-50/50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none transition-all" />
          </div>
          <div class="space-y-1">
            <label class="text-[10px] uppercase tracking-widest font-bold text-gray-400 ml-1">Phone (Optional)</label>
            <input name="phone" type="tel" placeholder="+1..." 
              class="w-full px-4 py-3 bg-gray-50/50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none transition-all" />
          </div>
        </div>

        <div class="space-y-1">
          <label class="text-[10px] uppercase tracking-widest font-bold text-gray-400 ml-1">Shipping Address</label>
          <textarea required name="address" rows="2" placeholder="Street, City, Zip, Country" 
            class="w-full px-4 py-3 bg-gray-50/50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none transition-all"></textarea>
        </div>

        <button type="submit" id="submit-btn" 
          class="w-full py-4 mt-6 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-2xl shadow-xl shadow-purple-100 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3">
          <span>${blink.label || 'Buy Now'}</span>
          <span class="opacity-40 font-light">|</span>
          <span>${blink.amount} ${blink.currency}</span>
        </button>
      </form>

      <div id="status" class="mt-4 text-center text-sm hidden"></div>
    </div>
    
    <div class="p-4 bg-gray-50/50 border-t border-gray-100 text-center">
      <p class="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Secure Solana Checkout • ActionCore</p>
    </div>
  </div>

  <script>
    const form = document.getElementById('blink-form');
    const btn = document.getElementById('submit-btn');

    form.onsubmit = async (e) => {
      e.preventDefault();
      btn.disabled = true;
      btn.innerHTML = 'Connecting to Wallet...';
      
      const formData = new FormData(form);
      const params = Object.fromEntries(formData.entries());

      // We redirect to the official Solana Blink player.
      // This player handles the wallet connection and signature flow.
      const actionUrl = "${actionApiUrl}";
      const queryParams = new URLSearchParams(params).toString();
      
      // Using the industry standard player to ensure the wallet pops up correctly
      window.location.href = "https://blinks.solana.com/" + actionUrl + "?" + queryParams;
    };
  </script>
</body>
</html>`;

    // Increment click count
    prisma.blink.update({
      where: { id: blink.id },
      data: { clickCount: { increment: 1 } }
    }).catch(() => {});

    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html', ...CORS_HEADERS }
    });

  } catch (error) {
    console.error('Blink Error:', error);
    return new NextResponse('Error', { status: 500 });
  }
}

function escapeHtml(unsafe: string) {
  return unsafe.replace(/[&<"']/g, m => ({ '&': '&amp;', '<': '&lt;', '"': '&quot;', "'": '&#039;' }[m] || m));
}