import { Plus, CreditCard, Pencil, Trash2, ArrowDownRight, Search } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { walletApi } from "../../../api/walletApi";
import { useSettings } from "../../../context/SettingsContext";
import { AccountFormModal } from "../../../components/modals/AccountFormModal";
import { toast } from "sonner";

export function ExpenseAccounts() {
  const { fmt } = useSettings();
  const [accounts,    setAccounts]    = useState([]);
  const [isLoading,   setIsLoading]   = useState(true);
  const [search,      setSearch]      = useState('');
  const [showModal,   setShowModal]   = useState(false);
  const [editingAcc,  setEditingAcc]  = useState(null);

  const fetchAccounts = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await walletApi.getByType(5);
      setAccounts(data.items || data || []);
    } catch {
      setAccounts([
        { accountId: 1, name: 'Thẻ tín dụng VIB',  balance: 15000000, color: 'orange', gradientFrom: '#f97316', gradientTo: '#c2410c', cardNumber: '**** 1234' },
        { accountId: 2, name: 'Ví ShopeePay',       balance: 500000,   color: 'pink',   gradientFrom: '#ec4899', gradientTo: '#be185d' },
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
      toast.success(`Đã thêm "${data.name}"`);
      setShowModal(false);
    } catch {
      toast.error('Không thể thêm tài khoản');
    }
  };

  const handleEdit = async (data) => {
    try {
      await walletApi.update(editingAcc.accountId, data);
      await fetchAccounts();
      toast.success(`Đã cập nhật "${data.name}"`);
      setEditingAcc(null);
    } catch {
      toast.error('Không thể cập nhật tài khoản');
    }
  };

  const handleDelete = async (acc) => {
    if (!window.confirm(`Xóa tài khoản "${acc.name}"? Hành động này không thể hoàn tác.`)) return;
    try {
      await walletApi.delete(acc.accountId);
      await fetchAccounts();
      toast.success(`Đã xóa "${acc.name}"`);
    } catch {
      toast.error('Không thể xóa tài khoản');
    }
  };

  const openEdit = (acc) => setEditingAcc(acc);
  const closeModal = () => { setShowModal(false); setEditingAcc(null); };

  const totalExpense = accounts.reduce((s, a) => s + (a.balance || 0), 0);
  const filtered = accounts.filter(a => a.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Tài khoản chi</h1>
          <p className="text-slate-500 mt-1">Các tài khoản chỉ dùng để chi tiêu (thẻ tín dụng, ví điện tử)</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors shadow-sm"
        >
          <Plus size={18} />
          <span className="font-medium">Thêm tài khoản</span>
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-center">
          <p className="text-slate-500 text-sm font-medium mb-1">Tổng dư nợ chi tiêu</p>
          <p className="text-3xl font-bold text-slate-900">{fmt(totalExpense)}</p>
          <p className="text-slate-400 text-xs mt-1">{accounts.length} tài khoản</p>
        </div>
        <div className="md:col-span-2 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl p-6 text-white shadow-sm relative overflow-hidden flex items-center">
          <div className="absolute top-0 right-0 w-48 h-48 bg-white opacity-10 rounded-full -mr-16 -mt-16 pointer-events-none" />
          <CreditCard size={48} className="opacity-80 mr-6 flex-shrink-0" />
          <div>
            <h3 className="text-xl font-bold mb-1">Kiểm soát chi tiêu</h3>
            <p className="text-orange-100 text-sm max-w-md">Theo dõi sát sao các tài khoản tín dụng và ví điện tử để tránh chi tiêu vượt mức giới hạn.</p>
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
            placeholder="Tìm kiếm tài khoản chi..."
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
      </div>

      {/* Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => <div key={i} className="h-40 bg-slate-200 animate-pulse rounded-2xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-2xl border border-slate-200">
          <CreditCard size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium">
            {search ? 'Không tìm thấy tài khoản phù hợp' : 'Chưa có tài khoản chi nào'}
          </p>
          {!search && <p className="text-slate-400 text-sm mt-1">Nhấn "Thêm tài khoản" để bắt đầu</p>}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(acc => (
            <div
              key={acc.accountId}
              className="relative overflow-hidden rounded-2xl p-6 text-white group shadow-sm"
              style={{ background: `linear-gradient(135deg, ${acc.gradientFrom} 0%, ${acc.gradientTo} 100%)` }}
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-white opacity-10 rounded-full -mr-10 -mt-10" />

              <div className="flex justify-between items-start mb-6">
                <div>
                  <p className="text-white/70 text-xs uppercase tracking-wider mb-1 font-medium">Credit / E-Wallet</p>
                  <h3 className="text-lg font-bold leading-tight">{acc.name}</h3>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => openEdit(acc)}
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

              <div>
                <p className="text-white/70 text-xs mb-1">Dư nợ / Đã chi</p>
                <p className="text-3xl font-bold tracking-tight">{fmt(acc.balance)}</p>
              </div>

              {acc.cardNumber && (
                <div className="mt-4 flex items-center justify-between">
                  <span className="font-mono text-white/80 tracking-widest text-sm">{acc.cardNumber}</span>
                  <ArrowDownRight size={16} className="text-white/60" />
                </div>
              )}

              {acc.notes && (
                <p className="mt-3 text-white/60 text-xs line-clamp-1">{acc.notes}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      <AccountFormModal
        isOpen={showModal}
        onClose={closeModal}
        onSubmit={handleAdd}
        account={null}
        typeId={5}
      />
      {editingAcc && (
        <AccountFormModal
          isOpen={true}
          onClose={closeModal}
          onSubmit={handleEdit}
          account={editingAcc}
          typeId={5}
        />
      )}
    </div>
  );
}
