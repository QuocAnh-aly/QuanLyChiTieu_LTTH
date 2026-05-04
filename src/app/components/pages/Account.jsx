import { useState } from "react";
import {
  Calendar as CalendarIcon,
  Filter,
  Download,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  Coffee,
  ShoppingBag,
  Car,
  Home,
  Zap,
  Heart,
  DollarSign,
  Settings,
  Bell,
  Shield,
  Globe,
  Moon,
  Palette,
} from "lucide-react";
import { format } from "date-fns";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { toast } from "sonner";

const allTransactions = [
  {
    id: 1,
    name: "Salary Deposit",
    amount: 5000,
    category: "Income",
    date: new Date(2026, 4, 1),
    type: "income",
    icon: DollarSign,
    iconColor: "text-green-600",
    iconBg: "bg-green-100",
  },
  {
    id: 2,
    name: "Grocery Store",
    amount: -85.5,
    category: "Food & Dining",
    date: new Date(2026, 4, 3),
    type: "expense",
    icon: Coffee,
    iconColor: "text-orange-600",
    iconBg: "bg-orange-100",
  },
  {
    id: 3,
    name: "Electric Bill",
    amount: -120.0,
    category: "Bills & Utilities",
    date: new Date(2026, 4, 2),
    type: "expense",
    icon: Zap,
    iconColor: "text-yellow-600",
    iconBg: "bg-yellow-100",
  },
  {
    id: 4,
    name: "Amazon Purchase",
    amount: -129.99,
    category: "Shopping",
    date: new Date(2026, 3, 29),
    type: "expense",
    icon: ShoppingBag,
    iconColor: "text-pink-600",
    iconBg: "bg-pink-100",
  },
  {
    id: 5,
    name: "Netflix Subscription",
    amount: -15.99,
    category: "Entertainment",
    date: new Date(2026, 4, 1),
    type: "expense",
    icon: Heart,
    iconColor: "text-purple-600",
    iconBg: "bg-purple-100",
  },
  {
    id: 6,
    name: "Uber Ride",
    amount: -24.5,
    category: "Transportation",
    date: new Date(2026, 3, 30),
    type: "expense",
    icon: Car,
    iconColor: "text-blue-600",
    iconBg: "bg-blue-100",
  },
  {
    id: 7,
    name: "Rent Payment",
    amount: -2000,
    category: "Housing",
    date: new Date(2026, 4, 1),
    type: "expense",
    icon: Home,
    iconColor: "text-green-600",
    iconBg: "bg-green-100",
  },
  {
    id: 8,
    name: "Coffee Shop",
    amount: -12.5,
    category: "Food & Dining",
    date: new Date(2026, 4, 2),
    type: "expense",
    icon: Coffee,
    iconColor: "text-orange-600",
    iconBg: "bg-orange-100",
  },
  {
    id: 9,
    name: "Freelance Payment",
    amount: 850,
    category: "Income",
    date: new Date(2026, 3, 28),
    type: "income",
    icon: DollarSign,
    iconColor: "text-green-600",
    iconBg: "bg-green-100",
  },
  {
    id: 10,
    name: "Gas Station",
    amount: -55.0,
    category: "Transportation",
    date: new Date(2026, 4, 1),
    type: "expense",
    icon: Car,
    iconColor: "text-blue-600",
    iconBg: "bg-blue-100",
  },
  {
    id: 11,
    name: "Restaurant Dinner",
    amount: -78.3,
    category: "Food & Dining",
    date: new Date(2026, 3, 27),
    type: "expense",
    icon: Coffee,
    iconColor: "text-orange-600",
    iconBg: "bg-orange-100",
  },
  {
    id: 12,
    name: "Online Course",
    amount: -199,
    category: "Education",
    date: new Date(2026, 3, 26),
    type: "expense",
    icon: Heart,
    iconColor: "text-purple-600",
    iconBg: "bg-purple-100",
  },
];

export function Account() {
  const [activeTab, setActiveTab] = useState("transactions");
  const [selectedDate, setSelectedDate] = useState(undefined);
  const [showCalendar, setShowCalendar] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    sms: false,
  });
  const [theme, setTheme] = useState("light");
  const [currency, setCurrency] = useState("USD");

  const categories = [
    "All",
    "Income",
    "Food & Dining",
    "Shopping",
    "Transportation",
    "Bills & Utilities",
    "Entertainment",
    "Housing",
  ];

  const filteredTransactions = allTransactions.filter((transaction) => {
    const matchesSearch =
      transaction.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      selectedCategory === "All" || transaction.category === selectedCategory;
    const matchesDate =
      !selectedDate ||
      format(transaction.date, "yyyy-MM-dd") ===
        format(selectedDate, "yyyy-MM-dd");

    return matchesSearch && matchesCategory && matchesDate;
  });

  const totalIncome = filteredTransactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = Math.abs(
    filteredTransactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0),
  );

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Account</h1>
          <p className="text-slate-500 mt-1">
            Manage your transactions and settings
          </p>
        </div>
        {activeTab === "transactions" && (
          <button className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
            <Download size={18} />
            <span>Export</span>
          </button>
        )}
      </div>

      <div className="flex gap-2 mb-8 border-b border-slate-200">
        <button
          onClick={() => setActiveTab("transactions")}
          className={`px-6 py-3 font-semibold transition-colors ${
            activeTab === "transactions"
              ? "text-purple-600 border-b-2 border-purple-600"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          Transactions
        </button>
        <button
          onClick={() => setActiveTab("settings")}
          className={`px-6 py-3 font-semibold transition-colors ${
            activeTab === "settings"
              ? "text-purple-600 border-b-2 border-purple-600"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          Settings
        </button>
      </div>

      {activeTab === "transactions" && (
        <div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-2xl p-6 border border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <span className="text-slate-600">Total Income</span>
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                  <ArrowUpRight size={20} className="text-green-600" />
                </div>
              </div>
              <p className="text-3xl font-bold text-slate-900">
                ${totalIncome.toLocaleString()}
              </p>
              <p className="text-green-600 text-sm mt-1">
                From{" "}
                {filteredTransactions.filter((t) => t.type === "income").length}{" "}
                transaction(s)
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <span className="text-slate-600">Total Expenses</span>
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                  <ArrowDownRight size={20} className="text-red-600" />
                </div>
              </div>
              <p className="text-3xl font-bold text-slate-900">
                ${totalExpenses.toLocaleString()}
              </p>
              <p className="text-red-600 text-sm mt-1">
                From{" "}
                {
                  filteredTransactions.filter((t) => t.type === "expense")
                    .length
                }{" "}
                transaction(s)
              </p>
            </div>

            <div className="bg-gradient-to-br from-purple-500 to-purple-700 rounded-2xl p-6 text-white">
              <div className="flex items-center justify-between mb-4">
                <span className="text-purple-100">Net Flow</span>
                <div className="w-2 h-2 rounded-full bg-purple-200"></div>
              </div>
              <p className="text-3xl font-bold">
                ${(totalIncome - totalExpenses).toLocaleString()}
              </p>
              <p className="text-purple-100 text-sm mt-1">
                {filteredTransactions.length} total transaction(s)
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-200 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400"
                  size={20}
                />
                <input
                  type="text"
                  placeholder="Search transactions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="relative">
                <Filter
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400"
                  size={20}
                />
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 appearance-none bg-white"
                >
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              <div className="relative">
                <CalendarIcon
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400"
                  size={20}
                />
                <button
                  onClick={() => setShowCalendar(!showCalendar)}
                  className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-left bg-white"
                >
                  {selectedDate
                    ? format(selectedDate, "MMM dd, yyyy")
                    : "Select date"}
                </button>
                {showCalendar && (
                  <div className="absolute z-10 mt-2 bg-white border border-slate-200 rounded-lg shadow-lg p-4">
                    <DayPicker
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => {
                        setSelectedDate(date);
                        setShowCalendar(false);
                      }}
                      className="rdp-custom"
                    />
                    {selectedDate && (
                      <button
                        onClick={() => {
                          setSelectedDate(undefined);
                          setShowCalendar(false);
                        }}
                        className="w-full mt-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
                      >
                        Clear Date
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">
                      Transaction
                    </th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">
                      Category
                    </th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">
                      Date
                    </th>
                    <th className="text-right px-6 py-4 text-sm font-semibold text-slate-700">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTransactions.map((transaction) => {
                    const Icon = transaction.icon;
                    return (
                      <tr
                        key={transaction.id}
                        className="hover:bg-slate-50 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-10 h-10 rounded-full ${transaction.iconBg} flex items-center justify-center`}
                            >
                              <Icon
                                size={18}
                                className={transaction.iconColor}
                              />
                            </div>
                            <span className="font-semibold text-slate-900">
                              {transaction.name}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-sm">
                            {transaction.category}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-600">
                          {format(transaction.date, "MMM dd, yyyy")}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span
                            className={`font-bold text-lg ${
                              transaction.type === "income"
                                ? "text-green-600"
                                : "text-slate-900"
                            }`}
                          >
                            {transaction.type === "income" ? "+" : "-"}$
                            {Math.abs(transaction.amount).toLocaleString()}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filteredTransactions.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-slate-500">No transactions found</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === "settings" && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                <Bell size={24} className="text-purple-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Notifications
                </h2>
                <p className="text-sm text-slate-500">
                  Manage how you receive notifications
                </p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-slate-100">
                <div>
                  <p className="font-semibold text-slate-900">
                    Email Notifications
                  </p>
                  <p className="text-sm text-slate-500">
                    Receive updates via email
                  </p>
                </div>
                <button
                  onClick={() => {
                    setNotifications({
                      ...notifications,
                      email: !notifications.email,
                    });
                    toast.success(
                      `Email notifications ${!notifications.email ? "enabled" : "disabled"}`,
                    );
                  }}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    notifications.email ? "bg-purple-600" : "bg-slate-300"
                  }`}
                >
                  <div
                    className={`w-5 h-5 bg-white rounded-full transition-transform ${
                      notifications.email ? "translate-x-6" : "translate-x-1"
                    }`}
                  ></div>
                </button>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-slate-100">
                <div>
                  <p className="font-semibold text-slate-900">
                    Push Notifications
                  </p>
                  <p className="text-sm text-slate-500">
                    Receive push notifications on your device
                  </p>
                </div>
                <button
                  onClick={() => {
                    setNotifications({
                      ...notifications,
                      push: !notifications.push,
                    });
                    toast.success(
                      `Push notifications ${!notifications.push ? "enabled" : "disabled"}`,
                    );
                  }}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    notifications.push ? "bg-purple-600" : "bg-slate-300"
                  }`}
                >
                  <div
                    className={`w-5 h-5 bg-white rounded-full transition-transform ${
                      notifications.push ? "translate-x-6" : "translate-x-1"
                    }`}
                  ></div>
                </button>
              </div>
              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="font-semibold text-slate-900">
                    SMS Notifications
                  </p>
                  <p className="text-sm text-slate-500">
                    Receive text message alerts
                  </p>
                </div>
                <button
                  onClick={() => {
                    setNotifications({
                      ...notifications,
                      sms: !notifications.sms,
                    });
                    toast.success(
                      `SMS notifications ${!notifications.sms ? "enabled" : "disabled"}`,
                    );
                  }}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    notifications.sms ? "bg-purple-600" : "bg-slate-300"
                  }`}
                >
                  <div
                    className={`w-5 h-5 bg-white rounded-full transition-transform ${
                      notifications.sms ? "translate-x-6" : "translate-x-1"
                    }`}
                  ></div>
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-200">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <Palette size={24} className="text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Appearance</h2>
                <p className="text-sm text-slate-500">
                  Customize your app experience
                </p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Theme
                </label>
                <select
                  value={theme}
                  onChange={(e) => {
                    setTheme(e.target.value);
                    toast.success(`Theme changed to ${e.target.value}`);
                  }}
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                  <option value="auto">Auto</option>
                </select>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-200">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <Globe size={24} className="text-green-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Regional Settings
                </h2>
                <p className="text-sm text-slate-500">
                  Set your currency and region
                </p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Currency
                </label>
                <select
                  value={currency}
                  onChange={(e) => {
                    setCurrency(e.target.value);
                    toast.success(`Currency changed to ${e.target.value}`);
                  }}
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="USD">USD - US Dollar</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="GBP">GBP - British Pound</option>
                  <option value="JPY">JPY - Japanese Yen</option>
                  <option value="CAD">CAD - Canadian Dollar</option>
                  <option value="AUD">AUD - Australian Dollar</option>
                </select>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-200">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <Shield size={24} className="text-red-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Security</h2>
                <p className="text-sm text-slate-500">
                  Manage your account security
                </p>
              </div>
            </div>
            <div className="space-y-3">
              <button className="w-full px-4 py-3 bg-slate-50 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors text-left font-semibold">
                Change Password
              </button>
              <button className="w-full px-4 py-3 bg-slate-50 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors text-left font-semibold">
                Enable Two-Factor Authentication
              </button>
              <button className="w-full px-4 py-3 bg-slate-50 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors text-left font-semibold">
                Connected Devices
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-200">
            <h2 className="text-xl font-bold text-slate-900 mb-4">
              Account Information
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  defaultValue="John Doe"
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  defaultValue="john@example.com"
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <button
                onClick={() => toast.success("Profile updated successfully!")}
                className="w-full px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
