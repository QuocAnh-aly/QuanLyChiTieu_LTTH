import { Plus, Target, Plane, Home, GraduationCap, Car, Smartphone, TrendingUp, Pencil, Trash2 } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { useState, useEffect } from "react";
import { AddSavingsModal } from "../AddSavingsModal";
import { EditSavingsModal } from "../EditSavingsModal";
import { toast } from "sonner";
import { budgetApi } from "../../api/budgetApi";

const iconMap = {
  Plane, Home, Target, Car, GraduationCap, Smartphone, TrendingUp,
};

const COLORS = ["#2563eb", "#16a34a", "#9333ea", "#ea580c", "#ec4899", "#6366f1"];

const colorMap = {
  blue:    { text: "text-blue-600",    bg: "bg-blue-100"    },
  green:   { text: "text-green-600",   bg: "bg-green-100"   },
  purple:  { text: "text-purple-600",  bg: "bg-purple-100"  },
  orange:  { text: "text-orange-600",  bg: "bg-orange-100"  },
  pink:    { text: "text-pink-600",    bg: "bg-pink-100"    },
  indigo:  { text: "text-indigo-600",  bg: "bg-indigo-100"  },
  emerald: { text: "text-emerald-600", bg: "bg-emerald-100" },
  slate:   { text: "text-slate-600",   bg: "bg-slate-100"   },
};

function mapGoal(g) {
  const colors = colorMap[g.color] || colorMap.purple;
  return {
    id: g.budgetId,
    accountId: g.accountId,
    accountName: g.accountName,
    name: g.title,
    icon: iconMap[g.iconName] || Target,
    iconName: g.iconName || "Target",
    color: g.color || "purple",
    textColor: colors.text,
    bgColor: colors.bg,
    target: g.targetAmount ?? 0,
    saved: g.currentAmount ?? 0,
    remaining: g.remaining ?? ((g.targetAmount ?? 0) - (g.currentAmount ?? 0)),
    percentage: g.percentage ?? 0,
    deadline: g.deadline || null,
    monthlyContribution: g.monthlyContribution ?? 0,
    monthsRemaining: g.monthsRemaining,
    isActive: g.isActive,
  };
}

export function Savings() {
  const [savingsGoals, setSavingsGoals] = useState([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchSavingsGoals();
  }, []);

  const fetchSavingsGoals = async () => {
    try {
      setIsLoading(true);
      const data = await budgetApi.getSavingsGoals();
      setSavingsGoals((data || []).map(mapGoal));
    } catch (error) {
      console.error("Error fetching savings goals:", error);
      toast.error("Không thể tải danh sách mục tiêu tiết kiệm");
    } finally {
      setIsLoading(false);
    }
  };

  const totalTarget = savingsGoals.reduce((s, g) => s + g.target, 0);
  const totalSaved = savingsGoals.reduce((s, g) => s + g.saved, 0);
  const totalMonthly = savingsGoals.reduce((s, g) => s + g.monthlyContribution, 0);

  const handleAddSavings = async (savings) => {
    try {
      await budgetApi.createSavingsGoal({
        accountId: savings.accountId,
        title: savings.title,
        targetAmount: savings.targetAmount,
        monthlyContribution: savings.monthlyContribution,
        deadline: savings.deadline || null,
        iconName: savings.iconName,
        color: savings.color,
      });
      await fetchSavingsGoals();
      toast.success(`Đã thêm mục tiêu "${savings.title}" thành công!`);
    } catch (error) {
      toast.error("Không thể thêm mục tiêu tiết kiệm");
    }
  };

  const handleEditGoal = async (id, data) => {
    try {
      await budgetApi.updateSavingsGoal(id, data);
      await fetchSavingsGoals();
      toast.success("Đã cập nhật mục tiêu thành công!");
      setEditingGoal(null);
    } catch {
      toast.error("Không thể cập nhật mục tiêu");
    }
  };

  const handleDeleteGoal = async (id, name) => {
    if (!window.confirm(`Xóa mục tiêu "${name}"?`)) return;
    try {
      await budgetApi.deleteBudget(id);
      await fetchSavingsGoals();
      toast.success(`Đã xóa mục tiêu "${name}".`);
    } catch {
      toast.error("Không thể xóa mục tiêu");
    }
  };

  const pieData = savingsGoals.map((g) => ({ name: g.name, value: g.saved }));

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Mục tiêu tiết kiệm</h1>
          <p className="text-slate-500 mt-1">Theo dõi tiến trình đạt được các mục tiêu tài chính của bạn</p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          <Plus size={18} />
          <span>Thêm mục tiêu</span>
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gradient-to-br from-purple-500 to-purple-700 rounded-2xl p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <span className="text-purple-100">Tổng đã tiết kiệm</span>
            <TrendingUp size={20} className="text-purple-200" />
          </div>
          <p className="text-4xl font-bold mb-2">${totalSaved.toLocaleString()}</p>
          <p className="text-purple-100 text-sm">
            {totalTarget > 0 ? `${((totalSaved / totalTarget) * 100).toFixed(1)}% của tổng mục tiêu` : "—"}
          </p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <span className="text-slate-600">Tổng mục tiêu</span>
            <Target size={20} className="text-slate-400" />
          </div>
          <p className="text-3xl font-bold text-slate-900 mb-2">${totalTarget.toLocaleString()}</p>
          <p className="text-slate-500 text-sm">Trên {savingsGoals.length} mục tiêu</p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <span className="text-slate-600">Tiết kiệm hàng tháng</span>
            <div className="w-2 h-2 rounded-full bg-green-500" />
          </div>
          <p className="text-3xl font-bold text-slate-900 mb-2">${totalMonthly.toLocaleString()}</p>
          <p className="text-slate-500 text-sm">Tổng đóng góp</p>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 rounded-2xl bg-slate-200 animate-pulse" />
          ))}
        </div>
      ) : savingsGoals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-dashed border-slate-300">
          <Target size={48} className="text-slate-300 mb-4" />
          <p className="text-slate-500 font-medium">Chưa có mục tiêu tiết kiệm</p>
          <p className="text-slate-400 text-sm mt-1">Nhấn "Thêm mục tiêu" để bắt đầu</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200">
            <h2 className="text-xl font-bold text-slate-900 mb-6">Mục tiêu tiết kiệm của bạn</h2>
            <div className="space-y-6">
              {savingsGoals.map((goal) => {
                const Icon = goal.icon;
                const pct = Math.min(goal.percentage, 100);

                return (
                  <div key={goal.id} className="border border-slate-200 rounded-xl p-5 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-full ${goal.bgColor} flex items-center justify-center`}>
                          <Icon size={24} className={goal.textColor} />
                        </div>
                        <div>
                          <h3 className="font-semibold text-slate-900">{goal.name}</h3>
                          <p className="text-sm text-slate-500">
                            {goal.deadline ? `Mục tiêu đến ${goal.deadline}` : "Chưa đặt thời hạn"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="text-right mr-2">
                          <p className="font-bold text-slate-900">${goal.saved.toLocaleString()}</p>
                          <p className="text-sm text-slate-500">trên ${goal.target.toLocaleString()}</p>
                        </div>
                        <button
                          onClick={() => setEditingGoal(goal)}
                          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                          title="Sửa"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => handleDeleteGoal(goal.id, goal.name)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                          title="Xóa"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>

                    <div className="mb-3">
                      <div className="w-full bg-slate-100 rounded-full h-3">
                        <div
                          className="bg-gradient-to-r from-purple-500 to-pink-500 h-3 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-600">
                        {goal.percentage.toFixed(1)}% hoàn thành • Còn lại ${goal.remaining.toLocaleString()}
                      </span>
                      <span className="text-purple-600 font-semibold">
                        ${goal.monthlyContribution}/tháng
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pie chart */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200">
            <h2 className="text-xl font-bold text-slate-900 mb-6">Phân bổ</h2>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={5} dataKey="value">
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: "#fff", border: "1px solid #e2e8f0", borderRadius: "8px" }} />
              </PieChart>
            </ResponsiveContainer>

            <div className="mt-4 space-y-2">
              {savingsGoals.slice(0, 4).map((goal, i) => (
                <div key={goal.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-sm text-slate-600 truncate max-w-[120px]">{goal.name}</span>
                  </div>
                  <span className="text-sm font-semibold text-slate-900">${goal.saved.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <AddSavingsModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddSavings}
      />

      {editingGoal && (
        <EditSavingsModal
          goal={editingGoal}
          onClose={() => setEditingGoal(null)}
          onSave={handleEditGoal}
        />
      )}
    </div>
  );
}
