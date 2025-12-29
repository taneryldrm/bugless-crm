import React, { useState, useEffect, useMemo } from 'react';
import { Search, ChevronDown, CheckCircle2, TrendingUp, TrendingDown, Wallet, Plus, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import CreateFinanceModal from '@/components/modals/CreateFinanceModal';
import { supabase } from '@/lib/supabase';
import { useSupabaseAuth } from '@/context/SupabaseAuthContext';

export default function IncomeExpense() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useSupabaseAuth();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('Tümü');

  const fetchTransactions = async () => {
      try {
          setLoading(true);
          const { data, error } = await supabase
              .from('transactions')
              .select(`
                  *,
                  projects (name)
              `)
              .order('date', { ascending: false });
          
          if (error) throw error;
          
          const mapped = data.map(t => ({
              ...t,
              project_name: t.projects?.name || 'Genel',
              amount: parseFloat(t.amount)
          }));
          setTransactions(mapped);
      } catch (e) {
          console.error(e);
      } finally {
          setLoading(false);
      }
  };

  useEffect(() => {
     if (user) fetchTransactions();
  }, [user]);

  // Statistics
  const totalIncome = transactions.filter(t => t.type === 'income').reduce((acc, curr) => acc + curr.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((acc, curr) => acc + curr.amount, 0);
  const netBalance = totalIncome - totalExpense;

  const stats = [
    { label: 'Toplam Gelir', value: totalIncome.toLocaleString('tr-TR'), icon: TrendingUp, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/20' },
    { label: 'Toplam Gider', value: totalExpense.toLocaleString('tr-TR'), icon: TrendingDown, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20' },
    { label: 'Net Bakiye', value: netBalance.toLocaleString('tr-TR'), icon: Wallet, color: netBalance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400', bg: 'bg-blue-50 dark:bg-blue-900/20' },
  ];

  // Debts (Cebinden)
  // Calculate debts based on transactions where method = 'Cebinden' (Expense)
  // And maybe we need to track if it's paid?
  // Schema has `is_paid` boolean.
  // Debt logic: Expense + Cebinden + is_paid=false => Debt.
  const debts = useMemo(() => {
     const debtMap = {};
     transactions.forEach(t => {
         if (t.type === 'expense' && t.method === 'Cebinden' && !t.is_paid) {
             const payer = t.payer || 'Bilinmiyor';
             if (!debtMap[payer]) debtMap[payer] = { name: payer, amount: 0, count: 0, items: [] };
             debtMap[payer].amount += t.amount;
             debtMap[payer].count += 1;
             debtMap[payer].items.push(t);
         }
     });
     return Object.values(debtMap);
  }, [transactions]);
  
  const totalDebt = debts.reduce((acc, g) => acc + g.amount, 0);

  const handleCreate = async (newFinance) => {
     try {
         // Resolve project
         // newFinance.project is generic text or ID? Modal likely sends string ID or code
         // If generic codes used in modal: 'general', 'crm' etc.
         // We should map them to actual Project IDs if possible, or just use null if 'Genel'.
         let projectId = null;
         if (newFinance.project && newFinance.project !== 'general') {
             // For now we don't have exact ID unless we fetch projects.
             // If modal sends a Name, we can try to lookup or leave null.
             // Best effort: leave null for now or implement lookup if modal is smart.
         }

         const payload = {
            date: newFinance.date, // YYYY-MM-DD
            type: newFinance.type, // 'income' or 'expense'
            category: newFinance.category,
            amount: parseFloat(newFinance.amount),
            description: newFinance.description,
            payer: newFinance.payer || '-', 
            method: 'Nakit', // Default
            project_id: projectId
         };
         
         // If method is Cebinden, update it? Modal might not yet support selecting Payer/Method
         // Assuming basic creation for now matches modal output.
         
         const { error } = await supabase.from('transactions').insert(payload);
         if (error) throw error;
         
         setIsModalOpen(false);
         fetchTransactions();
     } catch (e) {
         alert("Hata: " + e.message);
     }
  };

  const handlePayDebt = async (payerName, amount, items) => {
      if (!confirm(`${payerName} isimli personelin ₺${amount} tutarındaki borcu ödenecek. Onaylıyor musunuz?`)) return;

      try {
          // 1. Mark existing debts as paid
          const ids = items.map(i => i.id);
          const { error: updateError } = await supabase.from('transactions').update({ is_paid: true }).in('id', ids);
          if (updateError) throw updateError;

          // 2. Create a "Debt Payment" expense transaction (Cash out)
          const paymentTx = {
            date: new Date().toISOString().split('T')[0],
            type: 'expense',
            category: 'Borç Ödemesi',
            amount: amount, // Positive amount stored, type expense implies subtraction
            description: `${payerName} - Borç Ödemesi`,
            payer: 'Şirket',
            method: 'Nakit',
            is_paid: true 
          };
          const { error: insertError } = await supabase.from('transactions').insert(paymentTx);
          if (insertError) throw insertError;

          fetchTransactions();

      } catch(e) {
          alert("Ödeme hatası: " + e.message);
      }
  };

  const filteredTransactions = transactions.filter(t => {
     const matchesSearch = 
       (t.category || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
       (t.project_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
       (t.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
       (t.payer || '').toLowerCase().includes(searchTerm.toLowerCase());
    
     const typeLabel = t.type === 'income' ? 'Gelir' : 'Gider';
     const matchesType = typeFilter === 'Tümü' || typeLabel === typeFilter;
     
     return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
         <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Finans</h1>
            <p className="text-gray-500 dark:text-slate-400 text-sm mt-1">Gelir ve gider kayıtlarınızı yönetin</p>
         </div>
         <Button 
           onClick={() => setIsModalOpen(true)}
           className="gap-2 bg-purple-600 hover:bg-purple-700 shadow-purple-200 dark:text-white"
         >
           <Plus className="w-4 h-4" />
           Yeni Kayıt
         </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm flex items-center justify-between transition-colors">
             <div>
                <p className="text-sm font-medium text-gray-500 dark:text-slate-400">{stat.label}</p>
                <p className={cn("text-3xl font-bold mt-2", stat.color)}>
                  {index === 2 ? (netBalance >= 0 ? '+' : '') : ''}₺{stat.value}
                </p>
             </div>
             <div className={cn("p-4 rounded-full", stat.bg)}>
                <stat.icon className={cn("w-6 h-6", stat.color)} />
             </div>
          </div>
        ))}
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-4 transition-colors">
         <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-slate-500" />
            <input 
              type="text" 
              placeholder="Kategori, açıklama veya proje ara..." 
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
         </div>
         <div className="relative min-w-[200px]">
            <select 
              className="w-full appearance-none px-4 py-2 bg-white dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-lg text-sm text-gray-600 dark:text-slate-300 focus:outline-none focus:border-purple-500 cursor-pointer"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
               <option value="Tümü">Tümü</option>
               <option value="Gelir">Gelir</option>
               <option value="Gider">Gider</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
         </div>
      </div>

      {/* Debt Section */}
      {debts.length > 0 && (
          <div className="bg-orange-50/50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-900/30 rounded-xl p-6 transition-colors">
             <div className="flex items-center gap-2 mb-2">
                <Wallet className="w-5 h-5 text-orange-600 dark:text-orange-500" />
                <h3 className="font-semibold text-gray-900 dark:text-white">Şirket Borç Durumu</h3>
             </div>
             <p className="text-gray-500 dark:text-slate-400 text-sm mb-6">Cebinden para veren kişilere şirketin borçları</p>

             <div className="space-y-4">
                <div className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-orange-100/50 dark:border-orange-900/20 shadow-sm">
                   <p className="text-sm text-gray-500 dark:text-slate-400 font-medium">Toplam Borç</p>
                   <p className="text-2xl font-bold text-orange-600 dark:text-orange-500 mt-1">₺{totalDebt.toLocaleString('tr-TR')}</p>
                </div>

                {debts.map((group) => (
                  <div key={group.name} className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-orange-100/50 dark:border-orange-900/20 shadow-sm flex items-center justify-between transition-colors">
                     <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400">
                           {group.name.substring(0, 1).toUpperCase()}
                        </div>
                        <div>
                           <p className="font-semibold text-gray-900 dark:text-white">{group.name}</p>
                           <p className="text-xs text-gray-500 dark:text-slate-400">{group.count} işlem - Cebinden ödeme yaptı</p>
                        </div>
                     </div>
                     <div className="text-right flex items-center gap-4">
                        <div>
                           <p className="font-bold text-orange-600 dark:text-orange-500">₺{group.amount.toLocaleString('tr-TR')}</p>
                           <p className="text-xs text-gray-400 dark:text-slate-500">Borç</p>
                        </div>
                         <Button 
                            onClick={() => handlePayDebt(group.name, group.amount, group.items)}
                            className="bg-purple-600 hover:bg-purple-700 h-8 text-sm px-4 dark:text-white"
                         >
                            Öde
                         </Button>
                     </div>
                  </div>
                ))}
             </div>
          </div>
      )}

      {/* Transactions Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
         <div className="p-6 border-b border-gray-200 dark:border-slate-800">
            <h2 className="font-semibold text-gray-900 dark:text-white">Kayıtlar</h2>
            <p className="text-sm text-gray-500 dark:text-slate-400">Tüm gelir ve gider kayıtları</p>
         </div>
         <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
               <thead>
                  <tr className="bg-gray-50/50 dark:bg-slate-950/50 text-xs font-semibold text-gray-500 dark:text-slate-400 border-b border-gray-100 dark:border-slate-800">
                     <th className="py-3 px-6">Tarih</th>
                     <th className="py-3 px-6">Tür</th>
                     <th className="py-3 px-6">Kategori</th>
                     <th className="py-3 px-6">Proje</th>
                     <th className="py-3 px-6">Parayı Veren</th>
                     <th className="py-3 px-6">Açıklama</th>
                     <th className="py-3 px-6 text-right">Tutar</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-gray-5 dark:divide-slate-800">
                  {loading ? (
                       <tr><td colSpan="7" className="py-10 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-violet-600" /></td></tr>
                  ) : filteredTransactions.length === 0 ? (
                       <tr><td colSpan="7" className="py-12 text-center text-gray-500 dark:text-slate-400">Kayıt bulunamadı.</td></tr>
                  ) : (
                      filteredTransactions.map((t) => (
                         <tr key={t.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/50 transition-colors text-sm">
                            <td className="py-3 px-6 text-gray-600 dark:text-slate-300">{t.date}</td>
                            <td className="py-3 px-6">
                               <span className={cn(
                                  "px-2 py-0.5 rounded text-xs font-medium",
                                  t.type === 'income' ? "bg-black dark:bg-slate-700 text-white" : "bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-400"
                               )}>
                                  {t.type === 'income' ? 'Gelir' : 'Gider'}
                               </span>
                            </td>
                            <td className="py-3 px-6 text-gray-900 dark:text-white font-medium">{t.category}</td>
                            <td className="py-3 px-6 text-gray-500 dark:text-slate-400">{t.project_name}</td>
                            <td className="py-3 px-6">
                               {t.payer !== '-' ? (
                                  <span className="px-2 py-1 bg-black dark:bg-slate-700 text-white text-xs rounded-lg">
                                     {t.payer}
                                  </span>
                               ) : (
                                  <span className="text-gray-400 dark:text-slate-600">-</span>
                               )}
                            </td>
                            <td className="py-3 px-6 text-gray-500 dark:text-slate-400 max-w-xs truncate">{t.description}</td>
                            <td className={cn("py-3 px-6 text-right font-medium", t.type === 'income' ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400")}>
                               {t.type === 'income' ? '+' : '-'}₺{t.amount.toLocaleString('tr-TR')}
                            </td>
                         </tr>
                      ))
                  )}
               </tbody>
            </table>
         </div>
      </div>
      
      <CreateFinanceModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onCreate={handleCreate} 
      />
    </div>
  );
}
