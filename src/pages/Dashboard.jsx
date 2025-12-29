import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Pause, Square, MapPin, Wifi, CalendarDays, BarChart3, 
  Briefcase, FileText, Plus, Zap, StickyNote, TrendingDown, CheckCircle2, AlertCircle 
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { format, isSameWeek, parseISO, subDays } from 'date-fns';
import { tr } from 'date-fns/locale';
import { useSupabaseAuth } from '@/context/SupabaseAuthContext';
import { supabase } from '@/lib/supabase';
import { SmartBriefingWidget } from '@/components/SmartBriefingWidget';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useSupabaseAuth();
  
  // Real-time Stats via RPC (Turbo Speed)
  const [stats, setStats] = useState({
      total_clients: 0,
      total_projects: 0,
      active_projects: 0,
      my_pending_tasks: 0,
      weekly_revenue: 0,
      // Legacy arrays (Keep for performer widgets for now, will optimize later)
      projects_raw: [], 
      sessions_raw: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
        try {
            setLoading(true);
            await supabase.rpc('check_and_update_delayed_tasks');
            
            // 1. Fetch High-Speed Summary Stats
            const { data: summary, error: rpcError } = await supabase.rpc('get_dashboard_stats');
            if (rpcError) throw rpcError;

            // 2. Fetch recent data for performer widgets (avoiding 50k row crash)
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            const dateStr = thirtyDaysAgo.toISOString();

            const { data: projects } = await supabase
                .from('projects')
                .select('*, profiles(full_name)')
                .gte('start_date', dateStr)
                .order('start_date', { ascending: false })
                .limit(100);

            const { data: sessions } = await supabase
                .from('work_sessions')
                .select('*, profiles(full_name)')
                .gte('start_time', dateStr)
                .order('start_time', { ascending: false })
                .limit(100);

            const { data: profiles } = await supabase.from('profiles').select('full_name');

            setStats({
                ...summary,
                projects_raw: projects || [],
                sessions_raw: sessions || [],
                all_users: profiles || []
            });
        } finally {
            setLoading(false);
        }
    };

    fetchData();
  }, [user]);

  if (!user) return <div className="p-10 text-center text-slate-500">Yükleniyor...</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Welcome Section */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter transition-colors">
              Hoş geldin, <span className="bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">{user.email?.split('@')[0]}</span> 👋
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-2 font-medium transition-colors">
              <CalendarDays className="w-4 h-4 text-violet-500" />
              {format(new Date(), 'd MMMM yyyy EEEEE', { locale: tr })}
              <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
              Bugün harika işler çıkaracağız.
            </p>
          </div>
          
          <div className="flex items-center gap-3">
             {/* Quick Actions Dock */}
             <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors duration-300">
                <DockButton icon={Briefcase} label="Proje" onClick={() => navigate('/projects')} count={stats.total_projects} />
                <DockButton icon={FileText} label="İş Emrim" onClick={() => navigate('/work-orders')} count={stats.my_pending_tasks} />
                <DockButton icon={Plus} label="Müşteri" onClick={() => navigate('/clients')} count={stats.total_clients} />
             </div>
          </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* TOP: SMART BRIEFING */}
        <SmartBriefingWidget user={user} />

        {/* LEFT COLUMN - Focus & Timer */}
        <div className="space-y-8">
            {/* 1. WORK TIMER WIDGET */}
            <WorkTimerWidget user={user} />

            {/* 2. PERSONAL NOTES */}
            <PersonalNotesWidget user={user} />

            {/* 3. QUICK TASK WIDGET */}
            <QuickTaskWidget user={user} />
        </div>

        {/* MIDDLE & RIGHT COLUMN - Tasks & Stats */}
        <div className="lg:col-span-2 space-y-6">
            {/* 3. PERFORMANCE WIDGETS (Top Row) */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                <WeekPerformerWidget projects={stats.projects_raw} sessions={stats.sessions_raw} all_users={stats.all_users} loading={loading} />
                <LeastPerformerWidget projects={stats.projects_raw} sessions={stats.sessions_raw} all_users={stats.all_users} loading={loading} />
                <TopPerformerWidget projects={stats.projects_raw} sessions={stats.sessions_raw} loading={loading} />
            </div>

            {/* Tasks Widget */}
            <MyTasksWidget user={user} /> 
        </div>
      </div>
    </div>
  );
}

function DockButton({ icon: Icon, label, onClick, count }) {
    return (
        <button 
           onClick={onClick}
           className="relative group p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-slate-500 dark:text-slate-400 hover:text-violet-600 dark:hover:text-violet-400"
        >
            <Icon className="w-6 h-6" />
            <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-900 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-20">
                {label}
            </span>
            {count !== undefined && count > 0 && (
                <span className="absolute top-2 right-2 w-2 h-2 bg-violet-500 rounded-full border border-white dark:border-slate-900" />
            )}
        </button>
    )
}

// --- SUB-COMPONENTS ---

/* 1. WORK TIMER WIDGET */
function WorkTimerWidget({ user }) {
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [location, setLocation] = useState('Ofis'); 
  
  // State refs for calculations
  const [startTimestamp, setStartTimestamp] = useState(null);
  const [totalPausedTime, setTotalPausedTime] = useState(0);
  const [pauseStartTimestamp, setPauseStartTimestamp] = useState(null);
  const [stopConfirm, setStopConfirm] = useState(false);
  const [sessionDescription, setSessionDescription] = useState('');

  const intervalRef = useRef(null);

  // Load from LocalStorage (Keep active timer local for resilience)
  useEffect(() => {
     try {
         const savedStr = localStorage.getItem(`timer_state_${user.id}`);
         if (savedStr) {
             const saved = JSON.parse(savedStr);
             setIsActive(saved.isActive);
             setIsPaused(saved.isPaused);
             setLocation(saved.location);
             setStartTimestamp(saved.startTimestamp);
             setTotalPausedTime(saved.totalPausedTime || 0);
             setPauseStartTimestamp(saved.pauseStartTimestamp);

             // Restore elapsed time display
             if (saved.isActive) {
                 const now = Date.now();
                 const start = saved.startTimestamp || now;
                 const paused = saved.totalPausedTime || 0;

                 if (saved.isPaused && saved.pauseStartTimestamp) {
                     const effectiveElapsed = (saved.pauseStartTimestamp - start - paused);
                     setSeconds(Math.max(0, Math.floor(effectiveElapsed / 1000)));
                 } else {
                     const effectiveElapsed = (now - start - paused);
                     setSeconds(Math.max(0, Math.floor(effectiveElapsed / 1000)));
                 }
             }
         }
     } catch(e) { 
         console.error("Timer load error", e);
     }
  }, [user.id]);

  // Timer Tick
  useEffect(() => {
    if (isActive && !isPaused && startTimestamp) {
      intervalRef.current = setInterval(() => {
        const now = Date.now();
        const effectiveElapsed = now - startTimestamp - totalPausedTime;
        setSeconds(Math.floor(effectiveElapsed / 1000));
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [isActive, isPaused, startTimestamp, totalPausedTime]);

  // Persist State
  useEffect(() => {
      if (isActive) {
          const state = {
              isActive,
              isPaused,
              location,
              startTimestamp,
              totalPausedTime,
              pauseStartTimestamp
          };
          localStorage.setItem(`timer_state_${user.id}`, JSON.stringify(state));
      } else if (!isActive && startTimestamp === null) {
          localStorage.removeItem(`timer_state_${user.id}`);
      }
  }, [isActive, isPaused, location, startTimestamp, totalPausedTime, pauseStartTimestamp, user.id]);

  const toggleTimer = () => {
    if (!isActive) {
       // START
       const now = Date.now();
       setStartTimestamp(now);
       setTotalPausedTime(0);
       setIsActive(true);
       setIsPaused(false);
    } else if (!isPaused) {
       // PAUSE
       setPauseStartTimestamp(Date.now());
       setIsPaused(true);
    } else {
       // RESUME
       const now = Date.now();
       const pausedDuration = now - pauseStartTimestamp;
       setTotalPausedTime(prev => prev + pausedDuration);
       setPauseStartTimestamp(null);
       setIsPaused(false);
    }
  };

  const stopTimer = () => {
      setStopConfirm(true);
  };

  const finalizeSession = async () => {
         const endTime = Date.now();
         let finalDuration = 0;
         const start = startTimestamp || Date.now();
         const paused = totalPausedTime || 0;

         if (isPaused && pauseStartTimestamp) {
             finalDuration = Math.floor((pauseStartTimestamp - start - paused) / 1000);
         } else {
             finalDuration = Math.floor((endTime - start - paused) / 1000);
         }
         finalDuration = Math.max(0, finalDuration);

         // SAVE TO SUPABASE
         try {
             // Find profile for user
             const { error } = await supabase.from('work_sessions').insert({
                 user_id: user.id,
                 start_time: new Date(start).toISOString(),
                 end_time: new Date(endTime).toISOString(),
                 duration: finalDuration,
                 location: location,
                 description: sessionDescription
             });
             
             if (error) throw error;
             
             // Clear Local State
             setIsActive(false);
             setIsPaused(false);
             setSeconds(0);
             setStartTimestamp(null);
             setPauseStartTimestamp(null);
             setTotalPausedTime(0);
             setStopConfirm(false);
             setSessionDescription('');
             localStorage.removeItem(`timer_state_${user.id}`);
             
             alert("Çalışma oturumu kaydedildi!");
             window.location.reload(); 
             
         } catch(e) {
             console.error("Session save failed:", e);
             alert("Kayedilirken hata oluştu: " + e.message);
         }
  };

  const formatTime = (totalSeconds) => {
    if (!totalSeconds || isNaN(totalSeconds)) totalSeconds = 0;
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden group">
        
        {/* Stop Confirmation Modal */}
        {stopConfirm && (
             <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
                 <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-2xl w-full max-w-xs overflow-hidden text-center">
                     <div className="p-6">
                         <h3 className="text-lg font-bold text-white">Günü Bitir?</h3>
                         <p className="text-gray-400 mt-2 text-sm">Çalışma süreniz kaydedilip oturum kapatılacak.</p>
                         <div className="mt-4 text-left">
                           <textarea 
                             className="w-full bg-slate-900/50 border border-slate-700 rounded-xl p-3 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                             placeholder="Özet..."
                             rows={3}
                             value={sessionDescription}
                             onChange={(e) => setSessionDescription(e.target.value)}
                           />
                         </div>
                     </div>
                     <div className="bg-gray-900/50 px-6 py-4 flex gap-3">
                         <button onClick={() => setStopConfirm(false)} className="flex-1 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700 rounded-lg">Vazgeç</button>
                         <button onClick={finalizeSession} className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-500 rounded-lg">Bitir & Kaydet</button>
                     </div>
                 </div>
             </div>
        )}

        {/* Glow */}
        <div className={cn("absolute top-0 right-0 w-64 h-64 bg-violet-600 rounded-full blur-[100px] opacity-20", isActive && !isPaused && "opacity-40 animate-pulse")} />

        <div className="relative z-10 flex flex-col items-center">
            {/* Location */}
            {!isActive && (
                <div className="flex bg-white/10 p-1 rounded-full mb-8 backdrop-blur-md border border-white/10">
                    <button onClick={() => setLocation('Ofis')} className={cn("px-4 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-2", location === 'Ofis' ? "bg-white text-slate-900 shadow-lg" : "text-slate-400 hover:text-white")}><MapPin className="w-3 h-3" /> Ofis</button>
                    <button onClick={() => setLocation('Uzaktan')} className={cn("px-4 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-2", location === 'Uzaktan' ? "bg-white text-slate-900 shadow-lg" : "text-slate-400 hover:text-white")}><Wifi className="w-3 h-3" /> Uzaktan</button>
                </div>
            )}
            
            {isActive && (
                <div className="mb-8 flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/20 text-violet-200 text-xs font-medium border border-violet-500/30">
                    <div className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
                    {location === 'Ofis' ? 'Ofistesin' : 'Uzaktan Çalışıyorsun'}
                </div>
            )}

            {/* Time */}
            <div className="text-6xl font-black font-mono tracking-wider mb-8 tabular-nums bg-gradient-to-b from-white to-slate-400 bg-clip-text text-transparent">{formatTime(seconds)}</div>

            {/* Controls */}
            <div className="flex items-center gap-4">
               <button onClick={toggleTimer} className={cn("w-16 h-16 rounded-2xl flex items-center justify-center transition-all shadow-xl active:scale-95 border border-white/10", isActive && !isPaused ? "bg-amber-500 text-slate-900" : "bg-white text-slate-900")}>
                  {isActive && !isPaused ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-1" />}
               </button>
               {isActive && (
                   <button onClick={stopTimer} className="w-16 h-16 rounded-2xl bg-red-500/10 text-red-500 border border-red-500/20 flex items-center justify-center transition-all shadow-lg active:scale-95 hover:bg-red-500 hover:text-white">
                      <Square className="w-6 h-6 fill-current" />
                   </button>
               )}
            </div>
            <p className="mt-6 text-slate-500 text-xs font-medium uppercase tracking-widest">{isActive ? (isPaused ? 'Duraklatıldı' : 'Çalışma Kaydediliyor...') : 'Süreç Başlatılmaya Hazır'}</p>
        </div>
    </div>
  );
}

/* 2. TOP PERFORMER WIDGET */
function TopPerformerWidget({ projects, sessions, loading }) {
    const [champion, setChampion] = useState(null);

    useEffect(() => {
        if (!projects || !sessions || loading) return;
        const scores = {};
        
        // Sales Champion focus on projects (25 points per project managed)
        projects.forEach(p => {
             const managerName = p.profiles?.full_name;
             if (managerName) scores[managerName] = (scores[managerName] || 0) + 25;
        });

        // Add small bonus for work consistency (1 point per hour)
        sessions.forEach(s => {
             const userName = s.profiles?.full_name;
             if (userName && s.duration) {
                 scores[userName] = (scores[userName] || 0) + (s.duration / 3600);
             }
        });

        let best = null;
        let max = -1;
        Object.keys(scores).forEach(name => {
            if (scores[name] > max) {
                max = scores[name];
                best = name;
            }
        });

        setChampion(best ? { name: best, score: Math.round(max) } : { name: 'Veri Yok', score: 0 });

    }, [projects, sessions, loading]);

    if (loading || !champion) {
        return (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 h-[140px] animate-pulse flex items-center justify-center">
                 <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-xl" />
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 relative overflow-hidden flex items-center justify-between mb-8 group hover:shadow-xl transition-all">
             <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-amber-100/50 dark:from-amber-900/30 to-transparent rounded-full -translate-y-1/2 translate-x-1/2" />
             <div className="relative z-10">
                <p className="text-amber-600 dark:text-amber-500 text-[10px] font-black uppercase tracking-widest mb-1 flex items-center gap-1">
                   <span className="w-1 h-1 rounded-full bg-amber-500 animate-ping" />
                   Satış Şampiyonu
                </p>
                <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{champion.name}</h3>
                <div className="text-xs text-slate-500 mt-2">+{champion.score} puan</div>
             </div>
             <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center text-white shadow-lg">
                 <Zap className="w-8 h-8 fill-current" />
             </div>
        </div>
    );
}

function WeekPerformerWidget({ projects, sessions, all_users, loading }) {
    const [champions, setChampions] = useState([]);

    useEffect(() => {
        if (!projects || !sessions || loading) return;
        const now = new Date();
        const sevenDaysAgo = subDays(now, 7);
        const scores = {};
        
        // Initialize scores for everyone
        if (all_users) {
            all_users.forEach(u => { if(u.full_name) scores[u.full_name] = 0; });
        }

        projects.forEach(p => {
             if (p.start_date) {
                 const pDate = parseISO(p.start_date);
                 if (pDate >= sevenDaysAgo) {
                    const managerName = p.profiles?.full_name;
                    if (managerName) scores[managerName] = (scores[managerName] || 0) + 10;
                 }
             }
        });

        sessions.forEach(s => {
             if (s.start_time) {
                 const sDate = parseISO(s.start_time);
                 if (sDate >= sevenDaysAgo) {
                    const userName = s.profiles?.full_name;
                    if (userName) scores[userName] = (scores[userName] || 0) + (s.duration / 3600);
                 }
             }
        });

        // Convert to array
        const allScores = Object.entries(scores)
            .map(([name, score]) => ({ name, score: Math.round(score * 10) / 10 }));

        // For "Champions", filter those with score > 0 first
        let activePerformers = allScores.filter(s => s.score > 0).sort((a, b) => b.score - a.score);
        
        // If nobody has points, it's okay to show 0 point people, but ideally we want to see workers
        const sorted = activePerformers.length > 0 ? activePerformers.slice(0, 2) : allScores.sort((a,b) => a.name.localeCompare(b.name)).slice(0, 2);

        setChampions(sorted.length > 0 ? sorted : [{ name: 'Veri Yok', score: 0 }]);

    }, [projects, sessions, all_users, loading]);

    if (loading || champions.length === 0) {
        return (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 h-[140px] animate-pulse flex items-center justify-center">
                 <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-xl" />
            </div>
        );
    }

     return (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 relative overflow-hidden flex items-center justify-between mb-8 group hover:shadow-xl transition-all">
             <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-violet-100/50 dark:from-violet-900/30 to-transparent rounded-full -translate-y-1/2 translate-x-1/2" />
             <div className="relative z-10 w-full pr-16">
                <p className="text-violet-600 dark:text-violet-400 text-[10px] font-black uppercase tracking-widest mb-1 flex items-center gap-1">
                   <span className="w-1 h-1 rounded-full bg-violet-500 animate-ping" />
                   Haftanın Çalışkanları
                </p>
                
                <div className="space-y-4 mt-4">
                    {champions.map((champ, i) => (
                        <div key={i} className="flex items-center justify-between border-b border-dashed border-slate-100 dark:border-slate-800 last:border-0 pb-1 last:pb-0">
                            <div>
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">{champ.name}</h3>
                                <div className="text-[10px] text-slate-500 font-medium">#{i+1} • {champ.score} puan</div>
                            </div>
                            {i === 0 && <span className="text-lg">👑</span>}
                        </div>
                    ))}
                </div>
             </div>
             <div className="absolute right-6 top-1/2 -translate-y-1/2 w-12 h-12 bg-gradient-to-br from-violet-400 to-fuchsia-500 rounded-2xl flex items-center justify-center text-white shadow-lg">
                 <Zap className="w-6 h-6 fill-current" />
             </div>
        </div>
    );
}

function LeastPerformerWidget({ projects, sessions, all_users, loading }) {
    const [worsePerformers, setWorsePerformers] = useState([]);

    useEffect(() => {
        if (!projects || !sessions || loading) return;
        const now = new Date();
        const sevenDaysAgo = subDays(now, 7);
        const scores = {};

        // 1. Initialize Everyone with 0
        if (all_users) {
            all_users.forEach(u => { if(u.full_name) scores[u.full_name] = 0; });
        }

        projects.forEach(p => {
             if (p.start_date) {
                 const pDate = parseISO(p.start_date);
                 if (pDate >= sevenDaysAgo) {
                    const managerName = p.profiles?.full_name;
                    if (managerName) scores[managerName] = (scores[managerName] || 0) + 10;
                 }
             }
        });

        sessions.forEach(s => {
             if (s.start_time) {
                 const sDate = parseISO(s.start_time);
                 if (sDate >= sevenDaysAgo) {
                    const userName = s.profiles?.full_name;
                    if (userName) scores[userName] = (scores[userName] || 0) + (s.duration / 3600);
                 }
             }
        });

        // Convert to array and sort ASC (Lowest first)
        const sorted = Object.entries(scores)
            .map(([name, score]) => ({ name, score: Math.round(score * 10) / 10 }))
            // Focus on "real" least performers (those with very low but maybe some activity, or just those at bottom)
            // But if we have 50 users and only 2 worked, 48 people have 0.
            // Let's just show top 2 lowest scores.
            .sort((a, b) => a.score - b.score)
            .slice(0, 2); 

        setWorsePerformers(sorted.length > 0 ? sorted : [{ name: 'Veri Yok', score: 0 }]);

    }, [projects, sessions, all_users, loading]);

    if (loading || worsePerformers.length === 0) {
        return (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 h-[140px] animate-pulse flex items-center justify-center">
                 <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-xl" />
            </div>
        );
    }

     return (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 relative overflow-hidden flex items-center justify-between mb-8 group hover:shadow-xl transition-all">
             <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-red-100/50 dark:from-red-900/30 to-transparent rounded-full -translate-y-1/2 translate-x-1/2" />
             <div className="relative z-10 w-full pr-16">
                <p className="text-red-500 dark:text-red-400 text-[10px] font-black uppercase tracking-widest mb-1 flex items-center gap-1">
                   <span className="w-1 h-1 rounded-full bg-red-400 animate-pulse" />
                   Haftanın En Az Eforu
                </p>
                <div className="space-y-4 mt-4">
                    {worsePerformers.map((p, i) => (
                        <div key={i} className="flex items-center justify-between border-b border-dashed border-red-100 dark:border-red-900/20 last:border-0 pb-1 last:pb-0">
                            <div>
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">{p.name}</h3>
                                <div className="text-[10px] text-slate-500 font-medium">{p.score} puan</div>
                            </div>
                        </div>
                    ))}
                </div>
             </div>
             <div className="absolute right-6 top-1/2 -translate-y-1/2 w-12 h-12 bg-gradient-to-br from-red-400 to-rose-500 rounded-2xl flex items-center justify-center text-white shadow-lg">
                 <TrendingDown className="w-6 h-6 fill-current" />
             </div>
        </div>
    );
}

function PersonalNotesWidget({ user }) {
    const [note, setNote] = useState('');
    const [status, setStatus] = useState('saved'); // 'saved', 'saving', 'error'
    const saveTimeoutRef = useRef(null);

    useEffect(() => {
        // Fetch note from DB
        if (!user) return;
        const fetchNote = async () => {
            try {
                const { data, error } = await supabase
                    .from('personal_notes')
                    .select('content')
                    .eq('user_id', user.id)
                    .maybeSingle(); // Better than .single() if it might not exist
                
                if (data) setNote(data.content || '');
            } catch (err) {
                console.error("Note fetch error:", err);
            }
        };
        fetchNote();
    }, [user]);

    const saveNote = async (content) => {
        if (!user) return;
        setStatus('saving');
        try {
            const { error } = await supabase
                .from('personal_notes')
                .upsert({ 
                    user_id: user.id, 
                    content: content,
                    updated_at: new Date().toISOString() 
                }, { onConflict: 'user_id' });
            
            if (error) throw error;
            setStatus('saved');
        } catch (err) {
            console.error("Note save error:", err);
            setStatus('error');
        }
    };

    const handleChange = (e) => {
        const val = e.target.value;
        setNote(val);
        setStatus('saving');

        // Debounce logic: Save after 1 second of no typing
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(() => {
            saveNote(val);
        }, 1000);
    };

    // Save on unmount to catch final changes
    useEffect(() => {
        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
                // Note: We can't really await here, but we can try an immediate save
                // though page refresh might still cut it off.
            }
        };
    }, []);

    return (
        <div className="bg-[#FFF9C4] dark:bg-amber-900/30 rounded-3xl p-6 shadow-sm border border-yellow-200/50 dark:border-amber-800/30 relative overflow-hidden group hover:shadow-md transition-all">
             <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-black/5 to-transparent pointer-events-none" />
             <div className="flex items-center justify-between mb-4">
                 <div className="flex items-center gap-2 text-yellow-800 dark:text-amber-200">
                    <StickyNote className="w-5 h-5" />
                    <h3 className="font-bold">Notlarım</h3>
                 </div>
                 <div className="text-[10px] font-medium transition-opacity">
                    {status === 'saving' && <span className="text-yellow-700/60 dark:text-amber-400/60 animate-pulse">Kaydediliyor...</span>}
                    {status === 'saved' && <span className="text-green-600/60 dark:text-emerald-400/60 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Saklandı</span>}
                    {status === 'error' && <span className="text-red-600/60 dark:text-rose-400/60 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Hata</span>}
                 </div>
             </div>
             <textarea 
                className="w-full h-40 bg-transparent border-none resize-none focus:outline-none text-gray-800 dark:text-amber-100 placeholder-yellow-700/50 dark:placeholder-amber-700/50 text-sm leading-relaxed"
                placeholder="Aklındakileri buraya not al..."
                value={note}
                onChange={handleChange}
             />
        </div>
    );
}

function MyTasksWidget({ user }) {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    const fetchTasks = async () => {
        if (!user) return;
        setLoading(true);
        try {
            // Safe RPC call
            const { error: rpcError } = await supabase.rpc('check_and_update_delayed_tasks');
            if (rpcError && rpcError.code !== 'P0001' && rpcError.status !== 404) {
                console.warn("RPC check_and_update_delayed_tasks failed:", rpcError);
            }

            const { data, error } = await supabase.rpc('get_my_dashboard_tasks');
            if (error) {
                // FALLBACK: If RPC missing, fetch directly
                if (error.status === 404) {
                    console.warn("RPC get_my_dashboard_tasks not found, using direct fetch fallback");
                    
                    const [extRes, workRes] = await Promise.all([
                        supabase.from('external_tasks').select('*').neq('status', 'Tamamlandı').limit(10),
                        supabase.from('work_orders').select('*').neq('status', 'Tamamlandı').limit(10)
                    ]);

                    const merged = [
                        ...(extRes.data || []).map(t => ({ ...t, source_type: 'Harici Görev' })),
                        ...(workRes.data || []).map(t => ({ ...t, source_type: 'İş Emri' }))
                    ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 10);

                    setTasks(merged);
                    setLoading(false);
                    return;
                }
                throw error;
            }
            
            // Local calculation to ensure "red" status shows up immediately even if DB hasn't synced
            const mapped = (data || []).map(t => {
                const isActuallyDelayed = t.due_date && new Date(t.due_date) < new Date().setHours(0,0,0,0) && t.status !== 'Tamamlandı';
                return {
                    ...t,
                    status: isActuallyDelayed ? 'Geciken' : t.status
                };
            });
            
            setTasks(mapped);
        } catch (err) {
            console.error("Fetch tasks error:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleComplete = async (taskId, sourceType) => {
        try {
            setLoading(true);
            const table = sourceType === 'İş Emri' ? 'work_orders' : 'external_tasks';
            
            const { error } = await supabase
                .from(table)
                .update({ status: 'Tamamlandı' })
                .eq('id', taskId);

            if (error) throw error;
            
            // Refresh the list
            fetchTasks();
        } catch (err) {
            console.error("Complete task error:", err);
            alert("Hata: " + err.message);
            setLoading(false);
        }
    };


    useEffect(() => {
        fetchTasks();
        
        // Listen for new tasks created via QuickTaskWidget
        window.addEventListener('taskCreated', fetchTasks);
        return () => window.removeEventListener('taskCreated', fetchTasks);
    }, [user]);

    return (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-lg text-slate-900 dark:text-white">Görevlerim & İş Emirlerim</h3>
                <button onClick={() => navigate('/work-orders')} className="text-sm font-medium text-violet-600 dark:text-violet-400 hover:underline">Tümü</button>
            </div>
            
            <div className="space-y-3">
                {loading ? (
                    <div className="flex justify-center p-4">
                        <div className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : tasks.length === 0 ? (
                    <p className="text-slate-500 text-sm">Aktif görev veya iş emri bulunmuyor.</p>
                ) : (
                    tasks.map(t => (
                        <div key={t.id} className={cn(
                            "flex items-center gap-3 p-3 rounded-xl border transition-all relative overflow-hidden",
                            t.status === 'Geciken' 
                                ? "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800 shadow-sm" 
                                : "bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700 group hover:border-violet-200 dark:hover:border-violet-900/50"
                        )}>
                            {t.status === 'Geciken' && (
                                <div className="absolute top-0 right-0 w-12 h-12 bg-red-500/5 rounded-full -translate-y-1/2 translate-x-1/2 flex items-center justify-center pt-4 pr-4">
                                    <AlertCircle className="w-3 h-3 text-red-500" />
                                </div>
                            )}
                            <button 
                                onClick={() => handleComplete(t.id, t.source_type)}
                                className={cn(
                                    "w-8 h-8 rounded-lg flex items-center justify-center border transition-colors",
                                    t.status === 'Geciken'
                                        ? "bg-white dark:bg-slate-900 border-red-200 dark:border-red-800 text-slate-300 hover:text-red-500 hover:border-red-500"
                                        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-300 hover:text-emerald-500 hover:border-emerald-200"
                                )}
                                title="Tamamlandı Olarak İşaretle"
                            >
                                <CheckCircle2 className="w-5 h-5" />
                            </button>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                    <h4 className={cn(
                                        "font-bold text-sm truncate",
                                        t.status === 'Geciken' ? "text-red-700 dark:text-red-400" : "text-slate-900 dark:text-slate-100"
                                    )}>{t.title}</h4>
                                    <span className={cn(
                                        "text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider",
                                        t.source_type === 'İş Emri' ? "bg-violet-100 text-violet-600 dark:bg-violet-900/30" : "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30",
                                        t.status === 'Geciken' && "border border-red-200 dark:border-red-800"
                                    )}>
                                        {t.source_type}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-500 truncate">{t.description || 'Açıklama yok'}</p>
                            </div>
                            <div className="text-right">
                                <span className={cn(
                                    "text-[10px] font-bold block whitespace-nowrap",
                                    t.status === 'Geciken' ? "text-red-600" : "text-slate-400"
                                )}>
                                    {t.due_date ? format(parseISO(t.due_date), 'd MMM', {locale: tr}) : format(parseISO(t.created_at), 'd MMM', {locale: tr})}
                                </span>
                                <span className={cn(
                                    "text-[9px] font-bold uppercase",
                                    t.status === 'Geciken' ? "text-red-500" : "text-slate-400/70"
                                )}>{t.status}</span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}

function QuickTaskWidget({ user }) {
    const [title, setTitle] = useState('');
    const [loading, setLoading] = useState(false);

    const handleCreate = async (e) => {
        if (e.key === 'Enter' || e.type === 'click') {
            if (!title.trim()) return;
            
            setLoading(true);
            try {
                const { error } = await supabase.from('external_tasks').insert({
                    title: title.trim(),
                    status: 'Beklemede',
                    assigned_to: [user.id]
                });

                if (error) {
                    console.error("Quick task insert error detail:", error);
                    throw error;
                }
                
                console.log("Quick task created successfully!");
                setTitle('');
                // Dispatch event to refresh MyTasksWidget
                window.dispatchEvent(new CustomEvent('taskCreated'));
            } catch (err) {
                console.error("Quick task catch error:", err);
                alert("Hata: " + (err.message || JSON.stringify(err)));
            } finally {
                setLoading(false);
            }
        }
    };

    return (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 transition-all hover:shadow-md">
            <div className="flex items-center gap-2 mb-4 text-violet-600 dark:text-violet-400">
                <Zap className="w-5 h-5 fill-current" />
                <h3 className="font-bold">Hızlı Görev Ekle</h3>
            </div>
            <div className="relative">
                <input 
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    onKeyDown={handleCreate}
                    disabled={loading}
                    placeholder="Görev başlığı yaz ve Enter'a bas..."
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl py-3 pl-4 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600"
                />
                <button 
                    onClick={handleCreate}
                    disabled={loading || !title.trim()}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-xl bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-violet-200 dark:shadow-none"
                >
                    <Plus className="w-5 h-5" />
                </button>
            </div>
            <p className="mt-3 text-[10px] text-slate-400 dark:text-slate-500 font-medium italic">
                * Bu görevler 'Harici Görevler' sekmesine kaydedilir.
            </p>
        </div>
    );
}
