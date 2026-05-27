import { Plus, Repeat, Play, Pause, Trash2, CalendarClock, Activity, Search } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

export function Recurrences() {
  const [search, setSearch] = useState("");
  const [recurrences, setRecurrences] = useState([
    { id: 1, name: "Thanh toán lương nhân viên", cron: "0 0 5 * *", nextRun: "2026-06-05T00:00:00", status: "active", lastRunStatus: "success" },
    { id: 2, name: "Sao lưu cơ sở dữ liệu", cron: "0 2 * * *", nextRun: "2026-05-28T02:00:00", status: "active", lastRunStatus: "success" },
    { id: 3, name: "Quét giao dịch bất thường", cron: "0 * * * *", nextRun: "2026-05-27T16:00:00", status: "paused", lastRunStatus: "failed" },
  ]);

  const toggleStatus = (id, currentStatus) => {
    const newStatus = currentStatus === "active" ? "paused" : "active";
    setRecurrences(recurrences.map(r => r.id === id ? { ...r, status: newStatus } : r));
    toast.success(currentStatus === "active" ? "Đã dừng tiến trình lặp" : "Đã kích hoạt tiến trình lặp");
  };

  const deleteRecurrence = (id, name) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa tiến trình "${name}"?`)) return;
    setRecurrences(recurrences.filter(r => r.id !== id));
    toast.success("Đã xóa thành công");
  };

  const filtered = recurrences.filter(r => r.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Lịch lặp lại</h1>
          <p className="text-slate-500 mt-1">Quản lý các tiến trình và giao dịch chạy ngầm định kỳ</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors shadow-sm">
          <Plus size={18} />
          <span className="font-medium">Tạo tiến trình mới</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm mb-8">
        <div className="p-6 flex flex-col md:flex-row items-center justify-between border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-4 mb-4 md:mb-0">
             <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
                <CalendarClock size={24} />
             </div>
             <div>
               <h3 className="font-bold text-slate-900">Bộ lên lịch (Scheduler) đang chạy</h3>
               <p className="text-sm text-slate-500">Tiến trình kiểm tra lịch lặp chạy mỗi phút một lần.</p>
             </div>
          </div>
          <div className="flex items-center gap-2 text-sm px-4 py-2 bg-green-50 text-green-700 rounded-lg border border-green-100 font-medium">
             <Activity size={16} className="animate-pulse" />
             Hệ thống ổn định
          </div>
        </div>
        
        <div className="p-4 border-b border-slate-100 bg-white">
           <div className="relative max-w-sm">
             <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
             <input
               type="text"
               value={search}
               onChange={(e) => setSearch(e.target.value)}
               placeholder="Tìm kiếm tiến trình..."
               className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
             />
           </div>
        </div>

        {filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
             <Repeat size={48} className="mx-auto mb-4 opacity-30" />
             <p className="text-slate-900 font-medium text-lg">Không tìm thấy dữ liệu</p>
          </div>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200 bg-slate-50">
                <th className="px-6 py-4 font-semibold">Tên tiến trình</th>
                <th className="px-6 py-4 font-semibold">Lịch trình (Cron)</th>
                <th className="px-6 py-4 font-semibold">Lần chạy tiếp theo</th>
                <th className="px-6 py-4 font-semibold text-center">Trạng thái</th>
                <th className="px-6 py-4 font-semibold text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-slate-900">{item.name}</div>
                    <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                      Kết quả gần nhất: 
                      <span className={item.lastRunStatus === "success" ? "text-green-600" : "text-red-500"}>
                        {item.lastRunStatus === "success" ? "Thành công" : "Thất bại"}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-mono text-sm px-2.5 py-1 bg-slate-100 text-slate-700 rounded-md border border-slate-200 shadow-sm">
                      {item.cron}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-700 font-medium">
                    {format(new Date(item.nextRun), "HH:mm, dd/MM/yyyy", { locale: vi })}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${
                      item.status === "active" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"
                    }`}>
                      {item.status === "active" ? "Đang theo dõi" : "Đã tạm dừng"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => toggleStatus(item.id, item.status)} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-md transition-colors" title={item.status === "active" ? "Tạm dừng" : "Tiếp tục"}>
                        {item.status === "active" ? <Pause size={16} /> : <Play size={16} />}
                      </button>
                      <button onClick={() => deleteRecurrence(item.id, item.name)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors" title="Xóa">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
