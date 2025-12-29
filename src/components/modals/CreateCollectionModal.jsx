import React, { useState, useEffect } from 'react';
import { X, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';

export default function CreateCollectionModal({ isOpen, onClose, onCreate, initialData }) {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    type: 'Aktif'
  });

  const isEditMode = !!initialData;

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        phone: initialData.phone || '',
        type: initialData.type || 'Aktif',
      });
    } else {
      setFormData({
        name: '',
        phone: '',
        type: 'Aktif',
      });
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onCreate(formData); // Parent will handle merging with ID if edit
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{isEditMode ? 'Müşteri Düzenle' : 'Yeni Müşteri Oluştur'}</h2>
            <p className="text-sm text-gray-500 mt-1">{isEditMode ? 'Müşteri bilgilerini güncelleyin' : 'Müşteri bilgilerini girin'}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          <div className="space-y-1.5">
             <label className="text-sm font-medium text-gray-700">Müşteri Adı *</label>
             <input 
                required
                type="text" 
                placeholder="Örn: Uçanlar Temizlik A.Ş."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
             />
          </div>

          <div className="space-y-1.5">
             <label className="text-sm font-medium text-gray-700">Telefon</label>
             <input 
                type="text" 
                placeholder="05XX XXX XX XX"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                value={formData.phone}
                onChange={e => setFormData({...formData, phone: e.target.value})}
             />
          </div>

          <div className="space-y-1.5">
             <label className="text-sm font-medium text-gray-700">Durum</label>
             <select 
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white"
                value={formData.type}
                onChange={e => setFormData({...formData, type: e.target.value})}
             >
                <option value="Aktif">Aktif</option>
                <option value="Pasif">Pasif</option>
                <option value="Sıkıntılı">Sıkıntılı</option>
             </select>
          </div>

          <div className="pt-4 flex gap-3 justify-end border-t border-gray-100 mt-6 shrink-0">
            <Button 
              type="button" 
              variant="secondary"
              onClick={onClose}
              className="bg-white border-gray-300 hover:bg-gray-50 text-gray-700"
            >
              İptal
            </Button>
            <Button 
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 shadow-blue-200"
              style={{ backgroundColor: '#6366f1' }}
            >
              {isEditMode ? 'Güncelle' : 'Oluştur'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
