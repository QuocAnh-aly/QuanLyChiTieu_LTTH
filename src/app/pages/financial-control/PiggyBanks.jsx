import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  PiggyBank, Plus, Pencil, Trash2, TrendingUp, Target,
  ChevronRight, ChevronDown, CheckCircle2,
} from "lucide-react";
import { piggyBankApi } from "../../api/piggyBankApi";
import { walletApi } from "../../api/walletApi";
import { toast } from "sonner";
import { PiggyBankFormModal } from "../../components/modals/PiggyBankFormModal";
import { PiggyBankGroupModal } from "../../components/modals/PiggyBankGroupModal";
import { groupGoals } from "../../utils/savingsGroup";
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
  const [groupOpen,   setGroupOpen]   = useState(false);
  const [editGoal,    setEditGoal]    = useState(null);
  const [addSub,      setAddSub]      = useState(null);
  const [collapsed,   setCollapsed]   = useState({});

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

  // The group modal hands back one payload per sub-goal; create them all.
  const handleCreateGroup = async (payloads) => {
    const group = payloads[0]?.objectGroup || "mục tiêu";
    try {
      for (const p of payloads) {
        await piggyBankApi.create(p);
      }
      await load();
      setGroupOpen(false);
      toast.success(`Đã tạo "${group}" với ${payloads.length} mục tiêu nhỏ!`);
      addNotification({ type: 'success', title: 'Đã tạo mục tiêu tiết kiệm', message: `"${group}" gồm ${payloads.length} mục tiêu nhỏ`, link: '/piggy-banks' });
    } catch {
      toast.error("Không thể tạo mục tiêu tiết kiệm");
      addNotification({ type: 'error', title: 'Lỗi tạo mục tiêu', message: 'Không thể tạo mục tiêu tiết kiệm mới' });
    }
  };

  // Add one more sub-goal under an existing parent group.
  const handleCreateSub = async (data) => {
    try {
      await piggyBankApi.create(data);
      await load();
      setAddSub(null);
      toast.success(`Đã thêm mục tiêu nhỏ vào "${addSub?.group}"!`);
      addNotification({ type: 'success', title: 'Đã thêm mục tiêu nhỏ', message: `Thêm vào "${addSub?.group}"`, link: '/piggy-banks' });
    } catch {
      toast.error("Không thể thêm mục tiêu nhỏ");
      addNotification({ type: 'error', title: 'Lỗi thêm mục tiêu', message: 'Không thể thêm mục tiêu nhỏ' });
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

  // A group's real saved amount = the balance of the savings account(s) its
  // sub-goals are linked to. This reflects money actually sitting in the
  // account, regardless of how it got there (piggy "Nạp tiền" or a plain
  // transfer), so the progress bar tracks the real balance.
  const accountBalance = new Map(accounts.map((a) => [a.accountId, a.balance ?? 0]));
  const groupSaved = (grp) => {
    const acctIds = [...new Set(grp.goals.map((g) => g.accountId).filter(Boolean))];
    return acctIds.reduce((s, id) => s + (accountBalance.get(id) ?? 0), 0);
  };

  const grouped = groupGoals(goals).map((grp) => {
    const saved = groupSaved(grp);
    const pct = grp.target > 0 ? Math.min((saved / grp.target) * 100, 100) : 0;
    return { ...grp, saved, pct, done: grp.target > 0 && saved >= grp.target };
  });
  const toggleGroup = (name) => setCollapsed((c) => ({ ...c, [name]: !c[name] }));

  const distinctAccountIds = [...new Set(goals.map((g) => g.accountId).filter(Boolean))];
  const totalSaved   = distinctAccountIds.reduce((s, id) => s + (accountBalance.get(id) ?? 0), 0);
  const totalTarget  = goals.reduce((s, g) => s + g.target, 0);
  const totalMonthly = goals.reduce((s, g) => s + (g.savePerMonth ?? 0), 0);

  // Account status — for each savings account, compare its real balance
  // (the money actually saved) against the total target of the goals linked
  // to it. Each goal links to exactly one savings account.
  const accountStatus = accounts.map(a => {
    const linked  = goals.filter(g => g.accountId === a.accountId);
    const target  = linked.reduce((s, g) => s + g.target, 0);
    const balance = a.balance ?? 0;
    return { ...a, target, balance, shortfall: Math.max(0, target - balance) };
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
        <button onClick={() => setGroupOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium">
          <Plus size={18} /> Thêm mục tiêu
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

      {/* Goals grouped by parent goal (mục tiêu chung) */}
      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-20 bg-muted rounded-2xl animate-pulse" />)}
        </div>
      ) : goals.length === 0 ? (
        <div className="py-20 flex flex-col items-center justify-center bg-card rounded-2xl border border-dashed border-border">
          <PiggyBank size={48} className="text-slate-200 mb-4" />
          <p className="font-medium text-muted-foreground">Chưa có mục tiêu tiết kiệm nào</p>
          <p className="text-sm text-muted-foreground mt-1">Nhấn "Thêm mục tiêu" để bắt đầu</p>
        </div>
      ) : (
        <div className="space-y-4 mb-6">
          {grouped.map(grp => {
            const isCollapsed = collapsed[grp.group];
            return (
              <div key={grp.group} className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                {/* Parent header with aggregate progress */}
                <div className="w-full px-5 py-4 flex items-center gap-4 hover:bg-muted/50 transition-colors">
                  <button
                    onClick={() => toggleGroup(grp.group)}
                    className="flex-1 min-w-0 flex items-center gap-4 text-left"
                  >
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${grp.done ? "bg-emerald-100" : "bg-purple-100"}`}>
                      {grp.done
                        ? <CheckCircle2 size={20} className="text-emerald-600" />
                        : <Target size={20} className="text-purple-600" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <p className="font-bold text-card-foreground truncate">{grp.group}</p>
                        <span className="text-[11px] text-muted-foreground shrink-0">
                          {grp.goals.length} mục tiêu nhỏ
                        </span>
                        {grp.done && (
                          <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full shrink-0">Đã đủ</span>
                        )}
                        <span className="ml-auto text-xs font-semibold text-muted-foreground shrink-0">{grp.pct.toFixed(0)}%</span>
                        {isCollapsed ? <ChevronRight size={16} className="text-muted-foreground shrink-0" /> : <ChevronDown size={16} className="text-muted-foreground shrink-0" />}
                      </div>
                      <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-500 ${grp.done ? "bg-emerald-500" : "bg-purple-500"}`}
                          style={{ width: `${grp.pct}%` }} />
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground mt-1.5">
                        <span>Đã tiết kiệm <span className="font-semibold text-foreground">{fmt(grp.saved)}</span></span>
                        <span>Mục tiêu <span className="font-semibold text-foreground">{fmt(grp.target)}</span></span>
                      </div>
                    </div>
                  </button>
                  <button
                    onClick={() => setAddSub(grp)}
                    className="p-2 rounded-lg hover:bg-purple-100 text-muted-foreground hover:text-purple-600 transition-colors shrink-0"
                    title="Thêm mục tiêu nhỏ"
                  >
                    <Plus size={16} />
                  </button>
                </div>

                {/* Sub-goals */}
                {!isCollapsed && (
                  <div className="divide-y divide-border border-t border-border">
                    {grp.goals.map(goal => (
                      <div key={goal.id} className="pl-6 pr-5 py-3 hover:bg-muted transition-colors group flex items-center gap-4">
                        <div className={`w-9 h-9 rounded-lg ${goal.bg} flex items-center justify-center shrink-0`}>
                          <PiggyBank size={16} className={goal.textCls} />
                        </div>
                        <div className="flex-1 min-w-0 cursor-pointer flex items-center justify-between gap-3" onClick={() => navigate(`/piggy-banks/${goal.id}`)}>
                          <div className="flex items-center gap-2 min-w-0">
                            <p className="font-medium text-card-foreground text-sm truncate">{goal.subName}</p>
                            <ChevronRight size={13} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                          </div>
                          <span className="text-xs text-muted-foreground shrink-0">
                            Mục tiêu <span className="font-semibold text-foreground">{fmt(goal.target)}</span>
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button onClick={() => setEditGoal(goal)}
                            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-purple-600 transition-colors" title="Sửa">
                            <Pencil size={14} />
                          </button>
                          <button onClick={() => handleDelete(goal)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors" title="Xóa">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
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
                <th className="px-4 md:px-6 py-3 font-semibold text-right">Số dư (đã tiết kiệm)</th>
                <th className="px-4 md:px-6 py-3 font-semibold text-right">Tổng mục tiêu</th>
                <th className="px-4 md:px-6 py-3 font-semibold text-right">Còn thiếu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {accountStatus.map(a => (
                <tr key={a.accountId} className="hover:bg-muted">
                  <td className="px-4 md:px-6 py-3 font-medium text-card-foreground text-sm">{a.name}</td>
                  <td className="px-4 md:px-6 py-3 text-right text-sm text-purple-600 font-semibold">{fmt(a.balance)}</td>
                  <td className="px-4 md:px-6 py-3 text-right text-sm text-foreground">{fmt(a.target)}</td>
                  <td className={`px-4 md:px-6 py-3 text-right text-sm font-bold ${a.shortfall === 0 ? "text-green-600" : "text-orange-500"}`}>
                    {a.shortfall === 0 ? "Đã đủ" : fmt(a.shortfall)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {/* Modals */}
      <PiggyBankGroupModal isOpen={groupOpen} onClose={() => setGroupOpen(false)} onSave={handleCreateGroup} />
      <PiggyBankFormModal isOpen={!!editGoal} onClose={() => setEditGoal(null)} onSave={handleUpdate} goal={editGoal} />
      <PiggyBankFormModal
        isOpen={!!addSub}
        onClose={() => setAddSub(null)}
        onSave={handleCreateSub}
        goal={null}
        presetGroup={addSub?.group}
        presetAccountId={addSub?.goals?.[0]?.accountId}
        presetColor={addSub?.goals?.[0]?.color}
        presetCurrency={addSub?.goals?.[0]?.currency}
      />
    </PageLayout>
  );
}
