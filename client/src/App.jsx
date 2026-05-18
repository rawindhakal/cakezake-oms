import { useEffect, useState, lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, Eye } from 'lucide-react';
import useAuthStore from './store/authStore';
import Sidebar from './components/Sidebar';
import Spinner from './components/Spinner';

const Login        = lazy(() => import('./pages/Login'));
const SuperAdmin   = lazy(() => import('./pages/SuperAdmin'));
const Dashboard    = lazy(() => import('./pages/Dashboard'));
const OrderList    = lazy(() => import('./pages/OrderList'));
const NewOrder     = lazy(() => import('./pages/NewOrder'));
const OrderDetail  = lazy(() => import('./pages/OrderDetail'));
const Settings     = lazy(() => import('./pages/Settings'));
const OutletPanel  = lazy(() => import('./pages/OutletPanel'));
const Customers    = lazy(() => import('./pages/Customers'));
const EditOrder    = lazy(() => import('./pages/EditOrder'));
const OrderArchive = lazy(() => import('./pages/OrderArchive'));
const DeliveryPanel= lazy(() => import('./pages/DeliveryPanel'));
const TrackOrder   = lazy(() => import('./pages/TrackOrder'));
const Inbox        = lazy(() => import('./pages/Inbox'));
const Connections  = lazy(() => import('./pages/Connections'));

function TenantViewBanner() {
  const { user, clearTenantView } = useAuthStore();
  const navigate = useNavigate();

  if (user?.role !== 'platform_owner' || !user?.viewingTenant) return null;

  async function handleExit() {
    await clearTenantView();
    navigate('/superadmin');
  }

  return (
    <div className="bg-purple-600 text-white px-4 py-2 flex items-center justify-between text-sm shrink-0">
      <div className="flex items-center gap-2 min-w-0">
        <Eye size={14} className="shrink-0" />
        <span className="truncate">
          Viewing as: <strong>{user.viewingTenant.name}</strong>
          <span className="opacity-70 ml-1 hidden sm:inline">({user.viewingTenant.slug} · {user.viewingTenant.currency})</span>
        </span>
      </div>
      <button
        onClick={handleExit}
        className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 px-3 py-1 rounded-lg transition-colors shrink-0 ml-3"
      >
        <X size={12} />
        Exit View
      </button>
    </div>
  );
}

function Layout({ children }) {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  useEffect(() => { setOpen(false); }, [location.pathname]);

  return (
    <div className="flex min-h-screen bg-gray-50">
      {open && (
        <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={() => setOpen(false)} />
      )}
      <div className={`fixed inset-y-0 left-0 z-40 w-56 transform transition-transform duration-200 lg:static lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <Sidebar />
      </div>
      <div className="flex-1 flex flex-col min-w-0">
        <TenantViewBanner />
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-100 sticky top-0 z-20">
          <button onClick={() => setOpen(true)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600">
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <span className="text-lg">🎂</span>
            <span className="font-bold text-brand-600 text-sm">Order Manager</span>
          </div>
        </header>
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}

function ProtectedRoute({ children, fullScreen = false, superAdminOnly = false, riderOnly = false, platformOwnerOnly = false }) {
  const { authenticated, user, loading } = useAuthStore();
  const location = useLocation();

  if (loading) return <Spinner fullPage label="Checking session…" />;
  if (!authenticated) return <Navigate to="/login" state={{ from: location }} replace />;

  // Platform owner can only access /superadmin unless they are viewing a tenant
  if (user?.role === 'platform_owner' && !platformOwnerOnly && !user?.viewingTenant) {
    return <Navigate to="/superadmin" replace />;
  }
  if (platformOwnerOnly && user?.role !== 'platform_owner') {
    return <Navigate to="/dashboard" replace />;
  }

  const isPlatformOwnerViewing = user?.role === 'platform_owner' && !!user?.viewingTenant;
  if (superAdminOnly && user?.role !== 'super_admin' && !isPlatformOwnerViewing) return <Navigate to="/dashboard" replace />;
  if (riderOnly && user?.role !== 'rider' && !isPlatformOwnerViewing) return <Navigate to="/dashboard" replace />;

  if (user?.role === 'rider' && !riderOnly && !location.pathname.startsWith('/delivery')) {
    return <Navigate to="/delivery" replace />;
  }
  if (user?.role === 'order_processor' && !location.pathname.startsWith('/outlet-panel')) {
    return <Navigate to="/outlet-panel" replace />;
  }
  if (fullScreen) return children;
  return <Layout>{children}</Layout>;
}

export default function App() {
  const { verify } = useAuthStore();

  useEffect(() => { verify(); }, []);

  return (
    <Suspense fallback={<Spinner fullPage label="Loading…" />}>
    <Routes>
      <Route path="/login"  element={<Login />} />
      <Route path="/track"  element={<TrackOrder />} />
      <Route path="/"       element={<Navigate to="/dashboard" replace />} />

      {/* Platform owner */}
      <Route path="/superadmin" element={<ProtectedRoute platformOwnerOnly fullScreen><SuperAdmin /></ProtectedRoute>} />

      {/* Tenant users */}
      <Route path="/dashboard"        element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/orders"           element={<ProtectedRoute><OrderList /></ProtectedRoute>} />
      <Route path="/orders/new"       element={<ProtectedRoute><NewOrder /></ProtectedRoute>} />
      <Route path="/orders/:id"       element={<ProtectedRoute><OrderDetail /></ProtectedRoute>} />
      <Route path="/orders/:id/edit"  element={<ProtectedRoute><EditOrder /></ProtectedRoute>} />
      <Route path="/customers"        element={<ProtectedRoute superAdminOnly><Customers /></ProtectedRoute>} />
      <Route path="/customers/:phone" element={<ProtectedRoute superAdminOnly><Customers /></ProtectedRoute>} />
      <Route path="/archive"          element={<ProtectedRoute superAdminOnly><OrderArchive /></ProtectedRoute>} />
      <Route path="/settings"         element={<ProtectedRoute superAdminOnly><Settings /></ProtectedRoute>} />
      <Route path="/outlet-panel"     element={<ProtectedRoute fullScreen><OutletPanel /></ProtectedRoute>} />
      <Route path="/delivery"         element={<ProtectedRoute fullScreen><DeliveryPanel /></ProtectedRoute>} />
      <Route path="/inbox"            element={<ProtectedRoute><Inbox /></ProtectedRoute>} />
      <Route path="/connections"      element={<ProtectedRoute superAdminOnly><Connections /></ProtectedRoute>} />
      <Route path="*"                 element={<Navigate to="/dashboard" replace />} />
    </Routes>
    </Suspense>
  );
}
