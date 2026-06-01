import { X } from "lucide-react";
import { useState } from "react";
import { useCategories } from "../../context/CategoriesContext";

const periodTypes = [
  { value: "daily", label: "Hàng ngày" },
  { value: "weekly", label: "Hàng tuần" },
  { value: "monthly", label: "Hàng tháng" },
  { value: "yearly", label: "Hàng năm" },
];

export function AddBudgetModal({ isOpen, onClose, onAdd }) {
  const { expenseCategories } = useCategories();

  // States
  const [title, setTitle] = useState("");
  const [catId, setCatId] = useState("");
  const [autoBudget, setAutoBudget] = useState("none");
  const [currency, setCurrency] = useState("VND");
  const [amount, setAmount] = useState("");
  const [periodType, setPeriodType] = useState("monthly");
  const [startDate, setStartDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [endDate, setEndDate] = useState("");
  const [returnHere, setReturnHere] = useState(false);
  const [file, setFile] = useState(null);

  if (!isOpen) return null;

  const resetForm = () => {
    setTitle("");
    setCatId("");
    setAmount("");
    setPeriodType("monthly");
    setStartDate(new Date().toISOString().slice(0, 10));
    setEndDate("");
    setAutoBudget("none");
    setCurrency("VND");
    setFile(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title) return;

    const selected = expenseCategories.find((c) => c.id === catId) || null;
    const finalAmount = amount ? parseFloat(amount) : 0;

    onAdd({
      title,
      targetAmount: finalAmount,
      periodType,
      startDate: startDate
        ? new Date(startDate).toISOString()
        : new Date().toISOString(),
      endDate: endDate ? new Date(endDate).toISOString() : null,
      iconName: selected?.iconName || "Coffee",
      color: selected?.color || "orange",
      // Optional extra data that could be handled by backend
      currency,
      autoBudget,
    });

    if (returnHere) {
      resetForm();
    } else {
      handleClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      onClick={handleClose}
    >
      <div
        className="bg-muted rounded-xl w-full max-w-full sm:max-w-5xl max-h-[95vh] overflow-y-auto shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 bg-card border-b border-border sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
              <span className="text-purple-600 font-bold">B</span>
            </div>
            <h2 className="text-xl font-bold text-foreground">
              Ngân sách{" "}
              <span className="text-muted-foreground font-normal text-sm ml-2">
                Tạo ngân sách mới
              </span>
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="text-muted-foreground hover:text-foreground bg-muted hover:bg-muted rounded-full p-1.5 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* LEFT COLUMN */}
            <div className="space-y-6">
              {/* Mandatory fields */}
              <div className="bg-card border border-border rounded-lg overflow-hidden shadow-sm">
                <div className="px-4 py-3 border-b border-border bg-muted/50">
                  <h3 className="font-semibold text-foreground">
                    Trường bắt buộc
                  </h3>
                </div>
                <div className="p-4 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                    <label className="sm:w-1/3 text-sm font-medium text-muted-foreground sm:text-right">
                      Tên ngân sách <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="flex-1 px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
                      placeholder="Tên ngân sách"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Options */}
              <div className="bg-card border border-border rounded-lg overflow-hidden shadow-sm flex flex-col h-[calc(100%-10rem)] min-h-[200px]">
                <div className="px-4 py-3 border-b border-border bg-muted/50">
                  <h3 className="font-semibold text-foreground">Tùy chọn</h3>
                </div>
                <div className="p-4 flex-1 flex flex-col">
                  <div className="flex items-start gap-4 mb-auto">
                    <label className="sm:w-1/3 text-sm font-medium text-muted-foreground sm:text-right pt-1">
                      Tiếp tục thêm
                    </label>
                    <div className="flex-1 flex items-start gap-2 pt-1">
                      <input
                        type="checkbox"
                        id="returnHere"
                        checked={returnHere}
                        onChange={(e) => setReturnHere(e.target.checked)}
                        className="mt-1 rounded text-purple-600 focus:ring-purple-500"
                      />
                      <label
                        htmlFor="returnHere"
                        className="text-sm text-muted-foreground"
                      >
                        Sau khi lưu, quay lại đây để tạo tiếp
                      </label>
                    </div>
                  </div>

                  <div className="flex justify-end mt-8 pt-4 border-t border-border">
                    <button
                      type="submit"
                      className="px-6 py-2.5 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-medium shadow-sm flex items-center gap-2"
                    >
                      Lưu ngân sách mới
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN */}
            <div className="space-y-6">
              {/* Optional fields */}
              <div className="bg-card border border-border rounded-lg overflow-hidden shadow-sm">
                <div className="px-4 py-3 border-b border-border bg-muted/50">
                  <h3 className="font-semibold text-foreground">
                    Trường tùy chọn
                  </h3>
                </div>
                <div className="p-4 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                    <label className="sm:w-1/3 text-sm font-medium text-muted-foreground sm:text-right">
                      Tự động cấp ngân sách
                    </label>
                    <div className="flex-1">
                      <select
                        value={autoBudget}
                        onChange={(e) => setAutoBudget(e.target.value)}
                        className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                      >
                        <option value="none">Không tự động</option>
                        <option value="fixed">Số tiền cố định</option>
                      </select>
                      <p className="text-xs text-muted-foreground mt-1">
                        Tính năng tự động thêm ngân sách theo chu kỳ.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                    <label className="sm:w-1/3 text-sm font-medium text-muted-foreground sm:text-right">
                      Tiền tệ
                    </label>
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="flex-1 px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                    >
                      <option value="VND">Việt Nam Đồng (VND)</option>
                      <option value="EUR">Euro (€)</option>
                      <option value="USD">US Dollar ($)</option>
                    </select>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                    <label className="sm:w-1/3 text-sm font-medium text-muted-foreground sm:text-right">
                      Số tiền
                    </label>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="flex-1 px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                      placeholder="0"
                      step="1"
                      min="0"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                    <label className="sm:w-1/3 text-sm font-medium text-muted-foreground sm:text-right">
                      Chu kỳ
                    </label>
                    <select
                      value={periodType}
                      onChange={(e) => setPeriodType(e.target.value)}
                      className="flex-1 px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                    >
                      {periodTypes.map((p) => (
                        <option key={p.value} value={p.value}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                    <label className="sm:w-1/3 text-sm font-medium text-muted-foreground sm:text-right">
                      Danh mục
                    </label>
                    <select
                      value={catId}
                      onChange={(e) => {
                        setCatId(e.target.value);
                        if (e.target.value && !title) {
                          const cat = expenseCategories.find(
                            (c) => c.id === e.target.value,
                          );
                          if (cat) setTitle(cat.name);
                        }
                      }}
                      className="flex-1 px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                    >
                      <option value="">Chọn danh mục</option>
                      {expenseCategories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                    <label className="sm:w-1/3 text-sm font-medium text-muted-foreground sm:text-right">
                      Ngày bắt đầu
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="flex-1 px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                    <label className="sm:w-1/3 text-sm font-medium text-muted-foreground sm:text-right">
                      Ngày kết thúc
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      min={startDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="flex-1 px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4 pt-2">
                    <label className="sm:w-1/3 text-sm font-medium text-muted-foreground sm:text-right pt-2">
                      Tệp đính kèm
                    </label>
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <label className="cursor-pointer bg-muted hover:bg-muted text-foreground px-3 py-1.5 rounded text-sm font-medium transition-colors">
                          Chọn tệp
                          <input
                            type="file"
                            className="hidden"
                            onChange={(e) => setFile(e.target.files[0])}
                          />
                        </label>
                        <span className="text-sm text-muted-foreground">
                          {file ? file.name : "Chưa chọn tệp"}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Kích thước tối đa: 2 MB
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
