import { Plus, Landmark, Pencil, Trash2, ArrowUpRight, Search, Briefcase } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { walletApi } from "../../../api/walletApi";
import { useSettings } from "../../../context/SettingsContext";
import { AccountFormModal } from "../../../components/modals/AccountFormModal";
import { toast } from "sonner";

export function RevenueAccounts() {
  const { fmt } = useSettings();
  const [accounts,   setAccounts]   = useState([]);
  const [isLoading,  setIsLoading]  = useState(true);
  const [search,     setSearch]     = useState('');
  const [showModal,  setShowModal]  = useState(false);
  const [editingAcc, setEditingAcc] = useState(null);

  const fetchAccounts = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await walletApi.getByType(4);
      setAccounts(data.items || data || []);
    } catch {
      setAccounts([
        { accountId: 1, name: 'Lương công ty ABC',       balance: 25000000, color: 'emerald', gradientFrom: '#10b981', gradientTo: '#047857' },
        { accountId: 2, name: 'Cho thuê bất động sản',   balance: 12000000, color: 'blue',    gradientFrom: '#3b82f6', gradientTo: '#1d4ed8' },
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
      toast.error('Không thể thêm nguồn thu');
    }
  };

  const handleEdit = async (data) => {
    try {
      await walletApi.update(editingAcc.accountId, data);
      await fetchAccounts();
      toast.success(`Đã cập nhật "${data.name}"`);
      setEditingAcc(null);
    } catch {
      toast.error('Không thể cập nhật nguồn thu');
    }
  };

  const handleDelete = async (acc) => {
    if (!window.confirm(`Xóa nguồn thu "${acc.name}"?`)) return;
    try {
      await walletApi.delete(acc.accountId);
      await fetchAccounts();
      toast.success(`Đã xóa "${acc.name}"`);
    } catch {
      toast.error('Không thể xóa nguồn thu');
    }
  };

  const closeModal = () => { setShowModal(false); setEditingAcc(null); };

  const totalRevenue = accounts.reduce((s, a) => s + (a.balance || 0), 0);
  const filtered = accounts.filter(a => a.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Tài khoản thu</h1>
          <p className="text-slate-500 mt-1">Quản lý các nguồn thu nhập của bạn</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors shadow-sm"
        >
          <Plus size={18} />
          <span className="font-medium">Thêm nguồn thu</span>
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="md:col-span-2 bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl p-6 text-white shadow-sm relative overflow-hidden flex items-center">
          <div className="absolute top-0 right-0 w-48 h-48 bg-white opacity-10 rounded-full -mr-16 -mt-16 pointer-events-none" />
          <Briefcase size={48} className="opacity-80 mr-6 flex-shrink-0" />
          <div>
            <h3 className="text-xl font-bold mb-1">Đa dạng hóa thu nhập</h3>
            <p className="text-emerald-100 text-sm max-w-md">Theo dõi các nguồn thu từ lương, kinh doanh, và đầu tư để đánh giá hiệu quả tài chính.</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-center">
          <p className="text-slate-500 text-sm font-medium mb-1">Tổng thu nhập (đã ghi nhận)</p>
          <p className="text-3xl font-bold text-emerald-600">+{fmt(totalRevenue)}</p>
          <p className="text-slate-400 text-xs mt-1">{accounts.length} nguồn thu</p>
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
            placeholder="Tìm kiếm tài khoản thu..."
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
      </div>

      {/* Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2].map(i => <div key={i} className="h-40 bg-slate-200 animate-pulse rounded-2xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-2xl border border-slate-200">
          <Landmark size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium">
            {search ? 'Không tìm thấy nguồn thu phù hợp' : 'Chưa có tài khoản thu nào'}
          </p>
          {!search && <p className="text-slate-400 text-sm mt-1">Nhấn "Thêm nguồn thu" để bắt đầu</p>}
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
                  <p className="text-white/70 text-xs uppercase tracking-wider mb-1 font-medium">Nguồn thu</p>
                  <h3 className="text-lg font-bold leading-tight">{acc.name}</h3>
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

              <div>
                <p className="text-white/70 text-xs mb-1">Đã nhận</p>
                <div className="flex items-center gap-2">
                  <ArrowUpRight size={20} className="text-white/80" />
                  <p className="text-3xl font-bold tracking-tight">{fmt(acc.balance)}</p>
                </div>
              </div>

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
        typeId={4}
      />
      {editingAcc && (
        <AccountFormModal
          isOpen={true}
          onClose={closeModal}
          onSubmit={handleEdit}
          account={editingAcc}
          typeId={4}
        />
      )}
    </div>
  );
}
