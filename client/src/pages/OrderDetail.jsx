import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit2, Trash2, Check, Store, ChefHat, Package, Printer, FileText, Tag, Truck, User, MessageCircle, Send } from 'lucide-react';
import { printBill, printShippingLabel, printKitchenSheet } from '../lib/print';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import useOrderStore from '../store/orderStore';
import useOutletStore from '../store/outletStore';
import StatusBadge from '../components/StatusBadge';
import api from '../lib/api';

const STATUSES = ['New', 'Confirmed', 'In Production', 'Out for Delivery', 'Delivered', 'Cancelled'];

const BASE_URL = import.meta.env.VITE_CLIENT_URL || window.location.origin;

function buildWhatsAppUrl(order) {
  if (!order) return '#';
  const { sender, receiver, payment, delivery, orderNumber, items } = order;
  const trackLink = `${BASE_URL}/track?order=${orderNumber}`;
  const itemsList = (items || []).map((i) => `  - ${i.name}: NPR ${Number(i.price).toLocaleString('en-IN')}`).join('\n');
  const deliveryLine = order.fulfillmentType === 'pickup'
    ? `Pickup: ${dayjs(delivery?.date).format('DD MMM YYYY')}, ${delivery?.slot || ''}`
    : `Delivery: ${dayjs(delivery?.date).format('DD MMM YYYY')}, ${delivery?.slot || ''} → ${receiver?.name}, ${receiver?.city || ''}`;

  const msg = [
    `Hello ${sender?.name}! 🎂 Your CakeZake order is confirmed.`,
    ``,
    `Order: *${orderNumber}*`,
    `Items:\n${itemsList}`,
    `Total: NPR ${Number(payment?.total).toLocaleString('en-IN')}`,
    `Advance: NPR ${Number(payment?.advance).toLocaleString('en-IN')}`,
    `Due: NPR ${Number(payment?.due).toLocaleString('en-IN')}`,
    ``,
    deliveryLine,
    ``,
    `Track your order: ${trackLink}`,
    ``,
    `Thank you for choosing CakeZake! 🧁`,
  ].join('\n');

  const phone = String(sender?.phone || '').replace(/^\+?977/, '').replace(/\D/g, '');
  return `https://wa.me/977${phone}?text=${encodeURIComponent(msg)}`;
}

const ITEM_STATUS_STYLES = {
  Pending:   'bg-gray-100 text-gray-500',
  Preparing: 'bg-yellow-100 text-yellow-700',
  Prepared:  'bg-green-100 text-green-700',
};

const ITEM_STATUS_CYCLE = { Pending: 'Preparing', Preparing: 'Prepared', Prepared: 'Pending' };

function ItemDetailCard({ item, onStatusChange }) {
  const [busy, setBusy] = useState(false);

  async function cycleStatus() {
    setBusy(true);
    await onStatusChange(ITEM_STATUS_CYCLE[item.itemStatus || 'Pending']);
    setBusy(false);
  }

  const details = [
    item.flavor, item.size, item.shape, item.layers,
    item.arrangement, item.flowerType, item.stems && `${item.stems} stems`,
    item.color, item.giftType, item.wrapping && `Wrapping: ${item.wrapping}`,
    item.plantType, item.potSize, item.potType,
    item.brand, item.boxType, item.quantity,
  ].filter(Boolean);

  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      {/* Item header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
        <div className="flex items-center gap-2">
          {item.category && (
            <span className="text-xs font-semibold bg-white border border-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
              {item.category}
            </span>
          )}
          <span className="font-semibold text-gray-800">{item.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={cycleStatus}
            disabled={busy}
            title="Click to cycle status"
            className={`text-xs font-semibold px-3 py-1 rounded-full cursor-pointer transition-colors ${ITEM_STATUS_STYLES[item.itemStatus || 'Pending']}`}
          >
            {item.itemStatus || 'Pending'}
          </button>
          <span className="text-sm font-bold text-gray-700">NPR {item.price?.toLocaleString('en-IN')}</span>
        </div>
      </div>

      <div className="px-4 py-3 space-y-3">
        {/* Details row */}
        {details.length > 0 && (
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-gray-500">
            {details.map((d, i) => (
              <span key={i}>{i > 0 && '· '}{d}</span>
            ))}
          </div>
        )}

        {/* Cake message */}
        {item.cakeMessage && (
          <div className="text-sm bg-pink-50 border border-pink-100 rounded-lg px-3 py-2">
            <span className="text-xs text-pink-400 font-medium">Message on cake · </span>
            <span className="text-pink-700 font-medium">"{item.cakeMessage}"</span>
          </div>
        )}

        {/* Gift / personalization message */}
        {item.giftMessage && (
          <div className="text-sm bg-purple-50 border border-purple-100 rounded-lg px-3 py-2">
            <span className="text-xs text-purple-400 font-medium">Personalization · </span>
            <span className="text-purple-700">"{item.giftMessage}"</span>
          </div>
        )}

        {/* Special note */}
        {item.specialNote && (
          <div className="text-sm bg-orange-50 border border-orange-100 rounded-lg px-3 py-2">
            <span className="text-xs text-orange-400 font-medium">Note · </span>
            <span className="text-orange-700">{item.specialNote}</span>
          </div>
        )}

        {/* Reference images */}
        {item.referenceImages?.length > 0 && (
          <div>
            <p className="text-xs text-gray-400 mb-1.5">Reference images</p>
            <div className="flex gap-2 flex-wrap">
              {item.referenceImages.map((url, j) => (
                <a key={j} href={url} target="_blank" rel="noreferrer">
                  <img
                    src={url.includes('cloudinary.com') ? url.replace('/upload/', '/upload/w_120,h_120,c_fill/') : url}
                    alt="reference"
                    className="w-20 h-20 object-cover rounded-lg border border-gray-200 hover:opacity-90 transition-opacity"
                  />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Completed product photos */}
        {item.completedImages?.length > 0 && (
          <div className="border-t border-green-100 pt-3">
            <p className="text-xs font-semibold text-green-600 mb-1.5">✓ Completed product</p>
            <div className="flex gap-2 flex-wrap">
              {item.completedImages.map((url, j) => (
                <a key={j} href={url} target="_blank" rel="noreferrer">
                  <img
                    src={url.includes('cloudinary.com') ? url.replace('/upload/', '/upload/w_120,h_120,c_fill/') : url}
                    alt="completed"
                    className="w-20 h-20 object-cover rounded-lg border-2 border-green-300 hover:opacity-90 transition-opacity"
                  />
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PrintMenu({ order }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 border border-gray-200 rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-gray-50">
        <Printer size={15} /> Print ▼
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-white border border-gray-100 rounded-xl shadow-lg z-20 w-52 py-1" onMouseLeave={() => setOpen(false)}>
          <button onClick={() => { printBill(order); setOpen(false); }}
            className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center gap-2">
            <FileText size={14} className="text-brand-500" /> Bill / Invoice
          </button>
          <button onClick={() => { printShippingLabel(order); setOpen(false); }}
            className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center gap-2">
            <Tag size={14} className="text-blue-500" /> Shipping Label
          </button>
          <button onClick={() => { printKitchenSheet(order); setOpen(false); }}
            className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center gap-2">
            <ChefHat size={14} className="text-orange-500" /> Kitchen Order Sheet
          </button>
        </div>
      )}
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <p className="text-xs text-gray-400">{label}</p>
      <p className="font-medium text-gray-800">{value || '—'}</p>
    </div>
  );
}

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { fetchOrder, currentOrder: order, updateStatus, deleteOrder, updateItemStatus } = useOrderStore();
  const { outlets, loaded, fetchOutlets } = useOutletStore();
  const [statusOpen, setStatusOpen] = useState(false);
  const [outletOpen, setOutletOpen] = useState(false);
  const [riderOpen, setRiderOpen]   = useState(false);
  const [riders, setRiders]         = useState([]);
  const [deleting, setDeleting]   = useState(false);
  const [smsSending, setSmsSending] = useState(false);

  async function sendSmsConfirmation() {
    if (!window.confirm(`Send SMS confirmation to ${order?.sender?.name} (${order?.sender?.phone})?`)) return;
    setSmsSending(true);
    try {
      await api.post(`/orders/${id}/notify`);
      toast.success('SMS sent!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'SMS failed');
    } finally {
      setSmsSending(false);
    }
  }

  useEffect(() => { fetchOrder(id); }, [id]);
  useEffect(() => { if (!loaded) fetchOutlets(); }, []);

  async function handleStatusChange(s) {
    await updateStatus(id, s);
    setStatusOpen(false);
    toast.success(`Status → ${s}`);
  }

  useEffect(() => {
    if (!order?.outlet) return;
    const outletId = order.outlet._id || order.outlet;
    api.get(`/users/riders?outlet=${outletId}`)
      .then(({ data }) => { if (data.success) setRiders(data.riders); })
      .catch(() => {});
  }, [order?.outlet]);

  async function handleAssignRider(riderId) {
    try {
      await api.patch(`/orders/${id}/assign-rider`, { riderId: riderId || null });
      await fetchOrder(id);
      setRiderOpen(false);
      toast.success(riderId ? 'Rider assigned' : 'Rider removed');
    } catch {
      toast.error('Could not assign rider');
    }
  }

  async function handleAssignOutlet(outletId) {
    try {
      await api.put(`/orders/${id}`, { outlet: outletId || null });
      await fetchOrder(id);
      setOutletOpen(false);
      toast.success(outletId ? 'Outlet assigned' : 'Outlet removed');
    } catch {
      toast.error('Could not update outlet');
    }
  }

  async function handleDelete() {
    if (!window.confirm('Cancel this order?')) return;
    setDeleting(true);
    const res = await deleteOrder(id);
    if (res.success) {
      toast.success('Order cancelled');
      navigate('/orders');
    }
    setDeleting(false);
  }

  if (!order) return <div className="p-6 text-gray-400">Loading...</div>;

  const stepIdx = STATUSES.indexOf(order.status);

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-start gap-3 mb-6">
        <button onClick={() => navigate('/orders')} className="text-gray-500 hover:text-gray-700 mt-1">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold">{order.orderNumber}</h1>
          <p className="text-xs sm:text-sm text-gray-400">Created {dayjs(order.createdAt).format('DD MMM YYYY, hh:mm A')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Status dropdown */}
          <div className="relative">
            <button onClick={() => setStatusOpen((v) => !v)}
              className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-gray-50">
              <StatusBadge status={order.status} />
              <span className="text-gray-400">▼</span>
            </button>
            {statusOpen && (
              <div className="absolute right-0 top-full mt-1 bg-white border border-gray-100 rounded-xl shadow-lg z-10 w-48">
                {STATUSES.map((s) => (
                  <button key={s} onClick={() => handleStatusChange(s)}
                    className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center gap-2 ${s === order.status ? 'font-semibold' : ''}`}>
                    {s === order.status && <Check size={14} className="text-brand-500" />}
                    <StatusBadge status={s} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Print dropdown */}
          <PrintMenu order={order} />

          {/* WhatsApp click-to-chat */}
          <a
            href={buildWhatsAppUrl(order)}
            target="_blank"
            rel="noopener noreferrer"
            title="Share order details on WhatsApp"
            className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white font-medium text-sm px-3 py-2 rounded-lg transition-colors"
          >
            <MessageCircle size={15} /> WhatsApp
          </a>

          {/* SparrowSMS confirmation */}
          <button
            onClick={sendSmsConfirmation}
            disabled={smsSending}
            title="Send SMS confirmation via SparrowSMS"
            className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-medium text-sm px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            <Send size={15} /> {smsSending ? 'Sending…' : 'SMS'}
          </button>

          <button onClick={() => navigate(`/orders/${id}/edit`)} className="btn-secondary flex items-center gap-2 text-sm">
            <Edit2 size={15} /> Edit
          </button>
          <button onClick={handleDelete} disabled={deleting}
            className="flex items-center gap-2 text-red-500 hover:text-red-700 font-medium text-sm px-3 py-2 rounded-lg hover:bg-red-50">
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {/* Status Timeline */}
      <div className="card mb-5">
        <div className="flex items-center justify-between">
          {['New', 'Confirmed', 'In Production', 'Out for Delivery', 'Delivered'].map((s, i) => (
            <div key={s} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                  stepIdx >= i ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-400'
                }`}>
                  {stepIdx > i ? <Check size={14} /> : i + 1}
                </div>
                <span className="text-xs text-gray-500 mt-1 text-center leading-tight">{s}</span>
              </div>
              {i < 4 && <div className={`h-0.5 flex-1 mb-5 ${stepIdx > i ? 'bg-brand-400' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
        {/* Sender */}
        <div className="card">
          <h2 className="font-semibold mb-3">Sender</h2>
          <div className="space-y-2">
            <Field label="Name" value={order.sender.name} />
            <Field label="Phone" value={order.sender.phone} />
            <Field label="Social ID" value={order.sender.socialId} />
            <Field label="Channel" value={order.sender.channel} />
          </div>
        </div>

        {/* Receiver */}
        <div className="card">
          <h2 className="font-semibold mb-3">Receiver</h2>
          <div className="space-y-2">
            <Field label="Name" value={order.receiver.name} />
            <Field label="Phone" value={order.receiver.phone} />
            <Field label="City" value={order.receiver.city} />
            <Field label="Landmark" value={order.receiver.landmark} />
          </div>
        </div>

        {/* Delivery */}
        <div className="card">
          <h2 className="font-semibold mb-3">Delivery</h2>
          <div className="space-y-2">
            <Field label="Date" value={dayjs(order.delivery.date).format('DD MMM YYYY')} />
            <Field label="Slot" value={order.delivery.slot} />
            <Field label="Partner" value={order.delivery.partner} />
            <Field label="Notes" value={order.delivery.notes} />
          </div>
        </div>

        {/* Payment */}
        <div className="card">
          <h2 className="font-semibold mb-3">Payment</h2>
          <div className="space-y-2">
            {/* Split payment breakdown */}
            {order.payment.splits?.length > 0 ? (
              <div className="space-y-1 mb-2">
                <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">Split Payment</p>
                {order.payment.splits.map((sp, i) => (
                  <div key={i} className="flex justify-between items-center bg-gray-50 rounded-lg px-3 py-1.5">
                    <span className="text-sm font-medium text-gray-700">{sp.method}</span>
                    <span className="text-sm font-semibold text-brand-600">NPR {Number(sp.amount).toLocaleString('en-IN')}</span>
                  </div>
                ))}
              </div>
            ) : (
              <Field label="Method" value={order.payment.method} />
            )}
            <div className="flex justify-between py-2 border-t mt-2">
              <span className="text-gray-500">Total</span>
              <span className="font-bold">NPR {order.payment.total?.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Advance</span>
              <span className="text-green-600">NPR {order.payment.advance?.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Due</span>
              <span className={order.payment.due > 0 ? 'text-red-500 font-bold' : 'text-green-600'}>
                NPR {order.payment.due?.toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Outlet Panel ─────────────────────────────────────────── */}
      <div className="mb-5 rounded-2xl border-2 border-gray-100 overflow-hidden">

        {/* Panel header */}
        <div className="flex justify-between items-center px-5 py-3 bg-gray-50 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Store size={16} className="text-brand-500" />
            <span className="font-semibold text-gray-700">Assigned Outlet</span>
            {order.outlet && (
              <span className="font-bold text-gray-900">{order.outlet.name}</span>
            )}
            {order.outlet?.city && (
              <span className="text-sm text-gray-400">· {order.outlet.city}</span>
            )}
          </div>
          <div className="relative">
            <button
              onClick={() => setOutletOpen((v) => !v)}
              className="text-sm text-brand-600 hover:text-brand-700 font-medium px-3 py-1.5 rounded-lg hover:bg-brand-50 border border-brand-200 flex items-center gap-1"
            >
              {order.outlet ? 'Reassign' : '+ Assign outlet'}
              <span className="text-gray-400 text-xs">▼</span>
            </button>
            {outletOpen && (
              <div className="absolute right-0 top-full mt-1 bg-white border border-gray-100 rounded-xl shadow-lg z-10 w-64 py-1">
                <button
                  onClick={() => handleAssignOutlet('')}
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 text-gray-400 italic"
                >
                  Remove assignment
                </button>
                <div className="border-t border-gray-50 my-1" />
                {outlets.filter((o) => o.isActive).map((o) => (
                  <button
                    key={o._id}
                    onClick={() => handleAssignOutlet(o._id)}
                    className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center gap-2 ${order.outlet?._id === o._id ? 'text-brand-600' : ''}`}
                  >
                    {order.outlet?._id === o._id
                      ? <Check size={14} className="text-brand-500 flex-shrink-0" />
                      : <span className="w-3.5" />}
                    <div>
                      <div className="font-medium">{o.name}</div>
                      <div className="text-xs text-gray-400">{o.city}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {order.outlet ? (
          <div className="grid grid-cols-2 divide-x divide-gray-100">

            {/* Kitchen */}
            <div className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
                  <ChefHat size={16} className="text-orange-500" />
                </div>
                <div>
                  <p className="font-semibold text-gray-800 leading-tight">
                    {order.outlet.kitchen?.label || 'Kitchen'}
                  </p>
                  <p className="text-xs text-orange-500">Cake preparation</p>
                </div>
              </div>
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-gray-400">Responsible</p>
                  <p className="text-sm font-medium text-gray-800">
                    {order.outlet.kitchen?.responsible || <span className="text-gray-400 italic">Not set</span>}
                  </p>
                </div>
                {order.outlet.kitchen?.notes && (
                  <div>
                    <p className="text-xs text-gray-400">Notes</p>
                    <p className="text-sm text-gray-600">{order.outlet.kitchen.notes}</p>
                  </div>
                )}
                {/* Which items go here */}
                {order.items.some((i) => i.category === 'Cake') && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-xs text-gray-400 mb-1.5">Items to prepare here</p>
                    <div className="space-y-1">
                      {order.items.filter((i) => i.category === 'Cake').map((item, idx) => (
                        <div key={idx} className="flex justify-between text-sm">
                          <span className="text-gray-700">{item.name}</span>
                          <span className="text-gray-500">NPR {item.price?.toLocaleString('en-IN')}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Prep Area */}
            <div className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Package size={16} className="text-blue-500" />
                </div>
                <div>
                  <p className="font-semibold text-gray-800 leading-tight">
                    {order.outlet.prepArea?.label || 'Order Preparation Area'}
                  </p>
                  <p className="text-xs text-blue-500">Flowers · Gifts · Chocolates</p>
                </div>
              </div>
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-gray-400">Responsible</p>
                  <p className="text-sm font-medium text-gray-800">
                    {order.outlet.prepArea?.responsible || <span className="text-gray-400 italic">Not set</span>}
                  </p>
                </div>
                {order.outlet.prepArea?.notes && (
                  <div>
                    <p className="text-xs text-gray-400">Notes</p>
                    <p className="text-sm text-gray-600">{order.outlet.prepArea.notes}</p>
                  </div>
                )}
                {/* Which items go here */}
                {order.items.some((i) => i.category !== 'Cake') && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-xs text-gray-400 mb-1.5">Items to prepare here</p>
                    <div className="space-y-1">
                      {order.items.filter((i) => i.category !== 'Cake').map((item, idx) => (
                        <div key={idx} className="flex justify-between text-sm">
                          <span className="text-gray-700">{item.name}</span>
                          <span className="text-gray-500">NPR {item.price?.toLocaleString('en-IN')}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>
        ) : (
          <div className="px-5 py-8 text-center text-gray-400">
            <Store size={28} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">No outlet assigned yet.</p>
            <p className="text-xs mt-1">Use the button above to assign this order to an outlet.</p>
          </div>
        )}
      </div>

      {/* Rider Assignment */}
      <div className="mb-5 rounded-2xl border-2 border-gray-100 overflow-hidden">
        <div className="flex justify-between items-center px-5 py-3 bg-gray-50 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Truck size={16} className="text-green-600" />
            <span className="font-semibold text-gray-700">Delivery Rider</span>
            {order.assignedRider && (
              <span className="font-bold text-gray-900">{order.assignedRider.name}</span>
            )}
            {order.assignedRider?.username && (
              <span className="text-sm text-gray-400">· @{order.assignedRider.username}</span>
            )}
          </div>
          {order.outlet && (
            <div className="relative">
              <button
                onClick={() => setRiderOpen((v) => !v)}
                className="text-sm text-green-700 hover:text-green-800 font-medium px-3 py-1.5 rounded-lg hover:bg-green-50 border border-green-200 flex items-center gap-1"
              >
                {order.assignedRider ? 'Reassign' : '+ Assign rider'}
                <span className="text-gray-400 text-xs">▼</span>
              </button>
              {riderOpen && (
                <div className="absolute right-0 top-full mt-1 bg-white border border-gray-100 rounded-xl shadow-lg z-10 w-64 py-1">
                  <button
                    onClick={() => handleAssignRider('')}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 text-gray-400 italic"
                  >
                    Remove assignment
                  </button>
                  <div className="border-t border-gray-50 my-1" />
                  {riders.length === 0 ? (
                    <p className="px-4 py-3 text-sm text-gray-400 italic">No riders linked to this outlet.</p>
                  ) : (
                    riders.map((r) => (
                      <button
                        key={r._id}
                        onClick={() => handleAssignRider(r._id)}
                        className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center gap-2 ${order.assignedRider?._id === r._id ? 'text-green-700' : ''}`}
                      >
                        {order.assignedRider?._id === r._id
                          ? <Check size={14} className="text-green-600 flex-shrink-0" />
                          : <span className="w-3.5" />}
                        <div>
                          <div className="font-medium">{r.name}</div>
                          <div className="text-xs text-gray-400">@{r.username}</div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-5 py-4">
          {order.delivery.signature ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-green-700 text-sm font-medium">
                <Check size={16} />
                Delivered — signed by {order.delivery.receiverConfirmName || order.receiver.name}
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1.5">Signature</p>
                <img
                  src={order.delivery.signature}
                  alt="Delivery signature"
                  className="border border-gray-200 rounded-lg bg-white max-w-xs h-24 object-contain"
                />
              </div>
              {order.delivery.signedAt && (
                <p className="text-xs text-gray-400">Signed at: {dayjs(order.delivery.signedAt).format('DD MMM YYYY, hh:mm A')}</p>
              )}
            </div>
          ) : !order.assignedRider ? (
            <div className="text-center py-3 text-gray-400">
              <User size={24} className="mx-auto mb-1.5 opacity-30" />
              <p className="text-sm">{order.outlet ? 'No rider assigned yet.' : 'Assign an outlet first to see available riders.'}</p>
            </div>
          ) : (
            <p className="text-sm text-gray-500">Awaiting delivery by <strong>{order.assignedRider.name}</strong>.</p>
          )}
        </div>
      </div>

      {/* Items */}
      <div className="card mb-5">
        <h2 className="font-semibold mb-4">Items ({order.items.length})</h2>
        <div className="space-y-4">
          {order.items.map((item) => (
            <ItemDetailCard
              key={item._id}
              item={item}
              onStatusChange={(itemStatus) => updateItemStatus(order._id, item._id, itemStatus)}
            />
          ))}
        </div>
      </div>

      {order.note && (
        <div className="card mb-5">
          <h2 className="font-semibold mb-2">Internal Note</h2>
          <p className="text-gray-700">{order.note}</p>
        </div>
      )}
    </div>
  );
}
