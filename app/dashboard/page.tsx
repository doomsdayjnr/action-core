'use client';

import { useEffect, useState, useMemo } from 'react';
import { useWallet, WalletProvider, ConnectionProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider, WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import '@solana/wallet-adapter-react-ui/styles.css';

// Types
interface Merchant {
  id: string;
  walletAddress: string;
  email: string | null;
  apiKey: string;
  subscription: {
    status: string;
    tier: string;
    activeBlinksLimit: number;
  } | null;
}

interface Order {
  id: string;
  customerWallet: string;
  customerEmail: string | null;
  shippingAddress: string | null;
  shippingName: string | null;
  amount: number;
  currency: string;
  status: string;
  orderIdMemo: string;
  transactionSignature: string | null;
  createdAt: string;
  confirmedAt: string | null;
}

interface Blink {
  id: string;
  title: string;
  slug: string;
  publicUrl: string | null;
  amount: number;
  currency: string;
  actionType: string;
  active: boolean;
  clickCount: number;
  totalVolume: number;
  orderCount: number;
  createdAt: string;
}

// Icons
const Icons = {
  Dashboard: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  ),
  Blinks: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
    </svg>
  ),
  Orders: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
    </svg>
  ),
  Settings: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  Copy: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  ),
  External: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
  ),
  ChevronDown: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  )
};

// Stat Card Component
function StatCard({ title, value, subtitle, trend, trendUp }: { 
  title: string; 
  value: string | number; 
  subtitle?: string;
  trend?: string;
  trendUp?: boolean;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <p className="text-sm font-medium text-gray-600">{title}</p>
      <div className="mt-2 flex items-baseline gap-2">
        <p className="text-3xl font-bold text-gray-900">{value}</p>
        {trend && (
          <span className={`text-sm font-medium ${trendUp ? 'text-green-600' : 'text-red-600'}`}>
            {trend}
          </span>
        )}
      </div>
      {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
    </div>
  );
}

// Sidebar Navigation Item
function NavItem({ icon: Icon, label, active, onClick }: { 
  icon: React.ComponentType; 
  label: string; 
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
        active 
          ? 'bg-purple-50 text-purple-700' 
          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
      }`}
    >
      <Icon />
      {label}
    </button>
  );
}

// Create Blink Modal Component
function CreateBlinkModal({ 
  isOpen, 
  onClose, 
  walletAddress, 
  onSuccess 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  walletAddress: string;
  onSuccess: () => void;
}) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    label: '',
    amount: '',
    currency: 'SOL',
    actionType: 'TRANSFER',
    icon: 'https://actioncore.com/default-icon.png',
    // Token sale specific fields
    tokenSymbol: '',
    tokenMint: '',
    tokenLogoUrl: ''
  });
  const [createdBlink, setCreatedBlink] = useState<any>(null);
  const [priceSource, setPriceSource] = useState<'dynamic'>('dynamic');

  if (!isOpen) return null;

  const isTokenSale = formData.actionType === 'SPL_TOKEN';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const res = await fetch('/api/blinks/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress,
          ...formData,
          amount: parseFloat(formData.amount),
          icon: formData.icon || 'https://actioncore.com/default-icon.png'
        })
      });
      
      const data = await res.json();
      
      if (data.success) {
        setCreatedBlink(data.blink);
        setStep(3);
        onSuccess();
      } else {
        alert(data.error || 'Failed to create Blink');
      }
    } catch (err) {
      alert('Error creating Blink');
    } finally {
      setLoading(false);
    }
  };

  const copyLink = () => {
    if (createdBlink?.publicUrl) {
      navigator.clipboard.writeText(createdBlink.publicUrl);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {step === 1 && "Create Your Blink"}
              {step === 2 && "Review Your Blink"}
              {step === 3 && "🎉 You're Live!"}
            </h2>
            <p className="text-sm text-gray-500">
              {step === 1 && "Step 1 of 2 - Fill in the details"}
              {step === 2 && "Step 2 of 2 - Ready to publish"}
              {step === 3 && "Your payment link is ready to share"}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 1 && (
            <form onSubmit={(e) => { e.preventDefault(); setStep(2); }} className="space-y-4">
              {/* Product Type Selection - First */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">What type of product?</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: 'TRANSFER', label: 'Digital/Service', icon: '💎', desc: 'Sell digital products or services' },
                    { value: 'PHYSICAL', label: 'Physical Product', icon: '📦', desc: 'Ship physical items to customers' },
                    { value: 'SPL_TOKEN', label: 'Token Sale', icon: '🪙', desc: 'Sell your SPL tokens' },
                    { value: 'NFT_MINT', label: 'NFT', icon: '🎨', desc: 'Mint and sell NFTs' }
                  ].map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setFormData({...formData, actionType: type.value})}
                      className={`p-3 rounded-xl border-2 text-left transition-all ${
                        formData.actionType === type.value
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-purple-300'
                      }`}
                    >
                      <span className="text-2xl">{type.icon}</span>
                      <p className="text-sm font-medium mt-1">{type.label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{type.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {isTokenSale ? 'Token Name' : 'What are you selling?'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={isTokenSale ? "e.g., MyToken (MTK)" : "e.g., Digital Art, Consulting Session"}
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              {/* Button Label - For all types */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Button Text</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Buy Now, Purchase, Get It"
                  value={formData.label}
                  onChange={(e) => setFormData({...formData, label: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">This is the text customers see on the payment button</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  required
                  rows={3}
                  placeholder={isTokenSale ? "Describe your token and its utility..." : "Describe what your customers will get..."}
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                />
              </div>

              {/* Token Sale Specific Fields */}
              {isTokenSale && (
                <div className="space-y-4 p-4 bg-purple-50 rounded-xl border border-purple-100">
                  <h4 className="font-semibold text-purple-900 flex items-center gap-2">
                    🪙 Token Configuration
                  </h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Token Symbol</label>
                      <input
                        type="text"
                        required
                        placeholder="MTK"
                        value={formData.tokenSymbol}
                        onChange={(e) => setFormData({...formData, tokenSymbol: e.target.value.toUpperCase()})}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Token Logo URL</label>
                      <input
                        type="url"
                        placeholder="https://..."
                        value={formData.tokenLogoUrl}
                        onChange={(e) => setFormData({...formData, tokenLogoUrl: e.target.value, icon: e.target.value})}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Token Mint Address</label>
                    <input
                      type="text"
                      required
                      placeholder="Enter your SPL token mint address..."
                      value={formData.tokenMint}
                      onChange={(e) => setFormData({...formData, tokenMint: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-sm"
                    />
                    <p className="text-xs text-gray-500 mt-1">The mint address of your token on Solana</p>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <div>
                        <p className="text-sm font-medium text-amber-900">You Provide the Price Source</p>
                        <p className="text-sm text-amber-700 mt-1">
                          Enter your own price API URL to avoid rate limits. We don't call external APIs on your behalf.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Price API URL</label>
                    <input
                      type="url"
                      required
                      placeholder="https://price.jup.ag/v4/price?ids=YOUR_TOKEN_MINT"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-sm"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      This endpoint should return JSON with current price. 
                      <a href="#" className="text-purple-600 hover:underline" onClick={(e) => { e.preventDefault(); alert('Example:\n{\n  "data": {\n    "TOKEN_MINT": {\n      "price": 0.00123\n    }\n  }\n}'); }}>See example format</a>
                    </p>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <p className="text-xs font-medium text-gray-700 mb-2">Popular Price Sources:</p>
                    <div className="space-y-1 text-xs">
                      <p className="text-gray-600">
                        <span className="font-mono bg-gray-200 px-1 rounded">Jupiter:</span> https://price.jup.ag/v4/price?ids=YOUR_MINT
                      </p>
                      <p className="text-gray-600">
                        <span className="font-mono bg-gray-200 px-1 rounded">CoinGecko:</span> https://api.coingecko.com/api/v3/simple/token_price/solana?contract_addresses=YOUR_MINT&vs_currencies=sol
                      </p>
                      <p className="text-gray-600">
                        <span className="font-mono bg-gray-200 px-1 rounded">Custom:</span> Your own API endpoint
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Regular Amount/Currency for non-token sales */}
              {/* Product Images - For Digital/Physical */}
              {!isTokenSale && (
                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <label className="block text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Product Image
                      <span className="text-red-500">*</span>
                    </label>
                    
                    {/* Image Preview */}
                    {formData.icon && formData.icon !== 'https://actioncore.com/default-icon.png' && (
                      <div className="mb-3">
                        <div className="w-full h-40 bg-gray-100 rounded-lg overflow-hidden">
                          <img 
                            src={formData.icon} 
                            alt="Preview" 
                            className="w-full h-full object-cover"
                            onError={(e) => { (e.target as HTMLImageElement).src = ''; setFormData({...formData, icon: ''}); }}
                          />
                        </div>
                      </div>
                    )}
                    
                    <input
                      type="url"
                      required
                      placeholder="https://your-image-url.com/product.jpg"
                      value={formData.icon === 'https://actioncore.com/default-icon.png' ? '' : formData.icon}
                      onChange={(e) => setFormData({...formData, icon: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      Enter a direct URL to your product image. Recommended size: 1200x630px
                    </p>
                    
                    {/* Quick Image Examples */}
                    <div className="mt-3 flex gap-2">
                      <span className="text-xs text-gray-400">Quick tips:</span>
                      <span className="text-xs text-purple-600">Use clear photos</span>
                      <span className="text-xs text-gray-300">•</span>
                      <span className="text-xs text-purple-600">Good lighting</span>
                      <span className="text-xs text-gray-300">•</span>
                      <span className="text-xs text-purple-600">White background</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                      <input
                        type="number"
                        step="0.001"
                        required
                        placeholder="0.00"
                        value={formData.amount}
                        onChange={(e) => setFormData({...formData, amount: e.target.value})}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                      <select
                        value={formData.currency}
                        onChange={(e) => setFormData({...formData, currency: e.target.value})}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      >
                        <option value="SOL">SOL</option>
                        <option value="USDC">USDC</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-4 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl transition-all hover:shadow-lg"
              >
                Continue →
              </button>
            </form>
          )}

          {step === 2 && (
            <div className="space-y-6">
              {/* Preview Card */}
              <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0">
                    {formData.icon || formData.tokenLogoUrl ? (
                      <img src={formData.tokenLogoUrl || formData.icon} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-white text-2xl">⚡</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-900">{formData.title}</h3>
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">{formData.description}</p>
                    
                    {isTokenSale ? (
                      <div className="mt-3 space-y-2">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-purple-50 rounded-lg">
                          <span className="text-sm font-medium text-purple-700">Current Price:</span>
                          <span className="text-sm font-bold text-purple-900">Dynamic</span>
                          <span className="text-xs text-purple-600">via Your API</span>
                        </div>
                        <p className="text-xs text-gray-500">
                          Token: {formData.tokenMint.slice(0, 6)}...{formData.tokenMint.slice(-6)}
                        </p>
                      </div>
                    ) : (
                      <div className="mt-3 space-y-2">
                        <p className="text-lg font-bold text-purple-600">
                          {formData.amount} {formData.currency}
                        </p>
                        {formData.label && (
                          <div className="inline-block px-4 py-2 bg-purple-600 text-white text-sm font-semibold rounded-lg">
                            {formData.label}
                          </div>
                        )}
                        {formData.icon && formData.icon !== 'https://actioncore.com/default-icon.png' && (
                          <p className="text-xs text-green-600 flex items-center gap-1">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            Product image added
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Powered by ActionCore */}
                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 bg-gradient-to-br from-purple-500 to-blue-500 rounded flex items-center justify-center">
                      <span className="text-white text-xs font-bold">A</span>
                    </div>
                    <span className="text-xs text-gray-400">Powered by ActionCore</span>
                  </div>
                  <span className="text-xs text-gray-300">actioncore.com</span>
                </div>
              </div>

              {/* Token Sale Summary */}
              {isTokenSale && (
                <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
                  <h4 className="font-semibold text-purple-900 mb-3 flex items-center gap-2">
                    <span>🪙</span> Token Sale Configuration
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Token:</span>
                      <span className="font-medium">{formData.title} ({formData.tokenSymbol})</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Pricing:</span>
                      <span className="font-medium text-green-700">Dynamic (Your API)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Mint:</span>
                      <span className="font-mono text-xs">{formData.tokenMint.slice(0, 8)}...{formData.tokenMint.slice(-8)}</span>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-purple-200">
                    <p className="text-xs text-purple-700">
                      💡 You provide the price API - we never hit rate limits!
                    </p>
                  </div>
                </div>
              )}

              <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                <p className="text-sm text-blue-800">
                  <span className="font-semibold">💡 Tip:</span> Your customers will see this exact preview when they click your link. Make sure it looks good!
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 py-3 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50"
                >
                  ← Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl transition-all disabled:opacity-50"
                >
                  {loading ? 'Creating...' : '🚀 Publish Blink'}
                </button>
              </div>
            </div>
          )}

          {step === 3 && createdBlink && (
            <div className="text-center space-y-6">
              <div className="w-20 h-20 bg-green-100 rounded-full mx-auto flex items-center justify-center">
                <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Your Blink is live!</h3>
                <p className="text-gray-600">Share this link to start accepting payments</p>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <code className="block text-sm font-mono text-gray-700 break-all mb-3">
                  {createdBlink.publicUrl}
                </code>
                <button
                  onClick={copyLink}
                  className="w-full py-2 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 inline-flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy Link
                </button>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => { 
                  setStep(1); 
                  setFormData({ 
                    title: '', 
                    description: '',
                    label: '', 
                    amount: '', 
                    currency: 'SOL', 
                    actionType: 'TRANSFER', 
                    icon: 'https://actioncore.com/default-icon.png',
                    tokenSymbol: '',
                    tokenMint: '',
                    tokenLogoUrl: ''
                  }); 
                  setCreatedBlink(null); 
                }}
                  className="flex-1 py-3 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50"
                >
                  Create Another
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl"
                >
                  Done
                </button>
              </div>

              <p className="text-xs text-gray-400">
                Your Blink will appear in your dashboard under "My Blinks"
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DashboardContent() {
  const { publicKey, connected, disconnect } = useWallet();
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [blinks, setBlinks] = useState<Blink[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'blinks' | 'orders'>('overview');
  const [showCreateBlink, setShowCreateBlink] = useState(false);

  // Fetch data when wallet connects
  useEffect(() => {
    if (connected && publicKey) {
      fetchDashboardData(publicKey.toString());
    } else {
      setMerchant(null);
      setOrders([]);
      setBlinks([]);
      setError(null);
    }
  }, [connected, publicKey]);

  const fetchDashboardData = async (walletAddress: string) => {
    setLoading(true);
    setError(null);
    try {
      // Fetch merchant
      const merchantRes = await fetch(`/api/merchant?wallet=${walletAddress}`);
      if (!merchantRes.ok) throw new Error('Failed to load merchant');
      const merchantData = await merchantRes.json();
      setMerchant(merchantData);

      // Fetch orders
      const ordersRes = await fetch(`/api/merchant/orders?wallet=${walletAddress}`);
      if (ordersRes.ok) {
        const ordersData = await ordersRes.json();
        setOrders(ordersData.orders || []);
      }

      // Fetch blinks
      const blinksRes = await fetch(`/api/blinks/create?wallet=${walletAddress}`);
      if (blinksRes.ok) {
        const blinksData = await blinksRes.json();
        setBlinks(blinksData.blinks || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    await disconnect();
    setMerchant(null);
    setOrders([]);
    setBlinks([]);
  };

  const copyApiKey = () => {
    if (merchant?.apiKey) {
      navigator.clipboard.writeText(merchant.apiKey);
      // Could add toast notification here
    }
  };

  const copyBlinkUrl = (url: string) => {
    navigator.clipboard.writeText(url);
  };

  // Calculate stats
  const totalRevenue = orders.reduce((sum, o) => sum + (o.status === 'CONFIRMED' ? o.amount : 0), 0);
  const confirmedOrders = orders.filter(o => o.status === 'CONFIRMED').length;
  const activeBlinks = blinks.filter(b => b.active).length;

  // Not connected state
  if (!connected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-purple-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          {/* Animated Logo */}
          <div className="text-center mb-8">
            <div className="relative w-20 h-20 mx-auto mb-6">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl transform rotate-3 opacity-20"></div>
              <div className="relative w-20 h-20 bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl flex items-center justify-center shadow-2xl">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Turn any link into a payment</h1>
            <p className="text-gray-600 text-lg">The fastest way to accept crypto anywhere</p>
          </div>
          
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
            {/* Social Proof */}
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 px-6 py-3 border-b border-gray-100">
              <p className="text-sm text-gray-600 text-center">
                <span className="font-semibold text-purple-700">Join 10,000+ merchants</span> already accepting crypto
              </p>
            </div>
            
            <div className="p-8">
              <div className="space-y-6">
                <div className="text-center">
                  <p className="text-gray-600 mb-6 leading-relaxed">
                    Connect your wallet and create your first payment link in under 60 seconds. No coding required.
                  </p>
                  <div className="flex justify-center">
                    <WalletMultiButton />
                  </div>
                </div>
                
                {/* Feature List */}
                <div className="pt-6 border-t border-gray-100">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <p className="text-xs font-medium text-gray-700">60s Setup</p>
                    </div>
                    <div>
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                      </div>
                      <p className="text-xs font-medium text-gray-700">Share Anywhere</p>
                    </div>
                    <div>
                      <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
                        <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <p className="text-xs font-medium text-gray-700">Only 1% Fee</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Trust Badges */}
          <div className="mt-6 flex items-center justify-center gap-6 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Non-custodial
            </span>
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Instant Settlement
            </span>
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Open Source
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Create Blink Modal */}
      {publicKey && (
        <CreateBlinkModal
          isOpen={showCreateBlink}
          onClose={() => setShowCreateBlink(false)}
          walletAddress={publicKey.toString()}
          onSuccess={() => {
            fetchDashboardData(publicKey.toString());
            setActiveTab('blinks');
          }}
        />
      )}

      {/* Top Navigation */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-200">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <span className="font-bold text-xl text-gray-900">ActionCore</span>
                <span className="hidden sm:inline-block ml-2 px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-semibold rounded-full">BETA</span>
              </div>
            </div>

            {/* User Menu */}
            <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm font-medium text-gray-700">
                  {publicKey?.toString().slice(0, 6)}...{publicKey?.toString().slice(-4)}
                </span>
              </div>
              <button
                onClick={handleDisconnect}
                className="text-sm text-gray-600 hover:text-gray-900 font-medium"
              >
                Disconnect
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Sidebar */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <nav className="space-y-1">
              <NavItem 
                icon={Icons.Dashboard} 
                label="Overview" 
                active={activeTab === 'overview'}
                onClick={() => setActiveTab('overview')}
              />
              <NavItem 
                icon={Icons.Blinks} 
                label="My Blinks" 
                active={activeTab === 'blinks'}
                onClick={() => setActiveTab('blinks')}
              />
              <NavItem 
                icon={Icons.Orders} 
                label="Orders" 
                active={activeTab === 'orders'}
                onClick={() => setActiveTab('orders')}
              />
              <NavItem 
                icon={Icons.Settings} 
                label="Settings"
                onClick={() => {}}
              />
            </nav>

            {/* Magic Link Card */}
            {merchant && (
              <div className="mt-8 p-4 bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl border border-purple-100">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                  <p className="text-xs font-bold text-purple-700 uppercase tracking-wide">Your Magic Link</p>
                </div>
                <p className="text-xs text-purple-600 mb-3">Use this to accept payments anywhere</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs font-mono text-purple-800 bg-white/50 px-2 py-1.5 rounded truncate">
                    {merchant.apiKey.slice(0, 16)}...
                  </code>
                  <button 
                    onClick={copyApiKey}
                    className="p-2 text-purple-600 hover:text-purple-800 hover:bg-white/50 rounded-lg transition-colors"
                    title="Copy API Key"
                  >
                    <Icons.Copy />
                  </button>
                </div>
                <a 
                  href="#" 
                  className="mt-3 flex items-center gap-1 text-xs text-purple-600 hover:text-purple-800"
                  onClick={(e) => { e.preventDefault(); alert('Documentation coming soon!'); }}
                >
                  <span>View Integration Guide</span>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </a>
              </div>
            )}
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-w-0">
            {loading ? (
              <div className="flex items-center justify-center h-96">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
              </div>
            ) : error ? (
              <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
                <p className="text-red-700 mb-4">{error}</p>
                <button
                  onClick={() => publicKey && fetchDashboardData(publicKey.toString())}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg"
                >
                  Retry
                </button>
              </div>
            ) : merchant ? (
              <div className="space-y-8">
                {/* Welcome Banner for New Users */}
                {blinks.length === 0 && orders.length === 0 && (
                  <div className="relative overflow-hidden bg-gradient-to-r from-purple-600 via-purple-700 to-blue-700 rounded-2xl p-8 text-white">
                    {/* Background Pattern */}
                    <div className="absolute inset-0 opacity-10">
                      <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full -mr-32 -mt-32"></div>
                      <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full -ml-24 -mb-24"></div>
                    </div>
                    
                    <div className="relative max-w-2xl">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="px-3 py-1 bg-white/20 rounded-full text-xs font-semibold">🎉 You're live!</span>
                        <span className="text-purple-200 text-sm">Account created just now</span>
                      </div>
                      <h2 className="text-3xl font-bold mb-3">Ready to accept your first crypto payment?</h2>
                      <p className="text-purple-100 text-lg mb-6 leading-relaxed">
                        Join thousands of merchants who use ActionCore to get paid instantly, anywhere. 
                        No coding. No waiting. Just share your link and get paid.
                      </p>
                      <div className="flex flex-wrap items-center gap-4">
                        <button 
                          onClick={() => setShowCreateBlink(true)}
                          className="px-8 py-4 bg-white text-purple-700 font-bold rounded-xl hover:bg-purple-50 transition-all hover:shadow-xl hover:scale-105 inline-flex items-center gap-2"
                        >
                          <span>Create Your First Blink</span>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                          </svg>
                        </button>
                        <a 
                          href="#" 
                          onClick={(e) => { e.preventDefault(); alert('Demo video coming soon!'); }}
                          className="text-purple-200 hover:text-white font-medium inline-flex items-center gap-1 transition-colors"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Watch how it works
                        </a>
                      </div>
                      <div className="mt-6 flex items-center gap-6 text-sm text-purple-200">
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          30 second setup
                        </span>
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          Works anywhere
                        </span>
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          Only 1% fee
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <StatCard 
                    title="💰 Total Revenue" 
                    value={totalRevenue > 0 ? `${totalRevenue.toFixed(2)} SOL` : "—"}
                    subtitle={totalRevenue > 0 ? "Across all orders" : "Your first payment is waiting!"}
                  />
                  <StatCard 
                    title="⚡ Active Blinks" 
                    value={activeBlinks}
                    subtitle={`${merchant.subscription?.activeBlinksLimit || 3} limit on ${merchant.subscription?.tier || 'FREE'} plan`}
                  />
                  <StatCard 
                    title="🛒 Total Orders" 
                    value={orders.length}
                    subtitle={`${confirmedOrders} confirmed • ${orders.filter(o => o.status === 'PENDING').length} pending`}
                  />
                  <StatCard 
                    title="👀 Total Clicks" 
                    value={blinks.reduce((sum, b) => sum + b.clickCount, 0)}
                    subtitle={`Across ${blinks.length} Blink${blinks.length !== 1 ? 's' : ''}`}
                  />
                </div>

                {/* Recent Orders */}
                <div className="bg-white rounded-xl border border-gray-200">
                  <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900">Recent Orders</h2>
                    {orders.length > 0 && (
                      <button 
                        onClick={() => setActiveTab('orders')}
                        className="text-sm text-purple-600 hover:text-purple-700 font-medium"
                      >
                        View all →
                      </button>
                    )}
                  </div>
                  
                  {orders.length === 0 ? (
                    <div className="p-12 text-center">
                      <div className="relative w-20 h-20 mx-auto mb-6">
                        <div className="absolute inset-0 bg-purple-100 rounded-full animate-pulse"></div>
                        <div className="relative w-20 h-20 bg-gradient-to-br from-purple-100 to-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-3xl">💰</span>
                        </div>
                      </div>
                      <h3 className="text-gray-900 font-semibold text-lg mb-2">Your first payment is waiting!</h3>
                      <p className="text-gray-500 mb-6 max-w-sm mx-auto">Create a Blink and share it with your customers. Most merchants get their first payment within 24 hours.</p>
                      <button 
                        onClick={() => setShowCreateBlink(true)}
                        className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl transition-all hover:shadow-lg hover:shadow-purple-200"
                      >
                        Create Your First Blink →
                      </button>
                      <p className="mt-4 text-xs text-gray-400">Takes 30 seconds • No coding required</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {orders.slice(0, 5).map((order) => (
                            <tr key={order.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4">
                                <p className="text-sm font-mono text-gray-900">{order.orderIdMemo}</p>
                              </td>
                              <td className="px-6 py-4">
                                <p className="text-sm text-gray-900">{order.shippingName || 'Anonymous'}</p>
                                <p className="text-xs text-gray-500">{order.customerEmail}</p>
                              </td>
                              <td className="px-6 py-4">
                                <p className="text-sm font-medium text-gray-900">{order.amount} {order.currency}</p>
                              </td>
                              <td className="px-6 py-4">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  order.status === 'CONFIRMED' ? 'bg-green-100 text-green-800' :
                                  order.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                                  order.status === 'SHIPPED' ? 'bg-blue-100 text-blue-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {order.status}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-500">
                                {new Date(order.createdAt).toLocaleDateString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* My Blinks Section */}
                <div className="bg-white rounded-xl border border-gray-200">
                  <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900">My Blinks</h2>
                    <button 
                      onClick={() => setShowCreateBlink(true)}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg"
                    >
                      + Create Blink
                    </button>
                  </div>
                  
                  {blinks.length === 0 ? (
                    <div className="p-12 text-center">
                      <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-pink-100 rounded-2xl mx-auto mb-6 flex items-center justify-center transform rotate-3">
                        <span className="text-4xl">⚡</span>
                      </div>
                      <h3 className="text-gray-900 font-semibold text-lg mb-2">Turn any link into a payment</h3>
                      <p className="text-gray-500 mb-6 max-w-sm mx-auto">Create your first Blink in 30 seconds. Share it anywhere—Twitter, Discord, Telegram, email, or your website.</p>
                      <button 
                        onClick={() => setShowCreateBlink(true)}
                        className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl transition-all hover:shadow-lg hover:shadow-purple-200 inline-flex items-center gap-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Create Your First Blink
                      </button>
                      <div className="mt-6 flex items-center justify-center gap-4 text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <svg className="w-3 h-3 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          Free to create
                        </span>
                        <span className="flex items-center gap-1">
                          <svg className="w-3 h-3 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          Share anywhere
                        </span>
                        <span className="flex items-center gap-1">
                          <svg className="w-3 h-3 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          Instant payments
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-200">
                      {blinks.slice(0, 3).map((blink) => (
                        <div key={blink.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3">
                              <h3 className="text-sm font-medium text-gray-900 truncate">{blink.title}</h3>
                              {blink.active ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                  Active
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                  Inactive
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-500 mt-1">
                              {blink.amount} {blink.currency} • {blink.clickCount} clicks • {blink.orderCount} orders
                            </p>
                          </div>
                          <div className="flex items-center gap-2 ml-4">
                            {blink.publicUrl && (
                              <button
                                onClick={() => copyBlinkUrl(blink.publicUrl!)}
                                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                                title="Copy link"
                              >
                                <Icons.Copy />
                              </button>
                            )}
                            <button
                              onClick={() => window.open(blink.publicUrl || '#', '_blank')}
                              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                              title="Open"
                            >
                              <Icons.External />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </main>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const network = WalletAdapterNetwork.Devnet;
  const endpoint = useMemo(
    () => "https://devnet.helius-rpc.com/?api-key=" + process.env.NEXT_PUBLIC_HELIUS_KEY,
    []
  );
  const wallets = useMemo(() => [], [network]);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <DashboardContent />
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
