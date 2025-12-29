import React, { useState } from 'react';
import { X, Calendar, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Button } from '@/components/ui/Button';

export default function CreateFinanceModal({ isOpen, onClose, onCreate }) {
  const [formData, setFormData] = useState({
    type: 'income',
    amount: '',
    category: '',
    date: new Date().toISOString().split('T')[0], // YYYY-MM-DD for input type="date"
    project: 'general',
    payer: '',
    description: ''
  });

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Handle Turkish number format (e.g., "150.000" -> "150000")
    const cleanAmount = formData.amount.toString().replace(/\./g, '').replace(',', '.');
    const numericAmount = parseFloat(cleanAmount) || 0;

    onCreate({
      ...formData,
      amount: formData.type === 'expense' ? -Math.abs(numericAmount) : Math.abs(numericAmount)
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-800 transition-colors">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-slate-800">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Yeni Finans Kaydı</h2>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Gelir veya gider kaydı ekleyin</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 dark:hover:bg-slate-800">
            <X className="w-5 h-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-slate-300">Tür *</label>
              <select
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-white dark:bg-slate-950 text-gray-900 dark:text-white"
                value={formData.type}
                onChange={e => setFormData({...formData, type: e.target.value})}
              >
                <option value="income">Gelir</option>
                <option value="expense">Gider</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-slate-300">Tutar (₺) *</label>
              <input
                required
                type="text"
                placeholder="Örn: 150.000"
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-white dark:bg-slate-950 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-600"
                value={formData.amount}
                onChange={e => setFormData({...formData, amount: e.target.value})}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-slate-300">
                  {formData.type === 'income' ? 'Müşteri / Ödeyen' : 'Muhatap / Kime'}
              </label>
              <input
                type="text"
                placeholder={formData.type === 'income' ? 'Örn: Ahmet Yılmaz' : 'Örn: Trendyol Mağazası'}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-white dark:bg-slate-950 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-600"
                value={formData.payer}
                onChange={e => setFormData({...formData, payer: e.target.value})}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-slate-300">Kategori *</label>
              <input
                required
                type="text"
                placeholder="Proje Ödemesi, Maaş, vs."
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-white dark:bg-slate-950 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-600"
                value={formData.category}
                onChange={e => setFormData({...formData, category: e.target.value})}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-slate-300">Tarih *</label>
              <input
                required
                type="date"
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-white dark:bg-slate-950 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-600"
                value={formData.date}
                onChange={e => setFormData({...formData, date: e.target.value})}
              />
            </div>
          </div>

          <div className="space-y-1.5">
             <label className="text-sm font-medium text-gray-700 dark:text-slate-300">Proje</label>
             <select
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-white dark:bg-slate-950 text-gray-900 dark:text-white"
                value={formData.project}
                onChange={e => setFormData({...formData, project: e.target.value})}
             >
                <option value="general">Genel</option>
                <option value="crm">CRM Geliştirme</option>
                <option value="ecommerce">E-Ticaret Sitesi</option>
                <option value="social">Sosyal Medya Yönetimi</option>
                <option value="ads">Meta Reklam Yönetimi</option>
             </select>
          </div>

          <div className="space-y-1.5">
             <label className="text-sm font-medium text-gray-700 dark:text-slate-300">Açıklama</label>
             <textarea
                rows={3}
                placeholder="Detaylı açıklama..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none bg-white dark:bg-slate-950 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-600"
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
             />
          </div>

          <div className="pt-4 flex gap-3 justify-end border-t border-gray-100 dark:border-slate-800 mt-6">
            <Button 
              type="button" 
              variant="secondary"
              onClick={onClose}
              className="bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200"
            >
              İptal
            </Button>
            <Button 
              type="submit"
              className="bg-[#8b5cf6] hover:bg-[#7c3aed] shadow-purple-200"
            >
              Kaydet
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
