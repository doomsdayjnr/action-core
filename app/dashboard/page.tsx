'use client';

import { useEffect, useState, useMemo } from 'react';
import { useWallet, WalletProvider, ConnectionProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider, WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import '@solana/wallet-adapter-react-ui/styles.css';
import { OverviewContent } from './components/OverviewContent';
import { BlinksListContent } from './components/BlinksListContent';
import { OrdersListContent } from './components/OrdersListContent';
import { SettingsContent } from './components/SettingsContent';
import { CreateBlinkModal } from './components/CreateBlinkModal';

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
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${active
          ? 'bg-purple-50 text-purple-700'
          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
        }`}
    >
      <Icon />
      {label}
    </button>
  );
}


function DashboardContent() {
  const { publicKey, connected, disconnect } = useWallet();
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [blinks, setBlinks] = useState<Blink[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'blinks' | 'orders'| 'settings'>('overview');
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
                active={activeTab === 'settings'}
                onClick={() => setActiveTab('settings')}
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
                <div className="flex items-center justify-center h-full">Loading...</div>
              ) : (
                <>
                  {activeTab === 'overview' && (
                    <OverviewContent 
                      orders={orders} 
                      blinks={blinks} 
                      totalRevenue={totalRevenue} 
                      activeBlinks={activeBlinks} 
                      setShowCreateBlink={setShowCreateBlink} 
                    />
                  )}
                  {activeTab === 'blinks' && (
                    <BlinksListContent blinks={blinks} copyBlinkUrl={copyBlinkUrl} setShowCreateBlink={setShowCreateBlink}/>
                  )}
                  {activeTab === 'orders' && (
                    <OrdersListContent orders={orders} />
                  )}
                  {activeTab === 'settings' && (
                    <SettingsContent 
                      merchant={merchant} 
                      onUpdate={() => fetchDashboardData(publicKey.toString())}
                    />
                  )}

                  <CreateBlinkModal 
                    isOpen={showCreateBlink} 
                    onClose={() => setShowCreateBlink(false)}
                    onSuccess={() => publicKey && fetchDashboardData(publicKey.toString())}
                    publicKey={publicKey}
                  />
                </>
              )}
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
