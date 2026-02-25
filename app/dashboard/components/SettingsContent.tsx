import React, { useState } from 'react';

interface Merchant {
  id: string;
  walletAddress: string;
  payoutAddress?: string;
  email: string | null;
  apiKey: string;
  subscription: {
    tier: string;
    status: string;
  } | null;
}

interface SettingsContentProps {
  merchant: Merchant;
  onUpdate: () => Promise<void>; // To refresh data after saving
}

export function SettingsContent({ merchant, onUpdate }: SettingsContentProps) {
  const [payoutAddress, setPayoutAddress] = useState(merchant.payoutAddress || merchant.walletAddress);
  const [email, setEmail] = useState(merchant.email || '');
  const [isSaving, setIsSaving] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/merchant', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payoutAddress, email }),
      });

      if (response.ok) {
        await onUpdate();
        alert('Settings updated successfully!');
      }
    } catch (error) {
      console.error('Save error:', error);
      alert('Failed to save settings.');
    } finally {
      setIsSaving(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  return (
    <div className="max-w-4xl space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* API Configuration Card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">API & Integrations</h2>
          <p className="text-sm text-gray-500">Use this key to connect ActionCore to WordPress or Shopify.</p>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Your API Key</label>
            <div className="flex gap-2">
              <input 
                type={showApiKey ? "text" : "password"}
                readOnly
                value={merchant.apiKey}
                className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-sm font-mono text-gray-600 focus:outline-none"
              />
              <button 
                onClick={() => setShowApiKey(!showApiKey)}
                className="px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm"
              >
                {showApiKey ? "Hide" : "Show"}
              </button>
              <button 
                onClick={() => copyToClipboard(merchant.apiKey)}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-bold"
              >
                Copy
              </button>
            </div>
            <p className="mt-2 text-xs text-amber-600 font-medium">
              ⚠️ Never share your API key. If leaked, anyone can create orders on your behalf.
            </p>
          </div>
        </div>
      </div>

      {/* Payout & Profile Card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Payout & Profile</h2>
          <p className="text-sm text-gray-500">Configure where you receive your SOL and how we contact you.</p>
        </div>
        <div className="p-6 space-y-6">
          {/* Payout Address */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Payout Wallet Address (Solana)</label>
            <input 
              type="text"
              value={payoutAddress}
              onChange={(e) => setPayoutAddress(e.target.value)}
              placeholder="e.g. GvH2...3fXk"
              className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
            />
            <p className="mt-1 text-xs text-gray-400">This is where your 99% share of every sale will be sent.</p>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Business Email</label>
            <input 
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="merchant@example.com"
              className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
            />
          </div>

          {/* Plan Info */}
          <div className="pt-4 border-t border-gray-50 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">Subscription Plan</p>
              <p className="text-xs text-purple-600 font-bold uppercase tracking-wider">
                {merchant.subscription?.tier || 'FREE'} PLAN
              </p>
            </div>
            <button className="px-4 py-2 border border-purple-200 text-purple-600 rounded-lg text-sm font-bold hover:bg-purple-50 transition-colors">
              Upgrade Plan
            </button>
          </div>
        </div>
        
        {/* Footer Actions */}
        <div className="bg-gray-50 px-6 py-4 flex justify-end">
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className={`px-6 py-2 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-700 transition-all ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

    </div>
  );
}