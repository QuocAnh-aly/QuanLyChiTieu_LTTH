import { useState } from 'react';
import {
  Coffee, ShoppingBag, Car, Heart, Zap, Home, Smartphone, GraduationCap,
  Plane, TrendingUp, Target, Wallet, Pizza, Gift, Music, Dumbbell,
  Briefcase, Star, Tag, DollarSign,
  Plus, Pencil, Trash2, X, Check, LayoutList, BadgeDollarSign,
} from 'lucide-react';
import { toast } from 'sonner';
import { useCategories } from '../../../context/CategoriesContext';

// ── Icon & Color config ────────────────────────────────────────────────────────

const ICON_MAP = {
  Coffee, ShoppingBag, Car, Heart, Zap, Home, Smartphone, GraduationCap,
  Plane, TrendingUp, Target, Wallet, Pizza, Gift, Music, Dumbbell,
  Briefcase, Star, Tag, DollarSign,
};

const COLOR_MAP = {
  orange: { bg: 'bg-orange-100', text: 'text-orange-600', swatch: 'bg-orange-500' },
  pink:   { bg: 'bg-pink-100',   text: 'text-pink-600',   swatch: 'bg-pink-500'   },
  blue:   { bg: 'bg-blue-100',   text: 'text-blue-600',   swatch: 'bg-blue-500'   },
  purple: { bg: 'bg-purple-100', text: 'text-purple-600', swatch: 'bg-purple-500' },
  yellow: { bg: 'bg-yellow-100', text: 'text-yellow-600', swatch: 'bg-yellow-500' },
  green:  { bg: 'bg-green-100',  text: 'text-green-600',  swatch: 'bg-green-500'  },
  red:    { bg: 'bg-red-100',    text: 'text-red-600',    swatch: 'bg-red-500'    },
  slate:  { bg: 'bg-slate-100',  text: 'text-slate-600',  swatch: 'bg-slate-500'  },
  indigo: { bg: 'bg-indigo-100', text: 'text-indigo-600', swatch: 'bg-indigo-500' },
  emerald:{ bg: 'bg-emerald-100',text: 'text-emerald-600',swatch: 'bg-emerald-500'},
};

// ── Expense Category Form ──────────────────────────────────────────────────────

function ExpenseCategoryForm({ initial, onSave, onCancel }) {
  const [label,    setLabel]    = useState(initial?.label    || '');
  const [iconName, setIconName] = useState(initial?.iconName || 'Coffee');
  const [color,    setColor]    = useState(initial?.color    || 'orange');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!label.trim()) return;
    onSave({ label: label.trim(), iconName, color });
  };

  const IconPreview = ICON_MAP[iconName] || Coffee;
  const { bg, text } = COLOR_MAP[color] || COLOR_MAP.orange;

  return (
    <form onSubmit={handleSubmit} className="bg-slate-50 rounded-xl p-4 space-y-3 border border-slate-200">
      {/* Label */}
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1">Tên danh mục</label>
        <input
          autoFocus
          type="text"
          value={label}
          onChange={e => setLabel(e.target.value)}
          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          placeholder="Ví dụ: Ăn uống"
          required
        />
      </div>

      {/* Icon picker */}
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1">Biểu tượng</label>
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(ICON_MAP).map(([name, Icon]) => (
            <button
              key={name}
              type="button"
              onClick={() => setIconName(name)}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                iconName === name
                  ? 'bg-purple-600 text-white ring-2 ring-purple-400'
                  : 'bg-white border border-slate-200 text-slate-500 hover:border-purple-300'
              }`}
            >
              <Icon size={14} />
            </button>
          ))}
        </div>
      </div>

      {/* Color picker */}
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1">Màu sắc</label>
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(COLOR_MAP).map(([name, { swatch }]) => (
            <button
              key={name}
              type="button"
              onClick={() => setColor(name)}
              className={`w-7 h-7 rounded-full ${swatch} transition-all ${
                color === name ? 'ring-2 ring-offset-2 ring-slate-500 scale-110' : 'hover:scale-105'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Preview */}
      <div className="flex items-center gap-2 pt-1">
        <span className="text-xs text-slate-500">Xem trước:</span>
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${bg} ${text}`}>
          <IconPreview size={12} />
          {label || 'Tên danh mục'}
        </span>
      </div>

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm hover:bg-slate-100 transition-colors"
        >
          Hủy
        </button>
        <button
          type="submit"
          className="flex-1 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 transition-colors font-semibold"
        >
          {initial ? 'Lưu' : 'Thêm'}
        </button>
      </div>
    </form>
  );
}

// ── Income Source Form ─────────────────────────────────────────────────────────

function IncomeSourceForm({ initial, onSave, onCancel }) {
  const [label, setLabel] = useState(initial?.label || '');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!label.trim()) return;
    onSave({ label: label.trim() });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-slate-50 rounded-xl p-4 space-y-3 border border-slate-200">
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1">Tên nguồn thu</label>
        <input
          autoFocus
          type="text"
          value={label}
          onChange={e => setLabel(e.target.value)}
          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          placeholder="Ví dụ: Lương, Freelance..."
          required
        />
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm hover:bg-slate-100 transition-colors"
        >
          Hủy
        </button>
        <button
          type="submit"
          className="flex-1 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition-colors font-semibold"
        >
          {initial ? 'Lưu' : 'Thêm'}
        </button>
      </div>
    </form>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export function Categories() {
  const {
    expenseCategories, addExpenseCategory, updateExpenseCategory, deleteExpenseCategory,
    incomeSources,     addIncomeSource,    updateIncomeSource,    deleteIncomeSource,
  } = useCategories();

  const [showAddExpense, setShowAddExpense] = useState(false);
  const [editExpenseId,  setEditExpenseId]  = useState(null);
  const [showAddIncome,  setShowAddIncome]  = useState(false);
  const [editIncomeId,   setEditIncomeId]   = useState(null);

  // ── Expense category handlers ──────────────────────────────────────────────
  const handleAddExpense = (data) => {
    addExpenseCategory(data);
    setShowAddExpense(false);
    toast.success('Đã thêm danh mục');
  };

  const handleUpdateExpense = (id, data) => {
    updateExpenseCategory(id, data);
    setEditExpenseId(null);
    toast.success('Đã cập nhật danh mục');
  };

  const handleDeleteExpense = (id, label) => {
    deleteExpenseCategory(id);
    toast.success(`Đã xóa "${label}"`);
  };

  // ── Income source handlers ─────────────────────────────────────────────────
  const handleAddIncome = (data) => {
    addIncomeSource(data);
    setShowAddIncome(false);
    toast.success('Đã thêm nguồn thu');
  };

  const handleUpdateIncome = (id, data) => {
    updateIncomeSource(id, data);
    setEditIncomeId(null);
    toast.success('Đã cập nhật nguồn thu');
  };

  const handleDeleteIncome = (id, label) => {
    deleteIncomeSource(id);
    toast.success(`Đã xóa "${label}"`);
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Danh mục & Nguồn thu</h1>
        <p className="text-slate-500 mt-1">Quản lý các danh mục chi tiêu và nguồn thu nhập của bạn</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ── Panel: Danh mục chi tiêu ─────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <LayoutList size={16} className="text-purple-600" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900">Danh mục chi tiêu</h2>
                <p className="text-xs text-slate-400">{expenseCategories.length} danh mục</p>
              </div>
            </div>
            {!showAddExpense && (
              <button
                onClick={() => { setShowAddExpense(true); setEditExpenseId(null); }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 transition-colors font-medium"
              >
                <Plus size={14} /> Thêm mới
              </button>
            )}
          </div>

          <div className="p-4 space-y-2">
            {/* Add form */}
            {showAddExpense && (
              <ExpenseCategoryForm
                onSave={handleAddExpense}
                onCancel={() => setShowAddExpense(false)}
              />
            )}

            {/* List */}
            {expenseCategories.length === 0 && !showAddExpense && (
              <div className="text-center py-10 text-slate-400">
                <LayoutList size={36} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">Chưa có danh mục nào</p>
              </div>
            )}

            {expenseCategories.map(cat => {
              const Icon  = ICON_MAP[cat.iconName] || Coffee;
              const style = COLOR_MAP[cat.color]   || COLOR_MAP.slate;

              if (editExpenseId === cat.id) {
                return (
                  <ExpenseCategoryForm
                    key={cat.id}
                    initial={cat}
                    onSave={(data) => handleUpdateExpense(cat.id, data)}
                    onCancel={() => setEditExpenseId(null)}
                  />
                );
              }

              return (
                <div
                  key={cat.id}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 group transition-colors"
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${style.bg}`}>
                    <Icon size={16} className={style.text} />
                  </div>
                  <span className="flex-1 text-sm font-medium text-slate-800">{cat.label}</span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => { setEditExpenseId(cat.id); setShowAddExpense(false); }}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-purple-600 hover:bg-purple-50 transition-colors"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => handleDeleteExpense(cat.id, cat.label)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Panel: Nguồn thu nhập ─────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <BadgeDollarSign size={16} className="text-green-600" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900">Nguồn thu nhập</h2>
                <p className="text-xs text-slate-400">{incomeSources.length} nguồn</p>
              </div>
            </div>
            {!showAddIncome && (
              <button
                onClick={() => { setShowAddIncome(true); setEditIncomeId(null); }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition-colors font-medium"
              >
                <Plus size={14} /> Thêm mới
              </button>
            )}
          </div>

          <div className="p-4 space-y-2">
            {/* Add form */}
            {showAddIncome && (
              <IncomeSourceForm
                onSave={handleAddIncome}
                onCancel={() => setShowAddIncome(false)}
              />
            )}

            {/* List */}
            {incomeSources.length === 0 && !showAddIncome && (
              <div className="text-center py-10 text-slate-400">
                <BadgeDollarSign size={36} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">Chưa có nguồn thu nào</p>
              </div>
            )}

            {incomeSources.map(src => {
              if (editIncomeId === src.id) {
                return (
                  <IncomeSourceForm
                    key={src.id}
                    initial={src}
                    onSave={(data) => handleUpdateIncome(src.id, data)}
                    onCancel={() => setEditIncomeId(null)}
                  />
                );
              }

              return (
                <div
                  key={src.id}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 group transition-colors"
                >
                  <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0">
                    <DollarSign size={16} className="text-green-600" />
                  </div>
                  <span className="flex-1 text-sm font-medium text-slate-800">{src.label}</span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => { setEditIncomeId(src.id); setShowAddIncome(false); }}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-green-600 hover:bg-green-50 transition-colors"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => handleDeleteIncome(src.id, src.label)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
