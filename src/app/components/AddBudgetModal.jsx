import { X } from "lucide-react";
import { useState } from "react";

const budgetCategories = [
  { name: "Food & Dining", icon: "Coffee", color: "orange" },
  { name: "Shopping", icon: "ShoppingBag", color: "pink" },
  { name: "Transportation", icon: "Car", color: "blue" },
  { name: "Entertainment", icon: "Heart", color: "purple" },
  { name: "Bills & Utilities", icon: "Zap", color: "yellow" },
  { name: "Housing", icon: "Home", color: "green" },
  { name: "Healthcare", icon: "Heart", color: "red" },
  { name: "Education", icon: "GraduationCap", color: "indigo" },
];

export function AddBudgetModal({ isOpen, onClose, onAdd }) {
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (category && amount) {
      const selectedCategory = budgetCategories.find(
        (c) => c.name === category,
      );
      onAdd({
        category,
        amount: parseFloat(amount),
        icon: selectedCategory?.icon || "DollarSign",
        color: selectedCategory?.color || "gray",
      });
      setCategory("");
      setAmount("");
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl p-6 w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-slate-900">
            Add Budget Category
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              required
            >
              <option value="">Select a category</option>
              {budgetCategories.map((cat) => (
                <option key={cat.name} value={cat.name}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Monthly Budget Amount
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500">
                $
              </span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-8 pr-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="0.00"
                step="0.01"
                min="0"
                required
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold"
            >
              Add Budget
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
