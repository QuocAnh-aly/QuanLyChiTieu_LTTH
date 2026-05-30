import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  PiggyBank, Plus, Pencil, Trash2, TrendingUp, Target,
  Plus as PlusIcon, Minus, ChevronRight,
} from "lucide-react";
import { piggyBankApi } from "../../api/piggyBankApi";
import { walletApi } from "../../api/walletApi";
import { toast } from "sonner";
import { PiggyBankFormModal } from "../../components/modals/PiggyBankFormModal";
import { useSettings } from "../../context/SettingsContext";
import { useNotifications } from "../../context/NotificationContext";

const COLOR_MAP = {
  green:   { bg: "bg-green-100",   text: "text-green-600",   hex: "#22c55e" },
  blue:    { bg: "bg-blue-100",    text: "text-blue-600",    hex: "#3b82f6" },
  purple:  { bg: "bg-purple-100",  text: "text-purple-600",  hex: "#8b5cf6" },
  orange:  { bg: "bg-orange-100",  text: "text-orange-600",  hex: "#f97316" },
  pink:    { bg: "bg-pink-100",    text: "text-pink-600",    hex: "#ec4899" },
  indigo:  { bg: "bg-indigo-100",  text: "text-indigo-600",  hex: "#6366f1" },
  emerald: { bg: "bg-emerald-100", text: "text-emerald-600", hex: "#10b981" },
  slate:   { bg: "bg-muted",   text: "text-muted-foreground",   hex: "#64748b" },
};

function mapGoal(g) {
  const c = COLOR_MAP[g.color] || COLOR_MAP.purple;
  return {
    ...g,
    id:         g.budgetId,
    name:       g.title,
    saved:      g.currentAmount ?? 0,
    target:     g.targetAmount  ?? 0,
    leftToSave: g.leftToSave    ?? Math.max(0, (g.targetAmount ?? 0) - (g.currentAmount ?? 0)),
    pct:        Math.min(g.percentage ?? 0, 100),
    bg:         c.bg,
    textCls:    c.text,
    hex:        c.hex,
  };
}

import { PageLayout } from "../../components/layout/PageLayout";

export function PiggyBanks() {
  const { fmt } = useSettings();
  const navigate = useNavigate();

  const [goals,       setGoals]       = useState([]);
  const [accounts,    setAccounts]    = useState([]);
  const [isLoading,   setIsLoading]   = useState(true);
  const [formOpen,    setFormOpen]    = useState(false);
  const [editGoal,    setEditGoal]    = useState(null);

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      const [gData, aData] = await Promise.all([
        piggyBankApi.getAll(),
        walletApi.getByType(1),
      ]);
      setGoals((gData || []).map(mapGoal));
      setAccounts(aData.items || aData || []);
    } catch {
      toast.error("Không thể tải dữ liệu");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const { addNotification } = useNotifications();

  const handleCreate = async (data) => {
    try {
      await piggyBankApi.create(data);
      await load();
      setFormOpen(false);
      toast.success(`Đã tạo "${data.title}"!`);
      addNotification({ type: 'success', title: 'Đã tạo lợn tiết kiệm', message: `"${data.title}" đã được tạo thành công`, link: '/piggy-banks' });
    } catch {
      toast.error("Không thể tạo lợn tiết kiệm");
      addNotification({ type: 'error', title: 'Lỗi tạo lợn tiết kiệm', message: 'Không thể tạo lợn tiết kiệm mới' });
    }
  };

  const handleUpdate = async (data) => {
    try {
      await piggyBankApi.update(editGoal.id, data);
      await load();
      setEditGoal(null);
      toast.success("Đã cập nhật!");
      addNotification({ type: 'success', title: 'Đã cập nhật lợn tiết kiệm', message: `"${editGoal.name}" đã được cập nhật` });
    } catch {
      toast.error("Không thể cập nhật");
      addNotification({ type: 'error', title: 'Lỗi cập nhật', message: 'Không thể cập nhật lợn tiết kiệm' });
    }
  };

  const handleDelete = async (goal) => {
    if (!window.confirm(`Xóa "${goal.name}"? Toàn bộ lịch sử sẽ bị xóa.`)) return;
    try {
      await piggyBankApi.delete(goal.id);
      await load();
      toast.success(`Đã xóa "${goal.name}".`);
      addNotification({ type: 'success', title: 'Đã xóa lợn tiết kiệm', message: `"${goal.name}" đã được xóa` });
    } catch {
      toast.error("Không thể xóa");
      addNotification({ type: 'error', title: 'Lỗi xóa', message: 'Không thể xóa lợn tiết kiệm' });
    }
  };

  const totalSaved   = goals.reduce((s, g) => s + g.saved, 0);
  const totalTarget  = goals.reduce((s, g) => s + g.target, 0);
  const totalMonthly = goals.reduce((s, g) => s + (g.savePerMonth ?? 0), 0);

  // Account status — sum currentAmount per account
  const accountStatus = accounts.map(a => {
    const linked = goals.filter(g => g.accountId === a.accountId);
    const assigned = linked.reduce((s, g) => s + g.saved, 0);
    return { ...a, assigned, remaining: (a.balance ?? 0) - assigned };
  }).filter(a => goals.some(g => g.accountId === a.accountId));

  return (
    <PageLayout
      title={
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
            <PiggyBank size={20} className="text-purple-600" />
          </div>
          <span>Lợn tiết kiệm</span>
        </div>
      }
      subtitle={<span className="ml-[52px]">Theo dõi các mục tiêu tài chính của bạn</span>}
      actions={
        <button onClick={() => setFormOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium">
          <Plus size={18} /> Thêm lợn tiết kiệm
        </button>
      }
    >

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gradient-to-br from-purple-500 to-purple-700 rounded-2xl p-5 text-white">
          <p className="text-purple-100 text-xs font-medium mb-1">Tổng đã tiết kiệm</p>
          <p className="text-3xl font-bold mb-1">{fmt(totalSaved)}</p>
          <p className="text-purple-200 text-xs">
            {totalTarget > 0 ? `${((totalSaved / totalTarget) * 100).toFixed(1)}% của mục tiêu` : "—"}
          </p>
        </div>
        <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <p className="text-muted-foreground text-xs font-medium">Tổng mục tiêu</p>
            <Target size={18} className="text-muted-foreground" />
          </div>
          <p className="text-3xl font-bold text-card-foreground mb-1">{fmt(totalTarget)}</p>
          <p className="text-muted-foreground text-xs">Trên {goals.length} lợn tiết kiệm</p>
        </div>
        <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <p className="text-muted-foreground text-xs font-medium">Tiết kiệm hàng tháng</p>
            <TrendingUp size={18} className="text-muted-foreground" />
          </div>
          <p className="text-3xl font-bold text-card-foreground mb-1">{fmt(totalMonthly)}</p>
          <p className="text-muted-foreground text-xs">Tổng đóng góp định kỳ</p>
        </div>
      </div>

      {/* Goals list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-20 bg-muted rounded-2xl animate-pulse" />)}
        </div>
      ) : goals.length === 0 ? (
        <div className="py-20 flex flex-col items-center justify-center bg-card rounded-2xl border border-dashed border-border">
          <PiggyBank size={48} className="text-slate-200 mb-4" />
          <p className="font-medium text-muted-foreground">Chưa có lợn tiết kiệm nào</p>
          <p className="text-sm text-muted-foreground mt-1">Nhấn "Thêm lợn tiết kiệm" để bắt đầu</p>
        </div>
      ) : (
        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden mb-6">
          <div className="px-6 py-3 border-b border-border bg-muted/50">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Danh sách lợn tiết kiệm</p>
          </div>
          <div className="divide-y divide-border">
            {goals.map(goal => (
              <div key={goal.id} className="px-6 py-4 hover:bg-muted transition-colors group">
                <div className="flex items-center gap-4">
                  {/* Icon */}
                  <div className={`w-11 h-11 rounded-xl ${goal.bg} flex items-center justify-center shrink-0`}>
                    <PiggyBank size={20} className={goal.textCls} />
                  </div>

                  {/* Name + progress */}
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => navigate(`/piggy-banks/${goal.id}`)}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <p className="font-semibold text-card-foreground text-sm">{goal.name}</p>
                      {goal.targetDate && (
                        <span className="text-[11px] text-muted-foreground">đến {goal.targetDate}</span>
                      )}
                      <ChevronRight size={14} className="text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-muted rounded-full">
                        <div className="h-2 rounded-full transition-all duration-500"
                          style={{ width: `${goal.pct}%`, backgroundColor: goal.hex }} />
                      </div>
                      <span className="text-xs font-semibold text-muted-foreground shrink-0 w-10 text-right">
                        {goal.pct.toFixed(0)}%
                      </span>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="hidden md:flex items-center gap-6 text-right shrink-0">
                    <div>
                      <p className="text-xs text-muted-foreground">Đã tiết kiệm</p>
                      <p className="text-sm font-bold" style={{ color: goal.hex }}>{fmt(goal.saved)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Mục tiêu</p>
                      <p className="text-sm font-bold text-foreground">{fmt(goal.target)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Còn lại</p>
                      <p className="text-sm font-semibold text-muted-foreground">{fmt(goal.leftToSave)}</p>
                    </div>
                    {goal.savePerMonth > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground">/ tháng</p>
                        <p className="text-sm font-semibold text-purple-600">{fmt(goal.savePerMonth)}</p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => { setEditGoal(goal); }}
                      className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-purple-600 transition-colors" title="Sửa">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => handleDelete(goal)}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors" title="Xóa">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Account status table */}
      {accountStatus.length > 0 && (
        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="px-6 py-3 border-b border-border bg-muted/50">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Trạng thái tài khoản</p>
          </div>
          <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-xs text-muted-foreground uppercase tracking-wider border-b border-border bg-muted/30">
                <th className="px-4 md:px-6 py-3 font-semibold">Tài khoản</th>
                <th className="px-4 md:px-6 py-3 font-semibold text-right">Số dư</th>
                <th className="px-4 md:px-6 py-3 font-semibold text-right">Đã gán vào lợn</th>
                <th className="px-4 md:px-6 py-3 font-semibold text-right">Còn tự do</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {accountStatus.map(a => (
                <tr key={a.accountId} className="hover:bg-muted">
                  <td className="px-4 md:px-6 py-3 font-medium text-card-foreground text-sm">{a.name}</td>
                  <td className="px-4 md:px-6 py-3 text-right text-sm text-foreground">{fmt(a.balance ?? 0)}</td>
                  <td className="px-4 md:px-6 py-3 text-right text-sm text-purple-600 font-semibold">{fmt(a.assigned)}</td>
                  <td className={`px-4 md:px-6 py-3 text-right text-sm font-bold ${a.remaining >= 0 ? "text-green-600" : "text-red-500"}`}>
                    {fmt(a.remaining)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {/* Modals */}
      <PiggyBankFormModal isOpen={formOpen} onClose={() => setFormOpen(false)} onSave={handleCreate} />
      <PiggyBankFormModal isOpen={!!editGoal} onClose={() => setEditGoal(null)} onSave={handleUpdate} goal={editGoal} />
    </PageLayout>
  );
}
