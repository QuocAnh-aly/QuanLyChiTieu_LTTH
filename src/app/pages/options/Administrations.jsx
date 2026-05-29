import { useState } from "react";
import { Database, AlertTriangle, Shield, HardDrive, Download, UploadCloud, RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { PageLayout } from "../../components/layout/PageLayout";

export function Administrations() {
  const [isBackingUp, setIsBackingUp] = useState(false);

  const handleBackup = () => {
    setIsBackingUp(true);
    setTimeout(() => {
      setIsBackingUp(false);
      toast.success("Đã tạo bản sao lưu dữ liệu thành công!");
    }, 2000);
  };

  const handleReset = () => {
    const confirmation = window.prompt("CẢNH BÁO: Mọi dữ liệu sẽ bị xóa sạch và không thể khôi phục. Nhập 'XOA' để xác nhận:");
    if (confirmation === 'XOA') {
      toast.success("Dữ liệu đang được xóa (Mô phỏng)...");
    }
  };

  return (
    <PageLayout
      title="Quản trị hệ thống"
      subtitle="Quản lý cơ sở dữ liệu, sao lưu, và các cấu hình cấp cao của ứng dụng"
    >

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column */}
        <div className="space-y-8">
          
          {/* Data Backup */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
              <Database size={20} className="text-indigo-600" />
              <h2 className="text-lg font-bold text-slate-900">Dữ liệu & Sao lưu</h2>
            </div>
            <div className="p-6">
              <p className="text-sm text-slate-500 mb-6">Tạo bản sao lưu mã hóa cục bộ hoặc đồng bộ lên đám mây để đảm bảo an toàn cho dữ liệu tài chính của bạn.</p>
              
              <div className="space-y-4">
                <button 
                  onClick={handleBackup}
                  disabled={isBackingUp}
                  className="w-full flex items-center justify-between p-4 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600">
                      {isBackingUp ? <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div> : <Download size={20} />}
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-slate-900">Sao lưu dữ liệu ngay</p>
                      <p className="text-xs text-slate-500">Lưu một bản copy mã hóa xuống máy</p>
                    </div>
                  </div>
                </button>

                <button className="w-full flex items-center justify-between p-4 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-colors group">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                      <UploadCloud size={20} />
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-slate-900">Đồng bộ Cloud</p>
                      <p className="text-xs text-slate-500">Sao lưu tự động lên Google Drive/Dropbox</p>
                    </div>
                  </div>
                </button>
                
                <button className="w-full flex items-center justify-between p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-colors group">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
                      <HardDrive size={20} />
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-slate-900">Khôi phục (Restore)</p>
                      <p className="text-xs text-slate-500">Khôi phục từ tệp sao lưu trước đó</p>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* System Info */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
              <Shield size={20} className="text-slate-600" />
              <h2 className="text-lg font-bold text-slate-900">Thông tin hệ thống</h2>
            </div>
            <div className="p-6">
              <ul className="space-y-3 text-sm">
                <li className="flex justify-between pb-3 border-b border-slate-100">
                  <span className="text-slate-500">Phiên bản ứng dụng</span>
                  <span className="font-semibold text-slate-900">v2.1.0-beta</span>
                </li>
                <li className="flex justify-between pb-3 border-b border-slate-100">
                  <span className="text-slate-500">Phiên bản Database</span>
                  <span className="font-semibold text-slate-900">Schema v4</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-slate-500">Chế độ môi trường</span>
                  <span className="font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded">Production</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Right Column (Danger Zone) */}
        <div>
          <div className="bg-white rounded-2xl border border-red-200 overflow-hidden shadow-sm">
            <div className="p-6 border-b border-red-100 bg-red-50/50 flex items-center gap-3">
              <AlertTriangle size={20} className="text-red-600" />
              <h2 className="text-lg font-bold text-red-700">Khu vực nguy hiểm (Danger Zone)</h2>
            </div>
            <div className="p-6 space-y-6">
              
              <div className="border border-red-100 rounded-xl p-5 bg-white">
                <h3 className="font-bold text-slate-900 mb-1">Xóa trắng dữ liệu (Factory Reset)</h3>
                <p className="text-sm text-slate-500 mb-4">
                  Thao tác này sẽ xóa toàn bộ giao dịch, tài khoản, danh mục và thiết lập của bạn. Hành động này không thể hoàn tác nếu không có bản sao lưu.
                </p>
                <button 
                  onClick={handleReset}
                  className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 border border-red-200 font-semibold rounded-lg hover:bg-red-600 hover:text-white transition-colors"
                >
                  <RotateCcw size={18} />
                  <span>Tiến hành Reset hệ thống</span>
                </button>
              </div>

            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
