import { ArrowUpRight, ArrowDownRight, ArrowLeftRight, TrendingUp, RefreshCw, ExternalLink } from "lucide-react";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { dashboardApi } from "../../api/dashboardApi";
import { useAuth } from "../../context/AuthContext";
import { useSettings } from "../../context/SettingsContext";
import { toast } from "sonner";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

const CHART_COLORS = ["#f59e0b", "#ec4899", "#3b82f6", "#10b981", "#6366f1", "#8b5cf6"];

function SkeletonCard({ gradient }) {
  return (
    <div className={`rounded-2xl p-6 animate-pulse ${gradient ? "bg-purple-300" : "bg-card border border-border"}`}>
      <div className={`h-4 rounded mb-4 w-1/2 ${gradient ? "bg-purple-400" : "bg-muted"}`} />
      <div className={`h-10 rounded mb-2 w-3/4 ${gradient ? "bg-purple-400" : "bg-muted"}`} />
      <div className={`h-3 rounded w-1/3 ${gradient ? "bg-purple-400" : "bg-muted"}`} />
    </div>
  );
}

function SkeletonChart() {
  return <div className="h-[300px] bg-muted rounded-xl animate-pulse" />;
}

import { PageLayout } from "../../components/layout/PageLayout";

export function Dashboard() {
  const { user } = useAuth();
  const { fmt, fmtShort } = useSettings();
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
        name:   s.accountName || s.categoryName || "Khác",
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
      console.error("Lỗi khi tải dữ liệu tổng quan:", error);
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

  if (isLoading) {
    return (
      <PageLayout title="Tổng quan" subtitle="Đang tải dữ liệu...">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <SkeletonCard gradient />
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-card rounded-2xl p-6 border border-border"><SkeletonChart /></div>
          <div className="bg-card rounded-2xl p-6 border border-border"><SkeletonChart /></div>
        </div>
        <div className="bg-card rounded-2xl p-6 border border-border">
          <div className="h-6 bg-muted rounded w-48 mb-6 animate-pulse" />
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center gap-4 py-4 border-b border-border last:border-0">
              <div className="w-12 h-12 rounded-full bg-accent animate-pulse shrink-0" />
              <div className="flex-1">
                <div className="h-4 bg-muted rounded w-1/3 mb-2 animate-pulse" />
                <div className="h-3 bg-muted rounded w-1/4 animate-pulse" />
              </div>
              <div className="h-5 bg-muted rounded w-20 animate-pulse" />
            </div>
          ))}
        </div>
      </PageLayout>
    );
  }

  if (hasError) {
    return (
      <PageLayout title="Tổng quan" subtitle="Không thể tải dữ liệu">
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <p className="text-muted-foreground mb-4">Không thể tải dữ liệu tổng quan.</p>
          <button
            onClick={() => fetchDashboardData()}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <RefreshCw size={16} />
            Thử lại
          </button>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="Tổng quan"
      subtitle={`Chào mừng trở lại${user?.userName ? `, ${user.userName}` : ""}! Đây là tổng quan tài chính tháng ${currentMonthLabel}`}
      actions={
        <button
          onClick={() => fetchDashboardData(true)}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-lg hover:bg-muted transition-colors text-muted-foreground"
          title="Làm mới"
        >
          <RefreshCw size={16} className={isRefreshing ? "animate-spin" : ""} />
          <span className="capitalize">{currentMonthLabel}</span>
        </button>
      }
    >

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6 mb-6 sm:mb-8">
        <div className="bg-gradient-to-br from-purple-500 to-purple-700 rounded-xl sm:rounded-2xl p-4 sm:p-6 text-white">
          <div className="flex items-center justify-between mb-2 sm:mb-4">
            <span className="text-purple-100 text-xs sm:text-sm">Tổng số dư</span>
            <TrendingUp size={18} className="text-purple-200" />
          </div>
          <p className="text-2xl sm:text-4xl font-bold mb-1 sm:mb-2 truncate">{fmt(summary.totalBalance)}</p>
          <p className="text-purple-100 text-xs sm:text-sm">Trên tất cả tài khoản</p>
        </div>

        <div className="bg-card rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-border">
          <div className="flex items-center justify-between mb-2 sm:mb-4">
            <span className="text-muted-foreground text-xs sm:text-sm">Thu nhập</span>
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-green-500/15 flex items-center justify-center">
              <ArrowUpRight size={16} className="text-green-600" />
            </div>
          </div>
          <p className="text-xl sm:text-3xl font-bold text-card-foreground mb-1 sm:mb-2 truncate">{fmt(summary.monthlyIncome)}</p>
          <p className="text-green-600 text-xs sm:text-sm">Tháng này</p>
        </div>

        <div className="bg-card rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-border">
          <div className="flex items-center justify-between mb-2 sm:mb-4">
            <span className="text-muted-foreground text-xs sm:text-sm">Chi tiêu</span>
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-red-500/15 flex items-center justify-center">
              <ArrowDownRight size={16} className="text-red-600" />
            </div>
          </div>
          <p className="text-xl sm:text-3xl font-bold text-card-foreground mb-1 sm:mb-2 truncate">{fmt(summary.monthlyExpense)}</p>
          <p className={`text-xs sm:text-sm font-medium ${netPositive ? "text-green-600" : "text-red-500"}`}>
            Dòng tiền ròng: {netPositive ? "+" : ""}{fmt(summary.netCashFlow)}
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <div className="bg-card rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-border">
          <h2 className="text-base sm:text-xl font-bold text-card-foreground mb-4 sm:mb-6">Thu nhập và Chi tiêu</h2>
          {monthlyTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="month" stroke="var(--color-muted-foreground)" tick={{ fontSize: 12 }} />
                <YAxis stroke="var(--color-muted-foreground)" tick={{ fontSize: 12 }} tickFormatter={fmtShort} />
                <Tooltip
                  contentStyle={{ backgroundColor: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: "8px", color: "var(--color-card-foreground)" }}
                  formatter={(value, name) => [
                    fmt(value),
                    name === "income" ? "Thu nhập" : "Chi tiêu",
                  ]}
                />
                <Legend formatter={(value) => value === "income" ? "Thu nhập" : "Chi tiêu"} />
                <Bar dataKey="income"   fill="#10b981" radius={[8, 8, 0, 0]} />
                <Bar dataKey="expenses" fill="#ef4444" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">Không có dữ liệu xu hướng</div>
          )}
        </div>

        <div className="bg-card rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-border">
          <h2 className="text-base sm:text-xl font-bold text-card-foreground mb-4 sm:mb-6">Chi tiêu theo danh mục</h2>
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
                    contentStyle={{ backgroundColor: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: "8px", color: "var(--color-card-foreground)" }}
                    formatter={(value) => [fmt(value), "Số tiền"]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-3 space-y-2">
                {categorySpending.slice(0, 5).map((s, i) => (
                  <div key={s.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                      <span className="text-muted-foreground truncate max-w-[140px]">{s.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground text-xs">{s.pct.toFixed(1)}%</span>
                      <span className="font-semibold text-foreground">{fmt(s.amount)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">Không có dữ liệu chi tiêu</div>
          )}
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-card rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-border">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h2 className="text-base sm:text-xl font-bold text-card-foreground">Giao dịch gần đây</h2>
          <Link
            to="/transactions"
            className="flex items-center gap-1 text-sm text-purple-600 hover:text-purple-700 font-medium transition-colors"
          >
            Xem tất cả
            <ExternalLink size={14} />
          </Link>
        </div>
        {recentTransactions.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Không có giao dịch gần đây</p>
        ) : (
          <div className="divide-y divide-border">
            {recentTransactions.map((t) => {
              const iconBg    = t.isTransfer ? "bg-blue-500/10" : t.isIncome ? "bg-green-500/15"  : "bg-red-500/10";
              const Icon      = t.isTransfer ? ArrowLeftRight   : t.isIncome ? ArrowUpRight   : ArrowDownRight;
              const iconCls   = t.isTransfer ? "text-blue-400"  : t.isIncome ? "text-green-400" : "text-red-400";
              const amtCls    = t.isTransfer ? "text-blue-400"  : t.isIncome ? "text-green-400" : "text-foreground";
              const amtPrefix = t.isIncome ? "+" : t.isTransfer ? "" : "-";
              return (
                <div key={t.id} className="flex items-center justify-between py-4 hover:bg-muted px-2 rounded-lg transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${iconBg}`}>
                      <Icon size={18} className={iconCls} />
                    </div>
                    <div>
                      <p className="font-semibold text-card-foreground text-sm">{t.description || "—"}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {t.categoryName} · {t.transactionDate ? format(new Date(t.transactionDate), "dd/MM/yyyy") : ""}
                      </p>
                    </div>
                  </div>
                  <p className={`font-bold ${amtCls}`}>
                    {amtPrefix}{fmt(Math.abs(t.amount))}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </PageLayout>
  );
}
