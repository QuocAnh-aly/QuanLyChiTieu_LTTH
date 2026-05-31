import { X, Check, Landmark, Wallet, TrendingUp, CreditCard, PiggyBank, Home, Package } from "lucide-react";
import { useState, useEffect } from "react";
import { accountApi } from "../../api/accountApi";

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

const COLOR_MAP = Object.fromEntries(COLOR_OPTIONS.map(c => [c.value, c]));  const DEFAULT_COLORS = { 1: 'blue', 2: 'slate', 4: 'emerald', 5: 'orange' };

// Sub-types for Assets (typeId=1)
const ASSET_SUBTYPES = [
  { key: 'bank',       label: 'Tài khoản ngân hàng',  iconName: 'Landmark',    color: 'blue',    from: '#3b82f6', to: '#1d4ed8'  },
  { key: 'cash',       label: 'Tiền mặt',             iconName: 'Wallet',      color: 'emerald', from: '#10b981', to: '#047857'  },
  { key: 'savings',    label: 'Tiết kiệm',            iconName: 'PiggyBank',   color: 'green',   from: '#22c55e', to: '#15803d'  },
  { key: 'investment', label: 'Đầu tư',               iconName: 'TrendingUp',  color: 'purple',  from: '#a855f7', to: '#7e22ce'  },
  { key: 'property',   label: 'Bất động sản',         iconName: 'Home',        color: 'orange',  from: '#f97316', to: '#c2410c'  },
  { key: 'credit',     label: 'Thẻ tín dụng / Trả góp', iconName: 'CreditCard', color: 'red',    from: '#ef4444', to: '#b91c1c'  },
  { key: 'other',      label: 'Tài sản khác',         iconName: 'Package',     color: 'slate',   from: '#64748b', to: '#475569'  },
];

const ASSET_SUBTYPE_MAP = Object.fromEntries(ASSET_SUBTYPES.map(s => [s.key, s]));

const SUBTYPE_ICONS = { Landmark, Wallet, PiggyBank, TrendingUp, Home, CreditCard, Package };

// typeId: 1 = Asset, 2 = Liabilities, 4 = Revenue, 5 = Expense
export function AccountFormModal({ isOpen, onClose, onSubmit, account, typeId }) {
  const isEdit      = !!account;
  const isLiability = typeId === 2;
  const isExpense   = typeId === 5;
  const isAsset     = typeId === 1;

  const TITLES = {
    create: { 1: 'Thêm tài sản', 2: 'Thêm khoản nợ', 4: 'Thêm nguồn thu', 5: 'Thêm tài khoản chi' },
    edit:   { 1: 'Sửa tài sản',  2: 'Sửa khoản nợ',  4: 'Sửa nguồn thu',  5: 'Sửa tài khoản chi'  },
  };
  const SUBMIT_LABELS = {
    create: { 1: 'Thêm tài sản', 2: 'Thêm khoản nợ', 4: 'Thêm nguồn thu', 5: 'Thêm tài khoản' },
    edit:   { 1: 'Lưu thay đổi', 2: 'Lưu thay đổi',  4: 'Lưu thay đổi',   5: 'Lưu thay đổi'   },
  };
  const PLACEHOLDERS = {
    1: 'VD: MB Bank, Tiền mặt trong nhà...',
    2: 'VD: Vay mua xe, Nợ thẻ tín dụng...',
    4: 'VD: Lương công ty ABC, Cho thuê nhà...',
    5: 'VD: Thẻ Visa VIB, Ví MoMo...',
  };

  const blankForm = () => ({
    name: '',
    assetSubtype: isAsset ? 'bank' : '',
    color: DEFAULT_COLORS[typeId] || 'blue',
    cardNumber: '',
    balance: '',
    initialBalance: '',
    notes: '',
    sourceAccountId: '',
  });

  const [form,  setForm]  = useState(blankForm);
  const [error, setError] = useState('');
  const [sourceAccounts, setSourceAccounts] = useState([]);
  const [loadingSources, setLoadingSources] = useState(false);

  const selectedSubtype = isAsset ? ASSET_SUBTYPE_MAP[form.assetSubtype] : null;

  // Fetch asset accounts for source selection (chỉ khi tạo mới và là Liability)
  useEffect(() => {
    if (!isOpen || isEdit || !isLiability) return;
    const fetchSources = async () => {
      setLoadingSources(true);
      try {
        const data = await accountApi.getByType(1, { page: 1, pageSize: 100 });
        setSourceAccounts(data.items || data || []);
      } catch {
        setSourceAccounts([]);
      } finally {
        setLoadingSources(false);
      }
    };
    fetchSources();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    if (account) {
      // Determine asset sub-type from existing iconName
      const iconToKey = { Landmark: 'bank', Wallet: 'cash', WalletIcon: 'cash', PiggyBank: 'savings', TrendingUp: 'investment', Home: 'property', CreditCard: 'credit', Package: 'other' };
      const detectedSubtype = iconToKey[account.iconName] || '';
      setForm({
        name:           account.name        || '',
        assetSubtype:   detectedSubtype,
        color:          account.color       || DEFAULT_COLORS[typeId] || 'blue',
        cardNumber:     account.cardNumber  || '',
        balance:        account.balance        != null ? String(Math.abs(account.balance))        : '',
        initialBalance: account.initialBalance != null ? String(Math.abs(account.initialBalance)) : '',
        notes:          account.notes || '',
        sourceAccountId: '',
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

  const handleSubtypeSelect = (key) => {
    const st = ASSET_SUBTYPE_MAP[key];
    if (!st) return;
    setForm(f => ({
      ...f,
      assetSubtype: key,
      color:    st.color,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const name = form.name.trim();
    if (!name) { setError('Tên không được để trống'); return; }

    let col;
    let iconName;

    if (isAsset && selectedSubtype) {
      col = COLOR_MAP[form.color] || COLOR_MAP.blue;  // form.color is set by sub-type selection, but can be overridden manually
      iconName = selectedSubtype.iconName;
    } else {
      col = COLOR_MAP[form.color] || COLOR_MAP.blue;
      iconName = null;
    }

    const hasSource = form.sourceAccountId && !isEdit;
    const data = {
      name,
      iconName,
      color:        col.value,
      gradientFrom: col.from,
      gradientTo:   col.to,
      typeId,
      notes:        form.notes.trim() || null,
    };

    if (isLiability) {
      const amount = parseFloat(form.balance) || 0;
      if (hasSource) {
        // Gán nợ vào tài khoản bank: gửi balance dương, controller tạo transaction
        data.sourceAccountId = parseInt(form.sourceAccountId);
        data.balance = amount; // Positive amount, controller xử lý
        data.initialBalance = 0;
      } else {
        data.balance        = -amount;
        data.initialBalance = -(parseFloat(form.initialBalance) || amount);
      }
    } else {
      const amount = parseFloat(form.balance) || 0;
      if (hasSource && amount > 0) {
        data.balance = amount;
        data.sourceAccountId = parseInt(form.sourceAccountId);
      } else {
        data.balance = amount;
      }
      if (isAsset) {
        data.initialBalance = parseFloat(form.initialBalance) || 0;
      }
    }

    if (isExpense) {
      data.cardNumber = form.cardNumber.trim() || null;
    } else if (isAsset && !isEdit) {
      // Auto-generate a random card number on create (timestamp-based to minimize duplicates)
      const now = Date.now();
      const rand = Math.floor(100 + Math.random() * 900);
      data.cardNumber = `•••• ${String(now % 10000).padStart(4, '0')}${rand}`;
    }

    onSubmit(data);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-2xl shadow-2xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card rounded-t-2xl z-10">
          <h2 className="text-lg font-bold text-card-foreground">
            {TITLES[isEdit ? 'edit' : 'create'][typeId]}
          </h2>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="px-6 py-5 space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">
                Tên <span className="text-red-500">*</span>
              </label>
              <input
                autoFocus
                type="text"
                value={form.name}
                onChange={set('name')}
                placeholder={PLACEHOLDERS[typeId]}
                className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
            </div>

            {/* Color picker */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">Màu sắc</label>
              <div className="grid grid-cols-4 gap-2">
                {COLOR_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, color: opt.value }))}
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border-2 transition-all ${
                      form.color === opt.value
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-border hover:border-border'
                    }`}
                  >
                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: opt.from }} />
                    <span className="text-xs text-foreground">{opt.label}</span>
                  </button>
                ))}
              </div>

              {/* Preview gradient strip */}
              <div
                className="mt-2 h-2 rounded-full"
                style={{ background: `linear-gradient(90deg, ${(COLOR_MAP[form.color] || COLOR_MAP.blue).from}, ${(COLOR_MAP[form.color] || COLOR_MAP.blue).to})` }}
              />
            </div>

            {/* Asset sub-type selector */}
            {isAsset && !isEdit && (
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Loại tài sản <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {ASSET_SUBTYPES.map(st => {
                    const isActive = form.assetSubtype === st.key;
                    const SubIcon = SUBTYPE_ICONS[st.iconName] || Landmark;
                    return (
                      <button
                        key={st.key}
                        type="button"
                        onClick={() => handleSubtypeSelect(st.key)}
                        className={`flex flex-col items-center gap-1.5 px-2 py-3 rounded-xl border-2 transition-all ${
                          isActive
                            ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30'
                            : 'border-border hover:border-border hover:bg-muted'
                        }`}
                      >
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white shrink-0"
                          style={{ background: isActive ? `linear-gradient(135deg, ${st.from}, ${st.to})` : 'var(--color-muted)' }}
                        >
                          <SubIcon size={14} />
                        </div>
                        <span className={`text-[10px] font-semibold text-center leading-tight ${isActive ? 'text-purple-700 dark:text-purple-300' : 'text-muted-foreground'}`}>
                          {st.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {selectedSubtype && (
                  <div
                    className="mt-2 flex items-center gap-2 px-3 py-2 rounded-lg text-white text-xs font-semibold"
                    style={{ background: `linear-gradient(90deg, ${selectedSubtype.from}, ${selectedSubtype.to})` }}
                  >
                    {(() => {
                      const PreviewIcon = SUBTYPE_ICONS[selectedSubtype.iconName] || Landmark;
                      return <PreviewIcon size={14} />;
                    })()}
                    {selectedSubtype.label}
                  </div>
                )}
              </div>
            )}

            {/* Card number — Expense only (Assets get auto-generated) */}
            {isExpense && (
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">
                  Số thẻ / Số tài khoản
                </label>
                <input
                  type="text"
                  value={form.cardNumber}
                  onChange={set('cardNumber')}
                  placeholder="VD: **** 1234"
                  maxLength={9}
                  className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            )}

            {/* Liability: source account (gán nợ vào tài khoản bank) */}
            {isLiability && !isEdit && (
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">
                  Gán nợ vào tài khoản <span className="text-muted-foreground font-normal">(tùy chọn)</span>
                </label>
                <select
                  value={form.sourceAccountId}
                  onChange={e => setForm(f => ({ ...f, sourceAccountId: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-card"
                >
                  <option value="">Không gán vào tài khoản</option>
                  {loadingSources ? (
                    <option disabled>Đang tải...</option>
                  ) : sourceAccounts.length === 0 ? (
                    <option disabled>Không có tài khoản ngân hàng</option>
                  ) : (
                    sourceAccounts.map(acc => (
                      <option key={acc.accountId} value={acc.accountId}>
                        {acc.name} — {Intl.NumberFormat('vi-VN').format(acc.balance ?? 0)}đ
                      </option>
                    ))
                  )}
                </select>
                {form.sourceAccountId && (
                  <p className="text-xs text-blue-600 mt-1">
                    <Landmark size={12} className="inline mr-0.5" />
                    Số tiền vay sẽ được chuyển vào tài khoản này
                  </p>
                )}
              </div>
            )}

            {/* Liability: amount fields */}
            {isLiability && (
              <>
                {form.sourceAccountId ? (
                  /* Gán nợ vào tài khoản: chỉ cần 1 số tiền */
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-1.5">
                      Số tiền vay / Dư nợ
                    </label>
                    <input
                      type="number"
                      value={form.balance}
                      onChange={set('balance')}
                      placeholder="100000000"
                      min={0}
                      className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <p className="text-xs text-blue-600 mt-1">
                      <Landmark size={12} className="inline mr-0.5" />
                      Số tiền này sẽ được chuyển vào tài khoản đã chọn và ghi nhận là khoản nợ
                    </p>
                  </div>
                ) : (
                  /* Tạo nợ thông thường: số tiền ban đầu và dư nợ còn lại */
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-1.5">
                        Số tiền ban đầu
                      </label>
                      <input
                        type="number"
                        value={form.initialBalance}
                        onChange={set('initialBalance')}
                        placeholder="300000000"
                        min={0}
                        className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-1.5">
                        Dư nợ còn lại
                      </label>
                      <input
                        type="number"
                        value={form.balance}
                        onChange={set('balance')}
                        placeholder="250000000"
                        min={0}
                        className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Revenue / Expense / Asset: balance fields */}
            {!isLiability && (
              <>
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">
                    {isAsset ? 'Số dư hiện tại' : isExpense ? 'Dư nợ hiện tại' : 'Tổng đã nhận'}
                  </label>
                  <input
                    type="number"
                    value={form.balance}
                    onChange={set('balance')}
                    placeholder="0"
                    min={0}
                    className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                {isAsset && (
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-1.5">
                      Số dư ban đầu <span className="text-muted-foreground font-normal">(tùy chọn)</span>
                    </label>
                    <input
                      type="number"
                      value={form.initialBalance}
                      onChange={set('initialBalance')}
                      placeholder="0"
                      min={0}
                      className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                )}
              </>
            )}

            {/* Notes (optional for all) */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">Ghi chú</label>
              <textarea
                value={form.notes}
                onChange={set('notes')}
                placeholder="Thêm ghi chú tùy chọn..."
                rows={2}
                className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 px-6 py-4 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
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
