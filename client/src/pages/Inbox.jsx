import { useEffect, useRef, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Send, Search, CheckCheck, ArrowLeft, UserCheck, RefreshCw, ShoppingBag, Plus, Minus, X, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import useAuthStore from '../store/authStore';
import useInboxStore from '../store/inboxStore';
import api from '../lib/api';
import PhoneField from '../components/PhoneField';
import { isValidIntlPhoneDigits } from '../lib/phoneIntl';

dayjs.extend(relativeTime);

const PLATFORM = {
  whatsapp:  { label: 'WhatsApp',  color: 'text-green-600',  bg: 'bg-green-50',  dot: 'bg-green-500',  icon: WhatsAppIcon },
  instagram: { label: 'Instagram', color: 'text-pink-600',   bg: 'bg-pink-50',   dot: 'bg-pink-500',   icon: InstagramIcon },
  facebook:  { label: 'Facebook',  color: 'text-blue-600',   bg: 'bg-blue-50',   dot: 'bg-blue-500',   icon: FacebookIcon },
  tiktok:    { label: 'TikTok',    color: 'text-gray-800',   bg: 'bg-gray-100',  dot: 'bg-gray-700',   icon: TikTokIcon },
};

function WhatsAppIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}

function InstagramIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
    </svg>
  );
}

function FacebookIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  );
}

function TikTokIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.84 1.57V6.79a4.85 4.85 0 01-1.07-.1z"/>
    </svg>
  );
}

function Avatar({ name, avatar, platform, size = 'md' }) {
  const sz  = size === 'sm' ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm';
  const P   = PLATFORM[platform];
  const dot = P?.dot;
  const initials = name ? name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : '?';

  return (
    <div className="relative flex-shrink-0">
      {avatar
        ? <img src={avatar} alt={name} className={`${sz} rounded-full object-cover`} />
        : (
          <div className={`${sz} rounded-full bg-gradient-to-br from-brand-100 to-brand-200 flex items-center justify-center font-semibold text-brand-600`}>
            {initials}
          </div>
        )
      }
      {dot && <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${dot}`} />}
    </div>
  );
}

function ConversationItem({ conv, active, onClick }) {
  const P    = PLATFORM[conv.platform];
  const Icon = P?.icon;
  const time = dayjs(conv.lastMessageAt).fromNow(true);

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-3 flex items-start gap-3 border-b border-gray-50 transition-colors hover:bg-gray-50 ${
        active ? 'bg-brand-50 border-l-2 border-l-brand-500' : ''
      }`}
    >
      <Avatar name={conv.customerName} avatar={conv.customerAvatar} platform={conv.platform} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1 mb-0.5">
          <span className={`font-medium text-sm truncate ${active ? 'text-brand-700' : 'text-gray-900'}`}>
            {conv.customerName}
          </span>
          <span className="text-xs text-gray-400 flex-shrink-0">{time}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`${P?.color} flex-shrink-0`}><Icon size={11} /></span>
          <p className="text-xs text-gray-500 truncate flex-1">{conv.lastMessage || 'No messages'}</p>
          {conv.unreadCount > 0 && (
            <span className="flex-shrink-0 bg-brand-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
              {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
            </span>
          )}
        </div>
        {conv.outlet?.name && (
          <p className="text-xs text-gray-400 mt-0.5">{conv.outlet.name}</p>
        )}
      </div>
    </button>
  );
}

function MessageBubble({ msg, isOwn }) {
  const time = dayjs(msg.sentAt).format('h:mm A');
  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-1`}>
      <div className={`max-w-[75%] ${isOwn ? 'order-2' : ''}`}>
        {!isOwn && msg.sentBy?.name && (
          <p className="text-xs text-gray-400 mb-1 ml-1">{msg.sentBy.name}</p>
        )}
        <div
          className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${
            isOwn
              ? 'bg-brand-500 text-white rounded-br-sm'
              : 'bg-white border border-gray-100 text-gray-800 rounded-bl-sm shadow-sm'
          }`}
        >
          {msg.body}
        </div>
        <div className={`flex items-center gap-1 mt-0.5 ${isOwn ? 'justify-end' : 'justify-start'}`}>
          <span className="text-xs text-gray-400">{time}</span>
          {isOwn && (
            <CheckCheck size={12} className={msg.status === 'read' ? 'text-blue-400' : 'text-gray-400'} />
          )}
        </div>
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const PLATFORM_TO_CHANNEL = {
  whatsapp: 'WhatsApp', instagram: 'Instagram', facebook: 'Facebook', tiktok: 'Website',
};
const CATEGORIES = ['Cake', 'Flower', 'Gifts', 'Plant', 'Chocolate', 'Combo'];
const SLOTS      = ['7AM–10AM', '10AM–1PM', '1PM–4PM', '4PM–7PM', '7PM–9PM', 'Anytime'];
const METHODS    = ['Cash', 'eSewa', 'Khalti', 'Bank Transfer', 'QR'];
const CITIES     = ['Birtamode', 'Damak', 'Dharan', 'Biratnagar', 'Itahari', 'Jhapa', 'Kathmandu', 'Ilam', 'Other'];

function phoneFromConv(conv) {
  if (conv.platform === 'whatsapp') {
    const id = conv.externalId || '';
    return id.startsWith('977') && id.length >= 12 ? id.slice(3) : id;
  }
  return (conv.customerHandle || '').replace(/^\+977/, '');
}

function emptyItem() {
  return { category: 'Cake', name: '', flavor: '', size: '', price: '' };
}

// ── Quick Order Panel ─────────────────────────────────────────────────────────

function QuickOrderPanel({ conv, onClose, onOrderCreated }) {
  const { linkConversation } = useInboxStore();
  const outletId = conv.outlet?._id || conv.outlet || '';

  const [form, setForm] = useState({
    outlet:   outletId,
    sender:   {
      name:     conv.customerName || '',
      phone:    phoneFromConv(conv),
      socialId: conv.customerHandle || '',
      channel:  PLATFORM_TO_CHANNEL[conv.platform] || 'Instagram',
    },
    items:    [emptyItem()],
    payment:  { advance: 0, method: 'Cash' },
    receiver: { name: '', phone: '', city: '', landmark: '' },
    delivery: { date: '', slot: 'Anytime', notes: '' },
    note:     '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [outlets, setOutlets]       = useState([]);
  const [success, setSuccess]       = useState(null); // created order

  useEffect(() => {
    api.get('/outlets').then(r => setOutlets(r.data.outlets || [])).catch(() => {});
  }, []);

  const total = form.items.reduce((s, i) => s + (Number(i.price) || 0), 0);
  const due   = total - Number(form.payment.advance || 0);

  function setField(path, value) {
    setForm(f => {
      const parts = path.split('.');
      if (parts.length === 1) return { ...f, [path]: value };
      return { ...f, [parts[0]]: { ...f[parts[0]], [parts[1]]: value } };
    });
  }

  function setItem(idx, key, value) {
    setForm(f => ({
      ...f,
      items: f.items.map((item, i) => i === idx ? { ...item, [key]: value } : item),
    }));
  }

  function addItem()    { setForm(f => ({ ...f, items: [...f.items, emptyItem()] })); }
  function removeItem(i){ setForm(f => ({ ...f, items: f.items.filter((_, idx) => idx !== i) })); }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.outlet) return toast.error('Select an outlet');
    if (!form.sender.name || !form.sender.phone) return toast.error('Sender name and phone required');
    if (!isValidIntlPhoneDigits(form.sender.phone)) return toast.error('Enter a valid sender phone with country code');
    if (!form.items.some(i => i.name)) return toast.error('At least one item name required');
    if (!form.receiver.name || !form.receiver.phone || !form.receiver.city) return toast.error('Receiver details required');
    if (!isValidIntlPhoneDigits(form.receiver.phone)) return toast.error('Enter a valid receiver phone with country code');
    if (!form.delivery.date) return toast.error('Delivery date required');

    setSubmitting(true);
    try {
      const payload = {
        ...form,
        items:   form.items.map(i => ({ ...i, price: Number(i.price) || 0 })),
        payment: { ...form.payment, total, due, advance: Number(form.payment.advance) || 0 },
      };
      const { data } = await api.post('/orders', payload);
      setSuccess(data.order);
      // auto-link
      await linkConversation(conv._id, { orderId: data.order._id });
      toast.success(`Order ${data.order.orderNumber} created & linked!`);
      onOrderCreated?.(data.order);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create order');
    } finally {
      setSubmitting(false);
    }
  }

  const input = 'w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-300';
  const label = 'block text-xs font-medium text-gray-500 mb-1';

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <CheckCircle2 size={40} className="text-green-500 mb-3" />
        <p className="font-semibold text-gray-800 mb-1">Order Created!</p>
        <p className="text-brand-600 font-mono text-sm mb-1">{success.orderNumber}</p>
        <p className="text-xs text-gray-500 mb-4">Linked to this conversation</p>
        <div className="flex gap-2">
          <button
            onClick={() => { setSuccess(null); setForm(f => ({ ...f, items: [emptyItem()], payment: { advance: 0, method: 'Cash' }, receiver: { name:'',phone:'',city:'',landmark:'' }, delivery: { date:'',slot:'Anytime',notes:'' }, note: '' })); }}
            className="text-xs px-3 py-1.5 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors"
          >
            New Order
          </button>
          <button onClick={onClose} className="text-xs px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors">
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full">
      {/* Panel header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0 bg-white">
        <div className="flex items-center gap-2">
          <ShoppingBag size={15} className="text-brand-500" />
          <span className="font-semibold text-sm text-gray-800">New Order</span>
        </div>
        <button type="button" onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400">
          <X size={14} />
        </button>
      </div>

      {/* Scrollable form body */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 text-xs">

        {/* Outlet */}
        <div>
          <label className={label}>Outlet</label>
          <select value={form.outlet} onChange={e => setField('outlet', e.target.value)} className={input}>
            <option value="">Select outlet…</option>
            {outlets.map(o => <option key={o._id} value={o._id}>{o.name} — {o.city}</option>)}
          </select>
        </div>

        {/* ── Sender ── */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Sender</p>
          <div className="space-y-2">
            <div>
              <label className={label}>Full Name *</label>
              <input value={form.sender.name} onChange={e => setField('sender.name', e.target.value)} className={input} placeholder="Customer name" />
            </div>
            <div>
              <PhoneField
                label="Phone *"
                value={form.sender.phone}
                onChange={(v) => setField('sender.phone', v)}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={label}>Social ID</label>
                <input value={form.sender.socialId} onChange={e => setField('sender.socialId', e.target.value)} className={input} placeholder="@handle" />
              </div>
              <div>
                <label className={label}>Channel</label>
                <select value={form.sender.channel} onChange={e => setField('sender.channel', e.target.value)} className={input}>
                  {['Instagram','Facebook','WhatsApp','Website','Walk-in','Phone Call'].map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* ── Items ── */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Items</p>
            <button type="button" onClick={addItem} className="flex items-center gap-1 text-brand-600 hover:text-brand-700 text-xs font-medium">
              <Plus size={12} /> Add
            </button>
          </div>
          <div className="space-y-3">
            {form.items.map((item, idx) => (
              <div key={idx} className="border border-gray-100 rounded-xl p-3 bg-gray-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-600">Item {idx + 1}</span>
                  {form.items.length > 1 && (
                    <button type="button" onClick={() => removeItem(idx)} className="text-gray-300 hover:text-red-400">
                      <Minus size={12} />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={label}>Category</label>
                    <select value={item.category} onChange={e => setItem(idx, 'category', e.target.value)} className={input}>
                      {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={label}>Price (NPR) *</label>
                    <input type="number" value={item.price} onChange={e => setItem(idx, 'price', e.target.value)} className={input} placeholder="0" min="0" />
                  </div>
                </div>
                <div>
                  <label className={label}>Name / Description *</label>
                  <input value={item.name} onChange={e => setItem(idx, 'name', e.target.value)} className={input} placeholder="e.g. Chocolate Cake 1kg" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={label}>Flavor</label>
                    <input value={item.flavor} onChange={e => setItem(idx, 'flavor', e.target.value)} className={input} placeholder="e.g. Chocolate" />
                  </div>
                  <div>
                    <label className={label}>Size</label>
                    <input value={item.size} onChange={e => setItem(idx, 'size', e.target.value)} className={input} placeholder="e.g. 1kg" />
                  </div>
                </div>
              </div>
            ))}
          </div>
          {/* Running total */}
          <div className="mt-2 flex items-center justify-between bg-brand-50 rounded-lg px-3 py-2">
            <span className="text-xs font-medium text-brand-700">Items Total</span>
            <span className="text-sm font-bold text-brand-700">NPR {total.toLocaleString('en-IN')}</span>
          </div>
        </div>

        {/* ── Payment ── */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Payment</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={label}>Advance Paid</label>
              <input type="number" value={form.payment.advance} onChange={e => setField('payment.advance', e.target.value)} className={input} min="0" placeholder="0" />
            </div>
            <div>
              <label className={label}>Method</label>
              <select value={form.payment.method} onChange={e => setField('payment.method', e.target.value)} className={input}>
                {METHODS.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between bg-orange-50 rounded-lg px-3 py-2">
            <span className="text-xs font-medium text-orange-700">Due on Delivery</span>
            <span className="text-sm font-bold text-orange-700">NPR {Math.max(0, due).toLocaleString('en-IN')}</span>
          </div>
        </div>

        {/* ── Receiver ── */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Receiver</p>
          <div className="space-y-2">
            <div>
              <label className={label}>Name *</label>
              <input value={form.receiver.name} onChange={e => setField('receiver.name', e.target.value)} className={input} placeholder="Receiver name" />
            </div>
            <PhoneField
              label="Phone *"
              value={form.receiver.phone}
              onChange={(v) => setField('receiver.phone', v)}
            />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={label}>City *</label>
                <select value={form.receiver.city} onChange={e => setField('receiver.city', e.target.value)} className={input}>
                  <option value="">Select…</option>
                  {CITIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className={label}>Landmark</label>
                <input value={form.receiver.landmark} onChange={e => setField('receiver.landmark', e.target.value)} className={input} placeholder="Near..." />
              </div>
            </div>
          </div>
        </div>

        {/* ── Delivery ── */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Delivery</p>
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={label}>Date *</label>
                <input type="date" value={form.delivery.date} onChange={e => setField('delivery.date', e.target.value)} className={input} />
              </div>
              <div>
                <label className={label}>Time Slot</label>
                <select value={form.delivery.slot} onChange={e => setField('delivery.slot', e.target.value)} className={input}>
                  {SLOTS.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className={label}>Partner / Delivery Notes</label>
              <input value={form.delivery.notes} onChange={e => setField('delivery.notes', e.target.value)} className={input} placeholder="Delivery instructions" />
            </div>
          </div>
        </div>

        {/* Internal note */}
        <div>
          <label className={label}>Internal Note</label>
          <textarea value={form.note} onChange={e => setField('note', e.target.value)} className={`${input} resize-none`} rows={2} placeholder="Staff notes…" />
        </div>
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 px-4 py-3 border-t border-gray-100 bg-white">
        <div className="flex items-center justify-between mb-2 text-xs text-gray-500">
          <span>Total: <strong className="text-gray-800">NPR {total.toLocaleString('en-IN')}</strong></span>
          <span>Due: <strong className="text-orange-600">NPR {Math.max(0, due).toLocaleString('en-IN')}</strong></span>
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white text-sm font-medium py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          {submitting
            ? <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Creating…</>
            : <><ShoppingBag size={14} /> Create Order</>
          }
        </button>
      </div>
    </form>
  );
}

// ── Chat Panel ────────────────────────────────────────────────────────────────

function ChatPanel({ conv, onBack }) {
  const { messages, loadingMsgs, sendingReply, sendReply, updateConversation, linkConversation, loadMoreMessages } = useInboxStore();
  const [text, setText]         = useState('');
  const [rightPanel, setRightPanel] = useState(null); // null | 'info' | 'order'
  const [staff, setStaff]       = useState([]);
  const [orders, setOrders]     = useState([]);
  const [orderSearch, setOrderSearch] = useState('');
  const bottomRef               = useRef(null);
  const textRef                 = useRef(null);

  const P    = PLATFORM[conv.platform];
  const Icon = P?.icon;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    api.get('/users').then(r => setStaff(r.data.users || [])).catch(() => {});
  }, []);

  function togglePanel(panel) {
    setRightPanel(v => v === panel ? null : panel);
  }

  async function handleSend(e) {
    e.preventDefault();
    if (!text.trim()) return;
    try {
      await sendReply(text);
      setText('');
      textRef.current?.focus();
    } catch {
      toast.error('Failed to send message');
    }
  }

  async function searchOrders(q) {
    if (!q || q.length < 2) return;
    try {
      const { data } = await api.get('/orders', { params: { search: q, limit: 5 } });
      setOrders(data.orders || []);
    } catch (_) {}
  }

  const statusColor = conv.status === 'open'     ? 'text-green-600 bg-green-50'
                    : conv.status === 'resolved'  ? 'text-gray-500 bg-gray-100'
                    : 'text-yellow-600 bg-yellow-50';

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-100 flex-shrink-0">
        <button onClick={onBack} className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
          <ArrowLeft size={18} />
        </button>
        <Avatar name={conv.customerName} avatar={conv.customerAvatar} platform={conv.platform} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-gray-900 truncate">{conv.customerName}</h2>
            <span className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full ${P?.bg} ${P?.color}`}>
              <Icon size={10} /> {P?.label}
            </span>
          </div>
          <p className="text-xs text-gray-400">{conv.account?.label} · {conv.outlet?.name}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => updateConversation(conv._id, { status: conv.status === 'open' ? 'resolved' : 'open' })}
            className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${statusColor}`}
          >
            {conv.status === 'open' ? 'Resolve' : 'Reopen'}
          </button>
          <button
            title="New Order"
            onClick={() => togglePanel('order')}
            className={`p-1.5 rounded-lg transition-colors ${rightPanel === 'order' ? 'bg-green-50 text-green-600' : 'hover:bg-gray-100 text-gray-500'}`}
          >
            <ShoppingBag size={16} />
          </button>
          <button
            title="Conversation Info"
            onClick={() => togglePanel('info')}
            className={`p-1.5 rounded-lg transition-colors ${rightPanel === 'info' ? 'bg-brand-50 text-brand-600' : 'hover:bg-gray-100 text-gray-500'}`}
          >
            <UserCheck size={16} />
          </button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Messages + reply */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-0.5 bg-gray-50">
            {loadingMsgs ? (
              <div className="flex justify-center pt-8">
                <div className="w-6 h-6 border-2 border-brand-300 border-t-brand-600 rounded-full animate-spin" />
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-sm">No messages yet</div>
            ) : (
              <>
                <button onClick={loadMoreMessages} className="w-full text-center text-xs text-brand-500 hover:text-brand-700 py-2">
                  Load earlier messages
                </button>
                {messages.map(msg => (
                  <MessageBubble key={msg._id} msg={msg} isOwn={msg.direction === 'outbound'} />
                ))}
                <div ref={bottomRef} />
              </>
            )}
          </div>

          <form onSubmit={handleSend} className="flex items-end gap-2 px-4 py-3 bg-white border-t border-gray-100 flex-shrink-0">
            <textarea
              ref={textRef}
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e); } }}
              placeholder={`Reply via ${P?.label}…`}
              rows={1}
              disabled={conv.status === 'resolved'}
              className="flex-1 resize-none border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 disabled:opacity-50 disabled:bg-gray-50 max-h-32"
              style={{ overflowY: 'auto' }}
            />
            <button
              type="submit"
              disabled={!text.trim() || sendingReply || conv.status === 'resolved'}
              className="flex-shrink-0 w-10 h-10 bg-brand-500 hover:bg-brand-600 disabled:opacity-40 text-white rounded-xl flex items-center justify-center transition-colors"
            >
              {sendingReply
                ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                : <Send size={16} />
              }
            </button>
          </form>
        </div>

        {/* Right panel — Info */}
        {rightPanel === 'info' && (
          <div className="w-60 border-l border-gray-100 bg-white overflow-y-auto flex-shrink-0 p-4 space-y-4 text-sm">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Assigned to</p>
              <select
                value={conv.assignedTo?._id || conv.assignedTo || ''}
                onChange={e => updateConversation(conv._id, { assignedTo: e.target.value || null })}
                className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
              >
                <option value="">Unassigned</option>
                {staff.map(u => <option key={u._id} value={u._id}>{u.name}</option>)}
              </select>
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Linked Order</p>
              {conv.linkedOrder ? (
                <div className="flex items-center justify-between bg-brand-50 rounded-lg px-2.5 py-2">
                  <div>
                    <p className="font-medium text-brand-700">{conv.linkedOrder.orderNumber}</p>
                    <p className="text-xs text-gray-500">{conv.linkedOrder.status}</p>
                  </div>
                  <button onClick={() => linkConversation(conv._id, { orderId: null })} className="text-gray-400 hover:text-red-500 text-xs">✕</button>
                </div>
              ) : (
                <div>
                  <input
                    value={orderSearch}
                    onChange={e => { setOrderSearch(e.target.value); searchOrders(e.target.value); }}
                    placeholder="Search order #..."
                    className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                  />
                  {orders.length > 0 && (
                    <div className="mt-1 border border-gray-100 rounded-lg overflow-hidden">
                      {orders.map(o => (
                        <button key={o._id} onClick={() => { linkConversation(conv._id, { orderId: o._id }); setOrders([]); setOrderSearch(''); }}
                          className="w-full text-left px-2.5 py-1.5 hover:bg-gray-50 text-xs border-b border-gray-50 last:border-0"
                        >
                          <span className="font-medium">{o.orderNumber}</span>
                          <span className="text-gray-400 ml-1">{o.sender?.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Contact</p>
              <p className="text-gray-700 text-xs">{conv.customerHandle || conv.externalId}</p>
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Status</p>
              <div className="flex gap-2 flex-wrap">
                {['open', 'resolved', 'snoozed'].map(s => (
                  <button key={s} onClick={() => updateConversation(conv._id, { status: s })}
                    className={`text-xs px-2.5 py-1 rounded-full capitalize font-medium transition-colors ${
                      conv.status === s ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >{s}</button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Right panel — New Order */}
        {rightPanel === 'order' && (
          <div className="w-80 border-l border-gray-100 bg-white flex-shrink-0 flex flex-col min-h-0">
            <QuickOrderPanel
              conv={conv}
              onClose={() => setRightPanel(null)}
              onOrderCreated={() => {}}
            />
          </div>
        )}
      </div>
    </div>
  );
}

const PLATFORMS = ['', 'whatsapp', 'instagram', 'facebook', 'tiktok'];

export default function Inbox() {
  const { user } = useAuthStore();
  const {
    conversations, total, loadingConvs, unreadTotal,
    activeConversation, filters,
    fetchConversations, fetchUnread, openConversation,
    setFilter, initSocket, disconnectSocket,
  } = useInboxStore();

  const [searchParams, setSearchParams] = useSearchParams();
  const [mobileView, setMobileView]     = useState('list'); // 'list' | 'chat'
  const searchTimeout                   = useRef(null);

  useEffect(() => {
    const outletIds = (user?.assignedOutlets || []).map(o => o._id || o);
    initSocket(outletIds);
    fetchConversations();
    fetchUnread();
    return () => disconnectSocket();
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [filters]);

  const convIdFromUrl = searchParams.get('id');
  useEffect(() => {
    if (convIdFromUrl) {
      openConversation(convIdFromUrl);
      setMobileView('chat');
    }
  }, [convIdFromUrl]);

  function handleSelectConv(id) {
    setSearchParams({ id });
    openConversation(id);
    setMobileView('chat');
  }

  function handleSearch(val) {
    clearTimeout(searchTimeout.current);
    setFilter('search', val);
    searchTimeout.current = setTimeout(() => fetchConversations(), 400);
  }

  const activePlatform = filters.platform || '';

  return (
    <div className="flex h-[calc(100vh-56px)] lg:h-screen overflow-hidden bg-white">
      {/* ── Conversation list ── */}
      <div className={`w-full lg:w-80 xl:w-96 flex-shrink-0 flex flex-col border-r border-gray-100 ${mobileView === 'chat' ? 'hidden lg:flex' : 'flex'}`}>
        {/* Header */}
        <div className="px-4 pt-4 pb-3 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-lg font-bold text-gray-900">Inbox</h1>
            <div className="flex items-center gap-2">
              {unreadTotal > 0 && (
                <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {unreadTotal} new
                </span>
              )}
              <button
                onClick={fetchConversations}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
              >
                <RefreshCw size={15} />
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="relative mb-3">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={filters.search}
              onChange={e => handleSearch(e.target.value)}
              placeholder="Search conversations…"
              className="w-full pl-8 pr-3 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
            />
          </div>

          {/* Platform tabs */}
          <div className="flex gap-1 overflow-x-auto pb-0.5 scrollbar-none">
            {PLATFORMS.map(p => {
              const P    = PLATFORM[p];
              const Icon = P?.icon;
              return (
                <button
                  key={p || 'all'}
                  onClick={() => setFilter('platform', p)}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    activePlatform === p
                      ? 'bg-brand-50 text-brand-600 border border-brand-200'
                      : 'text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  {Icon ? <span className={P?.color}><Icon size={12} /></span> : null}
                  {p ? P?.label : 'All'}
                </button>
              );
            })}
          </div>
        </div>

        {/* Status filter */}
        <div className="flex px-2 py-2 gap-1 flex-shrink-0 border-b border-gray-50">
          {[['', 'Active'], ['resolved', 'Resolved'], ['snoozed', 'Snoozed']].map(([val, lbl]) => (
            <button
              key={val}
              onClick={() => setFilter('status', val)}
              className={`flex-1 py-1 text-xs rounded-lg font-medium transition-colors ${
                filters.status === val
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              {lbl}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loadingConvs ? (
            <div className="flex justify-center pt-12">
              <div className="w-6 h-6 border-2 border-brand-300 border-t-brand-600 rounded-full animate-spin" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-16 px-4">
              <p className="text-gray-400 text-sm">No conversations</p>
              <p className="text-gray-300 text-xs mt-1">Messages from connected accounts will appear here</p>
            </div>
          ) : (
            conversations.map(conv => (
              <ConversationItem
                key={conv._id}
                conv={conv}
                active={activeConversation?._id === conv._id}
                onClick={() => handleSelectConv(conv._id)}
              />
            ))
          )}
        </div>

        {total > conversations.length && (
          <div className="p-3 border-t border-gray-50 text-center">
            <p className="text-xs text-gray-400">{conversations.length} of {total}</p>
          </div>
        )}
      </div>

      {/* ── Chat view ── */}
      <div className={`flex-1 min-w-0 flex flex-col ${mobileView === 'list' ? 'hidden lg:flex' : 'flex'}`}>
        {activeConversation ? (
          <ChatPanel
            key={activeConversation._id}
            conv={activeConversation}
            onBack={() => setMobileView('list')}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-8 bg-gray-50">
            <div className="w-16 h-16 bg-brand-50 rounded-2xl flex items-center justify-center mb-4">
              <span className="text-3xl">💬</span>
            </div>
            <h3 className="font-semibold text-gray-700 mb-1">Select a conversation</h3>
            <p className="text-sm text-gray-400">Choose from the list to start chatting</p>
          </div>
        )}
      </div>
    </div>
  );
}
