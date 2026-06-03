import { X, PiggyBank, Landmark } from "lucide-react";
import { useState, useEffect } from "react";
import { walletApi } from "../../api/walletApi";
import { useSettings } from "../../context/SettingsContext";
import { formatVND, parseVND } from "../../utils/formatMoney";
import { splitTitle, joinTitle } from "../../utils/savingsGroup";

export function PiggyBankFormModal({
  isOpen,
  onClose,
  onSave,
  goal = null,
  presetGroup = "",
  presetAccountId = null,
  presetColor = null,
  presetCurrency = null,
}) {
  const { fmt, currencies, currency } = useSettings();
  const isEdit = !!goal;

  const [accounts, setAccounts] = useState([]);

  // Mandatory
  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [selectedCurrency, setSelectedCurrency] = useState("");
  const [selectedAccounts, setSelectedAccounts] = useState([]);

  // Optional
  const [targetDate, setTargetDate] = useState("");
  const [notes, setNotes] = useState("");
  const [objectGroup, setObjectGroup] = useState("");
  const [monthly, setMonthly] = useState("");

  const [returnHere, setReturnHere] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    walletApi
      .getByType(1)
      .then((data) => setAccounts(data.items || data || []))
      .catch(() => {});
    if (goal) {
      // The parent group is encoded into the stored title ("<group> :: <sub>").
      // Split it so the user edits the sub-goal name and group separately.
      const { group, name: subName, standalone } = splitTitle(goal.title ?? "");
      setName(subName);
      setTargetAmount(String(goal.targetAmount ?? ""));
      setSelectedCurrency(goal.currency ?? currency);
      setSelectedAccounts(goal.accountId ? [String(goal.accountId)] : []);
      setTargetDate(goal.targetDate ?? "");
      setNotes(goal.notes ?? "");
      setObjectGroup(standalone ? "" : group);
      setMonthly(String(goal.savePerMonth ?? ""));
    } else {
      setName("");
      setTargetAmount("");
      setSelectedCurrency(presetCurrency || currency);
      setSelectedAccounts(presetAccountId ? [String(presetAccountId)] : []);
      setTargetDate("");
      setNotes("");
      setObjectGroup(presetGroup || "");
      setMonthly("");
      setReturnHere(false);
    }
  }, [isOpen, goal, currency, presetGroup, presetAccountId, presetCurrency]);

  if (!isOpen) return null;

  // A goal links to exactly one savings account. The link can't change after
  // creation (backend ignores AccountId on update), and a sub-goal added to a
  // group must stay on the group's account — so lock the picker in those cases.
  const accountLocked = isEdit || !!presetGroup;

  const canSubmit = name.trim() && targetAmount && selectedAccounts.length > 0;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    const group = objectGroup.trim();
    onSave({
      accountId: parseInt(selectedAccounts[0]) || (goal?.accountId ?? 0),
      // Re-encode the parent group into the title so grouping survives a round-trip.
      title: joinTitle(group, name.trim()),
      targetAmount: parseFloat(targetAmount),
      monthlyContribution: parseFloat(monthly) || 0,
      targetDate: targetDate || null,
      notes: notes.trim() || null,
      currency: selectedCurrency,
      objectGroup: group || null,
      iconName: goal?.iconName || "PiggyBank",
      color: goal?.color || presetColor || "green",
      returnHere,
    });
    if (returnHere && !isEdit) {
      setName("");
      setTargetAmount("");
      setNotes("");
      setSelectedAccounts([]);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-2xl w-full max-w-full sm:max-w-6xl max-h-[95vh] overflow-hidden flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-card sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center">
              <PiggyBank className="text-green-600" size={20} />
            </div>
            <h2 className="text-xl font-bold text-foreground">
              Lợn tiết kiệm
              <span className="text-sm font-normal text-muted-foreground ml-2">
                {isEdit ? "Sửa" : "Tạo mới"}
              </span>
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <form id="piggybank-form" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Mandatory Fields */}
              <div className="bg-card border border-border rounded-lg overflow-hidden shadow-sm">
                <div className="px-4 py-3 border-b border-border bg-muted/50">
                  <h3 className="font-semibold text-foreground">
                    Trường bắt buộc
                  </h3>
                </div>
                <div className="p-4 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                    <label className="sm:w-36 text-sm font-medium text-muted-foreground sm:text-right shrink-0">
                      Tên <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="flex-1 px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="Tên mục tiêu"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                    <label className="sm:w-36 text-sm font-medium text-muted-foreground sm:text-right shrink-0">
                      Số tiền mục tiêu <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formatVND(targetAmount)}
                      onChange={(e) => {
                        setTargetAmount(parseVND(e.target.value));
                      }}
                      required
                      min="1"
                      step="1"
                      className="flex-1 px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4">
                    <label className="sm:w-36 text-sm font-medium text-muted-foreground sm:text-right shrink-0 mt-2">
                      Tiền tệ
                    </label>
                    <div className="flex-1">
                      <select
                        value={selectedCurrency}
                        onChange={(e) => setSelectedCurrency(e.target.value)}
                        className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-card"
                      >
                        {currencies?.map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.name} ({c.symbol})
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-muted-foreground mt-1">
                        Lợn tiết kiệm chỉ nhận một loại tiền tệ.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4">
                    <label className="sm:w-36 text-sm font-medium text-muted-foreground sm:text-right shrink-0 mt-2">
                      Tài khoản tiết kiệm <span className="text-red-500">*</span>
                    </label>
                    <div className="flex-1">
                      <select
                        value={selectedAccounts[0] ?? ""}
                        onChange={(e) => setSelectedAccounts(e.target.value ? [e.target.value] : [])}
                        required
                        disabled={accountLocked}
                        className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-card disabled:opacity-70 disabled:cursor-not-allowed"
                      >
                        <option value="">Chọn tài khoản</option>
                        {accounts.map((a) => (
                          <option key={a.accountId} value={a.accountId}>
                            {a.name}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-muted-foreground mt-1">
                        {accountLocked
                          ? "Mỗi mục tiêu liên kết cố định với một tài khoản tiết kiệm — không thể đổi sau khi tạo."
                          : "Chỉ chấp nhận tài khoản cùng loại tiền tệ."}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Optional Fields */}
              <div className="bg-card border border-border rounded-lg overflow-hidden shadow-sm">
                <div className="px-4 py-3 border-b border-border bg-muted/50">
                  <h3 className="font-semibold text-foreground">
                    Trường tùy chọn
                  </h3>
                </div>
                <div className="p-4 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                    <label className="sm:w-32 text-sm font-medium text-muted-foreground sm:text-right shrink-0">
                      Ngày mục tiêu
                    </label>
                    <input
                      type="date"
                      value={targetDate}
                      onChange={(e) => setTargetDate(e.target.value)}
                      className="flex-1 px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4">
                    <label className="sm:w-32 text-sm font-medium text-muted-foreground sm:text-right shrink-0 mt-2">
                      Ghi chú
                    </label>
                    <div className="flex-1">
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={4}
                        className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-y"
                        placeholder="Ghi chú"
                      ></textarea>
                      <p className="text-xs text-muted-foreground mt-1">
                        Hỗ trợ{" "}
                        <a href="#" className="text-purple-600 hover:underline">
                          Markdown
                        </a>
                        .
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4">
                    <label className="sm:w-32 text-sm font-medium text-muted-foreground sm:text-right shrink-0 mt-2">
                      Tệp đính kèm
                    </label>
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <label className="cursor-pointer bg-muted hover:bg-muted text-foreground px-3 py-1.5 rounded-lg text-sm font-medium transition-colors">
                          Chọn tệp
                          <input type="file" className="hidden" />
                        </label>
                        <span className="text-sm text-muted-foreground">
                          Chưa chọn tệp
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Kích thước tối đa: 2 MB
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                    <label className="sm:w-32 text-sm font-medium text-muted-foreground sm:text-right shrink-0 mt-2">
                      Mục tiêu chung
                    </label>
                    <div className="flex-1">
                      <input
                        type="text"
                        value={objectGroup}
                        onChange={(e) => setObjectGroup(e.target.value)}
                        className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="VD: Mua xe cho gia đình"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Để trống nếu đây là mục tiêu độc lập. Các mục tiêu cùng "mục tiêu chung" sẽ được gom nhóm.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 hidden">
                    <label className="sm:w-32 text-sm font-medium text-muted-foreground sm:text-right shrink-0">
                      Tiết kiệm hàng tháng
                    </label>
                    <input
                      type="number"
                      value={monthly}
                      onChange={(e) => setMonthly(e.target.value)}
                      min="0"
                      step="1"
                      className="flex-1 px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Options + Submit */}
            <div className="mt-6 bg-card border border-border rounded-lg overflow-hidden shadow-sm">
              <div className="px-4 py-3 border-b border-border bg-muted/50">
                <h3 className="font-semibold text-foreground">Tùy chọn</h3>
              </div>
              <div className="p-4">
                <div className="flex items-center gap-4">
                  <label className="sm:w-36 text-sm font-medium text-muted-foreground sm:text-right shrink-0">
                    Quay lại đây
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={returnHere}
                      onChange={(e) => setReturnHere(e.target.checked)}
                      className="rounded border-border text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-sm text-muted-foreground">
                      Sau khi lưu, quay lại để tạo tiếp.
                    </span>
                  </label>
                </div>
                <div className="mt-4 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-5 py-2.5 border border-border text-foreground rounded-lg hover:bg-muted transition-colors font-semibold text-sm"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={!canSubmit}
                    form="piggybank-form"
                    className="px-5 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold text-sm disabled:opacity-50"
                  >
                    {isEdit ? "Cập nhật" : "Lưu mới"}
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
