import { useState } from "react";
import { Monitor, Moon, Sun, Globe, Hash, Clock, CheckCircle2, Save } from "lucide-react";
import { toast } from "sonner";
import { useSettings } from "../../context/SettingsContext";

import { PageLayout } from "../../components/layout/PageLayout";

export function Preferences() {
  const { settings, updateSettings } = useSettings();
  const [isSaving, setIsSaving] = useState(false);

  // Local state for the form so we don't apply immediately until saved
  const [formData, setFormData] = useState({
    theme: "light",
    currency: "VND",
    numberFormat: "vi-VN",
    firstDayOfWeek: "1", // 1 = Monday
  });

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      // Simulate API call
      // updateSettings(formData);
      setIsSaving(false);
      toast.success("Đã lưu các tùy chọn hiển thị!");
    }, 800);
  };

  return (
    <PageLayout
      title="Tùy chọn hiển thị"
      subtitle="Cá nhân hóa giao diện và định dạng dữ liệu cho ứng dụng"
      actions={
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-6 py-2.5 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors shadow-sm disabled:opacity-70"
        >
          {isSaving ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <Save size={18} />}
          <span>{isSaving ? "Đang lưu..." : "Lưu thay đổi"}</span>
        </button>
      }
    >

      <div className="space-y-8">
        
        {/* Theme Settings */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Monitor size={20} className="text-purple-600" />
              Giao diện (Theme)
            </h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Light Mode */}
              <label className={`cursor-pointer rounded-xl border-2 p-1 transition-all ${formData.theme === 'light' ? 'border-purple-600 ring-2 ring-purple-100' : 'border-slate-200 hover:border-slate-300'}`}>
                <input type="radio" name="theme" className="sr-only" checked={formData.theme === 'light'} onChange={() => setFormData({...formData, theme: 'light'})} />
                <div className="bg-slate-50 rounded-lg p-4 h-full">
                  <Sun size={28} className="text-amber-500 mb-3" />
                  <p className="font-bold text-slate-900 flex items-center justify-between">
                    Sáng (Light)
                    {formData.theme === 'light' && <CheckCircle2 size={16} className="text-purple-600" />}
                  </p>
                </div>
              </label>

              {/* Dark Mode */}
              <label className={`cursor-pointer rounded-xl border-2 p-1 transition-all ${formData.theme === 'dark' ? 'border-purple-600 ring-2 ring-purple-100' : 'border-slate-200 hover:border-slate-300'}`}>
                <input type="radio" name="theme" className="sr-only" checked={formData.theme === 'dark'} onChange={() => setFormData({...formData, theme: 'dark'})} />
                <div className="bg-slate-900 rounded-lg p-4 h-full">
                  <Moon size={28} className="text-blue-400 mb-3" />
                  <p className="font-bold text-white flex items-center justify-between">
                    Tối (Dark)
                    {formData.theme === 'dark' && <CheckCircle2 size={16} className="text-purple-400" />}
                  </p>
                </div>
              </label>

              {/* System Mode */}
              <label className={`cursor-pointer rounded-xl border-2 p-1 transition-all ${formData.theme === 'auto' ? 'border-purple-600 ring-2 ring-purple-100' : 'border-slate-200 hover:border-slate-300'}`}>
                <input type="radio" name="theme" className="sr-only" checked={formData.theme === 'auto'} onChange={() => setFormData({...formData, theme: 'auto'})} />
                <div className="bg-gradient-to-br from-slate-100 to-slate-800 rounded-lg p-4 h-full">
                  <Monitor size={28} className="text-slate-500 mb-3" />
                  <p className="font-bold text-slate-800 flex items-center justify-between mix-blend-overlay">
                    Hệ thống
                    {formData.theme === 'auto' && <CheckCircle2 size={16} className="text-purple-900" />}
                  </p>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Regional Settings */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Globe size={20} className="text-purple-600" />
              Khu vực & Định dạng
            </h2>
          </div>
          <div className="p-6 space-y-6">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Number Format */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                  <Hash size={16} className="text-slate-400" /> Định dạng số
                </label>
                <select 
                  value={formData.numberFormat}
                  onChange={(e) => setFormData({...formData, numberFormat: e.target.value})}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-700 bg-white"
                >
                  <option value="vi-VN">1.000.000,00 (Việt Nam)</option>
                  <option value="en-US">1,000,000.00 (Mỹ/Anh)</option>
                  <option value="fr-FR">1 000 000,00 (Pháp/Châu Âu)</option>
                </select>
                <p className="text-xs text-slate-500 mt-2">Định dạng phân cách hàng nghìn và phần thập phân.</p>
              </div>

              {/* Start of Week */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                  <Clock size={16} className="text-slate-400" /> Ngày đầu tuần
                </label>
                <select 
                  value={formData.firstDayOfWeek}
                  onChange={(e) => setFormData({...formData, firstDayOfWeek: e.target.value})}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-700 bg-white"
                >
                  <option value="1">Thứ Hai (Khuyến nghị)</option>
                  <option value="0">Chủ Nhật</option>
                  <option value="6">Thứ Bảy</option>
                </select>
                <p className="text-xs text-slate-500 mt-2">Ảnh hưởng đến các báo cáo thống kê theo tuần.</p>
              </div>
            </div>

          </div>
        </div>

      </div>
    </PageLayout>
  );
}
