import { useEffect, useState, useCallback, useRef } from 'react';
import { ChefHat, Package, LogOut, RotateCcw, MapPin, Phone, KeyRound, Clock, Calendar, X, ChevronLeft, ChevronRight, ZoomIn } from 'lucide-react';
import api from '../lib/api';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';
import StatusBadge from '../components/StatusBadge';
import useAuthStore from '../store/authStore';

const STATUSES = ['New', 'Confirmed', 'In Production', 'Out for Delivery', 'Delivered', 'Cancelled'];

// ─── Step 1: Outlet Selection ─────────────────────────────────────────────────

function OutletSelect({ outlets, onSelect }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col items-center justify-center p-6">
      <div className="mb-8 text-center">
        <div className="text-4xl mb-2">🏪</div>
        <h1 className="text-2xl font-bold text-gray-800">Outlet Panel</h1>
        <p className="text-gray-500 text-sm mt-1">Select your outlet to continue</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-xl">
        {outlets.filter((o) => o.isActive).map((outlet) => (
          <button
            key={outlet._id}
            onClick={() => onSelect(outlet)}
            className="bg-white rounded-2xl shadow-sm border-2 border-gray-100 hover:border-brand-400 hover:shadow-md transition-all p-5 text-left group"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h2 className="font-bold text-gray-800 group-hover:text-brand-600 transition-colors">{outlet.name}</h2>
                <div className="flex items-center gap-1 text-sm text-gray-400 mt-0.5">
                  <MapPin size={12} />
                  <span>{outlet.city}</span>
                  {outlet.phone && <><span>·</span><Phone size={12} /><span>{outlet.phone}</span></>}
                </div>
              </div>
              {outlet.hasPin
                ? <KeyRound size={16} className="text-purple-400 mt-1" />
                : <span className="text-xs text-gray-300">No PIN</span>}
            </div>
            <div className="flex gap-2">
              <span className="flex items-center gap-1 text-xs bg-orange-50 text-orange-600 px-2 py-1 rounded-lg">
                <ChefHat size={11} /> {outlet.kitchen?.label || 'Kitchen'}
              </span>
              <span className="flex items-center gap-1 text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-lg">
                <Package size={11} /> {outlet.prepArea?.label || 'Prep Area'}
              </span>
            </div>
          </button>
        ))}

        {outlets.filter((o) => o.isActive).length === 0 && (
          <div className="col-span-2 text-center text-gray-400 py-12">
            No active outlets found. Add outlets in Settings.
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Step 2: PIN Entry ────────────────────────────────────────────────────────

const MAX_ATTEMPTS = 5;
const LOCKOUT_SECS = 60;

function OutletPinEntry({ outlet, onSuccess, onBack }) {
  const [pin, setPin]             = useState('');
  const [shake, setShake]         = useState(false);
  const [error, setError]         = useState('');
  const [attempts, setAttempts]   = useState(0);
  const [lockedUntil, setLockedUntil] = useState(null);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (!lockedUntil) return;
    const iv = setInterval(() => {
      const rem = Math.ceil((lockedUntil - Date.now()) / 1000);
      if (rem <= 0) { setLockedUntil(null); setCountdown(0); setAttempts(0); setError(''); }
      else setCountdown(rem);
    }, 500);
    return () => clearInterval(iv);
  }, [lockedUntil]);

  // Outlet has no PIN — skip straight through
  useEffect(() => {
    if (!outlet.hasPin) onSuccess(outlet);
  }, []);

  const submit = useCallback(async (currentPin) => {
    if (lockedUntil) return;
    try {
      const { data } = await api.post(`/outlets/${outlet._id}/verify-pin`, { pin: currentPin });
      if (data.success) {
        onSuccess(outlet);
      } else {
        const next = attempts + 1;
        setAttempts(next);
        if (next >= MAX_ATTEMPTS) {
          setLockedUntil(Date.now() + LOCKOUT_SECS * 1000);
          setError(`Too many attempts. Locked for ${LOCKOUT_SECS}s.`);
        } else {
          setError(`Wrong PIN (${MAX_ATTEMPTS - next} tries left)`);
        }
        setShake(true);
        setPin('');
        setTimeout(() => setShake(false), 400);
      }
    } catch {
      setError('Server error. Try again.');
      setPin('');
    }
  }, [outlet, attempts, lockedUntil, onSuccess]);

  function press(d) {
    if (lockedUntil || pin.length >= 6) return;
    const next = pin + d;
    setPin(next);
    setError('');
    if (next.length === 6) submit(next);
  }

  const isLocked = !!lockedUntil;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col items-center justify-center p-6">
      <button onClick={onBack} className="absolute top-6 left-6 flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
        <RotateCcw size={14} /> Change outlet
      </button>

      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-brand-50 flex items-center justify-center mx-auto mb-3">
            <KeyRound size={26} className="text-brand-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-800">{outlet.name}</h2>
          <p className="text-sm text-gray-400 mt-1">{outlet.city} · Enter outlet PIN</p>
        </div>

        <div className={`flex justify-center gap-3 mb-5 ${shake ? 'animate-shake' : ''}`}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={`w-3.5 h-3.5 rounded-full border-2 transition-colors ${i < pin.length ? 'bg-brand-500 border-brand-500' : 'border-gray-300'}`} />
          ))}
        </div>

        {(error || isLocked) && (
          <p className="text-center text-red-500 text-sm mb-4">
            {isLocked ? `Locked — ${countdown}s remaining` : error}
          </p>
        )}

        <div className="grid grid-cols-3 gap-2.5 mb-3">
          {[1,2,3,4,5,6,7,8,9].map((d) => (
            <button key={d} onClick={() => press(String(d))} disabled={isLocked}
              className="h-13 py-3.5 rounded-xl border border-gray-200 text-lg font-semibold text-gray-800 hover:bg-brand-50 active:bg-brand-100 transition-colors disabled:opacity-40">
              {d}
            </button>
          ))}
          <div />
          <button onClick={() => press('0')} disabled={isLocked}
            className="h-13 py-3.5 rounded-xl border border-gray-200 text-lg font-semibold text-gray-800 hover:bg-brand-50 transition-colors disabled:opacity-40">
            0
          </button>
          <button onClick={() => setPin((p) => p.slice(0, -1))} disabled={isLocked}
            className="h-13 py-3.5 rounded-xl border border-gray-200 text-lg text-gray-400 hover:bg-gray-50 transition-colors disabled:opacity-40">
            ⌫
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Step 3: Order Board ──────────────────────────────────────────────────────

function StatusDropdown({ orderId, current, onChange }) {
  const [open, setOpen] = useState(false);

  async function pick(s) {
    setOpen(false);
    await onChange(orderId, s);
  }

  return (
    <div className="relative">
      <button onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-xs font-medium border border-gray-200 rounded-lg px-2.5 py-1.5 hover:bg-gray-50">
        <StatusBadge status={current} />
        <span className="text-gray-400">▼</span>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-white border border-gray-100 rounded-xl shadow-lg z-20 w-48 py-1">
          {STATUSES.map((s) => (
            <button key={s} onClick={() => pick(s)}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 ${s === current ? 'font-semibold' : ''}`}>
              <StatusBadge status={s} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Lightbox ─────────────────────────────────────────────────────────────────

function Lightbox({ images, startIndex, onClose }) {
  const [idx, setIdx] = useState(startIndex);

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape')      onClose();
      if (e.key === 'ArrowRight')  setIdx((i) => (i + 1) % images.length);
      if (e.key === 'ArrowLeft')   setIdx((i) => (i - 1 + images.length) % images.length);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [images.length, onClose]);

  const prev = () => setIdx((i) => (i - 1 + images.length) % images.length);
  const next = () => setIdx((i) => (i + 1) % images.length);

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center">
      {/* Close — always on top, outside stopPropagation zone */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 text-white/80 hover:text-white bg-white/10 hover:bg-white/25 rounded-full p-2.5 transition-colors"
      >
        <X size={22} />
      </button>

      {/* Counter */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 text-white/60 text-sm pointer-events-none">
        {idx + 1} / {images.length}
      </div>

      {/* Backdrop click to close */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Image */}
      <div className="relative flex items-center justify-center w-full h-full px-16 z-[1]" onClick={(e) => e.stopPropagation()}>
        <img
          src={images[idx]}
          alt=""
          className="max-h-[85vh] max-w-full object-contain rounded-xl shadow-2xl"
        />
      </div>

      {/* Prev / Next */}
      {images.length > 1 && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); prev(); }}
            className="absolute left-3 top-1/2 -translate-y-1/2 z-[2] bg-white/10 hover:bg-white/20 text-white rounded-full p-3 transition-colors"
          >
            <ChevronLeft size={24} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); next(); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 z-[2] bg-white/10 hover:bg-white/20 text-white rounded-full p-3 transition-colors"
          >
            <ChevronRight size={24} />
          </button>
        </>
      )}

      {/* Thumbnails strip */}
      {images.length > 1 && (
        <div className="absolute bottom-4 z-[2] flex gap-2 px-4" onClick={(e) => e.stopPropagation()}>
          {images.map((url, i) => (
            <button key={i} onClick={() => setIdx(i)}>
              <img
                src={url}
                alt=""
                className={`w-12 h-12 object-cover rounded-lg border-2 transition-all ${i === idx ? 'border-white scale-110' : 'border-white/30 opacity-60'}`}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Item status helpers ───────────────────────────────────────────────────────

const ITEM_STATUS_STYLES = {
  Pending:   { card: 'border-gray-200 bg-gray-50',      badge: 'bg-gray-100 text-gray-500 border-gray-300' },
  Preparing: { card: 'border-yellow-200 bg-yellow-50',  badge: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
  Prepared:  { card: 'border-green-300 bg-green-50',    badge: 'bg-green-100 text-green-700 border-green-300' },
};
const ITEM_STATUS_NEXT = { Pending: 'Preparing', Preparing: 'Prepared', Prepared: 'Pending' };
const ITEM_STATUS_ICON = { Pending: '○', Preparing: '◑', Prepared: '●' };

// ─── Completed Photo Modal ─────────────────────────────────────────────────────

function CompletedPhotoModal({ item, orderId, onSuccess, onCancel }) {
  const [file, setFile]         = useState(null);
  const [preview, setPreview]   = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef  = useRef(null);
  const cameraInputRef = useRef(null);

  function handleFile(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  async function handleSubmit() {
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append('image', file);
      const { data: up } = await api.post('/upload/image', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const url = up.url;
      const { data } = await api.post(`/orders/${orderId}/items/${item._id}/complete-image`, { url });
      if (data.success) onSuccess(data.order);
      else toast.error(data.message || 'Failed');
    } catch {
      toast.error('Upload failed. Try again.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black/70 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h3 className="font-bold text-gray-800">Photo Required</h3>
            <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[220px]">{item.name}</p>
          </div>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 p-1">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Preview */}
          {preview ? (
            <div className="relative">
              <img src={preview} alt="preview" className="w-full h-56 object-cover rounded-xl border-2 border-green-300" />
              <button
                onClick={() => { setFile(null); setPreview(null); }}
                className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1.5 hover:bg-black/70"
              >
                <X size={14} />
              </button>
              <div className="absolute bottom-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full font-semibold">
                ✓ Photo selected
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Camera capture — opens rear camera on mobile */}
              <button
                onClick={() => cameraInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-3 bg-brand-500 text-white rounded-xl py-4 font-semibold text-sm active:scale-95 transition-transform"
              >
                <span className="text-xl">📸</span> Take Photo
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-3 bg-gray-100 text-gray-700 rounded-xl py-3 font-medium text-sm hover:bg-gray-200 transition-colors"
              >
                <span className="text-lg">🖼️</span> Choose from Gallery
              </button>
              <p className="text-xs text-gray-400 text-center">
                A photo of the completed product is required before marking as Prepared.
              </p>
            </div>
          )}

          {/* Hidden inputs */}
          <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />
          <input ref={fileInputRef}   type="file" accept="image/*" className="hidden" onChange={handleFile} />

          {/* Actions */}
          <div className="flex gap-3">
            <button onClick={onCancel} className="flex-1 btn-secondary">Cancel</button>
            <button
              onClick={handleSubmit}
              disabled={!file || uploading}
              className="flex-1 btn-primary disabled:opacity-40"
            >
              {uploading ? 'Uploading…' : 'Mark Prepared ✓'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ItemStatusButton({ item, orderId, onUpdate, onMarkPrepared }) {
  const [busy, setBusy] = useState(false);
  const current = item.itemStatus || 'Pending';
  const next    = ITEM_STATUS_NEXT[current];

  async function handleClick() {
    if (next === 'Prepared') {
      // Intercept — show photo modal instead
      onMarkPrepared(item);
      return;
    }
    setBusy(true);
    await onUpdate(item._id, next);
    setBusy(false);
  }

  return (
    <button
      onClick={handleClick}
      disabled={busy}
      className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border-2 transition-all active:scale-95 ${ITEM_STATUS_STYLES[current].badge}`}
    >
      <span className="text-base leading-none">{ITEM_STATUS_ICON[current]}</span>
      {current}
    </button>
  );
}

// ─── Image gallery strip ───────────────────────────────────────────────────────

function ImageStrip({ images, label, labelClass = 'text-gray-400', thumbBorder = 'border-white' }) {
  const [lightbox, setLightbox] = useState(null);
  if (!images?.length) return null;
  return (
    <>
      <div>
        <p className={`text-xs font-semibold uppercase tracking-wide mb-2 ${labelClass}`}>{label}</p>
        <div className="flex gap-2 flex-wrap">
          {images.map((url, i) => (
            <button
              key={i}
              onClick={() => setLightbox(i)}
              className={`relative group w-20 h-20 rounded-xl overflow-hidden border-2 ${thumbBorder} shadow-md hover:shadow-lg hover:scale-105 transition-all`}
            >
              <img src={url} alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                <ZoomIn size={18} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </button>
          ))}
        </div>
      </div>
      {lightbox !== null && (
        <Lightbox images={images} startIndex={lightbox} onClose={() => setLightbox(null)} />
      )}
    </>
  );
}

// ─── Full item detail block ────────────────────────────────────────────────────

function ItemBlock({ item, onItemStatusChange, onMarkPrepared, orderId }) {
  const current = item.itemStatus || 'Pending';
  const styles  = ITEM_STATUS_STYLES[current];

  // Collect all product-specific detail pairs
  const details = [
    item.category    && ['Category',     item.category],
    item.flavor      && ['Flavor',        item.flavor],
    item.size        && ['Size / Weight', item.size],
    item.shape       && ['Shape',         item.shape],
    item.layers      && ['Layers',        item.layers],
    item.theme       && ['Theme / Color', item.theme],
    item.arrangement && ['Arrangement',   item.arrangement],
    item.flowerType  && ['Flower Type',   item.flowerType],
    item.stems       && ['Stems',         item.stems],
    item.color       && ['Color',         item.color],
    item.includesVase && ['Includes Vase', item.includesVase],
    item.giftType    && ['Gift Type',     item.giftType],
    item.wrapping    && ['Wrapping',      item.wrapping],
    item.plantType   && ['Plant Type',    item.plantType],
    item.potSize     && ['Pot Size',      item.potSize],
    item.potType     && ['Pot Type',      item.potType],
    item.brand       && ['Brand',         item.brand],
    item.boxType     && ['Packaging',     item.boxType],
    item.quantity    && ['Quantity',      item.quantity],
  ].filter(Boolean);

  return (
    <div className={`rounded-xl border-2 overflow-hidden transition-all ${styles.card}`}>
      {/* Item header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/60">
        <div>
          <span className="font-bold text-gray-800">{item.name}</span>
          <span className="ml-2 text-xs text-gray-500">NPR {item.price?.toLocaleString('en-IN')}</span>
        </div>
        <ItemStatusButton
          item={item}
          orderId={orderId}
          onUpdate={(itemId, s) => onItemStatusChange(orderId, itemId, s)}
          onMarkPrepared={onMarkPrepared}
        />
      </div>

      <div className="p-4 space-y-3">
        {/* Details grid */}
        {details.length > 0 && (
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
            {details.map(([label, value]) => (
              <div key={label}>
                <span className="text-xs text-gray-400">{label}</span>
                <p className="text-sm font-medium text-gray-700">{value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Highlighted messages */}
        {item.cakeMessage && (
          <div className="flex items-start gap-2 bg-pink-50 border border-pink-200 rounded-lg px-3 py-2">
            <span className="text-base">✏️</span>
            <div>
              <p className="text-xs text-pink-400 font-semibold">Message on Cake</p>
              <p className="text-sm font-bold text-pink-700">"{item.cakeMessage}"</p>
            </div>
          </div>
        )}
        {item.giftMessage && (
          <div className="flex items-start gap-2 bg-purple-50 border border-purple-200 rounded-lg px-3 py-2">
            <span className="text-base">💌</span>
            <div>
              <p className="text-xs text-purple-400 font-semibold">Personalization</p>
              <p className="text-sm font-bold text-purple-700">"{item.giftMessage}"</p>
            </div>
          </div>
        )}
        {item.specialNote && (
          <div className="flex items-start gap-2 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">
            <span className="text-base">⚠️</span>
            <div>
              <p className="text-xs text-orange-400 font-semibold">Special Note</p>
              <p className="text-sm text-orange-700">{item.specialNote}</p>
            </div>
          </div>
        )}

        {/* Reference images */}
        <ImageStrip
          images={item.referenceImages}
          label="Reference Images"
          labelClass="text-gray-400"
          thumbBorder="border-white"
        />

        {/* Completed product photos */}
        {item.completedImages?.length > 0 && (
          <div className="border-t border-green-200 pt-3">
            <ImageStrip
              images={item.completedImages}
              label="✓ Completed Product"
              labelClass="text-green-600"
              thumbBorder="border-green-300"
            />
          </div>
        )}

        {/* Prompt if Prepared but no photo yet (shouldn't happen, but safety net) */}
        {current === 'Prepared' && !item.completedImages?.length && (
          <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2">
            <span>⚠️</span>
            <p className="text-xs text-yellow-700">No completion photo attached.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Order Card ────────────────────────────────────────────────────────────────

function OrderCard({ order: initialOrder, areaFilter, onOrderUpdate }) {
  const [order, setOrder] = useState(initialOrder);
  const [photoTarget, setPhotoTarget] = useState(null); // item waiting for photo

  // Keep in sync when parent refreshes orders
  useEffect(() => { setOrder(initialOrder); }, [initialOrder]);

  const items = areaFilter === 'kitchen'
    ? order.items.filter((i) => i.category === 'Cake')
    : order.items.filter((i) => i.category !== 'Cake');

  if (items.length === 0) return null;

  const isToday     = dayjs(order.delivery.date).isSame(dayjs(), 'day');
  const isPast      = dayjs(order.delivery.date).isBefore(dayjs(), 'day');
  const allPrepared = items.every((i) => i.itemStatus === 'Prepared');

  const headerBg = allPrepared
    ? 'bg-green-50 border-green-200'
    : isPast && !['Delivered','Cancelled'].includes(order.status)
      ? 'bg-red-50 border-red-200'
      : isToday ? 'bg-yellow-50 border-yellow-200' : 'bg-gray-50 border-gray-200';

  const cardBorder = allPrepared
    ? 'border-green-300'
    : isPast && !['Delivered','Cancelled'].includes(order.status)
      ? 'border-red-300'
      : isToday ? 'border-yellow-300' : 'border-gray-200';

  async function handleItemStatusChange(orderId, itemId, itemStatus) {
    try {
      const { data } = await api.patch(`/orders/${orderId}/items/${itemId}/status`, { itemStatus });
      if (data.success) { setOrder(data.order); onOrderUpdate(data.order); }
    } catch {}
  }

  function handlePhotoSuccess(updatedOrder) {
    setOrder(updatedOrder);
    onOrderUpdate(updatedOrder);
    setPhotoTarget(null);
    toast.success('Marked as Prepared ✓');
  }

  return (
    <>
      <div className={`bg-white rounded-2xl border-2 overflow-hidden shadow-sm ${cardBorder}`}>

        {/* ── Header ── */}
        <div className={`flex justify-between items-start px-4 py-3 border-b gap-3 ${headerBg}`}>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-brand-600 text-base">{order.orderNumber}</span>
            <StatusBadge status={order.status} />
            {allPrepared && (
              <span className="text-xs text-green-700 font-semibold bg-green-100 px-2 py-0.5 rounded-full">✓ All Ready</span>
            )}
            {isPast && !['Delivered','Cancelled'].includes(order.status) && !allPrepared && (
              <span className="text-xs text-red-600 font-bold bg-red-100 px-2 py-0.5 rounded-full">OVERDUE</span>
            )}
          </div>
        </div>

        <div className="p-4 space-y-4">

          {/* ── Delivery Info ── */}
          <div className={`rounded-xl px-3 py-2.5 border ${
            isToday
              ? 'bg-yellow-50 border-yellow-200'
              : isPast && !['Delivered','Cancelled'].includes(order.status)
                ? 'bg-red-50 border-red-100'
                : 'bg-gray-50 border-gray-100'
          }`}>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <span className={`flex items-center gap-1 text-xs font-bold ${isToday ? 'text-yellow-700' : isPast ? 'text-red-500' : 'text-gray-600'}`}>
                <Calendar size={11} />
                {isToday ? '🔴 Today' : dayjs(order.delivery.date).format('ddd, DD MMM YYYY')}
              </span>
              {order.delivery?.slot && (
                <span className="flex items-center gap-1 text-xs text-gray-500 font-medium">
                  <Clock size={11} /> {order.delivery.slot}
                </span>
              )}
              {order.delivery?.partner && (
                <span className="text-xs text-blue-600 font-medium">🚚 {order.delivery.partner}</span>
              )}
            </div>
            {order.delivery?.notes && (
              <p className="text-xs text-orange-700 font-medium mt-1.5 flex gap-1">
                <span>📋</span> {order.delivery.notes}
              </p>
            )}
          </div>

          {/* ── Internal Note ── */}
          {order.note && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex gap-2">
              <span>📝</span>
              <p className="text-xs text-amber-800">{order.note}</p>
            </div>
          )}

          {/* ── Item Blocks ── */}
          <div className="space-y-3">
            {items.map((item) => (
              <ItemBlock
                key={item._id}
                item={item}
                orderId={order._id}
                onItemStatusChange={handleItemStatusChange}
                onMarkPrepared={(item) => setPhotoTarget(item)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Photo capture modal — rendered outside card so it overlays everything */}
      {photoTarget && (
        <CompletedPhotoModal
          item={photoTarget}
          orderId={order._id}
          onSuccess={handlePhotoSuccess}
          onCancel={() => setPhotoTarget(null)}
        />
      )}
    </>
  );
}

const DAY_TABS = [
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'today',     label: 'Today' },
  { key: 'tomorrow',  label: 'Tomorrow' },
];

function dayRange(key) {
  const d = key === 'yesterday' ? dayjs().subtract(1, 'day')
          : key === 'tomorrow'  ? dayjs().add(1, 'day')
          :                       dayjs();
  return {
    startDate: d.startOf('day').toISOString(),
    endDate:   d.endOf('day').toISOString(),
  };
}

function OrderBoard({ outlet, onLogout }) {
  const [orders, setOrders]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [dayTab, setDayTab]   = useState('today');
  const [tab, setTab]         = useState('kitchen'); // 'kitchen' | 'prep' | 'all'

  useEffect(() => {
    load();
    const iv = setInterval(load, 60_000);
    return () => clearInterval(iv);
  }, [outlet._id, dayTab]);

  async function load() {
    try {
      const { startDate, endDate } = dayRange(dayTab);
      const { data } = await api.get('/orders', {
        params: { outlet: outlet._id, limit: 200, startDate, endDate },
      });
      setOrders(data.orders.filter((o) => o.status !== 'Cancelled'));
    } catch {
      // silently retry on next interval
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange(orderId, status) {
    try {
      await api.patch(`/orders/${orderId}/status`, { status });
      setOrders((prev) => prev.map((o) => o._id === orderId ? { ...o, status } : o));
    } catch {}
  }

  function handleOrderUpdate(updatedOrder) {
    setOrders((prev) => prev.map((o) => o._id === updatedOrder._id ? updatedOrder : o));
  }

  // Orders that have cake items
  const kitchenOrders = orders.filter((o) => o.items.some((i) => i.category === 'Cake'));
  // Orders that have non-cake items
  const prepOrders    = orders.filter((o) => o.items.some((i) => i.category !== 'Cake'));

  const activeOrders  = orders.filter((o) => !['Delivered', 'Cancelled'].includes(o.status));

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="font-bold text-gray-800">{outlet.name}</h1>
            <p className="text-xs text-gray-400">{outlet.city} · Outlet Panel</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Summary pills */}
          <div className="hidden sm:flex gap-2">
            <span className={`text-xs px-3 py-1 rounded-full font-medium ${
              dayTab === 'yesterday' ? 'bg-gray-100 text-gray-600'
              : dayTab === 'tomorrow' ? 'bg-blue-50 text-blue-700'
              : 'bg-yellow-50 text-yellow-700'
            }`}>
              {orders.length} {dayTab === 'yesterday' ? 'yesterday' : dayTab === 'tomorrow' ? 'tomorrow' : 'today'}
            </span>
            <span className="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded-full font-medium">
              {activeOrders.length} active
            </span>
          </div>
          <button onClick={load} className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100">
            <RotateCcw size={16} />
          </button>
          <button onClick={onLogout}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors">
            <LogOut size={15} /> Exit
          </button>
        </div>
      </div>

      {/* Day tabs */}
      <div className="px-6 pt-4 flex gap-2 border-b border-gray-100 pb-0">
        {DAY_TABS.map(({ key, label }) => (
          <button key={key} onClick={() => { setDayTab(key); setLoading(true); }}
            className={`px-5 py-2.5 text-sm font-semibold border-b-2 transition-colors -mb-px ${
              dayTab === key
                ? key === 'yesterday' ? 'border-gray-500 text-gray-700'
                : key === 'tomorrow'  ? 'border-blue-500 text-blue-700'
                :                       'border-brand-500 text-brand-700'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}>
            {label}
            {key === 'today' && <span className="ml-1.5 text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full">
              {dayjs().format('DD MMM')}
            </span>}
          </button>
        ))}
      </div>

      {/* Area tabs */}
      <div className="px-6 pt-4 flex gap-2">
        {[
          { key: 'kitchen', icon: ChefHat,  label: outlet.kitchen?.label  || 'Kitchen',   count: kitchenOrders.length, color: 'orange' },
          { key: 'prep',    icon: Package,  label: outlet.prepArea?.label || 'Prep Area', count: prepOrders.length,    color: 'blue'   },
          { key: 'all',     icon: null,     label: 'All Orders',                           count: orders.length,        color: 'gray'   },
        ].map(({ key, icon: Icon, label, count, color }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-colors ${
              tab === key
                ? color === 'orange' ? 'bg-orange-100 text-orange-700'
                : color === 'blue'   ? 'bg-blue-100 text-blue-700'
                :                      'bg-gray-200 text-gray-700'
                : 'bg-white text-gray-500 hover:bg-gray-100 border border-gray-200'
            }`}>
            {Icon && <Icon size={15} />}
            {label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
              tab === key ? 'bg-white/60' : 'bg-gray-100'
            }`}>{count}</span>
          </button>
        ))}
      </div>

      {/* Board */}
      <div className="p-6">
        {loading ? (
          <div className="text-center py-20 text-gray-400">Loading orders...</div>
        ) : orders.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <Package size={36} className="mx-auto mb-3 opacity-30" />
            <p>No orders assigned to this outlet yet.</p>
          </div>
        ) : tab === 'all' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {orders.map((order) => (
              <div key={order._id} className="bg-white rounded-xl border-2 border-gray-100 p-4">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-bold text-brand-600 text-sm">{order.orderNumber}</span>
                  <StatusDropdown orderId={order._id} current={order.status} onChange={handleStatusChange} />
                </div>
                <p className="text-xs text-gray-500">{order.sender?.name} → {order.receiver?.name}, {order.receiver?.city}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {dayjs(order.delivery?.date).format('DD MMM')} · {order.delivery?.slot}
                </p>
                <div className="mt-2 pt-2 border-t border-gray-100 text-xs text-gray-600 space-y-0.5">
                  {order.items.map((item, i) => (
                    <div key={i} className="flex justify-between">
                      <span>{item.name}</span>
                      <span className="text-gray-400">{item.category}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {(tab === 'kitchen' ? kitchenOrders : prepOrders).map((order) => (
              <OrderCard
                key={order._id}
                order={order}
                areaFilter={tab === 'kitchen' ? 'kitchen' : 'prep'}
                onOrderUpdate={handleOrderUpdate}
              />
            ))}
            {(tab === 'kitchen' ? kitchenOrders : prepOrders).length === 0 && (
              <div className="col-span-3 text-center py-16 text-gray-400">
                No {tab === 'kitchen' ? 'cake' : 'non-cake'} items in assigned orders.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Root: state machine ──────────────────────────────────────────────────────

export default function OutletPanel() {
  const { user } = useAuthStore();
  const [allOutlets, setAllOutlets]     = useState([]);
  const [loadingOutlets, setLoading]    = useState(true);
  const [step, setStep]                 = useState('select');
  const [selectedOutlet, setSelected]   = useState(null);

  useEffect(() => {
    api.get('/outlets').then(({ data }) => {
      setAllOutlets(data.outlets);
      setLoading(false);
    });
  }, []);

  // Super admins see all active outlets; staff only see their assigned outlets
  const outlets = allOutlets.filter((o) => {
    if (!o.isActive) return false;
    if (user?.role === 'super_admin') return true;
    return user?.assignedOutlets?.some((a) => (a._id || a) === o._id);
  });

  function handleSelectOutlet(outlet) {
    setSelected(outlet);
    setStep(outlet.hasPin ? 'pin' : 'board');
  }

  if (loadingOutlets) {
    return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading outlets…</div>;
  }

  if (step === 'select') {
    return <OutletSelect outlets={outlets} onSelect={handleSelectOutlet} />;
  }

  if (step === 'pin') {
    return (
      <OutletPinEntry
        outlet={selectedOutlet}
        onSuccess={() => setStep('board')}
        onBack={() => setStep('select')}
      />
    );
  }

  return (
    <OrderBoard
      outlet={selectedOutlet}
      onLogout={() => { setStep('select'); setSelected(null); }}
    />
  );
}
