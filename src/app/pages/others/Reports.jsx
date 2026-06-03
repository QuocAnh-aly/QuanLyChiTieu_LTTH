import { useEffect, useMemo, useState } from "react";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  Calendar, TrendingUp, TrendingDown, DollarSign, RefreshCw, AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useSettings } from "../../context/SettingsContext";
import { insightApi } from "../../api/insightApi";

// Rotating palette for category slices (matches sidebar/brand colors)
const CHART_PALETTE = [
  "#f97316", "#3b82f6", "#10b981", "#a855f7", "#64748b",
  "#facc15", "#ef4444", "#06b6d4", "#84cc16", "#ec4899",
];

// When the range covers a single year, "Th3" is unambiguous; when it spans
// multiple years (e.g. "Toàn thời gian") we append the 2-digit year so bars
// from different years don't collide under the same label.
const monthLabel = (yyyyMm, multiYear) => {
  const [y, m] = yyyyMm.split("-");
  return multiYear ? `T${parseInt(m, 10)}/${y.slice(2)}` : `Th${parseInt(m, 10)}`;
};

function resolveRange(rangeKey) {
  const now = new Date();
  const iso = (d) => d.toISOString().slice(0, 10);
  const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
  const startOfYear  = (d) => new Date(d.getFullYear(), 0, 1);
  const endOfDay     = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59);
  const lastDayPrev  = (d) => new Date(d.getFullYear(), d.getMonth(), 0, 23, 59, 59);

  switch (rangeKey) {
    case "this_month":
      return { from: iso(startOfMonth(now)), to: iso(endOfDay(now)) };
    case "last_month": {
      const last = startOfMonth(new Date(now.getFullYear(), now.getMonth() - 1, 1));
      return { from: iso(last), to: iso(lastDayPrev(now)) };
    }
    case "this_year":
      return { from: iso(startOfYear(now)), to: iso(endOfDay(now)) };
    case "all_time":
      // 5 years back is a sensible cap to keep the chart readable
      return { from: `${now.getFullYear() - 5}-01-01`, to: iso(endOfDay(now)) };
    default:
      return { from: iso(startOfYear(now)), to: iso(endOfDay(now)) };
  }
}

export function Reports() {
  const { fmt } = useSettings();
  const [dateRange, setDateRange] = useState("this_year");
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState(null);

  const [incomeTotal,  setIncomeTotal]  = useState(0);
  const [expenseTotal, setExpenseTotal] = useState(0);
  const [monthly,      setMonthly]      = useState([]);
  const [byCategory,   setByCategory]   = useState([]);

  const errMsg = (e) => e?.response?.data?.message || e?.message || "Lỗi không xác định";

  const fetchAll = async () => {
    const params = resolveRange(dateRange);
    setLoading(true);
    setError(null);
    try {
      const [inc, exp, m, cat] = await Promise.all([
        insightApi.incomeTotal(params),
        insightApi.expenseTotal(params),
        insightApi.monthly(params),
        insightApi.expenseByCategory(params),
      ]);
      setIncomeTotal(Number(inc?.total ?? 0));
      setExpenseTotal(Number(exp?.total ?? 0));
      setMonthly(Array.isArray(m) ? m : []);
      setByCategory(Array.isArray(cat) ? cat : []);
    } catch (e) {
      setError(errMsg(e));
      toast.error(errMsg(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, [dateRange]);

  const savings = incomeTotal - expenseTotal;
  const savingsRate = incomeTotal > 0 ? (savings / incomeTotal) * 100 : 0;

  const monthlyData = useMemo(
    () => {
      const multiYear = new Set(monthly.map(r => r.month.split("-")[0])).size > 1;
      return monthly.map(r => ({
        name:    monthLabel(r.month, multiYear),
        monthKey: r.month,
        income:  Number(r.income  ?? 0),
        expense: Number(r.expense ?? 0),
      }));
    },
    [monthly]
  );

  const categoryData = useMemo(
    () => byCategory.map((c, i) => ({
      name:  c.label || c.key,
      value: Number(c.amount ?? 0),
      color: CHART_PALETTE[i % CHART_PALETTE.length],
    })),
    [byCategory]
  );

  const hasAnyData = incomeTotal > 0 || expenseTotal > 0 || monthlyData.some(r => r.income > 0 || r.expense > 0);

  return (
    <div className="p-4 sm:p-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 sm:mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-card-foreground">Báo cáo phân tích</h1>
          <p className="text-muted-foreground mt-1 text-sm">Cái nhìn toàn cảnh về tình hình tài chính của bạn</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-2 shadow-sm">
            <Calendar size={16} className="text-muted-foreground" />
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="text-sm font-medium text-foreground bg-transparent focus:outline-none"
            >
              <option value="this_month">Tháng này</option>
              <option value="last_month">Tháng trước</option>
              <option value="this_year">Năm nay</option>
              <option value="all_time">Toàn thời gian</option>
            </select>
          </div>
          <button
            onClick={fetchAll}
            disabled={loading}
            className="p-2.5 bg-card border border-border rounded-lg text-muted-foreground hover:bg-muted transition-colors shadow-sm disabled:opacity-60"
            title="Làm mới"
          >
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 flex items-start gap-3 p-4 bg-destructive/10 border border-destructive/30 rounded-xl text-red-700">
          <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Không tải được dữ liệu</p>
            <p className="text-sm opacity-90">{error}</p>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-card rounded-2xl p-6 border border-border shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-emerald-500/15 flex items-center justify-center">
            <TrendingUp size={24} className="text-emerald-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Tổng thu</p>
            <p className="text-2xl font-bold text-card-foreground">{fmt(incomeTotal)}</p>
          </div>
        </div>

        <div className="bg-card rounded-2xl p-6 border border-border shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-rose-500/15 flex items-center justify-center">
            <TrendingDown size={24} className="text-rose-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Tổng chi</p>
            <p className="text-2xl font-bold text-card-foreground">{fmt(expenseTotal)}</p>
          </div>
        </div>

        <div className={`rounded-2xl p-6 shadow-sm flex items-center gap-4 text-white relative overflow-hidden bg-gradient-to-br ${savings >= 0 ? "from-purple-600 to-indigo-700" : "from-rose-600 to-red-700"}`}>
          <div className="absolute right-0 top-0 w-32 h-32 bg-card opacity-10 rounded-full -mr-10 -mt-10" />
          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center relative z-10">
            <DollarSign size={24} className="text-white" />
          </div>
          <div className="relative z-10">
            <p className="text-sm font-medium text-white/80">{savings >= 0 ? "Tiết kiệm ròng" : "Bội chi"}</p>
            <p className="text-2xl font-bold">{fmt(savings)}</p>
            {incomeTotal > 0 && (
              <p className="text-xs font-medium text-white/80 mt-0.5">
                Tỷ lệ tiết kiệm: {savingsRate.toFixed(1)}%
              </p>
            )}
          </div>
        </div>
      </div>

      {!loading && !error && !hasAnyData ? (
        <div className="py-16 text-center bg-card rounded-2xl border border-border shadow-sm">
          <Calendar size={48} className="mx-auto text-muted-foreground mb-4" />
          <p className="text-card-foreground font-bold text-lg mb-1">Chưa có giao dịch nào trong khoảng thời gian này</p>
          <p className="text-muted-foreground font-medium">Đổi sang khoảng khác hoặc thêm giao dịch để xem báo cáo.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
          {/* Bar Chart: Income vs Expense */}
          <div className="xl:col-span-2 bg-card rounded-2xl p-6 border border-border shadow-sm">
            <h2 className="text-lg font-bold text-card-foreground mb-6">Biến động Thu - Chi theo tháng</h2>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }} dy={10} />
                  <YAxis
                    axisLine={false} tickLine={false}
                    tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }}
                    tickFormatter={(value) => {
                      const n = Number(value);
                      if (!n) return "0";
                      if (Math.abs(n) >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
                      if (Math.abs(n) >= 1_000_000)     return `${(n / 1_000_000).toFixed(1)}M`;
                      if (Math.abs(n) >= 1_000)         return `${(n / 1_000).toFixed(0)}k`;
                      return `${n}`;
                    }}
                  />
                  <Tooltip
                    cursor={{ fill: "var(--color-muted)" }}
                    contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)" }}
                    formatter={(value, name) => [fmt(value), name]}
                  />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: "20px", fontSize: "12px" }} />
                  <Bar dataKey="income"  name="Thu nhập" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  <Bar dataKey="expense" name="Chi tiêu" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Pie Chart: Expenses by Category */}
          <div className="bg-card rounded-2xl p-6 border border-border shadow-sm flex flex-col">
            <h2 className="text-lg font-bold text-card-foreground mb-2">Cơ cấu chi tiêu</h2>
            {categoryData.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
                Chưa có dữ liệu chi tiêu.
              </div>
            ) : (
              <div className="flex-1 flex flex-col justify-center">
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%" cy="50%"
                        innerRadius={60} outerRadius={80}
                        paddingAngle={2} dataKey="value"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) => [fmt(value), ""]}
                        contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="mt-4 space-y-3 max-h-44 overflow-y-auto pr-1">
                  {categoryData.map((item, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                        <span className="text-muted-foreground truncate">{item.name}</span>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="font-semibold text-card-foreground">{fmt(item.value)}</span>
                        <span className="text-muted-foreground text-xs w-10 text-right">
                          {expenseTotal > 0 ? Math.round((item.value / expenseTotal) * 100) : 0}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
