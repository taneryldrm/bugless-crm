import React, { useState, useEffect } from 'react';
import { X, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function PaymentModal({ isOpen, onClose, customer, onConfirm }) {
  const [amount, setAmount] = useState('');

  useEffect(() => {
    if (isOpen && customer) {
        setAmount(customer.totalRemaining > 0 ? customer.totalRemaining.toString() : '0');
    }
  }, [isOpen, customer]);

  if (!isOpen || !customer) return null;

  const handleSubmit = (e) => {
      e.preventDefault();
      
      // Handle Turkish number format (e.g., "150.000" -> "150000")
      const cleanAmount = amount.toString().replace(/\./g, '').replace(',', '.');
      const val = parseFloat(cleanAmount);

      if (isNaN(val) || val <= 0) {
          alert('Geçerli bir tutar giriniz.');
          return;
      }
      onConfirm(val);
      onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-md border border-gray-200 dark:border-slate-800">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-slate-800">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Tahsilat Al</h2>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">{customer.name}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <X className="w-5 h-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700 dark:text-slate-300">
                    Tutar (Kalan: ₺{customer.totalRemaining.toLocaleString('tr-TR', {minimumFractionDigits: 2})})
                </label>
                <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-slate-400">₺</span>
                    <input 
                        type="text" 
                        placeholder="Örn: 150.000"
                        className="w-full pl-8 pr-4 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 bg-white dark:bg-slate-950 text-gray-900 dark:text-white"
                        value={amount}
                        onChange={e => setAmount(e.target.value)}
                        autoFocus
                    />
                </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="ghost" onClick={onClose} className="text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800">İptal</Button>
                <Button type="submit" className="bg-green-600 hover:bg-green-700 text-white gap-2 shadow-green-200 dark:shadow-green-900/40">
                    <Wallet className="w-4 h-4" />
                    Tahsil Et
                </Button>
            </div>
        </form>
      </div>
    </div>
  );
}
