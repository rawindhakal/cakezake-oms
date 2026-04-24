import { useEffect, useState, useRef } from 'react';
import { Trash2, CheckCircle, AlertCircle, Wifi, WifiOff, Eye, EyeOff, Save, Settings2, ChevronDown, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';

// ── Platform definitions ──────────────────────────────────────────────────────

const PLATFORMS = {
  facebook: {
    label: 'Facebook',
    desc:  'Messenger — receive & reply to Facebook Page messages',
    color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200',
    badge: 'bg-blue-100 text-blue-700',
    Icon:  () => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    ),
  },
  instagram: {
    label: 'Instagram',
    desc:  'Direct Messages — receive & reply to Instagram DMs',
    color: 'text-pink-600', bg: 'bg-pink-50', border: 'border-pink-200',
    badge: 'bg-pink-100 text-pink-700',
    Icon:  () => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
      </svg>
    ),
  },
  whatsapp: {
    label: 'WhatsApp',
    desc:  'Business Cloud API — receive & reply to WhatsApp messages',
    color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200',
    badge: 'bg-green-100 text-green-700',
    Icon:  () => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
      </svg>
    ),
  },
  tiktok: {
    label: 'TikTok',
    desc:  'Comment management (DM API requires partner approval)',
    color: 'text-gray-700', bg: 'bg-gray-50', border: 'border-gray-200',
    badge: 'bg-gray-100 text-gray-700',
    Icon:  () => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.84 1.57V6.79a4.85 4.85 0 01-1.07-.1z"/>
      </svg>
    ),
  },
};

// ── API Config Section ────────────────────────────────────────────────────────

const CONFIG_KEYS = [
  { key: 'SERVER_URL',                label: 'Server URL',           platform: 'general', secret: false },
  { key: 'META_APP_ID',               label: 'Meta App ID',          platform: 'meta',    secret: false },
  { key: 'META_APP_SECRET',           label: 'Meta App Secret',      platform: 'meta',    secret: true  },
  { key: 'META_WEBHOOK_VERIFY_TOKEN', label: 'Webhook Verify Token', platform: 'meta',    secret: true  },
  { key: 'TIKTOK_CLIENT_KEY',         label: 'TikTok Client Key',    platform: 'tiktok',  secret: false },
  { key: 'TIKTOK_CLIENT_SECRET',      label: 'TikTok Client Secret', platform: 'tiktok',  secret: true  },
];

function ApiConfigSection({ onAppIdLoaded }) {
  const [config, setConfig]   = useState([]);
  const [edits, setEdits]     = useState({});
  const [show, setShow]       = useState({});
  const [saving, setSaving]   = useState(false);
  const [editing, setEditing] = useState(false);
  const [open, setOpen]       = useState(false);

  useEffect(() => {
    api.get('/social/config').then(r => {
      const cfg = r.data.config || [];
      setConfig(cfg);
      const appId = cfg.find(c => c.key === 'META_APP_ID');
      if (appId?.isSet && appId.source === 'db') onAppIdLoaded?.(null); // masked, real value in backend
      else onAppIdLoaded?.(appId?.value || '');
    }).catch(() => {});
  }, []);

  async function handleSave() {
    setSaving(true);
    const updates = Object.entries(edits).map(([key, value]) => ({ key, value }));
    try {
      await api.put('/social/config', { updates });
      toast.success('Configuration saved — reconnect accounts to apply');
      const r = await api.get('/social/config');
      setConfig(r.data.config || []);
      setEdits({});
      setEditing(false);
    } catch {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  }

  const unsetCount = config.filter(c => !c.isSet && ['META_APP_ID','META_APP_SECRET'].includes(c.key)).length;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-6">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Settings2 size={16} className="text-gray-500" />
          <span className="font-semibold text-gray-800 text-sm">API Configuration</span>
          {unsetCount > 0 && (
            <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">
              {unsetCount} not set
            </span>
          )}
          {unsetCount === 0 && config.length > 0 && (
            <span className="text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded-full font-medium">configured</span>
          )}
        </div>
        <ChevronDown size={16} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="border-t border-gray-100">
          <div className="px-5 py-4 space-y-3">
            {['general','meta','tiktok'].map(group => {
              const items = CONFIG_KEYS.filter(c => c.platform === group);
              return (
                <div key={group}>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 mt-2 first:mt-0">
                    {group === 'general' ? 'General' : group === 'meta' ? 'Meta (Facebook · Instagram · WhatsApp)' : 'TikTok'}
                  </p>
                  <div className="space-y-2">
                    {items.map(cfg => {
                      const cur  = config.find(c => c.key === cfg.key);
                      const val  = edits[cfg.key] !== undefined ? edits[cfg.key] : (cur?.isSet ? cur.value : '');
                      return (
                        <div key={cfg.key} className="flex items-center gap-3">
                          <label className="text-xs text-gray-500 w-40 flex-shrink-0">{cfg.label}</label>
                          <div className="flex-1 relative">
                            <input
                              type={cfg.secret && !show[cfg.key] ? 'password' : 'text'}
                              value={val}
                              onChange={e => setEdits(d => ({ ...d, [cfg.key]: e.target.value }))}
                              disabled={!editing}
                              placeholder={cur?.isSet ? '(saved)' : 'Not set'}
                              className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs pr-8 disabled:bg-gray-50 disabled:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-300"
                            />
                            {cfg.secret && (
                              <button type="button" onClick={() => setShow(s => ({ ...s, [cfg.key]: !s[cfg.key] }))}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                {show[cfg.key] ? <EyeOff size={12} /> : <Eye size={12} />}
                              </button>
                            )}
                          </div>
                          <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${
                            cur?.isSet ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'
                          }`}>
                            {cur?.isSet ? (cur.source === 'db' ? 'DB' : '.env') : '—'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="px-5 py-3 border-t border-gray-50 flex items-center gap-2">
            {editing ? (
              <>
                <button onClick={handleSave} disabled={saving || !Object.keys(edits).length}
                  className="flex items-center gap-1.5 text-xs bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg transition-colors">
                  <Save size={12} /> {saving ? 'Saving…' : 'Save'}
                </button>
                <button onClick={() => { setEditing(false); setEdits({}); }}
                  className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                  Cancel
                </button>
              </>
            ) : (
              <button onClick={() => setEditing(true)}
                className="text-xs text-brand-600 hover:text-brand-700 font-medium px-3 py-1.5 rounded-lg hover:bg-brand-50 transition-colors">
                Edit configuration
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── WhatsApp manual connect modal ─────────────────────────────────────────────

function WhatsAppModal({ outlet, onClose, onConnected }) {
  const [form, setForm]   = useState({ label: '', pageId: '', accessToken: '' });
  const [saving, setSaving] = useState(false);

  async function handleSave(e) {
    e.preventDefault();
    if (!form.label || !form.pageId || !form.accessToken) return toast.error('All fields required');
    setSaving(true);
    try {
      await api.post('/social/accounts', { outlet, platform: 'whatsapp', ...form });
      toast.success('WhatsApp account connected');
      onConnected();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to connect');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-5 border-b border-gray-100">
          <div className="flex items-center gap-3 mb-1">
            <span className="text-green-600">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
            </span>
            <h3 className="font-semibold text-gray-800">Connect WhatsApp Business</h3>
          </div>
          <p className="text-xs text-gray-500 ml-8">Get these from your Meta App → WhatsApp → API Setup</p>
        </div>
        <form onSubmit={handleSave} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Display Label</label>
            <input value={form.label} onChange={e => setForm(f=>({...f,label:e.target.value}))} placeholder="e.g. Birtamode WhatsApp" required
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Phone Number ID</label>
            <input value={form.pageId} onChange={e => setForm(f=>({...f,pageId:e.target.value}))} placeholder="From Meta App → WhatsApp → API Setup" required
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300" />
            <p className="text-xs text-gray-400 mt-1">This is the numeric ID, not the phone number itself.</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Permanent Access Token</label>
            <input type="password" value={form.accessToken} onChange={e => setForm(f=>({...f,accessToken:e.target.value}))} placeholder="System User permanent token" required
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300" />
            <p className="text-xs text-gray-400 mt-1">Meta App → Business Settings → System Users → Generate Token</p>
          </div>
          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={saving}
              className="flex-1 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white text-sm font-medium py-2.5 rounded-xl transition-colors">
              {saving ? 'Connecting…' : 'Connect'}
            </button>
            <button type="button" onClick={onClose}
              className="px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Platform card ─────────────────────────────────────────────────────────────

function PlatformCard({ platform, accounts, outlet, onConnect, onDisconnect, connecting }) {
  const meta = PLATFORMS[platform];
  const { Icon } = meta;
  const connected = accounts.filter(a => a.platform === platform);

  return (
    <div className={`rounded-2xl border ${connected.length ? 'border-gray-200' : 'border-gray-100'} bg-white overflow-hidden`}>
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className={`w-11 h-11 rounded-xl ${meta.bg} ${meta.border} border flex items-center justify-center ${meta.color}`}>
            <Icon />
          </div>
          {connected.length > 0 && (
            <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full font-medium">
              <CheckCircle size={11} /> {connected.length} connected
            </span>
          )}
        </div>
        <h3 className="font-semibold text-gray-800 mb-0.5">{meta.label}</h3>
        <p className="text-xs text-gray-500 leading-relaxed mb-4">{meta.desc}</p>

        {/* Connected accounts list */}
        {connected.length > 0 && (
          <div className="space-y-1.5 mb-3">
            {connected.map(acc => (
              <div key={acc._id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-gray-700 truncate">{acc.label}</p>
                  <p className="text-xs text-gray-400 truncate">ID: {acc.pageId}</p>
                </div>
                <button onClick={() => onDisconnect(acc._id)}
                  className="flex-shrink-0 ml-2 p-1 text-gray-300 hover:text-red-400 rounded transition-colors">
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Connect button */}
        {platform === 'tiktok' ? (
          <div className="text-xs text-gray-400 bg-gray-50 rounded-xl px-3 py-2.5 text-center">
            Coming soon — requires TikTok Business API approval
          </div>
        ) : platform === 'whatsapp' ? (
          <button onClick={() => onConnect(platform, outlet)}
            className="w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white text-sm font-medium py-2.5 rounded-xl transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            {connected.length ? 'Add Another Number' : 'Connect WhatsApp'}
          </button>
        ) : (
          <button onClick={() => onConnect(platform, outlet)} disabled={connecting}
            className={`w-full flex items-center justify-center gap-2 text-sm font-medium py-2.5 rounded-xl transition-colors disabled:opacity-60 ${
              platform === 'facebook'
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white'
            }`}
          >
            {connecting === platform
              ? <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Connecting…</>
              : <>{connected.length ? <RefreshCw size={14} /> : null} {connected.length ? 'Reconnect' : `Connect ${meta.label}`}</>
            }
          </button>
        )}

        {(platform === 'facebook' || platform === 'instagram') && !connecting && (
          <p className="text-xs text-gray-400 text-center mt-2">
            A popup will appear — log in and select your pages
          </p>
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Connections() {
  const [outlets, setOutlets]       = useState([]);
  const [accounts, setAccounts]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [selectedOutlet, setSelectedOutlet] = useState('');
  const [connecting, setConnecting] = useState(null);
  const [waModal, setWaModal]       = useState(false);
  const [deleting, setDeleting]     = useState(null);
  const sdkReady                    = useRef(false);
  const appIdRef                    = useRef('');

  useEffect(() => {
    Promise.all([api.get('/outlets'), api.get('/social/accounts')])
      .then(([oRes, aRes]) => {
        const outs = oRes.data.outlets || [];
        setOutlets(outs);
        setAccounts(aRes.data.accounts || []);
        if (outs.length) setSelectedOutlet(outs[0]._id);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Load Facebook JS SDK
  function loadFbSdk(appId) {
    if (!appId || sdkReady.current) return;
    window.fbAsyncInit = function () {
      window.FB.init({ appId, version: 'v19.0', cookie: true, xfbml: false });
      sdkReady.current = true;
    };
    if (!document.getElementById('fb-sdk')) {
      const s = document.createElement('script');
      s.id    = 'fb-sdk';
      s.src   = 'https://connect.facebook.net/en_US/sdk.js';
      s.async = true;
      document.body.appendChild(s);
    }
  }

  // Called by ApiConfigSection when it loads the app ID
  function handleAppIdLoaded(maskedOrEmpty) {
    // We don't have the real app ID from masked value.
    // Fetch it by trying a real config endpoint that returns the plain value for SDK init.
    api.get('/social/config/app-id').then(r => {
      if (r.data.appId) {
        appIdRef.current = r.data.appId;
        loadFbSdk(r.data.appId);
      }
    }).catch(() => {});
  }

  function handleConnect(platform, outletId) {
    if (!outletId) return toast.error('Select an outlet first');
    if (platform === 'whatsapp') { setWaModal(true); return; }

    if (!appIdRef.current) {
      toast.error('Meta App ID not configured — open API Configuration above and add it first');
      return;
    }

    if (!sdkReady.current) {
      toast.error('Facebook SDK still loading, try again in a moment');
      return;
    }

    const scope = [
      'pages_show_list', 'pages_manage_metadata', 'pages_messaging',
      'instagram_manage_messages',
    ].join(',');

    setConnecting(platform);

    window.FB.login(response => {
      if (!response.authResponse) {
        setConnecting(null);
        toast('Connection cancelled');
        return;
      }
      api.post('/social/connect/token', {
        outlet:      outletId,
        accessToken: response.authResponse.accessToken,
      }).then(({ data }) => {
        toast.success(`Connected ${data.total} account${data.total !== 1 ? 's' : ''}!`);
        return api.get('/social/accounts');
      }).then(r => {
        setAccounts(r.data.accounts || []);
      }).catch(err => {
        toast.error(err.response?.data?.message || 'Connection failed');
      }).finally(() => setConnecting(null));
    }, { scope });
  }

  async function handleDisconnect(id) {
    if (!confirm('Disconnect this account?')) return;
    setDeleting(id);
    try {
      await api.delete(`/social/accounts/${id}`);
      setAccounts(prev => prev.filter(a => a._id !== id));
      toast.success('Disconnected');
    } catch {
      toast.error('Failed');
    } finally {
      setDeleting(null);
    }
  }

  const outletAccounts = accounts.filter(a => (a.outlet?._id || a.outlet) === selectedOutlet);
  const selectedOutletObj = outlets.find(o => o._id === selectedOutlet);

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="w-6 h-6 border-2 border-brand-300 border-t-brand-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Connections</h1>
        <p className="text-sm text-gray-500 mt-0.5">Connect your social media accounts to receive messages in the Inbox</p>
      </div>

      {/* API Config (collapsible) */}
      <ApiConfigSection onAppIdLoaded={handleAppIdLoaded} />

      {/* Outlet selector */}
      {outlets.length > 1 && (
        <div className="mb-5">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Managing outlet</label>
          <div className="flex gap-2 flex-wrap">
            {outlets.map(o => (
              <button key={o._id} onClick={() => setSelectedOutlet(o._id)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors border ${
                  selectedOutlet === o._id
                    ? 'bg-brand-500 text-white border-brand-500'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                }`}
              >
                {o.name}
                <span className="ml-1.5 text-xs opacity-70">{o.city}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {selectedOutletObj && (
        <p className="text-sm text-gray-500 mb-4">
          Connecting accounts for <strong className="text-gray-800">{selectedOutletObj.name}</strong>
        </p>
      )}

      {/* Platform cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {Object.keys(PLATFORMS).map(platform => (
          <PlatformCard
            key={platform}
            platform={platform}
            accounts={outletAccounts}
            outlet={selectedOutlet}
            onConnect={handleConnect}
            onDisconnect={handleDisconnect}
            connecting={connecting}
          />
        ))}
      </div>

      {/* Webhook info */}
      <div className="mt-6 bg-amber-50 border border-amber-200 rounded-2xl p-4">
        <div className="flex items-start gap-2">
          <AlertCircle size={15} className="text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-amber-700 space-y-1">
            <p className="font-semibold text-amber-800">One-time webhook setup in Meta App Dashboard</p>
            <p>Webhook URL: <code className="bg-amber-100 px-1.5 py-0.5 rounded font-mono">https://orders.cakezake.com/api/social/webhook/meta</code></p>
            <p>Subscribe to: <strong>messages, messaging_postbacks, instagram_messages</strong></p>
            <p>Verify token: must match <strong>META_WEBHOOK_VERIFY_TOKEN</strong> set in API Configuration above.</p>
          </div>
        </div>
      </div>

      {/* WA modal */}
      {waModal && (
        <WhatsAppModal
          outlet={selectedOutlet}
          onClose={() => setWaModal(false)}
          onConnected={() => api.get('/social/accounts').then(r => setAccounts(r.data.accounts || []))}
        />
      )}
    </div>
  );
}
