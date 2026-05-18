import { useState, useEffect } from 'react';
import {
  Building2, Plus, Pencil, Trash2, ToggleLeft, ToggleRight, Users, ShoppingBag, X,
  Eye, EyeOff, LogOut, UserPlus, Globe, ExternalLink, Activity, TrendingUp, RefreshCw,
  Search, Calendar, DollarSign, AlertTriangle, KeyRound,
} from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import api from '../lib/api';
import useAuthStore from '../store/authStore';
import { useNavigate } from 'react-router-dom';

dayjs.extend(relativeTime);

const PLAN_COLORS = { free: 'bg-gray-100 text-gray-600', basic: 'bg-blue-100 text-blue-700', pro: 'bg-purple-100 text-purple-700' };

const EMPTY_TENANT = {
  name: '', slug: '', ownerName: '', ownerEmail: '', phone: '',
  address: '', city: '', country: 'Nepal', currency: 'NPR',
  orderPrefix: 'CZ', plan: 'free', notes: '', planExpiresAt: '',
};

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
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
    if (!form.name.trim() || !form.slug.trim()) {
      toast.error('Name and slug are required');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form };
      if (!payload.planExpiresAt) delete payload.planExpiresAt;
      const { data } = isEdit
        ? await api.put(`/tenants/${tenant._id}`, payload)
        : await api.post('/tenants', payload);
      if (data.success) {
        toast.success(isEdit ? 'Tenant updated' : 'Tenant created');
        onSaved(data.tenant, isEdit);
        onClose();
      } else {
        toast.error(data.message || 'Failed');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error');
    } finally {
      setSaving(false);
    }
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

// ── Create Admin Modal ────────────────────────────────────────────────────────

function CreateAdminModal({ tenant, onClose, onCreated }) {
  const [form, setForm] = useState({ username: '', name: '', password: '', email: '' });
  const [showPw, setShowPw] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.username || !form.name || !form.password) {
      toast.error('Username, name and password are required');
      return;
    }
    setSaving(true);
    try {
      const { data } = await api.post(`/tenants/${tenant._id}/create-admin`, form);
      if (data.success) {
        toast.success(`Admin user "${data.user.username}" created`);
        onCreated(data.user);
        onClose();
      } else {
        toast.error(data.message || 'Failed');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold">Create Admin User</h2>
            <p className="text-sm text-gray-400">For tenant: {tenant.name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Full Name *</label>
              <input className="input" value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Admin Name" />
            </div>
            <div>
              <label className="label">Username *</label>
              <input className="input" value={form.username} onChange={(e) => setForm(f => ({ ...f, username: e.target.value.toLowerCase() }))} placeholder="admin" />
            </div>
          </div>
          <div>
            <label className="label">Email (optional)</label>
            <input className="input" type="email" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} placeholder="admin@tenant.com" />
          </div>
          <div>
            <label className="label">Password *</label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                className="input pr-10"
                value={form.password}
                onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder="Min. 6 characters"
              />
              <button type="button" onClick={() => setShowPw(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? 'Creating…' : 'Create Admin'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── User Manager ─────────────────────────────────────────────────────────────

const ROLE_OPTIONS = [
  { value: 'super_admin',      label: 'Super Admin' },
  { value: 'staff',            label: 'Staff' },
  { value: 'order_processor',  label: 'Order Processor' },
  { value: 'rider',            label: 'Rider' },
];

const ROLE_COLORS = {
  super_admin:     'bg-purple-100 text-purple-700',
  staff:           'bg-blue-100 text-blue-700',
  order_processor: 'bg-orange-100 text-orange-700',
  rider:           'bg-green-100 text-green-700',
};

function AddUserForm({ tenantId, onAdded, onCancel }) {
  const [form, setForm] = useState({ name: '', username: '', email: '', password: '', role: 'staff' });
  const [showPw, setShowPw] = useState(false);
  const [saving, setSaving] = useState(false);

  function field(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.username.trim() || !form.password) {
      toast.error('Name, username and password are required');
      return;
    }
    setSaving(true);
    try {
      const { data } = await api.post(`/tenants/${tenantId}/users`, form);
      if (data.success) {
        toast.success(`User "${data.user.username}" created`);
        onAdded(data.user);
      } else {
        toast.error(data.message || 'Failed');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="border-b border-blue-100 bg-blue-50 px-5 py-4">
      <p className="text-sm font-semibold text-blue-700 mb-3 flex items-center gap-1.5">
        <UserPlus size={14} /> New User
      </p>
      <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-3">
        <div>
          <label className="label text-xs">Full Name *</label>
          <input className="input py-1.5 text-sm" value={form.name} onChange={(e) => field('name', e.target.value)} placeholder="Jane Doe" />
        </div>
        <div>
          <label className="label text-xs">Username *</label>
          <input className="input py-1.5 text-sm" value={form.username} onChange={(e) => field('username', e.target.value.toLowerCase().replace(/\s/g, ''))} placeholder="janedoe" />
        </div>
        <div>
          <label className="label text-xs">Email</label>
          <input type="email" className="input py-1.5 text-sm" value={form.email} onChange={(e) => field('email', e.target.value)} placeholder="jane@biz.com" />
        </div>
        <div>
          <label className="label text-xs">Role</label>
          <select className="input py-1.5 text-sm" value={form.role} onChange={(e) => field('role', e.target.value)}>
            {ROLE_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>
        <div className="col-span-2">
          <label className="label text-xs">Password *</label>
          <div className="relative">
            <input
              type={showPw ? 'text' : 'password'}
              className="input py-1.5 text-sm pr-9"
              value={form.password}
              onChange={(e) => field('password', e.target.value)}
              placeholder="Min. 6 characters"
            />
            <button type="button" onClick={() => setShowPw((s) => !s)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400">
              {showPw ? <EyeOff size={13} /> : <Eye size={13} />}
            </button>
          </div>
        </div>
        <div className="col-span-2 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="btn-secondary text-sm py-1.5">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary text-sm py-1.5">
            {saving ? 'Creating…' : 'Create User'}
          </button>
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
    try {
      const { data } = await api.get(`/tenants/${tenant._id}/users`);
      setUsers(data.users || []);
    } catch { toast.error('Could not load users'); }
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
      toast.success('Password reset successfully');
      setResetTarget(null);
      setNewPw('');
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

  function handleUserAdded(user) {
    setUsers((prev) => [...prev, user]);
    onUserCountChanged(1);
    setShowAddForm(false);
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Users size={18} className="text-brand-500" /> Manage Users
            </h2>
            <p className="text-sm text-gray-400 mt-0.5">
              {tenant.name} · <span className="font-medium text-gray-600">{users.length} user{users.length !== 1 ? 's' : ''}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setShowAddForm((s) => !s); setResetTarget(null); }}
              className={`text-sm flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors ${showAddForm ? 'bg-gray-100 text-gray-600' : 'btn-primary'}`}
            >
              <Plus size={14} /> {showAddForm ? 'Cancel' : 'Add User'}
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">
          {showAddForm && (
            <AddUserForm
              tenantId={tenant._id}
              onAdded={handleUserAdded}
              onCancel={() => setShowAddForm(false)}
            />
          )}

          <div className="p-5">
            {loading ? (
              <div className="text-center py-10 text-gray-400">Loading…</div>
            ) : users.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <Users size={28} className="mx-auto mb-2 text-gray-300" />
                No users yet. Add one above.
              </div>
            ) : (
              <div className="space-y-2">
                {users.map((u) => (
                  <div key={u._id} className="border border-gray-100 rounded-xl overflow-hidden">
                    <div className="flex items-center gap-3 p-3">
                      {/* Avatar */}
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${u.isActive ? 'bg-brand-100 text-brand-700' : 'bg-gray-100 text-gray-400'}`}>
                        {u.name?.[0]?.toUpperCase() || '?'}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 leading-tight truncate">{u.name}</p>
                        <p className="text-xs text-gray-400 truncate">
                          @{u.username}{u.email ? ` · ${u.email}` : ''}
                        </p>
                      </div>

                      {/* Role */}
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${ROLE_COLORS[u.role] || 'bg-gray-100 text-gray-600'}`}>
                        {u.role.replace(/_/g, ' ')}
                      </span>

                      {/* Actions */}
                      <div className="flex items-center gap-0.5 shrink-0">
                        <button
                          onClick={() => handleToggleActive(u)}
                          title={u.isActive ? 'Deactivate' : 'Activate'}
                          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
                        >
                          {u.isActive ? <ToggleRight size={18} className="text-green-500" /> : <ToggleLeft size={18} />}
                        </button>
                        <button
                          onClick={() => { setResetTarget(resetTarget === u._id ? null : u._id); setNewPw(''); setShowNewPw(false); }}
                          title="Reset password"
                          className={`p-1.5 rounded-lg transition-colors ${resetTarget === u._id ? 'bg-amber-100 text-amber-600' : 'hover:bg-amber-50 text-gray-400 hover:text-amber-600'}`}
                        >
                          <KeyRound size={15} />
                        </button>
                        <button
                          onClick={() => handleDelete(u)}
                          title="Delete user"
                          className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>

                    {/* Inline reset-password form */}
                    {resetTarget === u._id && (
                      <div className="border-t border-amber-100 bg-amber-50 px-4 py-3 flex items-center gap-2 flex-wrap">
                        <KeyRound size={13} className="text-amber-500 shrink-0" />
                        <span className="text-xs text-amber-700 font-medium shrink-0">New password for @{u.username}:</span>
                        <div className="relative flex-1 min-w-40">
                          <input
                            type={showNewPw ? 'text' : 'password'}
                            className="input py-1.5 text-sm pr-8"
                            placeholder="Min. 6 characters"
                            value={newPw}
                            onChange={(e) => setNewPw(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleResetPassword()}
                            autoFocus
                          />
                          <button type="button" onClick={() => setShowNewPw((s) => !s)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400">
                            {showNewPw ? <EyeOff size={13} /> : <Eye size={13} />}
                          </button>
                        </div>
                        <button
                          onClick={handleResetPassword}
                          disabled={resetting}
                          className="btn-primary text-xs py-1.5 px-3 shrink-0"
                        >
                          {resetting ? '…' : 'Reset'}
                        </button>
                        <button
                          onClick={() => { setResetTarget(null); setNewPw(''); }}
                          className="text-xs text-gray-500 hover:text-gray-700 shrink-0"
                        >
                          Cancel
                        </button>
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

function TenantCard({ tenant, onEdit, onDelete, onToggle, onCreateAdmin, onViewData, onManageUsers }) {
  const [toggling, setToggling] = useState(false);

  async function handleToggle() {
    setToggling(true);
    await onToggle(tenant._id);
    setToggling(false);
  }

  const expiresAt = tenant.planExpiresAt ? dayjs(tenant.planExpiresAt) : null;
  const daysUntilExpiry = expiresAt ? expiresAt.diff(dayjs(), 'day') : null;
  const expiryWarning = daysUntilExpiry !== null && daysUntilExpiry < 14;

  return (
    <div className={`card border-2 transition-all ${tenant.isActive ? 'border-gray-100' : 'border-gray-200 opacity-60'}`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-gray-800">{tenant.name}</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium uppercase ${PLAN_COLORS[tenant.plan]}`}>{tenant.plan}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${tenant.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
              {tenant.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            /{tenant.slug} · Prefix: {tenant.orderPrefix} · {tenant.currency}
          </p>
          {tenant.ownerName && (
            <p className="text-xs text-gray-500 mt-0.5">{tenant.ownerName}{tenant.ownerEmail ? ` · ${tenant.ownerEmail}` : ''}</p>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => onViewData(tenant)} title="View tenant data" className="p-1.5 rounded-lg hover:bg-purple-50 text-gray-400 hover:text-purple-600 transition-colors">
            <ExternalLink size={15} />
          </button>
          <button onClick={() => onManageUsers(tenant)} title="Manage users" className="p-1.5 rounded-lg hover:bg-indigo-50 text-gray-400 hover:text-indigo-600 transition-colors">
            <Users size={15} />
          </button>
          <button onClick={() => onCreateAdmin(tenant)} title="Create admin user" className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors">
            <UserPlus size={15} />
          </button>
          <button onClick={handleToggle} disabled={toggling} title={tenant.isActive ? 'Deactivate' : 'Activate'} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
            {tenant.isActive ? <ToggleRight size={18} className="text-green-500" /> : <ToggleLeft size={18} />}
          </button>
          <button onClick={() => onEdit(tenant)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-brand-500 transition-colors">
            <Pencil size={15} />
          </button>
          <button onClick={() => onDelete(tenant)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mt-3">
        <div className="bg-blue-50 rounded-xl p-3 text-center">
          <ShoppingBag size={16} className="text-blue-500 mx-auto mb-1" />
          <p className="text-lg font-bold text-blue-700">{tenant.orderCount ?? '—'}</p>
          <p className="text-xs text-blue-400">Orders</p>
        </div>
        <div className="bg-green-50 rounded-xl p-3 text-center">
          <Users size={16} className="text-green-500 mx-auto mb-1" />
          <p className="text-lg font-bold text-green-700">{tenant.userCount ?? '—'}</p>
          <p className="text-xs text-green-400">Users</p>
        </div>
        <div className="bg-orange-50 rounded-xl p-3 text-center">
          <Globe size={16} className="text-orange-400 mx-auto mb-1" />
          <p className="text-sm font-bold text-orange-700 truncate">
            {tenant.totalRevenue ? Number(tenant.totalRevenue).toLocaleString('en-IN') : '0'}
          </p>
          <p className="text-xs text-orange-400">{tenant.currency || 'NPR'} Revenue</p>
        </div>
      </div>

      {/* Health bar row */}
      <div className="mt-3 pt-3 border-t border-gray-50 space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-400">Last order</span>
          <span className="text-gray-600 font-medium">
            {tenant.lastOrderAt ? dayjs(tenant.lastOrderAt).fromNow() : 'Never'}
          </span>
        </div>
        {expiresAt && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400 flex items-center gap-1">
              {expiryWarning && <AlertTriangle size={11} className="text-amber-500" />}
              Plan expires
            </span>
            <span className={`font-medium ${expiryWarning ? 'text-amber-600' : 'text-gray-600'}`}>
              {expiresAt.format('MMM D, YYYY')}
            </span>
          </div>
        )}
        {tenant.totalDue > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">Due</span>
            <span className="text-xs font-semibold bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
              {tenant.currency || 'NPR'} {Number(tenant.totalDue).toLocaleString('en-IN')}
            </span>
          </div>
        )}
      </div>

      {tenant.notes && (
        <p className="text-xs text-gray-400 mt-3 pt-3 border-t border-gray-50 line-clamp-2">{tenant.notes}</p>
      )}
    </div>
  );
}

// ── Activity Log Item ─────────────────────────────────────────────────────────

function ActivityItem({ log }) {
  const dotColor = log.action === 'order.created' ? 'bg-green-400'
    : log.action === 'order.status_changed' ? 'bg-blue-400'
    : log.action === 'order.deleted' ? 'bg-red-400'
    : 'bg-gray-300';

  return (
    <div className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
      <div className={`w-2 h-2 rounded-full shrink-0 ${dotColor}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-700">
          <span className="font-medium">{log.userName || 'System'}</span>
          {' '}
          {log.action === 'order.created' && (
            <>created order <span className="font-mono text-xs bg-gray-100 px-1 py-0.5 rounded">{log.meta?.orderNumber}</span></>
          )}
          {log.action === 'order.status_changed' && (
            <>changed <span className="font-mono text-xs bg-gray-100 px-1 py-0.5 rounded">{log.meta?.orderNumber}</span> to <strong>{log.meta?.newStatus}</strong></>
          )}
          {log.action === 'order.deleted' && (
            <>cancelled order <span className="font-mono text-xs bg-gray-100 px-1 py-0.5 rounded">{log.meta?.orderNumber}</span></>
          )}
          {!['order.created', 'order.status_changed', 'order.deleted'].includes(log.action) && (
            <span className="text-gray-500">{log.action}</span>
          )}
        </p>
        {log.tenantId && (
          <p className="text-xs text-gray-400 mt-0.5">Tenant ID: {String(log.tenantId).slice(-6)}</p>
        )}
      </div>
      <p className="text-xs text-gray-400 shrink-0">{dayjs(log.createdAt).fromNow()}</p>
    </div>
  );
}

// ── SuperAdmin Page ───────────────────────────────────────────────────────────

export default function SuperAdmin() {
  const { user, logout, switchTenant } = useAuthStore();
  const navigate = useNavigate();

  const [tenants, setTenants]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [modal, setModal]         = useState(null);
  const [adminModal, setAdminModal] = useState(null);
  const [userModal, setUserModal] = useState(null);   // tenant object
  const [activeTab, setActiveTab] = useState('tenants');
  const [search, setSearch]       = useState('');
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  useEffect(() => { loadTenants(); }, []);

  useEffect(() => {
    if (activeTab === 'analytics' && !analytics) {
      loadAnalytics();
    }
  }, [activeTab]);

  async function loadTenants() {
    setLoading(true);
    try {
      const { data } = await api.get('/tenants');
      setTenants(data.tenants || []);
    } catch {
      toast.error('Could not load tenants');
    } finally {
      setLoading(false);
    }
  }

  async function loadAnalytics() {
    setAnalyticsLoading(true);
    try {
      const { data } = await api.get('/tenants/analytics');
      if (data.success) setAnalytics(data);
    } catch {
      toast.error('Could not load analytics');
    } finally {
      setAnalyticsLoading(false);
    }
  }

  async function handleToggle(id) {
    try {
      const { data } = await api.patch(`/tenants/${id}/toggle`);
      if (data.success) setTenants((prev) => prev.map((t) => (t._id === id ? { ...t, isActive: data.tenant.isActive } : t)));
    } catch { toast.error('Could not toggle tenant'); }
  }

  async function handleDelete(tenant) {
    if (!window.confirm(`Delete tenant "${tenant.name}"?\nThis will remove ALL its users and data.`)) return;
    try {
      const { data } = await api.delete(`/tenants/${tenant._id}`);
      if (data.success) {
        setTenants((prev) => prev.filter((t) => t._id !== tenant._id));
        toast.success('Tenant deleted');
      } else {
        toast.error(data.message || 'Cannot delete');
      }
    } catch (err) { toast.error(err.response?.data?.message || 'Error'); }
  }

  function handleSaved(tenant, isEdit) {
    setTenants((prev) => isEdit ? prev.map((t) => (t._id === tenant._id ? { ...t, ...tenant } : t)) : [{ ...tenant, orderCount: 0, userCount: 0, totalRevenue: 0 }, ...prev]);
  }

  function handleUserCountChanged(tenantId, delta) {
    setTenants((prev) => prev.map((t) =>
      t._id === tenantId ? { ...t, userCount: (t.userCount || 0) + delta } : t
    ));
  }

  async function handleViewData(tenant) {
    if (!tenant.isActive) {
      toast.error('Cannot view inactive tenant');
      return;
    }
    try {
      const data = await switchTenant(tenant._id);
      if (data.success) {
        navigate('/dashboard');
      } else {
        toast.error(data.message || 'Could not switch context');
      }
    } catch {
      toast.error('Could not switch to tenant');
    }
  }

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  const activeCount   = tenants.filter((t) => t.isActive).length;
  const totalOrders   = tenants.reduce((s, t) => s + (t.orderCount || 0), 0);
  const totalRevenue  = tenants.reduce((s, t) => s + (t.totalRevenue || 0), 0);
  const expiringSoon  = tenants.filter((t) => {
    if (!t.planExpiresAt) return false;
    return dayjs(t.planExpiresAt).diff(dayjs(), 'day') < 14;
  }).length;

  const filteredTenants = tenants.filter((t) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      t.name?.toLowerCase().includes(q) ||
      t.slug?.toLowerCase().includes(q) ||
      t.ownerName?.toLowerCase().includes(q) ||
      t.ownerEmail?.toLowerCase().includes(q)
    );
  });

  const TABS = [
    { key: 'tenants',   label: 'Tenants',   icon: Building2 },
    { key: 'analytics', label: 'Analytics', icon: TrendingUp },
    { key: 'activity',  label: 'Activity',  icon: Activity },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-2xl">🎂</div>
            <div>
              <div className="font-bold text-gray-800">Platform Admin</div>
              <div className="text-xs text-gray-400">Tenant Management</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-right">
              <p className="text-sm font-semibold text-gray-700">{user?.name}</p>
              <p className="text-xs text-purple-500 font-medium">Platform Owner</p>
            </div>
            <button onClick={handleLogout} className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
              <LogOut size={18} />
            </button>
          </div>
        </div>

        {/* Tab Bar */}
        <div className="max-w-6xl mx-auto px-4 flex gap-1 pb-0">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? 'border-brand-500 text-brand-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon size={15} /> {tab.label}
              </button>
            );
          })}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">

        {/* ── TENANTS TAB ─────────────────────────────────────────────────── */}
        {activeTab === 'tenants' && (
          <>
            {/* Stats summary */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
              {[
                { label: 'Total Tenants',    value: tenants.length,                              bg: 'bg-blue-50',   text: 'text-blue-700' },
                { label: 'Active Tenants',   value: activeCount,                                 bg: 'bg-green-50',  text: 'text-green-700' },
                { label: 'Total Orders',     value: totalOrders,                                 bg: 'bg-orange-50', text: 'text-orange-700' },
                { label: 'Platform Revenue', value: totalRevenue.toLocaleString('en-IN'),        bg: 'bg-purple-50', text: 'text-purple-700' },
                { label: 'Expiring Soon',    value: expiringSoon,                                bg: expiringSoon > 0 ? 'bg-amber-50' : 'bg-gray-50', text: expiringSoon > 0 ? 'text-amber-700' : 'text-gray-400' },
              ].map((s) => (
                <div key={s.label} className={`${s.bg} rounded-2xl p-4`}>
                  <p className={`text-2xl font-bold ${s.text}`}>{s.value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Tenant list */}
            <div>
              <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
                <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <Building2 size={20} className="text-brand-500" /> Tenants
                </h2>
                <div className="flex items-center gap-2 flex-1 max-w-xs">
                  <div className="relative flex-1">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      className="input pl-8 py-1.5 text-sm"
                      placeholder="Search by name, slug, owner…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                  <button onClick={loadTenants} className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-500 transition-colors" title="Refresh">
                    <RefreshCw size={15} />
                  </button>
                  <button onClick={() => setModal('new')} className="btn-primary flex items-center gap-2 text-sm whitespace-nowrap">
                    <Plus size={16} /> Add Tenant
                  </button>
                </div>
              </div>

              {loading ? (
                <div className="text-center py-16 text-gray-400">Loading…</div>
              ) : filteredTenants.length === 0 ? (
                <div className="card border-dashed border-2 border-gray-200 text-center py-12">
                  <Building2 size={32} className="text-gray-300 mx-auto mb-3" />
                  {search ? (
                    <p className="text-gray-400">No tenants match "{search}"</p>
                  ) : (
                    <>
                      <p className="text-gray-400 mb-4">No tenants yet. Create your first tenant to get started.</p>
                      <button onClick={() => setModal('new')} className="btn-primary inline-flex items-center gap-2">
                        <Plus size={16} /> Add First Tenant
                      </button>
                    </>
                  )}
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredTenants.map((t) => (
                    <TenantCard
                      key={t._id}
                      tenant={t}
                      onEdit={(t) => setModal(t)}
                      onDelete={handleDelete}
                      onToggle={handleToggle}
                      onCreateAdmin={(t) => setAdminModal(t)}
                      onViewData={handleViewData}
                      onManageUsers={(t) => setUserModal(t)}
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* ── ANALYTICS TAB ───────────────────────────────────────────────── */}
        {activeTab === 'analytics' && (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <TrendingUp size={20} className="text-brand-500" /> Platform Analytics
              </h2>
              <button onClick={loadAnalytics} className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-500 transition-colors" title="Refresh">
                <RefreshCw size={15} />
              </button>
            </div>

            {analyticsLoading ? (
              <div className="text-center py-16 text-gray-400">Loading analytics…</div>
            ) : !analytics ? (
              <div className="text-center py-16 text-gray-400">No analytics data.</div>
            ) : (
              <>
                {/* Monthly Revenue Chart */}
                <div className="card">
                  <h3 className="text-base font-semibold text-gray-700 mb-4">Platform Revenue — Last 6 Months</h3>
                  <ResponsiveContainer width="100%" height={240}>
                    <LineChart data={analytics.monthlyRevenue} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                      <YAxis yAxisId="revenue" tick={{ fontSize: 11 }} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} width={44} />
                      <YAxis yAxisId="orders" orientation="right" tick={{ fontSize: 11 }} width={32} />
                      <Tooltip
                        formatter={(value, name) =>
                          name === 'revenue'
                            ? [`NPR ${Number(value).toLocaleString('en-IN')}`, 'Revenue']
                            : [value, 'Orders']
                        }
                      />
                      <Bar yAxisId="orders" dataKey="orders" fill="#e0e7ff" radius={[3, 3, 0, 0]} />
                      <Line yAxisId="revenue" type="monotone" dataKey="revenue" stroke="#f97316" strokeWidth={2.5} dot activeDot={{ r: 5 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Per-Tenant Revenue */}
                {analytics.tenantRevenue?.length > 0 && (
                  <div className="card">
                    <h3 className="text-base font-semibold text-gray-700 mb-4">Revenue by Tenant</h3>
                    <ResponsiveContainer width="100%" height={Math.max(180, analytics.tenantRevenue.length * 44)}>
                      <BarChart data={analytics.tenantRevenue} layout="vertical" margin={{ left: 0, right: 60 }}>
                        <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
                        <YAxis type="category" dataKey="tenantName" width={100} tick={{ fontSize: 11 }} />
                        <Tooltip formatter={(v) => [`NPR ${Number(v).toLocaleString('en-IN')}`, 'Revenue']} />
                        <Bar dataKey="revenue" fill="#f97316" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>

                    {/* Tenant stats table */}
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
                            {tr.due > 0 && (
                              <span className="text-red-500 font-medium">NPR {Number(tr.due).toLocaleString('en-IN')} due</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent Activity preview */}
                {analytics.recentActivity?.length > 0 && (
                  <div className="card">
                    <h3 className="text-base font-semibold text-gray-700 mb-3">Recent Platform Activity</h3>
                    <div className="divide-y divide-gray-50">
                      {analytics.recentActivity.map((log) => (
                        <ActivityItem key={log._id} log={log} />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* ── ACTIVITY TAB ────────────────────────────────────────────────── */}
        {activeTab === 'activity' && (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <Activity size={20} className="text-brand-500" /> Platform Activity
              </h2>
              <button
                onClick={() => {
                  setAnalytics(null);
                  loadAnalytics();
                }}
                className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-500 transition-colors"
                title="Refresh"
              >
                <RefreshCw size={15} />
              </button>
            </div>

            {analyticsLoading ? (
              <div className="text-center py-16 text-gray-400">Loading activity…</div>
            ) : !analytics ? (
              <div className="text-center py-16 text-gray-400">
                <button onClick={loadAnalytics} className="btn-secondary">Load Activity</button>
              </div>
            ) : analytics.recentActivity?.length === 0 ? (
              <div className="card text-center py-12 text-gray-400">No activity recorded yet.</div>
            ) : (
              <div className="card divide-y divide-gray-50">
                {analytics.recentActivity.map((log) => (
                  <ActivityItem key={log._id} log={log} />
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {/* Modals */}
      {modal && (
        <TenantModal
          tenant={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      )}

      {adminModal && (
        <CreateAdminModal
          tenant={adminModal}
          onClose={() => setAdminModal(null)}
          onCreated={() => loadTenants()}
        />
      )}

      {userModal && (
        <UserManagerModal
          tenant={userModal}
          onClose={() => setUserModal(null)}
          onUserCountChanged={(delta) => handleUserCountChanged(userModal._id, delta)}
        />
      )}
    </div>
  );
}
