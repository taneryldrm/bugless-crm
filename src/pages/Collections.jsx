import React, { useState, useEffect } from 'react';
import { Search, ChevronDown, ChevronUp, Wallet, Users, FolderKanban, ArrowUpRight, Eye, Edit2, Trash2, ArrowRight, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import PaymentModal from '@/components/modals/PaymentModal';
import CollectionDetailModal from '@/components/modals/CollectionDetailModal';
import { Button } from '@/components/ui/Button';
import { format } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { useSupabaseAuth } from '@/context/SupabaseAuthContext';

export default function Collections() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('Tümü');
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentTarget, setPaymentTarget] = useState(null);

  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useSupabaseAuth();

  const fetchData = async () => {
    try {
        setLoading(true);
        
        // 1. Fetch Clients
        const { data: clientsData } = await supabase.from('clients').select('*');
        if (!clientsData) {
             setCustomers([]);
             return;
        }

        // 2. Fetch Projects
        // to calc Total Agreed
        const { data: projectsData } = await supabase.from('projects').select('id, client_id, price, name, status');

        // 3. Fetch Transactions (Income)
        // to calc Total Paid. We need to match transactions to clients.
        // Transactions usually have 'payer' as client name, or 'project_id'.
        // Ideal: Use project_id if available, fallback to matching 'payer' name to client name.
        const { data: txData } = await supabase.from('transactions').select('*').eq('type', 'income');

        // Process Data
        const enriched = clientsData.map(client => {
             // Find client projects
             const clientProjects = projectsData ? projectsData.filter(p => p.client_id === client.id) : [];
             const projectCount = clientProjects.length;
             
             // Total Agreed (Sum of project prices)
             const totalAgreed = clientProjects.reduce((acc, p) => acc + (parseFloat(p.price) || 0), 0);

             // Total Paid
             // 1. Txs linked by Project ID
             // 2. Txs linked by Payer Name
             let totalPaid = 0;
             const matchedTransactions = [];
             
             if (txData) {
                 txData.forEach(tx => {
                     // Check by project
                     const relatedProject = clientProjects.find(p => p.id === tx.project_id);
                     if (relatedProject) {
                         totalPaid += (parseFloat(tx.amount) || 0);
                         matchedTransactions.push({ ...tx, matchType: 'project' });
                     } else if (tx.payer && tx.payer.trim().toLowerCase() === client.name.trim().toLowerCase()) {
                         // Check by name
                         totalPaid += (parseFloat(tx.amount) || 0);
                         matchedTransactions.push({ ...tx, matchType: 'name' });
                     }
                 });
             }

             const totalRemaining = totalAgreed - totalPaid;
             
             console.log(`💰 ${client.name}:`, {
                 agreed: totalAgreed,
                 paid: totalPaid,
                 remaining: totalRemaining,
                 transactions: matchedTransactions.length
             });

             return {
                 ...client,
                 projectCount,
                 totalAgreed,
                 totalPaid,
                 totalRemaining,
                 projects: clientProjects.map(p => ({
                     ...p, 
                     remaining: Math.max(0, (p.price || 0) - 0),
                     agreed: p.price
                 }))
             };
        });

        setCustomers(enriched);

    } catch (e) {
        console.error("Collections fetch error", e);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
     if (user) fetchData();
  }, [user]);

  // Handle Collection
  const handleCollectClick = (e, customer) => {
      e.stopPropagation(); 
      setPaymentTarget(customer);
      setIsPaymentModalOpen(true);
  };

  const processCollection = async (amountToCollect) => {
      const customer = paymentTarget;
      if (!customer) return;

      try {
          const now = new Date();
          
          console.log('🔍 Tahsilat İşlemi Başlıyor:', {
              customer: customer.name,
              amount: amountToCollect,
              currentPaid: customer.totalPaid,
              currentRemaining: customer.totalRemaining
          });
          
          // Insert Transaction
          const { data: insertedData, error } = await supabase.from('transactions').insert({
              date: format(now, 'yyyy-MM-dd'),
              type: 'income',
              category: 'Proje Ödemesi',
              description: `Tahsilat: ${customer.name}`,
              amount: amountToCollect,
              payer: customer.name,
              project_id: null,
              is_paid: true
          }).select();

          if (error) throw error;
          
          console.log('✅ Tahsilat Kaydedildi:', insertedData);
          
          alert("Tahsilat başarıyla kaydedildi.");
          setIsPaymentModalOpen(false);
          
          // Wait a bit before refresh to ensure DB is updated
          setTimeout(() => {
              fetchData();
          }, 500);
          
      } catch (err) {
          console.error("❌ Tahsilat hatası:", err);
          alert("Bir hata oluştu: " + err.message);
      }
  };

  // Type Color Helper
  const getTypeColor = (type) => {
    switch (type) {
      case 'Aktif': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'Pasif': return 'bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-400';
      case 'Sıkıntılı': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'Kurumsal': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
      default: return 'bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-400';
    }
  };

  // Filter
  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = (customer.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (customer.phone || '').replace(/\s+/g, '').includes(searchQuery.replace(/\s+/g, ''));
    const matchesFilter = activeFilter === 'Tümü' || customer.type === activeFilter;
    return matchesSearch && matchesFilter;
  });

  // Stats
  const totalTahsilatVal = customers.reduce((acc, c) => acc + c.totalPaid, 0);
  const totalBeklenenVal = customers.reduce((acc, c) => acc + Math.max(0, c.totalRemaining), 0);
  const totalMusteri = customers.length;
  const totalProje = customers.reduce((acc, c) => acc + c.projectCount, 0);

  const stats = [
    { label: 'Toplam Tahsilat', value: `₺${totalTahsilatVal.toLocaleString('tr-TR', {minimumFractionDigits: 2})}`, icon: Wallet, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
    { label: 'Beklenen Tahsilat', value: `₺${totalBeklenenVal.toLocaleString('tr-TR', {minimumFractionDigits: 2})}`, icon: ArrowUpRight, color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-900/20' },
    { label: 'Müşteri Sayısı', value: totalMusteri.toString(), icon: Users, color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/20' },
    { label: 'Proje Sayısı', value: totalProje.toString(), icon: FolderKanban, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Beklenen Tahsilat</h1>
          <p className="text-gray-500 dark:text-slate-400 text-sm mt-1">Proje ödemelerini takip edin</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-slate-400 font-medium">{stat.label}</p>
              <p className={cn("text-xl font-bold mt-1", stat.color)}>{stat.value}</p>
            </div>
            <div className={cn("p-3 rounded-lg", stat.bg)}>
              <stat.icon className={cn("w-6 h-6", stat.color)} />
            </div>
          </div>
        ))}
      </div>

      {/* Search & Filter */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm">
        <div className="relative">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-slate-500" />
              <input 
                type="text" 
                placeholder="İsim veya telefon ile ara..." 
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-600"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex bg-gray-100 dark:bg-slate-800 rounded-lg p-1 gap-1">
               {['Tümü', 'Aktif', 'Pasif', 'Sıkıntılı', 'Kurumsal'].map((filter) => (
                 <Button 
                   key={filter}
                   onClick={() => setActiveFilter(filter)}
                   variant={activeFilter === filter ? "secondary" : "ghost"}
                   size="sm"
                   className={cn(
                     "text-xs font-medium shadow-sm transition-all",
                     activeFilter === filter 
                       ? "bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow" 
                       : "text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-slate-600 shadow-none bg-transparent"
                   )}
                 >
                   {filter}
                 </Button>
               ))}
            </div>
          </div>
        </div>
      </div>

      {/* Collection List - Table Style */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                <th className="py-4 px-6 text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">MÜŞTERİ ADI</th>
                <th className="py-4 px-6 text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">TİP</th>
                <th className="py-4 px-6 text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">PROJE SAYISI</th>
                <th className="py-4 px-6 text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">TAHSİL EDİLEN</th>
                <th className="py-4 px-6 text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">KALAN</th>
                <th className="py-4 px-6 text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider text-right">İŞLEMLER</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-5 dark:divide-slate-800">
              {filteredCustomers.map((customer) => (
                <tr key={customer.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/50 transition-colors group">
                  <td className="py-4 px-6">
                    <div className="flex flex-col">
                      <span className="font-medium text-gray-900 dark:text-white text-sm uppercase">{customer.name}</span>
                      <span className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{customer.phone}</span>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                      <span className={cn("px-2.5 py-1 rounded text-xs font-medium", getTypeColor(customer.type))}>
                        {customer.type}
                      </span>
                  </td>
                  <td className="py-4 px-6 text-sm text-gray-500 dark:text-slate-400">
                    {customer.projectCount} Proje
                  </td>
                  <td className="py-4 px-6 text-sm text-green-600 dark:text-green-400 font-medium">
                    ₺{customer.totalPaid.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-4 px-6 text-sm font-bold text-gray-900 dark:text-white">
                    ₺{customer.totalRemaining.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center justify-end gap-2 opacity-100 sm:opacity-60 sm:group-hover:opacity-100 transition-opacity">
                      <Button 
                          size="sm"
                          variant="ghost"
                          className="h-8 text-xs font-medium text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:text-emerald-300 dark:hover:bg-emerald-900/30 gap-1"
                          onClick={(e) => handleCollectClick(e, customer)} 
                          title={customer.totalRemaining <= 0 ? "Genel Tahsilat Al" : "Tahsilat Al"}
                      >
                         <Wallet className="w-3.5 h-3.5" />
                         Tahsil Et
                      </Button>

                      <Button 
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                            setSelectedCustomer(customer);
                            setIsDetailModalOpen(true);
                        }}
                        title="Detayları Gör"
                        className="w-8 h-8 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      
                      {/* Delete removed as it's complex to delete client coupled with data here, or we can just delete client row from view? No, real data shouldn't be deleted so easily here. Use Clients page. */}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {customers.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500 dark:text-slate-400">{loading ? 'Yükleniyor...' : 'Kayıt bulunamadı.'}</p>
              </div>
          )}
        </div>
      </div>
      
      <CollectionDetailModal 
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          customer={selectedCustomer}
      />
      
      <PaymentModal 
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          customer={paymentTarget}
          onConfirm={processCollection}
      />
    </div>
  );
}
