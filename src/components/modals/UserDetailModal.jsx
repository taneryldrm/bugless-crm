import React, { useState } from 'react';
import { X, Eye, LayoutDashboard, Book, User, Shield, CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';


export default function UserDetailModal({ isOpen, onClose, user }) {
  const [activeTab, setActiveTab] = useState('overview');

  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-lg h-[80vh] flex flex-col border border-slate-200 dark:border-slate-800 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-slate-800">
          <div>
            <h2 className="text-xl font-black text-gray-900 dark:text-white">Personel Kartı</h2>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Sistem üzerindeki yetki ve bilgiler</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 dark:hover:bg-slate-800">
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 px-6 border-b border-gray-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
            {[
                { id: 'overview', label: 'Profil', icon: User },

            ].map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={cn(
                            "flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all relative",
                            isActive ? "text-purple-600 dark:text-purple-400" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                        )}
                    >
                        <Icon className="w-4 h-4" />
                        {tab.label}
                        {isActive && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-purple-600 dark:bg-purple-400 rounded-t-full" />}
                    </button>
                )
            })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
            <div className="space-y-8 animate-in fade-in duration-300">
              {/* Header Profile Section */}
              <div className="flex items-center gap-6">
                <div className={cn("w-20 h-20 rounded-2xl flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-purple-500/20", user.avatarColor || 'bg-purple-600')}>
                  {user.name.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-2xl font-black text-gray-900 dark:text-white">{user.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                      <span className={cn(
                          "inline-flex items-center px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider",
                          user.role === 'Yönetici' ? "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400" : "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                      )}>
                          {user.role}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-black bg-gray-900 dark:bg-slate-700 text-white uppercase tracking-wider">
                         {user.status || 'Aktif'}
                      </span>
                  </div>
                </div>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-x-8 gap-y-6 p-6 bg-gray-50 dark:bg-slate-800/50 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                    <User className="w-3 h-3" /> Ad Soyad
                  </p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">{user.name}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                    <Shield className="w-3 h-3" /> E-posta
                  </p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white break-words">{user.email}</p>
                </div>

                <div className="col-span-2">
                   <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                    <CreditCard className="w-3 h-3" /> IBAN Bilgisi
                   </p>
                   <p className="text-sm font-bold text-gray-900 dark:text-white font-mono">{user.iban || '-'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="p-4 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl">
                   <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Kayıt Tarihi</p>
                   <p className="font-bold text-gray-900 dark:text-white">{user.registrationDate || '21.11.2025'}</p>
                </div>
                <div className="p-4 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl">
                   <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Adres Bilgisi</p>
                   <p className="font-bold text-gray-900 dark:text-white text-xs truncate uppercase">{user.address || '-'}</p>
                </div>
              </div>
            </div>
        </div>
      </div>
    </div>
  );
}
