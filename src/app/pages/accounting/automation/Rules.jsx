import { Plus, GitMerge, Pencil, Trash2, Search, Zap, ArrowRight, Play, Pause } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export function Rules() {
  const [search, setSearch] = useState("");
  const [rules, setRules] = useState([
    { id: 1, name: "Phân loại cafe", trigger: "Mô tả chứa 'Starbucks' hoặc 'Highlands'", action: "Gán danh mục: Cà phê", isActive: true, runs: 142 },
    { id: 2, name: "Chuyển tiền lương", trigger: "Tài khoản nhận: Lương công ty", action: "Chia 20% vào Lợn tiết kiệm", isActive: true, runs: 5 },
    { id: 3, name: "Phí ngân hàng", trigger: "Mô tả chứa 'Phí SMS' hoặc 'Phí duy trì'", action: "Gán danh mục: Phí ngân hàng", isActive: false, runs: 12 },
  ]);

  const toggleStatus = (id, currentStatus) => {
    setRules(rules.map(r => r.id === id ? { ...r, isActive: !currentStatus } : r));
    toast.success(currentStatus ? "Đã tắt quy tắc" : "Đã bật quy tắc");
  };

  const deleteRule = (id, name) => {
    if (!window.confirm(`Xóa quy tắc "${name}"?`)) return;
    setRules(rules.filter(r => r.id !== id));
    toast.success("Đã xóa quy tắc");
  };

  const filtered = rules.filter(r => r.name.toLowerCase().includes(search.toLowerCase()) || r.trigger.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Quy tắc tự động</h1>
          <p className="text-slate-500 mt-1">Thiết lập các quy tắc để tự động phân loại giao dịch</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors shadow-sm">
          <Plus size={18} />
          <span className="font-medium">Tạo quy tắc mới</span>
        </button>
      </div>

      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-6 text-white shadow-sm relative overflow-hidden mb-8 flex items-center justify-between">
         <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mr-32 -mt-32 pointer-events-none" />
         <div className="flex items-center gap-6 relative z-10">
           <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
             <Zap size={32} className="text-white" />
           </div>
           <div>
             <h3 className="text-xl font-bold mb-1">Tiết kiệm thời gian với Tự động hóa</h3>
             <p className="text-indigo-100 max-w-xl text-sm">Hệ thống sẽ tự động quét các giao dịch mới và áp dụng hành động tương ứng dựa trên điều kiện bạn thiết lập. Giúp sổ sách luôn gọn gàng mà không tốn công sức.</p>
           </div>
         </div>
         <div className="hidden md:block text-right relative z-10">
            <p className="text-4xl font-bold">{rules.reduce((s, r) => s + r.runs, 0)}</p>
            <p className="text-indigo-200 text-sm">Lần thực thi tự động</p>
         </div>
      </div>

      <div className="flex gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm kiếm quy tắc..."
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-2xl border border-slate-200 shadow-sm">
          <GitMerge size={48} className="mx-auto text-slate-300 mb-4" />
          <p className="text-slate-900 font-bold text-lg mb-1">Chưa có quy tắc nào</p>
          <p className="text-slate-500 font-medium">Nhấn "Tạo quy tắc mới" để bắt đầu tự động hóa</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filtered.map(rule => (
            <div key={rule.id} className={`bg-white rounded-2xl border ${rule.isActive ? 'border-slate-200 shadow-sm' : 'border-slate-200/60 opacity-70'} p-5 transition-all hover:shadow-md`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${rule.isActive ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
                    <GitMerge size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">{rule.name}</h3>
                    <p className="text-xs text-slate-500">Đã chạy: <span className="font-medium text-slate-700">{rule.runs} lần</span></p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${rule.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                    {rule.isActive ? 'Đang hoạt động' : 'Đã tắt'}
                  </span>
                  <div className="w-px h-6 bg-slate-200 mx-2"></div>
                  <button onClick={() => toggleStatus(rule.id, rule.isActive)} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors" title={rule.isActive ? "Tắt" : "Bật"}>
                    {rule.isActive ? <Pause size={16} /> : <Play size={16} />}
                  </button>
                  <button className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-md transition-colors" title="Sửa"><Pencil size={16}/></button>
                  <button onClick={() => deleteRule(rule.id, rule.name)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors" title="Xóa"><Trash2 size={16}/></button>
                </div>
              </div>
              
              <div className="bg-slate-50 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center gap-4">
                <div className="flex-1">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Nếu (Điều kiện)</p>
                  <p className="text-sm font-medium text-slate-800 bg-white border border-slate-200 rounded-lg px-3 py-2">{rule.trigger}</p>
                </div>
                <div className="hidden md:flex items-center justify-center mt-6">
                  <ArrowRight size={20} className="text-slate-300" />
                </div>
                <div className="flex-1 w-full">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Thì (Hành động)</p>
                  <p className="text-sm font-medium text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2">{rule.action}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
