import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Phone, Package, LogOut, RotateCcw, CheckCircle, PenLine, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import api from '../lib/api';
import useAuthStore from '../store/authStore';
import StatusBadge from '../components/StatusBadge';

// ─── Signature Pad ────────────────────────────────────────────────────────────

function SignaturePad({ itemName, onConfirm, onCancel, submitting }) {
  const canvasRef = useRef(null);
  const drawing   = useRef(false);
  const lastPos   = useRef(null);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [receiverName, setReceiverName] = useState('');

  function getPos(e) {
    const canvas = canvasRef.current;
    const rect   = canvas.getBoundingClientRect();
    const src    = e.touches ? e.touches[0] : e;
    return {
      x: (src.clientX - rect.left) * (canvas.width  / rect.width),
      y: (src.clientY - rect.top)  * (canvas.height / rect.height),
    };
  }

  function onStart(e) {
    e.preventDefault();
    drawing.current  = true;
    lastPos.current  = getPos(e);
    setHasDrawn(true);
  }

  function onMove(e) {
    e.preventDefault();
    if (!drawing.current) return;
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext('2d');
    const pos    = getPos(e);
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth   = 2.5;
    ctx.lineCap     = 'round';
    ctx.lineJoin    = 'round';
    ctx.stroke();
    lastPos.current = pos;
  }

  function onEnd(e) { e.preventDefault(); drawing.current = false; }

  function clear() {
    const canvas = canvasRef.current;
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  }

  function submit() {
    if (!hasDrawn) { toast.error('Please collect signature first'); return; }
    onConfirm(canvasRef.current.toDataURL('image/png'), receiverName);
  }

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-white">
        <div>
          <h2 className="font-bold text-gray-800 text-lg">Customer Signature</h2>
          <p className="text-xs text-gray-400 mt-0.5">Ask receiver to sign to confirm delivery</p>
        </div>
        <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 p-1"><X size={22} /></button>
      </div>

      <div className="flex-1 overflow-auto p-5 space-y-5">
        {/* Receiver name confirmation */}
        <div>
          <label className="label">Receiver Name (confirm)</label>
          <input
            className="input"
            placeholder="Enter receiver's full name"
            value={receiverName}
            onChange={(e) => setReceiverName(e.target.value)}
          />
        </div>

        {/* Signature canvas */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="label mb-0">Signature</label>
            <button onClick={clear} className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition-colors">
              <Trash2 size={12} /> Clear
            </button>
          </div>
          <div className="border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 overflow-hidden">
            <canvas
              ref={canvasRef}
              width={700}
              height={260}
              className="w-full touch-none cursor-crosshair"
              style={{ height: '220px' }}
              onMouseDown={onStart}
              onMouseMove={onMove}
              onMouseUp={onEnd}
              onMouseLeave={onEnd}
              onTouchStart={onStart}
              onTouchMove={onMove}
              onTouchEnd={onEnd}
            />
          </div>
          {!hasDrawn && (
            <p className="text-xs text-gray-400 text-center mt-2 flex items-center justify-center gap-1">
              <PenLine size={12} /> Sign in the box above
            </p>
          )}
        </div>
      </div>

      {/* Footer actions */}
      <div className="p-5 border-t border-gray-100 flex gap-3">
        <button onClick={onCancel} className="btn-secondary flex-1">Cancel</button>
        <button
          onClick={submit}
          disabled={!hasDrawn || submitting}
          className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-40"
        >
          {submitting ? 'Saving…' : <><CheckCircle size={16} /> Confirm Delivery</>}
        </button>
      </div>
    </div>
  );
}

// ─── Order Detail View ────────────────────────────────────────────────────────

function DeliveryOrderDetail({ order: initialOrder, onBack, onDelivered }) {
  const [order, setOrder]         = useState(initialOrder);
  const [showSig, setShowSig]     = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function markOutForDelivery() {
    try {
      await api.patch(`/orders/${order._id}/status`, { status: 'Out for Delivery' });
      setOrder((o) => ({ ...o, status: 'Out for Delivery' }));
      toast.success('Marked Out for Delivery');
    } catch { toast.error('Failed'); }
  }

  async function handleSignature(signature, receiverConfirmName) {
    setSubmitting(true);
    try {
      const { data } = await api.post(`/orders/${order._id}/sign-delivery`, { signature, receiverConfirmName });
      if (data.success) {
        toast.success('Delivery confirmed! ✓');
        onDelivered(order._id);
      }
    } catch { toast.error('Failed to confirm delivery'); }
    finally { setSubmitting(false); }
  }

  const isDelivered = order.status === 'Delivered';

  return (
    <>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        {/* Top bar */}
        <div className="bg-white border-b border-gray-100 px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
          <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600">
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-brand-600">{order.orderNumber}</p>
            <p className="text-xs text-gray-400">{dayjs(order.delivery?.date).format('ddd, DD MMM YYYY')} · {order.delivery?.slot}</p>
          </div>
          <StatusBadge status={order.status} />
        </div>

        <div className="flex-1 p-4 space-y-4 max-w-lg mx-auto w-full">

          {/* Receiver */}
          <div className="card">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Deliver To</h3>
            <p className="font-bold text-gray-800 text-lg">{order.receiver?.name}</p>
            <a href={`tel:${order.receiver?.phone}`} className="flex items-center gap-1.5 text-brand-600 font-medium mt-1">
              <Phone size={14} /> {order.receiver?.phone}
            </a>
            <p className="flex items-center gap-1.5 text-gray-600 text-sm mt-1">
              <MapPin size={13} className="text-gray-400" />
              {[order.receiver?.landmark, order.receiver?.city].filter(Boolean).join(', ')}
            </p>
          </div>

          {/* Payment due */}
          {(order.payment?.due || 0) > 0 && (
            <div className="bg-red-50 border-2 border-red-200 rounded-2xl px-5 py-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-red-400 font-semibold uppercase tracking-wide">Collect on Delivery</p>
                <p className="text-2xl font-bold text-red-600 mt-0.5">NPR {order.payment.due.toLocaleString('en-IN')}</p>
              </div>
              <span className="text-3xl">💵</span>
            </div>
          )}
          {(order.payment?.due || 0) === 0 && (
            <div className="bg-green-50 border border-green-200 rounded-2xl px-5 py-3 flex items-center gap-3">
              <CheckCircle size={18} className="text-green-500" />
              <p className="text-sm font-semibold text-green-700">Fully paid — no collection needed</p>
            </div>
          )}

          {/* Items */}
          <div className="card">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Items</h3>
            <div className="space-y-2">
              {order.items.map((item, i) => (
                <div key={i} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${item.itemStatus === 'Prepared' ? 'bg-green-400' : 'bg-gray-300'}`} />
                    <span className="text-sm text-gray-700 truncate">{item.name}</span>
                    <span className="text-xs text-gray-400 flex-shrink-0">{item.category}</span>
                  </div>
                  <span className="text-sm font-medium text-gray-600 flex-shrink-0">NPR {item.price?.toLocaleString('en-IN')}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between text-sm font-bold">
              <span className="text-gray-600">Total</span>
              <span>NPR {order.payment?.total?.toLocaleString('en-IN')}</span>
            </div>
          </div>

          {/* Delivery notes */}
          {order.delivery?.notes && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex gap-2">
              <span>📋</span>
              <p className="text-sm text-amber-800">{order.delivery.notes}</p>
            </div>
          )}

          {/* Already delivered — show signature */}
          {isDelivered && order.delivery?.signature && (
            <div className="card border-green-200">
              <p className="text-xs font-bold text-green-600 uppercase tracking-wide mb-2">✓ Delivered — Signature on file</p>
              {order.delivery.receiverConfirmName && (
                <p className="text-sm text-gray-600 mb-2">Signed by: <strong>{order.delivery.receiverConfirmName}</strong></p>
              )}
              <img src={order.delivery.signature} alt="signature" className="border border-gray-200 rounded-lg max-w-xs bg-gray-50" />
              <p className="text-xs text-gray-400 mt-2">{dayjs(order.delivery.signedAt).format('DD MMM YYYY, h:mm A')}</p>
            </div>
          )}
        </div>

        {/* Bottom action */}
        {!isDelivered && (
          <div className="p-4 bg-white border-t border-gray-100 space-y-2 max-w-lg mx-auto w-full">
            {!['Out for Delivery','Delivered'].includes(order.status) && (
              <button onClick={markOutForDelivery} className="btn-secondary w-full">
                Mark Out for Delivery
              </button>
            )}
            <button
              onClick={() => setShowSig(true)}
              className="btn-primary w-full flex items-center justify-center gap-2 py-3 text-base"
            >
              <PenLine size={18} /> Collect Signature & Confirm Delivery
            </button>
          </div>
        )}
      </div>

      {showSig && (
        <SignaturePad
          onConfirm={handleSignature}
          onCancel={() => setShowSig(false)}
          submitting={submitting}
        />
      )}
    </>
  );
}

// ─── Delivery Panel Root ──────────────────────────────────────────────────────

export default function DeliveryPanel() {
  const { user, logout } = useAuthStore();
  const navigate          = useNavigate();
  const [orders, setOrders]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState(null);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/orders', {
        params: { assignedRider: user.id, limit: 100 },
      });
      setOrders(data.orders);
    } catch { toast.error('Failed to load orders'); }
    finally { setLoading(false); }
  }, [user.id]);

  useEffect(() => { load(); }, [load]);

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  function handleDelivered(orderId) {
    setOrders((prev) => prev.map((o) => o._id === orderId ? { ...o, status: 'Delivered' } : o));
    setSelected(null);
  }

  if (selected) {
    return (
      <DeliveryOrderDetail
        order={selected}
        onBack={() => setSelected(null)}
        onDelivered={handleDelivered}
      />
    );
  }

  const pending   = orders.filter((o) => !['Delivered','Cancelled'].includes(o.status));
  const delivered = orders.filter((o) => o.status === 'Delivered');

  const today    = pending.filter((o) => dayjs(o.delivery?.date).isSame(dayjs(), 'day'));
  const upcoming = pending.filter((o) => dayjs(o.delivery?.date).isAfter(dayjs(), 'day'));
  const overdue  = pending.filter((o) => dayjs(o.delivery?.date).isBefore(dayjs(), 'day'));

  function OrderRow({ o }) {
    const isToday  = dayjs(o.delivery?.date).isSame(dayjs(), 'day');
    const isPast   = dayjs(o.delivery?.date).isBefore(dayjs(), 'day');
    return (
      <div
        onClick={() => setSelected(o)}
        className={`bg-white rounded-2xl border-2 p-4 cursor-pointer active:scale-[0.98] transition-transform shadow-sm ${
          isPast ? 'border-red-200' : isToday ? 'border-yellow-300' : 'border-gray-100'
        }`}
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <div>
            <span className="font-bold text-brand-600">{o.orderNumber}</span>
            {isPast && <span className="ml-2 text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-semibold">OVERDUE</span>}
          </div>
          <StatusBadge status={o.status} />
        </div>
        <p className="font-semibold text-gray-800">{o.receiver?.name}</p>
        <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
          <MapPin size={11} /> {[o.receiver?.landmark, o.receiver?.city].filter(Boolean).join(', ')}
        </p>
        <div className="flex items-center justify-between mt-2">
          <p className="text-xs text-gray-400">{o.items?.map((i) => i.name).join(', ')}</p>
          {(o.payment?.due || 0) > 0 && (
            <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
              COD NPR {o.payment.due.toLocaleString('en-IN')}
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between sticky top-0 z-10">
        <div>
          <h1 className="font-bold text-gray-800">My Deliveries</h1>
          <p className="text-xs text-gray-400">Hi, {user?.name}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
            <RotateCcw size={16} />
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
          >
            <LogOut size={15} /> Logout
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center text-gray-400">Loading…</div>
      ) : pending.length === 0 && delivered.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8 text-center">
          <Package size={48} className="mb-4 opacity-30" />
          <p className="font-medium">No deliveries assigned yet</p>
          <p className="text-sm mt-1">Check back later or contact your manager</p>
        </div>
      ) : (
        <div className="flex-1 overflow-auto p-4 space-y-5 max-w-lg mx-auto w-full">

          {overdue.length > 0 && (
            <section>
              <h2 className="text-xs font-bold text-red-500 uppercase tracking-wide mb-2">⚠ Overdue ({overdue.length})</h2>
              <div className="space-y-3">{overdue.map((o) => <OrderRow key={o._id} o={o} />)}</div>
            </section>
          )}

          {today.length > 0 && (
            <section>
              <h2 className="text-xs font-bold text-yellow-600 uppercase tracking-wide mb-2">Today ({today.length})</h2>
              <div className="space-y-3">{today.map((o) => <OrderRow key={o._id} o={o} />)}</div>
            </section>
          )}

          {upcoming.length > 0 && (
            <section>
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Upcoming ({upcoming.length})</h2>
              <div className="space-y-3">{upcoming.map((o) => <OrderRow key={o._id} o={o} />)}</div>
            </section>
          )}

          {delivered.length > 0 && (
            <section>
              <h2 className="text-xs font-bold text-green-600 uppercase tracking-wide mb-2">Delivered Today ({delivered.length})</h2>
              <div className="space-y-3">{delivered.map((o) => <OrderRow key={o._id} o={o} />)}</div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
