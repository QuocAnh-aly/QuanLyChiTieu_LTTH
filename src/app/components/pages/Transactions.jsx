import { useState, useEffect } from "react";
import { ArrowUpRight, ArrowDownRight, ArrowLeftRight, Search, Filter, Plus, Trash2, Pencil } from "lucide-react";
import { transactionApi } from "../../api/transactionApi";
import { toast } from "sonner";
import { format } from "date-fns";
import { AddTransactionModal } from "../AddTransactionModal";
import { EditTransactionModal } from "../EditTransactionModal";

// typeId: 1=Assets, 2=Liabilities, 3=Equity, 4=Revenue, 5=Expense
function mapTransaction(t) {
  const details = t.details || [];

  const expenseDetail = details.find(d => d.typeId === 5 && d.debit > 0);
  const revenueDetail = details.find(d => d.typeId === 4 && d.credit > 0);
  const isTransfer    = !expenseDetail && !revenueDetail;
  const isIncome      = !!revenueDetail;

  let categoryName = "Chưa phân loại";
  if (expenseDetail)   categoryName = expenseDetail.accountName  || "Chi tiêu";
  else if (revenueDetail) categoryName = revenueDetail.accountName || "Thu nhập";
  else if (isTransfer) categoryName = "Chuyển khoản";

  return { ...t, categoryName, isIncome, isTransfer };
}

export function Transactions() {
  const [transactions,   setTransactions]   = useState([]);
  const [isLoading,      setIsLoading]      = useState(true);
  const [searchTerm,     setSearchTerm]     = useState("");
  const [filterType,     setFilterType]     = useState("all"); // all | income | expense | transfer
  const [page,           setPage]           = useState(1);
  const [totalCount,     setTotalCount]     = useState(0);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editTarget,     setEditTarget]     = useState(null);  // transaction being edited
  const PAGE_SIZE = 20;

  useEffect(() => {
    fetchTransactions(page);
  }, [page]);

  const fetchTransactions = async (p = 1) => {
    try {
      setIsLoading(true);
      const data  = await transactionApi.getAll({ page: p, pageSize: PAGE_SIZE });
      const items = (data.items || data || []).map(mapTransaction);
      setTransactions(items);
      setTotalCount(data.totalCount ?? data.total ?? items.length);
    } catch {
      toast.error("Không thể tải danh sách giao dịch");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddTransaction = async (data) => {
    try {
      await transactionApi.create(data);
      await fetchTransactions(1);
      setPage(1);
      toast.success("Đã thêm giao dịch!");
    } catch {
      toast.error("Không thể thêm giao dịch");
    }
  };

  const handleSaveEdit = async (data) => {
    if (!editTarget) return;
    try {
      await transactionApi.update(editTarget.journalId, data);
      setEditTarget(null);
      await fetchTransactions(page);
      toast.success("Đã cập nhật giao dịch!");
    } catch {
      toast.error("Không thể cập nhật giao dịch");
    }
  };

  const handleDelete = async (id, description) => {
    if (!window.confirm(`Xóa giao dịch "${description}"?`)) return;
    try {
      await transactionApi.delete(id);
      await fetchTransactions(page);
      toast.success("Đã xóa giao dịch.");
    } catch {
      toast.error("Không thể xóa giao dịch");
    }
  };

  const filtered = transactions.filter((t) => {
    const matchSearch =
      t.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.categoryName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchType =
      filterType === "all" ||
      (filterType === "income"   && t.isIncome)   ||
      (filterType === "transfer" && t.isTransfer)  ||
      (filterType === "expense"  && !t.isIncome && !t.isTransfer);
    return matchSearch && matchType;
  });

  const totalIncome  = transactions.filter(t => t.isIncome).reduce((s, t) => s + t.totalAmount, 0);
  const totalExpense = transactions.filter(t => !t.isIncome && !t.isTransfer).reduce((s, t) => s + t.totalAmount, 0);
  const totalPages   = Math.ceil(totalCount / PAGE_SIZE);

  const txIcon = (t) => {
    if (t.isTransfer) return <ArrowLeftRight size={16} className="text-blue-500" />;
    if (t.isIncome)   return <ArrowUpRight   size={16} className="text-green-600" />;
    return                   <ArrowDownRight size={16} className="text-red-500" />;
  };

  const txBg = (t) => {
    if (t.isTransfer) return "bg-blue-50";
    if (t.isIncome)   return "bg-green-100";
    return                   "bg-red-50";
  };

  const amountDisplay = (t) => {
    if (t.isTransfer) return <span className="text-blue-600">${t.totalAmount.toLocaleString()}</span>;
    if (t.isIncome)   return <span className="text-green-600">+${t.totalAmount.toLocaleString()}</span>;
    return                   <span className="text-slate-900">-${t.totalAmount.toLocaleString()}</span>;
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Giao Dịch</h1>
          <p className="text-slate-500 mt-1">Lịch sử tất cả hoạt động tài chính</p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          <Plus size={18} />
          <span>Thêm Giao Dịch</span>
        </button>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 border border-slate-200 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
            <ArrowUpRight size={18} className="text-green-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500">Thu nhập (trang này)</p>
            <p className="font-bold text-green-600">${totalIncome.toLocaleString()}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
            <ArrowDownRight size={18} className="text-red-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500">Chi tiêu (trang này)</p>
            <p className="font-bold text-slate-900">${totalExpense.toLocaleString()}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
            <Filter size={18} className="text-purple-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500">Tổng số giao dịch</p>
            <p className="font-bold text-slate-900">{totalCount}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {/* Filters */}
        <div className="p-4 border-b border-slate-200 flex flex-wrap gap-3 items-center bg-slate-50/50">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
              placeholder="Tìm kiếm giao dịch..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-1 bg-white border border-slate-200 rounded-lg p-1">
            {[
              { key: "all",      label: "Tất cả" },
              { key: "income",   label: "Thu nhập" },
              { key: "expense",  label: "Chi tiêu" },
              { key: "transfer", label: "Chuyển khoản" },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilterType(key)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  filterType === key
                    ? "bg-purple-600 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-sm uppercase tracking-wider border-b border-slate-200">
                <th className="px-6 py-4 font-semibold">Mô tả</th>
                <th className="px-6 py-4 font-semibold">Danh mục</th>
                <th className="px-6 py-4 font-semibold">Ngày</th>
                <th className="px-6 py-4 font-semibold text-right">Số tiền</th>
                <th className="px-6 py-4 font-semibold w-20"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 5 }).map((_, j) => (
                      <td key={j} className="px-6 py-4">
                        <div className="h-4 bg-slate-200 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-slate-400">
                    Không tìm thấy giao dịch
                  </td>
                </tr>
              ) : (
                filtered.map((t) => (
                  <tr key={t.journalId} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${txBg(t)}`}>
                          {txIcon(t)}
                        </div>
                        <span className="font-medium text-slate-900">{t.description || "—"}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-medium">
                        {t.categoryName}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500 text-sm">
                      {t.transactionDate ? format(new Date(t.transactionDate), "dd/MM/yyyy") : "—"}
                    </td>
                    <td className="px-6 py-4 text-right font-bold">
                      {amountDisplay(t)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        <button
                          onClick={() => setEditTarget(t)}
                          className="p-1.5 rounded hover:bg-purple-50 text-slate-400 hover:text-purple-600 transition-colors"
                          title="Sửa"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(t.journalId, t.description)}
                          className="p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                          title="Xóa"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between">
            <p className="text-sm text-slate-500">
              Trang {page} / {totalPages} ({totalCount} giao dịch)
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Trước
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Tiếp
              </button>
            </div>
          </div>
        )}
      </div>

      <AddTransactionModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddTransaction}
      />

      <EditTransactionModal
        isOpen={!!editTarget}
        onClose={() => setEditTarget(null)}
        onSave={handleSaveEdit}
        transaction={editTarget}
      />
    </div>
  );
}
