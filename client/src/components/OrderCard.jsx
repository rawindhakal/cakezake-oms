import { useNavigate } from 'react-router-dom';
import StatusBadge from './StatusBadge';
import dayjs from 'dayjs';

export default function OrderCard({ order }) {
  const navigate = useNavigate();
  const itemSummary = order.items.map((i) => i.name).join(', ');

  return (
    <div
      onClick={() => navigate(`/orders/${order._id}`)}
      className="card hover:shadow-md cursor-pointer transition-shadow"
    >
      <div className="flex justify-between items-start mb-2">
        <div>
          <span className="font-bold text-brand-600">{order.orderNumber}</span>
          <span className="ml-2 text-sm text-gray-500">{order.sender.name}</span>
        </div>
        <StatusBadge status={order.status} />
      </div>
      <p className="text-sm text-gray-600 truncate mb-2">{itemSummary}</p>
      <div className="flex justify-between text-sm">
        <span className="text-gray-500">{order.receiver.city}</span>
        <span className="text-gray-500">{dayjs(order.delivery.date).format('DD MMM')}</span>
        <span className="font-semibold">NPR {order.payment.total?.toLocaleString('en-IN')}</span>
        {order.payment.due > 0 && (
          <span className="text-red-500">Due: {order.payment.due?.toLocaleString('en-IN')}</span>
        )}
      </div>
    </div>
  );
}
