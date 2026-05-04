import { ArrowUpRight, ArrowDownRight, TrendingUp, Calendar } from "lucide-react";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useState } from "react";

const monthlyData = [
  { month: "Jan", income: 4500, expenses: 3200 },
  { month: "Feb", income: 5200, expenses: 3800 },
  { month: "Mar", income: 4800, expenses: 3500 },
  { month: "Apr", income: 5500, expenses: 4100 },
  { month: "May", income: 5000, expenses: 3700 },
  { month: "Jun", income: 5300, expenses: 3900 },
];

const categoryData = [
  { name: "Food & Dining", value: 1200, color: "#f59e0b" },
  { name: "Shopping", value: 800, color: "#ec4899" },
  { name: "Transportation", value: 450, color: "#3b82f6" },
  { name: "Entertainment", value: 350, color: "#10b981" },
  { name: "Bills", value: 950, color: "#6366f1" },
  { name: "Other", value: 150, color: "#8b5cf6" },
];

const recentTransactions = [
  { id: 1, name: "Grocery Store", amount: -85.50, category: "Food & Dining", date: "May 3, 2026", type: "expense" },
  { id: 2, name: "Salary Deposit", amount: 5000, category: "Income", date: "May 1, 2026", type: "income" },
  { id: 3, name: "Netflix Subscription", amount: -15.99, category: "Entertainment", date: "May 1, 2026", type: "expense" },
  { id: 4, name: "Uber Ride", amount: -24.50, category: "Transportation", date: "Apr 30, 2026", type: "expense" },
  { id: 5, name: "Amazon Purchase", amount: -129.99, category: "Shopping", date: "Apr 29, 2026", type: "expense" },
];

export function Dashboard() {
  const [selectedPeriod, setSelectedPeriod] = useState("This Month");
  const totalIncome = 5000;
  const totalExpenses = 3700;
  const balance = totalIncome - totalExpenses;

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500 mt-1">Welcome back! Here's your financial overview</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
          <Calendar size={18} />
          <span>{selectedPeriod}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gradient-to-br from-purple-500 to-purple-700 rounded-2xl p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <span className="text-purple-100">Total Balance</span>
            <TrendingUp size={20} className="text-purple-200" />
          </div>
          <p className="text-4xl font-bold mb-2">${balance.toLocaleString()}</p>
          <p className="text-purple-100 text-sm">+12.5% from last month</p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <span className="text-slate-600">Income</span>
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <ArrowUpRight size={20} className="text-green-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-900 mb-2">${totalIncome.toLocaleString()}</p>
          <p className="text-green-600 text-sm">+8.2% from last month</p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <span className="text-slate-600">Expenses</span>
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
              <ArrowDownRight size={20} className="text-red-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-900 mb-2">${totalExpenses.toLocaleString()}</p>
          <p className="text-red-600 text-sm">+3.1% from last month</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <h2 className="text-xl font-bold text-slate-900 mb-6">Income vs Expenses</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" stroke="#64748b" />
              <YAxis stroke="#64748b" />
              <Tooltip
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
              />
              <Legend />
              <Bar dataKey="income" fill="#10b981" radius={[8, 8, 0, 0]} />
              <Bar dataKey="expenses" fill="#ef4444" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <h2 className="text-xl font-bold text-slate-900 mb-6">Spending by Category</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {categoryData.map((entry) => (
                  <Cell key={`cell-${entry.name}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 border border-slate-200">
        <h2 className="text-xl font-bold text-slate-900 mb-6">Recent Transactions</h2>
        <div className="space-y-4">
          {recentTransactions.map((transaction) => (
            <div key={transaction.id} className="flex items-center justify-between p-4 hover:bg-slate-50 rounded-lg transition-colors">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  transaction.type === 'income' ? 'bg-green-100' : 'bg-slate-100'
                }`}>
                  {transaction.type === 'income' ? (
                    <ArrowUpRight size={20} className="text-green-600" />
                  ) : (
                    <ArrowDownRight size={20} className="text-slate-600" />
                  )}
                </div>
                <div>
                  <p className="font-semibold text-slate-900">{transaction.name}</p>
                  <p className="text-sm text-slate-500">{transaction.category} • {transaction.date}</p>
                </div>
              </div>
              <p className={`font-bold text-lg ${
                transaction.type === 'income' ? 'text-green-600' : 'text-slate-900'
              }`}>
                {transaction.type === 'income' ? '+' : ''}{transaction.amount < 0 ? transaction.amount : `+${transaction.amount}`}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
