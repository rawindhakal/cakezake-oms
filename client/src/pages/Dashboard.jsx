import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShoppingBag, DollarSign, Clock, AlertCircle, TrendingUp, Wallet,
  Package, ChevronDown, CalendarDays, Store, MapPin, Zap,
} from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import api from '../lib/api';
import dayjs from 'dayjs';
import StatusBadge from '../components/StatusBadge';
import Spinner from '../components/Spinner';

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_COLORS = {
  'New':              '#3b82f6',
  'Confirmed':        '#8b5cf6',
  'In Production':    '#f59e0b',
  'Out for Delivery': '#f97316',
  'Delivered':        '#22c55e',
  'Cancelled':        '#9ca3af',
};

const CHANNEL_COLORS = ['#ff2d55','#8b5cf6','#22c55e','#f59e0b','#3b82f6','#f97316'];

const PAYMENT_META = {
  Cash:           { color: '#22c55e', bg: '#f0fdf4', border: '#bbf7d0', emoji: '💵' },
  eSewa:          { color: '#16a34a', bg: '#f0fdf4', border: '#86efac', emoji: '📱' },
  Khalti:         { color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe', emoji: '💜' },
  'Bank Transfer':{ color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', emoji: '🏦' },
  QR:             { color: '#0891b2', bg: '#ecfeff', border: '#a5f3fc', emoji: '📷' },
};

const PRESETS = [
  { key: 'today',   label: 'Today',       days: 0 },
  { key: 'yesterday', label: 'Yesterday', days: -1 },
  { key: '7d',      label: 'Last 7 Days', days: 7 },
  { key: '30d',     label: 'Last 30 Days',days: 30 },
  { key: 'month',   label: 'This Month',  days: null },
  { key: 'custom',  label: 'Custom',      days: null },
];

function getPresetDates(key) {
  const today = dayjs();
  if (key === 'today')     return { start: today.startOf('day'),    end: today.endOf('day') };
  if (key === 'yesterday') return { start: today.subtract(1,'day').startOf('day'), end: today.subtract(1,'day').endOf('day') };
  if (key === '7d')        return { start: today.subtract(6,'day').startOf('day'), end: today.endOf('day') };
  if (key === '30d')       return { start: today.subtract(29,'day').startOf('day'), end: today.endOf('day') };
  if (key === 'month')     return { start: today.startOf('month'),  end: today.endOf('day') };
  return null;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, sub, color = 'text-brand-600', bg = 'bg-brand-50' }) {
  return (
    <div className="card flex items-start gap-3 min-w-0">
      <div className={`p-2.5 rounded-xl ${bg} ${color} flex-shrink-0 mt-0.5`}>
        <Icon size={18} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-gray-400 leading-tight">{label}</p>
        <p className="text-base font-bold leading-snug break-words">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5 break-words">{sub}</p>}
      </div>
    </div>
  );
}

function SectionTitle({ children }) {
  return <h2 className="text-base font-semibold text-gray-700 mb-3">{children}</h2>;
}

function OutletCard({ data, navigate }) {
  const { outlet, totalOrders, revenue, due, statuses, todayActive } = data;
  const statusEntries = Object.entries(statuses || {}).filter(([,v]) => v > 0);
  const activeCount = (statuses?.['New'] || 0) + (statuses?.['Confirmed'] || 0) +
                      (statuses?.['In Production'] || 0) + (statuses?.['Out for Delivery'] || 0);

  return (
    <div className="card hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <Store size={15} className="text-brand-500" />
            {outlet?.name || 'Unassigned'}
          </h3>
          {outlet?.city && (
            <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
              <MapPin size={10} /> {outlet.city}
            </p>
          )}
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-2xl font-bold text-gray-800">{totalOrders}</p>
          <p className="text-xs text-gray-400">orders</p>
        </div>
      </div>

      {/* Revenue / Due */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="bg-green-50 rounded-lg px-3 py-2">
          <p className="text-xs text-green-600 font-medium">Revenue</p>
          <p className="text-sm font-bold text-green-700">NPR {revenue.toLocaleString('en-IN')}</p>
        </div>
        <div className={`rounded-lg px-3 py-2 ${due > 0 ? 'bg-red-50' : 'bg-gray-50'}`}>
          <p className={`text-xs font-medium ${due > 0 ? 'text-red-500' : 'text-gray-400'}`}>Due</p>
          <p className={`text-sm font-bold ${due > 0 ? 'text-red-600' : 'text-gray-400'}`}>
            {due > 0 ? `NPR ${due.toLocaleString('en-IN')}` : '✓ Clear'}
          </p>
        </div>
      </div>

      {/* Today active */}
      {todayActive > 0 && (
        <div className="flex items-center gap-1.5 mb-3 bg-yellow-50 rounded-lg px-3 py-1.5">
          <Zap size={12} className="text-yellow-600" />
          <span className="text-xs font-semibold text-yellow-700">{todayActive} active today</span>
        </div>
      )}

      {/* Status breakdown */}
      {statusEntries.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {statusEntries.map(([status, count]) => (
            <span
              key={status}
              style={{ borderColor: STATUS_COLORS[status] + '44', color: STATUS_COLORS[status], backgroundColor: STATUS_COLORS[status] + '18' }}
              className="text-xs px-2 py-0.5 rounded-full font-medium border"
            >
              {count} {status}
            </span>
          ))}
        </div>
      )}

      {totalOrders === 0 && (
        <p className="text-xs text-gray-300 italic">No orders in selected range</p>
      )}
    </div>
  );
}

const CustomTooltipRevenue = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-sm">
      <p className="font-medium text-gray-700 mb-1">{payload[0]?.payload?.label || label}</p>
      <p className="text-brand-600">NPR {(payload[0]?.value || 0).toLocaleString('en-IN')}</p>
      {payload[1] && <p className="text-blue-500">{payload[1]?.value} orders</p>}
    </div>
  );
};

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function Dashboard() {
  const navigate = useNavigate();
  const [summary, setSummary]       = useState(null);
  const [data, setData]             = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [chartsLoading, setChartsLoading]   = useState(true);
  const [onThisDay, setOnThisDay]   = useState([]);
  const [preset, setPreset]         = useState('30d');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd]     = useState('');

  const buildParams = useCallback((p, cs, ce) => {
    let start, end;
    if (p === 'custom') {
      start = cs ? dayjs(cs).startOf('day').toISOString() : undefined;
      end   = ce ? dayjs(ce).endOf('day').toISOString()   : undefined;
    } else {
      const dates = getPresetDates(p);
      start = dates?.start.toISOString();
      end   = dates?.end.toISOString();
    }
    const params = {};
    if (start) params.startDate = start;
    if (end)   params.endDate   = end;
    return params;
  }, []);

  const fetchSummary = useCallback(async (p, cs, ce) => {
    setSummaryLoading(true);
    try {
      const params = buildParams(p, cs, ce);
      const { data: res } = await api.get('/stats/summary-quick', { params });
      if (res.success) setSummary(res.summary);
    } catch (err) {
      console.error(err);
    } finally {
      setSummaryLoading(false);
    }
  }, [buildParams]);

  const fetchCharts = useCallback(async (p, cs, ce) => {
    setChartsLoading(true);
    try {
      const params = buildParams(p, cs, ce);
      const { data: res } = await api.get('/stats/dashboard', { params });
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setChartsLoading(false);
    }
  }, [buildParams]);

  useEffect(() => {
    fetchSummary(preset, customStart, customEnd);
    fetchCharts(preset, customStart, customEnd);
  }, [preset, customStart, customEnd]);

  useEffect(() => {
    api.get('/stats/on-this-day')
      .then(({ data: res }) => { if (res.success) setOnThisDay(res.data || []); })
      .catch(() => {});
  }, []);

  const s = summary || data?.summary || {};
  const revenueChart = data?.revenueChart || [];
  const byStatus     = (data?.byStatus  || []).map((d) => ({ name: d._id, value: d.count }));
  const byChannel    = data?.byChannel  || [];
  const byCity       = data?.byCity     || [];
  const byPayment    = data?.byPaymentMethod || [];
  const topItems     = data?.topItems   || [];
  const todayDel     = data?.todayDeliveries || [];
  const outlets      = data?.outletsOverview || [];

  // Shorten revenue chart labels when range is wide
  const chartData = revenueChart.length > 14
    ? revenueChart.filter((_, i) => i % Math.ceil(revenueChart.length / 14) === 0)
    : revenueChart;

  const activePreset = PRESETS.find((p) => p.key === preset);

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">

      {/* Header + Date Range */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <CalendarDays size={15} className="text-gray-400 flex-shrink-0" />
          {PRESETS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPreset(p.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                preset === p.key ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Custom date inputs */}
      {preset === 'custom' && (
        <div className="flex items-center gap-2 flex-wrap -mt-2">
          <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="input py-1.5 text-sm w-36" />
          <span className="text-gray-400 text-sm">to</span>
          <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="input py-1.5 text-sm w-36" />
        </div>
      )}

      {summaryLoading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner size="lg" label="Loading dashboard…" />
        </div>
      ) : (
        <>
          {/* ─── Stat Cards ─────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <StatCard
              icon={ShoppingBag}
              label="Orders"
              value={s.ordersInRange}
              sub={`avg NPR ${(s.avgOrderValue || 0).toLocaleString('en-IN')}`}
            />
            <StatCard
              icon={DollarSign}
              label="Revenue"
              value={`NPR ${(s.revenueInRange || 0).toLocaleString('en-IN')}`}
              color="text-green-600"
              bg="bg-green-50"
            />
            <StatCard
              icon={Wallet}
              label="Collected"
              value={`NPR ${(s.collectedInRange || 0).toLocaleString('en-IN')}`}
              color="text-blue-600"
              bg="bg-blue-50"
            />
            <StatCard
              icon={AlertCircle}
              label="Total Due"
              value={`NPR ${(s.totalDue || 0).toLocaleString('en-IN')}`}
              sub="all active orders"
              color="text-red-500"
              bg="bg-red-50"
            />
            <StatCard
              icon={Clock}
              label="In Production"
              value={s.inProduction}
              color="text-yellow-600"
              bg="bg-yellow-50"
            />
            <StatCard
              icon={Package}
              label="Out for Delivery"
              value={s.outForDelivery}
              color="text-orange-500"
              bg="bg-orange-50"
            />
          </div>

          {/* ─── Charts (lazy) ────────────────────────────────────────────── */}
          {chartsLoading ? (
            <div className="flex items-center justify-center py-16">
              <Spinner size="md" label="Loading charts…" />
            </div>
          ) : <>

          {/* ─── Revenue Chart ────────────────────────────────────────────── */}
          <div className="card">
            <SectionTitle>Revenue — {activePreset?.label}</SectionTitle>
            {revenueChart.length === 0 ? (
              <p className="text-sm text-gray-400 py-8 text-center">No revenue data in selected range.</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} width={40} />
                  <Tooltip content={<CustomTooltipRevenue />} />
                  <Line type="monotone" dataKey="revenue" stroke="#ff2d55" strokeWidth={2.5} dot={chartData.length <= 14} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* ─── Charts Row ───────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

            {/* By Status */}
            <div className="card">
              <SectionTitle>Orders by Status</SectionTitle>
              {byStatus.length === 0 ? <p className="text-sm text-gray-400 text-center py-8">No data</p> : (
                <>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={byStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={40}>
                        {byStatus.map((entry) => (
                          <Cell key={entry.name} fill={STATUS_COLORS[entry.name] || '#9ca3af'} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v, n) => [v, n]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                    {byStatus.map((d) => (
                      <span key={d.name} className="flex items-center gap-1 text-xs text-gray-600">
                        <span className="w-2.5 h-2.5 rounded-full inline-block flex-shrink-0" style={{ backgroundColor: STATUS_COLORS[d.name] || '#9ca3af' }} />
                        {d.name} ({d.value})
                      </span>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* By Channel */}
            <div className="card">
              <SectionTitle>Orders by Channel</SectionTitle>
              {byChannel.length === 0 ? <p className="text-sm text-gray-400 text-center py-8">No data</p> : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={byChannel} layout="vertical" margin={{ left: 0, right: 16 }}>
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="_id" width={72} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v, _, p) => [`${v} orders · NPR ${(p.payload.revenue || 0).toLocaleString('en-IN')}`, '']} />
                    <Bar dataKey="count" radius={[0,4,4,0]}>
                      {byChannel.map((_, i) => <Cell key={i} fill={CHANNEL_COLORS[i % CHANNEL_COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* By City */}
            <div className="card">
              <SectionTitle>Orders by City</SectionTitle>
              {byCity.length === 0 ? <p className="text-sm text-gray-400 text-center py-8">No data</p> : (
                <div className="space-y-2 mt-1">
                  {byCity.map((c, i) => {
                    const max = byCity[0]?.count || 1;
                    const pct = Math.round((c.count / max) * 100);
                    return (
                      <div key={c._id}>
                        <div className="flex justify-between text-sm mb-0.5">
                          <span className="text-gray-700 font-medium">{c._id || '—'}</span>
                          <span className="text-gray-500 text-xs">{c.count}</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-brand-400 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ─── Payment Methods ────────────────────────────────────────── */}
          {byPayment.length > 0 && (
            <div className="card">
              <SectionTitle>Payment Received by Method</SectionTitle>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                {byPayment.map((m) => {
                  const meta = PAYMENT_META[m._id] || { color: '#6b7280', bg: '#f9fafb', border: '#e5e7eb', emoji: '💳' };
                  return (
                    <div
                      key={m._id}
                      className="rounded-xl border px-4 py-3 flex flex-col gap-1"
                      style={{ backgroundColor: meta.bg, borderColor: meta.border }}
                    >
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-base leading-none">{meta.emoji}</span>
                        <span className="text-xs font-semibold" style={{ color: meta.color }}>{m._id}</span>
                      </div>
                      <p className="text-lg font-bold text-gray-800 leading-tight">
                        NPR {(m.collected || 0).toLocaleString('en-IN')}
                      </p>
                      <p className="text-xs text-gray-400">{m.count} order{m.count !== 1 ? 's' : ''}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ─── Outlets at a Glance ─────────────────────────────────────── */}
          <div>
            <SectionTitle>Outlets at a Glance</SectionTitle>
            {outlets.length === 0 ? (
              <p className="text-sm text-gray-400">No outlet data. Add outlets in Settings.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {outlets.map((o, i) => (
                  <OutletCard key={o.outlet?._id || `outlet-${i}`} data={o} navigate={navigate} />
                ))}
              </div>
            )}
          </div>

          {/* ─── Top Items + Today Deliveries ─────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {/* Top Items */}
            {topItems.length > 0 && (
              <div className="card">
                <SectionTitle>Top Selling Items</SectionTitle>
                <div className="space-y-2">
                  {topItems.map((item, i) => (
                    <div key={item._id} className="flex items-center gap-3">
                      <span className="text-xs font-bold text-gray-300 w-4">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{item._id || 'Unnamed'}</p>
                        <p className="text-xs text-gray-400">NPR {(item.revenue || 0).toLocaleString('en-IN')}</p>
                      </div>
                      <span className="text-sm font-bold text-brand-600">{item.count}x</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Today's Deliveries */}
            <div className="card">
              <SectionTitle>Today's Deliveries ({todayDel.length})</SectionTitle>
              {todayDel.length === 0 ? (
                <p className="text-sm text-gray-400">No deliveries scheduled for today.</p>
              ) : (
                <div className="divide-y divide-gray-50 -mx-1">
                  {todayDel.map((o) => (
                    <div
                      key={o._id}
                      onClick={() => navigate(`/orders/${o._id}`)}
                      className="py-2.5 px-1 flex justify-between items-center cursor-pointer hover:bg-gray-50 rounded-lg transition-colors"
                    >
                      <div className="min-w-0">
                        <span className="font-semibold text-brand-600 text-sm">{o.orderNumber}</span>
                        <span className="ml-2 text-sm text-gray-600 truncate">{o.receiver?.name}, {o.receiver?.city}</span>
                        {o.outlet && (
                          <span className="ml-2 text-xs bg-brand-50 text-brand-600 px-1.5 py-0.5 rounded-full">{o.outlet.name}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                        <span className="text-xs text-gray-400 hidden sm:block">{o.delivery?.slot}</span>
                        <StatusBadge status={o.status} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* On This Day */}
          {onThisDay.length > 0 && (
            <div className="card mt-5">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xl">📅</span>
                <div>
                  <h2 className="font-semibold text-gray-700">On This Day</h2>
                  <p className="text-xs text-gray-400">Orders delivered on {dayjs().format('MMMM D')} in previous years</p>
                </div>
              </div>
              <div className="space-y-5">
                {onThisDay.map(({ year, orders }) => (
                  <div key={year}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-bold text-white bg-brand-500 px-2 py-0.5 rounded-full">{year}</span>
                      <span className="text-xs text-gray-400">{orders.length} order{orders.length > 1 ? 's' : ''} · NPR {orders.reduce((s, o) => s + (o.payment?.total || 0), 0).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="divide-y divide-gray-50 -mx-1">
                      {orders.map((o) => (
                        <div
                          key={o._id}
                          onClick={() => navigate(`/orders/${o._id}`)}
                          className="py-2.5 px-1 flex justify-between items-start cursor-pointer hover:bg-gray-50 rounded-lg transition-colors gap-2"
                        >
                          <div className="min-w-0 flex-1">
                            <span className="font-semibold text-brand-600 text-sm">{o.orderNumber}</span>
                            <span className="ml-2 text-sm text-gray-700">{o.sender?.name}</span>
                            {o.items?.length > 0 && (
                              <p className="text-xs text-gray-400 mt-0.5 truncate">
                                {o.items.map((i) => i.name).join(', ')}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-col items-end flex-shrink-0 gap-1">
                            <span className="text-sm font-semibold text-gray-700">NPR {Number(o.payment?.total || 0).toLocaleString('en-IN')}</span>
                            <StatusBadge status={o.status} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          </>}
        </>
      )}
    </div>
  );
}
