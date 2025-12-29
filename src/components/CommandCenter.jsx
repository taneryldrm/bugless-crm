import React, { useEffect, useState } from 'react';
import { Command } from 'cmdk';
import { useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, Users, Briefcase, FileText, 
  CreditCard, Plus, Calendar, Search, X, CheckCircle2,
  Settings, LogOut, Moon, Sun, Laptop, ArrowRight
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

export function CommandCenter() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  // Toggle with Ctrl+K / Cmd+K
  useEffect(() => {
    const down = (e) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    
    // Custom event for button clicks
    const openEvent = () => setOpen(true);
    
    document.addEventListener('keydown', down);
    window.addEventListener('open-command-center', openEvent);
    return () => {
      document.removeEventListener('keydown', down);
      window.removeEventListener('open-command-center', openEvent);
    };
  }, []);

  const runCommand = (command) => {
    setOpen(false);
    command();
  };

  const handleSearch = (term) => {
      setOpen(false);
      navigate(`/search?q=${encodeURIComponent(term)}`);
  };

  const handleQuickTask = async () => {
      if (!search.trim()) return;
      const title = search.trim();
      setOpen(false);
      
      const { error } = await supabase.from('external_tasks').insert({
          title: title,
          status: 'Beklemede',
          due_date: new Date(Date.now() + 86400000).toISOString(),
          priority: 'Normal'
      });

      if (error) {
          alert('Görev oluşturulamadı.');
      } else {
          // Simple visual feedback could be improved with a Toast system later
          // For now, implicit success or we could verify navigation
          // Let's redirect to tasks so they see it? Or just stay? 
          // Stay is faster ("Efficiency").
          // Maybe just a small alert for now to confirm.
          alert(`✅ Görev eklendi: "${title}"`);
      }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-sm flex items-start justify-center pt-[15vh] animate-in fade-in duration-200">
      <div className="w-full max-w-[640px] shadow-2xl rounded-xl overflow-hidden animate-in zoom-in-95 slide-in-from-top-2 duration-200 ring-1 ring-white/10">
        <Command 
            className="bg-white dark:bg-[#0F172A] border border-gray-100 dark:border-slate-800 rounded-xl overflow-hidden flex flex-col w-full shadow-2xl"
            loop
        >
          
          <div className="flex items-center border-b border-gray-100 dark:border-slate-800 px-4 bg-gray-50/50 dark:bg-slate-900/50 h-16">
            <Search className="w-5 h-5 text-gray-400 mr-3 shrink-0" />
            <Command.Input 
              value={search}
              onValueChange={setSearch}
              placeholder="Ne yapmak istiyorsunuz?" 
              className="w-full h-full bg-transparent border-none focus:outline-none text-lg text-gray-800 dark:text-gray-100 placeholder:text-gray-400 font-medium"
            />
            <button onClick={() => setOpen(false)} className="p-2 hover:bg-gray-200 dark:hover:bg-slate-800 rounded-lg transition-colors ml-2">
                <kbd className="hidden sm:inline-block text-[10px] font-sans font-semibold text-gray-400 mr-2 border border-gray-200 dark:border-slate-700 rounded px-1.5 py-0.5">ESC</kbd>
                <X className="w-4 h-4 text-gray-400 inline-block" />
            </button>
          </div>

          <Command.List className="max-h-[360px] overflow-y-auto overflow-x-hidden p-2 scroll-py-2 custom-scrollbar">
            <Command.Empty className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
               {search ? (
                   <div className="flex flex-col gap-2 max-w-sm mx-auto">
                        <button 
                            onClick={handleQuickTask}
                            className="flex items-center gap-3 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 p-3 rounded-lg text-left transition-colors group"
                        >
                            <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center shrink-0">
                                <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <div className="flex-1">
                                <div className="font-semibold text-indigo-700 dark:text-indigo-300">Yeni Görev Oluştur</div>
                                <div className="text-xs text-indigo-600/70 dark:text-indigo-400/70 truncate">"{search}"</div>
                            </div>
                            <ArrowRight className="w-4 h-4 text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>

                        <button 
                            onClick={() => handleSearch(search)}
                            className="flex items-center gap-3 bg-gray-50 dark:bg-slate-800/50 hover:bg-gray-100 dark:hover:bg-slate-800 p-3 rounded-lg text-left transition-colors"
                        >
                            <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-slate-800 flex items-center justify-center shrink-0">
                                <Search className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                            </div>
                            <div className="flex-1">
                                <div className="font-semibold text-gray-700 dark:text-gray-200">Detaylı Arama Yap</div>
                                <div className="text-xs text-gray-500 truncate">Tüm kayıtlarda "{search}" ara</div>
                            </div>
                        </button>
                   </div>
               ) : (
                   <div className="flex flex-col items-center">
                       <LayoutDashboard className="w-8 h-8 text-gray-200 dark:text-slate-700 mb-2" />
                       <p>Bir komut arayın veya görev yazın...</p>
                   </div>
               )}
            </Command.Empty>

            {/* Quick Actions Group */}
            {!search && (
                <Command.Group heading="Hızlı İşlemler" className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 px-2 mt-2">
                <CommandItem onSelect={() => runCommand(() => { navigate('/meeting-notes'); setTimeout(() => document.querySelector('button[title="Yeni Not"]')?.click(), 500); })}>
                    <div className="w-5 h-5 rounded bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center mr-3">
                        <Plus className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <span className="font-medium text-gray-700 dark:text-gray-200">Yeni Toplantı Notu</span>
                </CommandItem>
                <CommandItem onSelect={() => runCommand(() => navigate('/work-orders'))}>
                    <div className="w-5 h-5 rounded bg-green-100 dark:bg-green-900/50 flex items-center justify-center mr-3">
                        <CheckCircle2 className="w-3 h-3 text-green-600 dark:text-green-400" />
                    </div>
                    <span className="font-medium text-gray-700 dark:text-gray-200">İş Emirlerine Git</span>
                </CommandItem>
                </Command.Group>
            )}

            <Command.Group heading="Navigasyon" className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 px-2 mt-4">
              <CommandItem onSelect={() => runCommand(() => navigate('/'))}>
                <LayoutDashboard className="w-4 h-4 mr-3 text-gray-400" />
                Ana Sayfa
              </CommandItem>
              <CommandItem onSelect={() => runCommand(() => navigate('/projects'))}>
                <Briefcase className="w-4 h-4 mr-3 text-gray-400" />
                Projeler
              </CommandItem>
              <CommandItem onSelect={() => runCommand(() => navigate('/clients'))}>
                <Users className="w-4 h-4 mr-3 text-gray-400" />
                Müşteriler
              </CommandItem>
              <CommandItem onSelect={() => runCommand(() => navigate('/finance'))}>
                <CreditCard className="w-4 h-4 mr-3 text-gray-400" />
                Finans Yönetimi
              </CommandItem>
              <CommandItem onSelect={() => runCommand(() => navigate('/calendar'))}>
                <Calendar className="w-4 h-4 mr-3 text-gray-400" />
                Takvim
              </CommandItem>
            </Command.Group>

            <Command.Group heading="Sistem" className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 px-2 mt-4">
               <CommandItem onSelect={() => runCommand(() => navigate('/settings'))}>
                 <Settings className="w-4 h-4 mr-3 text-slate-400" />
                 Ayarlar
               </CommandItem>
               <CommandItem onSelect={() => runCommand(() => { localStorage.setItem('theme', 'dark'); window.dispatchEvent(new Event('themeChange')); })}>
                 <Moon className="w-4 h-4 mr-3 text-slate-400" />
                 Koyu Mod
               </CommandItem>
               <CommandItem onSelect={() => runCommand(() => { localStorage.setItem('theme', 'light'); window.dispatchEvent(new Event('themeChange')); })}>
                 <Sun className="w-4 h-4 mr-3 text-slate-400" />
                 Açık Mod
               </CommandItem>
            </Command.Group>

          </Command.List>

          <div className="border-t border-gray-100 dark:border-slate-800 p-2 bg-gray-50/50 dark:bg-slate-900/50 flex items-center justify-between text-[10px] text-gray-400 px-4">
             <div>
                <span className="font-semibold text-indigo-500">İpucu:</span> Yazmaya başlayın, "Görev Oluştur" seçeneği otomatik çıkacaktır.
             </div>
             <div className="flex gap-2">
                 <span>Seç</span> <kbd className="font-sans bg-white dark:bg-slate-800 border dark:border-slate-700 px-1 rounded">↵</kbd>
             </div>
          </div>

        </Command>
      </div>
    </div>
  );
}

function CommandItem({ children, onSelect }) {
  return (
    <Command.Item 
      onSelect={onSelect}
      className="flex items-center px-4 py-3 text-sm text-gray-700 dark:text-gray-200 rounded-lg cursor-pointer aria-selected:bg-indigo-50 aria-selected:text-indigo-700 dark:aria-selected:bg-indigo-900/30 dark:aria-selected:text-indigo-200 transition-all select-none"
    >
      {children}
    </Command.Item>
  );
}
