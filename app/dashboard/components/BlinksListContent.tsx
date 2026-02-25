import {Icons} from "../page";

export function BlinksListContent({ blinks, copyBlinkUrl, setShowCreateBlink }: { blinks: any[], copyBlinkUrl: (url: string) => void, setShowCreateBlink: (val: boolean) => void }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
      <div className="p-6 border-b border-gray-100">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Your Blinks</h2>
          <p className="text-sm text-gray-500">Links currently accepting payments.</p>
        </div>

        <button 
          onClick={() => setShowCreateBlink(true)}
          className="px-4 py-2 bg-purple-600 text-white text-sm font-bold rounded-lg hover:bg-purple-700 transition-colors"
        >
          + Create New
        </button>
      </div>
      <div className="divide-y divide-gray-100">
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
    </div>
  );
}