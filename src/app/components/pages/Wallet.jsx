import {
  Plus,
  CreditCard,
  Landmark,
  Wallet as WalletIcon,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Pencil,
  Trash2,
  ArrowLeftRight,
  Copy,
  Check,
  Search,
  SortAsc,
  RefreshCw,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { AddWalletModal } from "../AddWalletModal";
import { EditWalletModal } from "../EditWalletModal";
import { QuickTransferModal } from "../QuickTransferModal";
import { toast } from "sonner";
import { walletApi } from "../../api/walletApi";
import { transactionApi } from "../../api/transactionApi";

function mapTransaction(t) {
  const details       = t.details || [];
  const expenseDetail = details.find(d => d.typeId === 5 && d.debit > 0);
  const revenueDetail = details.find(d => d.typeId === 4 && d.credit > 0);
  const isTransfer    = !expenseDetail && !revenueDetail;
  const isIncome      = !!revenueDetail;
  let categoryName = "Uncategorized";
  if (expenseDetail)      categoryName = expenseDetail.accountName  || "Chi tiêu";
  else if (revenueDetail) categoryName = revenueDetail.accountName  || "Thu nhập";
  else if (isTransfer)    categoryName = "Chuyển khoản";
  return { ...t, categoryName, isIncome, isTransfer };
}

const iconMap = {
  Landmark,
  WalletIcon,
  CreditCard,
  TrendingUp,
  Wallet: WalletIcon,
};

const colorGradients = {
  blue:    { from: "#3b82f6", to: "#1d4ed8" },
  green:   { from: "#22c55e", to: "#15803d" },
  purple:  { from: "#a855f7", to: "#7e22ce" },
  orange:  { from: "#f97316", to: "#c2410c" },
  emerald: { from: "#10b981", to: "#047857" },
  slate:   { from: "#64748b", to: "#475569" },
};

const PIE_COLORS = ["#3b82f6", "#22c55e", "#a855f7", "#f97316", "#10b981", "#64748b"];
const fallbackGradients = Object.values(colorGradients);

function mapAccount(acc, index) {
  const grad =
    acc.gradientFrom && acc.gradientTo
      ? { from: acc.gradientFrom, to: acc.gradientTo }
      : fallbackGradients[index % fallbackGradients.length];
  return {
    id: acc.accountId,
    name: acc.name,
    type: acc.typeName || "Asset",
    balance: acc.balance ?? 0,
    initialBalance: acc.initialBalance ?? 0,
    icon: iconMap[acc.iconName] || Landmark,
    iconName: acc.iconName || "Landmark",
    color: acc.color || "blue",
    gradientFrom: grad.from,
    gradientTo: grad.to,
    cardNumber: acc.cardNumber || "",
    isActive: acc.isActive,
    createdAt: acc.createdAt,
  };
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  if (!text) return null;
  const handleCopy = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button onClick={handleCopy} className="p-1 rounded hover:bg-white/20 transition-colors" title="Sao chép">
      {copied ? <Check size={13} /> : <Copy size={13} />}
    </button>
  );
}

export function Wallet() {
  const [accounts, setAccounts] = useState([]);
  const [summary, setSummary] = useState({
    totalAssets: 0,
    totalLiabilities: 0,
    totalSavings: 0,
    netWorth: 0,
  });
  const [balanceHistory, setBalanceHistory] = useState([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingWallet, setEditingWallet] = useState(null);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("default"); // default | balance-desc | balance-asc | name
  const [recentTxs, setRecentTxs] = useState([]);
  const [txWalletFilter, setTxWalletFilter] = useState("all"); // "all" | accountId string

  const fetchWallets = useCallback(async (silent = false) => {
    try {
      if (!silent) setIsLoading(true);
      else setIsRefreshing(true);
      const data = await walletApi.getSummary();
      setSummary({
        totalAssets: data.totalAssets ?? 0,
        totalLiabilities: data.totalLiabilities ?? 0,
        totalSavings: data.totalSavings ?? 0,
        netWorth: data.netWorth ?? 0,
      });
      const mapped = (data.accounts || []).map(mapAccount);
      setAccounts(mapped);
      setBalanceHistory(buildBalanceHistory(mapped));

      // Fetch recent transactions
      const txData = await transactionApi.getAll({ page: 1, pageSize: 20 });
      const txItems = (txData.items || txData || []).map(mapTransaction);
      setRecentTxs(txItems);
    } catch (error) {
      console.error("Error fetching wallets:", error);
      toast.error("Không thể tải dữ liệu ví");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchWallets();
  }, [fetchWallets]);

  function buildBalanceHistory(accs) {
    const months = ["Th1","Th2","Th3","Th4","Th5","Th6","Th7","Th8","Th9","Th10","Th11","Th12"];
    const now = new Date();
    const total = accs.reduce((s, a) => s + Math.max(0, a.balance), 0);
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
      const ratio = (i + 1) / 6;
      return { month: months[d.getMonth()], balance: Math.round(total * ratio) };
    });
  }

  const handleAddWallet = async (wallet) => {
    try {
      const grad = colorGradients[wallet.color] || colorGradients.blue;
      await walletApi.create({
        typeId: 1,
        name: wallet.name,
        iconName: wallet.iconName,
        color: wallet.color,
        gradientFrom: grad.from,
        gradientTo: grad.to,
        balance: wallet.balance,
        cardNumber: wallet.cardNumber || null,
      });
      await fetchWallets();
      toast.success(`Đã thêm tài khoản "${wallet.name}"!`);
    } catch {
      toast.error("Không thể thêm tài khoản");
    }
  };

  const handleEditWallet = async (id, data) => {
    try {
      if (data.color) {
        const grad = colorGradients[data.color] || colorGradients.blue;
        data.gradientFrom = grad.from;
        data.gradientTo = grad.to;
      }
      await walletApi.update(id, data);
      await fetchWallets();
      toast.success("Đã cập nhật tài khoản!");
      setEditingWallet(null);
    } catch {
      toast.error("Không thể cập nhật tài khoản");
    }
  };

  const handleDeleteWallet = async (id, name) => {
    if (!window.confirm(`Xóa tài khoản "${name}"? Hành động này không thể hoàn tác.`)) return;
    try {
      await walletApi.delete(id);
      await fetchWallets();
      toast.success(`Đã xóa tài khoản "${name}".`);
    } catch {
      toast.error("Không thể xóa tài khoản");
    }
  };

  const handleTransfer = async (data) => {
    try {
      await transactionApi.create(data);
      await fetchWallets();
      toast.success("Chuyển khoản thành công!");
      setIsTransferOpen(false);
    } catch {
      toast.error("Chuyển khoản thất bại");
    }
  };

  // Filter + sort
  const filteredAccounts = accounts
    .filter((a) => a.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === "balance-desc") return b.balance - a.balance;
      if (sortBy === "balance-asc") return a.balance - b.balance;
      if (sortBy === "name") return a.name.localeCompare(b.name);
      return 0;
    });

  const totalAssets = summary.totalAssets + summary.totalSavings;

  // Pie data: positive balances only
  const pieData = accounts
    .filter((a) => a.balance > 0)
    .map((a) => ({ name: a.name, value: a.balance }));

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Ví</h1>
          <p className="text-slate-500 mt-1">Quản lý tài khoản và thẻ của bạn</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchWallets(true)}
            disabled={isRefreshing}
            className="p-2.5 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors"
            title="Làm mới"
          >
            <RefreshCw size={18} className={isRefreshing ? "animate-spin" : ""} />
          </button>
          {accounts.length >= 2 && (
            <button
              onClick={() => setIsTransferOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors"
            >
              <ArrowLeftRight size={16} />
              <span>Chuyển khoản</span>
            </button>
          )}
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <Plus size={18} />
            <span>Thêm tài khoản</span>
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gradient-to-br from-purple-500 to-purple-700 rounded-2xl p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <span className="text-purple-100 text-sm font-medium">Giá trị ròng</span>
            <TrendingUp size={20} className="text-purple-200" />
          </div>
          <p className="text-4xl font-bold mb-1">${summary.netWorth.toLocaleString()}</p>
          <p className="text-purple-100 text-sm">{accounts.length} tài khoản</p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <span className="text-slate-600 text-sm font-medium">Tổng tài sản</span>
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <ArrowUpRight size={20} className="text-green-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-900 mb-1">${totalAssets.toLocaleString()}</p>
          <p className="text-green-600 text-sm">{accounts.filter((a) => a.balance >= 0).length} tài khoản dương</p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <span className="text-slate-600 text-sm font-medium">Nợ</span>
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
              <ArrowDownRight size={20} className="text-red-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-900 mb-1">${summary.totalLiabilities.toLocaleString()}</p>
          <p className="text-red-600 text-sm">{accounts.filter((a) => a.balance < 0).length} tài khoản nợ</p>
        </div>
      </div>

      {/* Balance distribution bar */}
      {accounts.length > 1 && totalAssets > 0 && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 mb-6">
          <h2 className="text-sm font-semibold text-slate-600 mb-3 uppercase tracking-wide">Phân bổ số dư</h2>
          <div className="flex h-3 rounded-full overflow-hidden gap-0.5 mb-3">
            {accounts
              .filter((a) => a.balance > 0)
              .map((a, i) => (
                <div
                  key={a.id}
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${(a.balance / totalAssets) * 100}%`,
                    background: `linear-gradient(90deg, ${a.gradientFrom}, ${a.gradientTo})`,
                    minWidth: "4px",
                  }}
                  title={`${a.name}: $${a.balance.toLocaleString()}`}
                />
              ))}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {accounts
              .filter((a) => a.balance > 0)
              .map((a) => (
                <div key={a.id} className="flex items-center gap-1.5 text-xs text-slate-600">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ background: a.gradientFrom }}
                  />
                  <span>{a.name}</span>
                  <span className="text-slate-400">
                    {((a.balance / totalAssets) * 100).toFixed(0)}%
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Search & sort toolbar */}
      {accounts.length > 0 && (
        <div className="flex gap-3 mb-5">
          <div className="relative flex-1 max-w-xs">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm kiếm tài khoản..."
              className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div className="flex items-center gap-1.5 border border-slate-200 rounded-lg px-3 bg-white">
            <SortAsc size={15} className="text-slate-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="text-sm text-slate-700 bg-transparent focus:outline-none py-2.5 pr-1"
            >
              <option value="default">Mặc định</option>
              <option value="balance-desc">Số dư (Cao → Thấp)</option>
              <option value="balance-asc">Số dư (Thấp → Cao)</option>
              <option value="name">Tên A→Z</option>
            </select>
          </div>
        </div>
      )}

      {/* Account cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {[1, 2].map((i) => (
            <div key={i} className="h-48 rounded-2xl bg-slate-200 animate-pulse" />
          ))}
        </div>
      ) : filteredAccounts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 mb-8 bg-white rounded-2xl border border-dashed border-slate-300">
          <WalletIcon size={48} className="text-slate-300 mb-4" />
          <p className="text-slate-500 font-medium">
            {search ? "Không tìm thấy tài khoản phù hợp" : "Chưa có tài khoản"}
          </p>
          {!search && (
            <p className="text-slate-400 text-sm mt-1">Nhấn "Thêm tài khoản" để bắt đầu</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {filteredAccounts.map((account) => {
            const Icon = account.icon;
            const isPositive = account.balance >= 0;

            return (
              <div
                key={account.id}
                className="relative overflow-hidden rounded-2xl p-6 text-white group"
                style={{
                  background: `linear-gradient(135deg, ${account.gradientFrom} 0%, ${account.gradientTo} 100%)`,
                }}
              >
                {/* decorative circles */}
                <div className="absolute top-0 right-0 w-36 h-36 bg-white opacity-10 rounded-full -mr-18 -mt-18 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-28 h-28 bg-white opacity-10 rounded-full -ml-14 -mb-14 pointer-events-none" />

                <div className="relative">
                  {/* Top row */}
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <p className="text-white/70 text-xs font-medium uppercase tracking-wider mb-1">
                        {account.type}
                      </p>
                      <h3 className="text-xl font-bold leading-tight">{account.name}</h3>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setEditingWallet(account)}
                        className="p-1.5 rounded-full hover:bg-white/20 transition-colors opacity-0 group-hover:opacity-100"
                        title="Edit"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteWallet(account.id, account.name)}
                        className="p-1.5 rounded-full hover:bg-white/20 transition-colors opacity-0 group-hover:opacity-100"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                      <Icon size={30} className="text-white/80 ml-1" />
                    </div>
                  </div>

                  {/* Balance */}
                  <div className="mb-5">
                    <p className="text-white/70 text-xs mb-1">Số dư hiện tại</p>
                    <p className="text-4xl font-bold tracking-tight">
                      {isPositive ? "" : "-"}${Math.abs(account.balance).toLocaleString()}
                    </p>
                    {account.initialBalance !== undefined && (
                      <p className="text-white/60 text-xs mt-1">
                        Số dư ban đầu: ${account.initialBalance.toLocaleString()}
                        {account.balance !== account.initialBalance && (
                          <span className={`ml-2 font-semibold ${account.balance >= account.initialBalance ? "text-green-300" : "text-red-300"}`}>
                            {account.balance >= account.initialBalance ? "+" : ""}
                            ${(account.balance - account.initialBalance).toLocaleString()}
                          </span>
                        )}
                      </p>
                    )}
                  </div>

                  {/* Card number + badge */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-base tracking-widest text-white/75 font-mono">
                        {account.cardNumber || "—"}
                      </span>
                      {account.cardNumber && <CopyButton text={account.cardNumber} />}
                    </div>
                    <div
                      className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${
                        isPositive ? "bg-white/20" : "bg-black/20"
                      }`}
                    >
                      {isPositive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                      {isPositive ? "Tài sản" : "Nợ"}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Account details table */}
      {accounts.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50">
            <h2 className="text-base font-bold text-slate-900">Chi tiết tài khoản</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200 bg-slate-50">
                  <th className="px-6 py-3 font-semibold">Tên tài khoản</th>
                  <th className="px-6 py-3 font-semibold">Loại</th>
                  <th className="px-6 py-3 font-semibold text-right">Số dư ban đầu</th>
                  <th className="px-6 py-3 font-semibold text-right">Số dư hiện tại</th>
                  <th className="px-6 py-3 font-semibold text-right">Thay đổi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAccounts.map((acc) => {
                  const diff = acc.balance - acc.initialBalance;
                  const diffPct = acc.initialBalance !== 0
                    ? ((diff / acc.initialBalance) * 100).toFixed(1)
                    : null;
                  return (
                    <tr key={acc.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs"
                            style={{ background: `linear-gradient(135deg, ${acc.gradientFrom}, ${acc.gradientTo})` }}
                          >
                            <acc.icon size={14} />
                          </div>
                          <span className="font-semibold text-slate-900">{acc.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-medium">
                          {acc.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-slate-600 font-medium">
                        ${acc.initialBalance.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-slate-900">
                        ${acc.balance.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={`font-semibold text-sm ${diff >= 0 ? "text-green-600" : "text-red-500"}`}>
                          {diff >= 0 ? "+" : ""}${diff.toLocaleString()}
                          {diffPct !== null && (
                            <span className="text-xs font-normal ml-1 opacity-70">({diffPct}%)</span>
                          )}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent Transactions */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-base font-bold text-slate-900">Lịch sử giao dịch gần nhất</h2>
          <select
            value={txWalletFilter}
            onChange={(e) => setTxWalletFilter(e.target.value)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
          >
            <option value="all">Tất cả ví</option>
            {accounts.map((a) => (
              <option key={a.id} value={String(a.id)}>{a.name}</option>
            ))}
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200 bg-slate-50">
                <th className="px-6 py-3 font-semibold">Mô tả</th>
                <th className="px-6 py-3 font-semibold">Danh mục</th>
                <th className="px-6 py-3 font-semibold">Ngày</th>
                <th className="px-6 py-3 font-semibold text-right">Số tiền</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentTxs
                .filter((t) => {
                  if (txWalletFilter === "all") return true;
                  return (t.details || []).some(
                    (d) => String(d.accountId) === txWalletFilter
                  );
                })
                .slice(0, 10)
                .map((t) => {
                  const iconBg   = t.isTransfer ? "bg-blue-50"    : t.isIncome ? "bg-green-100" : "bg-red-50";
                  const TxIcon   = t.isTransfer ? ArrowLeftRight   : t.isIncome ? ArrowUpRight   : ArrowDownRight;
                  const iconCls  = t.isTransfer ? "text-blue-500"  : t.isIncome ? "text-green-600" : "text-red-500";
                  const amtCls   = t.isTransfer ? "text-blue-600"  : t.isIncome ? "text-green-600" : "text-slate-900";
                  const prefix   = t.isIncome ? "+" : t.isTransfer ? "" : "-";
                  return (
                    <tr key={t.journalId} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${iconBg}`}>
                            <TxIcon size={14} className={iconCls} />
                          </div>
                          <span className="font-medium text-slate-900 text-sm">{t.description || "—"}</span>
                        </div>
                      </td>
                      <td className="px-6 py-3.5">
                        <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-medium">
                          {t.categoryName}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-slate-500 text-sm">
                        {t.transactionDate ? format(new Date(t.transactionDate), "dd/MM/yyyy") : "—"}
                      </td>
                      <td className={`px-6 py-3.5 text-right font-bold text-sm ${amtCls}`}>
                        {prefix}${Math.abs(t.totalAmount).toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              {recentTxs.filter((t) =>
                txWalletFilter === "all" ||
                (t.details || []).some((d) => String(d.accountId) === txWalletFilter)
              ).length === 0 && (
                <tr>
                  <td colSpan="4" className="px-6 py-10 text-center text-slate-400 text-sm">
                    Không có giao dịch nào
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Balance Trend */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200">
          <h2 className="text-lg font-bold text-slate-900 mb-6">Xu hướng số dư</h2>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={balanceHistory}>
              <defs>
                <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#9333ea" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#9333ea" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" stroke="#94a3b8" tick={{ fontSize: 12 }} />
              <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ backgroundColor: "#fff", border: "1px solid #e2e8f0", borderRadius: "10px" }}
                formatter={(val) => [`$${val.toLocaleString()}`, "Số dư"]}
              />
              <Area type="monotone" dataKey="balance" stroke="#9333ea" strokeWidth={2.5} fillOpacity={1} fill="url(#colorBalance)" dot={{ r: 4, fill: "#9333ea" }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Asset breakdown pie */}
        {pieData.length > 0 ? (
          <div className="bg-white rounded-2xl p-6 border border-slate-200">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Cơ cấu tài sản</h2>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: "#fff", border: "1px solid #e2e8f0", borderRadius: "10px" }}
                  formatter={(val) => [`$${val.toLocaleString()}`, ""]}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-3 space-y-2">
              {pieData.slice(0, 4).map((d, i) => (
                <div key={d.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="text-slate-600 truncate max-w-[90px]">{d.name}</span>
                  </div>
                  <span className="font-semibold text-slate-700">${d.value.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-6 border border-slate-200 flex items-center justify-center text-slate-400 text-sm">
            Không có dữ liệu tài sản
          </div>
        )}
      </div>

      {/* Modals */}
      <AddWalletModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onAdd={handleAddWallet} />
      {editingWallet && (
        <EditWalletModal wallet={editingWallet} onClose={() => setEditingWallet(null)} onSave={handleEditWallet} />
      )}
      {isTransferOpen && (
        <QuickTransferModal accounts={accounts} onClose={() => setIsTransferOpen(false)} onTransfer={handleTransfer} />
      )}
    </div>
  );
}
