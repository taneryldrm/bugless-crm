import React, { useState, useEffect, useRef } from 'react';
import { Sun, AlertTriangle, Coffee, Clock, Calendar } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { format, differenceInMinutes, set } from 'date-fns';
import { tr } from 'date-fns/locale';

export function SmartBriefingWidget({ user }) {
  const [loading, setLoading] = useState(true);
  const [timelineItems, setTimelineItems] = useState([]);
  const [nowPosition, setNowPosition] = useState(0);

  useEffect(() => {
    if (!user) return;

    const fetchTimeline = async () => {
      try {
        setLoading(true);
        const today = new Date();
        const todayStr = format(today, 'yyyy-MM-dd'); // Fix: Use local date, not UTC

        // 2. Fetch Tasks Due Today
        const { data: tasks } = await supabase
          .from('external_tasks')
          .select('id, title, due_date')
           .gte('due_date', todayStr + 'T00:00:00')
           .lte('due_date', todayStr + 'T23:59:59');

        // 3. Fetch Calendar Events
        const { data: calendarEvents } = await supabase
           .from('calendar_events')
           .select('id, title, start_time, end_time, type')
           .gte('start_time', todayStr + 'T00:00:00')
           .lte('start_time', todayStr + 'T23:59:59');

        // Build Events Array
        const events = [];
        // ... (rest of logic same)

        // Add Tasks as Checkpoints
        tasks?.forEach((t, i) => {
             const time = set(today, { hours: 14 + i, minutes: 0 }); // Fallback time for tasks
             events.push({
                 id: t.id,
                 title: t.title,
                 time: time,
                 type: 'task', // Green
                 duration: 15
             });
        });

        // Add Calendar Events
        calendarEvents?.forEach(e => {
            events.push({
                id: e.id,
                title: e.title,
                time: new Date(e.start_time),
                type: e.type || 'event',
                duration: differenceInMinutes(new Date(e.end_time), new Date(e.start_time)) || 30
            });
        });

        // Current Time Logic
        updateNowPosition(); 
        const interval = setInterval(() => updateNowPosition(), 60000);

        setTimelineItems(events.sort((a,b) => a.time - b.time));
        setLoading(false);

        return () => clearInterval(interval);

      } catch (err) {
        console.error("Briefing error:", err);
        setLoading(false);
      }
    };

    fetchTimeline();

    // Realtime Subscription
    const subscription = supabase
      .channel('public:calendar_events')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'calendar_events' }, fetchTimeline)
      .subscribe();

    return () => {
        supabase.removeChannel(subscription);
    };
  }, [user]);

  const updateNowPosition = (start, end) => { // start/end args are unused now or we pass 00:00 and 23:59
      const now = new Date();
      const currentMinutes = (now.getHours() * 60) + now.getMinutes();
      const totalMinutes = 24 * 60;
      setNowPosition((currentMinutes / totalMinutes) * 100);
  };

  if (loading) return <div className="col-span-1 lg:col-span-3 h-40 rounded-3xl bg-slate-100 dark:bg-slate-800 animate-pulse border border-slate-200 dark:border-slate-800" />;

  // 9:00 to 24:00 (15 hours span)
  const hours = [9, 12, 15, 18, 21, 24];

  return (
    <div className="col-span-1 lg:col-span-3 bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 relative overflow-hidden flex flex-col justify-center">
        
        {/* Header */}
        <div className="flex justify-between items-end mb-6">
            <div>
                 <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Clock className="w-6 h-6 text-violet-600" />
                    Bugünün Zaman Tüneli
                 </h2>
                 <p className="text-slate-500 text-sm mt-1">
                     {timelineItems.length > 0 ? `${timelineItems.length} aktivite planlandı.` : 'Bugün takvim boş görünüyor.'}
                 </p>
            </div>
            <div className="text-right">
                <span className="text-3xl font-black text-slate-900 dark:text-white font-mono tracking-wider">
                    {format(new Date(), 'HH:mm')}
                </span>
            </div>
        </div>

        {/* Timeline Container - Scrollable Wrapper */}
        <div className="relative w-full h-32 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden group/timeline">
             
             {/* Draggable/Scrollable Area */}
             <div className="overflow-x-auto h-full w-full scrollbar-hide cursor-grab active:cursor-grabbing pb-2" style={{ scrollBehavior: 'smooth' }}>
                 <div className="relative min-w-[200%] h-full"> {/* 200% width makes it scrollable/spacious */}
                    
                      {/* Hour Markers (Every 2 hours) */}
                      <div className="absolute inset-0 flex justify-between px-8 items-end pb-2 pointer-events-none z-10">
                          {Array.from({ length: 25 }).map((_, i) => i).filter(h => h % 2 === 0).map(h => (
                              <div key={h} className="flex flex-col items-center gap-2 opacity-30 absolute top-0 h-full" style={{ left: `${(h / 24) * 100}%` }}>
                                  <div className="h-full w-px bg-slate-300 dark:bg-slate-600 border-l border-dashed h-24" />
                                  <span className="text-xs font-mono font-bold absolute bottom-2">{h.toString().padStart(2, '0')}:00</span>
                              </div>
                          ))}
                      </div>

                      {/* Events */}
                      {timelineItems.map(item => {
                          const startHour = item.time.getHours() + (item.time.getMinutes() / 60);
                          const pos = (startHour / 24) * 100; 
                          
                          return (
                              <div 
                                 key={item.id} 
                                 className={`absolute top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm whitespace-nowrap z-20 cursor-pointer transition-all hover:scale-110 hover:z-30 border ${
                                     item.type === 'meeting' 
                                         ? 'bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-900 dark:text-violet-100 dark:border-violet-700'
                                         : item.type === 'task'
                                         ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900 dark:text-emerald-100 dark:border-emerald-700'
                                         : 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900 dark:text-amber-100 dark:border-amber-700'
                                 }`}
                                 style={{ left: `${pos}%` }}
                                 title={`${item.title} at ${format(item.time, 'HH:mm')}`}
                              >
                                  <div className="flex items-center gap-1.5">
                                      <span className={`w-1.5 h-1.5 rounded-full ${
                                          item.type === 'meeting' ? 'bg-violet-500' : 
                                          item.type === 'task' ? 'bg-emerald-500' : 'bg-amber-500'
                                      }`} />
                                      {item.title}
                                  </div>
                                  <div className="text-[9px] opacity-70 font-mono mt-0.5 ml-3">
                                      {format(item.time, 'HH:mm')}
                                  </div>
                              </div>
                          );
                      })}

                      {/* Current Time Indicator */}
                      <div 
                         className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-30 shadow-[0_0_10px_rgba(239,68,68,0.5)] transition-all duration-1000 ease-linear"
                         style={{ left: `${nowPosition}%` }} // Ensure updateNowPosition logic is updated too!
                      >
                          <div className="absolute top-0 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-red-500 rounded-full shadow-sm" />
                          <div className="absolute bottom-0 -translate-x-1/2 translate-y-1/2 w-3 h-3 bg-red-500 rounded-full shadow-sm" />
                      </div>
                 </div>
             </div>

        </div>

    </div>
  );
}
