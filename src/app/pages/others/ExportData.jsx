import { useState } from "react";
import { Download, FileText, Calendar, CheckCircle2, FileJson, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";

export function ExportData() {
  const [format, setFormat] = useState("excel");
  const [dateRange, setDateRange] = useState("all_time");
  const [dataType, setDataType] = useState("transactions");
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = () => {
    setIsExporting(true);
    // Giả lập tiến trình xuất dữ liệu
    setTimeout(() => {
      setIsExporting(false);
      toast.success(`Đã xuất dữ liệu thành công định dạng ${format.toUpperCase()}!`);
    }, 1500);
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Xuất dữ liệu</h1>
        <p className="text-slate-500 mt-1">Trích xuất dữ liệu tài chính của bạn ra các định dạng chuẩn để lưu trữ hoặc phân tích bên ngoài</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Form Settings */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Data Type */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-xs">1</span>
              Dữ liệu cần xuất
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className={`cursor-pointer rounded-xl border-2 p-4 transition-all ${dataType === 'transactions' ? 'border-purple-600 bg-purple-50' : 'border-slate-200 hover:border-slate-300'}`}>
                <input type="radio" name="dataType" className="sr-only" checked={dataType === 'transactions'} onChange={() => setDataType('transactions')} />
                <div className="flex justify-between items-center mb-2">
                  <span className="font-bold text-slate-900">Sổ giao dịch</span>
                  {dataType === 'transactions' && <CheckCircle2 size={18} className="text-purple-600" />}
                </div>
                <p className="text-sm text-slate-500">Chi tiết mọi khoản thu chi, chuyển khoản</p>
              </label>

              <label className={`cursor-pointer rounded-xl border-2 p-4 transition-all ${dataType === 'accounts' ? 'border-purple-600 bg-purple-50' : 'border-slate-200 hover:border-slate-300'}`}>
                <input type="radio" name="dataType" className="sr-only" checked={dataType === 'accounts'} onChange={() => setDataType('accounts')} />
                <div className="flex justify-between items-center mb-2">
                  <span className="font-bold text-slate-900">Danh sách Tài khoản</span>
                  {dataType === 'accounts' && <CheckCircle2 size={18} className="text-purple-600" />}
                </div>
                <p className="text-sm text-slate-500">Thông tin ví và số dư hiện tại</p>
              </label>
            </div>
          </div>

          {/* Time Range */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-xs">2</span>
              Khoảng thời gian
            </h2>
            <div className="flex items-center gap-4 max-w-sm border border-slate-200 rounded-xl px-4 py-3 focus-within:ring-2 focus-within:ring-purple-500 transition-shadow">
              <Calendar size={20} className="text-slate-400" />
              <select 
                value={dateRange} 
                onChange={(e) => setDateRange(e.target.value)}
                className="w-full font-medium text-slate-700 bg-transparent focus:outline-none"
              >
                <option value="this_month">Tháng này</option>
                <option value="last_month">Tháng trước</option>
                <option value="this_year">Năm nay</option>
                <option value="last_year">Năm ngoái</option>
                <option value="all_time">Toàn thời gian</option>
              </select>
            </div>
          </div>

          {/* Format */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-xs">3</span>
              Định dạng file
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <label className={`cursor-pointer rounded-xl border-2 p-4 text-center transition-all ${format === 'excel' ? 'border-green-500 bg-green-50' : 'border-slate-200 hover:border-slate-300'}`}>
                <input type="radio" name="format" className="sr-only" checked={format === 'excel'} onChange={() => setFormat('excel')} />
                <FileSpreadsheet size={32} className={`mx-auto mb-2 ${format === 'excel' ? 'text-green-600' : 'text-slate-400'}`} />
                <span className={`font-bold block ${format === 'excel' ? 'text-green-700' : 'text-slate-700'}`}>Excel (.xlsx)</span>
              </label>
              
              <label className={`cursor-pointer rounded-xl border-2 p-4 text-center transition-all ${format === 'csv' ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'}`}>
                <input type="radio" name="format" className="sr-only" checked={format === 'csv'} onChange={() => setFormat('csv')} />
                <FileText size={32} className={`mx-auto mb-2 ${format === 'csv' ? 'text-blue-600' : 'text-slate-400'}`} />
                <span className={`font-bold block ${format === 'csv' ? 'text-blue-700' : 'text-slate-700'}`}>CSV</span>
              </label>
              
              <label className={`cursor-pointer rounded-xl border-2 p-4 text-center transition-all ${format === 'json' ? 'border-yellow-500 bg-yellow-50' : 'border-slate-200 hover:border-slate-300'}`}>
                <input type="radio" name="format" className="sr-only" checked={format === 'json'} onChange={() => setFormat('json')} />
                <FileJson size={32} className={`mx-auto mb-2 ${format === 'json' ? 'text-yellow-600' : 'text-slate-400'}`} />
                <span className={`font-bold block ${format === 'json' ? 'text-yellow-700' : 'text-slate-700'}`}>JSON</span>
              </label>
            </div>
          </div>

        </div>

        {/* Right Column: Submit Card */}
        <div className="lg:col-span-1">
          <div className="bg-gradient-to-b from-indigo-900 to-purple-900 rounded-2xl p-6 text-white shadow-lg sticky top-8">
            <h3 className="text-xl font-bold mb-4">Tóm tắt yêu cầu</h3>
            
            <div className="space-y-4 mb-8">
              <div className="flex justify-between text-sm border-b border-white/10 pb-4">
                <span className="text-indigo-200">Dữ liệu:</span>
                <span className="font-semibold">{dataType === 'transactions' ? 'Sổ giao dịch' : 'Danh sách Tài khoản'}</span>
              </div>
              <div className="flex justify-between text-sm border-b border-white/10 pb-4">
                <span className="text-indigo-200">Thời gian:</span>
                <span className="font-semibold">Toàn thời gian</span>
              </div>
              <div className="flex justify-between text-sm pb-2">
                <span className="text-indigo-200">Định dạng:</span>
                <span className="font-semibold uppercase">{format}</span>
              </div>
            </div>

            <button 
              onClick={handleExport}
              disabled={isExporting}
              className="w-full flex items-center justify-center gap-2 py-4 bg-white text-purple-900 font-bold rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isExporting ? (
                <>
                  <div className="w-5 h-5 border-2 border-purple-900 border-t-transparent rounded-full animate-spin"></div>
                  <span>Đang xử lý...</span>
                </>
              ) : (
                <>
                  <Download size={20} />
                  <span>Xuất dữ liệu ngay</span>
                </>
              )}
            </button>
            <p className="text-center text-xs text-indigo-200 mt-4">
              File sẽ được tải xuống trực tiếp thông qua trình duyệt của bạn. Dữ liệu được mã hóa bảo mật.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
