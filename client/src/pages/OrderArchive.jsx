import { useEffect, useState } from 'react';
import { Archive, RotateCcw, Search, Trash2 } from 'lucide-react';
import api from '../lib/api';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';
import StatusBadge from '../components/StatusBadge';

export default function OrderArchive() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get('/orders', { params: { archived: 'true', limit: 200 } });
      setOrders(data.orders || []);
    } catch { toast.error('Failed to load archive'); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function restore(id) {
    try {
      await api.patch(`/orders/${id}/restore`);
      toast.success('Order restored');
      setOrders((prev) => prev.filter((o) => o._id !== id));
    } catch { toast.error('Failed to restore'); }
  }

  const filtered = orders.filter((o) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      o.orderNumber?.toLowerCase().includes(q) ||
      o.sender?.name?.toLowerCase().includes(q) ||
      o.sender?.phone?.includes(q)
    );
  });

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Archive size={22} className="text-gray-500" />
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Deleted Orders</h1>
          <p className="text-sm text-gray-400">All deleted orders are kept here and can be restored.</p>
        </div>
      </div>

      <div className="relative mb-5">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by order#, name, phone…"
          className="input pl-9 w-full sm:w-80"
        />
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-400">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <Archive size={40} className="mx-auto mb-3 opacity-25" />
          <p>{search ? 'No matching orders.' : 'No deleted orders.'}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((o) => (
            <div key={o._id}
              className="bg-white border border-gray-200 rounded-2xl px-4 sm:px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-bold text-brand-600">{o.orderNumber}</span>
                  <StatusBadge status={o.status} />
                  <span className="text-xs text-red-400">
                    Deleted {dayjs(o.deletedAt).format('DD MMM YYYY')}
                  </span>
                </div>
                <p className="text-sm text-gray-700">{o.sender?.name} <span className="text-gray-400">({o.sender?.phone})</span></p>
                <p className="text-xs text-gray-400 mt-0.5">
                  → {o.receiver?.name}, {o.receiver?.city} · Delivery {dayjs(o.delivery?.date).format('DD MMM YYYY')}
                </p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {o.items?.map((item, i) => (
                    <span key={i} className="text-xs bg-gray-100 text-gray-600 rounded-lg px-2 py-0.5">
                      {item.name} — NPR {item.price?.toLocaleString('en-IN')}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="text-right mr-2">
                  <p className="text-xs text-gray-400">Total</p>
                  <p className="font-bold text-gray-800">NPR {o.payment?.total?.toLocaleString('en-IN')}</p>
                </div>
                <button
                  onClick={() => restore(o._id)}
                  className="flex items-center gap-1.5 text-sm font-semibold text-green-600 hover:text-green-700 bg-green-50 hover:bg-green-100 px-3 py-2 rounded-xl transition-colors"
                >
                  <RotateCcw size={14} /> Restore
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
