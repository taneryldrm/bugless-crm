import React, { useState } from 'react';
import { X, User, Book, Shield, CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';


export default function StaffDetailModal({ isOpen, onClose, staff }) {
  const [activeTab, setActiveTab] = useState('overview');

  if (!isOpen || !staff) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-lg h-[80vh] flex flex-col border border-slate-200 dark:border-slate-800 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-slate-800">
          <div>
            <h2 className="text-xl font-black text-gray-900 dark:text-white">Personel Detayı</h2>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Personel bilgilerini görüntüleyin</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
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
              <div className="flex items-center gap-6">
                <div className={cn("w-20 h-20 rounded-2xl flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-blue-500/20", staff.avatarColor || 'bg-blue-600')}>
                  {staff.name.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-2xl font-black text-gray-900 dark:text-white">{staff.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-[10px] font-black bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 uppercase tracking-wider">
                          {staff.role}
                      </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-x-8 gap-y-6 p-6 bg-gray-50 dark:bg-slate-800/50 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Ad Soyad</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">{staff.name}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">E-posta</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white break-words">{staff.email}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Rol</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white font-mono">{staff.role}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Kayıt Tarihi</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">{staff.joinedDate}</p>
                </div>
                <div className="col-span-2">
                   <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">IBAN Bilgisi</p>
                   <p className="text-sm font-bold text-gray-900 dark:text-white font-mono">{staff.iban || '-'}</p>
                </div>
                <div className="col-span-2">
                   <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Adres</p>
                   <p className="text-sm font-bold text-gray-900 dark:text-white uppercase">{staff.address || '-'}</p>
                </div>
              </div>
            </div>
        </div>
      </div>
    </div>
  );
}
