import React, { useState, useEffect } from 'react';
import { Search, Eye, Pencil, Trash2, Users, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import ClientDetailModal from '@/components/modals/ClientDetailModal';
import CreateClientModal from '@/components/modals/CreateClientModal';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';
import { useSupabaseAuth } from '@/context/SupabaseAuthContext';

export default function Clients() {
  const [filter, setFilter] = useState('Tümü'); 
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user, isAdmin } = useSupabaseAuth();

  // Load Clients from Supabase
  const fetchClients = async () => {
      try {
          setLoading(true);
          
          // 1. Fetch Clients
          const { data: clientsData, error: clientsError } = await supabase
              .from('clients')
              .select('*')
              .order('created_at', { ascending: false });
          
          if (clientsError) throw clientsError;

          // 2. Fetch Balances via RPC
          const { data: balances, error: balancesError } = await supabase.rpc('get_client_balances');
          
          // 3. Merge data
          const enriched = (clientsData || []).map(client => {
              const balData = (balances || []).find(b => b.client_id === client.id);
              return {
                  ...client,
                  balance: balData ? balData.balance : 0
              };
          });

          setClients(enriched);
      } catch (e) { 
          console.error('Error loading clients:', e);
      } finally {
          setLoading(false);
      }
  };

  useEffect(() => {
     if (user) fetchClients();
  }, [user]);

  // Handle New/Edit Client
  const handleCreateClient = async (data) => {
      try {
          const clientData = {
              name: data.name,
              type: data.type || 'Normal',
              status: data.status || 'Aktif',
              phone: data.phone,
              email: data.email,
              address: data.address,
              notes: data.notes
          };

          if (data.id) {
              // Update existing client
              const { error } = await supabase
                  .from('clients')
                  .update(clientData)
                  .eq('id', data.id);
              
              if (error) throw error;
              alert('Müşteri başarıyla güncellendi.');
          } else {
              // Create new client
              const { error } = await supabase.from('clients').insert(clientData);
              if (error) throw error;
              alert('Müşteri başarıyla oluşturuldu.');
          }
          
          setIsCreateModalOpen(false);
          setEditingClient(null);
          fetchClients(); // Refresh
      } catch (e) {
          console.error("Client operation error:", e);
          alert('Hata: ' + e.message);
      }
  };

  // Handle Filter
  const filteredClients = clients.filter(client => {
    if (!client || !client.name) return false;
    const matchesSearch = client.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (client.phone && client.phone.includes(searchTerm));
    
    // Status Filter (DB stores 'Aktif', 'Pasif', 'Sıkıntılı')
    if (filter === 'Tümü') return matchesSearch;
    return matchesSearch && client.status === filter;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Müşteriler</h1>
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-medium">
             <p>Müşteri portföyünüzü ve bakiyelerini yönetin.</p>
             <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
             <span className="text-violet-600 dark:text-violet-400 font-bold">{clients.length} Kayıt</span>
          </div>
        </div>
        <Button 
          onClick={() => setIsCreateModalOpen(true)}
          className="bg-violet-600 hover:bg-violet-700 text-white shadow-lg shadow-violet-500/20 gap-2 px-6 dark:shadow-violet-900/40"
        >
          <Users className="w-5 h-5" />
          Yeni Müşteri
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 w-5 h-5" />
          <input 
            type="text" 
            placeholder="İsim, telefon veya adres ara..." 
            className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all font-medium text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-600 shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
            {['Tümü', 'Aktif', 'Pasif', 'Sıkıntılı'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap",
                  filter === f 
                    ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-lg shadow-slate-900/20 dark:shadow-white/10" 
                    : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                )}
              >
                {f}
              </button>
            ))}
        </div>
      </div>

      {/* Grid Content */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
           {loading ? (
                <div className="col-span-full flex justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
                </div>
           ) : filteredClients.length === 0 ? (
             <div className="col-span-full py-20 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 border-dashed text-center">
                 <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                     <Users className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                 </div>
                 <h3 className="text-lg font-bold text-slate-900 dark:text-white">Müşteri Bulunamadı</h3>
                 <p className="text-slate-500 dark:text-slate-400 mt-1">Arama kriterlerinize uygun kayıt yok.</p>
             </div>
           ) : (
             filteredClients.map((client) => (
               <div key={client.id} className="group bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 hover:shadow-xl hover:border-violet-200 dark:hover:border-violet-900 transition-all duration-300 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                      <button onClick={() => setSelectedClient(client)} className="p-2 bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/30 rounded-lg transition-colors">
                          <Eye className="w-4 h-4" />
                      </button>
                      <button 
                          onClick={() => {
                              setEditingClient(client);
                              setIsCreateModalOpen(true);
                          }} 
                          className="p-2 bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                      >
                          <Pencil className="w-4 h-4" />
                      </button>
                  </div>
                  
                  <div className="flex items-start gap-4 mb-4">
                     <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 font-bold text-lg">
                        {client.name.charAt(0)}
                     </div>
                     <div className="flex-1 pr-16">
                        <h3 className="font-bold text-slate-900 dark:text-white leading-tight mb-1 group-hover:text-violet-700 dark:group-hover:text-violet-400 transition-colors line-clamp-2">{client.name}</h3>
                        <div className="flex items-center gap-2">
                           <span className={cn(
                              "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border",
                              client.status === 'Aktif' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/50' :
                              client.status === 'Pasif' ? 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-100 dark:border-slate-700' :
                              client.status === 'Sıkıntılı' ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-100 dark:border-red-900/50' :
                              'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/50'
                           )}>
                              {client.status}
                           </span>
                           <span className="text-xs font-mono text-slate-400 dark:text-slate-500">{client.type}</span>
                        </div>
                     </div>
                  </div>

                  <div className="space-y-3 border-t border-slate-100 dark:border-slate-800 pt-4">
                     <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-400 dark:text-slate-500 font-medium">Telefon</span>
                        <span className="font-mono text-slate-700 dark:text-slate-300">{client.phone || '-'}</span>
                     </div>
                     <div className="flex items-start justify-between text-sm gap-4">
                        <span className="text-slate-400 dark:text-slate-500 font-medium whitespace-nowrap">Adres</span>
                        <span className="text-slate-600 dark:text-slate-400 text-right truncate max-w-[180px]" title={client.address}>{client.address || '-'}</span>
                     </div>
                     {/* Balance - Pending full finance module integration, simpler placeholder for now */}
                     <div className="flex items-center justify-between text-sm bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl">
                        <span className="text-slate-500 dark:text-slate-400 font-bold">Bakiye</span>
                        <span className={cn(
                            "font-bold text-lg",
                            (client.balance || 0) > 0 ? "text-red-600 dark:text-red-400" : "text-slate-600 dark:text-slate-400"
                        )}>
                            ₺{(client.balance || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                        </span>
                     </div>
                  </div>
               </div>
             ))
           )}
      </div>

      <ClientDetailModal 
        isOpen={!!selectedClient} 
        onClose={() => setSelectedClient(null)} 
        client={selectedClient} 
      />

      <CreateClientModal 
          isOpen={isCreateModalOpen}
          onClose={() => {
              setIsCreateModalOpen(false);
              setEditingClient(null);
          }}
          onCreate={handleCreateClient}
          initialData={editingClient}
      />
    </div>
  );
}
