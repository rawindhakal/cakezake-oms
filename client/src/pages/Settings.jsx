import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, X, ChefHat, Package, KeyRound, Eye, EyeOff, Tag, UserPlus, ShieldCheck, User, Mail, Send, FileSpreadsheet, FileJson, Upload } from 'lucide-react';
import api from '../lib/api';
import useSettingsStore from '../store/settingsStore';
import useAuthStore from '../store/authStore';

// Fallback — real values come from settingsStore at runtime
const CITIES_FALLBACK = ['Birtamode', 'Damak', 'Dharan', 'Biratnagar', 'Itahari', 'Jhapa', 'Kathmandu', 'Other'];

const EMPTY_OUTLET = {
  name: '',
  city: '',
  address: '',
  phone: '',
  isActive: true,
  kitchen:  { label: 'Kitchen', responsible: '', notes: '' },
  prepArea: { label: 'Order Preparation Area', responsible: '', notes: '' },
};

// ─── Outlet Modal ─────────────────────────────────────────────────────────────

function OutletModal({ outlet, onClose, onSaved }) {
  const [form, setForm] = useState(outlet ? structuredClone(outlet) : structuredClone(EMPTY_OUTLET));
  const [saving, setSaving] = useState(false);
  const isEdit = !!outlet?._id;

  function set(path, value) {
    setForm((prev) => {
      const next = structuredClone(prev);
      const keys = path.split('.');
      let obj = next;
      for (let i = 0; i < keys.length - 1; i++) obj = obj[keys[i]];
      obj[keys[keys.length - 1]] = value;
      return next;
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.city.trim()) {
      toast.error('Outlet name and city are required');
      return;
    }

    setSaving(true);
    try {
      const { data } = isEdit
        ? await api.put(`/outlets/${outlet._id}`, form)
        : await api.post('/outlets', form);

      if (data.success) {
        toast.success(isEdit ? 'Outlet updated' : 'Outlet created');
        onSaved(data.outlet, isEdit);
        onClose();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error saving outlet');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-5 border-b border-gray-100">
          <h2 className="text-lg font-bold">{isEdit ? 'Edit Outlet' : 'New Outlet'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">

          {/* Basic info */}
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Outlet Info</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="label">Outlet Name *</label>
                <input className="input" placeholder="e.g. CakeZake Birtamode" value={form.name} onChange={(e) => set('name', e.target.value)} />
              </div>
              <div>
                <label className="label">City *</label>
                <select className="input" value={form.city} onChange={(e) => set('city', e.target.value)}>
                  <option value="">Select city</option>
                  {(useSettingsStore.getState().getValues('delivery_cities', CITIES_FALLBACK)).map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Phone</label>
                <input className="input" placeholder="98XXXXXXXX" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
              </div>
              <div className="col-span-2">
                <label className="label">Address</label>
                <input className="input" placeholder="Street / landmark" value={form.address} onChange={(e) => set('address', e.target.value)} />
              </div>
            </div>
          </div>

          {/* Kitchen */}
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <ChefHat size={18} className="text-orange-500" />
              <h3 className="font-semibold text-orange-700">Kitchen</h3>
              <span className="text-xs text-orange-400">(Cake preparation)</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Area Label</label>
                <input className="input bg-white" value={form.kitchen.label} onChange={(e) => set('kitchen.label', e.target.value)} />
              </div>
              <div>
                <label className="label">Responsible Person</label>
                <input className="input bg-white" placeholder="Head chef / baker name" value={form.kitchen.responsible} onChange={(e) => set('kitchen.responsible', e.target.value)} />
              </div>
              <div className="col-span-2">
                <label className="label">Notes</label>
                <input className="input bg-white" placeholder="Equipment, capacity, shift notes..." value={form.kitchen.notes} onChange={(e) => set('kitchen.notes', e.target.value)} />
              </div>
            </div>
          </div>

          {/* Prep Area */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Package size={18} className="text-blue-500" />
              <h3 className="font-semibold text-blue-700">Order Preparation Area</h3>
              <span className="text-xs text-blue-400">(Flowers, gifts, chocolates, etc.)</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Area Label</label>
                <input className="input bg-white" value={form.prepArea.label} onChange={(e) => set('prepArea.label', e.target.value)} />
              </div>
              <div>
                <label className="label">Responsible Person</label>
                <input className="input bg-white" placeholder="Team lead name" value={form.prepArea.responsible} onChange={(e) => set('prepArea.responsible', e.target.value)} />
              </div>
              <div className="col-span-2">
                <label className="label">Notes</label>
                <input className="input bg-white" placeholder="Capacity, working hours..." value={form.prepArea.notes} onChange={(e) => set('prepArea.notes', e.target.value)} />
              </div>
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary min-w-[120px]">
              {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Outlet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Outlet Card ──────────────────────────────────────────────────────────────

function OutletCard({ outlet, onEdit, onDelete, onToggle }) {
  const [toggling, setToggling] = useState(false);

  async function handleToggle() {
    setToggling(true);
    await onToggle(outlet._id);
    setToggling(false);
  }

  return (
    <div className={`card border-2 transition-colors ${outlet.isActive ? 'border-gray-100' : 'border-gray-200 opacity-60'}`}>
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-gray-800">{outlet.name}</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${outlet.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
              {outlet.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">
            {outlet.city}{outlet.address ? ` · ${outlet.address}` : ''}{outlet.phone ? ` · ${outlet.phone}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={handleToggle} disabled={toggling} title={outlet.isActive ? 'Deactivate' : 'Activate'} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600">
            {outlet.isActive ? <ToggleRight size={20} className="text-green-500" /> : <ToggleLeft size={20} />}
          </button>
          <button onClick={() => onEdit(outlet)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600">
            <Pencil size={16} />
          </button>
          <button onClick={() => onDelete(outlet)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500">
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Areas */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-orange-50 border border-orange-100 rounded-xl p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <ChefHat size={15} className="text-orange-500" />
            <span className="text-xs font-bold text-orange-700 uppercase tracking-wide">
              {outlet.kitchen?.label || 'Kitchen'}
            </span>
          </div>
          <p className="text-xs text-orange-500 mb-1">Cake preparation</p>
          {outlet.kitchen?.responsible
            ? <p className="text-sm font-medium text-gray-700">{outlet.kitchen.responsible}</p>
            : <p className="text-sm text-gray-400 italic">No one assigned</p>}
          {outlet.kitchen?.notes && (
            <p className="text-xs text-gray-500 mt-1.5 border-t border-orange-100 pt-1.5">{outlet.kitchen.notes}</p>
          )}
        </div>

        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <Package size={15} className="text-blue-500" />
            <span className="text-xs font-bold text-blue-700 uppercase tracking-wide">
              {outlet.prepArea?.label || 'Prep Area'}
            </span>
          </div>
          <p className="text-xs text-blue-500 mb-1">Flowers · Gifts · Chocolates</p>
          {outlet.prepArea?.responsible
            ? <p className="text-sm font-medium text-gray-700">{outlet.prepArea.responsible}</p>
            : <p className="text-sm text-gray-400 italic">No one assigned</p>}
          {outlet.prepArea?.notes && (
            <p className="text-xs text-gray-500 mt-1.5 border-t border-blue-100 pt-1.5">{outlet.prepArea.notes}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Dynamic List Editor ──────────────────────────────────────────────────────

const SETTING_DEFS = [
  { key: 'delivery_cities', label: 'Delivery Cities',     icon: '📍' },
  { key: 'cake_flavors',    label: 'Cake Flavors',        icon: '🎂' },
  { key: 'cake_sizes',      label: 'Cake Sizes / Weights',icon: '⚖️' },
  { key: 'flower_types',    label: 'Flower Types',        icon: '🌸' },
  { key: 'gift_types',      label: 'Gift Types',          icon: '🎁' },
];

function ListEditor({ label, icon, values, onSave, saving }) {
  const [newItem, setNewItem] = useState('');
  const [editIdx, setEditIdx] = useState(null);
  const [editVal, setEditVal] = useState('');

  function add() {
    const v = newItem.trim();
    if (!v) return;
    if (values.includes(v)) { toast.error('Already exists'); return; }
    onSave([...values, v]);
    setNewItem('');
  }

  function remove(i) {
    onSave(values.filter((_, idx) => idx !== i));
  }

  function commitEdit(i) {
    const v = editVal.trim();
    if (!v) return;
    const next = [...values];
    next[i] = v;
    onSave(next);
    setEditIdx(null);
  }

  return (
    <div className="border border-gray-100 rounded-xl p-4">
      <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
        <span>{icon}</span> {label}
        <span className="ml-auto text-xs text-gray-400 font-normal">{values.length} items</span>
      </h3>
      <div className="flex flex-wrap gap-2 mb-3 min-h-[32px]">
        {values.map((v, i) => (
          editIdx === i ? (
            <div key={i} className="flex items-center gap-1">
              <input
                autoFocus
                value={editVal}
                onChange={(e) => setEditVal(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') commitEdit(i); if (e.key === 'Escape') setEditIdx(null); }}
                className="border border-brand-300 rounded-lg px-2 py-1 text-sm w-32 focus:outline-none focus:ring-2 focus:ring-brand-300"
              />
              <button onClick={() => commitEdit(i)} className="text-green-500 hover:text-green-600 p-1"><Tag size={12} /></button>
              <button onClick={() => setEditIdx(null)} className="text-gray-400 hover:text-gray-600 p-1"><X size={12} /></button>
            </div>
          ) : (
            <span key={i} className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-700 rounded-full px-3 py-1 text-sm">
              {v}
              <button onClick={() => { setEditIdx(i); setEditVal(v); }} className="text-gray-400 hover:text-brand-500 transition-colors"><Pencil size={10} /></button>
              <button onClick={() => remove(i)} className="text-gray-400 hover:text-red-500 transition-colors"><X size={10} /></button>
            </span>
          )
        ))}
        {values.length === 0 && <p className="text-sm text-gray-400 italic">No items yet.</p>}
      </div>
      <div className="flex gap-2">
        <input
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder={`Add ${label.toLowerCase()}…`}
          className="input flex-1 text-sm py-1.5"
        />
        <button onClick={add} disabled={saving || !newItem.trim()}
          className="flex items-center gap-1 text-sm bg-brand-500 text-white px-3 py-1.5 rounded-lg hover:bg-brand-600 disabled:opacity-40 transition-colors">
          <Plus size={14} /> Add
        </button>
      </div>
    </div>
  );
}

function DynamicListSettings() {
  const { settings, fetchSettings, updateSetting } = useSettingsStore();
  const [localSettings, setLocalSettings] = useState({});
  const [savingKey, setSavingKey] = useState(null);

  useEffect(() => { fetchSettings(); }, []);

  useEffect(() => {
    const next = {};
    SETTING_DEFS.forEach(({ key }) => {
      next[key] = settings[key]?.values || [];
    });
    setLocalSettings(next);
  }, [settings]);

  async function handleSave(key, newValues) {
    setSavingKey(key);
    try {
      await updateSetting(key, newValues);
      setLocalSettings((prev) => ({ ...prev, [key]: newValues }));
      toast.success('Saved');
    } catch {
      toast.error('Failed to save');
    } finally {
      setSavingKey(null);
    }
  }

  return (
    <div className="card">
      <h2 className="font-semibold text-lg mb-1">Dynamic Options</h2>
      <p className="text-sm text-gray-400 mb-4">Manage dropdown values shown in order forms. Changes apply immediately.</p>
      <div className="space-y-4">
        {SETTING_DEFS.map((def) => (
          <ListEditor
            key={def.key}
            label={def.label}
            icon={def.icon}
            values={localSettings[def.key] || []}
            saving={savingKey === def.key}
            onSave={(newValues) => handleSave(def.key, newValues)}
          />
        ))}
      </div>
    </div>
  );
}

// ─── User Management ─────────────────────────────────────────────────────────

const ROLE_LABELS = { super_admin: 'Super Admin', staff: 'Staff', order_processor: 'Order Processor', rider: 'Rider' };
const ROLE_COLORS = { super_admin: 'bg-purple-100 text-purple-700', staff: 'bg-blue-100 text-blue-600', order_processor: 'bg-orange-100 text-orange-700', rider: 'bg-green-100 text-green-700' };

function UserModal({ user, outlets, onClose, onSaved }) {
  const isEdit = !!user?._id;
  const [form, setForm] = useState({
    username:        user?.username        || '',
    name:            user?.name            || '',
    password:        '',
    role:            user?.role            || 'staff',
    assignedOutlets: user?.assignedOutlets?.map((o) => o._id || o) || [],
    isActive:        user?.isActive ?? true,
  });
  const [showPw, setShowPw] = useState(false);
  const [saving, setSaving] = useState(false);

  function toggleOutlet(id) {
    setForm((f) => ({
      ...f,
      assignedOutlets: f.assignedOutlets.includes(id)
        ? f.assignedOutlets.filter((x) => x !== id)
        : [...f.assignedOutlets, id],
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.username.trim()) { toast.error('Name and username are required'); return; }
    if (!isEdit && !form.password) { toast.error('Password is required'); return; }
    if (form.password && form.password.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    setSaving(true);
    try {
      const payload = { ...form };
      if (!payload.password) delete payload.password;
      let data;
      if (isEdit) {
        ({ data } = await api.put(`/users/${user._id}`, payload));
        if (form.password) await api.post(`/users/${user._id}/reset-password`, { newPassword: form.password });
      } else {
        ({ data } = await api.post('/users', payload));
      }
      if (data.success) {
        toast.success(isEdit ? 'User updated' : 'User created');
        onSaved(data.user, isEdit);
        onClose();
      } else { toast.error(data.message || 'Failed'); }
    } catch (err) { toast.error(err.response?.data?.message || 'Error'); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="font-semibold text-lg">{isEdit ? 'Edit User' : 'New User'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Full Name *</label>
              <input className="input" value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="John Doe" />
            </div>
            <div>
              <label className="label">Username *</label>
              <input className="input" value={form.username} onChange={(e) => setForm(f => ({ ...f, username: e.target.value.toLowerCase() }))} placeholder="johndoe" disabled={isEdit} />
            </div>
          </div>
          <div>
            <label className="label">{isEdit ? 'New Password (leave blank to keep)' : 'Password *'}</label>
            <div className="relative">
              <input type={showPw ? 'text' : 'password'} className="input pr-10" value={form.password}
                onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Min. 6 characters" />
              <button type="button" onClick={() => setShowPw(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>
          <div>
            <label className="label">Role</label>
            <select className="input" value={form.role} onChange={(e) => setForm(f => ({ ...f, role: e.target.value }))}>
              <option value="staff">Staff</option>
              <option value="order_processor">Order Processor</option>
              <option value="rider">Rider</option>
              <option value="super_admin">Super Admin</option>
            </select>
          </div>
          {(form.role === 'staff' || form.role === 'order_processor' || form.role === 'rider') && outlets.length > 0 && (
            <div>
              <label className="label">Assigned Outlets</label>
              <div className="space-y-2 mt-1">
                {outlets.map((o) => (
                  <label key={o._id} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" className="rounded"
                      checked={form.assignedOutlets.includes(o._id)}
                      onChange={() => toggleOutlet(o._id)} />
                    <span className="text-sm text-gray-700">{o.name} <span className="text-gray-400 text-xs">· {o.city}</span></span>
                  </label>
                ))}
              </div>
            </div>
          )}
          {isEdit && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm(f => ({ ...f, isActive: e.target.checked }))} />
              <span className="text-sm text-gray-700">Account active</span>
            </label>
          )}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create User'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function UserManagement({ outlets }) {
  const { user: currentUser } = useAuthStore();
  const [users, setUsers]     = useState([]);
  const [modal, setModal]     = useState(null);

  useEffect(() => { loadUsers(); }, []);

  async function loadUsers() {
    try {
      const { data } = await api.get('/users');
      setUsers(data.users);
    } catch { toast.error('Could not load users'); }
  }

  async function handleDelete(u) {
    if (!window.confirm(`Delete user "${u.name}"?`)) return;
    try {
      await api.delete(`/users/${u._id}`);
      setUsers((prev) => prev.filter((x) => x._id !== u._id));
      toast.success('User deleted');
    } catch (err) { toast.error(err.response?.data?.message || 'Error'); }
  }

  function handleSaved(user, isEdit) {
    setUsers((prev) => isEdit ? prev.map((u) => (u._id === user._id ? user : u)) : [...prev, user]);
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-semibold text-lg flex items-center gap-2"><ShieldCheck size={18} className="text-brand-500" /> User Management</h2>
          <p className="text-sm text-gray-400 mt-0.5">Manage staff accounts and outlet assignments.</p>
        </div>
        <button onClick={() => setModal('new')} className="btn-primary flex items-center gap-2 text-sm">
          <UserPlus size={15} /> Add User
        </button>
      </div>

      <div className="space-y-2">
        {users.map((u) => (
          <div key={u._id} className={`flex items-center gap-3 p-3 rounded-xl border ${!u.isActive ? 'opacity-50 bg-gray-50 border-gray-100' : 'border-gray-200'}`}>
            <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0">
              <User size={16} className="text-brand-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-gray-800 text-sm">{u.name}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[u.role]}`}>{ROLE_LABELS[u.role]}</span>
                {!u.isActive && <span className="text-xs bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full">Disabled</span>}
                {u._id === currentUser?.id && <span className="text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded-full">You</span>}
              </div>
              <p className="text-xs text-gray-400 mt-0.5">@{u.username}</p>
              {u.assignedOutlets?.length > 0 && (
                <p className="text-xs text-brand-600 mt-0.5">{u.assignedOutlets.map((o) => o.name).join(', ')}</p>
              )}
            </div>
            <div className="flex gap-1 flex-shrink-0">
              <button onClick={() => setModal(u)} className="p-1.5 text-gray-400 hover:text-brand-500 rounded-lg hover:bg-brand-50 transition-colors">
                <Pencil size={14} />
              </button>
              {u._id !== currentUser?.id && (
                <button onClick={() => handleDelete(u)} className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors">
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </div>
        ))}
        {users.length === 0 && <p className="text-sm text-gray-400 italic text-center py-4">No users yet.</p>}
      </div>

      {modal && (
        <UserModal
          user={modal === 'new' ? null : modal}
          outlets={outlets}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}

// ─── SparrowSMS Settings ──────────────────────────────────────────────────────

function SmsSettings() {
  const [form, setForm]         = useState({ enabled: false, senderId: 'CakeZake', token: '' });
  const [hasToken, setHasToken] = useState(false);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [testing, setTesting]   = useState(false);
  const [testPhone, setTestPhone] = useState('');
  const [showToken, setShowToken] = useState(false);

  useEffect(() => {
    api.get('/sms-config')
      .then(({ data }) => {
        if (data.config) {
          setForm((f) => ({ ...f, enabled: data.config.enabled, senderId: data.config.senderId || 'CakeZake' }));
          setHasToken(!!data.config.hasToken);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function set(field, value) { setForm((f) => ({ ...f, [field]: value })); }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await api.put('/sms-config', form);
      setHasToken(!!data.config?.hasToken);
      setForm((f) => ({ ...f, token: '' }));
      toast.success('SMS settings saved');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    if (!testPhone.trim()) return toast.error('Enter a phone number to test');
    setTesting(true);
    try {
      await api.post('/sms-config/test', { phone: testPhone.trim() });
      toast.success('Test SMS sent!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Test failed');
    } finally {
      setTesting(false);
    }
  }

  if (loading) return null;

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-lg flex items-center gap-2">
          <Send size={18} className="text-brand-500" /> SparrowSMS
        </h2>
        <button
          type="button"
          onClick={() => set('enabled', !form.enabled)}
          className={`flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-lg border transition-colors ${
            form.enabled ? 'border-green-400 bg-green-50 text-green-700' : 'border-gray-200 text-gray-400'
          }`}
        >
          {form.enabled ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
          {form.enabled ? 'Enabled' : 'Disabled'}
        </button>
      </div>
      <p className="text-sm text-gray-500 mb-5">
        Send automated SMS confirmations and reminders via SparrowSMS Nepal.
        Get your token at{' '}
        <a href="https://sparrowsms.com" target="_blank" rel="noopener noreferrer" className="text-brand-500 underline">sparrowsms.com</a>.
      </p>

      <form onSubmit={handleSave} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">API Token *</label>
            <div className="relative">
              <input
                type={showToken ? 'text' : 'password'}
                className="input pr-10"
                placeholder={hasToken ? '(token saved — enter new to replace)' : 'Your SparrowSMS API token'}
                value={form.token}
                onChange={(e) => set('token', e.target.value)}
              />
              <button type="button" onClick={() => setShowToken((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                {showToken ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            {hasToken && <p className="text-xs text-green-600 mt-1">✓ Token saved</p>}
          </div>
          <div>
            <label className="label">Sender ID</label>
            <input
              className="input"
              placeholder="CakeZake"
              value={form.senderId}
              onChange={(e) => set('senderId', e.target.value)}
            />
            <p className="text-xs text-gray-400 mt-1">Max 11 characters, no spaces.</p>
          </div>
        </div>

        <div className="flex gap-3 pt-2 flex-wrap">
          <div className="flex gap-2 flex-1 min-w-[200px]">
            <input
              className="input flex-1"
              placeholder="Test phone: 98XXXXXXXX"
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
            />
            <button type="button" onClick={handleTest} disabled={testing} className="btn-secondary text-sm whitespace-nowrap">
              {testing ? 'Sending…' : 'Send Test'}
            </button>
          </div>
          <button type="submit" disabled={saving} className="btn-primary text-sm">
            {saving ? 'Saving…' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Email Notifications ──────────────────────────────────────────────────────

function EmailNotifications() {
  const DEFAULTS = { enabled: false, adminEmail: '', fromName: 'CakeZake Orders', fromEmail: '', host: '', port: 587, secure: false, user: '', pass: '' };
  const [form, setForm]       = useState(DEFAULTS);
  const [hasPass, setHasPass] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [testing, setTesting] = useState(false);
  const [showPass, setShowPass] = useState(false);

  useEffect(() => {
    api.get('/email-config')
      .then(({ data }) => {
        if (data.config) {
          const { _id, __v, hasPass: hp, ...fields } = data.config;
          setForm((f) => ({ ...f, ...fields, pass: '' }));
          setHasPass(!!hp);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const { data: res } = await api.put('/email-config', form);
      const saved = res.config?.hasPass ?? (!!form.pass || hasPass);
      setHasPass(saved);
      setForm((f) => ({ ...f, pass: '' }));
      toast.success('Email settings saved');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    if (!form.host || !form.user) {
      return toast.error('Fill in host and username first');
    }
    if (!form.pass && !hasPass) {
      return toast.error('Enter and save a password first');
    }
    setTesting(true);
    try {
      await api.post('/email-config/test', form);
      toast.success('Test email sent! Check your inbox.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Test failed');
    } finally {
      setTesting(false);
    }
  }

  if (loading) return null;

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-lg flex items-center gap-2">
          <Mail size={18} className="text-brand-500" /> Email Notifications
        </h2>
        <button
          type="button"
          onClick={() => set('enabled', !form.enabled)}
          className={`flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-lg border transition-colors ${
            form.enabled ? 'border-green-400 bg-green-50 text-green-700' : 'border-gray-200 text-gray-400'
          }`}
        >
          {form.enabled ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
          {form.enabled ? 'Enabled' : 'Disabled'}
        </button>
      </div>
      <p className="text-sm text-gray-500 mb-5">
        Sends an email to the admin whenever a new order is placed.
      </p>

      <form onSubmit={handleSave} className="space-y-4">
        {/* Admin & From */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Admin Email (receives alerts) *</label>
            <input className="input" type="email" placeholder="admin@cakezake.com" value={form.adminEmail} onChange={(e) => set('adminEmail', e.target.value)} />
          </div>
          <div>
            <label className="label">From Name</label>
            <input className="input" placeholder="CakeZake Orders" value={form.fromName} onChange={(e) => set('fromName', e.target.value)} />
          </div>
          <div>
            <label className="label">From Email</label>
            <input className="input" type="email" placeholder="orders@cakezake.com" value={form.fromEmail} onChange={(e) => set('fromEmail', e.target.value)} />
          </div>
        </div>

        {/* SMTP */}
        <div className="border-t border-gray-100 pt-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">SMTP Settings</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">SMTP Host *</label>
              <input className="input" placeholder="smtp.gmail.com" value={form.host} onChange={(e) => set('host', e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Port</label>
                <input className="input" type="number" value={form.port} onChange={(e) => set('port', e.target.value)} />
              </div>
              <div className="flex flex-col justify-end pb-0.5">
                <label className="label">SSL/TLS</label>
                <button
                  type="button"
                  onClick={() => set('secure', !form.secure)}
                  className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg border transition-colors ${
                    form.secure ? 'border-brand-400 bg-brand-50 text-brand-700' : 'border-gray-200 text-gray-400'
                  }`}
                >
                  {form.secure ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                  {form.secure ? 'SSL (465)' : 'TLS (587)'}
                </button>
              </div>
            </div>
            <div>
              <label className="label">Username / Email *</label>
              <input className="input" placeholder="your@gmail.com" value={form.user} onChange={(e) => set('user', e.target.value)} />
            </div>
            <div>
              <label className="label">Password / App Password *</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  className="input pr-10"
                  placeholder={hasPass ? '(unchanged — enter new to replace)' : 'SMTP password'}
                  value={form.pass}
                  onChange={(e) => set('pass', e.target.value)}
                />
                <button type="button" onClick={() => setShowPass((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1">For Gmail use an App Password, not your account password.</p>
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={handleTest}
            disabled={testing}
            className="flex items-center gap-2 btn-secondary text-sm"
          >
            <Send size={14} /> {testing ? 'Sending…' : 'Send Test Email'}
          </button>
          <button type="submit" disabled={saving} className="btn-primary text-sm">
            {saving ? 'Saving…' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Settings Page ────────────────────────────────────────────────────────────

export default function Settings() {
  const [outlets, setOutlets] = useState([]);
  const [modal, setModal]     = useState(null);
  const [currentPw, setCurrentPw]   = useState('');
  const [newPw, setNewPw]           = useState('');
  const [confirmPw, setConfirmPw]   = useState('');
  const [showPw, setShowPw]         = useState(false);
  const [changing, setChanging]     = useState(false);
  const [exporting, setExporting]   = useState(false);
  const [exportingJson, setExportingJson] = useState(false);
  const [importing, setImporting]   = useState(false);
  const importFileRef = useRef(null);
  const user = useAuthStore((s) => s.user);

  useEffect(() => { loadOutlets(); }, []);

  async function loadOutlets() {
    try {
      const { data } = await api.get('/outlets');
      setOutlets(data.outlets);
    } catch { toast.error('Could not load outlets'); }
  }

  function handleSaved(outlet, isEdit) {
    setOutlets((prev) =>
      isEdit ? prev.map((o) => (o._id === outlet._id ? outlet : o)) : [...prev, outlet]
    );
  }

  async function handleToggle(id) {
    try {
      const { data } = await api.patch(`/outlets/${id}/toggle`);
      if (data.success) setOutlets((prev) => prev.map((o) => (o._id === id ? data.outlet : o)));
    } catch { toast.error('Could not update outlet'); }
  }

  async function handleDelete(outlet) {
    if (!window.confirm(`Delete "${outlet.name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/outlets/${outlet._id}`);
      setOutlets((prev) => prev.filter((o) => o._id !== outlet._id));
      toast.success('Outlet deleted');
    } catch { toast.error('Could not delete outlet'); }
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    if (newPw.length < 6) { toast.error('New password must be at least 6 characters'); return; }
    if (newPw !== confirmPw) { toast.error('Passwords do not match'); return; }
    setChanging(true);
    try {
      const { data } = await api.post('/auth/change-password', { currentPassword: currentPw, newPassword: newPw });
      if (data.success) {
        toast.success('Password changed');
        setCurrentPw(''); setNewPw(''); setConfirmPw('');
      } else { toast.error(data.message || 'Failed'); }
    } catch (err) { toast.error(err.response?.data?.message || 'Error'); }
    finally { setChanging(false); }
  }

  async function blobErrorMessage(data) {
    if (!(data instanceof Blob)) return null;
    try {
      const text = await data.text();
      const j = JSON.parse(text);
      return j.message || text || null;
    } catch {
      return null;
    }
  }

  async function handleExport() {
    setExporting(true);
    try {
      const res = await api.get('/orders/export', { responseType: 'blob' });
      if (res.data?.type === 'application/json' || String(res.headers['content-type'] || '').includes('application/json')) {
        const msg = await blobErrorMessage(res.data);
        toast.error(msg || 'Export failed');
        return;
      }
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cakezake-orders-${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Spreadsheet downloaded');
    } catch (err) {
      const msg = err.response?.data ? await blobErrorMessage(err.response.data) : null;
      toast.error(msg || err.response?.data?.message || 'Export failed');
    } finally {
      setExporting(false);
    }
  }

  async function handleExportJsonBackup() {
    setExportingJson(true);
    try {
      const { data } = await api.get('/orders/export', { params: { format: 'json' } });
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cakezake-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Full backup downloaded');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Backup export failed');
    } finally {
      setExportingJson(false);
    }
  }

  async function handleImportBackup(ev) {
    const file = ev.target.files?.[0];
    ev.target.value = '';
    if (!file) return;
    let payload;
    try {
      const text = await file.text();
      payload = JSON.parse(text);
    } catch {
      toast.error('Invalid JSON file');
      return;
    }
    const body = Array.isArray(payload) ? payload : payload.orders;
    if (!Array.isArray(body)) {
      toast.error('Backup must be an array of orders or { orders: [...] }');
      return;
    }
    if (!window.confirm(`Import ${body.length} order(s)? Existing records with the same _id or order number will be replaced.`)) {
      return;
    }
    setImporting(true);
    try {
      const { data } = await api.post('/orders/backup/import', payload);
      if (data.merged > 0) {
        toast.success(`Imported / updated ${data.merged} order(s)${data.failed ? ` (${data.failed} row(s) skipped or failed)` : ''}`);
      } else {
        toast.error(data.message || 'Nothing was imported');
      }
      if (data.errors?.length) {
        console.warn('Import issues', data.errors);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Import failed');
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      {/* Outlets */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-lg font-semibold">Outlets</h2>
            <p className="text-sm text-gray-500">Each outlet has its own Kitchen and Order Prep Area.</p>
          </div>
          <button onClick={() => setModal('new')} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> Add Outlet
          </button>
        </div>

        {outlets.length === 0 ? (
          <div className="card border-dashed border-2 border-gray-200 text-center py-10">
            <p className="text-gray-400 mb-3">No outlets yet.</p>
            <button onClick={() => setModal('new')} className="btn-primary inline-flex items-center gap-2">
              <Plus size={16} /> Add your first outlet
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {outlets.map((outlet) => (
              <OutletCard
                key={outlet._id}
                outlet={outlet}
                onEdit={(o) => setModal(o)}
                onDelete={handleDelete}
                onToggle={handleToggle}
              />
            ))}
          </div>
        )}
      </div>

      {/* Change Password */}
      <div className="card">
        <h2 className="font-semibold text-lg mb-1 flex items-center gap-2"><KeyRound size={18} className="text-brand-500" /> Change Password</h2>
        <p className="text-sm text-gray-400 mb-4">Update your login password.</p>
        <form onSubmit={handleChangePassword} className="space-y-3">
          <div>
            <label className="label">Current Password</label>
            <div className="relative">
              <input type={showPw ? 'text' : 'password'} className="input pr-10" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} placeholder="Current password" />
              <button type="button" onClick={() => setShowPw(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">New Password</label>
              <input type="password" className="input" value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="Min. 6 characters" />
            </div>
            <div>
              <label className="label">Confirm New Password</label>
              <input type="password" className="input" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} placeholder="Repeat password" />
            </div>
          </div>
          <button type="submit" disabled={changing} className="btn-primary">
            {changing ? 'Changing...' : 'Change Password'}
          </button>
        </form>
      </div>

      {/* SMS Settings */}
      <SmsSettings />

      {/* Email Notifications */}
      <EmailNotifications />

      {/* Backup & export */}
      <div className="card space-y-4">
        <div>
          <h2 className="font-semibold text-lg mb-1">Backup & export</h2>
          <p className="text-sm text-gray-500">
            Excel is for quick reporting (non-deleted, non-cancelled orders). JSON is a full database backup for restore.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting}
            className="btn-secondary flex-1 inline-flex items-center justify-center gap-2"
          >
            <FileSpreadsheet size={18} />
            {exporting ? 'Generating…' : 'Excel (.xlsx)'}
          </button>
          <button
            type="button"
            onClick={handleExportJsonBackup}
            disabled={exportingJson}
            className="btn-secondary flex-1 inline-flex items-center justify-center gap-2"
          >
            <FileJson size={18} />
            {exportingJson ? 'Preparing…' : 'Full backup (.json)'}
          </button>
        </div>
        {user?.role === 'super_admin' && (
          <div className="pt-2 border-t border-gray-100">
            <p className="text-sm text-gray-500 mb-2">Restore from a JSON backup (super admin only).</p>
            <input
              ref={importFileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={handleImportBackup}
            />
            <button
              type="button"
              onClick={() => importFileRef.current?.click()}
              disabled={importing}
              className="btn-primary w-full sm:w-auto inline-flex items-center justify-center gap-2"
            >
              <Upload size={18} />
              {importing ? 'Importing…' : 'Import JSON backup'}
            </button>
          </div>
        )}
      </div>

      {/* User Management */}
      <UserManagement outlets={outlets} />

      {/* Dynamic Settings */}
      <DynamicListSettings />

      {/* Business Info */}
      <div className="card">
        <h2 className="font-semibold text-lg mb-2">Business Info</h2>
        <div className="text-sm text-gray-600 space-y-1">
          <p><strong>Business:</strong> CakeZake</p>
          <p><strong>Location:</strong> Birtamode-5, Jhapa, Nepal</p>
          <p><strong>Owner:</strong> Rabin Dhakal</p>
          <p><strong>Currency:</strong> NPR (Nepali Rupees)</p>
        </div>
      </div>

      {modal && (
        <OutletModal
          outlet={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
