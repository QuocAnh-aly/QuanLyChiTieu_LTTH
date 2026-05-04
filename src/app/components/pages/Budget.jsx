import {
  Plus,
  TrendingUp,
  ShoppingBag,
  Coffee,
  Car,
  Home,
  Zap,
  Heart,
} from "lucide-react";
import { useState } from "react";
import { AddBudgetModal } from "../AddBudgetModal";
import { toast } from "sonner";

const initialBudgetCategories = [
  {
    id: 1,
    name: "Food & Dining",
    icon: Coffee,
    color: "text-orange-600",
    bgColor: "bg-orange-100",
    budget: 1500,
    spent: 1200,
  },
  {
    id: 2,
    name: "Shopping",
    icon: ShoppingBag,
    color: "text-pink-600",
    bgColor: "bg-pink-100",
    budget: 1000,
    spent: 800,
  },
  {
    id: 3,
    name: "Transportation",
    icon: Car,
    color: "text-blue-600",
    bgColor: "bg-blue-100",
    budget: 500,
    spent: 450,
  },
  {
    id: 4,
    name: "Entertainment",
    icon: Heart,
    color: "text-purple-600",
    bgColor: "bg-purple-100",
    budget: 400,
    spent: 350,
  },
  {
    id: 5,
    name: "Bills & Utilities",
    icon: Zap,
    color: "text-yellow-600",
    bgColor: "bg-yellow-100",
    budget: 1200,
    spent: 950,
  },
  {
    id: 6,
    name: "Housing",
    icon: Home,
    color: "text-green-600",
    bgColor: "bg-green-100",
    budget: 2000,
    spent: 2000,
  },
];

const iconMap = {
  Coffee,
  ShoppingBag,
  Car,
  Heart,
  Zap,
  Home,
};

export function Budget() {
  const [budgetCategories, setBudgetCategories] = useState(
    initialBudgetCategories,
  );
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const totalBudget = budgetCategories.reduce(
    (sum, cat) => sum + cat.budget,
    0,
  );
  const totalSpent = budgetCategories.reduce((sum, cat) => sum + cat.spent, 0);
  const remaining = totalBudget - totalSpent;

  const handleAddBudget = (budget) => {
    const newBudget = {
      id: budgetCategories.length + 1,
      name: budget.category,
      icon: iconMap[budget.icon] || Coffee,
      color: `text-${budget.color}-600`,
      bgColor: `bg-${budget.color}-100`,
      budget: budget.amount,
      spent: 0,
    };
    setBudgetCategories([...budgetCategories, newBudget]);
    toast.success(`Budget for ${budget.category} added successfully!`);
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Budget</h1>
          <p className="text-slate-500 mt-1">
            Track your spending across categories
          </p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          <Plus size={18} />
          <span>Add Budget</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <span className="text-slate-600">Total Budget</span>
            <TrendingUp size={20} className="text-slate-400" />
          </div>
          <p className="text-3xl font-bold text-slate-900">
            ${totalBudget.toLocaleString()}
          </p>
          <p className="text-slate-500 text-sm mt-1">For May 2026</p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <span className="text-slate-600">Total Spent</span>
            <div className="w-2 h-2 rounded-full bg-red-500"></div>
          </div>
          <p className="text-3xl font-bold text-slate-900">
            ${totalSpent.toLocaleString()}
          </p>
          <p className="text-slate-500 text-sm mt-1">
            {((totalSpent / totalBudget) * 100).toFixed(1)}% of budget
          </p>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-700 rounded-2xl p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <span className="text-green-100">Remaining</span>
            <div className="w-2 h-2 rounded-full bg-green-200"></div>
          </div>
          <p className="text-3xl font-bold">${remaining.toLocaleString()}</p>
          <p className="text-green-100 text-sm mt-1">
            {((remaining / totalBudget) * 100).toFixed(1)}% available
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 border border-slate-200 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-slate-900">Overall Progress</h2>
          <span className="text-sm text-slate-500">
            {((totalSpent / totalBudget) * 100).toFixed(1)}%
          </span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-4">
          <div
            className="bg-gradient-to-r from-purple-500 to-pink-500 h-4 rounded-full transition-all duration-500"
            style={{ width: `${(totalSpent / totalBudget) * 100}%` }}
          ></div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {budgetCategories.map((category) => {
          const Icon = category.icon;
          const percentage = (category.spent / category.budget) * 100;
          const isOverBudget = percentage > 100;

          return (
            <div
              key={category.id}
              className="bg-white rounded-2xl p-6 border border-slate-200 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-12 h-12 rounded-full ${category.bgColor} flex items-center justify-center`}
                  >
                    <Icon size={24} className={category.color} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">
                      {category.name}
                    </h3>
                    <p className="text-sm text-slate-500">
                      ${category.spent.toLocaleString()} of $
                      {category.budget.toLocaleString()}
                    </p>
                  </div>
                </div>
                <span
                  className={`text-sm font-semibold ${isOverBudget ? "text-red-600" : "text-slate-600"}`}
                >
                  {percentage.toFixed(0)}%
                </span>
              </div>

              <div className="w-full bg-slate-100 rounded-full h-3 mb-3">
                <div
                  className={`h-3 rounded-full transition-all duration-500 ${
                    isOverBudget
                      ? "bg-gradient-to-r from-red-500 to-red-600"
                      : "bg-gradient-to-r from-purple-500 to-pink-500"
                  }`}
                  style={{ width: `${Math.min(percentage, 100)}%` }}
                ></div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-500">
                  {isOverBudget ? (
                    <span className="text-red-600 font-semibold">
                      Over budget by $
                      {(category.spent - category.budget).toLocaleString()}
                    </span>
                  ) : (
                    `${(((category.budget - category.spent) / category.budget) * 100).toFixed(0)}% remaining`
                  )}
                </span>
                <button className="text-purple-600 hover:text-purple-700 text-sm font-medium">
                  Edit
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <AddBudgetModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddBudget}
      />
    </div>
  );
}
