import { ArrowUpRight, ArrowDownRight, ArrowLeftRight, TrendingUp, RefreshCw, ExternalLink } from "lucide-react";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router";
import { dashboardApi } from "../../api/dashboardApi";
import { useAuth } from "../../context/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

const CHART_COLORS = ["#f59e0b", "#ec4899", "#3b82f6", "#10b981", "#6366f1", "#8b5cf6"];

function fmtMoney(n) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(0)}k`;
  return `$${n}`;
}

function SkeletonCard({ gradient }) {
  return (
    <div className={`rounded-2xl p-6 animate-pulse ${gradient ? "bg-purple-300" : "bg-white border border-slate-200"}`}>
      <div className={`h-4 rounded mb-4 w-1/2 ${gradient ? "bg-purple-400" : "bg-slate-200"}`} />
      <div className={`h-10 rounded mb-2 w-3/4 ${gradient ? "bg-purple-400" : "bg-slate-200"}`} />
      <div className={`h-3 rounded w-1/3 ${gradient ? "bg-purple-400" : "bg-slate-200"}`} />
    </div>
  );
}

function SkeletonChart() {
  return <div className="h-[300px] bg-slate-100 rounded-xl animate-pulse" />;
}

export function Dashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState({
    totalBalance: 0,
    monthlyIncome: 0,
    monthlyExpense: 0,
    netCashFlow: 0,
  });
  const [monthlyTrend, setMonthlyTrend] = useState([]);
  const [categorySpending, setCategorySpending] = useState([]);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasError, setHasError] = useState(false);

  const now = new Date();
  const currentMonthLabel = format(now, "MMMM yyyy", { locale: vi });

  const fetchDashboardData = useCallback(async (silent = false) => {
    try {
      if (!silent) setIsLoading(true);
      else setIsRefreshing(true);
      setHasError(false);

      const data = await dashboardApi.getSummary();

      setSummary({
        totalBalance:   data.totalBalance   ?? 0,
        monthlyIncome:  data.monthlyIncome  ?? 0,
        monthlyExpense: data.monthlyExpense ?? 0,
        netCashFlow:    data.netCashFlow    ?? 0,
      });

      const trend = (data.monthlyTrend?.points || []).map(p => ({
        month:    p.month,
        income:   p.income,
        expenses: p.expense,
      }));
      setMonthlyTrend(trend);

      const spending = (data.spendingByCategory || []).map(s => ({
        name:   s.accountName || s.categoryName || "Other",
        amount: s.amount,
        pct:    s.percentage ?? 0,
      }));
      setCategorySpending(spending);

      const recent = (data.recentTransactions || []).map(t => {
        const details       = t.details || [];
        const expenseDetail = details.find(d => d.typeId === 5 && d.debit > 0);
        const revenueDetail = details.find(d => d.typeId === 4 && d.credit > 0);
        const isTransfer    = !expenseDetail && !revenueDetail;
        const isIncome      = !!revenueDetail;

        let categoryName = "Chưa phân loại";
        if (expenseDetail)      categoryName = expenseDetail.accountName  || "Chi tiêu";
        else if (revenueDetail) categoryName = revenueDetail.accountName  || "Thu nhập";
        else if (isTransfer)    categoryName = "Chuyển khoản";

        return {
          id:              t.journalId,
          description:     t.description,
          amount:          t.totalAmount,
          categoryName,
          transactionDate: t.transactionDate,
          isIncome,
          isTransfer,
        };
      });
      setRecentTransactions(recent);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      setHasError(true);
      toast.error("Không thể tải dữ liệu tổng quan");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const netPositive = summary.netCashFlow >= 0;

  // ─── Loading skeleton ────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="p-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <div className="h-8 bg-slate-200 rounded w-40 mb-2 animate-pulse" />
            <div className="h-4 bg-slate-100 rounded w-64 animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <SkeletonCard gradient />
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-2xl p-6 border border-slate-200"><SkeletonChart /></div>
          <div className="bg-white rounded-2xl p-6 border border-slate-200"><SkeletonChart /></div>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <div className="h-6 bg-slate-200 rounded w-48 mb-6 animate-pulse" />
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center gap-4 py-4 border-b border-slate-100 last:border-0">
              <div className="w-12 h-12 rounded-full bg-slate-200 animate-pulse shrink-0" />
              <div className="flex-1">
                <div className="h-4 bg-slate-200 rounded w-1/3 mb-2 animate-pulse" />
                <div className="h-3 bg-slate-100 rounded w-1/4 animate-pulse" />
              </div>
              <div className="h-5 bg-slate-200 rounded w-20 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ─── Error state ─────────────────────────────────────────────────────────────
  if (hasError) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[400px]">
        <p className="text-slate-500 mb-4">Không thể tải dữ liệu tổng quan.</p>
        <button
          onClick={() => fetchDashboardData()}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          <RefreshCw size={16} />
          Thử lại
        </button>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Tổng quan</h1>
          <p className="text-slate-500 mt-1">
            Chào mừng trở lại{user?.userName ? `, ${user.userName}` : ""}! Đây là tổng quan tài chính tháng {currentMonthLabel}
          </p>
        </div>
        <button
          onClick={() => fetchDashboardData(true)}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-slate-600"
          title="Làm mới"
        >
          <RefreshCw size={16} className={isRefreshing ? "animate-spin" : ""} />
          <span className="capitalize">{currentMonthLabel}</span>
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gradient-to-br from-purple-500 to-purple-700 rounded-2xl p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <span className="text-purple-100">Tổng số dư</span>
            <TrendingUp size={20} className="text-purple-200" />
          </div>
          <p className="text-4xl font-bold mb-2">${summary.totalBalance.toLocaleString()}</p>
          <p className="text-purple-100 text-sm">Trên tất cả tài khoản</p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <span className="text-slate-600">Thu nhập</span>
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <ArrowUpRight size={20} className="text-green-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-900 mb-2">${summary.monthlyIncome.toLocaleString()}</p>
          <p className="text-green-600 text-sm">Tháng này</p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <span className="text-slate-600">Chi tiêu</span>
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
              <ArrowDownRight size={20} className="text-red-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-900 mb-2">${summary.monthlyExpense.toLocaleString()}</p>
          <p className={`text-sm font-medium ${netPositive ? "text-green-600" : "text-red-500"}`}>
            Dòng tiền ròng: {netPositive ? "+" : ""}${summary.netCashFlow.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <h2 className="text-xl font-bold text-slate-900 mb-6">Thu nhập và Chi tiêu</h2>
          {monthlyTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" stroke="#64748b" tick={{ fontSize: 12 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 12 }} tickFormatter={fmtMoney} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#fff", border: "1px solid #e2e8f0", borderRadius: "8px" }}
                  formatter={(value, name) => [
                    `$${value.toLocaleString()}`,
                    name === "income" ? "Thu nhập" : "Chi tiêu",
                  ]}
                />
                <Legend formatter={(value) => value === "income" ? "Thu nhập" : "Chi tiêu"} />
                <Bar dataKey="income"   fill="#10b981" radius={[8, 8, 0, 0]} />
                <Bar dataKey="expenses" fill="#ef4444" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-slate-400">Không có dữ liệu xu hướng</div>
          )}
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <h2 className="text-xl font-bold text-slate-900 mb-6">Chi tiêu theo danh mục</h2>
          {categorySpending.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={categorySpending}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, pct }) => `${name} ${pct.toFixed(0)}%`}
                    outerRadius={90}
                    dataKey="amount"
                    nameKey="name"
                  >
                    {categorySpending.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: "#fff", border: "1px solid #e2e8f0", borderRadius: "8px" }}
                    formatter={(value) => [`$${value.toLocaleString()}`, "Số tiền"]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-3 space-y-2">
                {categorySpending.slice(0, 5).map((s, i) => (
                  <div key={s.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                      <span className="text-slate-600 truncate max-w-[140px]">{s.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 text-xs">{s.pct.toFixed(1)}%</span>
                      <span className="font-semibold text-slate-700">${s.amount.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-slate-400">Không có dữ liệu chi tiêu</div>
          )}
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-900">Giao dịch gần đây</h2>
          <Link
            to="/transactions"
            className="flex items-center gap-1 text-sm text-purple-600 hover:text-purple-700 font-medium transition-colors"
          >
            Xem tất cả
            <ExternalLink size={14} />
          </Link>
        </div>
        {recentTransactions.length === 0 ? (
          <p className="text-center text-slate-400 py-8">Không có giao dịch gần đây</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {recentTransactions.map((t) => {
              const iconBg   = t.isTransfer ? "bg-blue-50"    : t.isIncome ? "bg-green-100" : "bg-red-50";
              const Icon     = t.isTransfer ? ArrowLeftRight   : t.isIncome ? ArrowUpRight   : ArrowDownRight;
              const iconCls  = t.isTransfer ? "text-blue-500"  : t.isIncome ? "text-green-600" : "text-red-500";
              const amtCls   = t.isTransfer ? "text-blue-600"  : t.isIncome ? "text-green-600" : "text-slate-900";
              const amtPrefix = t.isIncome ? "+" : t.isTransfer ? "" : "-";
              return (
                <div key={t.id} className="flex items-center justify-between py-4 hover:bg-slate-50 px-2 rounded-lg transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${iconBg}`}>
                      <Icon size={18} className={iconCls} />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 text-sm">{t.description || "—"}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {t.categoryName} · {t.transactionDate ? format(new Date(t.transactionDate), "dd/MM/yyyy") : ""}
                      </p>
                    </div>
                  </div>
                  <p className={`font-bold ${amtCls}`}>
                    {amtPrefix}${Math.abs(t.amount).toLocaleString()}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
