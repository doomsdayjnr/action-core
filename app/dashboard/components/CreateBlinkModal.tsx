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
            <h2 className="text-2xl font-bold mb-2">Blink Created!</h2>
            <p className="text-gray-500 mb-6">Your payment link is live and ready to share.</p>
            <div className="bg-gray-50 p-4 rounded-xl mb-6 break-all font-mono text-sm border border-gray-200">
              {createdBlink.publicUrl}
            </div>
            <button onClick={onClose} className="w-full py-4 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 transition-colors">
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Create New Blink</h2>
              <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Product Title</label>
                  <input required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-500" placeholder="e.g. Pro Membership" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price (Amount)</label>
                  <input required type="number" step="0.000001" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-500" placeholder="0.1" />
                </div>
              </div>

              {/* Action Type & Currency */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select value={formData.actionType} onChange={e => setFormData({...formData, actionType: e.target.value})} className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-500 bg-white">
                    <option value="DIGITAL">Digital / Simple Pay</option>
                    <option value="PHYSICAL">Physical Product (Shipping)</option>
                    <option value="TOKEN_SALE">Token Sale (Dynamic Price)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                  <select value={formData.currency} onChange={e => setFormData({...formData, currency: e.target.value})} className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-500 bg-white">
                    <option value="SOL">SOL</option>
                    <option value="USDC">USDC</option>
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea required value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-500 h-24" placeholder="What is the user paying for?" />
              </div>

              <button type="submit" disabled={loading} className="w-full py-4 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 transition-colors disabled:opacity-50">
                {loading ? 'Creating...' : 'Launch Blink'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}