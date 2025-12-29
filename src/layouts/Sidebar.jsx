import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { useSupabaseAuth } from '@/context/SupabaseAuthContext';
import {
  LayoutGrid,
  Users,
  FolderKanban,
  UserCircle,
  ClipboardList,
  Wallet,
  Briefcase,
  Share2,
  DollarSign,
  BarChart3,
  Calendar,
  Shield,
  Settings,
  LogOut,
  Search,
  StickyNote,
  FileText,
  Book
} from 'lucide-react';

const menuItems = [
  { icon: LayoutGrid, label: 'Ana Sayfa', path: '/' },
  { icon: Users, label: 'Müşteriler', path: '/clients' },
  { icon: FolderKanban, label: 'Projeler', path: '/projects' },
  { icon: FileText, label: 'Teklifler', path: '/proposals' },
  { icon: UserCircle, label: 'Personel', path: '/staff' },
  { icon: ClipboardList, label: 'İş Emirleri', path: '/work-orders' },
  { icon: Wallet, label: 'Beklenen Tahsilat', path: '/collections' },
  { icon: Briefcase, label: 'Harici Görevler', path: '/external-tasks' },
  { icon: Share2, label: 'Sosyal Medya', path: '/social' },
  { icon: DollarSign, label: 'Gelir & Gider', path: '/income-expense' },
  { icon: Wallet, label: 'Aylık Kasa', path: '/finance' },
  { icon: BarChart3, label: 'Raporlama', path: '/reports' },
  { icon: Calendar, label: 'Kişisel Takvim', path: '/calendar' },
  { icon: Shield, label: 'Kullanıcı Yönetimi', path: '/users' },
  { icon: StickyNote, label: 'Toplantı Notları', path: '/meeting-notes' },
  { icon: Search, label: 'Geçmiş Arama', path: '/search' },

  { icon: Settings, label: 'Ayarlar', path: '/settings' },
];

export default function Sidebar() {
  const location = useLocation();
  const { user, role, isAdmin, isManager, signOut: handleLogout } = useSupabaseAuth();
  
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Kullanıcı';
  const displayRole = role || (isAdmin ? 'Yönetici' : 'Mühendis');

  return (
    <div className="flex flex-col h-screen w-64 bg-white dark:bg-[#0F172A] border-r border-gray-200 dark:border-[#1E293B] sticky top-0 left-0 overflow-y-auto shadow-2xl transition-colors duration-300">
      <div className="p-6">
        <h1 className="text-2xl font-black bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 bg-clip-text text-transparent tracking-tight">Bugless<span className="text-indigo-600 dark:text-indigo-400">.</span></h1>
      </div>

      <div className="flex-1 px-4 space-y-2">
        
        {/* User Profile Card in Sidebar */}
        <div className="mb-8 bg-gray-50 dark:bg-white/5 backdrop-blur-sm border border-gray-200 dark:border-white/10 p-3 rounded-2xl flex items-center gap-3 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors cursor-pointer group">
           <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-indigo-500/30 group-hover:scale-105 transition-transform">
             {userName.substring(0,2).toUpperCase()}
           </div>
           <div className="overflow-hidden">
             <p className="text-sm font-semibold text-gray-900 dark:text-white truncate max-w-[120px]" title={userName}>{userName}</p>
             <p className="text-[10px] uppercase tracking-wider text-indigo-600 dark:text-indigo-300 font-medium">{displayRole}</p>
           </div>
        </div>

        {menuItems.filter(item => {
          // Hide finance for engineers
          if (!isManager && (item.path === '/income-expense' || item.path === '/finance' || item.path === '/collections')) return false;
          // Hide user management for engineers (optional but recommended)
          if (!isManager && item.path === '/users') return false;
          return true;
        }).map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200 group relative overflow-hidden",
                isActive 
                  ? "text-white shadow-lg shadow-indigo-500/25" 
                  : "text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-white/5"
              )}
            >
              {isActive && (
                 <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-violet-600 opacity-100" />
              )}
              
              <Icon className={cn("w-5 h-5 relative z-10", isActive ? "text-white" : "text-gray-400 dark:text-slate-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors")} />
              <span className="relative z-10">{item.label}</span>
            </Link>
          );
        })}
      </div>

      <div className="p-4 mt-auto border-t border-gray-100 dark:border-white/5">
        <Button 
          variant="ghost" 
          onClick={handleLogout}
          className="w-full justify-start gap-3 text-gray-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          Çıkış Yap
        </Button>
      </div>
    </div>
  );
}
