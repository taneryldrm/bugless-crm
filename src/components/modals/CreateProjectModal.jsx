import React, { useState, useEffect } from 'react';
import { X, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';

export default function CreateProjectModal({ isOpen, onClose, onSubmit }) {
  const [availablePersonnel, setAvailablePersonnel] = useState([]);
  const [availableClients, setAvailableClients] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    
    const fetchData = async () => {
        setLoading(true);
        try {
            const { data: clients } = await supabase.from('clients').select('id, name').order('name');
            const { data: profiles } = await supabase.from('profiles').select('id, full_name').order('full_name');
            
            setAvailableClients(clients || []);
            setAvailablePersonnel(profiles || []);
        } catch (e) {
            console.error("Fetch modal data error:", e);
        } finally {
            setLoading(false);
        }
    };
    
    fetchData();
  }, [isOpen]);

  const [formData, setFormData] = useState({
    name: "",
    customer: "",
    customerId: "",
    description: "",
    status: "Hazırlık",
    priority: "Normal",
    startDate: new Date().toISOString().split('T')[0],
    endDate: "",
    assignee: "",
    team: [], // List of assigned personnel
    links: [],
    price: "0.00"
  });

  const [linkInput, setLinkInput] = useState({ label: '', url: '' });

  const handleAddLink = () => {
    if (linkInput.label && linkInput.url) {
      setFormData({ ...formData, links: [...(formData.links || []), linkInput] });
      setLinkInput({ label: '', url: '' });
    }
  };

  const removeLink = (index) => {
    const newLinks = [...formData.links];
    newLinks.splice(index, 1);
    setFormData({ ...formData, links: newLinks });
  };

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.customerId) {
        alert("Lütfen bir müşteri seçiniz.");
        return;
    }
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900 z-10">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Yeni Proje Oluştur</h2>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Proje bilgilerini girin</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <X className="w-5 h-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700 dark:text-slate-300">Proje Adı *</label>
            <input 
              required
              type="text" 
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700 dark:text-slate-300">Müşteri *</label>
            <select
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
              value={formData.customerId}
              onChange={e => {
                  const client = availableClients.find(c => c.id === e.target.value);
                  setFormData({...formData, customerId: e.target.value, customer: client?.name || ''});
              }}
            >
              <option value="">{loading ? 'Yükleniyor...' : 'Müşteri Seçiniz...'}</option>
              {availableClients.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700 dark:text-slate-300">Açıklama</label>
            <textarea
              rows={3} 
              placeholder="Proje hakkında detaylı açıklama..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600"
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-slate-300">Durum</label>
              <select
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                value={formData.status}
                onChange={e => setFormData({...formData, status: e.target.value})}
              >
                <option value="Planlama">Planlama</option>
                <option value="Devam Ediyor">Devam Ediyor</option>
                <option value="Tamamlandı">Tamamlandı</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-slate-300">Öncelik</label>
              <select
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                value={formData.priority}
                onChange={e => setFormData({...formData, priority: e.target.value})}
              >
                <option value="düşük">düşük</option>
                <option value="orta">orta</option>
                <option value="yüksek">yüksek</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-slate-300">Başlangıç Tarihi</label>
              <input 
                type="date"
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                value={formData.startDate}
                onChange={e => setFormData({...formData, startDate: e.target.value})}
              />
            </div>
            <div className="space-y-1.5">
               <label className="text-sm font-medium text-gray-700 dark:text-slate-300">Bitiş Tarihi</label>
               <input 
                 type="date"
                 className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                 value={formData.endDate}
                 onChange={e => setFormData({...formData, endDate: e.target.value})}
               />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700 dark:text-slate-300">Proje Ekibi / Atanan Personeller</label>
            <div className="flex gap-2">
                <select
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                  onChange={(e) => {
                      if (e.target.value && !formData.team.includes(e.target.value)) {
                          setFormData({ ...formData, team: [...formData.team, e.target.value] });
                      }
                      e.target.value = ''; // Reset select
                  }}
                >
                  <option value="">{loading ? 'Yükleniyor...' : 'Personel Seçiniz...'}</option>
                  {availablePersonnel.map((p) => (
                      <option key={p.id} value={p.id}>{p.full_name}</option>
                  ))}
                </select>
            </div>
            
            {/* Selected Team Chips */}
            {formData.team.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2 p-2 bg-gray-50 dark:bg-slate-800/50 rounded-lg border border-gray-100 dark:border-slate-800">
                    {formData.team.map((memberId, idx) => {
                        const personnel = availablePersonnel.find(p => p.id === memberId);
                        return (
                          <div key={idx} className="flex items-center gap-1 bg-white dark:bg-slate-800 px-2 py-1 rounded-md border border-gray-200 dark:border-slate-700 text-sm text-gray-700 dark:text-slate-300 shadow-sm">
                              <span>{personnel?.full_name || 'Bilinmeyen'}</span>
                              <button 
                                  type="button" 
                                  onClick={() => setFormData({ ...formData, team: formData.team.filter(t => t !== memberId) })}
                                  className="text-gray-400 hover:text-red-500"
                              >
                                  <X className="w-3 h-3" />
                              </button>
                          </div>
                        );
                    })}
                </div>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700 dark:text-slate-300">Projeyi Kim Getirdi?</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
              value={formData.assignee}
              onChange={e => setFormData({...formData, assignee: e.target.value})}
            >
               <option value="">{loading ? 'Yükleniyor...' : 'Seçiniz...'}</option>
               {availablePersonnel.map((p) => (
                   <option key={p.id} value={p.id}>{p.full_name}</option>
               ))}
            </select>
          </div>

          <div className="space-y-2 pt-2 border-t border-gray-50 dark:border-slate-800">
             <label className="text-sm font-medium text-gray-700 dark:text-slate-300">Proje Dosyaları / Linkler</label>
             <div className="flex gap-2">
                 <input 
                   type="text" 
                   placeholder="Başlık (Örn: Figma)" 
                   className="w-1/3 px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600"
                   value={linkInput.label}
                   onChange={e => setLinkInput({...linkInput, label: e.target.value})}
                 />
                 <input 
                   type="url" 
                   placeholder="https://..." 
                   className="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600"
                   value={linkInput.url}
                   onChange={e => setLinkInput({...linkInput, url: e.target.value})}
                 />
                 <button 
                   type="button" 
                   onClick={handleAddLink}
                   className="px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-slate-900 rounded-lg text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-100"
                 >
                   Ekle
                 </button>
             </div>
             
             {formData.links && formData.links.length > 0 && (
                 <div className="space-y-2 mt-2">
                     {formData.links.map((link, idx) => (
                         <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-slate-800/50 rounded-lg border border-gray-100 dark:border-slate-800 text-sm">
                             <div className="flex items-center gap-2 overflow-hidden">
                                 <span className="font-semibold text-gray-700 dark:text-slate-300 whitespace-nowrap">{link.label}:</span>
                                 <a href={link.url} target="_blank" rel="noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline truncate">{link.url}</a>
                             </div>
                             <button type="button" onClick={() => removeLink(idx)} className="text-gray-400 hover:text-red-500">
                                 <X className="w-4 h-4" />
                             </button>
                         </div>
                     ))}
                 </div>
             )}
          </div>

          <div className="space-y-1.5">
             <label className="text-sm font-medium text-green-700 dark:text-green-500 flex items-center gap-1">
               ANLAŞILAN FİYAT (₺)
             </label>
             <input 
               type="text" 
               className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
               value={formData.price}
               onChange={e => setFormData({...formData, price: e.target.value})}
             />
          </div>

          <div className="pt-4 flex gap-3 justify-end border-t border-gray-100 dark:border-slate-800 mt-6">
            <Button 
              type="button" 
              variant="secondary"
              onClick={onClose}
              className="bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300"
            >
              İptal
            </Button>
            <Button 
              type="submit"
              className="bg-[#6366f1] hover:bg-[#4f46e5] shadow-indigo-200 dark:shadow-indigo-900/40 text-white"
            >
              Proje Oluştur
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
