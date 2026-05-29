import { useState } from "react";
import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  PiggyBank,
  Wallet,
  CreditCard,
  User,
  TrendingUp,
  ArrowRightLeft,
  ArrowDownLeft,
  ArrowUpRight,
  Repeat2,
  Layers,
  Bot,
  BookOpen,
  Tag,
  BarChart2,
  Download,
  Settings,
  LogOut,
  ChevronDown,
  ChevronRight,
  Receipt,
  Landmark,
  DollarSign,
  FileText,
  Webhook,
  Globe,
  ShieldCheck,
  KeyRound,
  SlidersHorizontal,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { toast } from "sonner";
import { NotificationBell } from "../notifications/NotificationBell";

// ──────────────────────────────────────────────
// Helper: NavItem (leaf node — no children)
// ──────────────────────────────────────────────
function NavItem({ to, icon: Icon, label, end = false }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-150 ${
          isActive
            ? "bg-purple-100 text-purple-700 font-semibold"
            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-medium"
        }`
      }
    >
      {Icon && <Icon size={16} className="shrink-0" />}
      <span>{label}</span>
    </NavLink>
  );
}

// ──────────────────────────────────────────────
// Helper: SubMenuItem — indented child link
// ──────────────────────────────────────────────
function SubMenuItem({ to, icon: Icon, label }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-2 pl-8 pr-3 py-1.5 rounded-lg text-[13px] transition-all duration-150 ${
          isActive
            ? "bg-purple-100 text-purple-700 font-semibold"
            : "text-slate-500 hover:bg-slate-100 hover:text-slate-800 font-medium"
        }`
      }
    >
      {Icon && <Icon size={14} className="shrink-0 opacity-70" />}
      <span>{label}</span>
    </NavLink>
  );
}

// ──────────────────────────────────────────────
// Helper: CollapsibleMenu — parent with children
// ──────────────────────────────────────────────
function CollapsibleMenu({ icon: Icon, label, children, matchPaths = [] }) {
  const location = useLocation();
  const isAnyChildActive = matchPaths.some((p) =>
    location.pathname.startsWith(p)
  );
  const [open, setOpen] = useState(isAnyChildActive);

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-150 ${
          isAnyChildActive
            ? "bg-purple-50 text-purple-700 font-semibold"
            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-medium"
        }`}
      >
        {Icon && <Icon size={16} className="shrink-0" />}
        <span className="flex-1 text-left">{label}</span>
        {open ? (
          <ChevronDown size={14} className="opacity-50" />
        ) : (
          <ChevronRight size={14} className="opacity-50" />
        )}
      </button>

      {/* Animated dropdown */}
      <div
        className={`overflow-hidden transition-all duration-200 ease-in-out ${
          open ? "max-h-96 opacity-100 mt-0.5" : "max-h-0 opacity-0"
        }`}
      >
        <div className="flex flex-col gap-0.5 pb-1">{children}</div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Helper: Section divider with label
// ──────────────────────────────────────────────
function SectionLabel({ label }) {
  return (
    <div className="px-3 pt-4 pb-1">
      <span className="text-[10px] font-bold tracking-widest uppercase text-slate-400 select-none">
        {label}
      </span>
    </div>
  );
}

function Divider() {
  return <div className="mx-3 my-1 border-t border-slate-100" />;
}

// ──────────────────────────────────────────────
// Main Layout
// ──────────────────────────────────────────────
export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    toast.success("Đã đăng xuất");
    navigate("/login");
  };

  return (
    <div className="flex h-screen bg-slate-50">
      {/* ── Sidebar ── */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0 shadow-sm">
        {/* Logo + Notification Bell */}
        <div className="px-5 py-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent tracking-tight">
              MoneyFlow
            </h1>
            <p className="text-[11px] text-slate-400 mt-0.5">Quản lý chi tiêu</p>
          </div>
          <NotificationBell />
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5 scrollbar-thin">
          {/* Dashboard */}
          <NavItem to="/" icon={LayoutDashboard} label="Tổng quan" end />

          <Divider />

          {/* ── FINANCIAL CONTROL ── */}
          <SectionLabel label="Kiểm soát tài chính" />

          <NavItem to="/budgets" icon={TrendingUp} label="Ngân sách" />
          <NavItem
            to="/subscriptions"
            icon={Repeat2}
            label="Hóa đơn định kỳ"
          />
          <NavItem
            to="/piggy-banks"
            icon={PiggyBank}
            label="Lợn tiết kiệm"
          />

          <Divider />

          {/* ── ACCOUNTING ── */}
          <SectionLabel label="Kế toán" />

          {/* Transactions submenu */}
          <CollapsibleMenu
            icon={ArrowRightLeft}
            label="Giao dịch"
            matchPaths={["/transactions"]}
          >
            <SubMenuItem
              to="/transactions/withdrawal"
              icon={ArrowDownLeft}
              label="Chi tiêu"
            />
            <SubMenuItem
              to="/transactions/deposit"
              icon={ArrowUpRight}
              label="Thu nhập"
            />
            <SubMenuItem
              to="/transactions/transfers"
              icon={Repeat2}
              label="Chuyển khoản"
            />
            <SubMenuItem
              to="/transactions/all"
              icon={Layers}
              label="Tất cả giao dịch"
            />
          </CollapsibleMenu>

          {/* Automation submenu */}
          <CollapsibleMenu
            icon={Bot}
            label="Tự động hóa"
            matchPaths={["/rules", "/recurring", "/webhooks"]}
          >
            <SubMenuItem to="/rules" icon={BookOpen} label="Quy tắc" />
            <SubMenuItem
              to="/recurring"
              icon={Repeat2}
              label="Định kỳ"
            />
            <SubMenuItem to="/webhooks" icon={Webhook} label="Webhooks" />
          </CollapsibleMenu>

          <Divider />

          {/* ── OTHERS ── */}
          <SectionLabel label="Khác" />

          {/* Accounts submenu */}
          <CollapsibleMenu
            icon={Landmark}
            label="Tài khoản"
            matchPaths={["/accounts"]}
          >
            <SubMenuItem
              to="/accounts/asset"
              icon={Wallet}
              label="Tài sản"
            />
            <SubMenuItem
              to="/accounts/expense"
              icon={CreditCard}
              label="Tài khoản chi"
            />
            <SubMenuItem
              to="/accounts/revenue"
              icon={DollarSign}
              label="Tài khoản thu"
            />
            <SubMenuItem
              to="/accounts/liabilities"
              icon={FileText}
              label="Nợ phải trả"
            />
          </CollapsibleMenu>

          {/* Classification submenu */}
          <CollapsibleMenu
            icon={Tag}
            label="Phân loại"
            matchPaths={["/categories", "/tags", "/object-groups"]}
          >
            <SubMenuItem
              to="/categories"
              icon={BookOpen}
              label="Danh mục"
            />
            <SubMenuItem to="/tags" icon={Tag} label="Nhãn" />
            <SubMenuItem
              to="/object-groups"
              icon={Layers}
              label="Nhóm đối tượng"
            />
          </CollapsibleMenu>

          <NavItem to="/reports" icon={BarChart2} label="Báo cáo" />
          <NavItem
            to="/export"
            icon={Download}
            label="Xuất dữ liệu"
          />

          <Divider />

          {/* ── OPTIONS ── */}
          <SectionLabel label="Tùy chọn" />

          <CollapsibleMenu
            icon={Settings}
            label="Cài đặt"
            matchPaths={[
              "/profile",
              "/preferences",
              "/currencies",
              "/exchange-rates",
              "/administrations",
              "/settings",
            ]}
          >
            <SubMenuItem to="/profile" icon={User} label="Hồ sơ cá nhân" />
            <SubMenuItem
              to="/profile/oauth"
              icon={KeyRound}
              label="Mã OAuth"
            />
            <SubMenuItem
              to="/preferences"
              icon={SlidersHorizontal}
              label="Tùy chọn hiển thị"
            />
            <SubMenuItem
              to="/currencies"
              icon={DollarSign}
              label="Tiền tệ"
            />
            <SubMenuItem
              to="/exchange-rates"
              icon={Globe}
              label="Tỷ giá hối đoái"
            />
            <SubMenuItem
              to="/administrations"
              icon={ShieldCheck}
              label="Quản trị"
            />
            <SubMenuItem
              to="/settings"
              icon={Settings}
              label="Cài đặt hệ thống"
            />
          </CollapsibleMenu>
        </nav>

        {/* ── User Footer ── */}
        <div className="p-3 border-t border-slate-100">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-semibold text-xs shrink-0">
              {user?.avatarInitials || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900 truncate">
                {user?.userName || "User"}
              </p>
              <p className="text-[11px] text-slate-400 truncate">
                {user?.email || ""}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="text-slate-400 hover:text-red-500 transition-colors p-1 rounded-md hover:bg-red-50"
              title="Đăng xuất"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
