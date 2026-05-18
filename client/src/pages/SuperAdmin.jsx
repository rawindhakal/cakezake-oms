import { useState, useEffect, useCallback } from 'react';
import {
  Building2, Plus, Pencil, Trash2, ToggleLeft, ToggleRight, Users, ShoppingBag, X,
  Eye, EyeOff, LogOut, UserPlus, Globe, ExternalLink, Activity, TrendingUp, RefreshCw,
  Search, AlertTriangle, KeyRound, Home, Zap, Filter, ChevronDown,
  ArrowUpRight, ArrowDownRight, Package, CreditCard, Clock, CheckCircle2,
  AlertCircle, TrendingDown, Minus,
} from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import api from '../lib/api';
import useAuthStore from '../store/authStore';
import { useNavigate } from 'react-router-dom';

dayjs.extend(relativeTime);

const PLAN_COLORS = {
  free:  'bg-gray-100 text-gray-600',
  basic: 'bg-blue-100 text-blue-700',
  pro:   'bg-purple-100 text-purple-700',
};

const EMPTY_TENANT = {
  name: '', slug: '', ownerName: '', ownerEmail: '', phone: '',
  address: '', city: '', country: 'Nepal', currency: 'NPR',
  orderPrefix: 'CZ', plan: 'free', notes: '', planExpiresAt: '',
};

const ROLE_OPTIONS = [
  { value: 'super_admin',     label: 'Super Admin' },
  { value: 'staff',           label: 'Staff' },
  { value: 'order_processor', label: 'Order Processor' },
  { value: 'rider',           label: 'Rider' },
];
const ROLE_COLORS = {
  super_admin:     'bg-purple-100 text-purple-700',
  staff:           'bg-blue-100 text-blue-700',
  order_processor: 'bg-orange-100 text-orange-700',
  rider:           'bg-green-100 text-green-700',
};

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function getTenantHealth(tenant) {
  if (!tenant.orderCount || tenant.orderCount === 0) return 'new';
  if (!tenant.lastOrderAt) return 'new';
  const days = dayjs().diff(dayjs(tenant.lastOrderAt), 'day');
  if (days <= 7)  return 'active';
  if (days <= 30) return 'healthy';
  return 'churning';
}

const HEALTH_CONFIG = {
  active:   { label: 'Active',      dot: 'bg-green-400',  text: 'text-green-600',  bg: 'bg-green-50' },
  healthy:  { label: 'Healthy',     dot: 'bg-blue-400',   text: 'text-blue-600',   bg: 'bg-blue-50' },
  churning: { label: 'Churn Risk',  dot: 'bg-amber-400',  text: 'text-amber-600',  bg: 'bg-amber-50' },
  new:      { label: 'No Orders',   dot: 'bg-gray-300',   text: 'text-gray-500',   bg: 'bg-gray-50' },
};

// ── Shared: KPI Card ─────────────────────────────────────────────────────────

function KpiCard({ title, value, sub, icon: Icon, color = 'blue', trend, trendLabel }) {
  const colors = {
    blue:   { bg: 'bg-blue-50',   text: 'text-blue-700',   icon: 'text-blue-400' },
    green:  { bg: 'bg-green-50',  text: 'text-green-700',  icon: 'text-green-400' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-700', icon: 'text-purple-400' },
    orange: { bg: 'bg-orange-50', text: 'text-orange-700', icon: 'text-orange-400' },
    amber:  { bg: 'bg-amber-50',  text: 'text-amber-700',  icon: 'text-amber-400' },
  };
  const c = colors[color] || colors.blue;
  return (
    <div className={`${c.bg} rounded-2xl p-4`}>
      <div className="flex items-start justify-between mb-2">
        {Icon && <Icon size={18} className={c.icon} />}
        {trend !== undefined && (
          <span className={`text-xs font-semibold flex items-center gap-0.5 ${trend > 0 ? 'text-green-600' : trend < 0 ? 'text-red-500' : 'text-gray-400'}`}>
            {trend > 0 ? <ArrowUpRight size={12} /> : trend < 0 ? <ArrowDownRight size={12} /> : <Minus size={12} />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <p className={`text-2xl font-bold ${c.text} leading-none`}>{value}</p>
      <p className="text-xs text-gray-500 mt-1 font-medium">{title}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      {trendLabel && <p className="text-xs text-gray-400 mt-0.5">{trendLabel}</p>}
    </div>
  );
}

// ── Shared: Activity Item ─────────────────────────────────────────────────────

function ActivityItem({ log, showTenant = false }) {
  const ACTION_CONFIG = {
    'order.created':        { dot: 'bg-green-400',  label: (m) => <>created order <code className="bg-gray-100 px-1 rounded text-xs">{m?.orderNumber}</code></> },
    'order.status_changed': { dot: 'bg-blue-400',   label: (m) => <>changed <code className="bg-gray-100 px-1 rounded text-xs">{m?.orderNumber}</code> → <strong>{m?.newStatus}</strong></> },
    'order.deleted':        { dot: 'bg-red-400',    label: (m) => <>cancelled <code className="bg-gray-100 px-1 rounded text-xs">{m?.orderNumber}</code></> },
  };
  const cfg = ACTION_CONFIG[log.action];
  return (
    <div className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0">
      <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${cfg?.dot || 'bg-gray-300'}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-700 leading-snug">
          <span className="font-medium">{log.userName || 'System'}</span>
          {' '}
          {cfg ? cfg.label(log.meta) : <span className="text-gray-500">{log.action}</span>}
        </p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {showTenant && log.tenantName && (
            <span className="text-xs bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded font-medium">
              {log.tenantName}
            </span>
          )}
          <span className="text-xs text-gray-400">{dayjs(log.createdAt).fromNow()}</span>
        </div>
      </div>
    </div>
  );
}

// ── Tenant Modal ──────────────────────────────────────────────────────────────

function TenantModal({ tenant, onClose, onSaved }) {
  const isEdit = !!tenant?._id;
  const [form, setForm] = useState(
    tenant
      ? { ...EMPTY_TENANT, ...tenant, planExpiresAt: tenant.planExpiresAt ? dayjs(tenant.planExpiresAt).format('YYYY-MM-DD') : '' }
      : { ...EMPTY_TENANT }
  );
  const [saving, setSaving] = useState(false);

  function set(field, value) {
    setForm((f) => {
      const next = { ...f, [field]: value };
      if (field === 'name' && !isEdit) next.slug = slugify(value);
      return next;
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.slug.trim()) { toast.error('Name and slug are required'); return; }
    setSaving(true);
    try {
      const payload = { ...form };
      if (!payload.planExpiresAt) delete payload.planExpiresAt;
      const { data } = isEdit
        ? await api.put(`/tenants/${tenant._id}`, payload)
        : await api.post('/tenants', payload);
      if (data.success) { toast.success(isEdit ? 'Tenant updated' : 'Tenant created'); onSaved(data.tenant, isEdit); onClose(); }
      else toast.error(data.message || 'Failed');
    } catch (err) { toast.error(err.response?.data?.message || 'Error'); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg my-4">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-lg font-bold">{isEdit ? 'Edit Tenant' : 'New Tenant'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="label">Business Name *</label>
              <input className="input" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="CakeZake" />
            </div>
            <div>
              <label className="label">Slug * <span className="text-xs text-gray-400">(URL id)</span></label>
              <input className="input" value={form.slug} onChange={(e) => set('slug', slugify(e.target.value))} placeholder="cakezake" disabled={isEdit} />
            </div>
            <div>
              <label className="label">Order Prefix</label>
              <input className="input uppercase" value={form.orderPrefix} onChange={(e) => set('orderPrefix', e.target.value.toUpperCase())} placeholder="CZ" maxLength={6} />
            </div>
            <div>
              <label className="label">Owner Name</label>
              <input className="input" value={form.ownerName} onChange={(e) => set('ownerName', e.target.value)} placeholder="Jane Doe" />
            </div>
            <div>
              <label className="label">Owner Email</label>
              <input className="input" type="email" value={form.ownerEmail} onChange={(e) => set('ownerEmail', e.target.value)} placeholder="owner@biz.com" />
            </div>
            <div>
              <label className="label">Phone</label>
              <input className="input" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="98XXXXXXXX" />
            </div>
            <div>
              <label className="label">City</label>
              <input className="input" value={form.city} onChange={(e) => set('city', e.target.value)} placeholder="Birtamode" />
            </div>
            <div>
              <label className="label">Currency</label>
              <input className="input" value={form.currency} onChange={(e) => set('currency', e.target.value)} placeholder="NPR" />
            </div>
            <div>
              <label className="label">Plan</label>
              <select className="input" value={form.plan} onChange={(e) => set('plan', e.target.value)}>
                <option value="free">Free</option>
                <option value="basic">Basic</option>
                <option value="pro">Pro</option>
              </select>
            </div>
            <div>
              <label className="label">Plan Expires At</label>
              <input className="input" type="date" value={form.planExpiresAt} onChange={(e) => set('planExpiresAt', e.target.value)} />
            </div>
            <div className="col-span-2">
              <label className="label">Address</label>
              <input className="input" value={form.address} onChange={(e) => set('address', e.target.value)} placeholder="Full address" />
            </div>
            <div className="col-span-2">
              <label className="label">Internal Notes</label>
              <textarea className="input h-20 resize-none" value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Payment notes, contract details..." />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Tenant'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── User Manager ──────────────────────────────────────────────────────────────

function AddUserForm({ tenantId, onAdded, onCancel }) {
  const [form, setForm]   = useState({ name: '', username: '', email: '', password: '', role: 'staff' });
  const [showPw, setShowPw] = useState(false);
  const [saving, setSaving] = useState(false);

  function field(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.username.trim() || !form.password) { toast.error('Name, username and password are required'); return; }
    setSaving(true);
    try {
      const { data } = await api.post(`/tenants/${tenantId}/users`, form);
      if (data.success) { toast.success(`User "${data.user.username}" created`); onAdded(data.user); }
      else toast.error(data.message || 'Failed');
    } catch (err) { toast.error(err.response?.data?.message || 'Error'); }
    finally { setSaving(false); }
  }

  return (
    <div className="border-b border-blue-100 bg-blue-50 px-5 py-4">
      <p className="text-sm font-semibold text-blue-700 mb-3 flex items-center gap-1.5"><UserPlus size={14} /> New User</p>
      <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-3">
        <div><label className="label text-xs">Full Name *</label><input className="input py-1.5 text-sm" value={form.name} onChange={(e) => field('name', e.target.value)} placeholder="Jane Doe" /></div>
        <div><label className="label text-xs">Username *</label><input className="input py-1.5 text-sm" value={form.username} onChange={(e) => field('username', e.target.value.toLowerCase().replace(/\s/g, ''))} placeholder="janedoe" /></div>
        <div><label className="label text-xs">Email</label><input type="email" className="input py-1.5 text-sm" value={form.email} onChange={(e) => field('email', e.target.value)} placeholder="jane@biz.com" /></div>
        <div>
          <label className="label text-xs">Role</label>
          <select className="input py-1.5 text-sm" value={form.role} onChange={(e) => field('role', e.target.value)}>
            {ROLE_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>
        <div className="col-span-2">
          <label className="label text-xs">Password *</label>
          <div className="relative">
            <input type={showPw ? 'text' : 'password'} className="input py-1.5 text-sm pr-9" value={form.password} onChange={(e) => field('password', e.target.value)} placeholder="Min. 6 characters" />
            <button type="button" onClick={() => setShowPw((s) => !s)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400">{showPw ? <EyeOff size={13} /> : <Eye size={13} />}</button>
          </div>
        </div>
        <div className="col-span-2 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="btn-secondary text-sm py-1.5">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary text-sm py-1.5">{saving ? 'Creating…' : 'Create User'}</button>
        </div>
      </form>
    </div>
  );
}

function UserManagerModal({ tenant, onClose, onUserCountChanged }) {
  const [users, setUsers]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [resetTarget, setResetTarget] = useState(null);
  const [newPw, setNewPw]           = useState('');
  const [showNewPw, setShowNewPw]   = useState(false);
  const [resetting, setResetting]   = useState(false);

  useEffect(() => { loadUsers(); }, []);

  async function loadUsers() {
    setLoading(true);
    try { const { data } = await api.get(`/tenants/${tenant._id}/users`); setUsers(data.users || []); }
    catch { toast.error('Could not load users'); }
    finally { setLoading(false); }
  }

  async function handleToggleActive(u) {
    try {
      const { data } = await api.put(`/tenants/${tenant._id}/users/${u._id}`, { isActive: !u.isActive });
      if (data.success) setUsers((prev) => prev.map((x) => x._id === u._id ? { ...x, isActive: data.user.isActive } : x));
    } catch { toast.error('Could not update user'); }
  }

  async function handleResetPassword() {
    if (!newPw || newPw.length < 6) { toast.error('Min. 6 characters'); return; }
    setResetting(true);
    try {
      await api.post(`/tenants/${tenant._id}/users/${resetTarget}/reset-password`, { newPassword: newPw });
      toast.success('Password reset'); setResetTarget(null); setNewPw('');
    } catch (err) { toast.error(err.response?.data?.message || 'Error'); }
    finally { setResetting(false); }
  }

  async function handleDelete(u) {
    if (!window.confirm(`Delete user "${u.username}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/tenants/${tenant._id}/users/${u._id}`);
      setUsers((prev) => prev.filter((x) => x._id !== u._id));
      onUserCountChanged(-1);
      toast.success('User deleted');
    } catch (err) { toast.error(err.response?.data?.message || 'Error'); }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2"><Users size={18} className="text-brand-500" /> Manage Users</h2>
            <p className="text-sm text-gray-400 mt-0.5">{tenant.name} · <span className="font-medium text-gray-600">{users.length} user{users.length !== 1 ? 's' : ''}</span></p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => { setShowAddForm((s) => !s); setResetTarget(null); }} className={`text-sm flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors ${showAddForm ? 'bg-gray-100 text-gray-600' : 'btn-primary'}`}>
              <Plus size={14} /> {showAddForm ? 'Cancel' : 'Add User'}
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"><X size={20} /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {showAddForm && <AddUserForm tenantId={tenant._id} onAdded={(u) => { setUsers((p) => [...p, u]); onUserCountChanged(1); setShowAddForm(false); }} onCancel={() => setShowAddForm(false)} />}
          <div className="p-5">
            {loading ? <div className="text-center py-10 text-gray-400">Loading…</div>
            : users.length === 0 ? (
              <div className="text-center py-10 text-gray-400"><Users size={28} className="mx-auto mb-2 text-gray-300" />No users yet.</div>
            ) : (
              <div className="space-y-2">
                {users.map((u) => (
                  <div key={u._id} className="border border-gray-100 rounded-xl overflow-hidden">
                    <div className="flex items-center gap-3 p-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${u.isActive ? 'bg-brand-100 text-brand-700' : 'bg-gray-100 text-gray-400'}`}>{u.name?.[0]?.toUpperCase() || '?'}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">{u.name}</p>
                        <p className="text-xs text-gray-400 truncate">@{u.username}{u.email ? ` · ${u.email}` : ''}</p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${ROLE_COLORS[u.role] || 'bg-gray-100 text-gray-600'}`}>{u.role.replace(/_/g, ' ')}</span>
                      <div className="flex items-center gap-0.5 shrink-0">
                        <button onClick={() => handleToggleActive(u)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
                          {u.isActive ? <ToggleRight size={18} className="text-green-500" /> : <ToggleLeft size={18} />}
                        </button>
                        <button onClick={() => { setResetTarget(resetTarget === u._id ? null : u._id); setNewPw(''); setShowNewPw(false); }} className={`p-1.5 rounded-lg transition-colors ${resetTarget === u._id ? 'bg-amber-100 text-amber-600' : 'hover:bg-amber-50 text-gray-400 hover:text-amber-600'}`}><KeyRound size={15} /></button>
                        <button onClick={() => handleDelete(u)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={15} /></button>
                      </div>
                    </div>
                    {resetTarget === u._id && (
                      <div className="border-t border-amber-100 bg-amber-50 px-4 py-3 flex items-center gap-2 flex-wrap">
                        <KeyRound size={13} className="text-amber-500 shrink-0" />
                        <span className="text-xs text-amber-700 font-medium shrink-0">New password for @{u.username}:</span>
                        <div className="relative flex-1 min-w-40">
                          <input type={showNewPw ? 'text' : 'password'} className="input py-1.5 text-sm pr-8" placeholder="Min. 6 characters" value={newPw} onChange={(e) => setNewPw(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleResetPassword()} autoFocus />
                          <button type="button" onClick={() => setShowNewPw((s) => !s)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400">{showNewPw ? <EyeOff size={13} /> : <Eye size={13} />}</button>
                        </div>
                        <button onClick={handleResetPassword} disabled={resetting} className="btn-primary text-xs py-1.5 px-3 shrink-0">{resetting ? '…' : 'Reset'}</button>
                        <button onClick={() => { setResetTarget(null); setNewPw(''); }} className="text-xs text-gray-500 hover:text-gray-700 shrink-0">Cancel</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Tenant Card ───────────────────────────────────────────────────────────────

function TenantCard({ tenant, onEdit, onDelete, onToggle, onViewData, onManageUsers }) {
  const [toggling, setToggling] = useState(false);
  const health    = getTenantHealth(tenant);
  const healthCfg = HEALTH_CONFIG[health];
  const expiresAt = tenant.planExpiresAt ? dayjs(tenant.planExpiresAt) : null;
  const daysLeft  = expiresAt ? expiresAt.diff(dayjs(), 'day') : null;

  async function handleToggle() { setToggling(true); await onToggle(tenant._id); setToggling(false); }

  return (
    <div className={`card border-2 transition-all ${tenant.isActive ? 'border-gray-100 hover:border-gray-200' : 'border-gray-200 opacity-55'}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-gray-800 truncate">{tenant.name}</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium uppercase shrink-0 ${PLAN_COLORS[tenant.plan]}`}>{tenant.plan}</span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5 truncate">/{tenant.slug} · {tenant.orderPrefix} · {tenant.currency}</p>
          {tenant.ownerName && <p className="text-xs text-gray-500 mt-0.5 truncate">{tenant.ownerName}{tenant.ownerEmail ? ` · ${tenant.ownerEmail}` : ''}</p>}
        </div>
        <div className="flex items-center gap-0.5 ml-2 shrink-0">
          <button onClick={() => onViewData(tenant)} title="View tenant data" className="p-1.5 rounded-lg hover:bg-purple-50 text-gray-400 hover:text-purple-600 transition-colors"><ExternalLink size={14} /></button>
          <button onClick={() => onManageUsers(tenant)} title="Manage users" className="p-1.5 rounded-lg hover:bg-indigo-50 text-gray-400 hover:text-indigo-600 transition-colors"><Users size={14} /></button>
          <button onClick={handleToggle} disabled={toggling} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
            {tenant.isActive ? <ToggleRight size={17} className="text-green-500" /> : <ToggleLeft size={17} />}
          </button>
          <button onClick={() => onEdit(tenant)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-brand-500 transition-colors"><Pencil size={14} /></button>
          <button onClick={() => onDelete(tenant)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-blue-50 rounded-xl p-2.5 text-center">
          <p className="text-base font-bold text-blue-700">{tenant.orderCount ?? '—'}</p>
          <p className="text-xs text-blue-400">Orders</p>
        </div>
        <div className="bg-green-50 rounded-xl p-2.5 text-center">
          <p className="text-base font-bold text-green-700">{tenant.userCount ?? '—'}</p>
          <p className="text-xs text-green-400">Users</p>
        </div>
        <div className="bg-orange-50 rounded-xl p-2.5 text-center">
          <p className="text-sm font-bold text-orange-700 truncate">
            {tenant.totalRevenue ? (tenant.totalRevenue >= 1000 ? `${(tenant.totalRevenue / 1000).toFixed(1)}k` : tenant.totalRevenue) : '0'}
          </p>
          <p className="text-xs text-orange-400">{tenant.currency || 'NPR'}</p>
        </div>
      </div>

      {/* Health + meta row */}
      <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-between gap-2 flex-wrap">
        <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full font-medium ${healthCfg.bg} ${healthCfg.text}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${healthCfg.dot}`} />
          {healthCfg.label}
        </span>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {tenant.lastOrderAt && (
            <span className="text-xs text-gray-400">{dayjs(tenant.lastOrderAt).fromNow()}</span>
          )}
          {daysLeft !== null && daysLeft < 30 && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${daysLeft < 7 ? 'bg-red-100 text-red-600' : daysLeft < 14 ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-500'}`}>
              {daysLeft <= 0 ? 'Expired' : `Exp. ${daysLeft}d`}
            </span>
          )}
          {tenant.totalDue > 0 && (
            <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">
              Due {(tenant.totalDue >= 1000 ? `${(tenant.totalDue / 1000).toFixed(1)}k` : tenant.totalDue)} {tenant.currency || 'NPR'}
            </span>
          )}
        </div>
      </div>

      {tenant.notes && (
        <p className="text-xs text-gray-400 mt-2.5 pt-2.5 border-t border-gray-50 line-clamp-1">{tenant.notes}</p>
      )}
    </div>
  );
}

// ── Activity Tab ──────────────────────────────────────────────────────────────

function ActivityTab({ tenants }) {
  const [logs, setLogs]           = useState([]);
  const [loading, setLoading]     = useState(true);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(1);
  const [tenantFilter, setTenantFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');

  const ACTION_OPTIONS = [
    { value: 'all',                  label: 'All Actions' },
    { value: 'order.created',        label: 'Orders Created' },
    { value: 'order.status_changed', label: 'Status Changes' },
    { value: 'order.deleted',        label: 'Cancellations' },
  ];

  const fetchLogs = useCallback(async (pg = 1, append = false) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: pg, limit: 30 });
      if (tenantFilter !== 'all') params.set('tenantId', tenantFilter);
      if (actionFilter !== 'all') params.set('action', actionFilter);
      const { data } = await api.get(`/tenants/activity?${params}`);
      if (data.success) {
        setLogs((prev) => append ? [...prev, ...data.logs] : data.logs);
        setTotal(data.total);
        setPage(pg);
      }
    } catch { toast.error('Could not load activity'); }
    finally { setLoading(false); }
  }, [tenantFilter, actionFilter]);

  useEffect(() => { fetchLogs(1); }, [fetchLogs]);

  const hasMore = logs.length < total;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <Activity size={20} className="text-brand-500" /> Platform Activity
          {total > 0 && <span className="text-sm text-gray-400 font-normal">({total} events)</span>}
        </h2>
        <button onClick={() => fetchLogs(1)} className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-500 transition-colors" title="Refresh"><RefreshCw size={15} /></button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative">
          <Filter size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <select className="input pl-8 pr-8 py-1.5 text-sm appearance-none" value={tenantFilter} onChange={(e) => { setTenantFilter(e.target.value); }}>
            <option value="all">All Tenants</option>
            {tenants.map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
          </select>
          <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
        <div className="relative">
          <select className="input pr-8 py-1.5 text-sm appearance-none" value={actionFilter} onChange={(e) => { setActionFilter(e.target.value); }}>
            {ACTION_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {loading && logs.length === 0 ? (
        <div className="text-center py-16 text-gray-400">Loading activity…</div>
      ) : logs.length === 0 ? (
        <div className="card text-center py-12 text-gray-400">
          <Activity size={28} className="mx-auto mb-2 text-gray-300" />
          No activity recorded yet.
        </div>
      ) : (
        <>
          <div className="card divide-y divide-gray-50">
            {logs.map((log) => <ActivityItem key={log._id} log={log} showTenant />)}
          </div>
          {hasMore && (
            <div className="text-center">
              <button onClick={() => fetchLogs(page + 1, true)} disabled={loading} className="btn-secondary text-sm px-6">
                {loading ? 'Loading…' : `Load more (${total - logs.length} remaining)`}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Overview Tab ──────────────────────────────────────────────────────────────

function OverviewTab({ tenants, analytics, onNavigate }) {
  const expiringSoon = tenants.filter((t) => {
    if (!t.planExpiresAt) return false;
    return dayjs(t.planExpiresAt).diff(dayjs(), 'day') < 14;
  });
  const churnRisk = tenants.filter((t) => {
    if (!t.orderCount || !t.isActive) return false;
    return t.lastOrderAt && dayjs().diff(dayjs(t.lastOrderAt), 'day') > 30;
  });
  const highDue = tenants.filter((t) => t.totalDue > 5000);
  const alerts  = [
    ...expiringSoon.map((t) => ({ type: 'expiry',  tenant: t, msg: `${t.name} — plan expires ${dayjs(t.planExpiresAt).fromNow()}` })),
    ...churnRisk.map((t)   => ({ type: 'churn',    tenant: t, msg: `${t.name} — no orders in ${dayjs().diff(dayjs(t.lastOrderAt), 'day')} days` })),
    ...highDue.map((t)     => ({ type: 'due',      tenant: t, msg: `${t.name} — ${t.currency || 'NPR'} ${Number(t.totalDue).toLocaleString('en-IN')} overdue` })),
  ];

  const totalRevenue = tenants.reduce((s, t) => s + (t.totalRevenue || 0), 0);
  const topTenant    = analytics?.tenantRevenue?.[0];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard
          title="Active Tenants"
          value={`${tenants.filter((t) => t.isActive).length} / ${tenants.length}`}
          icon={Building2}
          color="blue"
          sub="on platform"
        />
        <KpiCard
          title="Orders Today"
          value={analytics?.ordersToday ?? '—'}
          icon={Package}
          color="green"
          trend={analytics?.ordersGrowth}
          trendLabel="vs last month"
        />
        <KpiCard
          title="Revenue Today"
          value={analytics?.revenueToday ? `${analytics.revenueToday >= 1000 ? `${(analytics.revenueToday / 1000).toFixed(1)}k` : analytics.revenueToday} NPR` : '—'}
          icon={CreditCard}
          color="orange"
          sub="across all tenants"
        />
        <KpiCard
          title="New This Week"
          value={analytics?.newTenantsThisWeek ?? '—'}
          icon={Zap}
          color={analytics?.newTenantsThisWeek > 0 ? 'purple' : 'amber'}
          sub="tenant signups"
        />
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="card border-amber-100">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <AlertCircle size={16} className="text-amber-500" />
            {alerts.length} Item{alerts.length !== 1 ? 's' : ''} Needing Attention
          </h3>
          <div className="space-y-2">
            {alerts.map((a, i) => (
              <div key={i} className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-sm ${
                a.type === 'expiry' ? 'bg-amber-50'
                : a.type === 'churn' ? 'bg-orange-50'
                : 'bg-red-50'
              }`}>
                <div className="flex items-center gap-2 min-w-0">
                  {a.type === 'expiry' && <AlertTriangle size={14} className="text-amber-500 shrink-0" />}
                  {a.type === 'churn'  && <TrendingDown  size={14} className="text-orange-500 shrink-0" />}
                  {a.type === 'due'    && <CreditCard    size={14} className="text-red-500 shrink-0" />}
                  <span className={`truncate ${a.type === 'expiry' ? 'text-amber-800' : a.type === 'churn' ? 'text-orange-800' : 'text-red-800'}`}>{a.msg}</span>
                </div>
                <button onClick={() => onNavigate('tenants')} className="text-xs shrink-0 underline text-gray-500 hover:text-gray-700">View</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top tenant + platform revenue + recent activity */}
      <div className="grid sm:grid-cols-2 gap-4">
        {/* Platform snapshot */}
        <div className="card space-y-3">
          <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2"><TrendingUp size={16} className="text-brand-500" /> Platform Snapshot</h3>
          <div className="space-y-2.5 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Total Revenue</span>
              <span className="font-semibold text-gray-800">NPR {totalRevenue.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Total Orders</span>
              <span className="font-semibold text-gray-800">{tenants.reduce((s, t) => s + (t.orderCount || 0), 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">This Month Orders</span>
              <span className="font-semibold text-gray-800">{analytics?.ordersThisMonth ?? '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Total Users</span>
              <span className="font-semibold text-gray-800">{tenants.reduce((s, t) => s + (t.userCount || 0), 0)}</span>
            </div>
            {topTenant && (
              <div className="pt-2 border-t border-gray-50">
                <p className="text-xs text-gray-400 mb-1">Top Tenant</p>
                <p className="font-semibold text-gray-800">{topTenant.tenantName}</p>
                <p className="text-xs text-gray-500">NPR {Number(topTenant.revenue).toLocaleString('en-IN')} · {topTenant.orders} orders</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent activity */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2"><Activity size={16} className="text-brand-500" /> Recent Activity</h3>
            <button onClick={() => onNavigate('activity')} className="text-xs text-brand-500 hover:underline">View all</button>
          </div>
          {!analytics?.recentActivity?.length ? (
            <p className="text-sm text-gray-400 py-4 text-center">No activity yet.</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {analytics.recentActivity.slice(0, 5).map((log) => <ActivityItem key={log._id} log={log} showTenant />)}
            </div>
          )}
        </div>
      </div>

      {/* Tenant health summary */}
      {tenants.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2"><CheckCircle2 size={16} className="text-brand-500" /> Tenant Health</h3>
            <button onClick={() => onNavigate('tenants')} className="text-xs text-brand-500 hover:underline">Manage →</button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(['active', 'healthy', 'churning', 'new']).map((h) => {
              const count = tenants.filter((t) => getTenantHealth(t) === h).length;
              const cfg   = HEALTH_CONFIG[h];
              return (
                <div key={h} className={`${cfg.bg} rounded-xl p-3 text-center`}>
                  <p className={`text-xl font-bold ${cfg.text}`}>{count}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{cfg.label}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── SuperAdmin Page ───────────────────────────────────────────────────────────

const SORT_OPTIONS = [
  { value: 'revenue_desc',   label: 'Revenue (high → low)' },
  { value: 'orders_desc',    label: 'Orders (high → low)' },
  { value: 'last_active',    label: 'Last Active' },
  { value: 'created_desc',   label: 'Newest First' },
  { value: 'name_asc',       label: 'Name (A → Z)' },
];

export default function SuperAdmin() {
  const { user, logout, switchTenant } = useAuthStore();
  const navigate = useNavigate();

  const [tenants, setTenants]         = useState([]);
  const [loading, setLoading]         = useState(true);
  const [modal, setModal]             = useState(null);
  const [userModal, setUserModal]     = useState(null);
  const [activeTab, setActiveTab]     = useState('overview');
  const [search, setSearch]           = useState('');
  const [sortBy, setSortBy]           = useState('revenue_desc');
  const [planFilter, setPlanFilter]   = useState('all');
  const [healthFilter, setHealthFilter] = useState('all');
  const [analytics, setAnalytics]     = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  useEffect(() => { loadTenants(); loadAnalytics(); }, []);

  async function loadTenants() {
    setLoading(true);
    try { const { data } = await api.get('/tenants'); setTenants(data.tenants || []); }
    catch { toast.error('Could not load tenants'); }
    finally { setLoading(false); }
  }

  async function loadAnalytics() {
    setAnalyticsLoading(true);
    try { const { data } = await api.get('/tenants/analytics'); if (data.success) setAnalytics(data); }
    catch { toast.error('Could not load analytics'); }
    finally { setAnalyticsLoading(false); }
  }

  async function handleToggle(id) {
    try {
      const { data } = await api.patch(`/tenants/${id}/toggle`);
      if (data.success) setTenants((prev) => prev.map((t) => t._id === id ? { ...t, isActive: data.tenant.isActive } : t));
    } catch { toast.error('Could not toggle tenant'); }
  }

  async function handleDelete(tenant) {
    if (!window.confirm(`Delete tenant "${tenant.name}"?\nThis will remove ALL its users and data.`)) return;
    try {
      const { data } = await api.delete(`/tenants/${tenant._id}`);
      if (data.success) { setTenants((prev) => prev.filter((t) => t._id !== tenant._id)); toast.success('Tenant deleted'); }
      else toast.error(data.message || 'Cannot delete');
    } catch (err) { toast.error(err.response?.data?.message || 'Error'); }
  }

  function handleSaved(tenant, isEdit) {
    setTenants((prev) => isEdit
      ? prev.map((t) => t._id === tenant._id ? { ...t, ...tenant } : t)
      : [{ ...tenant, orderCount: 0, userCount: 0, totalRevenue: 0 }, ...prev]
    );
  }

  async function handleViewData(tenant) {
    if (!tenant.isActive) { toast.error('Cannot view inactive tenant'); return; }
    try {
      const data = await switchTenant(tenant._id);
      if (data.success) navigate('/dashboard');
      else toast.error(data.message || 'Could not switch context');
    } catch { toast.error('Could not switch to tenant'); }
  }

  async function handleLogout() { await logout(); navigate('/login'); }

  // Sort + filter tenants
  const processedTenants = (() => {
    let list = [...tenants];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((t) =>
        t.name?.toLowerCase().includes(q) ||
        t.slug?.toLowerCase().includes(q) ||
        t.ownerName?.toLowerCase().includes(q) ||
        t.ownerEmail?.toLowerCase().includes(q)
      );
    }
    if (planFilter !== 'all')   list = list.filter((t) => t.plan === planFilter);
    if (healthFilter !== 'all') list = list.filter((t) => getTenantHealth(t) === healthFilter);

    list.sort((a, b) => {
      if (sortBy === 'revenue_desc') return (b.totalRevenue || 0) - (a.totalRevenue || 0);
      if (sortBy === 'orders_desc')  return (b.orderCount   || 0) - (a.orderCount   || 0);
      if (sortBy === 'last_active')  return (b.lastOrderAt  ? new Date(b.lastOrderAt) : 0) - (a.lastOrderAt ? new Date(a.lastOrderAt) : 0);
      if (sortBy === 'created_desc') return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      if (sortBy === 'name_asc')     return (a.name || '').localeCompare(b.name || '');
      return 0;
    });
    return list;
  })();

  const TABS = [
    { key: 'overview',  label: 'Overview',  icon: Home },
    { key: 'tenants',   label: 'Tenants',   icon: Building2 },
    { key: 'analytics', label: 'Analytics', icon: TrendingUp },
    { key: 'activity',  label: 'Activity',  icon: Activity },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-2xl">🎂</div>
            <div>
              <div className="font-bold text-gray-800 text-sm">Platform Admin</div>
              <div className="text-xs text-gray-400">CakeZake SaaS</div>
            </div>
          </div>
          {/* Quick stats pill */}
          {analytics && (
            <div className="hidden md:flex items-center gap-4 text-xs text-gray-500 bg-gray-50 rounded-full px-4 py-2">
              <span><span className="font-semibold text-gray-700">{tenants.filter((t) => t.isActive).length}</span> tenants</span>
              <span className="text-gray-200">|</span>
              <span><span className="font-semibold text-gray-700">{analytics.ordersToday}</span> orders today</span>
              <span className="text-gray-200">|</span>
              <span><span className="font-semibold text-gray-700">NPR {analytics.revenueToday >= 1000 ? `${(analytics.revenueToday / 1000).toFixed(1)}k` : analytics.revenueToday}</span> today</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <div className="hidden sm:block text-right">
              <p className="text-sm font-semibold text-gray-700">{user?.name}</p>
              <p className="text-xs text-purple-500 font-medium">Platform Owner</p>
            </div>
            <button onClick={handleLogout} className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"><LogOut size={18} /></button>
          </div>
        </div>

        {/* Tab Bar */}
        <div className="max-w-6xl mx-auto px-4 flex gap-0.5">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.key ? 'border-brand-500 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon size={14} /> {tab.label}
              </button>
            );
          })}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">

        {/* ── OVERVIEW TAB ────────────────────────────────────────────────── */}
        {activeTab === 'overview' && (
          <OverviewTab
            tenants={tenants}
            analytics={analyticsLoading ? null : analytics}
            onNavigate={setActiveTab}
          />
        )}

        {/* ── TENANTS TAB ─────────────────────────────────────────────────── */}
        {activeTab === 'tenants' && (
          <>
            {/* Controls bar */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative flex-1 min-w-48">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input className="input pl-8 py-2 text-sm" placeholder="Search name, slug, owner…" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <div className="relative">
                <select className="input pr-8 py-2 text-sm appearance-none" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                  {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
              <div className="relative">
                <select className="input pr-8 py-2 text-sm appearance-none" value={planFilter} onChange={(e) => setPlanFilter(e.target.value)}>
                  <option value="all">All Plans</option>
                  <option value="free">Free</option>
                  <option value="basic">Basic</option>
                  <option value="pro">Pro</option>
                </select>
                <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
              <div className="relative">
                <select className="input pr-8 py-2 text-sm appearance-none" value={healthFilter} onChange={(e) => setHealthFilter(e.target.value)}>
                  <option value="all">All Health</option>
                  <option value="active">Active</option>
                  <option value="healthy">Healthy</option>
                  <option value="churning">Churn Risk</option>
                  <option value="new">No Orders</option>
                </select>
                <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
              <button onClick={loadTenants} className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-500 transition-colors"><RefreshCw size={15} /></button>
              <button onClick={() => setModal('new')} className="btn-primary flex items-center gap-2 text-sm whitespace-nowrap"><Plus size={16} /> Add Tenant</button>
            </div>

            {/* Tenant count summary */}
            {processedTenants.length !== tenants.length && (
              <p className="text-sm text-gray-400">Showing {processedTenants.length} of {tenants.length} tenants</p>
            )}

            {loading ? (
              <div className="text-center py-16 text-gray-400">Loading…</div>
            ) : processedTenants.length === 0 ? (
              <div className="card border-dashed border-2 border-gray-200 text-center py-12">
                <Building2 size={32} className="text-gray-300 mx-auto mb-3" />
                {search || planFilter !== 'all' || healthFilter !== 'all' ? (
                  <p className="text-gray-400">No tenants match your filters. <button onClick={() => { setSearch(''); setPlanFilter('all'); setHealthFilter('all'); }} className="text-brand-500 underline">Clear filters</button></p>
                ) : (
                  <>
                    <p className="text-gray-400 mb-4">No tenants yet.</p>
                    <button onClick={() => setModal('new')} className="btn-primary inline-flex items-center gap-2"><Plus size={16} /> Add First Tenant</button>
                  </>
                )}
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {processedTenants.map((t) => (
                  <TenantCard key={t._id} tenant={t}
                    onEdit={(t) => setModal(t)}
                    onDelete={handleDelete}
                    onToggle={handleToggle}
                    onViewData={handleViewData}
                    onManageUsers={(t) => setUserModal(t)}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* ── ANALYTICS TAB ───────────────────────────────────────────────── */}
        {activeTab === 'analytics' && (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2"><TrendingUp size={20} className="text-brand-500" /> Platform Analytics</h2>
              <button onClick={loadAnalytics} className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-500 transition-colors"><RefreshCw size={15} /></button>
            </div>

            {analyticsLoading ? (
              <div className="text-center py-16 text-gray-400">Loading analytics…</div>
            ) : !analytics ? (
              <div className="text-center py-16 text-gray-400">No analytics data.</div>
            ) : (
              <>
                {/* Summary KPIs */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <KpiCard title="Orders This Month" value={analytics.ordersThisMonth ?? 0} icon={Package} color="blue" trend={analytics.ordersGrowth} trendLabel="vs last month" />
                  <KpiCard title="Platform Revenue" value={`${(tenants.reduce((s,t)=>s+(t.totalRevenue||0),0)/1000).toFixed(0)}k NPR`} icon={CreditCard} color="green" />
                  <KpiCard title="Total Due (All)" value={`${(tenants.reduce((s,t)=>s+(t.totalDue||0),0)/1000).toFixed(1)}k NPR`} icon={AlertTriangle} color="orange" />
                  <KpiCard title="Total Orders" value={tenants.reduce((s,t)=>s+(t.orderCount||0),0)} icon={ShoppingBag} color="purple" />
                </div>

                {/* Monthly chart */}
                <div className="card">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-semibold text-gray-700">Revenue + Orders — Last 6 Months</h3>
                    {analytics.ordersGrowth !== undefined && (
                      <span className={`text-sm font-semibold flex items-center gap-1 ${analytics.ordersGrowth > 0 ? 'text-green-600' : analytics.ordersGrowth < 0 ? 'text-red-500' : 'text-gray-400'}`}>
                        {analytics.ordersGrowth > 0 ? <ArrowUpRight size={16} /> : analytics.ordersGrowth < 0 ? <ArrowDownRight size={16} /> : <Minus size={16} />}
                        {Math.abs(analytics.ordersGrowth)}% MoM
                      </span>
                    )}
                  </div>
                  <ResponsiveContainer width="100%" height={240}>
                    <LineChart data={analytics.monthlyRevenue} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                      <YAxis yAxisId="rev" tick={{ fontSize: 11 }} tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} width={44} />
                      <YAxis yAxisId="ord" orientation="right" tick={{ fontSize: 11 }} width={32} />
                      <Tooltip formatter={(v, n) => n === 'revenue' ? [`NPR ${Number(v).toLocaleString('en-IN')}`, 'Revenue'] : [v, 'Orders']} />
                      <Bar yAxisId="ord" dataKey="orders" fill="#e0e7ff" radius={[3,3,0,0]} />
                      <Line yAxisId="rev" type="monotone" dataKey="revenue" stroke="#f97316" strokeWidth={2.5} dot activeDot={{ r: 5 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Per-tenant revenue */}
                {analytics.tenantRevenue?.length > 0 && (
                  <div className="card">
                    <h3 className="text-base font-semibold text-gray-700 mb-4">Revenue by Tenant</h3>
                    <ResponsiveContainer width="100%" height={Math.max(160, analytics.tenantRevenue.length * 44)}>
                      <BarChart data={analytics.tenantRevenue} layout="vertical" margin={{ left: 0, right: 60 }}>
                        <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                        <YAxis type="category" dataKey="tenantName" width={100} tick={{ fontSize: 11 }} />
                        <Tooltip formatter={(v) => [`NPR ${Number(v).toLocaleString('en-IN')}`, 'Revenue']} />
                        <Bar dataKey="revenue" fill="#f97316" radius={[0,4,4,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                    <div className="mt-4 divide-y divide-gray-50">
                      {analytics.tenantRevenue.map((tr) => (
                        <div key={String(tr.tenantId)} className="flex items-center justify-between py-2 text-sm">
                          <div>
                            <span className="font-medium text-gray-800">{tr.tenantName || 'Unknown'}</span>
                            {tr.tenantSlug && <span className="ml-2 text-xs text-gray-400">/{tr.tenantSlug}</span>}
                          </div>
                          <div className="flex items-center gap-4 text-xs text-right">
                            <span className="text-gray-500">{tr.orders} orders</span>
                            <span className="font-semibold text-gray-700">NPR {Number(tr.revenue).toLocaleString('en-IN')}</span>
                            {tr.due > 0 && <span className="text-red-500 font-medium">NPR {Number(tr.due).toLocaleString('en-IN')} due</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* ── ACTIVITY TAB ────────────────────────────────────────────────── */}
        {activeTab === 'activity' && <ActivityTab tenants={tenants} />}
      </main>

      {/* Modals */}
      {modal && (
        <TenantModal tenant={modal === 'new' ? null : modal} onClose={() => setModal(null)} onSaved={handleSaved} />
      )}
      {userModal && (
        <UserManagerModal
          tenant={userModal}
          onClose={() => setUserModal(null)}
          onUserCountChanged={(delta) => setTenants((prev) => prev.map((t) => t._id === userModal._id ? { ...t, userCount: (t.userCount || 0) + delta } : t))}
        />
      )}
    </div>
  );
}
