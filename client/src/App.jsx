import { useEffect, useState, lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';
import useAuthStore from './store/authStore';
import Sidebar from './components/Sidebar';
import Spinner from './components/Spinner';

const Login        = lazy(() => import('./pages/Login'));
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
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-100 sticky top-0 z-20">
          <button onClick={() => setOpen(true)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600">
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <span className="text-lg">🎂</span>
            <span className="font-bold text-brand-600 text-sm">CakeZake</span>
          </div>
        </header>
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}

function ProtectedRoute({ children, fullScreen = false, superAdminOnly = false, riderOnly = false }) {
  const { authenticated, user, loading } = useAuthStore();
  const location = useLocation();

  if (loading) return <Spinner fullPage label="Checking session…" />;
  if (!authenticated) return <Navigate to="/login" state={{ from: location }} replace />;
  if (superAdminOnly && user?.role !== 'super_admin') return <Navigate to="/dashboard" replace />;
  if (riderOnly && user?.role !== 'rider') return <Navigate to="/dashboard" replace />;
  // Redirect riders away from non-delivery pages
  if (user?.role === 'rider' && !riderOnly && !location.pathname.startsWith('/delivery')) {
    return <Navigate to="/delivery" replace />;
  }
  // Redirect order processors away from non-outlet-panel pages
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
      <Route path="/login" element={<Login />} />
      <Route path="/track" element={<TrackOrder />} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
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
