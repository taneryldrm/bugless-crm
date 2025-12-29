import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import { Bell, Search, Check, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useSupabaseAuth } from '@/context/SupabaseAuthContext';
import { useNotifications } from '@/context/NotificationContext';
import { CommandCenter } from '@/components/CommandCenter';

export default function MainLayout() {
  const { user, role, isAdmin } = useSupabaseAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications(); 
  const [searchTerm, setSearchTerm] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Close notifications when route changes
  useEffect(() => {
    setShowNotifications(false);
  }, [location.pathname]);

  // Debounce Live Search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm.trim()) {
        navigate(`/search?q=${encodeURIComponent(searchTerm.trim())}`);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm, navigate]);

  // Clear search bar when leaving search page
  useEffect(() => {
      if (location.pathname !== '/search') {
          setSearchTerm('');
      } else {
          // Optional: Sync bar with URL if directly loading /search? (Might loop if not careful, skipping for now to keep it simple)
      }
  }, [location.pathname]);

  const handleImmediateSearch = () => {
    if (searchTerm.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchTerm.trim())}`);
    }
  };
  
  // Initialize Theme
  // Initialize and Sync Theme
  useEffect(() => {
    const applyTheme = () => {
        const theme = localStorage.getItem('theme') || 'light';
        if (theme === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
    };

    applyTheme(); // Initial check
    
    window.addEventListener('themeChange', applyTheme);
    return () => window.removeEventListener('themeChange', applyTheme);
  }, []);

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Sümeyye Şencan';
  const displayRole = role || (isAdmin ? 'Yönetici' : 'Çalışan');

  return (
    <div className="flex min-h-screen bg-[#F8F9FC] dark:bg-[#020617] transition-colors duration-300">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white dark:bg-[#0F172A] border-b border-gray-200 dark:border-slate-800 px-8 flex items-center justify-between sticky top-0 z-10 transition-colors duration-300">
          <div className="flex-1 max-w-xl">
             <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                <input 
                  type="text" 
                  readOnly
                  placeholder="Proje, görev veya kişi ara... (Ctrl + K)" 
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-slate-900 border-none rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none text-gray-900 dark:text-gray-100 placeholder-gray-400 transition-colors cursor-pointer"
                  onClick={() => window.dispatchEvent(new CustomEvent('open-command-center'))}
                  onFocus={() => window.dispatchEvent(new CustomEvent('open-command-center'))}
                />
             </div>
          </div>

          <div className="flex items-center gap-4 ml-4">
             {/* Notification Bell */}
             <div className="relative">
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="relative text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                    onClick={() => setShowNotifications(!showNotifications)}
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full border-2 border-white dark:border-[#0F172A]">
                          {unreadCount}
                      </span>
                  )}
                </Button>
                
                {/* Notification Dropdown */}
                {showNotifications && (
                    <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} /> {/* Backdrop to close */}
                    <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-gray-200 dark:border-slate-800 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                      <div className="p-4 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50/50 dark:bg-slate-950/50 backdrop-blur-sm">
                          <span className="font-semibold text-gray-900 dark:text-white text-sm">Bildirimler</span>
                          {unreadCount > 0 && (
                              <button onClick={markAllAsRead} className="text-xs text-primary hover:text-primary/80 font-medium transition-colors">
                                  Tümünü Oku
                              </button>
                          )}
                      </div>
                      <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                          {notifications.length === 0 ? (
                              <div className="p-12 text-center">
                                  <Bell className="w-8 h-8 text-gray-200 dark:text-slate-700 mx-auto mb-3" />
                                  <p className="text-gray-500 dark:text-slate-500 text-sm">Henüz bildiriminiz yok.</p>
                              </div>
                          ) : (
                              <div className="divide-y divide-gray-50 dark:divide-slate-800">
                                {notifications.map(n => (
                                    <div 
                                        key={n.id} 
                                        onClick={() => { 
                                            markAsRead(n.id); 
                                            if(n.link) {
                                                navigate(n.link);
                                                setShowNotifications(false);
                                            }
                                        }}
                                        className={`p-4 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer relative group ${!n.is_read ? 'bg-blue-50/40 dark:bg-blue-900/10' : ''}`}
                                    >
                                        <div className="flex gap-3 items-start">
                                          <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 transition-colors ${!n.is_read ? 'bg-blue-600 shadow-sm shadow-blue-500/50' : 'bg-gray-200 dark:bg-slate-700'}`} />
                                          <div className="flex-1 min-w-0">
                                              <p className={`text-sm mb-0.5 ${!n.is_read ? 'font-semibold text-gray-900 dark:text-white' : 'font-medium text-gray-700 dark:text-slate-300'}`}>
                                                  {n.title}
                                              </p>
                                              <p className="text-xs text-gray-500 dark:text-slate-500 line-clamp-2 leading-relaxed">
                                                  {n.message}
                                              </p>
                                              <p className="text-[10px] text-gray-400 dark:text-slate-600 mt-1.5 font-medium">
                                                  {new Date(n.created_at).toLocaleDateString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                                              </p>
                                          </div>
                                        </div>
                                    </div>
                                ))}
                              </div>
                          )}
                      </div>
                    </div>
                    </>
                )}
             </div>
             <div className="flex items-center gap-3 pl-4 border-l border-gray-200 dark:border-slate-800">
                <div className="text-right hidden md:block">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-200">{userName}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{displayRole}</p>
                </div>
                <div className="w-9 h-9 rounded-full bg-purple-600 text-white flex items-center justify-center font-medium shadow-sm">
                  {userName.substring(0,2).toUpperCase()}
                </div>
             </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-auto p-8">
          <Outlet />
        </div>
      </main>
      <CommandCenter />
    </div>
  );
}
