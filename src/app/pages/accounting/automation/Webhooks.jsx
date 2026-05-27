import { Plus, Link2, Copy, Check, CheckCircle2, XCircle, Search, RefreshCw, Key } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

export function Webhooks() {
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [search, setSearch] = useState("");

  const webhookUrl = "https://moneyflow.app/api/webhooks/incoming/v1";
  const secretKey = "whsec_abcd1234efgh5678ijkl9012mnop3456";

  const [logs] = useState([
    { id: "evt_1", source: "Vietcombank SMS", status: "success", time: "2026-05-27T10:15:22", payload: '{"amount": -50000, "desc": "Thanh toan Highlands Coffee"}' },
    { id: "evt_2", source: "Zapier", status: "success", time: "2026-05-26T14:20:00", payload: '{"source": "Google Sheets", "action": "sync_row"}' },
    { id: "evt_3", source: "Momo App", status: "failed", time: "2026-05-25T09:05:11", payload: '{"error": "Invalid signature"}' },
  ]);

  const handleCopy = (text, type) => {
    navigator.clipboard.writeText(text).then(() => {
      if (type === 'url') {
        setCopiedUrl(true);
        setTimeout(() => setCopiedUrl(false), 2000);
      } else {
        setCopiedKey(true);
        setTimeout(() => setCopiedKey(false), 2000);
      }
      toast.success("Đã sao chép vào bộ nhớ tạm");
    });
  };

  const filtered = logs.filter(l => l.source.toLowerCase().includes(search.toLowerCase()) || l.payload.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Webhooks</h1>
          <p className="text-slate-500 mt-1">Kết nối và nhận dữ liệu tự động từ các ứng dụng bên thứ 3 (ZaloPay, Momo, SMS...)</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors shadow-sm">
          <Plus size={18} />
          <span className="font-medium">Tạo Webhook mới</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
           <div className="flex items-center gap-3 mb-4 text-slate-800">
             <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600">
               <Link2 size={20} />
             </div>
             <h3 className="font-bold text-lg">Endpoint URL</h3>
           </div>
           <p className="text-sm text-slate-500 mb-3">Gửi các HTTP POST request đến địa chỉ này để ghi nhận giao dịch tự động.</p>
           <div className="flex items-center gap-2">
             <div className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 font-mono text-sm text-slate-600 overflow-x-auto whitespace-nowrap">
               {webhookUrl}
             </div>
             <button onClick={() => handleCopy(webhookUrl, 'url')} className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors flex items-center gap-2 font-medium">
               {copiedUrl ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
               {copiedUrl ? "Đã chép" : "Copy"}
             </button>
           </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
           <div className="flex items-center gap-3 mb-4 text-slate-800">
             <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center text-purple-600">
               <Key size={20} />
             </div>
             <h3 className="font-bold text-lg">Secret Key</h3>
           </div>
           <p className="text-sm text-slate-500 mb-3">Sử dụng mã bí mật này để xác thực các request gửi đến Webhook (Signature header).</p>
           <div className="flex items-center gap-2">
             <div className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2.5 font-mono text-sm text-green-400 overflow-x-auto whitespace-nowrap select-all">
               {secretKey}
             </div>
             <button onClick={() => handleCopy(secretKey, 'key')} className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors flex items-center gap-2 font-medium">
               {copiedKey ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
               {copiedKey ? "Đã chép" : "Copy"}
             </button>
           </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
          <h3 className="font-bold text-slate-900 text-lg">Lịch sử nhận Webhook</h3>
          <div className="flex items-center gap-3 w-full sm:w-auto">
             <div className="relative flex-1 sm:w-64">
               <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
               <input
                 type="text"
                 value={search}
                 onChange={(e) => setSearch(e.target.value)}
                 placeholder="Tìm kiếm log..."
                 className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
               />
             </div>
             <button className="p-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50" title="Làm mới">
               <RefreshCw size={18} />
             </button>
          </div>
        </div>

        <table className="w-full text-left">
          <thead>
            <tr className="text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200 bg-slate-50">
              <th className="px-6 py-4 font-semibold">Trạng thái</th>
              <th className="px-6 py-4 font-semibold">Nguồn (Source)</th>
              <th className="px-6 py-4 font-semibold">Thời gian</th>
              <th className="px-6 py-4 font-semibold w-1/2">Payload / Chi tiết</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan="4" className="py-12 text-center text-slate-500">
                  Không có dữ liệu log webhook.
                </td>
              </tr>
            ) : filtered.map(log => (
              <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4">
                  {log.status === 'success' ? (
                    <div className="flex items-center gap-1.5 text-green-600 font-medium text-sm">
                      <CheckCircle2 size={18} /> <span className="hidden sm:inline">Thành công</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-red-500 font-medium text-sm">
                      <XCircle size={18} /> <span className="hidden sm:inline">Thất bại</span>
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 font-semibold text-slate-800">
                  {log.source}
                </td>
                <td className="px-6 py-4 text-sm text-slate-600 font-medium">
                  {format(new Date(log.time), "HH:mm:ss dd/MM", { locale: vi })}
                </td>
                <td className="px-6 py-4">
                  <div className="bg-slate-900 text-green-400 font-mono text-xs p-2.5 rounded-lg overflow-x-auto">
                    {log.payload}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
