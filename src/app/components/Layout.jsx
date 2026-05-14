import { Outlet, NavLink, useNavigate } from "react-router";
import {
  LayoutDashboard,
  PiggyBank,
  Wallet,
  CreditCard,
  User,
  TrendingUp,
  History,
  LogOut,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";

export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    toast.success('Đã đăng xuất');
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-slate-50">
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col">
        <div className="p-6">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            MoneyFlow
          </h1>
        </div>

        <nav className="flex-1 px-3">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg mb-1 transition-colors ${
                isActive
                  ? "bg-purple-100 text-purple-700"
                  : "text-slate-700 hover:bg-slate-100"
              }`
            }
          >
            <LayoutDashboard size={20} />
            <span className="font-medium">Tổng quan</span>
          </NavLink>

          <NavLink
            to="/budget"
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg mb-1 transition-colors ${
                isActive
                  ? "bg-purple-100 text-purple-700"
                  : "text-slate-700 hover:bg-slate-100"
              }`
            }
          >
            <TrendingUp size={20} />
            <span className="font-medium">Ngân sách</span>
          </NavLink>

          <NavLink
            to="/savings"
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg mb-1 transition-colors ${
                isActive
                  ? "bg-purple-100 text-purple-700"
                  : "text-slate-700 hover:bg-slate-100"
              }`
            }
          >
            <PiggyBank size={20} />
            <span className="font-medium">Tiết kiệm</span>
          </NavLink>

          <NavLink
            to="/wallet"
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg mb-1 transition-colors ${
                isActive
                  ? "bg-purple-100 text-purple-700"
                  : "text-slate-700 hover:bg-slate-100"
              }`
            }
          >
            <Wallet size={20} />
            <span className="font-medium">Ví</span>
          </NavLink>

          <NavLink
            to="/transactions"
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg mb-1 transition-colors ${
                isActive
                  ? "bg-purple-100 text-purple-700"
                  : "text-slate-700 hover:bg-slate-100"
              }`
            }
          >
            <History size={20} />
            <span className="font-medium">Giao dịch</span>
          </NavLink>

          <NavLink
            to="/account"
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg mb-1 transition-colors ${
                isActive
                  ? "bg-purple-100 text-purple-700"
                  : "text-slate-700 hover:bg-slate-100"
              }`
            }
          >
            <User size={20} />
            <span className="font-medium">Tài khoản</span>
          </NavLink>
        </nav>

        <div className="p-4 border-t border-slate-200">
          <div className="flex items-center gap-3 px-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-semibold text-sm">
              {user?.avatarInitials || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-slate-900 truncate">{user?.userName || 'User'}</p>
              <p className="text-xs text-slate-500 truncate">{user?.email || ''}</p>
            </div>
            <button
              onClick={handleLogout}
              className="text-slate-400 hover:text-red-500 transition-colors"
              title="Đăng xuất"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
