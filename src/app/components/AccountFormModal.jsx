import { X, Check } from "lucide-react";
import { useState, useEffect } from "react";

const COLOR_OPTIONS = [
  { value: 'blue',    label: 'Xanh dương', from: '#3b82f6', to: '#1d4ed8'  },
  { value: 'green',   label: 'Xanh lá',    from: '#22c55e', to: '#15803d'  },
  { value: 'purple',  label: 'Tím',        from: '#a855f7', to: '#7e22ce'  },
  { value: 'orange',  label: 'Cam',        from: '#f97316', to: '#c2410c'  },
  { value: 'emerald', label: 'Ngọc',       from: '#10b981', to: '#047857'  },
  { value: 'red',     label: 'Đỏ',         from: '#ef4444', to: '#b91c1c'  },
  { value: 'slate',   label: 'Xám',        from: '#64748b', to: '#475569'  },
  { value: 'pink',    label: 'Hồng',       from: '#ec4899', to: '#be185d'  },
];

const COLOR_MAP = Object.fromEntries(COLOR_OPTIONS.map(c => [c.value, c]));

const DEFAULT_COLORS = { 2: 'slate', 4: 'emerald', 5: 'orange' };

// typeId: 2 = Liabilities, 4 = Revenue, 5 = Expense
export function AccountFormModal({ isOpen, onClose, onSubmit, account, typeId }) {
  const isEdit      = !!account;
  const isLiability = typeId === 2;
  const isExpense   = typeId === 5;

  const TITLES = {
    create: { 2: 'Thêm khoản nợ', 4: 'Thêm nguồn thu', 5: 'Thêm tài khoản chi' },
    edit:   { 2: 'Sửa khoản nợ',  4: 'Sửa nguồn thu',  5: 'Sửa tài khoản chi'  },
  };
  const SUBMIT_LABELS = {
    create: { 2: 'Thêm khoản nợ', 4: 'Thêm nguồn thu', 5: 'Thêm tài khoản' },
    edit:   { 2: 'Lưu thay đổi',  4: 'Lưu thay đổi',   5: 'Lưu thay đổi'   },
  };
  const PLACEHOLDERS = {
    2: 'VD: Vay mua xe, Nợ thẻ tín dụng...',
    4: 'VD: Lương công ty ABC, Cho thuê nhà...',
    5: 'VD: Thẻ Visa VIB, Ví MoMo...',
  };

  const blankForm = () => ({
    name: '',
    color: DEFAULT_COLORS[typeId] || 'blue',
    cardNumber: '',
    balance: '',
    initialBalance: '',
    notes: '',
  });

  const [form,  setForm]  = useState(blankForm);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    if (account) {
      setForm({
        name:           account.name        || '',
        color:          account.color       || DEFAULT_COLORS[typeId] || 'blue',
        cardNumber:     account.cardNumber  || '',
        balance:        account.balance        != null ? String(Math.abs(account.balance))        : '',
        initialBalance: account.initialBalance != null ? String(Math.abs(account.initialBalance)) : '',
        notes:          account.notes || '',
      });
    } else {
      setForm(blankForm());
    }
    setError('');
  }, [isOpen, account]);

  if (!isOpen) return null;

  const set = (key) => (e) => {
    setForm(f => ({ ...f, [key]: e.target.value }));
    setError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const name = form.name.trim();
    if (!name) { setError('Tên không được để trống'); return; }

    const col  = COLOR_MAP[form.color] || COLOR_MAP.blue;
    const data = {
      name,
      color:        form.color,
      gradientFrom: col.from,
      gradientTo:   col.to,
      typeId,
      notes:        form.notes.trim() || null,
    };

    if (isLiability) {
      data.balance        = -(parseFloat(form.balance)        || 0);
      data.initialBalance = -(parseFloat(form.initialBalance) || parseFloat(form.balance) || 0);
    } else {
      data.balance = parseFloat(form.balance) || 0;
    }

    if (isExpense) data.cardNumber = form.cardNumber.trim() || null;

    onSubmit(data);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 sticky top-0 bg-white rounded-t-2xl z-10">
          <h2 className="text-lg font-bold text-slate-900">
            {TITLES[isEdit ? 'edit' : 'create'][typeId]}
          </h2>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="px-6 py-5 space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Tên <span className="text-red-500">*</span>
              </label>
              <input
                autoFocus
                type="text"
                value={form.name}
                onChange={set('name')}
                placeholder={PLACEHOLDERS[typeId]}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
            </div>

            {/* Color picker */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Màu sắc</label>
              <div className="grid grid-cols-4 gap-2">
                {COLOR_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, color: opt.value }))}
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border-2 transition-all ${
                      form.color === opt.value
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: opt.from }} />
                    <span className="text-xs text-slate-700">{opt.label}</span>
                  </button>
                ))}
              </div>

              {/* Preview gradient strip */}
              <div
                className="mt-2 h-2 rounded-full"
                style={{ background: `linear-gradient(90deg, ${(COLOR_MAP[form.color] || COLOR_MAP.blue).from}, ${(COLOR_MAP[form.color] || COLOR_MAP.blue).to})` }}
              />
            </div>

            {/* Card number — Expense only */}
            {isExpense && (
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Số thẻ (4 số cuối)
                </label>
                <input
                  type="text"
                  value={form.cardNumber}
                  onChange={set('cardNumber')}
                  placeholder="VD: **** 1234"
                  maxLength={9}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            )}

            {/* Liability: original + remaining */}
            {isLiability && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Số tiền ban đầu</label>
                  <input
                    type="number"
                    value={form.initialBalance}
                    onChange={set('initialBalance')}
                    placeholder="300000000"
                    min={0}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Dư nợ còn lại</label>
                  <input
                    type="number"
                    value={form.balance}
                    onChange={set('balance')}
                    placeholder="250000000"
                    min={0}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>
            )}

            {/* Revenue / Expense: single balance */}
            {!isLiability && (
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  {isExpense ? 'Dư nợ hiện tại' : 'Tổng đã nhận'}
                </label>
                <input
                  type="number"
                  value={form.balance}
                  onChange={set('balance')}
                  placeholder="0"
                  min={0}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            )}

            {/* Notes (optional for all) */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Ghi chú</label>
              <textarea
                value={form.notes}
                onChange={set('notes')}
                placeholder="Thêm ghi chú tùy chọn..."
                rows={2}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Check size={16} />
              {SUBMIT_LABELS[isEdit ? 'edit' : 'create'][typeId]}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
