export function StatCard({ title, value, subtext }: { title: string, value: string | number, subtext?: string }) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
      <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {subtext && <p className="text-xs text-green-600 mt-1">{subtext}</p>}
    </div>
  );
}