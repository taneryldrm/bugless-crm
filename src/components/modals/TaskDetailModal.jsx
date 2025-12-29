import React, { useState, useEffect } from 'react';
import { X, Clock, Trash2, Edit3, CheckCircle2, Calendar, Briefcase, User, Coffee, PlayCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';

const DEFAULT_TYPES = {
  meeting: { label: 'Toplantı', color: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800', icon: Briefcase },
  task: { label: 'Görev', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800', icon: CheckCircle2 },
  personal: { label: 'Kişisel', color: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800', icon: User },
  break: { label: 'Mola', color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800', icon: Coffee },
};

export default function TaskDetailModal({ isOpen, onClose, task, onUpdate, onDelete }) {
  if (!isOpen || !task) return null;

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ ...task });

  // Update form data when task changes (e.g. switching between tasks)
  useEffect(() => {
    setFormData({ ...task });
  }, [task]);

  const handleSave = () => {
    onUpdate({ ...formData });
    setIsEditing(false);
    onClose();
  };

  const handleDelete = () => {
    if(window.confirm('Bu etkinliği silmek istediğinize emin misiniz?')) {
        onDelete(task);
        onClose();
    }
  };

  const currentType = DEFAULT_TYPES[task.type || 'task'] || DEFAULT_TYPES.task;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-transparent dark:border-slate-800"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/50">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{isEditing ? 'Etkinliği Düzenle' : 'Etkinlik Detayı'}</h2>
            {!isEditing && (
                <p className="text-sm text-gray-500 dark:text-slate-400 mt-1 flex items-center gap-2">
                    <Calendar className="w-4 h-4" /> {task.date || 'Tarih Yok'}
                </p>
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-slate-800">
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="p-6">
          {isEditing ? (
             <div className="space-y-5">
                {/* Title Input */}
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-700 dark:text-slate-300">Başlık</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm font-medium bg-white dark:bg-slate-950 text-gray-900 dark:text-white"
                    value={formData.title}
                    onChange={e => setFormData({...formData, title: e.target.value})}
                  />
                </div>

                {/* Type Selection */}
                <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-gray-700 dark:text-slate-300">Etkinlik Tipi</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {Object.entries(DEFAULT_TYPES).map(([key, type]) => {
                            const Icon = type.icon;
                            const isSelected = formData.type === key;
                            const baseColor = type.color.split(' ').find(c => c.startsWith('text-')) || 'text-gray-700';
                            const activeBg = type.color.split(' ').find(c => c.startsWith('bg-')) || 'bg-gray-100';
                            
                            return (
                                <button
                                   key={key}
                                   type="button"
                                   onClick={() => setFormData({...formData, type: key})}
                                   className={cn(
                                       "flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition-all text-xs font-medium",
                                       isSelected 
                                         ? cn(activeBg, baseColor, "border-current ring-1 ring-offset-1 ring-current") 
                                         : "bg-white dark:bg-slate-950 border-gray-200 dark:border-slate-800 text-gray-500 dark:text-slate-500 hover:bg-gray-50 dark:hover:bg-slate-900"
                                   )}
                                >
                                    <Icon className="w-5 h-5" />
                                    {type.label}
                                </button>
                            )
                        })}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    {/* Time */}
                    <div className="space-y-1.5">
                       <label className="text-sm font-semibold text-gray-700 dark:text-slate-300">Saat</label>
                       <input 
                         type="time" 
                         className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm bg-white dark:bg-slate-950 text-gray-900 dark:text-white"
                         value={formData.time}
                         onChange={e => setFormData({...formData, time: e.target.value})}
                       />
                    </div>

                    {/* Priority */}
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-gray-700 dark:text-slate-300">Öncelik</label>
                      <select
                        className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-white dark:bg-slate-950 text-gray-900 dark:text-white text-sm"
                        value={formData.priority}
                        onChange={e => setFormData({...formData, priority: e.target.value})}
                      >
                        <option value="Düşük">Düşük</option>
                        <option value="Normal">Normal</option>
                        <option value="Yüksek">Yüksek</option>
                        <option value="Acil">Acil</option>
                      </select>
                    </div>
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-700 dark:text-slate-300">Açıklama</label>
                  <textarea
                    rows={3}
                    className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none text-sm bg-white dark:bg-slate-950 text-gray-900 dark:text-white"
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                  />
                </div>

                <div className="flex gap-3 pt-4 border-t border-gray-100 dark:border-slate-800">
                     <Button 
                       variant="outline"
                       onClick={() => setIsEditing(false)}
                       className="flex-1 dark:border-slate-700 dark:text-slate-300"
                     >
                       İptal
                     </Button>
                     <Button 
                       onClick={handleSave}
                       className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200 dark:shadow-none"
                     >
                       Kaydet
                     </Button>
                </div>
             </div>
          ) : (
             <div className="space-y-8">
               
               {/* View Mode Header */}
               <div className="flex items-start gap-5">
                  <div className={cn(
                    "w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm border",
                    currentType.color
                  )}>
                    <currentType.icon className="w-7 h-7" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        <span className={cn("text-xs font-bold px-2 py-0.5 rounded uppercase tracking-wide", currentType.color.replace(/bg-\w+-\d+/g, '').replace(/text-\w+-\d+/g, '').replace(/border-\w+-\d+/g, ''), "bg-opacity-20 bg-current border-transparent")}>
                            {currentType.label}
                        </span>
                        <span className="text-xs font-medium px-2 py-0.5 rounded bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400 border border-gray-200 dark:border-slate-700">
                            {task.priority || 'Normal'}
                        </span>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">{task.title}</h3>
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-slate-400 mt-2 font-medium">
                       <Clock className="w-4 h-4 text-gray-400 dark:text-slate-500" />
                       {task.time}
                    </div>
                  </div>
               </div>

               {/* Description Box */}
               <div className="bg-gray-50/80 dark:bg-slate-800/50 rounded-2xl p-6 border border-gray-100/80 dark:border-slate-800/50">
                  <h4 className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-3">Açıklama</h4>
                  <p className="text-sm text-gray-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                    {task.description || 'Bu etkinlik için herhangi bir açıklama girilmemiş.'}
                  </p>
               </div>

               {/* Action Buttons */}
               <div className="space-y-3">
                   <div className="flex gap-3">
                      <Button 
                        variant="outline"
                        onClick={() => setIsEditing(true)}
                        className="flex-1 gap-2 hover:bg-gray-50 dark:hover:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300"
                      >
                        <Edit3 className="w-4 h-4" /> Düzenle
                      </Button>
                      <Button 
                        variant="danger"
                        onClick={handleDelete}
                        className="flex-1 gap-2 bg-white dark:bg-slate-900 text-red-600 dark:text-red-500 border border-red-100 dark:border-red-900/30 hover:bg-red-50 dark:hover:bg-red-900/50 hover:border-red-200 dark:hover:border-red-800 shadow-sm"
                      >
                        <Trash2 className="w-4 h-4" /> Sil
                      </Button>
                   </div>
                   
                   <Button 
                      onClick={() => {
                        onUpdate({ ...task, isCompleted: !task.isCompleted });
                        onClose();
                      }}
                      className={cn(
                        "w-full gap-2 py-6 text-base shadow-lg transition-all active:scale-[0.98]",
                        task.isCompleted 
                          ? "bg-white dark:bg-slate-800 border-2 border-gray-200 dark:border-slate-700 text-gray-500 dark:text-slate-400 hover:border-gray-300 dark:hover:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-800 shadow-none" 
                          : "bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-emerald-200 dark:shadow-none"
                      )}
                   >
                     {task.isCompleted ? (
                       <>
                         <PlayCircle className="w-5 h-5" /> Tekrar Aktif Et
                       </>
                     ) : (
                       <>
                         <CheckCircle2 className="w-5 h-5" /> Tamamlandı Olarak İşaretle
                       </>
                     )}
                   </Button>
               </div>
             </div>
          )}
        </div>
      </div>
    </div>
  );
}
