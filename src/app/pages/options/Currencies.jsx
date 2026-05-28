import { useState } from 'react';
import { Plus, Star, Search, Trash2, X, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import { useSettings } from '../../context/SettingsContext';

const POPULAR_CURRENCIES = [
  { code: 'GBP', name: 'British Pound',       symbol: '£' },
  { code: 'CNY', name: 'Chinese Yuan',         symbol: '¥' },
  { code: 'KRW', name: 'South Korean Won',     symbol: '₩' },
  { code: 'THB', name: 'Thai Baht',            symbol: '฿' },
  { code: 'SGD', name: 'Singapore Dollar',     symbol: 'S$' },
  { code: 'AUD', name: 'Australian Dollar',    symbol: 'A$' },
  { code: 'CAD', name: 'Canadian Dollar',      symbol: 'C$' },
  { code: 'CHF', name: 'Swiss Franc',          symbol: 'Fr' },
  { code: 'HKD', name: 'Hong Kong Dollar',     symbol: 'HK$' },
  { code: 'MYR', name: 'Malaysian Ringgit',    symbol: 'RM' },
];

const EMPTY_FORM = { code: '', name: '', symbol: '' };

export function Currencies() {
  const { currencies, setDefaultCurrency, addCurrency, removeCurrency } = useSettings();

  const [search, setSearch]     = useState('');
  const [showAdd, setShowAdd]   = useState(false);
  const [form, setForm]         = useState(EMPTY_FORM);
  const [errors, setErrors]     = useState({});
  const [tab, setTab]           = useState('popular'); // 'popular' | 'custom'

  const closeModal = () => {
    setShowAdd(false);
    setForm(EMPTY_FORM);
    setErrors({});
    setTab('popular');
  };

  const validate = () => {
    const e = {};
    if (!form.code.trim())                      e.code = 'Bắt buộc';
    else if (!/^[A-Z]{2,5}$/.test(form.code))  e.code = 'Từ 2–5 chữ in hoa (VD: USD)';
    if (!form.name.trim())                      e.name = 'Bắt buộc';
    if (!form.symbol.trim())                    e.symbol = 'Bắt buộc';
    return e;
  };

  const handleAddCustom = () => {
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    try {
      addCurrency({ code: form.code, name: form.name.trim(), symbol: form.symbol.trim() });
      toast.success(`Đã thêm tiền tệ ${form.code}`);
      closeModal();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleAddPopular = (curr) => {
    try {
      addCurrency(curr);
      toast.success(`Đã thêm ${curr.code} – ${curr.name}`);
      closeModal();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleSetDefault = (code) => {
    setDefaultCurrency(code);
    toast.success(`Đã đặt ${code} làm tiền tệ mặc định`);
  };

  const handleRemove = (code) => {
    const curr = currencies.find(c => c.code === code);
    if (curr?.isDefault) {
      toast.error('Không thể xóa tiền tệ mặc định. Vui lòng chọn mặc định khác trước.');
      return;
    }
    if (!window.confirm(`Xóa tiền tệ ${code}?`)) return;
    try {
      removeCurrency(code);
      toast.success(`Đã xóa ${code}`);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const filtered = currencies.filter(c =>
    c.code.toLowerCase().includes(search.toLowerCase()) ||
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const existingCodes = new Set(currencies.map(c => c.code));
  const availablePopular = POPULAR_CURRENCIES.filter(c => !existingCodes.has(c.code));

  return (
    <div className="p-8 max-w-5xl mx-auto">

      {/* ── Header ─────────────────────────────────── */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Tiền tệ</h1>
          <p className="text-slate-500 mt-1">Quản lý các loại tiền tệ được sử dụng trong hệ thống</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors shadow-sm font-medium"
        >
          <Plus size={18} />
          Thêm tiền tệ
        </button>
      </div>

      {/* ── Table card ─────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
          <h3 className="font-bold text-slate-900 text-lg">
            Danh sách Tiền tệ
            <span className="ml-2 text-sm font-normal text-slate-400">({currencies.length})</span>
          </h3>
          <div className="relative w-full sm:max-w-xs">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Tìm kiếm theo mã hoặc tên..."
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>

        <table className="w-full text-left">
          <thead>
            <tr className="text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200 bg-slate-50">
              <th className="px-6 py-4 font-semibold">Mã</th>
              <th className="px-6 py-4 font-semibold">Tên tiền tệ</th>
              <th className="px-6 py-4 font-semibold text-center">Ký hiệu</th>
              <th className="px-6 py-4 font-semibold text-center">Trạng thái</th>
              <th className="px-6 py-4 font-semibold text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map(c => (
              <tr
                key={c.code}
                className={`hover:bg-slate-50 transition-colors ${c.isDefault ? 'bg-indigo-50/30' : ''}`}
              >
                <td className="px-6 py-4">
                  <span className="font-bold text-slate-900 font-mono">{c.code}</span>
                </td>
                <td className="px-6 py-4 text-slate-700 font-medium">{c.name}</td>
                <td className="px-6 py-4 text-center">
                  <span className="inline-flex min-w-8 h-8 px-2 items-center justify-center bg-slate-100 text-slate-700 rounded-lg font-mono font-bold text-sm border border-slate-200">
                    {c.symbol}
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                  {c.isDefault ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-bold">
                      <Star size={12} className="fill-indigo-700" />
                      Mặc định
                    </span>
                  ) : (
                    <span className="text-slate-300 text-sm">—</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-end gap-2">
                    {!c.isDefault && (
                      <>
                        <button
                          onClick={() => handleSetDefault(c.code)}
                          className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-md hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-colors"
                        >
                          Đặt mặc định
                        </button>
                        <button
                          onClick={() => handleRemove(c.code)}
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                          title="Xóa tiền tệ"
                        >
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}
                    {c.isDefault && (
                      <span className="text-xs text-slate-400 italic pr-1">Đang dùng</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan="5" className="px-6 py-16 text-center">
                  <DollarSign size={32} className="mx-auto text-slate-300 mb-2" />
                  <p className="text-slate-500">Không tìm thấy loại tiền tệ nào.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Add Currency Modal ──────────────────────── */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">

            {/* Modal header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Thêm tiền tệ</h2>
                <p className="text-sm text-slate-500 mt-0.5">Chọn từ danh sách hoặc nhập thủ công</p>
              </div>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500"
              >
                <X size={20} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 p-4 pb-0">
              <button
                onClick={() => setTab('popular')}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
                  tab === 'popular'
                    ? 'bg-purple-100 text-purple-700'
                    : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                Tiền tệ phổ biến
              </button>
              <button
                onClick={() => setTab('custom')}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
                  tab === 'custom'
                    ? 'bg-purple-100 text-purple-700'
                    : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                Nhập thủ công
              </button>
            </div>

            {/* Tab: Popular */}
            {tab === 'popular' && (
              <div className="p-4">
                {availablePopular.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-sm">
                    Tất cả tiền tệ phổ biến đã được thêm.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
                    {availablePopular.map(c => (
                      <button
                        key={c.code}
                        onClick={() => handleAddPopular(c)}
                        className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl hover:border-purple-300 hover:bg-purple-50 transition-colors text-left group"
                      >
                        <span className="w-9 h-9 flex items-center justify-center bg-slate-100 group-hover:bg-purple-100 rounded-lg font-mono font-bold text-sm text-slate-700 group-hover:text-purple-700 flex-shrink-0 transition-colors">
                          {c.symbol}
                        </span>
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 text-sm">{c.code}</div>
                          <div className="text-xs text-slate-500 truncate">{c.name}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab: Custom */}
            {tab === 'custom' && (
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Mã tiền tệ <span className="text-red-500">*</span>
                    <span className="ml-1 text-xs text-slate-400 font-normal">(2–5 chữ in hoa)</span>
                  </label>
                  <input
                    type="text"
                    value={form.code}
                    onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase().replace(/[^A-Z]/g, '') }))}
                    placeholder="VD: THB, GBP, CNY"
                    maxLength={5}
                    className={`w-full px-3 py-2.5 border rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                      errors.code ? 'border-red-400 bg-red-50' : 'border-slate-200'
                    }`}
                  />
                  {errors.code && <p className="text-red-500 text-xs mt-1">{errors.code}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Tên tiền tệ <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="VD: Thai Baht, British Pound"
                    className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                      errors.name ? 'border-red-400 bg-red-50' : 'border-slate-200'
                    }`}
                  />
                  {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Ký hiệu <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.symbol}
                    onChange={e => setForm(f => ({ ...f, symbol: e.target.value }))}
                    placeholder="VD: ฿, £, S$"
                    maxLength={5}
                    className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                      errors.symbol ? 'border-red-400 bg-red-50' : 'border-slate-200'
                    }`}
                  />
                  {errors.symbol && <p className="text-red-500 text-xs mt-1">{errors.symbol}</p>}
                </div>

                {/* Preview */}
                {(form.code || form.symbol) && (
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-xs text-slate-500">Xem trước:</span>
                    <span className="font-mono font-bold text-slate-700">{form.code || '???'}</span>
                    <span className="w-8 h-8 flex items-center justify-center bg-white border border-slate-200 rounded-lg font-mono font-bold text-sm text-slate-700">
                      {form.symbol || '?'}
                    </span>
                    <span className="text-sm text-slate-600">{form.name || 'Tên tiền tệ'}</span>
                  </div>
                )}
              </div>
            )}

            {/* Footer */}
            <div className="flex gap-3 p-6 pt-2 border-t border-slate-100 mt-2">
              <button
                onClick={closeModal}
                className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Hủy
              </button>
              {tab === 'custom' && (
                <button
                  onClick={handleAddCustom}
                  className="flex-1 px-4 py-2.5 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors"
                >
                  Thêm tiền tệ
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
