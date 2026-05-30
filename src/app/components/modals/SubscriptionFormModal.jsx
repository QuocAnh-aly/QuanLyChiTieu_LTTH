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
  const { currencies, currency } = useSettings();
  const isEdit = !!bill;

  const [name,          setName]          = useState("");
  const [selectedCurrency, setSelectedCurrency] = useState("");
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

  const [returnHere,    setReturnHere]    = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (bill) {
      setName(bill.name ?? "");
      setSelectedCurrency(bill.currency ?? currency);
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
      setName(""); setSelectedCurrency(currency); setAmountMin(""); setAmountMax("");
      setDate(new Date().toISOString().split("T")[0]);
      setRepeatFreq("monthly"); setSkip("0");
      setEndDate(""); setExtensionDate(""); setNotes(""); setObjectGroup(""); setActive(true);
      setReturnHere(false);
    }
  }, [isOpen, bill, currency]);

  if (!isOpen) return null;

  const canSubmit = name.trim() && amountMin && amountMax && date && repeatFreq;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    onSave({
      name:          name.trim(),
      currency:      selectedCurrency,
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
      returnHere,
    });
    if (returnHere && !isEdit) {
      // Clear fields to let user add another
      setName(""); setAmountMin(""); setAmountMax(""); setNotes("");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-[#2c323c] rounded-lg w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col shadow-2xl border border-slate-700" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-700 flex justify-between items-center bg-[#2c323c]">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-slate-200 flex items-center gap-2">
              <Receipt className="text-muted-foreground" size={24} />
              Hóa đơn định kỳ <span className="text-sm font-normal text-muted-foreground ml-2">{isEdit ? "Sửa" : "Tạo mới"}</span>
            </h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-slate-200">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto bg-[#2c323c] p-6 text-sm text-muted-foreground">
          <form id="subscription-form" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Mandatory Fields */}
              <div>
                <h3 className="font-semibold text-slate-200 mb-6 border-b border-[#315c81] pb-2 text-base">Trường bắt buộc</h3>
                
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                    <label className="sm:w-36 font-medium text-muted-foreground text-right shrink-0">Tên</label>
                    <input type="text" value={name} onChange={e => setName(e.target.value)} required
                      className="flex-1 bg-[#1e2329] border border-slate-600 rounded px-3 py-2 focus:outline-none focus:border-blue-500 text-slate-200" placeholder="Tên hóa đơn" />
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                    <label className="sm:w-36 font-medium text-muted-foreground text-right shrink-0">Tiền tệ</label>
                    <select value={selectedCurrency} onChange={e => setSelectedCurrency(e.target.value)}
                      className="flex-1 bg-[#1e2329] border border-slate-600 rounded px-3 py-2 focus:outline-none focus:border-blue-500 text-slate-200">
                      {currencies?.map(c => (
                        <option key={c.code} value={c.code}>{c.name} ({c.symbol})</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                    <label className="sm:w-36 font-medium text-muted-foreground text-right shrink-0">Số tiền tối thiểu</label>
                    <input type="number" value={amountMin} onChange={e => setAmountMin(e.target.value)} required min="0" step="1000"
                      className="flex-1 bg-[#1e2329] border border-slate-600 rounded px-3 py-2 focus:outline-none focus:border-blue-500 text-slate-200" />
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                    <label className="sm:w-36 font-medium text-muted-foreground text-right shrink-0">Số tiền tối đa</label>
                    <input type="number" value={amountMax} onChange={e => setAmountMax(e.target.value)} required min="0" step="1000"
                      className="flex-1 bg-[#1e2329] border border-slate-600 rounded px-3 py-2 focus:outline-none focus:border-blue-500 text-slate-200" />
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                    <label className="sm:w-36 font-medium text-muted-foreground text-right shrink-0">Ngày</label>
                    <input type="date" value={date} onChange={e => setDate(e.target.value)} required
                      className="flex-1 bg-[#1e2329] border border-slate-600 rounded px-3 py-2 focus:outline-none focus:border-blue-500 text-slate-200 [color-scheme:dark]" />
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                    <label className="sm:w-36 font-medium text-muted-foreground text-right shrink-0">Lặp lại</label>
                    <select value={repeatFreq} onChange={e => setRepeatFreq(e.target.value)} required
                      className="flex-1 bg-[#1e2329] border border-slate-600 rounded px-3 py-2 focus:outline-none focus:border-blue-500 text-slate-200">
                      {FREQ_OPTIONS.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4">
                    <label className="sm:w-36 font-medium text-muted-foreground text-right shrink-0 mt-2">Bỏ qua</label>
                    <div className="flex-1">
                      <input type="number" value={skip} onChange={e => setSkip(e.target.value)} min="0"
                        className="w-full bg-[#1e2329] border border-slate-600 rounded px-3 py-2 focus:outline-none focus:border-blue-500 text-slate-200" />
                      <p className="text-xs text-muted-foreground mt-1">Dùng để tạo lịch cách quãng (skip=1: 2 tháng/lần).</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Optional Fields */}
              <div className="bg-[#22272e] p-6 rounded-lg border border-slate-700">
                <h3 className="font-semibold text-slate-200 mb-6 border-b border-slate-600 pb-2 text-base">Trường tùy chọn</h3>
                
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4">
                    <label className="sm:w-32 font-medium text-muted-foreground text-right shrink-0 mt-2">Ngày kết thúc</label>
                    <div className="flex-1">
                      <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                        className="w-full bg-[#1e2329] border border-slate-600 rounded px-3 py-2 focus:outline-none focus:border-blue-500 text-slate-200 [color-scheme:dark]" />
                      <p className="text-xs text-muted-foreground mt-1">Không bắt buộc. Ngày kết thúc dự kiến.</p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4">
                    <label className="sm:w-32 font-medium text-muted-foreground text-right shrink-0 mt-2">Ngày gia hạn</label>
                    <div className="flex-1">
                      <input type="date" value={extensionDate} onChange={e => setExtensionDate(e.target.value)}
                        className="w-full bg-[#1e2329] border border-slate-600 rounded px-3 py-2 focus:outline-none focus:border-blue-500 text-slate-200 [color-scheme:dark]" />
                      <p className="text-xs text-muted-foreground mt-1">Không bắt buộc. Ngày phải gia hạn hoặc hủy.</p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4">
                    <label className="sm:w-32 font-medium text-muted-foreground text-right shrink-0 mt-2">Ghi chú</label>
                    <div className="flex-1">
                      <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
                        className="w-full bg-[#1e2329] border border-slate-600 rounded px-3 py-2 focus:outline-none focus:border-blue-500 text-slate-200 resize-y" placeholder="Ghi chú"></textarea>
                      <p className="text-xs text-muted-foreground mt-1">Hỗ trợ <a href="#" className="text-[#60a5fa] hover:underline">Markdown</a>.</p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4">
                    <label className="sm:w-32 font-medium text-muted-foreground text-right shrink-0 mt-2">Tệp đính kèm</label>
                    <div className="flex-1">
                      <input type="file" className="text-muted-foreground file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:bg-[#3e4551] file:text-slate-200 hover:file:bg-[#4b5563] text-sm" />
                      <p className="text-xs text-muted-foreground mt-1">Kích thước tối đa: 2 MB</p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                    <label className="sm:w-32 font-medium text-muted-foreground text-right shrink-0">Nhóm</label>
                    <input type="text" value={objectGroup} onChange={e => setObjectGroup(e.target.value)}
                      className="flex-1 bg-[#1e2329] border border-slate-600 rounded px-3 py-2 focus:outline-none focus:border-blue-500 text-slate-200" placeholder="Nhóm" />
                  </div>
                  
                  {isEdit && (
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                      <label className="sm:w-32 font-medium text-muted-foreground text-right shrink-0">Kích hoạt</label>
                      <label className="flex items-center gap-2 cursor-pointer flex-1">
                        <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} className="rounded border-slate-600 bg-[#1e2329] text-[#315c81] focus:ring-[#315c81]" />
                        <span className="text-muted-foreground">Kích hoạt</span>
                      </label>
                    </div>
                  )}

                </div>
              </div>
            </div>

            {/* Options */}
            <div className="mt-8 bg-[#22272e] p-6 rounded-lg border border-slate-700">
              <h3 className="font-semibold text-slate-200 mb-4 border-b border-slate-600 pb-2 text-base">Tùy chọn</h3>
              <div className="flex items-center gap-4">
                <label className="sm:w-36 font-medium text-muted-foreground text-right shrink-0">Quay lại đây</label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={returnHere} onChange={e => setReturnHere(e.target.checked)} className="rounded border-slate-600 bg-[#1e2329] text-[#315c81] focus:ring-[#315c81]" />
                  <span className="text-muted-foreground">Sau khi lưu, quay lại để tạo tiếp.</span>
                </label>
              </div>
              <div className="mt-6 flex justify-end gap-3 pb-2">
                <button type="button" onClick={onClose}
                  className="px-5 py-2.5 border border-slate-600 text-muted-foreground rounded hover:bg-slate-700 transition-colors">
                  Hủy
                </button>
                <button type="submit" disabled={!canSubmit} form="subscription-form"
                  className="px-5 py-2.5 bg-[#2ea043] text-white rounded hover:bg-[#3fb950] disabled:opacity-50 transition-colors">
                  {isEdit ? "Cập nhật" : "Lưu mới"}
                </button>
              </div>
            </div>

          </form>
        </div>

      </div>
    </div>
  );
}
