import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router";
import {
  ArrowLeft, Receipt, CheckCircle2, AlertCircle, Clock,
  MinusCircle, Pencil, Trash2, RefreshCw,
  Calendar, DollarSign, TrendingDown,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";
import { format, parseISO } from "date-fns";
import { vi } from "date-fns/locale";
import { billApi } from "../../api/billApi";
import { toast } from "sonner";
import { SubscriptionFormModal } from "../../components/modals/SubscriptionFormModal";
import { useSettings } from "../../context/SettingsContext";

const FREQ_LABELS = {
  daily:       "Hàng ngày",
  weekly:      "Hàng tuần",
  monthly:     "Hàng tháng",
  quarterly:   "Hàng quý",
  "half-year": "Nửa năm",
  yearly:      "Hàng năm",
};

const STATUS_CONFIG = {
  inactive:        { icon: MinusCircle,  cls: "text-slate-500 bg-slate-100",   label: "Không hoạt động" },
  not_expected:    { icon: Clock,        cls: "text-slate-500 bg-slate-100",   label: "Không cần trả" },
  expected_unpaid: { icon: AlertCircle,  cls: "text-yellow-700 bg-yellow-100", label: "Chưa trả" },
  paid:            { icon: CheckCircle2, cls: "text-green-700 bg-green-100",   label: "Đã trả" },
};

function buildChartData(transactions) {
  if (!transactions?.length) return [];
  const byMonth = {};
  transactions.forEach(t => {
    const key = t.transactionDate ? format(parseISO(t.transactionDate), "MM/yyyy") : "?";
    byMonth[key] = (byMonth[key] ?? 0) + (t.amount ?? 0);
  });
  return Object.entries(byMonth)
    .sort(([a], [b]) => {
      const [ma, ya] = a.split("/").map(Number);
      const [mb, yb] = b.split("/").map(Number);
      return ya !== yb ? ya - yb : ma - mb;
    })
    .map(([month, amount]) => ({ month, amount }));
}

const ChartTooltip = ({ active, payload, label, fmt }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg px-3 py-2 text-xs">
      <p className="font-semibold text-slate-700 mb-1">{label}</p>
      <p className="text-purple-600 font-bold">{fmt(payload[0].value)}</p>
    </div>
  );
};

export function SubscriptionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { fmt } = useSettings();

  const [bill,      setBill]      = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [editOpen,  setEditOpen]  = useState(false);
  const [rescanning,setRescanning]= useState(false);

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await billApi.getById(id);
      setBill(data);
    } catch {
      toast.error("Không thể tải dữ liệu");
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleUpdate = async (data) => {
    try {
      await billApi.update(id, data);
      await load();
      setEditOpen(false);
      toast.success("Đã cập nhật!");
    } catch { toast.error("Không thể cập nhật"); }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Xóa "${bill?.name}"?`)) return;
    try {
      await billApi.delete(id);
      toast.success(`Đã xóa "${bill?.name}".`);
      navigate("/subscriptions");
    } catch { toast.error("Không thể xóa"); }
  };

  const handleRescan = async () => {
    try {
      setRescanning(true);
      await billApi.rescan(id);
      await load();
      toast.success("Quét lại hoàn tất!");
    } catch (e) {
      toast.error(e?.response?.data?.message ?? "Không thể quét lại");
    } finally {
      setRescanning(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 space-y-4">
        <div className="h-8 w-48 bg-slate-100 rounded-lg animate-pulse" />
        <div className="grid grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-24 bg-slate-100 rounded-2xl animate-pulse" />)}
        </div>
        <div className="h-64 bg-slate-100 rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (!bill) {
    return (
      <div className="p-8 text-center text-slate-400">
        <Receipt size={48} className="mx-auto mb-3 text-slate-200" />
        <p>Không tìm thấy hóa đơn</p>
        <button onClick={() => navigate("/subscriptions")} className="mt-3 text-purple-600 text-sm hover:underline">
          ← Quay lại
        </button>
      </div>
    );
  }

  const statusCfg   = STATUS_CONFIG[bill.paidStatus] ?? STATUS_CONFIG.not_expected;
  const StatusIcon  = statusCfg.icon;
  const chartData   = buildChartData(bill.matchedTransactions);
  const avgActual   = bill.matchedTransactions?.length
    ? bill.matchedTransactions.reduce((s, t) => s + t.amount, 0) / bill.matchedTransactions.length
    : 0;

  return (
    <div className="p-8 max-w-5xl mx-auto">

      {/* Back + header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/subscriptions")}
            className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div className="w-11 h-11 rounded-xl bg-purple-100 flex items-center justify-center">
            <Receipt size={22} className="text-purple-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900">{bill.name}</h1>
              {!bill.active && (
                <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-semibold">Tắt</span>
              )}
            </div>
            {bill.objectGroup && (
              <p className="text-sm text-slate-400">{bill.objectGroup}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={handleRescan} disabled={rescanning || !bill.active}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg font-medium text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
            <RefreshCw size={14} className={rescanning ? "animate-spin" : ""} />
            Quét lại
          </button>
          <button onClick={() => setEditOpen(true)}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-purple-600 transition-colors">
            <Pencil size={18} />
          </button>
          <button onClick={handleDelete}
            className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors">
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-slate-500">Khoảng tiền</p>
            <DollarSign size={15} className="text-slate-300" />
          </div>
          <p className="text-base font-bold text-slate-900">
            {fmt(bill.amountMin)} – {fmt(bill.amountMax)}
          </p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-slate-500">Trạng thái kỳ này</p>
            <StatusIcon size={15} className="text-slate-300" />
          </div>
          <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${statusCfg.cls}`}>
            <StatusIcon size={10} /> {statusCfg.label}
          </span>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-slate-500">Tiếp theo</p>
            <Calendar size={15} className="text-slate-300" />
          </div>
          <p className="text-base font-bold text-slate-900">
            {bill.nextExpectedMatch
              ? format(parseISO(bill.nextExpectedMatch), "dd/MM/yyyy", { locale: vi })
              : "—"}
          </p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-slate-500">TB thực tế</p>
            <TrendingDown size={15} className="text-slate-300" />
          </div>
          <p className="text-base font-bold text-slate-900">{avgActual > 0 ? fmt(avgActual) : "—"}</p>
        </div>
      </div>

      {/* Info row */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-xs text-slate-400 mb-0.5">Tần suất</p>
            <p className="font-semibold text-slate-800">
              {FREQ_LABELS[bill.repeatFreq] ?? bill.repeatFreq}
              {bill.skip > 0 ? ` (bỏ ${bill.skip})` : ""}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-0.5">Bắt đầu từ</p>
            <p className="font-semibold text-slate-800">
              {bill.date ? format(parseISO(bill.date), "dd/MM/yyyy") : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-0.5">Kết thúc</p>
            <p className="font-semibold text-slate-800">
              {bill.endDate ? format(parseISO(bill.endDate), "dd/MM/yyyy") : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-0.5">Đã khớp</p>
            <p className="font-semibold text-slate-800">{bill.matchedCount} giao dịch</p>
          </div>
        </div>
        {bill.notes && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <p className="text-xs text-slate-400 mb-1">Ghi chú</p>
            <p className="text-sm text-slate-600">{bill.notes}</p>
          </div>
        )}
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
          <p className="text-sm font-bold text-slate-700 mb-4">Lịch sử giao dịch khớp</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} margin={{ top: 5, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false}
                tickFormatter={v => v >= 1_000_000 ? `${(v/1_000_000).toFixed(1)}M` : v >= 1000 ? `${(v/1000).toFixed(0)}K` : v} />
              <Tooltip content={<ChartTooltip fmt={fmt} />} />
              <Bar dataKey="amount" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Matched transactions */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-3 border-b border-slate-100 bg-slate-50/50">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Giao dịch đã khớp</p>
        </div>
        {!bill.matchedTransactions?.length ? (
          <div className="py-12 flex flex-col items-center text-slate-300">
            <Receipt size={36} className="mb-3" />
            <p className="text-sm">Chưa có giao dịch nào khớp</p>
            <p className="text-xs mt-1 text-slate-400">Nhấn "Quét lại" để tìm giao dịch tự động</p>
          </div>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="text-xs text-slate-500 uppercase tracking-wider bg-slate-50/30">
                <th className="px-6 py-3 font-semibold">Ngày</th>
                <th className="px-6 py-3 font-semibold">Mô tả</th>
                <th className="px-6 py-3 font-semibold text-right">Số tiền</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {bill.matchedTransactions.map(t => (
                <tr key={t.journalId} className="hover:bg-slate-50">
                  <td className="px-6 py-3 text-sm text-slate-600">
                    {t.transactionDate
                      ? format(parseISO(t.transactionDate), "dd/MM/yyyy", { locale: vi })
                      : "—"}
                  </td>
                  <td className="px-6 py-3 text-sm text-slate-700">{t.description || "—"}</td>
                  <td className="px-6 py-3 text-sm font-bold text-purple-600 text-right">
                    {fmt(t.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Edit modal */}
      <SubscriptionFormModal isOpen={editOpen} onClose={() => setEditOpen(false)} onSave={handleUpdate} bill={bill} />
    </div>
  );
}
