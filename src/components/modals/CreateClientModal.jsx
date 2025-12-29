import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function CreateClientModal({ isOpen, onClose, onCreate, initialData }) {
  const [formData, setFormData] = useState({
      name: '',
      phone: '',
      email: '',
      address: '',
      status: 'Aktif',
      type: 'Normal',
      notes: ''
  });

  // Populate form when editing
  useEffect(() => {
      if (initialData) {
          setFormData({
              name: initialData.name || '',
              phone: initialData.phone || '',
              email: initialData.email || '',
              address: initialData.address || '',
              status: initialData.status || 'Aktif',
              type: initialData.type || 'Normal',
              notes: initialData.notes || ''
          });
      } else {
          // Reset form when creating new
          setFormData({
              name: '',
              phone: '',
              email: '',
              address: '',
              status: 'Aktif',
              type: 'Normal',
              notes: ''
          });
      }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
      e.preventDefault();
      if (!formData.name) {
          alert('Müşteri ismi zorunludur');
          return;
      }
      onCreate({ ...formData, id: initialData?.id });
      onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-lg border border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-slate-800">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {initialData ? 'Müşteri Düzenle' : 'Yeni Müşteri'}
            </h2>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                {initialData ? 'Müşteri bilgilerini güncelleyin' : 'Yeni bir müşteri kartı oluşturun'}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <X className="w-5 h-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700 dark:text-slate-300">Müşteri / Firma Adı</label>
                <input 
                    type="text" 
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600"
                    placeholder="Örn: Butik Ajans A.Ş."
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-700 dark:text-slate-300">Telefon</label>
                    <input 
                        type="text" 
                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600"
                        placeholder="05..."
                        value={formData.phone}
                        onChange={e => setFormData({...formData, phone: e.target.value})}
                    />
                </div>
                <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-700 dark:text-slate-300">Durum</label>
                    <select 
                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                        value={formData.status}
                        onChange={e => setFormData({...formData, status: e.target.value})}
                    >
                        <option value="Aktif">Aktif</option>
                        <option value="Pasif">Pasif</option>
                        <option value="Sıkıntılı">Sıkıntılı</option>
                    </select>
                </div>
            </div>

            <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700 dark:text-slate-300">E-posta</label>
                <input 
                    type="email" 
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600"
                    placeholder="deneme@sirket.com"
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                />
            </div>
            
            <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700 dark:text-slate-300">Adres</label>
                <textarea 
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600"
                    placeholder="Adres detayları..."
                    value={formData.address}
                    onChange={e => setFormData({...formData, address: e.target.value})}
                />
            </div>

            <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700 dark:text-slate-300">Notlar</label>
                <textarea 
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600"
                    placeholder="Müşteri hakkında notlar..."
                    value={formData.notes}
                    onChange={e => setFormData({...formData, notes: e.target.value})}
                />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-slate-800">
                <Button type="button" variant="ghost" onClick={onClose} className="text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800">İptal</Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white gap-2 shadow-blue-200 dark:shadow-blue-900/40">
                    <Save className="w-4 h-4" />
                    Kaydet
                </Button>
            </div>
        </form>
      </div>
    </div>
  );
}
