import React, { useState, useEffect } from 'react';
import { X, Check, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';

export default function CreateExternalTaskModal({ isOpen, onClose, onCreate, initialData, availablePersonnel = [] }) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    assignees: [], // ID Array
    dueDate: "",
    status: "beklemede",
    priority: "orta"
  });

  const isEdit = !!initialData;
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false);
  const dropdownRef = React.useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowAssigneeDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        // Handle assigned_to (IDs from DB)
        const initialAssignees = Array.isArray(initialData.assigned_to) ? initialData.assigned_to : [];

        setFormData({
            title: initialData.title || "",
            description: initialData.description || "",
            assignees: initialAssignees,
            dueDate: initialData.due_date ? initialData.due_date.substring(0, 10) : "",
            status: initialData.status ? initialData.status.toLowerCase() : "beklemede",
            priority: initialData.priority ? initialData.priority.toLowerCase() : "orta"
        });
      } else {
        setFormData({
            title: "",
            description: "",
            assignees: [],
            dueDate: "",
            status: "beklemede",
            priority: "orta"
        });
      }
      setShowAssigneeDropdown(false);
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onCreate(formData);
    onClose();
  };

  const toggleAssignee = (id) => {
      if (formData.assignees.includes(id)) {
          setFormData({
              ...formData,
              assignees: formData.assignees.filter(a => a !== id)
          });
      } else {
          setFormData({
              ...formData,
              assignees: [...formData.assignees, id]
          });
      }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] border border-gray-100 dark:border-slate-800">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-slate-800 shrink-0">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{isEdit ? 'Görevi Düzenle' : 'Yeni Görev Ekle'}</h2>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">{isEdit ? 'Görev bilgilerini güncelleyin' : 'Yeni bir harici görev oluşturun'}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <form id="create-external-task-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-gray-700 dark:text-slate-300">Görev Başlığı *</label>
              <input 
                required
                type="text" 
                placeholder="Örn: Ofis Temizliği"
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all text-sm bg-white dark:bg-slate-950 text-gray-900 dark:text-white"
                value={formData.title}
                onChange={e => setFormData({...formData, title: e.target.value})}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-gray-700 dark:text-slate-300">Açıklama</label>
              <textarea
                rows={3} 
                placeholder=""
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all resize-none text-sm bg-white dark:bg-slate-950 text-gray-900 dark:text-white"
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
              />
            </div>

            <div className="space-y-1.5 relative">
               <label className="text-sm font-semibold text-gray-700 dark:text-slate-300">Atama</label>
               
               <div className="relative" ref={dropdownRef}>
                  <div 
                      className="w-full px-3 py-2.5 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950 flex items-center justify-between cursor-pointer min-h-[42px] hover:border-purple-400 transition-colors"
                      onClick={() => setShowAssigneeDropdown(!showAssigneeDropdown)}
                  >
                        <span className="text-sm text-gray-700 dark:text-slate-300 truncate select-none">
                            {formData.assignees.length > 0 
                                ? formData.assignees.map(id => availablePersonnel.find(p => p.id === id)?.full_name || '...').join(', ') 
                                : <span className="text-gray-400 dark:text-slate-500">Kişi seçiniz...</span>}
                        </span>
                        <div className="flex items-center gap-2">
                             {formData.assignees.length > 0 && (
                                 <span className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs px-2 py-0.5 rounded-full font-medium">
                                     {formData.assignees.length}
                                 </span>
                             )}
                             <UserPlus className="w-4 h-4 text-gray-400 dark:text-slate-500" />
                        </div>
                  </div>

                  {showAssigneeDropdown && (
                       <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg shadow-xl max-h-56 overflow-y-auto z-50">
                            {availablePersonnel.map((person) => (
                                <div 
                                    key={person.id} 
                                    className="flex items-center px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-slate-800 cursor-pointer border-b border-gray-50 dark:border-slate-800 last:border-0 text-gray-700 dark:text-slate-300"
                                    onClick={() => toggleAssignee(person.id)}
                                >
                                    <div className={cn(
                                        "w-4 h-4 border rounded mr-3 flex items-center justify-center transition-all",
                                        formData.assignees.includes(person.id) 
                                           ? "bg-purple-600 border-purple-600" 
                                           : "border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                                    )}>
                                        {formData.assignees.includes(person.id) && <Check className="w-3 h-3 text-white" />}
                                    </div>
                                    <span className="text-sm font-medium">{person.full_name}</span>
                                </div>
                            ))}
                            
                            {availablePersonnel.length === 0 && (
                                <div className="px-3 py-4 text-sm text-gray-500 dark:text-slate-400 text-center">
                                    Personel bulunamadı.
                                </div>
                            )}
                       </div>
                  )}
               </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700 dark:text-slate-300">Durum *</label>
                <select
                  className="w-full px-3 py-2.5 border border-gray-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all bg-white dark:bg-slate-950 text-gray-900 dark:text-white text-sm"
                  value={formData.status}
                  onChange={e => setFormData({...formData, status: e.target.value})}
                >
                  <option value="beklemede">beklemede</option>
                  <option value="devam ediyor">devam ediyor</option>
                  <option value="tamamlandi">tamamlandı</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700 dark:text-slate-300">Öncelik *</label>
                <select
                  className="w-full px-3 py-2.5 border border-gray-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all bg-white dark:bg-slate-950 text-gray-900 dark:text-white text-sm"
                  value={formData.priority}
                  onChange={e => setFormData({...formData, priority: e.target.value})}
                >
                  <option value="düşük">düşük</option>
                  <option value="orta">orta</option>
                  <option value="yüksek">yüksek</option>
                </select>
              </div>
              <div className="space-y-1.5 md:col-span-1 col-span-2">
                  <label className="text-sm font-semibold text-gray-700 dark:text-slate-300">Bitiş Tarihi</label>
                  <div className="relative">
                      <input 
                        type="date"
                        className="w-full px-3 py-2.5 border border-gray-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all text-sm bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                        value={formData.dueDate}
                        onChange={e => setFormData({...formData, dueDate: e.target.value})}
                      />
                  </div>
               </div>
            </div>
            
            <div className="h-6"></div>
          </form>
        </div>

        <div className="p-6 border-t border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/50 shrink-0 flex justify-end gap-3 rounded-b-xl">
          <Button 
            type="button" 
            variant="secondary"
            onClick={onClose}
            className="bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-600 text-gray-700 dark:text-white px-6"
          >
            İptal
          </Button>
          <Button 
            type="submit"
            form="create-external-task-form"
            className={cn(
                "px-6 font-bold text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 bg-[#8b5cf6] hover:bg-[#7c3aed] shadow-purple-200 dark:shadow-purple-900/40 focus:ring-purple-500"
            )}
          >
            {isEdit ? 'Güncelle' : 'Ekle'} 
          </Button>
        </div>
      </div>
    </div>
  );
}
