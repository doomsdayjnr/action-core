import React, { useState } from 'react';

export function CreateBlinkModal({ 
  isOpen, 
  onClose, 
  onSuccess, 
  publicKey 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onSuccess: () => void;
  publicKey: any;
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
            publicKey: publicKey.toString(),
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