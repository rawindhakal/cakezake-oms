const colors = {
  'New':              'bg-blue-100 text-blue-700',
  'Confirmed':        'bg-purple-100 text-purple-700',
  'In Production':    'bg-yellow-100 text-yellow-700',
  'Out for Delivery': 'bg-orange-100 text-orange-700',
  'Delivered':        'bg-green-100 text-green-700',
  'Cancelled':        'bg-gray-100 text-gray-500',
};

export default function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${colors[status] || 'bg-gray-100 text-gray-700'}`}>
      {status}
    </span>
  );
}
