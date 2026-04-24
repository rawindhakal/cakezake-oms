import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ShoppingBag, PlusCircle, Settings, LogOut, Store, Users, Archive, Truck, MessageSquare, Plug } from 'lucide-react';
import { useEffect } from 'react';
import useAuthStore from '../store/authStore';
import useInboxStore from '../store/inboxStore';
import toast from 'react-hot-toast';

const commonLinks = [
  { to: '/dashboard',  icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/orders',     icon: ShoppingBag,     label: 'Orders' },
  { to: '/orders/new', icon: PlusCircle,      label: 'New Order' },
];

const adminLinks = [
  { to: '/customers',   icon: Users,    label: 'Customers' },
  { to: '/archive',     icon: Archive,  label: 'Archive' },
  { to: '/connections', icon: Plug,     label: 'Connections' },
  { to: '/settings',    icon: Settings, label: 'Settings' },
];

export default function Sidebar() {
  const { logout, user } = useAuthStore();
  const navigate = useNavigate();
  const { unreadTotal, fetchUnread } = useInboxStore();

  useEffect(() => {
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, []);
  const isSuperAdmin      = user?.role === 'super_admin';
  const isRider           = user?.role === 'rider';
  const isOrderProcessor  = user?.role === 'order_processor';

  async function handleLogout() {
    await logout();
    toast.success('Logged out');
    navigate('/login');
  }

  function NavItem({ to, icon: Icon, label, activeClass }) {
    return (
      <NavLink
        to={to}
        end={to === '/orders'}
        className={({ isActive }) =>
          `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            isActive
              ? activeClass || 'bg-brand-50 text-brand-600'
              : 'text-gray-600 hover:bg-gray-50'
          }`
        }
      >
        <Icon size={18} />
        {label}
      </NavLink>
    );
  }

  return (
    <aside className="w-56 bg-white border-r border-gray-100 flex flex-col h-full min-h-screen">
      <div className="p-5 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🎂</span>
          <div>
            <div className="font-bold text-brand-600 leading-tight">CakeZake</div>
            <div className="text-xs text-gray-400">Order Manager</div>
          </div>
        </div>
      </div>

      {/* User info pill */}
      {user && (
        <div className="mx-3 mt-3 px-3 py-2 bg-gray-50 rounded-lg">
          <p className="text-xs font-semibold text-gray-700 truncate">{user.name}</p>
          <p className="text-xs text-gray-400 capitalize">{user.role.replace('_', ' ')}</p>
        </div>
      )}

      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto mt-1">
        {isRider ? (
          <NavItem to="/delivery" icon={Truck} label="My Deliveries" activeClass="bg-green-50 text-green-700" />
        ) : isOrderProcessor ? (
          <NavItem to="/outlet-panel" icon={Store} label="Outlet Panel" activeClass="bg-purple-50 text-purple-600" />
        ) : (
          <>
            {commonLinks.map(({ to, icon, label }) => (
              <NavItem key={to} to={to} icon={icon} label={label} />
            ))}

            {/* Inbox with unread badge */}
            <NavLink
              to="/inbox"
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? 'bg-brand-50 text-brand-600' : 'text-gray-600 hover:bg-gray-50'
                }`
              }
            >
              <MessageSquare size={18} />
              <span className="flex-1">Inbox</span>
              {unreadTotal > 0 && (
                <span className="bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {unreadTotal > 9 ? '9+' : unreadTotal}
                </span>
              )}
            </NavLink>

            {isSuperAdmin && (
              <>
                <div className="pt-3 mt-1 border-t border-gray-100">
                  <p className="text-xs text-gray-400 uppercase tracking-wide px-3 mb-1">Admin</p>
                </div>
                {adminLinks.map(({ to, icon, label }) => (
                  <NavItem key={to} to={to} icon={icon} label={label} />
                ))}
              </>
            )}

            <div className="pt-3 mt-2 border-t border-gray-100">
              <p className="text-xs text-gray-400 uppercase tracking-wide px-3 mb-1">Staff View</p>
              <NavItem to="/outlet-panel" icon={Store} label="Outlet Panel" activeClass="bg-purple-50 text-purple-600" />
            </div>
          </>
        )}
      </nav>

      <div className="p-3 border-t border-gray-100">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 w-full transition-colors"
        >
          <LogOut size={18} />
          Logout
        </button>
      </div>
    </aside>
  );
}
