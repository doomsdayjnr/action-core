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
  const [loading, setLoading] = useState(false);
  const [createdBlink, setCreatedBlink] = useState<any>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    amount: '',
    currency: 'SOL',
    actionType: 'DIGITAL',
    tokenMintId: '',
    priceApiUrl: '',
    imageUrl: '',
    label: ''
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch('/api/blinks/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          merchantWallet: publicKey.toString(),
          amount: parseFloat(formData.amount)
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setCreatedBlink(data);
        onSuccess();
      } else {
        alert(data.error || 'Failed to create Blink');
      }
    } catch (error) {
      console.error('Create error:', error);
      alert('Error creating Blink');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {createdBlink ? (
          <div className="p-8 text-center">
            <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl">✓</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Blink Created!</h2>
            <p className="text-gray-500 mb-8">Your payment link is live and ready to share.</p>
            
            <div className="bg-gray-50 p-4 rounded-xl mb-8 border border-gray-200">
              <p className="text-xs text-gray-400 uppercase font-bold mb-2 text-left">Public URL</p>
              <div className="flex items-center justify-between gap-4">
                <code className="text-sm text-purple-600 font-mono truncate">{createdBlink.publicUrl}</code>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(createdBlink.publicUrl);
                    alert('Copied!');
                  }}
                  className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-bold hover:bg-gray-50 transition-colors shrink-0"
                >
                  Copy
                </button>
              </div>
            </div>

            <button 
              onClick={() => {
                setCreatedBlink(null);
                onClose();
              }}
              className="w-full py-4 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-8">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Create New Blink</h2>
                <p className="text-sm text-gray-500 mt-1">Configure your Solana Action payment link</p>
              </div>
              <button 
                type="button"
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-full text-gray-400 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-6">
              {/* Action Type Selection */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[
                  { id: 'DIGITAL', label: 'Simple Payment', icon: '⚡' },
                  { id: 'PHYSICAL', label: 'Physical Good', icon: '📦' },
                  { id: 'TOKEN_SALE', label: 'Token Sale', icon: '🪙' }
                ].map((type) => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setFormData({...formData, actionType: type.id})}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      formData.actionType === type.id 
                        ? 'border-purple-600 bg-purple-50' 
                        : 'border-gray-100 hover:border-gray-200'
                    }`}
                  >
                    <div className="text-2xl mb-1">{type.icon}</div>
                    <div className={`font-bold text-sm ${formData.actionType === type.id ? 'text-purple-600' : 'text-gray-600'}`}>
                      {type.label}
                    </div>
                  </button>
                ))}
              </div>

              {/* Basic Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-bold text-gray-700 ml-1">Title</label>
                  <input
                    required
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all outline-none"
                    placeholder="e.g. ActionCore Pro"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-bold text-gray-700 ml-1">Price</label>
                  <div className="relative">
                    <input
                      required
                      type="number"
                      step="0.000001"
                      className="w-full pl-4 pr-16 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all outline-none"
                      placeholder="0.00"
                      value={formData.amount}
                      onChange={(e) => setFormData({...formData, amount: e.target.value})}
                    />
                    <select 
                      className="absolute right-2 top-2 bottom-2 px-2 bg-white border border-gray-100 rounded-lg text-xs font-bold"
                      value={formData.currency}
                      onChange={(e) => setFormData({...formData, currency: e.target.value})}
                    >
                      <option value="SOL">SOL</option>
                      <option value="USDC">USDC</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-sm font-bold text-gray-700 ml-1">Description</label>
                <textarea
                  required
                  rows={3}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all outline-none"
                  placeholder="What will the customer receive?"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                />
              </div>

              {/* Dynamic Fields based on Type */}
              {formData.actionType === 'TOKEN_SALE' && (
                <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 space-y-4">
                  <div className="space-y-1">
                    <label className="text-sm font-bold text-amber-800 ml-1">Price API URL (Optional)</label>
                    <input
                      className="w-full px-4 py-3 bg-white border border-amber-200 rounded-xl outline-none text-sm"
                      placeholder="https://api.yourtoken.com/price"
                      value={formData.priceApiUrl}
                      onChange={(e) => setFormData({...formData, priceApiUrl: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-bold text-amber-800 ml-1">Token Mint Address</label>
                    <input
                      required
                      className="w-full px-4 py-3 bg-white border border-amber-200 rounded-xl outline-none text-sm"
                      placeholder="Enter SPL Token Mint"
                      value={formData.tokenMintId}
                      onChange={(e) => setFormData({...formData, tokenMintId: e.target.value})}
                    />
                  </div>
                </div>
              )}

              {/* Advanced UI Options */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-bold text-gray-700 ml-1">Image URL (Optional)</label>
                  <input
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none text-sm"
                    placeholder="https://..."
                    value={formData.imageUrl}
                    onChange={(e) => setFormData({...formData, imageUrl: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-bold text-gray-700 ml-1">Button Label (Optional)</label>
                  <input
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none text-sm"
                    placeholder="e.g. Buy Now"
                    value={formData.label}
                    onChange={(e) => setFormData({...formData, label: e.target.value})}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`w-full py-4 bg-purple-600 text-white font-bold rounded-xl shadow-lg shadow-purple-200 hover:bg-purple-700 hover:scale-[1.01] transition-all flex items-center justify-center gap-2 ${
                  loading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating...
                  </>
                ) : (
                  'Launch Your Blink 🚀'
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}