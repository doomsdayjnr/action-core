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
        {blinks.map((blink) => (
          <div key={blink.id} className="p-6 flex items-center justify-between hover:bg-gray-50 transition-colors">
            <div className="flex gap-4 items-center">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600 font-bold">⚡</div>
              <div>
                <h3 className="font-semibold text-gray-900">{blink.title}</h3>
                <p className="text-sm text-gray-500">{blink.amount} {blink.currency} • {blink.clickCount} clicks</p>
              </div>
            </div>
            <button 
              onClick={() => copyBlinkUrl(blink.publicUrl)}
              className="px-4 py-2 text-sm font-medium text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
            >
              Copy Link
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}