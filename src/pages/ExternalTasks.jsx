import React, { useState, useEffect } from 'react';
import { Search, Plus, ClipboardList, Clock, Loader2, CheckCircle2, Eye, Pencil, Trash2, Calendar, FileText, User, X, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import CreateExternalTaskModal from '@/components/modals/CreateExternalTaskModal';
import { Button } from '@/components/ui/Button';
import { format, parseISO } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { useSupabaseAuth } from '@/context/SupabaseAuthContext';

export const MOCK_EXTERNAL_TASKS = [
  { id: 1, title: 'Ofis Temizliği', status: 'Tamamlandı', priority: 'Orta', assignedTo: ['Kerem k Koyuncu'], date: '24.11.2025', description: '.' },
  { id: 2, title: 'Çalışan Mailleri', status: 'Tamamlandı', priority: 'Orta', assignedTo: ['Taner Yıldırım'], date: '29.11.2025', description: 'Şirket domainli mail alınacak hosting' },
  { id: 3, title: 'Ulaş abiyle görüşme', status: 'Tamamlandı', priority: 'Yüksek', assignedTo: ['Mustafa Toylak'], date: '30.11.2025', description: 'Proje detayları konuşulacak' },
  { id: 4, title: 'Yedekleme Kontrolü', status: 'Tamamlandı', priority: 'Düşük', assignedTo: ['Berkay Can Benli'], date: '01.12.2025', description: 'Sunucu yedekleri kontrol edilecek' },
  { id: 5, title: 'Fatura Ödemeleri', status: 'Tamamlandı', priority: 'Yüksek', assignedTo: ['Sümeyye Şencan'], date: '05.12.2025', description: 'İnternet ve elektrik faturaları' },
  { id: 6, title: 'Stok Sayımı', status: 'Tamamlandı', priority: 'Orta', assignedTo: ['Kerem k Koyuncu'], date: '08.12.2025', description: 'Ofis malzemeleri sayımı' }
];

export default function ExternalTasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useSupabaseAuth();
  
  const [profiles, setProfiles] = useState({});
  const [personnelList, setPersonnelList] = useState([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Tüm Durumlar');
  const [timeFilter, setTimeFilter] = useState('Tüm Zamanlar');

  const fetchCreateData = async () => {
      const { data: profs } = await supabase.from('profiles').select('id, full_name');
      const pMap = {};
      if (profs) profs.forEach(p => pMap[p.id] = p.full_name);
      setProfiles(pMap);
      setPersonnelList(profs || []);
      return pMap;
  };

  const fetchTasks = async (pMapOverride = null) => {
    try {
        setLoading(true);
        try {
            await supabase.rpc('check_and_update_delayed_tasks');
        } catch (rpcErr) {
            console.warn("RPC check_and_update_delayed_tasks not found or failed, skipping.");
        }

        const { data, error } = await supabase
            .from('external_tasks')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        
        const activeProfiles = pMapOverride || profiles;
        const mapped = data.map(t => ({
            ...t,
            date: t.due_date ? format(parseISO(t.due_date), 'dd.MM.yyyy') : (t.created_at ? format(parseISO(t.created_at), 'dd.MM.yyyy') : '-'),
            assignedToNames: (t.assigned_to || []).map(uid => activeProfiles[uid] || 'Bilinmiyor')
        }));
        setTasks(mapped);
    } catch (e) {
        console.error("External tasks fetch error:", e);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
     if (user) {
         fetchCreateData().then(pMap => {
             fetchTasks(pMap);
         });
     }
     
     // Also listen for dashboard updates
     window.addEventListener('taskCreated', () => fetchTasks());
     return () => window.removeEventListener('taskCreated', () => fetchTasks());
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

  const handleCreateTask = async (taskData) => {
    try {
        const { error } = await supabase.from('external_tasks').insert({
            title: taskData.title,
            description: taskData.description,
            status: mapStatus(taskData.status),
            priority: (taskData.priority || 'orta').charAt(0).toUpperCase() + (taskData.priority || 'orta').slice(1),
            due_date: sanitizeDate(taskData.dueDate),
            assigned_to: taskData.assignees || [] // Already IDs from modal
        });

        if (error) {
            console.error("Task Insert Error:", error);
            throw error;
        }

        console.log("Task inserted successfully:", taskData.title);

        // Notify other components (Dashboard etc.)
        window.dispatchEvent(new CustomEvent('taskCreated'));

        await fetchTasks();
        setIsCreateModalOpen(false);
    } catch (e) {
        console.error("handleCreateTask Error:", e);
        alert('Ekleme hatası: ' + e.message);
    }
  };

  const handleUpdateTask = async (updatedData) => {
    try {
        const { error } = await supabase.from('external_tasks').update({
            title: updatedData.title,
            description: updatedData.description,
            status: mapStatus(updatedData.status),
            priority: (updatedData.priority || 'orta').charAt(0).toUpperCase() + (updatedData.priority || 'orta').slice(1),
            due_date: sanitizeDate(updatedData.dueDate),
            assigned_to: updatedData.assignees || [] // Already IDs from modal
        }).eq('id', selectedTask.id);

        if (error) {
            console.error("Task Update Error:", error);
            throw error;
        }

        // Notify other components (Dashboard etc.)
        window.dispatchEvent(new CustomEvent('taskCreated'));

        await fetchTasks();
        setIsEditModalOpen(false);
        setSelectedTask(null);
    } catch (e) {
        console.error("handleUpdateTask Error:", e);
        alert('Güncelleme hatası: ' + e.message);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Bu görevi silmek istediğinize emin misiniz?')) {
        try {
            const { error } = await supabase.from('external_tasks').delete().eq('id', id);
            if (error) throw error;
            fetchTasks();
        } catch (e) {
            alert('Silme hatası: ' + e.message);
        }
    }
  };

  const handleStatusChange = async (id, newStatus) => {
      const { error } = await supabase.from('external_tasks').update({ status: mapStatus(newStatus) }).eq('id', id);
      if (!error) fetchTasks();
  };

  const mapStatus = (s) => {
    if (!s) return 'Beklemede';
    const lower = s.toLowerCase();
    if (lower.includes('bekle')) return 'Beklemede';
    if (lower.includes('devam')) return 'Devam Ediyor';
    if (lower.includes('tamam')) return 'Tamamlandı';
    if (lower.includes('gecik')) return 'Geciken';
    return s.charAt(0).toUpperCase() + s.slice(1);
  };

  // Stats
  const stats = [
    { label: 'Toplam Görev', value: tasks.length, icon: ClipboardList, color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-900/20' },
    { label: 'Beklemede', value: tasks.filter(o => o.status === 'Beklemede').length, icon: Clock, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20' },
    { label: 'Devam Eden', value: tasks.filter(o => o.status === 'Devam Ediyor').length, icon: Loader2, color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
    { label: 'Tamamlanan', value: tasks.filter(o => o.status === 'Tamamlandı').length, icon: CheckCircle2, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
    { label: 'Gecikmiş', value: tasks.filter(o => o.status === 'Geciken').length, icon: AlertCircle, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20' },
  ];

  const filteredTasks = tasks.filter(task => {
    const assignedNames = task.assignedToNames || [];
    const assignedToString = assignedNames.join(' ');
    
    const matchesSearch = 
      task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (task.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      assignedToString.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'Tüm Durumlar' || task.status === statusFilter;

    let matchesTime = true;
    if (timeFilter !== 'Tüm Zamanlar' && task.created_at) {
       const taskDate = parseISO(task.created_at);
       const now = new Date();
       const diffTime = Math.abs(now - taskDate);
       const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
       
       if (timeFilter === 'Son 1 Hafta') matchesTime = diffDays <= 7;
       if (timeFilter === 'Son 1 Ay') matchesTime = diffDays <= 30;
    }

    return matchesSearch && matchesStatus && matchesTime;
  });

  return (
    <div className="space-y-6 relative">
      {loading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/50 dark:bg-slate-900/50 backdrop-blur-[1px]">
          <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
        </div>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Harici Görevler</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">Ofis dışı veya genel işlerin takibi.</p>
        </div>
        <Button 
          onClick={() => setIsCreateModalOpen(true)}
          className="bg-violet-600 hover:bg-violet-700 text-white shadow-lg shadow-violet-500/20 gap-2 dark:shadow-violet-900/40"
        >
          <Plus className="w-4 h-4" />
          Yeni Görev Ekle
        </Button>
      </div>

       {/* Stats Cards */}
       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {stats.map(stat => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{stat.label}</p>
                <p className="text-3xl font-black text-slate-900 dark:text-white mt-1">{stat.value}</p>
              </div>
              <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-transform hover:scale-105", stat.bg, stat.color)}>
                <Icon className="w-6 h-6" />
              </div>
            </div>
          )
        })}
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm p-4">
         <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
               <input 
                 type="text" 
                 placeholder="Görev veya sorumlu kişi ara..." 
                 className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 transition-all text-slate-900 dark:text-white"
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
               />
            </div>
            <div className="flex gap-2">
               <div className="relative">
                  <select 
                    className="px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl text-sm text-slate-600 dark:text-slate-300 focus:outline-none appearance-none pr-8 cursor-pointer"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option>Tüm Durumlar</option>
                    <option>Beklemede</option>
                    <option>Devam Ediyor</option>
                    <option>Tamamlandı</option>
                    <option>Geciken</option>
                  </select>
               </div>
            </div>
         </div>

         <div className="overflow-x-auto">
            <table className="w-full text-left border-separate border-spacing-y-2">
                <thead>
                    <tr className="text-slate-400 text-[10px] font-black uppercase tracking-widest">
                        <th className="pb-3 pl-4 w-[40%]">Görev / Açıklama</th>
                        <th className="pb-3">Sorumlu</th>
                        <th className="pb-3 text-center">Öncelik</th>
                        <th className="pb-3 text-center">Durum</th>
                        <th className="pb-3 text-right pr-6">İşlemler</th>
                    </tr>
                </thead>
                <tbody className="space-y-2">
                   {filteredTasks.length === 0 ? (
                       <tr>
                           <td colSpan="5" className="text-center py-12 text-slate-400 font-medium">
                               Henüz harici görev bulunmuyor.
                           </td>
                       </tr>
                   ) : (
                       filteredTasks.map(task => (
                           <tr key={task.id} className="group bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm hover:shadow-md">
                               <td className="py-4 pl-4 rounded-l-2xl w-[40%]">
                                   <div className="font-bold text-slate-900 dark:text-white group-hover:text-violet-600 transition-colors uppercase text-sm tracking-tight">{task.title}</div>
                                   <div className="flex items-center gap-3 mt-1.5">
                                       <span className={cn(
                                            "flex items-center gap-1 text-[10px] font-bold uppercase",
                                            task.due_date && format(parseISO(task.due_date), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd') && task.status !== 'Tamamlandı' ? "text-red-500" : "text-slate-400 dark:text-slate-500"
                                       )}>
                                            <Calendar className="w-3 h-3 text-amber-500" />
                                            {task.due_date ? format(parseISO(task.due_date), 'dd MMM yyyy') : 'Süresiz'}
                                            {task.due_date && format(parseISO(task.due_date), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd') && task.status !== 'Tamamlandı' && " (BUGÜN!)"}
                                       </span>
                                       {task.description && (
                                            <div className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 italic">{task.description}</div>
                                       )}
                                   </div>
                               </td>
                               <td className="py-4">
                                   <div className="flex items-center gap-2">
                                       <div className="w-8 h-8 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center text-[10px] font-black text-violet-600 dark:text-violet-400 border border-violet-200 dark:border-violet-800">
                                           {task.assignedToNames[0]?.charAt(0).toUpperCase() || '?'}
                                       </div>
                                       <div className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate max-w-[120px]">
                                           {task.assignedToNames.join(', ')}
                                       </div>
                                   </div>
                               </td>
                               <td className="py-4 text-center">
                                   <span className={cn(
                                       "inline-block px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border",
                                       task.priority === 'Yüksek' ? 'bg-red-50 text-red-600 border-red-100 dark:bg-red-900/20' : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800'
                                   )}>
                                      {task.priority || 'Normal'}
                                   </span>
                               </td>
                               <td className="py-4 text-center">
                                    <span className={cn(
                                        "inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider text-white shadow-sm",
                                        task.status === 'Devam Ediyor' ? 'bg-indigo-500' : 
                                        task.status === 'Beklemede' ? 'bg-amber-500' :
                                        task.status === 'Tamamlandı' ? 'bg-emerald-500' : 
                                        task.status === 'Geciken' ? 'bg-red-600' : 'bg-slate-500'
                                    )}>
                                       {task.status}
                                    </span>
                               </td>
                               <td className="py-4 pr-4 rounded-r-2xl text-right">
                                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <Button 
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => { setSelectedTask(task); setIsEditModalOpen(true); }}
                                        className="h-8 w-8 text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/20"
                                      >
                                          <Pencil className="w-4 h-4" />
                                      </Button>
                                      <Button 
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleDelete(task.id)}
                                        className="h-8 w-8 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                                      >
                                          <Trash2 className="w-4 h-4" />
                                      </Button>
                                  </div>
                               </td>
                           </tr>
                       ))
                   )}
                </tbody>
            </table>
         </div>
      </div>

      <CreateExternalTaskModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
        onCreate={handleCreateTask} 
        availablePersonnel={personnelList}
      />

      <CreateExternalTaskModal 
        isOpen={isEditModalOpen} 
        onClose={() => setIsEditModalOpen(false)} 
        onCreate={handleUpdateTask}
        initialData={selectedTask}
        availablePersonnel={personnelList}
      />
    </div>
  );
}
