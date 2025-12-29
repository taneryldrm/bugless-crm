import React, { useState, useEffect } from 'react';
import { X, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Button } from '@/components/ui/Button';

export default function CreateUserModal({ isOpen, onClose, onCreate, initialData }) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'Mühendis',
    team: 'Teknik Ekip',
    address: '',
    iban: '',
    status: 'Aktif',
    registrationDate: ''
  });

  const isEditMode = !!initialData;

  useEffect(() => {
    if (initialData) {
      setFormData({
        firstName: initialData.name.split(' ')[0] || '',
        lastName: initialData.name.split(' ').slice(1).join(' ') || '',
        email: initialData.email || '',
        password: '', // Don't prefill password
        role: initialData.role || 'Mühendis',
        team: initialData.team || 'Teknik Ekip',
        address: initialData.address || '',
        iban: initialData.iban || '',
        status: initialData.status || 'Aktif',
        registrationDate: initialData.registrationDate || ''
      });
    } else {
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        role: 'Mühendis',
        team: 'Teknik Ekip',
        address: '',
        iban: '',
        status: 'Aktif',
        registrationDate: ''
      });
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onCreate({
        ...formData,
        name: `${formData.firstName} ${formData.lastName}`,
        registrationDate: formData.registrationDate || format(new Date(), 'dd.MM.yyyy HH:mm')
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] border border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-slate-800 shrink-0">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{isEditMode ? 'Kullanıcı Düzenle' : 'Yeni Kullanıcı Oluştur'}</h2>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">{isEditMode ? 'Kullanıcı bilgilerini güncelleyin' : 'Kullanıcı bilgilerini girin'}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 dark:hover:bg-slate-800">
            <X className="w-5 h-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-slate-300">Ad *</label>
              <input 
                required
                type="text" 
                placeholder="Taner"
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-600"
                value={formData.firstName}
                onChange={e => setFormData({...formData, firstName: e.target.value})}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-slate-300">Soyad *</label>
              <input 
                required
                type="text" 
                placeholder="Yıldırım"
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-600"
                value={formData.lastName}
                onChange={e => setFormData({...formData, lastName: e.target.value})}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700 dark:text-slate-300">E-posta *</label>
            <input 
              required
              type="email" 
              placeholder="taneryk2022@gmail.com"
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-600"
              value={formData.email}
              onChange={e => setFormData({...formData, email: e.target.value})}
            />
            <div className="flex items-start gap-2 text-xs text-blue-600 dark:text-blue-400 mt-1">
              <Info className="w-4 h-4 shrink-0" />
              <span>Türkçe karakterler otomatik olarak Latin karakterlere dönüştürülecektir (örn: çağrı → cagri)</span>
            </div>
          </div>

          {!isEditMode && (
             <div className="space-y-1.5">
               <label className="text-sm font-medium text-gray-700 dark:text-slate-300">Şifre *</label>
               <input 
                 required
                 type="password" 
                 placeholder="En az 6 karakter"
                 className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-600"
                 value={formData.password}
                 onChange={e => setFormData({...formData, password: e.target.value})}
               />
             </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-slate-300">Rol *</label>
              <select 
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white dark:bg-slate-950 text-gray-900 dark:text-white"
                value={formData.role}
                onChange={e => setFormData({...formData, role: e.target.value})}
              >
                <option value="Admin">Admin</option>
                <option value="Yönetici">Yönetici</option>
                <option value="Mühendis">Mühendis</option>
              </select>
            </div>
            
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-slate-300">Ekip</label>
              <select 
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white dark:bg-slate-950 text-gray-900 dark:text-white"
                value={formData.team}
                onChange={e => setFormData({...formData, team: e.target.value})}
              >
                  <option value="Teknik Ekip">Teknik Ekip</option>
                  <option value="Yazılım Ekibi">Yazılım Ekibi</option>
                  <option value="Pazarlama Ekibi">Pazarlama Ekibi</option>
                  <option value="Satış Ekibi">Satış Ekibi</option>
                  <option value="Yönetim">Yönetim</option>
                  <option value="Diğer">Diğer</option>
              </select>
            </div>
          </div>

          {isEditMode && (
             <>
               <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700 dark:text-slate-300">Durum</label>
                  <div className="flex items-center gap-2 border border-gray-300 dark:border-slate-700 rounded-lg p-2 dark:bg-slate-950">
                      <button
                        type="button"
                        onClick={() => setFormData({...formData, status: formData.status === 'Aktif' ? 'Pasif' : 'Aktif'})}
                        className={cn(
                           "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 cursor-pointer dark:ring-offset-slate-900",
                           formData.status === 'Aktif' ? 'bg-black dark:bg-slate-700' : 'bg-gray-200 dark:bg-slate-700/50'
                        )}
                      >
                         <span
                            className={cn(
                               "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                               formData.status === 'Aktif' ? 'translate-x-6' : 'translate-x-1'
                            )}
                         />
                      </button>
                     <span className="text-sm font-medium text-gray-900 dark:text-white">{formData.status}</span>
                  </div>
               </div>
               
               <div className="space-y-1.5">
                 <label className="text-sm font-medium text-gray-700 dark:text-slate-300">Kayıt Tarihi</label>
                 <input 
                   disabled
                   type="text" 
                   className="w-full px-3 py-2 border border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800 rounded-lg text-gray-500 dark:text-slate-400 cursor-not-allowed"
                   value={formData.registrationDate || '21 Kasım 2025 07:49'}
                 />
               </div>
             </>
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700 dark:text-slate-300">Adres</label>
            <input 
              type="text" 
              placeholder="RAFET PAŞA MAHALLESİ..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-600"
              value={formData.address}
              onChange={e => setFormData({...formData, address: e.target.value})}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700 dark:text-slate-300">IBAN</label>
            <input 
              type="text" 
              placeholder="TR00 0000 0000 0000 0000 0000 00 (opsiyonel)"
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-600"
              value={formData.iban}
              onChange={e => setFormData({...formData, iban: e.target.value})}
            />
          </div>

          <div className="pt-4 flex gap-3 justify-end border-t border-gray-100 dark:border-slate-800 mt-6 shrink-0">
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
              className="bg-blue-600 hover:bg-blue-700 shadow-blue-200 dark:shadow-blue-900/40 text-white"
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
