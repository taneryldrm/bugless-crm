import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  CheckCircle2, 
  Clock, 
  ChevronLeft, 
  ChevronRight, 
  Plus,
  Bell,
  Briefcase,
  User,
  Coffee,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, isToday, parseISO, isAfter } from 'date-fns';
import { tr } from 'date-fns/locale';
import NewTaskModal from '@/components/modals/NewTaskModal';
import { Button } from '@/components/ui/Button';
import TaskDetailModal from '@/components/modals/TaskDetailModal';
import { supabase } from '@/lib/supabase';
import { useSupabaseAuth } from '@/context/SupabaseAuthContext';

const TASK_TYPES = {
  meeting: { label: 'Toplantı', color: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800', icon: Briefcase },
  task: { label: 'Görev', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800', icon: CheckCircle2 },
  event: { label: 'Kişisel/Olay', color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800', icon: User },
  break: { label: 'Mola', color: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800', icon: Coffee },
};

export default function CalendarPage() {
  const { user } = useSupabaseAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [tasks, setTasks] = useState({}); // Dictionary: 'YYYY-MM-DD': [events]
  const [loading, setLoading] = useState(false);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  
  const [selectedTask, setSelectedTask] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // -- Unified Fetch --
  const fetchEvents = async () => {
      if (!user) return;
      setLoading(true);
      
      const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 }).toISOString();
      const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 }).toISOString();

      try {
          const grouped = {};

          // 1. Calendar Events
          const { data: calEvents, error: calError } = await supabase
              .from('calendar_events')
              .select('id, title, description, start_time, type, priority, is_completed')
              .gte('start_time', start).lte('start_time', end);

          if (calError) {
              console.error("Calendar fetch error:", calError);
              if (calError.message?.includes('is_completed') || calError.code === '42703') {
                  alert("Veritabanı hatası: 'is_completed' sütunu bulunamadı. Lütfen paylaştığım SQL komutunu çalıştırdığınızdan emin olun.");
              }
          }

          calEvents?.forEach(e => {
              const dateKey = new Date(e.start_time).toISOString().split('T')[0];
              const timeStr = format(new Date(e.start_time), 'HH:mm');
              if (!grouped[dateKey]) grouped[dateKey] = [];
              grouped[dateKey].push({
                  id: e.id,
                  title: e.title,
                  time: timeStr,
                  date: dateKey,
                  type: e.type || 'event',
                  description: e.description,
                  priority: e.priority,
                  isCompleted: e.is_completed, // Added mapping
                  source: 'calendar_events',
                  original: e
              });
          });

          // 2. External Tasks
          const { data: extTasks } = await supabase
              .from('external_tasks')
              .select('*')
              .gte('due_date', start).lte('due_date', end);

          extTasks?.forEach(t => {
              const dateKey = new Date(t.due_date).toISOString().split('T')[0];
              const timeStr = t.due_date.includes('T') ? format(new Date(t.due_date), 'HH:mm') : '09:00';
              if (!grouped[dateKey]) grouped[dateKey] = [];
              grouped[dateKey].push({
                  id: t.id,
                  title: t.title,
                  time: timeStr,
                  date: dateKey, // Added
                  type: 'task',
                  priority: t.priority,
                  description: t.description,
                  isCompleted: t.status === 'Tamamlandı',
                  source: 'external_tasks',
                  original: t
              });
          });

          // 3. Meeting Notes - REMOVED per user request
          // User wants to manage calendar manually or via pure tasks.
          
          /*
          const { data: notes } = await supabase
              .from('meeting_notes')
              .select('*')
              .gte('date', start).lte('date', end);

          notes?.forEach(n => {
              const dateKey = new Date(n.date).toISOString().split('T')[0];
              const timeStr = format(new Date(n.date), 'HH:mm'); 
              if (!grouped[dateKey]) grouped[dateKey] = [];
              grouped[dateKey].push({
                  id: n.id,
                  title: n.title,
                  time: timeStr,
                  date: dateKey,
                  type: 'meeting',
                  source: 'meeting_notes',
                  original: n
              });
          });
          */

          // Sort by time
          Object.keys(grouped).forEach(key => {
              grouped[key].sort((a,b) => a.time.localeCompare(b.time));
          });

          setTasks(grouped);

      } catch (e) {
          console.error("Calendar fetch error:", e);
      } finally {
          setLoading(false);
      }
  };

  useEffect(() => {
      fetchEvents();
  }, [currentMonth, user]);

  // -- Navigation --
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const goToToday = () => setCurrentMonth(new Date());

  // -- Handlers --
  const handleAddTask = async (formData) => {
    if (!user) {
        alert("Lütfen önce giriş yapın.");
        return;
    }

    try {
        const dateTime = new Date(`${formData.date}T${formData.time}:00`);
        let error = null;

        // ALWAYS insert into 'calendar_events' (Personal Calendar)
        // User requested these NOT go to 'external_tasks' (Harici Görevler)
        const endTime = new Date(dateTime.getTime() + 60*60*1000);
        
        const { error: err } = await supabase.from('calendar_events').insert({
             user_id: user.id,
             title: formData.title,
             description: formData.description,
             start_time: dateTime.toISOString(),
             end_time: endTime.toISOString(),
             type: formData.type || 'event', // 'task', 'meeting', 'break' etc.
             priority: formData.priority
        });
        error = err;

        if (error) throw error;
        
        fetchEvents();
        setIsModalOpen(false);

    } catch(e) {
        console.error("Add task error:", e);
        alert("Hata: " + (e.message || e.error_description || "Bilinmeyen hata"));
    }
  };

  const handleDeleteTask = async (task) => {
      if (!confirm("Silmek istediğinize emin misiniz?")) return;
      try {
          const table = task.source;
          
          if (table === 'meeting_notes') {
              alert("Toplantı notlarını 'Toplantı Notları' sayfasından silebilirsiniz.");
              return;
          }

          const { error } = await supabase.from(table).delete().eq('id', task.id);
          if (error) throw error;
          
          fetchEvents();
          setIsDetailModalOpen(false);
      } catch(e) {
          console.error("Delete error:", e);
          alert("Silinemedi.");
      }
  };

  const handleUpdateTask = async (task) => {
      if (!user) return;
      try {
          // Reconstruct Date
          const dateTime = new Date(`${task.date}T${task.time}:00`);

          if (task.source === 'calendar_events') {
              const endTime = new Date(dateTime.getTime() + 60*60*1000); // 1h default for now
              
              const { error } = await supabase.from('calendar_events').update({
                  title: task.title,
                  description: task.description,
                  type: task.type,
                  priority: task.priority,
                  start_time: dateTime.toISOString(),
                  end_time: endTime.toISOString(),
                  is_completed: task.isCompleted
              }).eq('id', task.id);

              if (error) {
                  console.error("Update error (calendar_events):", error);
                  alert("Güncelleme hatası (Kişisel Ajanda): " + error.message);
                  return;
              }

          } else if (task.source === 'external_tasks') {
              const { error } = await supabase.from('external_tasks').update({
                  title: task.title,
                  description: task.description,
                  priority: task.priority,
                  due_date: dateTime.toISOString(),
                  status: task.isCompleted ? 'Tamamlandı' : 'Beklemede'
              }).eq('id', task.id);

              if (error) {
                  console.error("Update error (external_tasks):", error);
                  alert("Güncelleme hatası (Harici Görev): " + error.message);
                  return;
              }
          } else if (task.source === 'meeting_notes') {
             // Only allow title update maybe? Or deny.
             alert("Toplantı notlarını buradan düzenleyemezsiniz.");
             return;
          }

          fetchEvents();
          setIsDetailModalOpen(false);
      } catch(e) {
          console.error("Update error:", e);
          alert("Güncellenemedi.");
      }
  };

  const openNewTaskModal = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    setSelectedDate(dateStr);
    setIsModalOpen(true);
  };

  const openTaskDetail = (e, task) => {
    e.stopPropagation(); 
    setSelectedTask(task);
    setIsDetailModalOpen(true);
  };

  // -- Render Logic ... Reusing existing renderCells/render etc --
  const getTaskStyle = (type, isCompleted) => {
      if (isCompleted) return "bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-slate-500 line-through border-gray-200 dark:border-slate-700 grayscale";
      const style = TASK_TYPES[type] || TASK_TYPES.event;
      return style.color;
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const rows = [];
    let days = [];
    let day = startDate;

    const today = new Date();

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        const cloneDay = day;
        const dateKey = format(day, 'yyyy-MM-dd');
        const dayTasks = tasks[dateKey] || [];
        const isCurrentMonth = isSameMonth(day, monthStart);
        const isTodayDate = isToday(day);

        days.push(
          <div
            key={day}
            onClick={() => openNewTaskModal(cloneDay)}
            className={cn(
              "min-h-[140px] border-b border-r border-gray-100 dark:border-slate-800 p-2 relative group transition-all duration-200 hover:bg-gray-50/80 dark:hover:bg-slate-800/50 cursor-pointer overflow-hidden",
              !isCurrentMonth ? "bg-gray-50/30 dark:bg-slate-950/50 text-gray-400 dark:text-slate-600" : "bg-white dark:bg-slate-900",
              isTodayDate ? "bg-indigo-50/30 dark:bg-indigo-900/10 ring-1 ring-inset ring-indigo-200 dark:ring-indigo-800 z-10" : ""
            )}
          >
             {/* Date Number */}
             <div className="flex items-center justify-between mb-2">
               <span 
                className={cn(
                    "w-8 h-8 flex items-center justify-center rounded-full text-sm font-medium transition-colors",
                    isTodayDate ? "bg-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-indigo-900/40" : "text-gray-700 dark:text-slate-300",
                    !isCurrentMonth && "text-gray-400 dark:text-slate-600"
                )}
               >
                 {format(day, 'd')}
               </span>
               <Button 
                 variant="ghost" 
                 size="icon" 
                 className="opacity-0 group-hover:opacity-100 h-6 w-6 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-all rounded-full"
               >
                  <Plus className="w-4 h-4" />
               </Button>
            </div>
            
            {/* Task List */}
            <div className="space-y-1.5 pl-1">
               {dayTasks.map((task, idx) => {
                 const typeKey = task.type === 'meeting' ? 'meeting' : task.type === 'task' ? 'task' : 'event';
                 const Icon = TASK_TYPES[typeKey].icon || TASK_TYPES.event.icon;
                 
                 return (
                    <div 
                      key={idx} 
                      onClick={(e) => openTaskDetail(e, task)}
                      className={cn(
                        "px-2 py-1.5 rounded-lg text-xs border shadow-sm truncate transition-all hover:scale-[1.02] active:scale-95 flex items-center gap-2",
                        getTaskStyle(typeKey, task.isCompleted)
                      )}
                    >
                        <Icon className="w-3 h-3 shrink-0" />
                        <span className="truncate flex-1 font-medium">{task.time} {task.title}</span>
                    </div>
                 )
               })}
            </div>
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(
        <div key={day} className="grid grid-cols-7 border-l border-gray-100 dark:border-slate-800 last:border-b-0">
          {days}
        </div>
      );
      days = [];
    }
    return <div className="border-t border-gray-100 dark:border-slate-800 rounded-b-xl overflow-hidden shadow-sm">{rows}</div>;
  };

  const getUpcomingTasks = () => {
      const all = [];
      const now = new Date();
      Object.entries(tasks).forEach(([dateKey, dayTasks]) => {
          if (isAfter(parseISO(dateKey), now) || isSameDay(parseISO(dateKey), now)) {
              dayTasks.forEach(task => {
                  if (!task.isCompleted) {
                      all.push({ ...task, date: dateKey });
                  }
              });
          }
      });
      return all.sort((a,b) => (a.date + a.time).localeCompare(b.date + b.time)).slice(0, 5);
  };
  
  const upcomingTasks = getUpcomingTasks();
  const allTasksCount = Object.values(tasks).flat().length;
  const completedCount = Object.values(tasks).flat().filter(t => t.isCompleted).length;

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-slate-950 pb-10 transition-colors">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
         <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Kişisel Ajanda</h1>
            <p className="text-gray-500 dark:text-slate-400 mt-2 font-medium">Toplantı, görev ve etkinlikleriniz tek yerde.</p>
         </div>
         <div className="flex items-center gap-4">
             <Button onClick={() => openNewTaskModal(new Date())} className="bg-gray-900 dark:bg-white text-white dark:text-slate-900 hover:bg-black dark:hover:bg-slate-200 shadow-lg shadow-gray-200 dark:shadow-none">
                <Plus className="w-4 h-4 mr-2" />
                Hızlı Ekle
             </Button>
         </div>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
          <div className="xl:col-span-3 space-y-6">
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
                  <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 transition-colors">
                      <div className="flex items-center gap-4">
                          <h2 className="text-2xl font-bold text-gray-900 dark:text-white capitalize">
                            {format(currentMonth, 'MMMM yyyy', { locale: tr })}
                          </h2>
                          <div className="flex items-center gap-1 bg-gray-100 dark:bg-slate-800 p-1 rounded-lg">
                              <Button variant="ghost" size="sm" onClick={prevMonth} className="h-8 w-8 p-0"><ChevronLeft className="w-4 h-4" /></Button>
                              <Button variant="ghost" size="sm" onClick={nextMonth} className="h-8 w-8 p-0"><ChevronRight className="w-4 h-4" /></Button>
                          </div>
                      </div>
                      <Button onClick={goToToday} variant="outline" className="hidden sm:flex border-gray-200 dark:border-slate-700 dark:text-slate-200">Bugüne Dön</Button>
                  </div>
                  <div className="grid grid-cols-7 border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/50">
                     {['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map(day => (
                         <div key={day} className="py-3 text-center text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider">{day}</div>
                     ))}
                  </div>
                  <div className="bg-white dark:bg-slate-900">
                     {loading ? <div className="p-20 text-center text-slate-400">Yükleniyor...</div> : renderCells()}
                  </div>
              </div>
          </div>
          <div className="space-y-6">
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm p-6 relative overflow-hidden transition-colors">
                  <h3 className="font-bold text-gray-900 dark:text-white mb-6">Yaklaşan Etkinlikler</h3>
                  <div className="space-y-4 relative z-10">
                      {upcomingTasks.length > 0 ? upcomingTasks.map((task, i) => (
                           <div key={i} className="flex gap-4 group cursor-pointer" onClick={(e) => openTaskDetail(e, task)}>
                               <div className="flex flex-col items-center">
                                  <div className={cn("w-3 h-3 rounded-full border-2 border-white shadow-sm shrink-0 mt-1", 
                                      getTaskStyle(task.type === 'meeting' ? 'meeting' : task.type === 'task' ? 'task' : 'event', task.isCompleted).split(' ')[0].replace('bg-', 'bg-')
                                  )} style={{ backgroundColor: 'currentColor' }}></div> 
                               </div>
                               <div className="pb-4 flex-1 border-b border-gray-50 last:border-0">
                                   <p className="text-xs font-medium text-gray-400 dark:text-slate-500 mb-0.5">
                                       {format(parseISO(task.date), 'd MMMM, EEEE', { locale: tr })} • {task.time}
                                   </p>
                                   <h4 className="text-sm font-semibold text-gray-900 dark:text-slate-200">{task.title}</h4>
                               </div>
                           </div>
                      )) : <div className="text-center py-8 text-gray-400 text-sm">Plan bulunmuyor.</div>}
                  </div>
              </div>
          </div>
      </div>
      <NewTaskModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} date={selectedDate} onAdd={handleAddTask} taskTypes={TASK_TYPES} />
      <TaskDetailModal isOpen={isDetailModalOpen} onClose={() => setIsDetailModalOpen(false)} task={selectedTask} onUpdate={handleUpdateTask} onDelete={handleDeleteTask} />
    </div>
  );
}
