import React, { useState, useEffect } from 'react';
import { Search, Plus, ClipboardList, Clock, Loader2, CheckCircle2, Eye, Pencil, Trash2, Calendar, FileText, User, X, AlertCircle, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import CreateWorkOrderModal from '@/components/modals/CreateWorkOrderModal';
import { Button } from '@/components/ui/Button';
import { format, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';
import { supabase } from '@/lib/supabase';
import { useSupabaseAuth } from '@/context/SupabaseAuthContext';

export default function WorkOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useSupabaseAuth();
  
  // Lookups
  const [profiles, setProfiles] = useState({});
  const [personnelList, setPersonnelList] = useState([]);
  const [projectsList, setProjectsList] = useState([]);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Tüm Durumlar');
  const [timeFilter, setTimeFilter] = useState('Tüm Zamanlar');

  const fetchCreateData = async () => {
      const { data: profs } = await supabase.from('profiles').select('id, full_name');
      const { data: projs } = await supabase.from('projects').select('id, name');
      
      const pMap = {};
      if (profs) profs.forEach(p => pMap[p.id] = p.full_name);
      setProfiles(pMap);
      setPersonnelList(profs || []);
      setProjectsList(projs || []);
      return pMap;
  };

  const fetchOrders = async (pMapOverride = null) => {
    try {
        setLoading(true);
        try {
            await supabase.rpc('check_and_update_delayed_tasks');
        } catch (rpcErr) {
            console.warn("RPC check_and_update_delayed_tasks not found or failed, skipping.");
        }
        
        const { data, error } = await supabase
            .from('work_orders')
            .select(`
                *,
                projects (name)
            `)
            .order('due_date', { ascending: true });

        if (error) throw error;
        
        const activeProfiles = pMapOverride || profiles;
        
        // Transform
        const mapped = data.map(o => {
            const isActuallyDelayed = o.due_date && new Date(o.due_date) < new Date().setHours(0,0,0,0) && o.status !== 'Tamamlandı';
            const status = isActuallyDelayed ? 'Geciken' : o.status;
            
            return {
                ...o,
                status,
                project: o.projects?.name || 'Bilinmiyor',
                assignedToNames: (o.assigned_to || []).map(uid => activeProfiles[uid] || 'Bilinmiyor')
            };
        });
        
        setOrders(mapped);
    } catch (e) {
        console.error(e);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
     if (user) {
         fetchCreateData().then((pMap) => {
             fetchOrders(pMap);
         });
     }
  }, [user]);

  const sanitizeDate = (dateStr) => {
    if (!dateStr) return null;
    let d = new Date(dateStr);
    // If year is between 0 and 99, assume the user meant 2000s (common with 2-digit year entry)
    if (d.getFullYear() < 100) {
        d.setFullYear(d.getFullYear() + 2000);
    }
    return d.toISOString();
  };

  const handleCreateOrder = async (orderData) => {
    try {
        const newOrder = {
            title: orderData.title,
            status: mapStatus(orderData.status),
            priority: orderData.priority,
            project_id: orderData.project_id || null,
            assigned_to: orderData.assignees || [], // Already IDs from modal
            due_date: sanitizeDate(orderData.dueDate),
            description: orderData.description
        };

        const { error } = await supabase.from('work_orders').insert(newOrder);
        if (error) throw error;
        
        // Notify other components (Dashboard etc.)
        window.dispatchEvent(new CustomEvent('taskCreated'));

        setIsCreateModalOpen(false);
        fetchOrders(); // Refresh

    } catch (e) {
        alert('Hata: ' + e.message);
    }
  };

  const handleUpdateOrder = async (updatedData) => {
      try {
          const { error } = await supabase.from('work_orders').update({
              title: updatedData.title,
              status: mapStatus(updatedData.status),
              priority: updatedData.priority,
              project_id: updatedData.project_id || null,
              due_date: sanitizeDate(updatedData.dueDate),
              description: updatedData.description,
              assigned_to: updatedData.assignees || [] // Already IDs from modal
          }).eq('id', selectedOrder.id);

          if (error) throw error;
          
          // Notify other components (Dashboard etc.)
          window.dispatchEvent(new CustomEvent('taskCreated'));

          setIsEditModalOpen(false);
          setSelectedOrder(null);
          fetchOrders();
      } catch (e) {
          alert('Güncelleme hatası: ' + e.message);
      }
  };

  const handleDelete = async (id) => {
    if (confirm('Bu iş emrini silmek istediğinize emin misiniz?')) {
        const { error } = await supabase.from('work_orders').delete().eq('id', id);
        if (!error) fetchOrders();
    }
  };

  const handleStatusChange = async (id, newStatus) => {
      let statusToSave = mapStatus(newStatus);
      const { error } = await supabase.from('work_orders').update({ status: statusToSave }).eq('id', id);
      if (!error) fetchOrders();
  };

  const mapStatus = (s) => {
    if (!s) return 'Bekliyor';
    const lower = s.toLowerCase();
    if (lower === 'beklemede') return 'Bekliyor'; // Schema uses 'Bekliyor', code used 'Beklemede'. Mapping.
    if (lower === 'bekliyor') return 'Bekliyor';
    if (lower.includes('devam')) return 'Devam Ediyor';
    if (lower.includes('tamam')) return 'Tamamlandı';
    if (lower === 'iptal') return 'İptal';
    if (lower === 'geciken') return 'Geciken';
    return s;
  };

  const stats = [
    { label: 'Toplam', value: orders.length, icon: ClipboardList, color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-900/20 border-violet-100 dark:border-violet-900/50' },
    { label: 'Bekliyor', value: orders.filter(o => o.status === 'Bekliyor').length, icon: Clock, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-900/50' },
    { label: 'Devam Eden', value: orders.filter(o => o.status === 'Devam Ediyor').length, icon: Loader2, color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-100 dark:border-indigo-900/50' },
    { label: 'Geciken', value: orders.filter(o => o.status === 'Geciken').length, icon: AlertCircle, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-900/50' },
  ];

  const filteredOrders = orders.filter(order => {
    const assignedToString = order.assignedToNames.join(' ');
    const displayStatus = order.status === 'Bekliyor' ? 'Beklemede' : order.status; // Map back for filter check if needed or just use DB value

    const matchesSearch = 
      order.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.project || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      assignedToString.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Status Filter UI usually has 'Beklemede', 'Devam Ediyor' etc.
    // DB has 'Bekliyor'.
    // If filter is 'Beklemede' -> match 'Bekliyor'.
    
    let effectiveStatusFilter = statusFilter;
    if (statusFilter === 'Beklemede') effectiveStatusFilter = 'Bekliyor';

    const matchesStatus = statusFilter === 'Tüm Durumlar' || order.status === effectiveStatusFilter;

    let matchesTime = true;
    if (timeFilter !== 'Tüm Zamanlar' && order.due_date) {
       const orderDate = new Date(order.due_date);
       const now = new Date();
       const diffTime = Math.abs(now - orderDate);
       const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
       
       if (timeFilter === 'Son 1 Hafta') matchesTime = diffDays <= 7;
       if (timeFilter === 'Son 1 Ay') matchesTime = diffDays <= 30;
    }

    return matchesSearch && matchesStatus && matchesTime;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">İş Emirleri</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">İş emirlerini oluşturun ve detaylı takibini yapın.</p>
        </div>
        <Button 
          onClick={() => setIsCreateModalOpen(true)}
          className="bg-violet-600 hover:bg-violet-700 text-white shadow-lg shadow-violet-500/20 gap-2 dark:shadow-violet-900/40"
        >
          <Plus className="w-4 h-4" />
          Yeni İş Emri
        </Button>
      </div>

       {/* Stats Cards */}
       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(stat => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-slate-400">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stat.value}</p>
              </div>
              <div className={cn("w-12 h-12 rounded-full flex items-center justify-center", stat.bg, stat.color)}>
                <Icon className="w-6 h-6" />
              </div>
            </div>
          )
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 w-5 h-5" />
          <input 
            type="text" 
            placeholder="İş emri, proje veya personel ara..." 
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all font-medium text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-600 bg-white dark:bg-slate-900"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
            <div className="relative min-w-[160px]">
                 <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 w-4 h-4" />
                 <select 
                   className="w-full pl-10 pr-8 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 bg-white dark:bg-slate-900 font-medium text-slate-700 dark:text-slate-200 appearance-none cursor-pointer"
                   value={statusFilter}
                   onChange={(e) => setStatusFilter(e.target.value)}
                 >
                   <option>Tüm Durumlar</option>
                   <option>Devam Ediyor</option>
                   <option>Beklemede</option>
                   <option>Tamamlandı</option>
                   <option>Geciken</option>
                   <option>İptal</option>
                 </select>
            </div>
            
             <div className="relative min-w-[160px]">
                 <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 w-4 h-4" />
                 <select 
                   className="w-full pl-10 pr-8 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 bg-white dark:bg-slate-900 font-medium text-slate-700 dark:text-slate-200 appearance-none cursor-pointer"
                   value={timeFilter}
                   onChange={(e) => setTimeFilter(e.target.value)}
                 >
                   <option>Tüm Zamanlar</option>
                   <option>Son 1 Hafta</option>
                   <option>Son 1 Ay</option>
                 </select>
             </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
         {loading ? <div className="text-center py-10"><Loader2 className="w-8 h-8 animate-spin mx-auto text-violet-600" /></div> : filteredOrders.length === 0 ? (
            <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 border-dashed">
                <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                    <ClipboardList className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Sonuç Bulunamadı</h3>
                <p className="text-slate-500 dark:text-slate-400 mt-1">Arama kriterlerinize uygun iş emri yok.</p>
            </div>
         ) : (
            filteredOrders.map((order) => (
               <div key={order.id} className="group bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-1 hover:shadow-lg hover:border-violet-200 dark:hover:border-violet-900 transition-all duration-300">
                  <div className="flex flex-col md:flex-row gap-6 p-5">
                     <div className="flex-1 space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                           <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-violet-700 dark:group-hover:text-violet-400 transition-colors">{order.title}</h3>
                           <div className="flex gap-2">
                              <span className={cn(
                                 "px-2.5 py-1 rounded-lg text-xs font-bold border",
                                 order.status === 'Devam Ediyor' ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-900/50' :
                                 order.status === 'Tamamlandı' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/50' :
                                 order.status === 'Geciken' ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-100 dark:border-red-900/50' :
                                 order.status === 'Beklemede' || order.status === 'Bekliyor' ? 'bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-orange-100 dark:border-orange-900/50' :
                                 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-100 dark:border-slate-700'
                              )}>
                                 {order.status}
                              </span>
                              <span className={cn(
                                 "px-2.5 py-1 rounded-lg text-xs font-bold border",
                                 order.priority === 'Yüksek' ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-100 dark:border-red-900/50' :
                                 order.priority === 'Orta' ? 'bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-orange-100 dark:border-orange-900/50' :
                                 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-100 dark:border-slate-700'
                              )}>
                                 {order.priority}
                              </span>
                           </div>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-slate-500 dark:text-slate-400 font-medium">
                           <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                              {order.project}
                           </div>
                           <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                              <span className="truncate">{order.assignedToNames.join(', ')}</span>
                           </div>
                           <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                              {order.due_date ? format(parseISO(order.due_date), 'dd.MM.yyyy') : '-'}
                           </div>
                        </div>

                        {order.description && (
                          <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 line-clamp-2 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800">{order.description}</p>
                        )}
                     </div>

                     <div className="flex flex-row md:flex-col items-end justify-between gap-4 min-w-[140px] border-t md:border-t-0 md:border-l border-slate-100 dark:border-slate-800 pt-4 md:pt-0 md:pl-6">
                        <div className="flex items-center gap-2 w-full justify-end">
                            <Button variant="ghost" size="sm" onClick={() => { setSelectedOrder(order); setIsDetailModalOpen(true); }} className="h-8 w-8 p-0">
                               <Eye className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => { setSelectedOrder(order); setIsEditModalOpen(true); }} className="h-8 w-8 p-0">
                               <Pencil className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDelete(order.id)} className="h-8 w-8 p-0 text-red-500">
                               <Trash2 className="w-4 h-4" />
                            </Button>
                        </div>
                        
                        <select 
                          className="w-full text-xs font-bold px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none cursor-pointer"
                          value={order.status === 'Bekliyor' ? 'bekliyor' : order.status.toLowerCase().replace(' ', '-')}
                          onChange={(e) => handleStatusChange(order.id, e.target.value)}
                        >
                           <option value="bekliyor">Bekliyor</option>
                           <option value="devam-ediyor">Devam Ediyor</option>
                           <option value="tamamlandi">Tamamlandı</option>
                           <option value="geciken">Geciken</option>
                           <option value="iptal">İptal</option>
                        </select>
                     </div>
                  </div>
               </div>
            ))
         )}
      </div>

      <CreateWorkOrderModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
        onCreate={handleCreateOrder} 
        availablePersonnel={personnelList}
        availableProjects={projectsList}
      />

      <CreateWorkOrderModal 
        isOpen={isEditModalOpen} 
        onClose={() => setIsEditModalOpen(false)} 
        onCreate={handleUpdateOrder}
        initialData={selectedOrder} 
        availablePersonnel={personnelList}
        availableProjects={projectsList}
      />

       {isDetailModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setIsDetailModalOpen(false)}>
           <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-800" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                 <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">İş Emri Detayı</h2>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-wider">İş Emri ID: #{selectedOrder.id.substring(0,8)}</p>
                 </div>
                 <Button variant="ghost" size="icon" onClick={() => setIsDetailModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-white/50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700">
                    <X className="w-5 h-5" />
                 </Button>
              </div>
              <div className="p-6 space-y-6">
                 <div>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white leading-tight mb-2">{selectedOrder.title}</h3>
                    <div className="flex gap-2">
                        <span className={cn(
                             "px-2.5 py-1 rounded-lg text-xs font-bold border",
                             selectedOrder.status === 'Devam Ediyor' ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-900/50' :
                             selectedOrder.status === 'Tamamlandı' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/50' :
                             'bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-orange-100 dark:border-orange-900/50'
                        )}>
                             {selectedOrder.status}
                        </span>
                        <span className={cn(
                             "px-2.5 py-1 rounded-lg text-xs font-bold border",
                             selectedOrder.priority === 'Yüksek' ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-100 dark:border-red-900/50' :
                             'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-100 dark:border-slate-700'
                        )}>
                             {selectedOrder.priority} Ölçekli
                        </span>
                    </div>
                 </div>

                 <div className="space-y-1.5">
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">AÇIKLAMA</p>
                    <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl text-slate-700 dark:text-slate-300 text-sm border border-slate-100 dark:border-slate-800/80 leading-relaxed font-medium">
                        {selectedOrder.description || 'Herhangi bir açıklama girilmemiş.'}
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                        <h4 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Proje</h4>
                        <p className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                            <FileText className="w-3.5 h-3.5 text-violet-500" />
                            {selectedOrder.project}
                        </p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                        <h4 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Teslim Tarihi</h4>
                        <p className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                            <Calendar className="w-3.5 h-3.5 text-amber-500" />
                            {selectedOrder.due_date ? format(parseISO(selectedOrder.due_date), 'dd MMMM yyyy', { locale: tr }) : '-'}
                        </p>
                    </div>
                 </div>

                 <div className="bg-indigo-50/50 dark:bg-indigo-900/20 p-4 rounded-xl border border-indigo-100/50 dark:border-indigo-900/50">
                    <h4 className="text-[10px] font-bold text-indigo-400 dark:text-indigo-400 uppercase tracking-widest mb-2">GÖREVLİ PERSONELLER</h4>
                    <div className="flex flex-wrap gap-2">
                        {selectedOrder.assignedToNames.map((name, i) => (
                            <div key={i} className="flex items-center gap-2 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-indigo-100 dark:border-indigo-900/50 shadow-sm">
                                <div className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center text-[10px] text-white font-bold">
                                    {name.charAt(0).toUpperCase()}
                                </div>
                                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{name}</span>
                            </div>
                        ))}
                    </div>
                 </div>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                  <Button onClick={() => setIsDetailModalOpen(false)} variant="secondary" className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">Kapat</Button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
