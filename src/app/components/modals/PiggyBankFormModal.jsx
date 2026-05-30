import { X, PiggyBank } from "lucide-react";
import { useState, useEffect } from "react";
import { walletApi } from "../../api/walletApi";
import { useSettings } from "../../context/SettingsContext";

export function PiggyBankFormModal({ isOpen, onClose, onSave, goal = null }) {
  const { fmt, currencies, currency } = useSettings();
  const isEdit = !!goal;

  const [accounts,     setAccounts]     = useState([]);
  
  // Mandatory
  const [name,         setName]         = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [selectedCurrency, setSelectedCurrency] = useState("");
  const [selectedAccounts, setSelectedAccounts] = useState([]);
  
  // Optional
  const [targetDate,   setTargetDate]   = useState("");
  const [notes,        setNotes]        = useState("");
  const [objectGroup,  setObjectGroup]  = useState("");
  const [monthly,      setMonthly]      = useState("");

  const [returnHere,   setReturnHere]   = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    walletApi.getByType(1)
      .then(data => setAccounts(data.items || data || []))
      .catch(() => {});
    if (goal) {
      setName(goal.title ?? "");
      setTargetAmount(String(goal.targetAmount ?? ""));
      setSelectedCurrency(goal.currency ?? currency);
      setSelectedAccounts(goal.accountId ? [String(goal.accountId)] : []);
      setTargetDate(goal.targetDate ?? "");
      setNotes(goal.notes ?? "");
      setObjectGroup(goal.objectGroup ?? "");
      setMonthly(String(goal.savePerMonth ?? ""));
    } else {
      setName(""); setTargetAmount(""); setSelectedCurrency(currency); setSelectedAccounts([]);
      setTargetDate(""); setNotes(""); setObjectGroup(""); setMonthly("");
      setReturnHere(false);
    }
  }, [isOpen, goal, currency]);

  if (!isOpen) return null;

  const handleAccountChange = (e) => {
    const options = e.target.options;
    const values = [];
    for (let i = 0; i < options.length; i++) {
      if (options[i].selected) {
        values.push(options[i].value);
      }
    }
    setSelectedAccounts(values);
  };

  const canSubmit = name.trim() && targetAmount && selectedAccounts.length > 0;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    onSave({
      accountId:           parseInt(selectedAccounts[0]) || (goal?.accountId ?? 0),
      title:               name.trim(),
      targetAmount:        parseFloat(targetAmount),
      monthlyContribution: parseFloat(monthly) || 0,
      targetDate:          targetDate || null,
      notes:               notes.trim() || null,
      currency:            selectedCurrency,
      objectGroup:         objectGroup.trim() || null,
      iconName:            goal?.iconName || "PiggyBank",
      color:               goal?.color || "green",
      returnHere,
    });
    if (returnHere && !isEdit) {
      setName(""); setTargetAmount(""); setNotes(""); setSelectedAccounts([]);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-[#2c323c] rounded-lg w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col shadow-2xl border border-slate-700" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-700 flex justify-between items-center bg-[#2c323c]">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-slate-200 flex items-center gap-2">
              <PiggyBank className="text-muted-foreground" size={24} />
              Lợn tiết kiệm <span className="text-sm font-normal text-muted-foreground ml-2">{isEdit ? "Sửa" : "Tạo mới"}</span>
            </h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-slate-200">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto bg-[#2c323c] p-6 text-sm text-muted-foreground">
          {/* Info Banner */}
          <div className="bg-[#3e4551] rounded text-sm p-3 mb-6 text-muted-foreground border border-slate-600 flex items-center gap-1">
            Xin lỗi, không có văn bản giải thích cho <a href="#" className="underline text-blue-400">trang này</a>. Tuy nhiên, biểu tượng ở góc trên bên phải có thể cho bạn biết thêm.
          </div>

          <form id="piggybank-form" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Mandatory Fields */}
              <div>
                <h3 className="font-semibold text-slate-200 mb-6 border-b border-[#315c81] pb-2 text-base">Trường bắt buộc</h3>
                
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                    <label className="sm:w-36 font-medium text-muted-foreground text-right shrink-0">Tên</label>
                    <input type="text" value={name} onChange={e => setName(e.target.value)} required
                      className="flex-1 bg-[#1e2329] border border-slate-600 rounded px-3 py-2 focus:outline-none focus:border-blue-500 text-slate-200" placeholder="Tên mục tiêu" />
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                    <label className="sm:w-36 font-medium text-muted-foreground text-right shrink-0">Số tiền mục tiêu</label>
                    <input type="number" value={targetAmount} onChange={e => setTargetAmount(e.target.value)} required min="1" step="1000"
                      className="flex-1 bg-[#1e2329] border border-slate-600 rounded px-3 py-2 focus:outline-none focus:border-blue-500 text-slate-200" />
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4">
                    <label className="sm:w-36 font-medium text-muted-foreground text-right shrink-0 mt-2">Tiền tệ</label>
                    <div className="flex-1">
                      <select value={selectedCurrency} onChange={e => setSelectedCurrency(e.target.value)}
                        className="w-full bg-[#1e2329] border border-slate-600 rounded px-3 py-2 focus:outline-none focus:border-blue-500 text-slate-200">
                        {currencies?.map(c => (
                          <option key={c.code} value={c.code}>{c.name} ({c.symbol})</option>
                        ))}
                      </select>
                      <p className="text-xs text-muted-foreground mt-1">Lợn tiết kiệm chỉ nhận một loại tiền tệ.</p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4">
                    <label className="sm:w-36 font-medium text-muted-foreground text-right shrink-0 mt-2">Lưu vào tài khoản</label>
                    <div className="flex-1">
                      <select multiple size={8} value={selectedAccounts} onChange={handleAccountChange} required
                        className="w-full bg-[#1e2329] border border-[#315c81] rounded px-3 py-2 focus:outline-none focus:border-blue-500 text-slate-200">
                        {accounts.map(a => (
                          <option key={a.accountId} value={a.accountId} className="p-1 hover:bg-[#315c81]">
                            {a.name}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-muted-foreground mt-1">Chỉ chấp nhận tài khoản cùng loại tiền tệ.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Optional Fields */}
              <div className="bg-[#22272e] p-6 rounded-lg border border-slate-700">
                <h3 className="font-semibold text-slate-200 mb-6 border-b border-slate-600 pb-2 text-base">Trường tùy chọn</h3>
                
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                    <label className="sm:w-32 font-medium text-muted-foreground text-right shrink-0">Ngày mục tiêu</label>
                    <input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)}
                      className="flex-1 bg-[#1e2329] border border-slate-600 rounded px-3 py-2 focus:outline-none focus:border-blue-500 text-slate-200 [color-scheme:dark]" />
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4">
                    <label className="sm:w-32 font-medium text-muted-foreground text-right shrink-0 mt-2">Ghi chú</label>
                    <div className="flex-1">
                      <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={4}
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

                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 hidden">
                    <label className="sm:w-32 font-medium text-muted-foreground text-right shrink-0">Tiết kiệm hàng tháng</label>
                    <input type="number" value={monthly} onChange={e => setMonthly(e.target.value)} min="0" step="1000"
                      className="flex-1 bg-[#1e2329] border border-slate-600 rounded px-3 py-2 focus:outline-none focus:border-blue-500 text-slate-200" />
                  </div>

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
                <button type="submit" disabled={!canSubmit} form="piggybank-form"
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
