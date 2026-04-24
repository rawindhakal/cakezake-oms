import { useState, useRef } from 'react';
import { Search, Package, CheckCircle, ChefHat, Truck, Clock, XCircle, MapPin, CalendarDays, CreditCard, ChevronDown, ChevronUp } from 'lucide-react';
import dayjs from 'dayjs';
import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

// ─── Status config ────────────────────────────────────────────────────────────

const PIPELINE = ['New', 'Confirmed', 'In Production', 'Out for Delivery', 'Delivered'];

const STATUS_META = {
  'New':              { color: 'text-blue-600',   bg: 'bg-blue-50',   border: 'border-blue-200',  icon: Package,      label: 'Order Received' },
  'Confirmed':        { color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200',icon: CheckCircle,  label: 'Confirmed' },
  'In Production':    { color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200',icon: ChefHat,      label: 'Being Made' },
  'Out for Delivery': { color: 'text-orange-500', bg: 'bg-orange-50', border: 'border-orange-200',icon: Truck,        label: 'On the Way' },
  'Delivered':        { color: 'text-green-600',  bg: 'bg-green-50',  border: 'border-green-200', icon: CheckCircle,  label: 'Delivered' },
  'Cancelled':        { color: 'text-gray-400',   bg: 'bg-gray-50',   border: 'border-gray-200',  icon: XCircle,      label: 'Cancelled' },
};

const STEP_COLORS = {
  done:   'bg-brand-500 border-brand-500 text-white',
  active: 'bg-white border-brand-500 text-brand-600 ring-4 ring-brand-100',
  future: 'bg-white border-gray-200 text-gray-300',
};

// ─── Status Timeline ──────────────────────────────────────────────────────────

function StatusTimeline({ status }) {
  if (status === 'Cancelled') {
    return (
      <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 rounded-xl border border-gray-200">
        <XCircle size={18} className="text-gray-400" />
        <span className="text-sm font-medium text-gray-500">This order has been cancelled.</span>
      </div>
    );
  }

  const stepIdx = PIPELINE.indexOf(status);

  return (
    <div className="px-2 py-4">
      <div className="flex items-center">
        {PIPELINE.map((step, i) => {
          const stateClass = i < stepIdx ? STEP_COLORS.done : i === stepIdx ? STEP_COLORS.active : STEP_COLORS.future;
          const meta = STATUS_META[step];
          const Icon = meta.icon;
          return (
            <div key={step} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1 gap-1.5">
                <div className={`w-9 h-9 rounded-full border-2 flex items-center justify-center transition-all ${stateClass}`}>
                  <Icon size={15} />
                </div>
                <span className={`text-center leading-tight text-xs font-medium max-w-[60px] ${i <= stepIdx ? 'text-gray-700' : 'text-gray-300'}`}>
                  {step === 'In Production' ? 'Being Made' : step === 'Out for Delivery' ? 'On the Way' : step}
                </span>
              </div>
              {i < PIPELINE.length - 1 && (
                <div className={`h-0.5 flex-shrink flex-grow mb-6 transition-colors ${i < stepIdx ? 'bg-brand-400' : 'bg-gray-200'}`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Order Card ───────────────────────────────────────────────────────────────

function OrderCard({ order }) {
  const [expanded, setExpanded] = useState(true);
  const meta    = STATUS_META[order.status] || STATUS_META['New'];
  const Icon    = meta.icon;
  const delDate = dayjs(order.delivery?.date);
  const isToday = delDate.isSame(dayjs(), 'day');
  const isPast  = delDate.isBefore(dayjs(), 'day');

  const preparedItems  = order.items.filter((i) => i.itemStatus === 'Prepared');
  const preparingItems = order.items.filter((i) => i.itemStatus === 'Preparing');

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

      {/* Card header */}
      <div className={`px-5 py-4 ${meta.bg} border-b ${meta.border}`}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono font-bold text-gray-500 tracking-wide">{order.orderNumber}</span>
              {isToday && order.status !== 'Delivered' && (
                <span className="text-xs bg-yellow-100 text-yellow-700 font-semibold px-2 py-0.5 rounded-full">Delivery Today</span>
              )}
            </div>
            <div className={`flex items-center gap-1.5 ${meta.color}`}>
              <Icon size={17} />
              <span className="font-bold text-base">{meta.label}</span>
            </div>
          </div>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="text-gray-400 hover:text-gray-600 mt-1 flex-shrink-0"
          >
            {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
        </div>

        {/* Quick summary row */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2.5 text-sm text-gray-600">
          <span className="flex items-center gap-1">
            <CalendarDays size={13} className="opacity-60" />
            {delDate.format('ddd, DD MMM YYYY')}
            {order.delivery?.slot && <span className="text-gray-400">· {order.delivery.slot}</span>}
          </span>
          <span className="flex items-center gap-1">
            <MapPin size={13} className="opacity-60" />
            {order.receiver?.city}
          </span>
        </div>
      </div>

      {expanded && (
        <div className="px-5 py-4 space-y-5">

          {/* Status timeline */}
          <StatusTimeline status={order.status} />

          {/* Preparation progress (In Production only) */}
          {order.status === 'In Production' && order.items.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-100 rounded-xl px-4 py-3">
              <p className="text-xs font-bold text-yellow-700 uppercase tracking-wide mb-2">Preparation Progress</p>
              <div className="space-y-2">
                {order.items.map((item, i) => (
                  <div key={i} className="flex items-center gap-2.5">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      item.itemStatus === 'Prepared'  ? 'bg-green-500' :
                      item.itemStatus === 'Preparing' ? 'bg-yellow-500 animate-pulse' :
                      'bg-gray-300'
                    }`} />
                    <span className="text-sm text-gray-700 flex-1 truncate">{item.name}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      item.itemStatus === 'Prepared'  ? 'bg-green-100 text-green-700' :
                      item.itemStatus === 'Preparing' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-400'
                    }`}>
                      {item.itemStatus || 'Pending'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Completed product photos (if any items are Prepared) */}
          {preparedItems.some((i) => i.completedImages?.length > 0) && (
            <div>
              <p className="text-xs font-semibold text-green-700 mb-2 flex items-center gap-1.5">
                <CheckCircle size={13} /> Ready items
              </p>
              <div className="flex gap-2 flex-wrap">
                {preparedItems.flatMap((item) =>
                  (item.completedImages || []).map((url, j) => (
                    <a key={`${item.name}-${j}`} href={url} target="_blank" rel="noreferrer">
                      <img
                        src={url.includes('cloudinary.com') ? url.replace('/upload/', '/upload/w_160,h_160,c_fill/') : url}
                        alt={item.name}
                        className="w-20 h-20 object-cover rounded-xl border-2 border-green-200 hover:opacity-90 transition-opacity"
                      />
                    </a>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Items list */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Your Order</p>
            <div className="space-y-2">
              {order.items.map((item, i) => {
                const details = [item.flavor, item.size, item.shape, item.arrangement, item.flowerType, item.giftType].filter(Boolean);
                return (
                  <div key={i} className="flex justify-between items-start gap-3 py-2 border-b border-gray-50 last:border-0">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {item.category && (
                          <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-medium">{item.category}</span>
                        )}
                        <span className="font-medium text-gray-800 text-sm">{item.name}</span>
                      </div>
                      {details.length > 0 && (
                        <p className="text-xs text-gray-400 mt-0.5">{details.join(' · ')}</p>
                      )}
                      {item.cakeMessage && (
                        <p className="text-xs text-pink-500 mt-0.5 italic">"{item.cakeMessage}"</p>
                      )}
                      {item.specialNote && (
                        <p className="text-xs text-orange-500 mt-0.5">Note: {item.specialNote}</p>
                      )}
                    </div>
                    <span className="text-sm font-semibold text-gray-700 flex-shrink-0">
                      NPR {(item.price || 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Payment summary */}
          <div className="bg-gray-50 rounded-xl px-4 py-3 space-y-1.5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <CreditCard size={12} /> Payment
              {order.payment?.method && <span className="normal-case font-normal text-gray-400">· {order.payment.method}</span>}
            </p>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Order Total</span>
              <span className="font-semibold">NPR {(order.payment?.total || 0).toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Advance Paid</span>
              <span className="text-green-600 font-medium">NPR {(order.payment?.advance || 0).toLocaleString('en-IN')}</span>
            </div>
            {(order.payment?.due || 0) > 0 && (
              <div className="flex justify-between text-sm border-t border-gray-200 pt-1.5 mt-1">
                <span className="font-semibold text-red-500">Due on Delivery</span>
                <span className="font-bold text-red-500">NPR {(order.payment.due).toLocaleString('en-IN')}</span>
              </div>
            )}
            {(order.payment?.due || 0) === 0 && (
              <div className="flex items-center gap-1 text-green-600 text-sm pt-1 border-t border-gray-100">
                <CheckCircle size={13} /> Fully paid
              </div>
            )}
          </div>

          {/* Delivery info */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Delivering to</p>
              <p className="font-medium text-gray-800">{order.receiver?.name}</p>
              <p className="text-gray-500">{order.receiver?.city}{order.receiver?.landmark ? `, ${order.receiver.landmark}` : ''}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Delivery Date</p>
              <p className="font-medium text-gray-800">{delDate.format('DD MMM YYYY')}</p>
              {order.delivery?.slot && <p className="text-gray-500">{order.delivery.slot}</p>}
            </div>
          </div>

          {/* Signature / delivered proof */}
          {order.delivery?.signature && (
            <div className="border border-green-200 bg-green-50 rounded-xl px-4 py-3">
              <p className="text-xs font-bold text-green-700 mb-2 flex items-center gap-1.5">
                <CheckCircle size={13} /> Delivery Confirmed
              </p>
              <p className="text-sm text-green-800">
                Received by <strong>{order.delivery.receiverConfirmName || order.receiver?.name}</strong>
              </p>
              {order.delivery.signedAt && (
                <p className="text-xs text-green-600 mt-0.5">{dayjs(order.delivery.signedAt).format('DD MMM YYYY, hh:mm A')}</p>
              )}
              <img
                src={order.delivery.signature}
                alt="Delivery signature"
                className="mt-2 h-16 rounded-lg border border-green-200 bg-white object-contain"
              />
            </div>
          )}

          <p className="text-xs text-gray-300 text-center pt-1">
            Order placed {dayjs(order.createdAt).format('DD MMM YYYY')}
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TrackOrder() {
  const [query, setQuery]     = useState('');
  const [orders, setOrders]   = useState([]);
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const inputRef = useRef(null);

  async function handleSearch(e) {
    e.preventDefault();
    const q = query.trim();
    if (!q) { inputRef.current?.focus(); return; }

    setLoading(true);
    setError('');
    setOrders([]);
    setSearched(false);

    try {
      const { data } = await api.get('/track', { params: { q } });
      setOrders(data.orders);
      setSearched(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
      setSearched(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-brand-50">

      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-2.5">
          <span className="text-2xl">🎂</span>
          <div>
            <div className="font-bold text-brand-600 leading-tight">CakeZake</div>
            <div className="text-xs text-gray-400">Order Tracking</div>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-8 space-y-6">

        {/* Hero */}
        <div className="text-center pb-2">
          <div className="text-4xl mb-3">📦</div>
          <h1 className="text-2xl font-bold text-gray-800">Track Your Order</h1>
          <p className="text-sm text-gray-500 mt-1">Enter your order number or the phone number you used to place the order.</p>
        </div>

        {/* Search form */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="CZ-2025-0001 or 98XXXXXXXX"
              className="w-full pl-9 pr-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-400 bg-white shadow-sm"
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-3 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-sm font-semibold shadow-sm transition-colors disabled:opacity-60 flex-shrink-0"
          >
            {loading ? (
              <span className="flex items-center gap-1.5">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Searching
              </span>
            ) : 'Track'}
          </button>
        </form>

        {/* Hint chips */}
        {!searched && (
          <div className="flex gap-2 flex-wrap justify-center -mt-2">
            {['Order Number', 'Sender Phone', 'Receiver Phone'].map((h) => (
              <span key={h} className="text-xs bg-white border border-gray-200 text-gray-400 px-3 py-1.5 rounded-full shadow-sm">{h}</span>
            ))}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <XCircle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Results */}
        {orders.length > 0 && (
          <div className="space-y-4">
            {orders.length > 1 && (
              <p className="text-sm text-gray-500 text-center">{orders.length} orders found for this number</p>
            )}
            {orders.map((order) => (
              <OrderCard key={order._id} order={order} />
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="text-center pt-4 pb-8 space-y-1">
          <p className="text-xs text-gray-300">CakeZake · Birtamode-5, Jhapa, Nepal</p>
          <p className="text-xs text-gray-300">Questions? Contact us on WhatsApp or Instagram.</p>
        </div>
      </main>
    </div>
  );
}
