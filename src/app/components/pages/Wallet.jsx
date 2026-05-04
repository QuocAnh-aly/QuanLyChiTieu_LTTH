import {
  Plus,
  CreditCard,
  Landmark,
  Wallet as WalletIcon,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useState } from "react";
import { AddWalletModal } from "../AddWalletModal";
import { toast } from "sonner";

const iconMap = {
  Landmark,
  WalletIcon,
  CreditCard,
  TrendingUp,
};

const colorGradients = {
  blue: { from: "#3b82f6", to: "#1d4ed8" },
  green: { from: "#22c55e", to: "#15803d" },
  purple: { from: "#a855f7", to: "#7e22ce" },
  orange: { from: "#f97316", to: "#c2410c" },
  emerald: { from: "#10b981", to: "#047857" },
  slate: { from: "#64748b", to: "#475569" },
};

const initialAccounts = [
  {
    id: 1,
    name: "Main Checking",
    type: "Checking Account",
    balance: 8450.5,
    icon: Landmark,
    color: "text-blue-600",
    bgColor: "bg-blue-500",
    gradientFrom: "#3b82f6",
    gradientTo: "#1d4ed8",
    cardNumber: "•••• 4892",
    change: 12.5,
  },
  {
    id: 2,
    name: "Savings Account",
    type: "Savings",
    balance: 25300.0,
    icon: WalletIcon,
    color: "text-green-600",
    bgColor: "bg-green-500",
    gradientFrom: "#22c55e",
    gradientTo: "#15803d",
    cardNumber: "•••• 7231",
    change: 8.3,
  },
  {
    id: 3,
    name: "Credit Card",
    type: "Credit",
    balance: -1250.0,
    icon: CreditCard,
    color: "text-purple-600",
    bgColor: "bg-purple-500",
    gradientFrom: "#a855f7",
    gradientTo: "#7e22ce",
    cardNumber: "•••• 9845",
    change: -5.2,
  },
  {
    id: 4,
    name: "Business Account",
    type: "Business",
    balance: 15200.0,
    icon: Landmark,
    color: "text-orange-600",
    bgColor: "bg-orange-500",
    gradientFrom: "#f97316",
    gradientTo: "#c2410c",
    cardNumber: "•••• 3421",
    change: 15.7,
  },
];

const balanceHistory = [
  { month: "Jan", balance: 28500 },
  { month: "Feb", balance: 32100 },
  { month: "Mar", balance: 35200 },
  { month: "Apr", balance: 38900 },
  { month: "May", balance: 42500 },
  { month: "Jun", balance: 47700 },
];

const recentActivity = [
  {
    id: 1,
    name: "Transfer to Savings",
    amount: 1000,
    type: "transfer",
    date: "May 3, 2026",
  },
  {
    id: 2,
    name: "Salary Deposit",
    amount: 5000,
    type: "income",
    date: "May 1, 2026",
  },
  {
    id: 3,
    name: "Credit Card Payment",
    amount: -500,
    type: "payment",
    date: "Apr 30, 2026",
  },
  {
    id: 4,
    name: "ATM Withdrawal",
    amount: -200,
    type: "withdrawal",
    date: "Apr 29, 2026",
  },
];

export function Wallet() {
  const [accounts, setAccounts] = useState(initialAccounts);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const totalBalance = accounts.reduce(
    (sum, account) => sum + account.balance,
    0,
  );
  const totalAssets = accounts
    .filter((a) => a.balance > 0)
    .reduce((sum, account) => sum + account.balance, 0);
  const totalLiabilities = Math.abs(
    accounts
      .filter((a) => a.balance < 0)
      .reduce((sum, account) => sum + account.balance, 0),
  );

  const handleAddWallet = (wallet) => {
    const gradient = colorGradients[wallet.color] || colorGradients.blue;
    const newAccount = {
      id: accounts.length + 1,
      name: wallet.name,
      type: wallet.type,
      balance: wallet.balance,
      icon: iconMap.Landmark,
      color: `text-${wallet.color}-600`,
      bgColor: `bg-${wallet.color}-500`,
      gradientFrom: gradient.from,
      gradientTo: gradient.to,
      cardNumber: wallet.cardNumber,
      change: 0,
    };
    setAccounts([...accounts, newAccount]);
    toast.success(`Account "${wallet.name}" added successfully!`);
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Wallet</h1>
          <p className="text-slate-500 mt-1">Manage your accounts and cards</p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          <Plus size={18} />
          <span>Add Account</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gradient-to-br from-purple-500 to-purple-700 rounded-2xl p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <span className="text-purple-100">Net Worth</span>
            <TrendingUp size={20} className="text-purple-200" />
          </div>
          <p className="text-4xl font-bold mb-2">
            ${totalBalance.toLocaleString()}
          </p>
          <p className="text-purple-100 text-sm">+18.5% from last month</p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <span className="text-slate-600">Total Assets</span>
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <ArrowUpRight size={20} className="text-green-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-900 mb-2">
            ${totalAssets.toLocaleString()}
          </p>
          <p className="text-green-600 text-sm">
            Across {accounts.filter((a) => a.balance > 0).length} accounts
          </p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <span className="text-slate-600">Liabilities</span>
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
              <ArrowDownRight size={20} className="text-red-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-900 mb-2">
            ${totalLiabilities.toLocaleString()}
          </p>
          <p className="text-red-600 text-sm">
            {accounts.filter((a) => a.balance < 0).length} credit account(s)
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {accounts.map((account) => {
          const Icon = account.icon;
          const isPositive = account.balance >= 0;

          return (
            <div
              key={account.id}
              className="relative overflow-hidden rounded-2xl p-6 text-white"
              style={{
                background: `linear-gradient(135deg, ${account.gradientFrom} 0%, ${account.gradientTo} 100%)`,
              }}
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-16 -mt-16"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-white opacity-10 rounded-full -ml-12 -mb-12"></div>

              <div className="relative">
                <div className="flex items-start justify-between mb-8">
                  <div>
                    <p className="text-white/80 text-sm mb-1">{account.type}</p>
                    <h3 className="text-xl font-bold">{account.name}</h3>
                  </div>
                  <Icon size={32} className="text-white/90" />
                </div>

                <div className="mb-6">
                  <p className="text-white/80 text-sm mb-2">Balance</p>
                  <p className="text-4xl font-bold">
                    {isPositive ? "$" : "-$"}
                    {Math.abs(account.balance).toLocaleString()}
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-lg tracking-wider">
                    {account.cardNumber}
                  </span>
                  <div
                    className={`flex items-center gap-1 px-3 py-1 rounded-full ${
                      account.change > 0 ? "bg-white/20" : "bg-black/20"
                    }`}
                  >
                    {account.change > 0 ? (
                      <ArrowUpRight size={14} />
                    ) : (
                      <ArrowDownRight size={14} />
                    )}
                    <span className="text-sm font-semibold">
                      {Math.abs(account.change)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <h2 className="text-xl font-bold text-slate-900 mb-6">
            Balance Trend
          </h2>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={balanceHistory}>
              <defs>
                <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#9333ea" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#9333ea" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" stroke="#64748b" />
              <YAxis stroke="#64748b" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#fff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                }}
              />
              <Area
                type="monotone"
                dataKey="balance"
                stroke="#9333ea"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorBalance)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <h2 className="text-xl font-bold text-slate-900 mb-6">
            Recent Activity
          </h2>
          <div className="space-y-4">
            {recentActivity.map((activity) => (
              <div
                key={activity.id}
                className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-lg transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      activity.type === "income"
                        ? "bg-green-100"
                        : activity.type === "transfer"
                          ? "bg-blue-100"
                          : "bg-slate-100"
                    }`}
                  >
                    {activity.type === "income" ? (
                      <ArrowUpRight size={18} className="text-green-600" />
                    ) : (
                      <ArrowDownRight size={18} className="text-slate-600" />
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">
                      {activity.name}
                    </p>
                    <p className="text-sm text-slate-500">{activity.date}</p>
                  </div>
                </div>
                <p
                  className={`font-bold ${
                    activity.amount > 0 ? "text-green-600" : "text-slate-900"
                  }`}
                >
                  {activity.amount > 0 ? "+" : ""}
                  {activity.amount < 0
                    ? activity.amount
                    : `+${activity.amount}`}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <AddWalletModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddWallet}
      />
    </div>
  );
}
