import React, { useState, useEffect } from 'react';
import { Upload, Moon, Sun, Monitor, Save, Loader2, CheckCircle2, Database, UploadCloud } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { migrateData } from '@/lib/migration';
import { useSupabaseAuth } from '@/context/SupabaseAuthContext';
import { supabase } from '@/lib/supabase';

export default function Settings() {
  const [activeTab, setActiveTab] = useState('company');
  const [logo, setLogo] = useState(null);
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') || 'light';
    }
    return 'light';
  });
  
  const handleThemeChange = (newTheme) => {
      setTheme(newTheme);
      localStorage.setItem('theme', newTheme);
      if (newTheme === 'dark') {
          document.documentElement.classList.add('dark');
      } else {
          document.documentElement.classList.remove('dark');
      }
      // Dispatch custom event for other components
      window.dispatchEvent(new Event('themeChange'));
  };

  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  // Migration State
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationResult, setMigrationResult] = useState(null);
  const { isEngineer } = useSupabaseAuth() || {}; 
  
  const [companyInfo, setCompanyInfo] = useState({
    id: null,
    name: 'Bugless Digital',
    email: 'info@buglessdigital.com',
    phone: '+90 212 123 45 67',
    address: 'Maslak, Sarıyer, İstanbul'
  });

  // Load Settings from Supabase
  useEffect(() => {
    const fetchSettings = async () => {
        try {
            const { data, error } = await supabase
                .from('company_settings')
                .select('*')
                .limit(1)
                .maybeSingle();
            
            if (data && !error) {
                setCompanyInfo(data);
                if (data.logo_url) setLogo(data.logo_url);
            }
        } catch (err) {
            console.error("Settings load error:", err);
        }
    };
    fetchSettings();
  }, []);

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogo(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
        const payload = {
            ...companyInfo,
            logo_url: logo,
            updated_at: new Date().toISOString()
        };

        // If we don't have an ID, it's an insert or we use upsert with a fixed ID/match
        const { data, error } = await supabase
            .from('company_settings')
            .upsert(payload, { onConflict: 'id' });

        if (error) throw error;

        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 2000);
    } catch (err) {
        alert("Kaydetme hatası: " + err.message);
    } finally {
        setIsSaving(false);
    }
  };

  const handleMigration = async () => {
      if(!window.confirm("YEREL veriler Supabase veritabanına aktarılacak. İşlem geri alınamaz. Devam edilsin mi?")) return;
      
      setIsMigrating(true);
      setMigrationResult(null);
      try {
          const res = await migrateData();
          setMigrationResult({ success: true, data: res });
      } catch (err) {
          setMigrationResult({ success: false, error: err.message });
      } finally {
          setIsMigrating(false);
      }
  };

  return (
    <div className="space-y-6">
       <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white transition-colors">Ayarlar</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Sistem ayarlarını yapılandır</p>
       </div>

       {/* Tabs */}
       <div className="flex gap-2 border-b border-gray-200 dark:border-slate-800 transition-colors">
          <Button 
            variant="ghost"
            onClick={() => setActiveTab('company')}
            className={cn(
               "rounded-none border-b-2 hover:bg-transparent px-4 py-2 text-sm font-medium transition-colors h-auto",
               activeTab === 'company' 
                 ? "border-primary text-primary" 
                 : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
             )}
          >
            Şirket Bilgileri
          </Button>
          <Button 
            variant="ghost"
            onClick={() => setActiveTab('appearance')}
            className={cn(
               "rounded-none border-b-2 hover:bg-transparent px-4 py-2 text-sm font-medium transition-colors h-auto",
               activeTab === 'appearance' 
                 ? "border-primary text-primary" 
                 : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
             )}
          >
            Görünüm
          </Button>
          <Button 
            variant="ghost"
            onClick={() => setActiveTab('system')}
            className={cn(
               "rounded-none border-b-2 hover:bg-transparent px-4 py-2 text-sm font-medium transition-colors h-auto",
               activeTab === 'system' 
                 ? "border-primary text-primary" 
                 : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
             )}
          >
            Sistem
          </Button>
       </div>

       {/* Content */}
       <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm p-6 min-h-[500px] transition-colors duration-300">
          
          {/* Company Info Tab */}
          {activeTab === 'company' && (
            <div className="max-w-2xl space-y-8 animate-in fade-in duration-300">
               <div>
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Şirket Bilgileri</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Şirket bilgilerini güncelleyin</p>
                  
                  <div className="flex items-center gap-6">
                     <div className="w-24 h-24 rounded-2xl bg-primary flex items-center justify-center text-white text-2xl font-bold overflow-hidden shadow-lg shadow-primary/20">
                        {logo ? <img src={logo} alt="Logo" className="w-full h-full object-cover" /> : 'BD'}
                     </div>
                     <div>
                        <input 
                          type="file" 
                          id="logo-upload" 
                          className="hidden" 
                          accept="image/*"
                          onChange={handleLogoChange}
                        />
                        <label 
                          htmlFor="logo-upload"
                          className="px-4 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 cursor-pointer transition-colors shadow-sm inline-block"
                        >
                           Logo Değiştir
                        </label>
                        <p className="text-xs text-gray-400 mt-2">PNG, JPG veya SVG formatında, maksimum 2MB</p>
                     </div>
                  </div>
               </div>

               <div className="space-y-4">
                  <div className="space-y-1.5">
                     <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Şirket Adı</label>
                     <input 
                       type="text" 
                       className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-gray-900 dark:text-white transition-all"
                       value={companyInfo.name}
                       onChange={e => setCompanyInfo({...companyInfo, name: e.target.value})}
                     />
                  </div>
                  <div className="space-y-1.5">
                     <label className="text-sm font-medium text-gray-700 dark:text-gray-300">E-posta</label>
                     <input 
                       type="email" 
                       className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-gray-900 dark:text-white transition-all"
                       value={companyInfo.email}
                       onChange={e => setCompanyInfo({...companyInfo, email: e.target.value})}
                     />
                  </div>
                  <div className="space-y-1.5">
                     <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Telefon</label>
                     <input 
                       type="tel" 
                       className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-gray-900 dark:text-white transition-all"
                       value={companyInfo.phone}
                       onChange={e => setCompanyInfo({...companyInfo, phone: e.target.value})}
                     />
                  </div>
                  <div className="space-y-1.5">
                     <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Adres</label>
                     <textarea 
                       rows={3}
                       className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-gray-900 dark:text-white transition-all resize-none"
                       value={companyInfo.address}
                       onChange={e => setCompanyInfo({...companyInfo, address: e.target.value})}
                     />
                  </div>
               </div>
               
               <div className="pt-4 border-t border-gray-100 dark:border-slate-800 flex justify-end">
                  <Button 
                    onClick={handleSave}
                    disabled={isSaving}
                    isLoading={isSaving}
                    className={cn(
                      "min-w-[140px] px-6 gap-2",
                      showSuccess 
                        ? "bg-green-600 hover:bg-green-700 shadow-green-200"
                        : "bg-primary hover:bg-primary/90 shadow-primary/20"
                    )}
                  >
                     {showSuccess ? (
                        <>
                           <CheckCircle2 className="w-4 h-4" />
                           Kaydedildi
                        </>
                     ) : (
                        <>
                           {!isSaving && <Save className="w-4 h-4" />}
                           {isSaving ? 'Kaydediliyor...' : 'Kaydet'}
                        </>
                     )}
                  </Button>
               </div>
            </div>
          )}

          {/* Appearance Tab */}
          {activeTab === 'appearance' && (
            <div className="max-w-4xl space-y-8 animate-in fade-in duration-300">
               <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Tema Seçimi</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Arayüz temasını seçin</p>
                  
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Tema</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     {/* Light Theme Card */}
                     <div 
                        onClick={() => handleThemeChange('light')}
                        className={cn(
                           "relative border-2 rounded-xl p-4 cursor-pointer transition-all hover:bg-gray-50 dark:hover:bg-slate-800",
                           theme === 'light' ? "border-primary bg-blue-50/10 dark:bg-primary/10" : "border-gray-200 dark:border-slate-700"
                        )}
                     >
                        <div className="flex items-center gap-3 mb-4">
                           <Sun className={cn("w-5 h-5", theme === 'light' ? "text-primary" : "text-gray-500")} />
                           <span className="font-medium text-gray-900 dark:text-white">Açık Tema</span>
                           {theme === 'light' && <span className="ml-auto text-xs bg-black text-white px-2 py-0.5 rounded-full">Aktif</span>}
                        </div>
                        <div className="space-y-2 opacity-50 pointer-events-none select-none">
                           <div className="h-4 w-1/3 bg-gray-200 rounded"></div>
                           <div className="h-4 w-1/2 bg-gray-200 rounded"></div>
                           <div className="h-12 w-full bg-gray-100 rounded border border-gray-200 mt-4"></div>
                        </div>
                     </div>

                     {/* Dark Theme Card */}
                     <div 
                        onClick={() => handleThemeChange('dark')}
                        className={cn(
                           "relative border-2 rounded-xl p-4 cursor-pointer transition-all hover:bg-gray-50 dark:hover:bg-slate-800",
                           theme === 'dark' ? "border-primary bg-blue-50/10 dark:bg-primary/10" : "border-gray-200 dark:border-slate-700"
                        )}
                     >
                        <div className="flex items-center gap-3 mb-4">
                           <Moon className={cn("w-5 h-5", theme === 'dark' ? "text-primary" : "text-gray-500")} />
                           <span className="font-medium text-gray-900 dark:text-white">Koyu Tema</span>
                           {theme === 'dark' && <span className="ml-auto text-xs bg-white text-black px-2 py-0.5 rounded-full">Aktif</span>}
                        </div>
                        <div className="space-y-2 opacity-50 pointer-events-none select-none p-2 bg-gray-900 rounded-lg">
                           <div className="h-4 w-1/3 bg-gray-700 rounded"></div>
                           <div className="h-4 w-1/2 bg-gray-700 rounded"></div>
                           <div className="h-12 w-full bg-gray-800 rounded border border-gray-700 mt-4"></div>
                        </div>
                     </div>
                  </div>
               </div>

               <div className="bg-blue-50 text-blue-700 p-4 rounded-xl text-sm border border-blue-100">
                  <strong>Not:</strong> Tema değişikliği tüm sistem genelinde uygulanacaktır. Şu anda {theme === 'light' ? 'Açık' : 'Koyu'} Tema aktif olarak kullanılmaktadır.
               </div>
            </div>
          )}

           {/* System Tab */}
           {activeTab === 'system' && (
             <div className="max-w-4xl space-y-8 animate-in fade-in duration-300">
                <div>
                   <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Veri Yönetimi</h3>
                   <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Sistem veritabanı işlemleri</p>
                   
                   <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800 rounded-xl p-6">
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                                <Database className="w-6 h-6" />
                            </div>
                            <div className="flex-1">
                                <h4 className="text-base font-semibold text-gray-900 dark:text-white">Bulut Veri Taşıma (Migration)</h4>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 mb-4">
                                    Yerel tarayıcı belleğindeki (localStorage) müşteri, proje ve finans verilerinizi Supabase bulut veritabanına aktarır. 
                                    Bu işlem sadece bir kez yapılmalıdır.
                                </p>
                                
                                <Button 
                                    onClick={handleMigration} 
                                    disabled={isMigrating}
                                    isLoading={isMigrating}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200 dark:shadow-none"
                                >
                                    <UploadCloud className="w-4 h-4 mr-2" />
                                    Aktarımı Başlat
                                </Button>

                                {migrationResult && (
                                    <div className={cn("mt-4 p-4 rounded-lg text-sm border", migrationResult.success ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200")}>
                                        {migrationResult.success ? (
                                            <div>
                                                <p className="font-bold flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Başarılı!</p>
                                                <ul className="mt-2 list-disc list-inside space-y-1 opacity-80">
                                                    <li>Müşteriler: {migrationResult.data.clients.success} (Hata: {migrationResult.data.clients.fail})</li>
                                                    <li>Projeler: {migrationResult.data.projects.success} (Hata: {migrationResult.data.projects.fail})</li>
                                                    <li>Finans: {migrationResult.data.transactions.success} (Hata: {migrationResult.data.transactions.fail})</li>
                                                </ul>
                                            </div>
                                        ) : (
                                            <p>Hata: {migrationResult.error}</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                   </div>
                </div>
             </div>
           )}
       </div>
    </div>
  );
}
