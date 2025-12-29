import React, { useState, useEffect } from 'react';
import { useSupabaseAuth } from '@/context/SupabaseAuthContext';
import { 
  Clock, 
  MapPin, 
  Monitor, 
  Trash2, 
  User, 
  Calendar, 
  AlertCircle,
  X,
  CheckCircle2,
  Briefcase,
  Trophy,
  TrendingUp,
  Award
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { supabase } from '@/lib/supabase';

export default function PersonnelAnalysis({ projects = [], profiles = [], sessions = [], workOrders = [], externalTasks = [], dateRange, dateFilter }) {
  const { isAdmin } = useSupabaseAuth();
  const [delayedTasks, setDelayedTasks] = useState([]);
  const [hoveredStats, setHoveredStats] = useState(null);
  const [selectedPersonName, setSelectedPersonName] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [delayedPriorityFilter, setDelayedPriorityFilter] = useState('Tümü');
  const [delayedTypeFilter, setDelayedTypeFilter] = useState('Tümü');
  
  const [systemUsers, setSystemUsers] = useState([]);
  const [sessionToDelete, setSessionToDelete] = useState(null);

  useEffect(() => {
    // 1. Set Users from Profiles
    const pMap = {};
    if (profiles.length > 0) {
        setSystemUsers(profiles.map(p => {
            pMap[p.id] = p.full_name;
            return p.full_name;
        }));
    }

    // 2. Identify Delayed Tasks
    const isDelayed = (task) => {
       if (!task) return false;
       const s = (task.status || '').trim().toLowerCase();
       // Skip finished ones
       if (s === 'tamamlandı' || s === 'completed' || s === 'done' || s === 'iptal' || s === 'cancelled') return false;
       
       // Explicitly marked as delayed
       if (s === 'geciken' || s === 'delayed') return true; 
       
       // No date = not delayed (unless explicitly marked)
       if (!task.date) return false;
       
       try {
           const due = new Date(task.date);
           due.setHours(0,0,0,0);
           
           const today = new Date();
           today.setHours(0,0,0,0);
           
           return due < today;
       } catch (e) {
           return false;
       }
    };

    const delayedWO = workOrders.filter(isDelayed).map(t => ({
        ...t, 
        type: 'İş Emri', 
        assignees: (t.assignedToIds || []).length > 0 ? t.assignedToIds.map(uid => pMap[uid] || 'Bilinmiyor') : ['Atanmamış']
    }));

    const delayedExt = externalTasks.filter(isDelayed).map(t => ({
        ...t,
        type: 'Harici Görev',
        assignees: (t.assignedToIds || []).length > 0 ? t.assignedToIds.map(uid => pMap[uid] || 'Bilinmiyor') : ['Atanmamış']
    }));

    const allDelayed = [...delayedWO, ...delayedExt];
    console.log("PersonnelAnalysis - Total Delayed Found:", allDelayed.length);
    setDelayedTasks(allDelayed);
  }, [profiles, workOrders, externalTasks]);

  // --- Calculations ---
  const formatDuration = (seconds) => {
    if (!seconds) return '0s';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}s ${m}d`;
  };

  const filteredSessions = React.useMemo(() => {
      const { startDate, endDate } = dateRange || {};
      if (!startDate || !endDate) return sessions;

      return sessions.filter(s => {
          if (!s.date) return false;
          const sDate = parseISO(s.date);
          return sDate >= startDate && sDate <= endDate;
      });
  }, [sessions, dateRange]);

  // Combine Data: Sessions + Projects
  const personnelStats = React.useMemo(() => {
      const stats = {};
      const { startDate, endDate } = dateRange || {};
      
      // Init
      systemUsers.forEach(name => {
          stats[name] = { 
              name, 
              totalSeconds: 0, 
              officeSeconds: 0, 
              remoteSeconds: 0, 
              projectsCount: 0, 
              activeTasks: 0, 
              completedTasks: 0 
          };
      });

      // Calc Sessions
      filteredSessions.forEach(s => {
          if (stats[s.user]) {
              stats[s.user].totalSeconds += (s.duration || 0);
              if (s.type === 'Office' || s.location === 'Ofis') stats[s.user].officeSeconds += (s.duration || 0);
              else stats[s.user].remoteSeconds += (s.duration || 0);
          }
      });

      // Calc Projects
      projects.forEach(p => {
          const members = p.members || []; 
          members.forEach(m => {
              const uName = profiles.find(pr => pr.id === m)?.full_name;
              if (uName && stats[uName]) stats[uName].projectsCount += 1;
          });
      });

      // Calc Tasks (Work Orders)
      workOrders.forEach(task => {
          const assignees = (task.assignedToIds || []).map(uid => profiles.find(p => p.id === uid)?.full_name);
          assignees.forEach(assignee => {
              if (assignee && stats[assignee]) {
                  const s = (task.status || '').trim().toLowerCase();
                  if (s === 'tamamlandı' || s === 'completed' || s === 'done') {
                      stats[assignee].completedTasks += 1;
                  } else if (s !== 'iptal' && s !== 'cancelled') {
                      stats[assignee].activeTasks += 1;
                  }
              }
          });
      });
      
      return stats;
  }, [filteredSessions, systemUsers, projects, profiles, workOrders, dateRange]);


  const statsList = Object.values(personnelStats).sort((a, b) => b.totalSeconds - a.totalSeconds);
  const displayedPerson = selectedPersonName ? personnelStats[selectedPersonName] : null;

  // Top Performer (Most Hours)
  const topPerformer = statsList.length > 0 ? statsList[0] : null;
  // Most Efficient (Most Projects Membership)
  const mostEfficient = [...statsList].sort((a,b) => b.projectsCount - a.projectsCount)[0];

  // Filter & Group Delayed Tasks
  const filteredDelayedTasks = delayedTasks.filter(task => {
      if (delayedPriorityFilter !== 'Tümü' && (task.priority || 'Normal') !== delayedPriorityFilter) return false;
      if (delayedTypeFilter !== 'Tümü' && task.type !== delayedTypeFilter) return false;
      return true;
  });

  const delayedByPerson = filteredDelayedTasks.reduce((acc, task) => {
      const assignees = task.assignees || [];
      if (assignees.length === 0) {
          if (!acc['Atanmamış']) acc['Atanmamış'] = [];
          acc['Atanmamış'].push(task);
      } else {
          assignees.forEach(person => {
              if (!acc[person]) acc[person] = [];
              acc[person].push(task);
          });
      }
      return acc;
  }, {});

  const ADMINS = ['Kerem Koyuncu', 'Sümeyye Şencan']; 

  // Handlers
  const handleDeleteDelayedTask = (e, task) => {
      e.stopPropagation();
      // Logic to delete task from DB?
      alert('Görevi silmek için İş Emirleri sayfasına gidiniz.');
  };

  const handleDeleteSession = (session) => {
      setSessionToDelete(session);
  };

  const executeDeleteSession = async () => {
      if (!sessionToDelete) return;

      try {
          const { error } = await supabase.from('work_sessions').delete().eq('id', sessionToDelete.id);
          if (error) throw error;
           window.location.reload(); 
      } catch (e) {
          alert('Hata: ' + e.message);
      } finally {
          setSessionToDelete(null);
      }
  };

  // Calculate Top Project Bringer
  const getProjectBringerStats = () => {
      const bringers = {};
      projects.forEach(p => {
          const uName = profiles.find(pr => pr.id === p.created_by)?.full_name;
          if (uName) {
              bringers[uName] = (bringers[uName] || 0) + 1;
          }
      });
      return Object.entries(bringers).sort((a, b) => b[1] - a[1])[0] || [null, 0];
  };

  const [topBringer, bringerCount] = getProjectBringerStats();

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* 1. Header Cards - Performer & Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-indigo-100 dark:border-indigo-900/30 shadow-sm relative overflow-hidden group hover:shadow-xl transition-all">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-full translate-x-10 -translate-y-10 group-hover:scale-110 transition-transform" />
              <div className="relative z-10 flex items-center justify-between">
                  <div>
                      <p className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-1">En Çok Çalışan</p>
                      <h4 className="text-xl font-bold text-slate-900 dark:text-white">{topPerformer ? topPerformer.name : '-'}</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{topPerformer ? formatDuration(topPerformer.totalSeconds) : '0s'} çalışma süresi</p>
                  </div>
                  <div className="w-14 h-14 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-inner">
                      <Trophy className="w-7 h-7" />
                  </div>
              </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-fuchsia-100 dark:border-fuchsia-900/30 shadow-sm relative overflow-hidden group hover:shadow-xl transition-all">
              <div className="absolute top-0 right-0 w-32 h-32 bg-fuchsia-50/50 dark:bg-fuchsia-900/10 rounded-full translate-x-10 -translate-y-10 group-hover:scale-110 transition-transform" />
              <div className="relative z-10 flex items-center justify-between">
                  <div>
                      <p className="text-[10px] font-black text-fuchsia-600 dark:text-fuchsia-400 uppercase tracking-widest mb-1">En Sosyal / Aktif</p>
                      <h4 className="text-xl font-bold text-slate-900 dark:text-white">{mostEfficient ? mostEfficient.name : '-'}</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{mostEfficient ? mostEfficient.projectsCount : 0} Projede yer alıyor</p>
                  </div>
                  <div className="w-14 h-14 bg-fuchsia-100 dark:bg-fuchsia-900/30 rounded-2xl flex items-center justify-center text-fuchsia-600 dark:text-fuchsia-400 shadow-inner">
                      <Award className="w-7 h-7" />
                  </div>
              </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-emerald-100 dark:border-emerald-900/30 shadow-sm relative overflow-hidden group hover:shadow-xl transition-all">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50/50 dark:bg-emerald-900/10 rounded-full translate-x-10 -translate-y-10 group-hover:scale-110 transition-transform" />
              <div className="relative z-10 flex items-center justify-between">
                  <div>
                      <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-1">Proje Getiren</p>
                      <h4 className="text-xl font-bold text-slate-900 dark:text-white">{topBringer || '-'}</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{bringerCount} Proje oluşturdu</p>
                  </div>
                  <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-inner">
                      <TrendingUp className="w-7 h-7" />
                  </div>
              </div>
          </div>
      </div>

      {/* 2. Personnel Efficiency Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/30 dark:bg-slate-800/20">
              <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Ekip Performans Analizi</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Seçili tarih aralığına göre çalışan verimlilik tablosu</p>
              </div>
          </div>

          <div className="overflow-x-auto">
             <table className="w-full text-left border-collapse">
                 <thead>
                     <tr className="bg-slate-50/50 dark:bg-slate-800/30 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">
                         <th className="py-4 px-6">Çalışan</th>
                         <th className="py-4 px-6">Toplam Süre</th>
                         <th className="py-4 px-6">Ofis / Uzaktan</th>
                         <th className="py-4 px-6">Projeler</th>
                         <th className="py-4 px-6">Verimlilik</th>
                         <th className="py-4 px-6 text-right">Aksiyon</th>
                     </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
                     {statsList.map((person, idx) => {
                         const tasksComp = person.completedTasks;
                         const tasksTotal = person.completedTasks + person.activeTasks;
                         const performance = tasksTotal > 0 ? Math.min(100, Math.round((tasksComp / tasksTotal) * 100)) : 0;

                         return (
                             <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/50 group transition-colors">
                                 <td className="py-4 px-6">
                                     <div className="flex items-center gap-3">
                                         <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-gray-600 dark:text-slate-300">
                                             {person.name.substring(0,2).toUpperCase()}
                                         </div>
                                         <span className="font-medium text-gray-900 dark:text-white text-sm">{person.name}</span>
                                     </div>
                                 </td>
                                 <td className="py-4 px-6">
                                     <span className="font-bold text-gray-900 dark:text-white text-sm">{formatDuration(person.totalSeconds)}</span>
                                 </td>
                                 <td className="py-4 px-6">
                                     <div className="flex gap-2 text-xs">
                                         <span className="px-2 py-0.5 rounded bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border border-purple-100 dark:border-purple-800">
                                            {formatDuration(person.officeSeconds)}
                                         </span>
                                         <span className="px-2 py-0.5 rounded bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-100 dark:border-green-800">
                                            {formatDuration(person.remoteSeconds)}
                                         </span>
                                     </div>
                                 </td>
                                 <td className="py-4 px-6">
                                     <div className="flex items-center gap-2">
                                         <Briefcase className="w-3 h-3 text-gray-400" />
                                         <span className="text-sm text-gray-600 dark:text-slate-400">{person.projectsCount} Proje</span>
                                     </div>
                                 </td>
                                 <td className="py-4 px-6 w-32">
                                     <div className="w-full bg-gray-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                                         <div 
                                            className="h-full bg-indigo-500 rounded-full transition-all" 
                                            style={{ width: `${performance}%` }}
                                         ></div>
                                     </div>
                                 </td>
                                 <td className="py-4 px-6 text-right">
                                     <Button 
                                       variant="ghost" 
                                       size="sm" 
                                       className="h-8 text-xs text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                                       onClick={() => {
                                           setSelectedPersonName(person.name);
                                           setIsModalOpen(true);
                                       }}
                                     >
                                         Detay
                                     </Button>
                                 </td>
                             </tr>
                         )
                     })}
                 </tbody>
             </table>
          </div>
      </div>

      {/* 4. Delayed Tasks Section */}
      <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-slate-800">
         <div className="bg-red-50/50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-xl p-6 transition-colors">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
               <div className="flex items-center gap-3">
                  <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-500" />
                  <div>
                     <h3 className="text-lg font-bold text-red-900 dark:text-red-400">Geciken Görevler</h3>
                     <p className="text-sm text-red-600/80 dark:text-red-400/80">İş emirleri ve harici görevlerden geciken tüm görevler</p>
                  </div>
               </div>
               
               <div className="flex flex-wrap items-center gap-2">
                  <select 
                      className="text-xs bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900/50 rounded-lg px-2 py-1.5 text-gray-700 dark:text-slate-300 outline-none focus:border-red-400"
                      value={delayedTypeFilter}
                      onChange={(e) => setDelayedTypeFilter(e.target.value)}
                  >
                      <option value="Tümü">Tüm Tipler</option>
                      <option value="İş Emri">İş Emri</option>
                      <option value="Harici Görev">Harici Görev</option>
                  </select>

                  <select 
                      className="text-xs bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900/50 rounded-lg px-2 py-1.5 text-gray-700 dark:text-slate-300 outline-none focus:border-red-400"
                      value={delayedPriorityFilter}
                      onChange={(e) => setDelayedPriorityFilter(e.target.value)}
                  >
                      <option value="Tümü">Tüm Öncelikler</option>
                      <option value="Düşük">Düşük</option>
                      <option value="Normal">Normal</option>
                      <option value="Yüksek">Yüksek</option>
                      <option value="Acil">Acil</option>
                  </select>

                  <div className="bg-white dark:bg-red-950/30 px-3 py-1.5 rounded-lg text-xs font-bold text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/50 shadow-sm">
                     {filteredDelayedTasks.length}
                  </div>
               </div>
            </div>

            <div className="space-y-4">
               {Object.entries(delayedByPerson).map(([person, tasks]) => (
                  <div key={person} className="bg-white dark:bg-slate-900 rounded-xl border border-red-100 dark:border-red-900/30 overflow-hidden shadow-sm transition-colors">
                     <div className="px-4 py-2.5 bg-gray-50/50 dark:bg-slate-800/30 border-b border-red-50 dark:border-red-900/20 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                           <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                           <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tight">{person}</span>
                        </div>
                        <span className="text-[10px] font-black text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 px-2 py-0.5 rounded-full">{tasks.length} Görev</span>
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 p-4">
                        {tasks.map((task, idx) => (
                           <div key={idx} className="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 p-3 hover:border-red-200 dark:hover:border-red-900/50 hover:shadow-md transition-all group relative">
                              <div className="flex flex-col h-full">
                                 <div className="flex items-start justify-between gap-2 mb-1">
                                    <h5 className="text-xs font-bold text-gray-900 dark:text-white uppercase leading-tight line-clamp-1">{task.title}</h5>
                                    {ADMINS.includes(person) && (
                                        <button 
                                           onClick={(e) => handleDeleteDelayedTask(e, task)}
                                           className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all p-1"
                                           title="Kaldır"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    )}
                                 </div>
                                 <p className="text-[11px] text-gray-500 dark:text-slate-400 line-clamp-2 mb-2 leading-tight">{task.description}</p>
                                 
                                 <div className="flex items-center justify-between text-[10px] pt-2 border-t border-gray-100 dark:border-slate-800 mt-auto">
                                    <div className="flex gap-1">
                                        <span className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300">
                                           {task.type}
                                        </span>
                                        <span className={cn(
                                            "px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border",
                                            task.priority === 'Yüksek' || task.priority === 'Acil' ? "border-red-200 dark:border-red-900 text-red-600 dark:text-red-400" : "border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300"
                                        )}>
                                           {task.priority || 'Normal'}
                                        </span>
                                    </div>
                                    <span className="font-medium text-red-600 dark:text-red-400 flex items-center gap-0.5">
                                       <Calendar className="w-2.5 h-2.5" />
                                       {task.date}
                                    </span>
                                 </div>
                              </div>
                           </div>
                        ))}
                     </div>
                  </div>
               ))}
               
               {Object.keys(delayedByPerson).length === 0 && (
                   <div className="text-center py-8 text-gray-500 dark:text-slate-400 text-sm">
                       {filteredDelayedTasks.length === 0 && delayedTasks.length > 0 
                           ? "Filtre kriterlerine uygun geciken görev bulunamadı."
                           : "Geciken görev bulunmamaktadır. Harika!"}
                   </div>
               )}
            </div>
         </div>
      </div>

       {/* Modal for Session Details */}
       {isModalOpen && displayedPerson && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}>
             <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 transition-colors" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-slate-800">
                   <div className="flex items-center gap-4">
                       <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-lg">
                           {displayedPerson.name.substring(0,2).toUpperCase()}
                       </div>
                       <div>
                           <h2 className="text-xl font-bold text-gray-900 dark:text-white">{displayedPerson.name}</h2>
                           <p className="text-sm text-gray-500 dark:text-slate-400">Çalışma Geçmişi</p>
                       </div>
                   </div>
                   <Button variant="ghost" size="icon" onClick={() => setIsModalOpen(false)} className="dark:text-slate-400 dark:hover:bg-slate-800">
                      <X className="w-5 h-5" />
                   </Button>
                </div>

                <div className="max-h-[60vh] overflow-y-auto p-6">
                    <div className="grid grid-cols-3 gap-4 mb-8">
                       <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                          <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Toplam Süre</p>
                          <p className="text-lg font-bold text-slate-900 dark:text-white">{formatDuration(displayedPerson.totalSeconds)}</p>
                       </div>
                       <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                          <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Biten Görev</p>
                          <p className="text-lg font-bold text-slate-900 dark:text-white">{displayedPerson.completedTasks}</p>
                       </div>
                       <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                          <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Projeler</p>
                          <p className="text-lg font-bold text-slate-900 dark:text-white">{displayedPerson.projectsCount}</p>
                       </div>
                    </div>

                    <h4 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                       <Clock className="w-4 h-4 text-indigo-500" />
                       Son Çalışma Oturumları
                    </h4>
                    
                    <div className="space-y-3">
                        {filteredSessions.filter(s => s.user === displayedPerson.name).length === 0 ? (
                            <p className="text-center py-8 text-slate-500 text-sm italic">Oturum kaydı bulunamadı.</p>
                        ) : (
                            filteredSessions
                                .filter(s => s.user === displayedPerson.name)
                                .sort((a,b) => new Date(b.date) - new Date(a.date))
                                .map((sess, i) => (
                                    <div key={i} className="flex items-center justify-between p-4 bg-slate-50/50 dark:bg-slate-800/30 rounded-2xl border border-slate-100/50 dark:border-slate-800/50 group">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-900 flex flex-col items-center justify-center border border-slate-100 dark:border-slate-800 shadow-sm">
                                                <span className="text-[9px] font-black text-indigo-500">{format(parseISO(sess.date), 'MMM').toUpperCase()}</span>
                                                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{format(parseISO(sess.date), 'd')}</span>
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-bold text-slate-900 dark:text-white uppercase">{sess.project_name || 'Genel Çalışma'}</span>
                                                    <span className={cn(
                                                        "text-[9px] px-1.5 py-0.5 rounded-full font-bold border",
                                                        sess.location === 'Ofis' || sess.type === 'Office' 
                                                            ? "bg-purple-50 text-purple-600 border-purple-100 dark:bg-purple-900/20 dark:border-purple-800"
                                                            : "bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-800"
                                                    )}>
                                                        {sess.location || sess.type || 'Uzaktan'}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                                                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {sess.startTime} - {sess.endTime}</span>
                                                    <span className="flex items-center gap-1"><Monitor className="w-3 h-3" /> {sess.description || 'Açıklama yok'}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-sm font-black text-slate-900 dark:text-white">{formatDuration(sess.duration)}</span>
                                            {isAdmin && (
                                                <button 
                                                    onClick={() => handleDeleteSession(sess)}
                                                    className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))
                        )}
                    </div>
                </div>

                <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-gray-100 dark:border-slate-800 flex justify-end">
                    <Button onClick={() => setIsModalOpen(false)} className="bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-700 text-white rounded-xl px-8">Kapat</Button>
                </div>
             </div>
          </div>
       )}

       {/* Session Delete Confirmation Dialog */}
       {sessionToDelete && (
           <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
               <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center border border-slate-100 dark:border-slate-800">
                   <div className="w-20 h-20 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
                       <Trash2 className="w-10 h-10 text-red-500" />
                   </div>
                   <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Oturumu Sil?</h3>
                   <p className="text-sm text-slate-500 dark:text-slate-400 mb-8">Bu çalışma oturumu kalıcı olarak silinecektir. Bu işlem geri alınamaz.</p>
                   
                   <div className="flex gap-3">
                       <Button 
                           variant="ghost" 
                           onClick={() => setSessionToDelete(null)}
                           className="flex-1 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                       >
                           Vazgeç
                       </Button>
                       <Button 
                           onClick={executeDeleteSession}
                           className="flex-1 rounded-2xl bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-200 dark:shadow-red-900/20"
                       >
                           Evet, Sil
                       </Button>
                   </div>
               </div>
           </div>
       )}
    </div>
  );
}
