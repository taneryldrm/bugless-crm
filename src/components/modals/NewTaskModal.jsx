import React, { useState } from 'react';
import { X, Clock, CheckCircle2, Briefcase, User, Coffee } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

// Fallback if not passed
const DEFAULT_TYPES = {
  meeting: { label: 'Toplantı', color: 'bg-indigo-100 text-indigo-700 border-indigo-200', icon: Briefcase },
  task: { label: 'Görev', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: CheckCircle2 },
  personal: { label: 'Kişisel', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: User },
  break: { label: 'Mola', color: 'bg-orange-100 text-orange-700 border-orange-200', icon: Coffee },
};

export default function NewTaskModal({ isOpen, onClose, date, onAdd, taskTypes = DEFAULT_TYPES }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    time: '09:00',
    priority: 'Normal',
    type: 'task'
  });

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onAdd({
      ...formData,
      date: date
    });
    setFormData({ title: '', description: '', time: '09:00', priority: 'Normal', type: 'task' });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-lg animate-in fade-in zoom-in-95 duration-200 overflow-hidden border border-gray-100 dark:border-slate-800">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/50">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Yeni Etkinlik Ekle</h2>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">{date} tarihinde planla</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-white dark:hover:bg-slate-800">
            <X className="w-5 h-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          
          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-gray-700 dark:text-slate-300">Başlık</label>
            <input 
              required
              type="text" 
              placeholder="Örn: Pazarlama Toplantısı"
              className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm font-medium text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-600"
              value={formData.title}
              onChange={e => setFormData({...formData, title: e.target.value})}
              autoFocus
            />
          </div>

          {/* Type Selection */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-gray-700 dark:text-slate-300">Etkinlik Tipi</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {Object.entries(taskTypes).map(([key, type]) => {
                    const Icon = type.icon;
                    const isSelected = formData.type === key;
                    // Extract color classes safely
                    let baseColor = type.color.split(' ')[1] || 'text-gray-700';
                    let activeBg = type.color.split(' ')[0] || 'bg-gray-100';
                    
                    // Dark mode adjustments for active state
                    if (isSelected) {
                        // The default color strings already have dark: classes in CalendarPage definition?
                        // "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300..."
                        // We can just use the provided className string since it's comprehensive
                        // But wait, the `cn` below constructs it.
                        // Actually the `taskTypes` prop passed from `Calendar.jsx` HAS dark classes.
                        // But here we might need to handle the unselected state properly.
                    }
                    
                    return (
                        <button
                           key={key}
                           type="button"
                           onClick={() => setFormData({...formData, type: key})}
                           className={cn(
                               "flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition-all text-xs font-medium",
                               isSelected 
                                 ? cn(type.color, "border-current ring-1 ring-offset-1 ring-current bg-opacity-100") 
                                 : "bg-white dark:bg-slate-950 border-gray-200 dark:border-slate-800 text-gray-500 dark:text-slate-500 hover:bg-gray-50 dark:hover:bg-slate-800"
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
                <div className="relative">
                  <input 
                    type="time" 
                    className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm text-gray-900 dark:text-white [color-scheme:light] dark:[color-scheme:dark]"
                    value={formData.time}
                    onChange={e => setFormData({...formData, time: e.target.value})}
                  />
                  <Clock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-slate-500 pointer-events-none" />
                </div>
              </div>

              {/* Priority */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700 dark:text-slate-300">Öncelik</label>
                <select
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm text-gray-900 dark:text-white"
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
            <label className="text-sm font-semibold text-gray-700 dark:text-slate-300">Açıklama (Opsiyonel)</label>
            <textarea
              rows={3}
              placeholder="Detaylar..."
              className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-600"
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
            />
          </div>

          <div className="pt-4 flex gap-3 justify-end border-t border-gray-100 dark:border-slate-800 mt-6">
            <Button 
              type="button" 
              variant="secondary"
              onClick={onClose}
              className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300"
            >
              İptal
            </Button>
            <Button 
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200 dark:shadow-indigo-900/40"
            >
              Etkinlik Oluştur
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
