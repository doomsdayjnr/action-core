import { StatCard } from './StatCard';

interface OverviewProps {
  orders: any[];
  blinks: any[];
  totalRevenue: number;
  activeBlinks: number;
  setShowCreateBlink: (show: boolean) => void;
}

export function OverviewContent({ orders, blinks, totalRevenue, activeBlinks, setShowCreateBlink }: OverviewProps) {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
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
        <StatCard title="💰 Total Revenue" value={`${totalRevenue.toFixed(2)} SOL`} />
        <StatCard title="⚡ Active Blinks" value={activeBlinks} />
        <StatCard title="🛒 Total Orders" value={orders.length} />
        <StatCard title="👀 Total Clicks" value={blinks.reduce((sum, b) => sum + (b.clickCount || 0), 0)} />
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