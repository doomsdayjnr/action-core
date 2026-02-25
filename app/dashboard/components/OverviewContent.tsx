import { StatCard } from './StatCard';

interface OverviewProps {
  orders: any[];
  blinks: any[];
  merchant: any;
  confirmedOrders: any;
  totalRevenue: number;
  activeBlinks: number;
  setShowCreateBlink: (show: boolean) => void;
}

export function OverviewContent({ orders, blinks, merchant, confirmedOrders, totalRevenue, activeBlinks, setShowCreateBlink }: OverviewProps) {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header with Create Button */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
          <p className="text-gray-500 text-sm">Welcome back! Here is how your Blinks are performing.</p>
        </div>
        <button 
          onClick={() => setShowCreateBlink(true)}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 hover:scale-105 transition-all shadow-lg shadow-purple-100"
        >
          <span className="text-xl">+</span> Create New Blink
        </button>
      </div>

      {/* Empty State Banner */}
      {blinks.length === 0 && (
        <div className="bg-gradient-to-r from-purple-600 to-blue-700 rounded-2xl p-8 text-white shadow-lg">
          <h2 className="text-3xl font-bold mb-2">Ready to accept payments?</h2>
          <p className="text-purple-100 mb-6">Create your first Blink and get paid instantly on Solana.</p>
          <button 
            onClick={() => setShowCreateBlink(true)}
            className="px-6 py-3 bg-white text-purple-700 font-bold rounded-xl hover:bg-gray-100 transition-all"
          >
            Create Your First Blink →
          </button>
        </div>
      )}

      {/* Stats */}
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

      {/* Recent Orders Preview */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="font-bold text-gray-900">Recent Orders</h2>
        </div>
        <div className="p-6 text-center text-gray-500">
           {orders.length === 0 ? "No orders yet." : "Order table goes here..."}
        </div>
      </div>
    </div>
  );
}