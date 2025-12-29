import React, { useState, useEffect } from 'react';
import { 
  Users, 
  TrendingUp, 
  Briefcase, 
  Wallet, 
  Building2, 
  PieChart, 
  Search
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { parseISO } from 'date-fns';

export default function ClientAnalysis({ dateRange, projects = [], clients = [] }) {
  const [richClients, setRichClients] = useState([]);
  const [stats, setStats] = useState({
     totalRevenue: 0,
     activeProjects: 0,
     totalClients: 0,
     activeClients: 0,
     topProject: null
  });
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    try {
     // Safety checks
     const safeProjects = Array.isArray(projects) ? projects.filter(p => p && typeof p === 'object') : [];
     const safeClients = Array.isArray(clients) ? clients.filter(c => c && typeof c === 'object') : [];

     // Filter Projects by Date Range
     const filteredProjects = safeProjects.filter(p => {
        if (!dateRange) return true;
        const { startDate, endDate } = dateRange;
        if (!startDate || !endDate) return true;

        let pDate = new Date();
        try {
            if (p.start_date) pDate = parseISO(p.start_date);
            else if (p.created_at) pDate = parseISO(p.created_at);
        } catch (e) {
            return false;
        }
        
        // Check for Invalid Date
        if (isNaN(pDate.getTime())) return false;

        return pDate >= startDate && pDate <= endDate;
     });

     // Build Rich Client Objects
     const computedClients = safeClients.map(client => {
         const clientProjects = filteredProjects.filter(p => 
             (p.client_id && p.client_id === client.id) || 
             (p.customer && client.name && p.customer.trim() === client.name.trim())
         );
         
         const revenue = clientProjects.reduce((acc, curr) => {
             const price = typeof curr.price === 'number' ? curr.price : parseFloat(curr.price) || 0;
             return acc + price;
         }, 0);

         return {
             ...client,
             projectCount: clientProjects.length,
             totalRevenue: revenue,
             projects: clientProjects
         };
     });
     
     setRichClients(computedClients);

     // Calculate Global Stats
     const totalRev = computedClients.reduce((acc, c) => acc + (c.totalRevenue || 0), 0);
     const activeProjs = filteredProjects.filter(p => p.status === 'Devam Ediyor').length;
     const activeCls = computedClients.filter(c => c.status === 'Aktif').length;
     
     // Calculate Top Project
     const topProj = filteredProjects.length > 0 ? [...filteredProjects].sort((a,b) => {
         const pA = typeof a.price === 'number' ? a.price : parseFloat(a.price) || 0;
         const pB = typeof b.price === 'number' ? b.price : parseFloat(b.price) || 0;
         return pB - pA;
     })[0] : null;

     setStats({
         totalRevenue: totalRev,
         activeProjects: activeProjs,
         totalClients: computedClients.length,
         activeClients: activeCls,
         topProject: topProj
     });
    } catch (err) {
        console.error("ClientAnalysis Error:", err);
    }
  }, [dateRange, projects, clients]);

  const filteredClients = richClients.filter(c => 
      (c.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a, b) => b.totalRevenue - a.totalRevenue); 

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
       
       {/* 1. Summary Cards */}
       <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm flex items-center justify-between transition-colors">
             <div>
                <p className="text-sm font-medium text-gray-500 dark:text-slate-400 mb-1">Toplam Müşteri</p>
                <h3 className="text-3xl font-bold text-gray-900 dark:text-white">{stats.totalClients}</h3>
                <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1 mt-1">
                   <Users className="w-3 h-3" />
                   {stats.activeClients} Aktif
                </p>
             </div>
             <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400">
                <Building2 className="w-6 h-6" />
             </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm flex items-center justify-between transition-colors">
             <div>
                <p className="text-sm font-medium text-gray-500 dark:text-slate-400 mb-1">Toplam Ciro (Proje)</p>
                <h3 className="text-3xl font-bold text-gray-900 dark:text-white">
                    ₺{stats.totalRevenue.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}
                </h3>
                <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">Tüm zamanlar</p>
             </div>
             <div className="w-12 h-12 bg-green-50 dark:bg-green-900/30 rounded-full flex items-center justify-center text-green-600 dark:text-green-400">
                <Wallet className="w-6 h-6" />
             </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm flex items-center justify-between transition-colors">
             <div>
                <p className="text-sm font-medium text-gray-500 dark:text-slate-400 mb-1">Aktif Projeler</p>
                <h3 className="text-3xl font-bold text-gray-900 dark:text-white">{stats.activeProjects}</h3>
                <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">Devam eden işler</p>
             </div>
             <div className="w-12 h-12 bg-orange-50 dark:bg-orange-900/30 rounded-full flex items-center justify-center text-orange-600 dark:text-orange-400">
                <Briefcase className="w-6 h-6" />
             </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm flex items-center justify-between transition-colors">
             <div>
                <p className="text-sm font-medium text-gray-500 dark:text-slate-400 mb-1">Ortalama Proje Değeri</p>
                <h3 className="text-3xl font-bold text-gray-900 dark:text-white">
                   ₺{richClients.length > 0 && stats.totalRevenue > 0 ? (stats.totalRevenue / richClients.length).toLocaleString('tr-TR', { maximumFractionDigits: 0 }) : 0}
                </h3>
                <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">Müşteri başına</p>
             </div>
             <div className="w-12 h-12 bg-purple-50 dark:bg-purple-900/30 rounded-full flex items-center justify-center text-purple-600 dark:text-purple-400">
                <TrendingUp className="w-6 h-6" />
             </div>
          </div>
       </div>

       {/* 2. Charts & Analysis */}
       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Revenue Chart */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-8 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm transition-colors">
             <div className="flex items-center justify-between mb-8">
                <div>
                   <h3 className="text-lg font-bold text-gray-900 dark:text-white">En Çok Ciro Yapan Müşteriler</h3>
                   <p className="text-sm text-gray-500 dark:text-slate-400">Müşteri bazlı proje gelir dağılımı (Top 5)</p>
                </div>
                <PieChart className="w-5 h-5 text-gray-400 dark:text-slate-500" />
             </div>
             
             <div className="space-y-6">
                {filteredClients.slice(0, 5).map((client, i) => {
                   const percentage = (client.totalRevenue / stats.totalRevenue) * 100 || 0;
                   return (
                      <div key={client.id} className="group">
                         <div className="flex items-center justify-between mb-2">
                             <div className="flex items-center gap-3">
                                 <div className={cn(
                                     "w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold",
                                     i === 0 ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400" :
                                     i === 1 ? "bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300" :
                                     i === 2 ? "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400" : "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                                 )}>
                                     {i + 1}
                                 </div>
                                 <div>
                                     <h4 className="font-semibold text-gray-900 dark:text-white">{client.name}</h4>
                                     <p className="text-xs text-gray-500 dark:text-slate-500">{client.projectCount} proje</p>
                                 </div>
                             </div>
                             <span className="font-mono font-bold text-gray-700 dark:text-slate-200">
                                ₺{client.totalRevenue.toLocaleString('tr-TR')}
                             </span>
                         </div>
                         <div className="h-2 w-full bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
                             <div 
                                className={cn(
                                    "h-full rounded-full transition-all duration-1000",
                                    i === 0 ? "bg-yellow-500" :
                                    i === 1 ? "bg-gray-500" :
                                    i === 2 ? "bg-orange-500" : "bg-blue-500"
                                )}
                                style={{ width: `${percentage}%` }}
                             ></div>
                         </div>
                      </div>
                   )
                })}
                {filteredClients.length === 0 && <div className="text-center py-10 text-gray-400">Veri bulunamadı</div>}
             </div>
          </div>

          {/* Client Types Distribution */}
          <div className="bg-gradient-to-br from-indigo-900 to-indigo-800 p-8 rounded-2xl text-white shadow-xl relative overflow-hidden">
             <div className="absolute top-0 right-0 p-32 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16"></div>
             <div className="absolute bottom-0 left-0 p-32 bg-indigo-500/20 rounded-full blur-3xl -ml-16 -mb-16"></div>
             
             <h3 className="text-lg font-bold mb-6 relative z-10">Müşteri Durumu</h3>
             
             <div className="space-y-6 relative z-10">
                 <div className="flex items-center justify-between p-4 bg-white/10 rounded-xl backdrop-blur-sm border border-white/10">
                    <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]"></div>
                        <span className="font-medium">Aktif Müşteriler</span>
                    </div>
                    <span className="text-2xl font-bold">{stats.activeClients}</span>
                 </div>

                 <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
                    <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full bg-red-400"></div>
                        <span className="font-medium text-indigo-100">Pasif / Sıkıntılı</span>
                    </div>
                    <span className="text-xl font-semibold text-indigo-100">
                        {richClients.filter(c => c.status !== 'Aktif').length}
                    </span>
                 </div>

                  <div className="pt-6 border-t border-white/10">
                     <p className="text-sm text-indigo-200 mb-2">En Büyük Proje</p>
                     {stats.topProject ? (
                         <div>
                             <h4 className="font-bold text-lg truncate">{stats.topProject.name}</h4>
                             <div className="flex justify-between items-center mt-1">
                                 <span className="text-xs text-indigo-300">{stats.topProject.customer}</span>
                                 <span className="text-sm font-semibold bg-white/20 px-2 py-0.5 rounded text-white">
                                     ₺{(typeof stats.topProject.price === 'number' ? stats.topProject.price : parseFloat(stats.topProject.price) || 0).toLocaleString()}
                                 </span>
                             </div>
                         </div>
                     ) : <span className="text-indigo-300">Henüz proje yok</span>}
                  </div>
             </div>
          </div>
       </div>

       {/* 3. Detailed Client Grid */}
       <div>
          <div className="flex items-center justify-between mb-6">
             <h3 className="text-lg font-bold text-gray-900 dark:text-white">Müşteri Listesi</h3>
             <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-slate-500" />
                <input 
                   type="text" 
                   placeholder="Müşteri ara..."
                   className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 transition-colors"
                   value={searchTerm}
                   onChange={(e) => setSearchTerm(e.target.value)}
                />
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
             {filteredClients.map(client => (
                <div key={client.id} className="bg-white dark:bg-slate-900 group hover:shadow-md transition-all duration-300 p-5 rounded-xl border border-gray-100 dark:border-slate-800 flex flex-col justify-between h-full">
                    <div>
                        <div className="flex justify-between items-start mb-4">
                           <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center text-gray-600 dark:text-slate-300 font-bold text-lg shadow-inner">
                              {(client.name || '?').substring(0,2).toUpperCase()}
                           </div>
                           <span className={cn(
                               "px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider",
                               client.status === 'Aktif' ? "bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400" :
                               client.status === 'Sıkıntılı' ? "bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400" : "bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-slate-400"
                           )}>
                               {client.status}
                           </span>
                        </div>
                        
                        <h4 className="font-bold text-gray-900 dark:text-white line-clamp-1 mb-1" title={client.name}>{client.name}</h4>
                        <p className="text-xs text-gray-500 dark:text-slate-500 mb-4">{client.type}</p>
                        
                        <div className="space-y-2">
                           <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-500 dark:text-slate-400 text-xs">Toplam Ciro</span>
                              <span className="font-bold text-gray-900 dark:text-white">₺{client.totalRevenue.toLocaleString('tr-TR')}</span>
                           </div>
                           <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-500 dark:text-slate-400 text-xs">Proje Sayısı</span>
                              <span className="font-medium text-gray-700 dark:text-slate-300 bg-gray-50 dark:bg-slate-800 px-2 py-0.5 rounded">{client.projectCount}</span>
                           </div>
                        </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-50 dark:border-slate-800">
                        {client.projects.length > 0 ? (
                           <div className="flex -space-x-2 overflow-hidden py-1">
                               {client.projects.slice(0, 4).map((p, idx) => (
                                   <div key={idx} className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 border-2 border-white dark:border-slate-900 flex items-center justify-center text-[8px] text-blue-600 dark:text-blue-200 font-bold" title={p.name}>
                                       {(p.name || '?')[0]}
                                   </div>
                               ))}
                               {client.projects.length > 4 && (
                                   <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-slate-800 border-2 border-white dark:border-slate-900 flex items-center justify-center text-[8px] text-gray-600 dark:text-slate-400 font-bold">
                                       +{client.projects.length - 4}
                                   </div>
                               )}
                           </div>
                        ) : (
                           <div className="text-xs text-gray-400 italic py-1">Henüz proje yok</div>
                        )}
                    </div>
                </div>
             ))}
          </div>
       </div>
    </div>
  );
}
