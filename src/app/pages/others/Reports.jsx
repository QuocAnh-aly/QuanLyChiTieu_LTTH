import { useState } from "react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Calendar, Filter, Download, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { useSettings } from "../../context/SettingsContext";

export function Reports() {
  const { fmt } = useSettings();
  const [dateRange, setDateRange] = useState("this_year");

  // Mock Data
  const summary = { income: 150000000, expense: 85000000, savings: 65000000 };
  
  const monthlyData = [
    { name: "Th1", income: 25000000, expense: 12000000 },
    { name: "Th2", income: 25000000, expense: 15000000 },
    { name: "Th3", income: 25000000, expense: 11000000 },
    { name: "Th4", income: 25000000, expense: 18000000 },
    { name: "Th5", income: 25000000, expense: 14000000 },
    { name: "Th6", income: 25000000, expense: 15000000 },
  ];

  const categoryData = [
    { name: "Ăn uống", value: 35000000, color: "#f97316" }, // orange
    { name: "Nhà ở", value: 25000000, color: "#3b82f6" },   // blue
    { name: "Đi lại", value: 10000000, color: "#10b981" },  // emerald
    { name: "Giải trí", value: 8000000, color: "#a855f7" }, // purple
    { name: "Khác", value: 7000000, color: "#64748b" },     // slate
  ];

  return (
    <div className="p-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Báo cáo phân tích</h1>
          <p className="text-slate-500 mt-1">Cái nhìn toàn cảnh về tình hình tài chính của bạn</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-sm">
            <Calendar size={16} className="text-slate-400" />
            <select 
              value={dateRange} 
              onChange={(e) => setDateRange(e.target.value)}
              className="text-sm font-medium text-slate-700 bg-transparent focus:outline-none"
            >
              <option value="this_month">Tháng này</option>
              <option value="last_month">Tháng trước</option>
              <option value="this_year">Năm nay</option>
              <option value="all_time">Toàn thời gian</option>
            </select>
          </div>
          <button className="p-2.5 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors shadow-sm" title="Bộ lọc nâng cao">
            <Filter size={18} />
          </button>
          <button className="p-2.5 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors shadow-sm" title="Tải báo cáo PDF">
            <Download size={18} />
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
            <TrendingUp size={24} className="text-emerald-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Tổng thu</p>
            <p className="text-2xl font-bold text-slate-900">{fmt(summary.income)}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center">
            <TrendingDown size={24} className="text-rose-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Tổng chi</p>
            <p className="text-2xl font-bold text-slate-900">{fmt(summary.expense)}</p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-600 to-indigo-700 rounded-2xl p-6 shadow-sm flex items-center gap-4 text-white relative overflow-hidden">
          <div className="absolute right-0 top-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-10 -mt-10" />
          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center relative z-10">
            <DollarSign size={24} className="text-white" />
          </div>
          <div className="relative z-10">
            <p className="text-sm font-medium text-indigo-100">Tiết kiệm ròng</p>
            <p className="text-2xl font-bold">{fmt(summary.savings)}</p>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
        {/* Bar Chart: Income vs Expense */}
        <div className="xl:col-span-2 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 mb-6">Biến động Thu - Chi</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(value) => value === 0 ? '0' : `${value / 1000000}M`} />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}
                  formatter={(value) => [fmt(value), ""]}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }} />
                <Bar dataKey="income" name="Thu nhập" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Bar dataKey="expense" name="Chi tiêu" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart: Expenses by Category */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col">
          <h2 className="text-lg font-bold text-slate-900 mb-2">Cơ cấu chi tiêu</h2>
          <div className="flex-1 flex flex-col justify-center">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value) => [fmt(value), ""]}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            <div className="mt-4 space-y-3">
              {categoryData.map((item, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                    <span className="text-slate-600">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-slate-900">{fmt(item.value)}</span>
                    <span className="text-slate-400 text-xs w-8 text-right">
                      {Math.round((item.value / summary.expense) * 100)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
