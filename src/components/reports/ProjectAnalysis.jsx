import React, { useState, useEffect } from 'react';
import { 
  Briefcase, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  DollarSign, 
  TrendingUp, 
  PieChart,
  Layers
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { parseISO } from 'date-fns';

export default function ProjectAnalysis({ dateRange, projects = [], workOrders = [] }) {
  const [filteredProjects, setFilteredProjects] = useState([]);
  const [stats, setStats] = useState({
    totalProjects: 0,
    activeProjects: 0,
    completedProjects: 0,
    totalValue: 0,
    avgValue: 0,
    highPriority: 0
  });

  useEffect(() => {
    // Filter by Date Range
    const filtered = projects.filter(p => {
        if (!dateRange) return true;
        const { startDate, endDate } = dateRange;
        if (!startDate || !endDate) return true;

        // Use start_date from DB
        let pDate = new Date();
        if (p.start_date) {
            pDate = parseISO(p.start_date);
        } else if (p.created_at) {
            pDate = parseISO(p.created_at);
        }
        
        return pDate >= startDate && pDate <= endDate;
    });

    setFilteredProjects(filtered);

    // Calculate Stats
    const total = filtered.length;
    
    // Status normalization
    const active = filtered.filter(p => p.status === 'Devam Ediyor' || p.status === 'Hazırlık' || p.status === 'Planlama').length;
    const completed = filtered.filter(p => p.status === 'Tamamlandı').length;
    
    // Priority (mock if missing)
    const highPri = filtered.filter(p => (p.priority || 'Orta') === 'Yüksek').length;

    const totalVal = filtered.reduce((acc, p) => {
        // Handle numeric or string price
        let val = 0;
        if (typeof p.price === 'number') val = p.price;
        else if (typeof p.price === 'string') {
             val = parseFloat(p.price.replace(/[^0-9,.]/g, '').replace(',', '.')) || 0;
        }
        return acc + val;
    }, 0);

    setStats({
        totalProjects: total,
        activeProjects: active,
        completedProjects: completed,
        totalValue: totalVal,
        avgValue: total > 0 ? totalVal / total : 0,
        highPriority: highPri
    });
  }, [dateRange, projects]);

  const getProjectProgress = (p) => {
      // 1. Check for tasks (Work Orders)
      // Ensure specific string comparison for IDs
      const projectTasks = workOrders.filter(w => String(w.project_id) === String(p.id));
      
      if (projectTasks.length > 0) {
          const completedTasks = projectTasks.filter(w => {
              const s = (w.status || '').trim().toLowerCase();
              return s === 'tamamlandı' || s === 'completed' || s === 'done';
          }).length;
          return Math.round((completedTasks / projectTasks.length) * 100);
      }

      // 2. Fallback: Status based
      if (p.status === 'Tamamlandı') return 100;
      if (p.status === 'Hazırlık' || p.status === 'Planlama') return 0;
      if (p.status === 'Devam Ediyor') return 25; 
      
      return 0; 
  };

  const getPriority = (p) => p.priority || 'Orta';

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* 1. Hero Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Revenue */}
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <DollarSign className="w-24 h-24" />
            </div>
            <div className="relative z-10">
                <p className="text-indigo-100 font-medium mb-1">Toplam Proje Değeri</p>
                <h3 className="text-3xl font-bold">₺{stats.totalValue.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}</h3>
                <div className="mt-4 flex items-center gap-2 text-indigo-200 text-sm">
                    <TrendingUp className="w-4 h-4" />
                    <span>Ort. ₺{stats.avgValue.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} / proje</span>
                </div>
            </div>
        </div>

        {/* Active Projects */}
        <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between group hover:border-blue-200 dark:hover:border-blue-800 transition-all">
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-gray-500 dark:text-slate-400 font-medium text-sm">Devam Eden</p>
                    <h3 className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{stats.activeProjects}</h3>
                </div>
                <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
                    <Clock className="w-5 h-5" />
                </div>
            </div>
            <div className="mt-4 w-full bg-gray-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div 
                    className="bg-blue-500 h-full rounded-full" 
                    style={{ width: `${stats.totalProjects > 0 ? (stats.activeProjects / stats.totalProjects) * 100 : 0}%` }}
                ></div>
            </div>
        </div>

        {/* Completed */}
        <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between group hover:border-emerald-200 dark:hover:border-emerald-800 transition-all">
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-gray-500 dark:text-slate-400 font-medium text-sm">Tamamlanan</p>
                    <h3 className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{stats.completedProjects}</h3>
                </div>
                <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                    <CheckCircle2 className="w-5 h-5" />
                </div>
            </div>
            <div className="mt-4 w-full bg-gray-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div 
                    className="bg-emerald-500 h-full rounded-full" 
                    style={{ width: `${stats.totalProjects > 0 ? (stats.completedProjects / stats.totalProjects) * 100 : 0}%` }}
                ></div>
            </div>
        </div>

         {/* High Priority */}
         <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between group hover:border-red-200 dark:hover:border-red-800 transition-all">
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-gray-500 dark:text-slate-400 font-medium text-sm">Yüksek Öncelikli</p>
                    <h3 className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{stats.highPriority}</h3>
                </div>
                <div className="w-10 h-10 rounded-full bg-red-50 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400 group-hover:scale-110 transition-transform">
                    <AlertCircle className="w-5 h-5" />
                </div>
            </div>
             <p className="mt-4 text-xs text-red-600 dark:text-red-400 font-medium bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded w-fit">
                Dikkat Gerektirenler
             </p>
        </div>
      </div>

      {/* 2. Project Distribution & Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Status Distribution */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm transition-colors">
             <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                 <PieChart className="w-5 h-5 text-gray-400 dark:text-slate-500" />
                 Proje Durum Dağılımı
             </h3>
             <div className="space-y-4">
                 {[
                     { label: 'Devam Ediyor', count: stats.activeProjects, color: 'bg-blue-500', total: stats.totalProjects },
                     { label: 'Tamamlandı', count: stats.completedProjects, color: 'bg-emerald-500', total: stats.totalProjects },
                     { label: 'Diğer', count: stats.totalProjects - (stats.activeProjects + stats.completedProjects), color: 'bg-gray-300 dark:bg-slate-700', total: stats.totalProjects }
                 ].map((item, i) => (
                     <div key={i}>
                         <div className="flex justify-between text-sm mb-1">
                             <span className="text-gray-600 dark:text-slate-300 font-medium">{item.label}</span>
                             <span className="text-gray-900 dark:text-white font-bold">{item.count}</span>
                         </div>
                         <div className="w-full bg-gray-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
                             <div 
                                className={cn("h-full rounded-full transition-all duration-1000", item.color)} 
                                style={{ width: `${item.total > 0 ? (item.count / item.total) * 100 : 0}%` }}
                             ></div>
                         </div>
                     </div>
                 ))}
             </div>
             
             <div className="mt-8 pt-6 border-t border-gray-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-500 dark:text-slate-400">Tamamlanma Oranı</span>
                    <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                        %{stats.totalProjects > 0 ? Math.round((stats.completedProjects / stats.totalProjects) * 100) : 0}
                    </span>
                </div>
             </div>
          </div>

          {/* Detailed Projects List */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm transition-colors">
             <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                 <Layers className="w-5 h-5 text-gray-400 dark:text-slate-500" />
                 Proje İlerlemeleri
             </h3>
             
             <div className="space-y-4">
                {filteredProjects.slice(0, 5).map((project, i) => {
                    const progress = getProjectProgress(project);
                    const priority = getPriority(project);
                    return (
                        <div key={project.id} className="p-4 rounded-xl border border-gray-100 dark:border-slate-800 hover:border-gray-200 dark:hover:border-slate-700 hover:shadow-md transition-all bg-gray-50/30 dark:bg-slate-800/20">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-3">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <h4 className="font-bold text-gray-900 dark:text-white">{project.name}</h4>
                                        <span className={cn(
                                            "text-[10px] px-2 py-0.5 rounded font-bold uppercase",
                                            priority === 'Yüksek' ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' :
                                            priority === 'Orta' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400' : 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                                        )}>{priority}</span>
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-slate-400 flex items-center gap-1">
                                        <Briefcase className="w-3 h-3" /> {project.customer}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <span className="block font-bold text-gray-900 dark:text-white">₺{typeof project.price === 'number' ? project.price.toLocaleString() : project.price || '-'}</span>
                                    <span className="text-xs text-gray-500 dark:text-slate-500">{project.start_date || (project.dates || '').split('-')[0] || '?' }</span>
                                </div>
                            </div>
                            
                            <div className="relative pt-1">
                                <div className="flex justify-between items-center mb-1 text-xs font-semibold text-gray-600 dark:text-slate-400">
                                    <span>İlerleme</span>
                                    <span className={progress === 100 ? "text-emerald-600 dark:text-emerald-400" : "text-blue-600 dark:text-blue-400"}>%{progress}</span>
                                </div>
                                <div className="overflow-hidden h-2 text-xs flex rounded-full bg-gray-200 dark:bg-slate-700">
                                    <div 
                                        style={{ width: `${progress}%` }} 
                                        className={cn(
                                            "shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center transition-all duration-1000",
                                            progress === 100 ? "bg-emerald-500" : "bg-blue-500"
                                        )}
                                    ></div>
                                </div>
                            </div>
                        </div>
                    )
                })}
                {filteredProjects.length === 0 && <div className="text-center text-gray-400 py-4">Proje bulunamadı</div>}
             </div>
          </div>
      </div>
      
      {/* 3. Bottom Grid: Budget vs Priority */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
         <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 text-white shadow-lg md:col-span-3">
             <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                 <div>
                     <h3 className="text-xl font-bold mb-2">Proje Portföy Özeti</h3>
                     <p className="text-gray-400 text-sm max-w-xl">
                        Toplam {filteredProjects.length} proje içerisinden %{stats.totalProjects > 0 ? Math.round((stats.activeProjects / stats.totalProjects) * 100) : 0}'i aktif olarak devam etmektedir. 
                        Yüksek öncelikli projelerin toplamı portföyün %{stats.totalProjects > 0 ? Math.round((stats.highPriority / stats.totalProjects) * 100) : 0}'ini oluşturmaktadır.
                     </p>
                 </div>
                 <div className="flex gap-4">
                     <div className="text-center bg-white/10 rounded-xl p-4 backdrop-blur-sm">
                         <span className="block text-2xl font-bold text-emerald-400">
                             ₺{(stats.totalValue / (stats.totalProjects || 1)).toLocaleString('tr-TR', { maximumFractionDigits: 0 })}
                         </span>
                         <span className="text-xs text-gray-400">Ort. Bütçe</span>
                     </div>
                 </div>
             </div>
         </div>
      </div>

    </div>
  );
}
