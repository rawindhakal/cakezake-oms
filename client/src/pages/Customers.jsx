import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Users, Search, ArrowLeft, Phone, Instagram, Facebook, MessageCircle,
  Globe, MapPin, ShoppingBag, Wallet, TrendingUp, AlertCircle,
  PlusCircle, Trash2, ChevronRight, ExternalLink, X, Check,
} from 'lucide-react';
import api from '../lib/api';
import dayjs from 'dayjs';
import StatusBadge from '../components/StatusBadge';
import toast from 'react-hot-toast';

// ─── helpers ──────────────────────────────────────────────────────────────────

function npr(n) {
  return 'NPR ' + (n || 0).toLocaleString('en-IN');
}

const CHANNEL_ICONS = {
  Instagram:  <Instagram  size={13} />,
  Facebook:   <Facebook   size={13} />,
  WhatsApp:   <MessageCircle size={13} />,
  Website:    <Globe      size={13} />,
  'Walk-in':  <MapPin     size={13} />,
  'Phone Call':<Phone     size={13} />,
};

function DueBadge({ amount }) {
  if (!amount || amount <= 0) return <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">Cleared</span>;
  return <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-semibold">{npr(amount)} due</span>;
}

// ─── Add Payment Modal ────────────────────────────────────────────────────────

function AddPaymentModal({ phone, orders, onClose, onAdded }) {
  const [amount, setAmount]   = useState('');
  const [method, setMethod]   = useState('Cash');
  const [note, setNote]       = useState('');
  const [orderId, setOrderId] = useState('');
  const [busy, setBusy]       = useState(false);

  useEffect(() => {
    if (orders.length === 0) return;
    const withDue = orders.find((o) => (o.payment?.due || 0) > 0);
    setOrderId(String((withDue || orders[0])._id));
  }, [orders]);

  async function submit(e) {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) { toast.error('Enter a valid amount'); return; }
    if (!orderId || orders.length === 0) { toast.error('Select an order'); return; }
    setBusy(true);
    try {
      const { data } = await api.post(`/customers/${phone}/payments`, {
        amount: Number(amount), method, note: note || undefined, orderId,
      });
      if (data.success) { toast.success('Payment recorded'); onAdded(data.payment); onClose(); }
    } catch { toast.error('Failed to record payment'); }
    finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-gray-800 text-lg">Record Payment</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Amount (NPR) *</label>
          <input
            type="number" min="1" value={amount} onChange={(e) => setAmount(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-lg font-bold focus:outline-none focus:ring-2 focus:ring-brand-300"
            placeholder="0"
            autoFocus
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Method</label>
            <select value={method} onChange={(e) => setMethod(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300">
              {['Cash', 'eSewa', 'Khalti', 'Bank Transfer', 'QR'].map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Order *</label>
            <select
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              disabled={orders.length === 0}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 disabled:opacity-50"
            >
              {orders.length === 0 ? (
                <option value="">No orders for this customer</option>
              ) : (
                orders.map((o) => (
                  <option key={o._id} value={o._id}>
                    {o.orderNumber}{(o.payment?.due || 0) > 0 ? ` · ${npr(o.payment.due)} due` : ''}
                  </option>
                ))
              )}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Note (optional)</label>
          <input type="text" value={note} onChange={(e) => setNote(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
            placeholder="e.g. Remaining balance for CZ-2025-0003" />
        </div>

        <button type="submit" disabled={busy}
          className="w-full bg-brand-500 hover:bg-brand-600 text-white font-semibold py-2.5 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
          <Check size={16} />
          {busy ? 'Saving…' : 'Record Payment'}
        </button>
      </form>
    </div>
  );
}

// ─── Customer List ────────────────────────────────────────────────────────────

function CustomerList() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch]       = useState('');
  const [loading, setLoading]     = useState(true);
  const [sortBy, setSortBy]       = useState('lastOrderDate'); // 'lastOrderDate' | 'totalDue' | 'orderCount'
  const navigate = useNavigate();

  const load = useCallback(async (q = '') => {
    setLoading(true);
    try {
      const { data } = await api.get('/customers', { params: q ? { search: q } : {} });
      setCustomers(data.customers || []);
    } catch { toast.error('Failed to load customers'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const t = setTimeout(() => load(search), 350);
    return () => clearTimeout(t);
  }, [search, load]);

  const sorted = [...customers].sort((a, b) => {
    if (sortBy === 'totalDue')     return b.totalDue   - a.totalDue;
    if (sortBy === 'orderCount')   return b.orderCount - a.orderCount;
    return new Date(b.lastOrderDate) - new Date(a.lastOrderDate);
  });

  const totalDueAll = customers.reduce((s, c) => s + c.totalDue, 0);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Users size={22} className="text-brand-500" /> Customers
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">{customers.length} customers · Total due: <span className="text-red-500 font-semibold">{npr(totalDueAll)}</span></p>
        </div>
      </div>

      {/* Search + Sort */}
      <div className="flex gap-3 mb-5">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or phone…"
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
          />
        </div>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none">
          <option value="lastOrderDate">Recent first</option>
          <option value="totalDue">Highest due</option>
          <option value="orderCount">Most orders</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-400">Loading customers…</div>
      ) : sorted.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <Users size={40} className="mx-auto mb-3 opacity-25" />
          <p>No customers found.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map((c) => (
            <button
              key={c.phone}
              onClick={() => navigate(`/customers/${encodeURIComponent(c.phone)}`)}
              className="w-full bg-white border border-gray-200 hover:border-brand-300 rounded-2xl px-5 py-4 text-left flex items-center gap-4 transition-all hover:shadow-sm group"
            >
              {/* Avatar */}
              <div className="w-10 h-10 rounded-full bg-brand-50 flex items-center justify-center text-brand-600 font-bold text-lg flex-shrink-0">
                {c.name?.[0]?.toUpperCase()}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-gray-800">{c.name}</span>
                  {c.channel && (
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      {CHANNEL_ICONS[c.channel]} {c.channel}
                    </span>
                  )}
                  {c.socialId && <span className="text-xs text-brand-400">{c.socialId}</span>}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-0.5">
                  <Phone size={11} /> {c.phone}
                  <span>·</span>
                  <span>Last order {dayjs(c.lastOrderDate).fromNow()}</span>
                </div>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-6 text-right flex-shrink-0">
                <div className="hidden sm:block">
                  <p className="text-xs text-gray-400">Orders</p>
                  <p className="font-bold text-gray-700">{c.orderCount}</p>
                </div>
                <div className="hidden sm:block">
                  <p className="text-xs text-gray-400">Total Spent</p>
                  <p className="font-bold text-gray-700">{npr(c.totalAmount)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Due</p>
                  <DueBadge amount={c.totalDue} />
                </div>
                <ChevronRight size={16} className="text-gray-300 group-hover:text-brand-400 transition-colors" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Customer Ledger (detail) ─────────────────────────────────────────────────

function CustomerLedger() {
  const { phone } = useParams();
  const navigate  = useNavigate();
  const decoded   = decodeURIComponent(phone);

  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [showModal, setModal]   = useState(false);
  const [activeTab, setTab]     = useState('ledger'); // 'ledger' | 'orders'

  async function load() {
    setLoading(true);
    try {
      const res = await api.get(`/customers/${encodeURIComponent(decoded)}`);
      setData(res.data);
    } catch { toast.error('Customer not found'); navigate('/customers'); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [decoded]);

  async function deletePayment(id) {
    if (!confirm('Delete this payment record?')) return;
    try {
      await api.delete(`/customers/${encodeURIComponent(decoded)}/payments/${id}`);
      toast.success('Payment deleted');
      load();
    } catch { toast.error('Failed to delete'); }
  }

  if (loading) return <div className="p-6 text-center text-gray-400 py-20">Loading…</div>;
  if (!data)   return null;

  const { profile, stats, orders, payments } = data;

  // Build unified ledger entries sorted by date desc
  const ledgerEntries = [
    ...orders.map((o) => ({
      type:    'order',
      date:    o.createdAt,
      id:      o._id,
      orderNumber: o.orderNumber,
      items:   o.items,
      total:   o.payment?.total,
      advance: o.payment?.advance,
      due:     o.payment?.due,
      method:  o.payment?.method,
      status:  o.status,
      receiver:o.receiver,
      delivery:o.delivery,
    })),
    ...payments.map((p) => ({
      type:        'payment',
      date:        p.createdAt,
      id:          p._id,
      amount:      p.amount,
      method:      p.method,
      note:        p.note,
      orderId:     p.orderId,
      orderNumber: p.orderNumber,
    })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Back */}
      <button onClick={() => navigate('/customers')}
        className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-600 mb-5">
        <ArrowLeft size={14} /> Back to Customers
      </button>

      {/* Profile card */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-5 flex items-start gap-4">
        <div className="w-14 h-14 rounded-2xl bg-brand-50 flex items-center justify-center text-brand-600 font-bold text-2xl flex-shrink-0">
          {profile.name?.[0]?.toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold text-gray-800">{profile.name}</h1>
            {profile.channel && (
              <span className="flex items-center gap-1.5 text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">
                {CHANNEL_ICONS[profile.channel]} {profile.channel}
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3 mt-1.5 text-sm text-gray-400">
            <span className="flex items-center gap-1.5"><Phone size={13} />{profile.phone}</span>
            {profile.socialId && <span className="text-brand-400">{profile.socialId}</span>}
          </div>
        </div>
        <button
          type="button"
          onClick={() => orders.length && setModal(true)}
          disabled={orders.length === 0}
          title={orders.length === 0 ? 'No orders to attach a payment to' : 'Record a payment against an order'}
          className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors flex-shrink-0 disabled:opacity-45 disabled:cursor-not-allowed disabled:hover:bg-brand-500">
          <PlusCircle size={15} /> Record Payment
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total Orders',  value: stats.orderCount,   icon: ShoppingBag,   color: 'blue'  },
          { label: 'Total Spent',   value: npr(stats.totalAmount), icon: TrendingUp, color: 'brand' },
          { label: 'Total Paid',    value: npr(stats.totalPaid),   icon: Wallet,     color: 'green' },
          { label: 'Outstanding Due', value: npr(stats.totalDue),  icon: AlertCircle, color: stats.totalDue > 0 ? 'red' : 'green' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className={`bg-white border rounded-2xl p-4 ${
            color === 'red' && stats.totalDue > 0 ? 'border-red-200' : 'border-gray-200'
          }`}>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${
              color === 'blue'  ? 'bg-blue-50 text-blue-500'    :
              color === 'green' ? 'bg-green-50 text-green-500'  :
              color === 'red'   ? 'bg-red-50 text-red-500'      :
              'bg-brand-50 text-brand-500'
            }`}>
              <Icon size={16} />
            </div>
            <p className="text-xs text-gray-400">{label}</p>
            <p className={`font-bold text-base mt-0.5 ${color === 'red' && stats.totalDue > 0 ? 'text-red-600' : 'text-gray-800'}`}>
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        {[['ledger', 'Ledger'], ['orders', `Orders (${orders.length})`]].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
              activeTab === key ? 'bg-brand-100 text-brand-700' : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-50'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* ─── Ledger tab ─── */}
      {activeTab === 'ledger' && (
        <div className="space-y-2">
          {ledgerEntries.length === 0 && (
            <p className="text-center py-12 text-gray-400">No transactions yet.</p>
          )}
          {ledgerEntries.map((entry) => (
            entry.type === 'order' ? (
              <div key={entry.id}
                className="bg-white border border-gray-200 rounded-2xl px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-bold text-brand-600">{entry.orderNumber}</span>
                      <StatusBadge status={entry.status} />
                      <span className="text-xs text-gray-400">{dayjs(entry.date).format('DD MMM YYYY, h:mm A')}</span>
                    </div>
                    <p className="text-xs text-gray-500 mb-2">
                      → {entry.receiver?.name}, {entry.receiver?.city} · {dayjs(entry.delivery?.date).format('DD MMM YYYY')} {entry.delivery?.slot && `· ${entry.delivery.slot}`}
                    </p>
                    <div className="text-xs text-gray-600 space-y-0.5 mb-2">
                      {entry.items?.map((item, i) => (
                        <span key={i} className="inline-flex items-center gap-1 bg-gray-50 border border-gray-100 rounded-lg px-2 py-0.5 mr-1">
                          {item.category} · {item.name} — {npr(item.price)}
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-4 text-xs">
                      <span className="text-gray-500">Total: <strong className="text-gray-800">{npr(entry.total)}</strong></span>
                      <span className="text-gray-500">Advance: <strong className="text-green-600">{npr(entry.advance)}</strong></span>
                      <span className="text-gray-500">Due: <strong className={entry.due > 0 ? 'text-red-600' : 'text-green-600'}>{npr(entry.due)}</strong></span>
                      {entry.method && <span className="text-gray-400">{entry.method}</span>}
                    </div>
                  </div>
                  <Link to={`/orders/${entry.id}`}
                    className="flex-shrink-0 text-gray-300 hover:text-brand-500 transition-colors mt-1">
                    <ExternalLink size={15} />
                  </Link>
                </div>
              </div>
            ) : (
              <div key={entry.id}
                className="bg-green-50 border border-green-200 rounded-2xl px-5 py-4 flex items-center gap-4">
                <div className="w-9 h-9 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
                  <Wallet size={16} className="text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-green-700">Payment Received</span>
                    <span className="text-sm font-bold text-green-800">{npr(entry.amount)}</span>
                    {entry.method && <span className="text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded-full">{entry.method}</span>}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5 flex-wrap">
                    {entry.orderNumber && entry.orderId && (
                      <Link to={`/orders/${entry.orderId}`} onClick={(e) => e.stopPropagation()}
                        className="font-semibold text-brand-600 hover:underline">
                        {entry.orderNumber}
                      </Link>
                    )}
                    <span>{dayjs(entry.date).format('DD MMM YYYY, h:mm A')}</span>
                    {entry.note && <span className="text-gray-600 italic">"{entry.note}"</span>}
                  </div>
                </div>
                <button onClick={() => deletePayment(entry.id)}
                  className="text-gray-300 hover:text-red-500 transition-colors flex-shrink-0">
                  <Trash2 size={15} />
                </button>
              </div>
            )
          ))}
        </div>
      )}

      {/* ─── Orders tab ─── */}
      {activeTab === 'orders' && (
        <div className="space-y-2">
          {orders.map((o) => (
            <Link to={`/orders/${o._id}`} key={o._id}
              className="block bg-white border border-gray-200 hover:border-brand-300 rounded-2xl px-5 py-4 transition-all hover:shadow-sm group">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-brand-600">{o.orderNumber}</span>
                  <StatusBadge status={o.status} />
                </div>
                <div className="flex items-center gap-3 text-right">
                  <span className="text-sm font-semibold text-gray-700">{npr(o.payment?.total)}</span>
                  {o.payment?.due > 0
                    ? <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-semibold">{npr(o.payment.due)} due</span>
                    : <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">Cleared</span>
                  }
                  <ChevronRight size={15} className="text-gray-300 group-hover:text-brand-400 transition-colors" />
                </div>
              </div>
              <p className="text-xs text-gray-500">
                {dayjs(o.createdAt).format('DD MMM YYYY')} · to {o.receiver?.name}, {o.receiver?.city} · {dayjs(o.delivery?.date).format('DD MMM')} {o.delivery?.slot && `· ${o.delivery.slot}`}
              </p>
              <div className="flex flex-wrap gap-1 mt-2">
                {o.items?.map((item, i) => (
                  <span key={i} className="text-xs bg-gray-100 text-gray-600 rounded-lg px-2 py-0.5">
                    {item.name}
                  </span>
                ))}
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Add Payment Modal */}
      {showModal && (
        <AddPaymentModal
          phone={decoded}
          orders={orders}
          onClose={() => setModal(false)}
          onAdded={() => load()}
        />
      )}
    </div>
  );
}

// ─── Root export ──────────────────────────────────────────────────────────────

export default function Customers() {
  const { phone } = useParams();
  return phone ? <CustomerLedger /> : <CustomerList />;
}
