import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, PiggyBank, Target, TrendingUp, Calendar,
  Plus, Minus, RotateCcw, Pencil, Trash2,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { format, parseISO } from "date-fns";
import { vi } from "date-fns/locale";
import { piggyBankApi } from "../../api/piggyBankApi";
import { toast } from "sonner";
import { AddMoneyModal } from "../../components/modals/AddMoneyModal";
import { RemoveMoneyModal } from "../../components/modals/RemoveMoneyModal";
import { PiggyBankFormModal } from "../../components/modals/PiggyBankFormModal";
import { useSettings } from "../../context/SettingsContext";

const COLOR_MAP = {
  green:   { bg: "bg-green-100",   text: "text-green-600",   hex: "#22c55e", grad: "from-green-500 to-green-700" },
  blue:    { bg: "bg-blue-100",    text: "text-blue-600",    hex: "#3b82f6", grad: "from-blue-500 to-blue-700" },
  purple:  { bg: "bg-purple-100",  text: "text-purple-600",  hex: "#8b5cf6", grad: "from-purple-500 to-purple-700" },
  orange:  { bg: "bg-orange-100",  text: "text-orange-600",  hex: "#f97316", grad: "from-orange-500 to-orange-700" },
  pink:    { bg: "bg-pink-100",    text: "text-pink-600",    hex: "#ec4899", grad: "from-pink-500 to-pink-700" },
  indigo:  { bg: "bg-indigo-100",  text: "text-indigo-600",  hex: "#6366f1", grad: "from-indigo-500 to-indigo-700" },
  emerald: { bg: "bg-emerald-100", text: "text-emerald-600", hex: "#10b981", grad: "from-emerald-500 to-emerald-700" },
  slate:   { bg: "bg-slate-100",   text: "text-slate-600",   hex: "#64748b", grad: "from-slate-500 to-slate-700" },
};

function buildChartData(events) {
  if (!events || events.length === 0) return [];
  let running = 0;
  return events.map(e => {
    running += e.amount;
    return {
      date: e.eventDate ? format(parseISO(e.eventDate), "dd/MM", { locale: vi }) : "",
      cumulative: Math.max(0, running),
      amount: e.amount,
    };
  });
}

const CustomTooltip = ({ active, payload, label, fmt }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg px-3 py-2 text-xs">
      <p className="font-semibold text-slate-700 mb-1">{label}</p>
      <p className="text-slate-500">Tích lũy: <span className="font-bold text-slate-900">{fmt(d.value)}</span></p>
    </div>
  );
};

export function PiggyBankDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { fmt } = useSettings();

  const [goal,       setGoal]       = useState(null);
  const [events,     setEvents]     = useState([]);
  const [isLoading,  setIsLoading]  = useState(true);
  const [addOpen,    setAddOpen]    = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [editOpen,   setEditOpen]   = useState(false);

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      const [g, evs] = await Promise.all([
        piggyBankApi.getById(id),
        piggyBankApi.getEvents(id),
      ]);
      setGoal(g);
      setEvents(evs || []);
    } catch {
      toast.error("Không thể tải dữ liệu");
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleAddMoney = async ({ amount, notes }) => {
    try {
      await piggyBankApi.addMoney(id, { amount, notes });
      await load();
      setAddOpen(false);
      toast.success(`Đã nạp ${fmt(amount)}!`);
    } catch { toast.error("Không thể nạp tiền"); }
  };

  const handleRemoveMoney = async ({ amount, notes }) => {
    try {
      await piggyBankApi.removeMoney(id, { amount, notes });
      await load();
      setRemoveOpen(false);
      toast.success(`Đã rút ${fmt(amount)}.`);
    } catch { toast.error("Không thể rút tiền"); }
  };

  const handleUpdate = async (data) => {
    try {
      await piggyBankApi.update(id, data);
      await load();
      setEditOpen(false);
      toast.success("Đã cập nhật!");
    } catch { toast.error("Không thể cập nhật"); }
  };

  const handleReset = async () => {
    if (!window.confirm("Xóa toàn bộ lịch sử giao dịch? Số tiền đã tiết kiệm sẽ về 0.")) return;
    try {
      await piggyBankApi.resetHistory(id);
      await load();
      toast.success("Đã đặt lại lịch sử.");
    } catch { toast.error("Không thể đặt lại lịch sử"); }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Xóa "${goal?.title}"? Toàn bộ lịch sử sẽ bị xóa.`)) return;
    try {
      await piggyBankApi.delete(id);
      toast.success(`Đã xóa "${goal?.title}".`);
      navigate("/piggy-banks");
    } catch { toast.error("Không thể xóa"); }
  };

  if (isLoading) {
    return (
      <div className="p-8 space-y-4">
        <div className="h-8 w-48 bg-slate-100 rounded-lg animate-pulse" />
        <div className="h-32 bg-slate-100 rounded-2xl animate-pulse" />
        <div className="grid grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-24 bg-slate-100 rounded-2xl animate-pulse" />)}
        </div>
        <div className="h-64 bg-slate-100 rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (!goal) {
    return (
      <div className="p-8 text-center text-slate-400">
        <PiggyBank size={48} className="mx-auto mb-3 text-slate-200" />
        <p>Không tìm thấy lợn tiết kiệm</p>
        <button onClick={() => navigate("/piggy-banks")} className="mt-3 text-purple-600 text-sm hover:underline">
          ← Quay lại
        </button>
      </div>
    );
  }

  const c      = COLOR_MAP[goal.color] || COLOR_MAP.purple;
  const pct    = Math.min(goal.percentage ?? 0, 100);
  const saved  = goal.currentAmount ?? 0;
  const target = goal.targetAmount  ?? 0;
  const left   = goal.leftToSave    ?? Math.max(0, target - saved);
  const chartData = buildChartData(events);

  const goalForModal = {
    ...goal,
    title:         goal.title,
    currentAmount: saved,
    targetAmount:  target,
    leftToSave:    left,
    percentage:    pct,
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">

      {/* Back + header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/piggy-banks")}
            className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div className={`w-11 h-11 rounded-xl ${c.bg} flex items-center justify-center`}>
            <PiggyBank size={22} className={c.text} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{goal.title}</h1>
            {goal.notes && <p className="text-sm text-slate-400 mt-0.5">{goal.notes}</p>}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => setAddOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 font-medium text-sm transition-colors">
            <Plus size={16} /> Nạp tiền
          </button>
          <button onClick={() => setRemoveOpen(true)} disabled={saved <= 0}
            className="flex items-center gap-2 px-4 py-2 bg-orange-400 text-white rounded-lg hover:bg-orange-500 font-medium text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
            <Minus size={16} /> Rút tiền
          </button>
          <button onClick={() => setEditOpen(true)}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-purple-600 transition-colors" title="Sửa">
            <Pencil size={18} />
          </button>
          <button onClick={handleDelete}
            className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors" title="Xóa">
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      {/* Progress hero */}
      <div className={`bg-gradient-to-br ${c.grad} rounded-2xl p-6 text-white mb-6`}>
        <div className="flex items-end justify-between mb-4">
          <div>
            <p className="text-white/70 text-xs font-medium mb-1">Đã tiết kiệm</p>
            <p className="text-4xl font-bold">{fmt(saved)}</p>
          </div>
          <div className="text-right">
            <p className="text-white/70 text-xs">Mục tiêu</p>
            <p className="text-xl font-semibold">{fmt(target)}</p>
          </div>
        </div>
        <div className="w-full h-3 bg-white/20 rounded-full mb-2">
          <div className="h-3 bg-white rounded-full transition-all duration-700"
            style={{ width: `${pct}%` }} />
        </div>
        <div className="flex justify-between text-xs text-white/80">
          <span>{pct.toFixed(1)}% hoàn thành</span>
          <span>Còn lại {fmt(left)}</span>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-slate-500">Còn lại</p>
            <Target size={16} className="text-slate-300" />
          </div>
          <p className="text-xl font-bold text-slate-900">{fmt(left)}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-slate-500">/ tháng</p>
            <TrendingUp size={16} className="text-slate-300" />
          </div>
          <p className="text-xl font-bold text-slate-900">{goal.savePerMonth > 0 ? fmt(goal.savePerMonth) : "—"}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-slate-500">Ngày mục tiêu</p>
            <Calendar size={16} className="text-slate-300" />
          </div>
          <p className="text-xl font-bold text-slate-900 text-sm">{goal.targetDate ?? "—"}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-slate-500">Số lần giao dịch</p>
            <PiggyBank size={16} className="text-slate-300" />
          </div>
          <p className="text-xl font-bold text-slate-900">{events.length}</p>
        </div>
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-bold text-slate-700">Lịch sử tích lũy</p>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData} margin={{ top: 5, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false}
                tickFormatter={v => (v >= 1_000_000 ? `${(v/1_000_000).toFixed(1)}M` : v >= 1000 ? `${(v/1000).toFixed(0)}K` : v)} />
              <Tooltip content={<CustomTooltip fmt={fmt} />} />
              <ReferenceLine y={target} stroke={c.hex} strokeDasharray="4 4" strokeWidth={1.5} label={{ value: "Mục tiêu", fill: c.hex, fontSize: 11 }} />
              <Line type="monotone" dataKey="cumulative" stroke={c.hex} strokeWidth={2.5}
                dot={{ r: 3, fill: c.hex, strokeWidth: 0 }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Events table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Lịch sử giao dịch</p>
          {events.length > 0 && (
            <button onClick={handleReset}
              className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-600 transition-colors">
              <RotateCcw size={12} /> Đặt lại lịch sử
            </button>
          )}
        </div>

        {events.length === 0 ? (
          <div className="py-14 flex flex-col items-center text-slate-300">
            <PiggyBank size={36} className="mb-3" />
            <p className="text-sm">Chưa có giao dịch nào</p>
          </div>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="text-xs text-slate-500 uppercase tracking-wider bg-slate-50/30">
                <th className="px-6 py-3 font-semibold">Ngày</th>
                <th className="px-6 py-3 font-semibold">Loại</th>
                <th className="px-6 py-3 font-semibold">Ghi chú</th>
                <th className="px-6 py-3 font-semibold text-right">Số tiền</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {[...events].reverse().map(e => {
                const isAdd = e.amount > 0;
                return (
                  <tr key={e.eventId} className="hover:bg-slate-50">
                    <td className="px-6 py-3 text-sm text-slate-600">
                      {e.eventDate
                        ? format(parseISO(e.eventDate), "dd/MM/yyyy HH:mm", { locale: vi })
                        : "—"}
                    </td>
                    <td className="px-6 py-3">
                      <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                        isAdd ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
                      }`}>
                        {isAdd ? <Plus size={10} /> : <Minus size={10} />}
                        {isAdd ? "Nạp tiền" : "Rút tiền"}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-sm text-slate-500">{e.notes || "—"}</td>
                    <td className={`px-6 py-3 text-sm font-bold text-right ${isAdd ? "text-green-600" : "text-orange-500"}`}>
                      {isAdd ? "+" : ""}{fmt(Math.abs(e.amount))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modals */}
      <AddMoneyModal    isOpen={addOpen}    onClose={() => setAddOpen(false)}    onSave={handleAddMoney}    goal={goalForModal} />
      <RemoveMoneyModal isOpen={removeOpen} onClose={() => setRemoveOpen(false)} onSave={handleRemoveMoney} goal={goalForModal} />
      <PiggyBankFormModal isOpen={editOpen} onClose={() => setEditOpen(false)} onSave={handleUpdate} goal={goal} />
    </div>
  );
}
