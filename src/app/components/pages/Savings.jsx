import { Plus, Target, Plane, Home, GraduationCap, Car, Smartphone, TrendingUp } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { useState } from "react";
import { AddSavingsModal } from "../AddSavingsModal";
import { toast } from "sonner";



const initialSavingsGoals = [
  { id: 1, name: "Vacation to Europe", icon: Plane, color: "text-blue-600", bgColor: "bg-blue-100", target: 5000, saved: 3200, deadline: "Dec 2026", monthlyContribution: 300 },
  { id: 2, name: "House Down Payment", icon: Home, color: "text-green-600", bgColor: "bg-green-100", target: 50000, saved: 12000, deadline: "Jan 2028", monthlyContribution: 1500 },
  { id: 3, name: "Emergency Fund", icon: Target, color: "text-purple-600", bgColor: "bg-purple-100", target: 10000, saved: 8500, deadline: "Aug 2026", monthlyContribution: 500 },
  { id: 4, name: "New Car", icon: Car, color: "text-orange-600", bgColor: "bg-orange-100", target: 25000, saved: 5000, deadline: "Jun 2027", monthlyContribution: 800 },
  { id: 5, name: "Education Fund", icon: GraduationCap, color: "text-pink-600", bgColor: "bg-pink-100", target: 15000, saved: 2500, deadline: "Sep 2027", monthlyContribution: 400 },
  { id: 6, name: "New Laptop", icon: Smartphone, color: "text-indigo-600", bgColor: "bg-indigo-100", target: 2000, saved: 1400, deadline: "Jul 2026", monthlyContribution: 200 },
];

const iconMap = {
  Plane, Home, Target, Car, GraduationCap, Smartphone, TrendingUp
};

export function Savings() {
  const [savingsGoals, setSavingsGoals] = useState(initialSavingsGoals);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const totalTarget = savingsGoals.reduce((sum, goal) => sum + goal.target, 0);
  const totalSaved = savingsGoals.reduce((sum, goal) => sum + goal.saved, 0);
  const totalMonthly = savingsGoals.reduce((sum, goal) => sum + goal.monthlyContribution, 0);

  const handleAddSavings = (savings) => {
    const newGoal = {
      id: savingsGoals.length + 1,
      name: savings.name,
      icon: iconMap[savings.icon] || Target,
      color: `text-${savings.color}-600`,
      bgColor: `bg-${savings.color}-100`,
      target: savings.target,
      saved: 0,
      deadline: savings.deadline,
      monthlyContribution: savings.monthlyContribution
    };
    setSavingsGoals([...savingsGoals, newGoal]);
    toast.success(`Savings goal "${savings.name}" added successfully!`);
  };

  const pieData = savingsGoals.map(goal => ({
    name: goal.name,
    value: goal.saved,
    color: goal.color.replace('text-', '#'),
  }));

  const colors = ["#2563eb", "#16a34a", "#9333ea", "#ea580c", "#ec4899", "#6366f1"];

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Savings Goals</h1>
          <p className="text-slate-500 mt-1">Track your progress towards financial goals</p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          <Plus size={18} />
          <span>Add Goal</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gradient-to-br from-purple-500 to-purple-700 rounded-2xl p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <span className="text-purple-100">Total Saved</span>
            <TrendingUp size={20} className="text-purple-200" />
          </div>
          <p className="text-4xl font-bold mb-2">${totalSaved.toLocaleString()}</p>
          <p className="text-purple-100 text-sm">{((totalSaved / totalTarget) * 100).toFixed(1)}% of total goal</p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <span className="text-slate-600">Total Target</span>
            <Target size={20} className="text-slate-400" />
          </div>
          <p className="text-3xl font-bold text-slate-900 mb-2">${totalTarget.toLocaleString()}</p>
          <p className="text-slate-500 text-sm">Across {savingsGoals.length} goals</p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <span className="text-slate-600">Monthly Savings</span>
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
          </div>
          <p className="text-3xl font-bold text-slate-900 mb-2">${totalMonthly.toLocaleString()}</p>
          <p className="text-slate-500 text-sm">Total contributions</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200">
          <h2 className="text-xl font-bold text-slate-900 mb-6">Your Savings Goals</h2>
          <div className="space-y-6">
            {savingsGoals.map((goal) => {
              const Icon = goal.icon;
              const percentage = (goal.saved / goal.target) * 100;
              const remaining = goal.target - goal.saved;

              return (
                <div key={goal.id} className="border border-slate-200 rounded-xl p-5 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-full ${goal.bgColor} flex items-center justify-center`}>
                        <Icon size={24} className={goal.color} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900">{goal.name}</h3>
                        <p className="text-sm text-slate-500">Target by {goal.deadline}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-slate-900">${goal.saved.toLocaleString()}</p>
                      <p className="text-sm text-slate-500">of ${goal.target.toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="mb-3">
                    <div className="w-full bg-slate-100 rounded-full h-3">
                      <div
                        className="bg-gradient-to-r from-purple-500 to-pink-500 h-3 rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-600">
                      {percentage.toFixed(1)}% complete • ${remaining.toLocaleString()} to go
                    </span>
                    <span className="text-purple-600 font-semibold">
                      ${goal.monthlyContribution}/month
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <h2 className="text-xl font-bold text-slate-900 mb-6">Savings Distribution</h2>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                fill="#8884d8"
                paddingAngle={5}
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${entry.name}`} fill={colors[index % colors.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
              />
            </PieChart>
          </ResponsiveContainer>

          <div className="mt-6 space-y-3">
            {savingsGoals.slice(0, 3).map((goal, index) => (
              <div key={goal.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: colors[index] }}
                  ></div>
                  <span className="text-sm text-slate-600">{goal.name}</span>
                </div>
                <span className="text-sm font-semibold text-slate-900">
                  ${goal.saved.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <AddSavingsModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddSavings}
      />
    </div>
  );
}
