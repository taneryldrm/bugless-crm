import React, { useState } from 'react';
import { X, Folder, Calendar, CheckCircle2, LayoutDashboard, Book } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';


export default function ClientDetailModal({ isOpen, onClose, client }) {
  const [activeTab, setActiveTab] = useState('overview');

  if (!isOpen || !client) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-2xl h-[80vh] flex flex-col border border-slate-200 dark:border-slate-800 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-slate-800">
          <div>
            <h2 className="text-xl font-black text-gray-900 dark:text-white">{client.name}</h2>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">{client.company || 'Bireysel Müşteri'}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 px-6 border-b border-gray-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
            {[
                { id: 'overview', label: 'Genel Bakış', icon: LayoutDashboard },

            ].map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={cn(
                            "flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all relative",
                            isActive ? "text-blue-600 dark:text-blue-400" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                        )}
                    >
                        <Icon className="w-4 h-4" />
                        {tab.label}
                        {isActive && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 dark:bg-blue-400 rounded-t-full" />}
                    </button>
                )
            })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
            <div className="space-y-8 animate-in fade-in duration-300">
              <div className="flex items-center gap-4">
                 <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center text-white text-xl font-black shadow-lg shadow-blue-500/20">
                   {client.name.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase()}
                 </div>
                 <div className="flex-1">
                   <div className="flex items-center justify-between">
                     <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Müşteri Kartı</p>
                     <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-blue-100 dark:bg-blue-900/30 text-blue-600 uppercase">
                        {client.status}
                     </span>
                   </div>
                   <h3 className="text-xl font-black text-gray-900 dark:text-white">{client.name}</h3>
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-6 p-4 bg-gray-50 dark:bg-slate-800/50 rounded-2xl border border-gray-100 dark:border-slate-800">
                 <div>
                   <p className="text-xs font-bold text-gray-400 uppercase mb-1">E-posta</p>
                   <p className="font-semibold text-gray-900 dark:text-white">{client.email || '-'}</p>
                 </div>
                 <div>
                   <p className="text-xs font-bold text-gray-400 uppercase mb-1">Telefon</p>
                   <p className="font-semibold text-gray-900 dark:text-white">{client.phone}</p>
                 </div>
              </div>

              <div>
                 <div className="flex items-center gap-2 mb-4 text-gray-900 dark:text-white font-bold">
                   <Folder className="w-5 h-5 text-blue-500" />
                   Aktif Projeler
                 </div>
                 <div className="border border-gray-100 dark:border-slate-800 rounded-2xl p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-all cursor-pointer group shadow-sm">
                    <div className="flex items-center gap-4">
                       <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
                         <Folder className="w-5 h-5" />
                       </div>
                       <div>
                         <p className="font-bold text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors">Kurumsal Website</p>
                         <p className="text-xs text-gray-500 dark:text-slate-400">Son Güncelleme: 10.10.2025</p>
                       </div>
                    </div>
                    <span className="px-3 py-1 bg-black dark:bg-slate-700 text-white text-[10px] font-black rounded-lg uppercase">
                      tamamlandı
                    </span>
                 </div>
              </div>
            </div>
        </div>
      </div>
    </div>
  );
}
