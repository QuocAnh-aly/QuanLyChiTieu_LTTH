import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import {
  Receipt, Plus, Pencil, Trash2, GripVertical,
  CheckCircle2, AlertCircle, MinusCircle, Clock,
  TrendingDown, CalendarClock, Layers,
} from "lucide-react";
import { format, parseISO, differenceInDays } from "date-fns";
import { vi } from "date-fns/locale";
import { toast } from "sonner";
import { billApi } from "../../api/billApi";
import { SubscriptionFormModal } from "../../components/modals/SubscriptionFormModal";
import { useSettings } from "../../context/SettingsContext";

const FREQ_LABELS = {
  daily:      "Hàng ngày",
  weekly:     "Hàng tuần",
  monthly:    "Hàng tháng",
  quarterly:  "Hàng quý",
  "half-year": "Nửa năm",
  yearly:     "Hàng năm",
};

// Monthly equivalent multipliers
const MONTHLY_FACTOR = {
  daily:       30,
  weekly:      4.33,
  monthly:     1,
  quarterly:   1 / 3,
  "half-year": 1 / 6,
  yearly:      1 / 12,
};

const STATUS_CONFIG = {
  inactive:         { icon: MinusCircle, cls: "text-slate-400 bg-slate-100",         label: "~" },
  not_expected:     { icon: Clock,       cls: "text-slate-400 bg-slate-100",         label: "Không cần" },
  expected_unpaid:  { icon: AlertCircle, cls: "text-yellow-700 bg-yellow-100",       label: "Chưa trả" },
  paid:             { icon: CheckCircle2, cls: "text-green-700 bg-green-100",        label: "Đã trả" },
};

function PaidBadge({ status }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.not_expected;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.cls}`}>
      <Icon size={11} /> {cfg.label}
    </span>
  );
}

export function Subscriptions() {
  const { fmt } = useSettings();
  const navigate = useNavigate();

  const [bills,    setBills]    = useState([]);
  const [isLoading,setIsLoading]= useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editBill, setEditBill] = useState(null);

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await billApi.getAll();
      setBills(data || []);
    } catch {
      toast.error("Không thể tải danh sách hóa đơn");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (data) => {
    try {
      await billApi.create(data);
      await load();
      setFormOpen(false);
      toast.success(`Đã tạo "${data.name}"!`);
    } catch { toast.error("Không thể tạo hóa đơn"); }
  };

  const handleUpdate = async (data) => {
    try {
      await billApi.update(editBill.billId, data);
      await load();
      setEditBill(null);
      toast.success("Đã cập nhật!");
    } catch { toast.error("Không thể cập nhật"); }
  };

  const handleDelete = async (bill) => {
    if (!window.confirm(`Xóa "${bill.name}"?`)) return;
    try {
      await billApi.delete(bill.billId);
      await load();
      toast.success(`Đã xóa "${bill.name}".`);
    } catch { toast.error("Không thể xóa"); }
  };

  // ─── Summaries ─────────────────────────────────────────────────────────────

  const activeBills = bills.filter(b => b.active);

  const totalMonthly = activeBills.reduce((sum, b) => {
    const factor = MONTHLY_FACTOR[b.repeatFreq] ?? 1;
    return sum + (b.averageAmount ?? 0) * factor;
  }, 0);

  const today = new Date();
  const dueSoon = activeBills.filter(b => {
    if (!b.nextExpectedMatch) return false;
    const diff = differenceInDays(parseISO(b.nextExpectedMatch), today);
    return diff >= 0 && diff <= 7;
  }).length;

  // ─── Group by objectGroup ───────────────────────────────────────────────────

  const groups = bills.reduce((acc, b) => {
    const key = b.objectGroup || "";
    if (!acc[key]) acc[key] = [];
    acc[key].push(b);
    return acc;
  }, {});

  // Sort: named groups first, then "" (no group)
  const sortedGroups = Object.entries(groups).sort(([a], [b]) => {
    if (!a) return 1;
    if (!b) return -1;
    return a.localeCompare(b);
  });

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
              <Receipt size={20} className="text-purple-600" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900">Hóa đơn định kỳ</h1>
          </div>
          <p className="text-slate-500 text-sm ml-[52px]">Theo dõi và khớp các khoản chi tự động</p>
        </div>
        <button onClick={() => setFormOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium">
          <Plus size={18} /> Thêm hóa đơn
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gradient-to-br from-purple-500 to-violet-700 rounded-2xl p-5 text-white">
          <p className="text-purple-100 text-xs font-medium mb-1">Chi hàng tháng (ước tính)</p>
          <p className="text-3xl font-bold mb-1">{fmt(totalMonthly)}</p>
          <p className="text-purple-200 text-xs">{activeBills.length} hóa đơn đang hoạt động</p>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <p className="text-slate-500 text-xs font-medium">Tổng hóa đơn</p>
            <Layers size={18} className="text-slate-300" />
          </div>
          <p className="text-3xl font-bold text-slate-900 mb-1">{bills.length}</p>
          <p className="text-slate-400 text-xs">{bills.filter(b => !b.active).length} đang tắt</p>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <p className="text-slate-500 text-xs font-medium">Sắp đến hạn (7 ngày)</p>
            <CalendarClock size={18} className="text-slate-300" />
          </div>
          <p className={`text-3xl font-bold mb-1 ${dueSoon > 0 ? "text-orange-500" : "text-slate-900"}`}>{dueSoon}</p>
          <p className="text-slate-400 text-xs">hóa đơn cần thanh toán</p>
        </div>
      </div>

      {/* Bills list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-16 bg-slate-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : bills.length === 0 ? (
        <div className="py-20 flex flex-col items-center justify-center bg-white rounded-2xl border border-dashed border-slate-300">
          <Receipt size={48} className="text-slate-200 mb-4" />
          <p className="font-medium text-slate-500">Chưa có hóa đơn nào</p>
          <p className="text-sm text-slate-400 mt-1">Nhấn "Thêm hóa đơn" để bắt đầu</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedGroups.map(([groupName, groupBills]) => {
            const groupMonthly = groupBills.filter(b => b.active).reduce((sum, b) => {
              const factor = MONTHLY_FACTOR[b.repeatFreq] ?? 1;
              return sum + (b.averageAmount ?? 0) * factor;
            }, 0);

            return (
              <div key={groupName || "__no_group__"} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                {/* Group header */}
                <div className="px-6 py-3 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    {groupName || "Không có nhóm"}
                  </p>
                  <p className="text-xs text-slate-400 font-medium">
                    ~{fmt(groupMonthly)}/tháng
                  </p>
                </div>

                {/* Rows */}
                <div className="divide-y divide-slate-100">
                  {groupBills.map(bill => {
                    const nextDate  = bill.nextExpectedMatch ? parseISO(bill.nextExpectedMatch) : null;
                    const daysUntil = nextDate ? differenceInDays(nextDate, today) : null;
                    const isExpired = bill.endDate && new Date(bill.endDate) < today;

                    return (
                      <div key={bill.billId}
                        className={`px-4 py-3.5 hover:bg-slate-50 transition-colors flex items-center gap-3 group ${!bill.active ? "opacity-60" : ""}`}>
                        {/* Drag handle (visual only) */}
                        <GripVertical size={16} className="text-slate-300 shrink-0 cursor-grab" />

                        {/* Icon */}
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${bill.active ? "bg-purple-100" : "bg-slate-100"}`}>
                          <Receipt size={16} className={bill.active ? "text-purple-600" : "text-slate-400"} />
                        </div>

                        {/* Name + freq */}
                        <div className="flex-1 min-w-0 cursor-pointer"
                          onClick={() => navigate(`/subscriptions/${bill.billId}`)}>
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className="font-semibold text-slate-900 text-sm truncate">{bill.name}</p>
                            {!bill.active && (
                              <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-medium">Tắt</span>
                            )}
                            {isExpired && (
                              <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-medium">Hết hạn</span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400">
                            {FREQ_LABELS[bill.repeatFreq] ?? bill.repeatFreq}
                            {bill.skip > 0 ? ` · bỏ ${bill.skip} chu kỳ` : ""}
                          </p>
                        </div>

                        {/* Amount range */}
                        <div className="hidden md:block text-right shrink-0">
                          <p className="text-xs text-slate-400 mb-0.5">Khoảng tiền</p>
                          <p className="text-sm font-semibold text-slate-700">
                            {fmt(bill.amountMin)} – {fmt(bill.amountMax)}
                          </p>
                        </div>

                        {/* Paid status */}
                        <div className="hidden lg:block shrink-0">
                          <PaidBadge status={bill.paidStatus} />
                        </div>

                        {/* Next expected */}
                        <div className="hidden md:block text-right shrink-0 w-28">
                          <p className="text-xs text-slate-400 mb-0.5">Tiếp theo</p>
                          {nextDate ? (
                            <p className={`text-xs font-semibold ${daysUntil !== null && daysUntil <= 7 ? "text-orange-500" : "text-slate-700"}`}>
                              {format(nextDate, "dd/MM/yyyy", { locale: vi })}
                            </p>
                          ) : (
                            <p className="text-xs text-slate-400">—</p>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button onClick={() => setEditBill(bill)}
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-purple-600 transition-colors" title="Sửa">
                            <Pencil size={14} />
                          </button>
                          <button onClick={() => handleDelete(bill)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors" title="Xóa">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Group subtotal */}
                <div className="px-6 py-2 bg-slate-50/40 border-t border-slate-100 flex justify-end gap-8 text-xs">
                  <span className="text-slate-400">
                    Tổng nhóm (ước tính/tháng):&nbsp;
                    <span className="font-bold text-slate-700">{fmt(groupMonthly)}</span>
                  </span>
                </div>
              </div>
            );
          })}

          {/* Grand total */}
          {sortedGroups.length > 1 && (
            <div className="bg-slate-50 rounded-xl border border-slate-200 px-6 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <TrendingDown size={16} className="text-purple-500" />
                Tổng ước tính hàng tháng
              </div>
              <p className="text-lg font-bold text-purple-700">{fmt(totalMonthly)}</p>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <SubscriptionFormModal isOpen={formOpen}    onClose={() => setFormOpen(false)} onSave={handleCreate} />
      <SubscriptionFormModal isOpen={!!editBill}  onClose={() => setEditBill(null)}  onSave={handleUpdate} bill={editBill} />
    </div>
  );
}
