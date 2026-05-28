import { Plus, FileText, Pencil, Trash2, ArrowDownRight, Search, TrendingDown, CheckCircle2 } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { walletApi } from "../../../api/walletApi";
import { useSettings } from "../../../context/SettingsContext";
import { AccountFormModal } from "../../../components/AccountFormModal";
import { toast } from "sonner";

export function Liabilities() {
  const { fmt } = useSettings();
  const [accounts,   setAccounts]   = useState([]);
  const [isLoading,  setIsLoading]  = useState(true);
  const [search,     setSearch]     = useState('');
  const [showModal,  setShowModal]  = useState(false);
  const [editingAcc, setEditingAcc] = useState(null);

  const fetchAccounts = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await walletApi.getByType(2);
      setAccounts(data.items || data || []);
    } catch {
      setAccounts([
        { accountId: 1, name: 'Vay mua xe',        balance: -250000000, color: 'slate', gradientFrom: '#64748b', gradientTo: '#334155', initialBalance: -300000000 },
        { accountId: 2, name: 'Nợ thẻ tín dụng',  balance: -15000000,  color: 'red',   gradientFrom: '#ef4444', gradientTo: '#b91c1c',  initialBalance: -15000000  },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchAccounts(); }, [fetchAccounts]);

  const handleAdd = async (data) => {
    try {
      await walletApi.create(data);
      await fetchAccounts();
      toast.success(`Đã thêm khoản nợ "${data.name}"`);
      setShowModal(false);
    } catch {
      toast.error('Không thể thêm khoản nợ');
    }
  };

  const handleEdit = async (data) => {
    try {
      await walletApi.update(editingAcc.accountId, data);
      await fetchAccounts();
      toast.success(`Đã cập nhật "${data.name}"`);
      setEditingAcc(null);
    } catch {
      toast.error('Không thể cập nhật khoản nợ');
    }
  };

  const handleDelete = async (acc) => {
    if (!window.confirm(`Xóa khoản nợ "${acc.name}"? Lịch sử giao dịch liên quan sẽ không bị xóa.`)) return;
    try {
      await walletApi.delete(acc.accountId);
      await fetchAccounts();
      toast.success(`Đã xóa "${acc.name}"`);
    } catch {
      toast.error('Không thể xóa khoản nợ');
    }
  };

  const closeModal = () => { setShowModal(false); setEditingAcc(null); };

  const totalLiabilities = accounts.reduce((s, a) => s + (a.balance || 0), 0);
  const filtered = accounts.filter(a => a.name.toLowerCase().includes(search.toLowerCase()));

  // Progress: how much has been repaid (balance goes from initialBalance → 0)
  const repayProgress = (acc) => {
    if (!acc.initialBalance || acc.initialBalance === 0) return 0;
    return Math.min(100, Math.max(0, (1 - acc.balance / acc.initialBalance) * 100));
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Nợ phải trả</h1>
          <p className="text-slate-500 mt-1">Quản lý các khoản vay, trả góp và nợ tín dụng</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors shadow-sm"
        >
          <Plus size={18} />
          <span className="font-medium">Thêm khoản nợ</span>
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-center">
          <p className="text-slate-500 text-sm font-medium mb-1">Tổng dư nợ</p>
          <div className="flex items-center gap-2">
            <TrendingDown size={24} className="text-red-500" />
            <p className="text-3xl font-bold text-slate-900">{fmt(Math.abs(totalLiabilities))}</p>
          </div>
          <p className="text-slate-400 text-xs mt-1">{accounts.length} khoản nợ</p>
        </div>
        <div className="md:col-span-2 bg-gradient-to-br from-slate-700 to-slate-900 rounded-2xl p-6 text-white shadow-sm relative overflow-hidden flex items-center">
          <div className="absolute top-0 right-0 w-48 h-48 bg-white opacity-5 rounded-full -mr-16 -mt-16 pointer-events-none" />
          <FileText size={48} className="opacity-80 mr-6 text-slate-400 flex-shrink-0" />
          <div>
            <h3 className="text-xl font-bold mb-1">Thanh toán đúng hạn</h3>
            <p className="text-slate-300 text-sm max-w-md">Lên kế hoạch trả nợ định kỳ để giảm thiểu lãi suất và cải thiện điểm tín dụng của bạn.</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="flex gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm kiếm khoản nợ..."
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
      </div>

      {/* Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2].map(i => <div key={i} className="h-48 bg-slate-200 animate-pulse rounded-2xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-2xl border border-slate-200">
          <CheckCircle2 size={48} className="mx-auto text-green-500 mb-3" />
          <p className="text-slate-900 font-bold text-lg mb-1">Tài chính lành mạnh</p>
          <p className="text-slate-500 font-medium">
            {search ? 'Không tìm thấy khoản nợ phù hợp' : 'Tuyệt vời, bạn không có khoản nợ nào!'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filtered.map(acc => {
            const progress = repayProgress(acc);
            return (
              <div
                key={acc.accountId}
                className="relative overflow-hidden rounded-2xl p-6 text-white group shadow-sm"
                style={{ background: `linear-gradient(135deg, ${acc.gradientFrom} 0%, ${acc.gradientTo} 100%)` }}
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full -mr-10 -mt-10" />

                <div className="flex justify-between items-start mb-6">
                  <div>
                    <p className="text-white/70 text-xs uppercase tracking-wider mb-1 font-medium">Khoản vay / Nợ</p>
                    <h3 className="text-xl font-bold leading-tight">{acc.name}</h3>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => setEditingAcc(acc)}
                      className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                      title="Sửa"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(acc)}
                      className="p-1.5 hover:bg-red-500/60 rounded-lg transition-colors"
                      title="Xóa"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div className="mb-4">
                  <p className="text-white/70 text-xs mb-1">Dư nợ còn lại</p>
                  <div className="flex items-center gap-2">
                    <ArrowDownRight size={24} className="text-red-300" />
                    <p className="text-3xl font-bold tracking-tight">{fmt(Math.abs(acc.balance))}</p>
                  </div>
                </div>

                {acc.initialBalance && (
                  <div>
                    <div className="flex justify-between text-xs text-white/80 mb-1.5">
                      <span>Tiến độ trả nợ</span>
                      <span>{progress.toFixed(0)}%</span>
                    </div>
                    <div className="w-full bg-black/20 rounded-full h-2">
                      <div
                        className="bg-white/90 h-2 rounded-full transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-white/60 mt-1.5">
                      <span>0</span>
                      <span>{fmt(Math.abs(acc.initialBalance))}</span>
                    </div>
                  </div>
                )}

                {acc.notes && (
                  <p className="mt-3 text-white/60 text-xs line-clamp-1">{acc.notes}</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      <AccountFormModal
        isOpen={showModal}
        onClose={closeModal}
        onSubmit={handleAdd}
        account={null}
        typeId={2}
      />
      {editingAcc && (
        <AccountFormModal
          isOpen={true}
          onClose={closeModal}
          onSubmit={handleEdit}
          account={editingAcc}
          typeId={2}
        />
      )}
    </div>
  );
}
