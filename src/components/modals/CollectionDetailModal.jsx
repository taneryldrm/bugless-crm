import React from 'react';
import { X, FolderKanban, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';

export default function CollectionDetailModal({ isOpen, onClose, customer }) {
  if (!isOpen || !customer) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col border border-gray-200 dark:border-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-slate-800 shrink-0">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{customer.name}</h2>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">{customer.phone}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto">
           {/* Summary Stats */}
           <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="bg-gray-50 dark:bg-slate-800 p-4 rounded-xl border border-gray-100 dark:border-slate-700">
                 <p className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">Toplam Anlaşılan</p>
                 <p className="text-lg font-bold text-gray-900 dark:text-white">₺{customer.totalAgreed?.toLocaleString('tr-TR') || '0'}</p>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl border border-green-100 dark:border-green-900/30">
                 <p className="text-xs font-medium text-green-700 dark:text-green-400 mb-1">Tahsil Edilen</p>
                 <p className="text-lg font-bold text-green-700 dark:text-green-400">₺{customer.totalPaid?.toLocaleString('tr-TR') || '0'}</p>
              </div>
              <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl border border-red-100 dark:border-red-900/30">
                 <p className="text-xs font-medium text-red-700 dark:text-red-400 mb-1">Kalan Bakiye</p>
                 <p className="text-lg font-bold text-red-700 dark:text-red-400">₺{customer.totalRemaining?.toLocaleString('tr-TR') || '0'}</p>
              </div>
           </div>

           {/* Projects List */}
           <div>
               <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-6 bg-blue-600 rounded-full"></div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Proje Detayları</h3>
               </div>
               
               <div className="space-y-3">
                  {customer.projects && customer.projects.length > 0 ? (
                      customer.projects.map((project) => (
                        <div key={project.id} className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg p-4 transition-shadow hover:shadow-sm">
                           <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                              <div className="flex items-center gap-3">
                                 <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg shrink-0">
                                    <FolderKanban className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                 </div>
                                 <div>
                                    <p className="font-medium text-gray-900 dark:text-white text-base">{project.name}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                       <span className="text-xs text-gray-500 dark:text-slate-400">Anlaşılan: ₺{project.agreed.toLocaleString('tr-TR')}</span>
                                       <span className="w-1 h-1 bg-gray-300 dark:bg-slate-600 rounded-full"></span>
                                       <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-slate-800 rounded text-gray-600 dark:text-slate-300 font-medium">{project.label}</span>
                                    </div>
                                 </div>
                              </div>
                           </div>
                           
                           <div className="flex items-center gap-4 text-sm border-t border-gray-50 dark:border-slate-800 pt-3">
                              <div className="flex-1">
                                 <div className="flex justify-between mb-1.5">
                                    <span className="text-xs text-gray-500 dark:text-slate-400">Tahsilat Durumu</span>
                                    <span className="text-xs font-medium text-gray-900 dark:text-white">%{(project.paid / project.agreed * 100).toFixed(0)}</span>
                                 </div>
                                 <div className="w-full bg-gray-100 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                                     <div 
                                       className="h-full bg-blue-600 rounded-full"
                                       style={{ width: `${(project.paid / project.agreed * 100)}%` }}
                                     ></div>
                                 </div>
                              </div>
                              
                              <div className="text-right pl-4 border-l border-gray-100 dark:border-slate-800">
                                 <p className="text-xs text-gray-500 dark:text-slate-400 mb-0.5">Kalan</p>
                                 <p className="text-red-600 dark:text-red-400 font-bold">₺{project.remaining.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</p>
                              </div>
                           </div>
                        </div>
                      ))
                  ) : (
                      <p className="text-gray-500 dark:text-slate-400 text-sm text-center py-4">Bu müşteriye ait proje bulunmamaktadır.</p>
                  )}
               </div>
           </div>
        </div>
      </div>
    </div>
  );
}
