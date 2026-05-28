import { X, Receipt } from "lucide-react";
import { useState, useEffect } from "react";
import { useSettings } from "../../context/SettingsContext";

const FREQ_OPTIONS = [
  { value: "daily",     label: "Hàng ngày" },
  { value: "weekly",    label: "Hàng tuần" },
  { value: "monthly",   label: "Hàng tháng" },
  { value: "quarterly", label: "Hàng quý (3 tháng)" },
  { value: "half-year", label: "Nửa năm (6 tháng)" },
  { value: "yearly",    label: "Hàng năm" },
];

export function SubscriptionFormModal({ isOpen, onClose, onSave, bill = null }) {
  const { currencySymbol } = useSettings();
  const isEdit = !!bill;

  const [name,          setName]          = useState("");
  const [amountMin,     setAmountMin]     = useState("");
  const [amountMax,     setAmountMax]     = useState("");
  const [date,          setDate]          = useState("");
  const [repeatFreq,    setRepeatFreq]    = useState("monthly");
  const [skip,          setSkip]          = useState("0");
  const [endDate,       setEndDate]       = useState("");
  const [extensionDate, setExtensionDate] = useState("");
  const [notes,         setNotes]         = useState("");
  const [objectGroup,   setObjectGroup]   = useState("");
  const [active,        setActive]        = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    if (bill) {
      setName(bill.name ?? "");
      setAmountMin(String(bill.amountMin ?? ""));
      setAmountMax(String(bill.amountMax ?? ""));
      setDate(bill.date ? bill.date.split("T")[0] : "");
      setRepeatFreq(bill.repeatFreq ?? "monthly");
      setSkip(String(bill.skip ?? 0));
      setEndDate(bill.endDate ? bill.endDate.split("T")[0] : "");
      setExtensionDate(bill.extensionDate ? bill.extensionDate.split("T")[0] : "");
      setNotes(bill.notes ?? "");
      setObjectGroup(bill.objectGroup ?? "");
      setActive(bill.active ?? true);
    } else {
      setName(""); setAmountMin(""); setAmountMax("");
      setDate(new Date().toISOString().split("T")[0]);
      setRepeatFreq("monthly"); setSkip("0");
      setEndDate(""); setExtensionDate(""); setNotes(""); setObjectGroup(""); setActive(true);
    }
  }, [isOpen, bill]);

  if (!isOpen) return null;

  const canSubmit = name.trim() && amountMin && amountMax && date && repeatFreq;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    onSave({
      name:          name.trim(),
      amountMin:     parseFloat(amountMin),
      amountMax:     parseFloat(amountMax),
      date:          date,
      repeatFreq,
      skip:          parseInt(skip) || 0,
      endDate:       endDate || null,
      extensionDate: extensionDate || null,
      notes:         notes.trim() || null,
      objectGroup:   objectGroup.trim() || null,
      active,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto shadow-2xl"
        onClick={e => e.stopPropagation()}>

        {/* Header stripe */}
        <div className="h-1.5 rounded-t-2xl bg-gradient-to-r from-violet-500 to-purple-600" />

        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-100 flex items-center justify-center">
              <Receipt size={18} className="text-purple-600" />
            </div>
            <h2 className="text-base font-bold text-slate-900">
              {isEdit ? "Sửa hóa đơn" : "Thêm hóa đơn định kỳ"}
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="px-6 py-4 space-y-4">

            {/* Name */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Tên hóa đơn <span className="text-red-500">*</span>
              </label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} required
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Ví dụ: Netflix, Tiền thuê nhà..." />
            </div>

            {/* Amount range */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Tối thiểu <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">{currencySymbol}</span>
                  <input type="number" value={amountMin} onChange={e => setAmountMin(e.target.value)}
                    required min="0" step="1000"
                    className="w-full pl-8 pr-3 py-2.5 border border-slate-200 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="0" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Tối đa <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">{currencySymbol}</span>
                  <input type="number" value={amountMax} onChange={e => setAmountMax(e.target.value)}
                    required min="0" step="1000"
                    className="w-full pl-8 pr-3 py-2.5 border border-slate-200 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="0" />
                </div>
              </div>
            </div>

            {/* Date + Freq row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Ngày bắt đầu chu kỳ <span className="text-red-500">*</span>
                </label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} required
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Tần suất <span className="text-red-500">*</span>
                </label>
                <select value={repeatFreq} onChange={e => setRepeatFreq(e.target.value)} required
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500">
                  {FREQ_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Skip */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Bỏ qua chu kỳ
                <span className="ml-1.5 text-xs font-normal text-slate-400">(0 = mỗi chu kỳ, 1 = cách 1, ...)</span>
              </label>
              <input type="number" value={skip} onChange={e => setSkip(e.target.value)}
                min="0" max="31" step="1"
                className="w-32 px-3 py-2.5 border border-slate-200 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="0" />
            </div>

            {/* EndDate + ExtensionDate */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Ngày kết thúc</label>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Ngày gia hạn</label>
                <input type="date" value={extensionDate} onChange={e => setExtensionDate(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
              </div>
            </div>

            {/* Object Group */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nhóm</label>
              <input type="text" value={objectGroup} onChange={e => setObjectGroup(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Ví dụ: Streaming, Nhà ở..." />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Ghi chú</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                placeholder="Thông tin thêm..." />
            </div>

            {/* Active (edit only) */}
            {isEdit && (
              <label className="flex items-center gap-3 cursor-pointer">
                <div className="relative">
                  <input type="checkbox" className="sr-only" checked={active} onChange={e => setActive(e.target.checked)} />
                  <div className={`w-10 h-5 rounded-full transition-colors ${active ? "bg-purple-500" : "bg-slate-200"}`} />
                  <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${active ? "translate-x-5" : "translate-x-0"}`} />
                </div>
                <span className="text-sm font-semibold text-slate-700">Đang hoạt động</span>
              </label>
            )}
          </div>

          <div className="flex gap-3 px-6 py-4 border-t border-slate-200">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 font-semibold text-sm">
              Hủy
            </button>
            <button type="submit" disabled={!canSubmit}
              className="flex-1 px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              {isEdit ? "Lưu thay đổi" : "Tạo hóa đơn"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
