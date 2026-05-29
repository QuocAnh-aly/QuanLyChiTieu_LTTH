import { useState } from 'react';
import { 
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { Landmark, Coffee, Briefcase } from 'lucide-react';

const balanceData = [
  { date: 'May 03, 2026', balance: 0 },
  { date: 'May 05, 2026', balance: 78.62 },
  { date: 'May 12, 2026', balance: 78.62 },
  { date: 'May 13, 2026', balance: 40.64 },
  { date: 'May 31, 2026', balance: 40.64 },
];

const changesData = [
  { date: 'May 04, 2026', change: 78.62, fill: '#22c55e' }, 
  { date: 'May 13, 2026', change: -37.98, fill: '#ef4444' }, 
  { date: 'May 14, 2026', change: -0.38, fill: '#ef4444' },
];

const incomeData = [
  { name: 'Salary', value: 100, color: '#22c55e' }
];

const expenseData = [
  { name: 'Company', value: 99.1, color: '#6366f1' },
  { name: 'Food & Drink', value: 0.9, color: '#f59e0b' }
];

export function AccountCharts() {
  const [timeRange, setTimeRange] = useState('Days');

  const RangeToggle = () => (
    <div className="flex border border-slate-200 rounded-md overflow-hidden text-xs">
      <button className={`px-3 py-1 font-medium ${timeRange === 'Days' ? 'text-emerald-600 bg-emerald-50' : 'text-slate-500 hover:bg-slate-50'}`} onClick={() => setTimeRange('Days')}>Days</button>
      <button className={`px-3 py-1 font-medium border-l border-r border-slate-200 ${timeRange === 'Weeks' ? 'text-emerald-600 bg-emerald-50' : 'text-slate-500 hover:bg-slate-50'}`} onClick={() => setTimeRange('Weeks')}>Weeks</button>
      <button className={`px-3 py-1 font-medium ${timeRange === 'Months' ? 'text-emerald-600 bg-emerald-50' : 'text-slate-300'}`} disabled>Months</button>
    </div>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      {/* Account Balance */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="font-semibold text-slate-800">Account Balance</h3>
            <p className="text-xs text-slate-400">May 01-31</p>
          </div>
          <RangeToggle />
        </div>
        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={balanceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} tickFormatter={(val) => `${val > 0 ? '+' : ''}${val.toFixed(2)} USD`} />
              <Tooltip 
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                formatter={(value) => [`${value} USD`, 'Balance']}
              />
              <Area type="stepAfter" dataKey="balance" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorBalance)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Changes */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="font-semibold text-slate-800">Changes</h3>
            <p className="text-xs text-slate-400">May 01-31</p>
          </div>
          <RangeToggle />
        </div>
        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={changesData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} tickFormatter={(val) => `${val > 0 ? '+' : ''}${val.toFixed(2)} USD`} />
              <Tooltip 
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                cursor={{fill: '#f8fafc'}}
              />
              <Bar dataKey="change" barSize={4} radius={[2, 2, 0, 0]}>
                {changesData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Period Income */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div className="mb-4">
          <h3 className="font-semibold text-slate-800">Period Income</h3>
          <p className="text-xs text-slate-400">May 01-31</p>
        </div>
        <div className="flex justify-center items-center h-[180px]">
          <div className="relative h-[160px] w-[160px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={incomeData} innerRadius={45} outerRadius={75} paddingAngle={2} dataKey="value" stroke="none">
                  {incomeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            
            <div className="absolute top-1/2 left-0 -translate-x-[110%] -translate-y-1/2 flex items-center">
               <span className="text-emerald-500 font-bold text-sm mr-2 whitespace-nowrap">100.0%</span>
               <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white relative z-10 border-[3px] border-white shadow-sm">
                 <Briefcase size={12} />
               </div>
               <div className="w-6 h-[2px] bg-slate-300 absolute left-full top-1/2 -translate-y-1/2 -z-10"></div>
            </div>
          </div>
        </div>
        
        <div className="mt-8 flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white">
              <Briefcase size={14} />
            </div>
            <span className="font-medium text-slate-700 text-sm">Salary</span>
          </div>
          <span className="text-sm text-slate-400">1 transaction</span>
          <span className="font-bold text-emerald-500 text-sm">+78.62 USD</span>
        </div>
      </div>

      {/* Period Expenses */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div className="mb-4">
          <h3 className="font-semibold text-slate-800">Period Expenses</h3>
          <p className="text-xs text-slate-400">May 01-31</p>
        </div>
        <div className="flex justify-center items-center h-[180px]">
          <div className="relative h-[160px] w-[160px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={expenseData} innerRadius={45} outerRadius={75} paddingAngle={2} dataKey="value" stroke="none">
                  {expenseData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
             <div className="absolute top-1/2 left-0 -translate-x-[110%] -translate-y-1/2 flex items-center">
               <span className="text-slate-500 font-bold text-sm mr-2 whitespace-nowrap">99.1%</span>
               <div className="w-8 h-8 rounded-full bg-[#6366f1] flex items-center justify-center text-white relative z-10 border-[3px] border-white shadow-sm">
                 <Landmark size={12} />
               </div>
               <div className="w-6 h-[2px] bg-slate-300 absolute left-full top-1/2 -translate-y-1/2 -z-10"></div>
            </div>
          </div>
        </div>
        
        <div className="mt-8 space-y-4 px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 w-32">
              <div className="w-8 h-8 rounded-full bg-[#6366f1] flex items-center justify-center text-white">
                <Landmark size={14} />
              </div>
              <span className="font-medium text-slate-700 text-sm">Company</span>
            </div>
            <span className="text-sm text-slate-400">1 transaction</span>
            <span className="font-bold text-red-500 text-sm">-37.98 USD</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 w-32">
              <div className="w-8 h-8 rounded-full bg-[#f59e0b] flex items-center justify-center text-white">
                <Coffee size={14} />
              </div>
              <span className="font-medium text-slate-700 text-sm">Food & Drink</span>
            </div>
            <span className="text-sm text-slate-400">1 transaction</span>
            <span className="font-bold text-red-500 text-sm">-0.38 USD</span>
          </div>
        </div>
      </div>
    </div>
  );
}
