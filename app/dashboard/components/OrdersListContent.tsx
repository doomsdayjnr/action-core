import React from 'react';

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

interface OrdersListContentProps {
  orders: Order[];
}

export function OrdersListContent({ orders }: OrdersListContentProps) {
  
  // Helper to color-code status badges
  const getStatusStyle = (status: string) => {
    switch (status.toUpperCase()) {
      case 'CONFIRMED':
      case 'PAID':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'SHIPPED':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'CANCELLED':
      case 'REFUNDED':
        return 'bg-red-100 text-red-700 border-red-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  // Helper for Solscan links
  const openSolscan = (sig: string) => {
    window.open(`https://solscan.io/tx/${sig}?cluster=devnet`, '_blank');
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm animate-in slide-in-from-bottom-4 duration-300">
      <div className="p-6 border-b border-gray-100 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Sales & Fulfillment</h2>
          <p className="text-sm text-gray-500">Track your incoming payments and customer shipping details.</p>
        </div>
        <div className="text-sm font-medium text-gray-400">
          {orders.length} total orders
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer & Email</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Product / Amount</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Shipping Details</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">TX</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {orders.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                  No orders found. Once a customer uses your Blink, it will appear here.
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50 transition-colors group">
                  {/* Customer Info */}
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{order.shippingName || 'Anonymous User'}</div>
                    <div className="text-xs text-gray-500 truncate w-32" title={order.customerWallet}>
                      {order.customerWallet.slice(0, 4)}...{order.customerWallet.slice(-4)}
                    </div>
                    {order.customerEmail && (
                      <div className="text-xs text-purple-600 font-medium">{order.customerEmail}</div>
                    )}
                  </td>

                  {/* Amount */}
                  <td className="px-6 py-4">
                    <div className="text-sm font-bold text-gray-900">
                      {order.amount} {order.currency}
                    </div>
                    <div className="text-[10px] text-gray-400 uppercase font-bold">
                      ID: {order.orderIdMemo}
                    </div>
                  </td>

                  {/* Shipping Info (Conditional) */}
                  <td className="px-6 py-4 max-w-xs">
                    {order.shippingAddress ? (
                      <div className="text-xs text-gray-600 leading-relaxed">
                        {order.shippingAddress}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-300 italic font-light italic">No shipping required</span>
                    )}
                  </td>

                  {/* Status Badge */}
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${getStatusStyle(order.status)}`}>
                      {order.status}
                    </span>
                    <div className="text-[10px] text-gray-400 mt-1">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </div>
                  </td>

                  {/* Solscan Action */}
                  <td className="px-6 py-4">
                    {order.transactionSignature ? (
                      <button 
                        onClick={() => openSolscan(order.transactionSignature!)}
                        className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all"
                        title="View on Solscan"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </button>
                    ) : (
                      <span className="text-xs text-gray-300">Pending...</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}