import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, CalendarDays, X, ChevronLeft, ChevronRight } from 'lucide-react';
import useOrderStore from '../store/orderStore';
import StatusBadge from '../components/StatusBadge';
import Spinner from '../components/Spinner';
import dayjs from 'dayjs';

const PAGE_SIZE = 20;

const STATUSES = ['All', 'New', 'Confirmed', 'In Production', 'Out for Delivery', 'Delivered', 'Cancelled'];
const CITIES = ['Birtamode', 'Damak', 'Dharan', 'Biratnagar', 'Itahari', 'Jhapa', 'Kathmandu', 'Other'];
const CHANNELS = ['Instagram', 'Facebook', 'WhatsApp', 'Website', 'Walk-in', 'Phone Call'];

const DATE_PRESETS = [
  { key: 'all',       label: 'All Dates' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'today',     label: 'Today' },
  { key: 'tomorrow',  label: 'Tomorrow' },
  { key: 'week',      label: 'This Week' },
  { key: 'custom',    label: 'Custom' },
];

function presetToDates(key) {
  const today = dayjs().startOf('day');
  if (key === 'yesterday') return { startDate: today.subtract(1, 'day').toISOString(), endDate: today.subtract(1, 'day').endOf('day').toISOString() };
  if (key === 'today')     return { startDate: today.toISOString(), endDate: today.endOf('day').toISOString() };
  if (key === 'tomorrow')  return { startDate: today.add(1, 'day').toISOString(), endDate: today.add(1, 'day').endOf('day').toISOString() };
  if (key === 'week')      return { startDate: today.startOf('week').toISOString(), endDate: today.endOf('week').toISOString() };
  return {};
}

export default function OrderList() {
  const navigate = useNavigate();
  const { orders, total, loading, fetchOrders } = useOrderStore();
  const [search, setSearch]         = useState('');
  const [statusTab, setStatusTab]   = useState('All');
  const [city, setCity]             = useState('');
  const [channel, setChannel]       = useState('');
  const [datePreset, setDatePreset] = useState('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd]     = useState('');
  const [page, setPage]             = useState(1);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function buildAndFetch(p) {
    const params = { page: p, limit: PAGE_SIZE };
    if (statusTab !== 'All') params.status = statusTab;
    if (city) params.city = city;
    if (channel) params.channel = channel;
    if (search) params.search = search;
    if (datePreset === 'custom') {
      if (customStart) params.startDate = dayjs(customStart).startOf('day').toISOString();
      if (customEnd)   params.endDate   = dayjs(customEnd).endOf('day').toISOString();
    } else if (datePreset !== 'all') {
      Object.assign(params, presetToDates(datePreset));
    }
    fetchOrders(params);
  }

  useEffect(() => {
    buildAndFetch(page);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusTab, city, channel, search, datePreset, customStart, customEnd]);

  function clearFilters() {
    setSearch(''); setStatusTab('All'); setCity(''); setChannel(''); setDatePreset('all');
    setCustomStart(''); setCustomEnd(''); setPage(1);
  }

  const hasActiveFilters = search || statusTab !== 'All' || city || channel || datePreset !== 'all';

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Orders <span className="text-gray-400 text-lg font-normal">({total})</span></h1>
        <div className="flex items-center gap-3">
          {hasActiveFilters && (
            <button onClick={clearFilters}
              className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors">
              <X size={14} /> Clear filters
            </button>
          )}
          <button onClick={() => navigate('/orders/new')} className="btn-primary flex items-center gap-2">
            <Plus size={18} /> New Order
          </button>
        </div>
      </div>

      {/* Search + dropdowns */}
      <div className="flex flex-col sm:flex-row gap-3 mb-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="input pl-9"
            placeholder="Search order#, name, phone..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <select className="input w-40" value={city} onChange={(e) => { setCity(e.target.value); setPage(1); }}>
          <option value="">All Cities</option>
          {CITIES.map((c) => <option key={c}>{c}</option>)}
        </select>
        <select className="input w-44" value={channel} onChange={(e) => { setChannel(e.target.value); setPage(1); }}>
          <option value="">All Channels</option>
          {CHANNELS.map((c) => <option key={c}>{c}</option>)}
        </select>
      </div>

      {/* Date filter row */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <CalendarDays size={15} className="text-gray-400 flex-shrink-0" />
        {DATE_PRESETS.map(({ key, label }) => (
          <button key={key} onClick={() => { setDatePreset(key); setPage(1); }}
            className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              datePreset === key
                ? key === 'today'     ? 'bg-brand-500 text-white'
                : key === 'tomorrow'  ? 'bg-blue-500 text-white'
                : key === 'yesterday' ? 'bg-gray-600 text-white'
                :                       'bg-gray-800 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}>
            {label}
          </button>
        ))}
        {datePreset === 'custom' && (
          <div className="flex items-center gap-2 ml-1">
            <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)}
              className="input py-1 text-sm w-36" />
            <span className="text-gray-400 text-sm">to</span>
            <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)}
              className="input py-1 text-sm w-36" />
          </div>
        )}
      </div>

      {/* Status tabs */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => { setStatusTab(s); setPage(1); }}
            className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              statusTab === s ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Spinner size="lg" label="Loading orders…" />
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-20 text-gray-400">No orders found.</div>
      ) : (
        <>
          {/* Mobile card list */}
          <div className="sm:hidden space-y-2">
            {orders.map((o) => {
              const d = dayjs(o.delivery.date);
              const diff = d.startOf('day').diff(dayjs().startOf('day'), 'day');
              const dateLabel = diff === 0 ? 'Today' : diff === 1 ? 'Tomorrow' : diff === -1 ? 'Yesterday' : d.format('DD MMM');
              const dateColor = diff === 0 ? 'text-yellow-600' : diff === 1 ? 'text-blue-500' : diff < 0 ? 'text-red-400' : 'text-gray-500';
              return (
                <div key={o._id} onClick={() => navigate(`/orders/${o._id}`)}
                  className="bg-white border border-gray-200 rounded-2xl px-4 py-3 cursor-pointer active:bg-gray-50">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-brand-600">{o.orderNumber}</span>
                    <StatusBadge status={o.status} />
                  </div>
                  <p className="text-sm font-medium text-gray-800">{o.sender.name} <span className="text-gray-400 text-xs">{o.sender.phone}</span></p>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">{o.items.map((i) => i.name).join(', ')}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className={`text-xs font-semibold ${dateColor}`}>{dateLabel} · {o.delivery.slot || ''}</span>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-semibold text-gray-700">NPR {o.payment.total?.toLocaleString('en-IN')}</span>
                      {o.payment.due > 0
                        ? <span className="text-red-500 font-bold">{o.payment.due?.toLocaleString('en-IN')} due</span>
                        : <span className="text-green-600">✓ Paid</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-xs text-gray-400">{o.receiver.city}</span>
                    {o.outlet && <span className="text-xs bg-brand-50 text-brand-600 px-2 py-0.5 rounded-full">{o.outlet.name}</span>}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop table */}
          <div className="hidden sm:block card overflow-hidden p-0">
            <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Order#', 'Sender', 'Items', 'Total', 'Due', 'City', 'Outlet', 'Delivery Date', 'Slot', 'Status'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-gray-500 font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {orders.map((o) => (
                  <tr key={o._id} onClick={() => navigate(`/orders/${o._id}`)} className="hover:bg-gray-50 cursor-pointer">
                    <td className="px-4 py-3 font-semibold text-brand-600 whitespace-nowrap">{o.orderNumber}</td>
                    <td className="px-4 py-3">
                      <div>{o.sender.name}</div>
                      <div className="text-gray-400 text-xs">{o.sender.phone}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 max-w-[160px] truncate">{o.items.map((i) => i.name).join(', ')}</td>
                    <td className="px-4 py-3 font-medium whitespace-nowrap">NPR {o.payment.total?.toLocaleString('en-IN')}</td>
                    <td className={`px-4 py-3 font-medium whitespace-nowrap ${o.payment.due > 0 ? 'text-red-500' : 'text-green-600'}`}>
                      {o.payment.due > 0 ? o.payment.due?.toLocaleString('en-IN') : '✓'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{o.receiver.city}</td>
                    <td className="px-4 py-3">
                      {o.outlet ? <span className="text-xs bg-brand-50 text-brand-600 px-2 py-0.5 rounded-full font-medium">{o.outlet.name}</span>
                               : <span className="text-xs text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap">
                      {(() => {
                        const d = dayjs(o.delivery.date);
                        const diff = d.startOf('day').diff(dayjs().startOf('day'), 'day');
                        const label = diff === 0 ? 'Today' : diff === 1 ? 'Tomorrow' : diff === -1 ? 'Yesterday' : d.format('DD MMM');
                        const color = diff === 0 ? 'text-yellow-600 font-semibold' : diff === 1 ? 'text-blue-600' : diff < 0 ? 'text-red-400' : 'text-gray-500';
                        return <span className={color}>{label}<br /><span className="text-gray-400 font-normal">{d.format('DD MMM YYYY')}</span></span>;
                      })()}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{o.delivery.slot}</td>
                    <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <span className="text-sm text-gray-400">
                Page {page} of {totalPages} · {total} orders
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 rounded-lg border border-gray-200 disabled:opacity-30 hover:bg-gray-50 transition-colors"
                >
                  <ChevronLeft size={16} />
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
                  const pg = start + i;
                  return (
                    <button
                      key={pg}
                      onClick={() => setPage(pg)}
                      className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                        pg === page ? 'bg-brand-500 text-white' : 'border border-gray-200 hover:bg-gray-50 text-gray-600'
                      }`}
                    >
                      {pg}
                    </button>
                  );
                })}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-2 rounded-lg border border-gray-200 disabled:opacity-30 hover:bg-gray-50 transition-colors"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
