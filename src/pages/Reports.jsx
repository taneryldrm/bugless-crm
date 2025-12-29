import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  PieChart, 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  ArrowDownRight,
  Calendar,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { subMonths, subDays, format, parseISO } from 'date-fns';
import PersonnelAnalysis from '@/components/reports/PersonnelAnalysis';
import ClientAnalysis from '@/components/reports/ClientAnalysis';
import ProjectAnalysis from '@/components/reports/ProjectAnalysis';
import FinanceAnalysis from '@/components/reports/FinanceAnalysis';
import ErrorBoundary from '@/components/ErrorBoundary';
import { supabase } from '@/lib/supabase';
import { useSupabaseAuth } from '@/context/SupabaseAuthContext';

export default function Reports() {
  const [activeTab, setActiveTab] = useState('projeler');
  const [projects, setProjects] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [clients, setClients] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [workSessions, setWorkSessions] = useState([]);
  const [workOrders, setWorkOrders] = useState([]);
  const [externalTasks, setExternalTasks] = useState([]);
  
  const [dateFilter, setDateFilter] = useState('Son 1 Ay');
  const { user, isManager } = useSupabaseAuth();

  const loadData = async () => {
    try {
        // Auto-check for delayed tasks
        try {
            await supabase.rpc('check_and_update_delayed_tasks');
        } catch (rpcErr) {
            console.warn("RPC check_and_update_delayed_tasks not found or failed, skipping.");
        }

        // Fetch Projects
        const { data: projData } = await supabase.from('projects').select('*, clients(name)');
        if (projData) {
            setProjects(projData.map(p => ({
                ...p,
                customer: p.clients?.name || 'Bilinmiyor',
                price: parseFloat(p.price) || 0
            })));
        }

        // Fetch Transactions
        const { data: txData } = await supabase.from('transactions').select('*');
        if (txData) {
            setTransactions(txData.map(t => ({
                ...t,
                amount: parseFloat(t.amount)
            })));
        }

        // Fetch Clients
        const { data: clientData } = await supabase.from('clients').select('*');
        if (clientData) setClients(clientData);

        // Fetch Profiles (Personnel)
        const { data: profData } = await supabase.from('profiles').select('*');
        if (profData) setProfiles(profData);
        
        // Fetch Work Sessions
        // Join with profiles to get user name
        const { data: sessData } = await supabase.from('work_sessions').select('*, profiles(full_name)');
        if (sessData) {
            setWorkSessions(sessData.map(s => ({
                ...s,
                user: s.profiles?.full_name || 'Bilinmiyor',
                startTime: s.start_time ? format(parseISO(s.start_time), 'HH:mm') : '', // Format for display
                endTime: s.end_time ? format(parseISO(s.end_time), 'HH:mm') : '',
                date: s.start_time // Critical: This is used for filtering in PersonnelAnalysis
            })));
        }

        // Fetch Work Orders
        const { data: woData } = await supabase.from('work_orders').select('*');
        if (woData) {
            setWorkOrders(woData.map(w => ({
                ...w,
                assignedToIds: (w.assigned_to || []), // pass raw ID array
                date: w.due_date // Map due_date to date for isDelayed check
            })));
        }

        // Fetch External Tasks
        const { data: extData } = await supabase.from('external_tasks').select('*');
        if (extData) {
            setExternalTasks(extData.map(e => ({
                ...e,
                assignedToIds: (e.assigned_to || []), // Array of IDs
                date: e.due_date // Map due_date to date for isDelayed check
            })));
        }

    } catch (e) {
        console.error("Reports data load error:", e);
    }
  };

  useEffect(() => {
     if (user) loadData();
  }, [user]);


  // --- FILTER LOGIC ---
  const { startDate, endDate } = React.useMemo(() => {
    const end = new Date();
    let start = new Date();
    switch (dateFilter) {
        case 'Son 1 Hafta': start = subDays(end, 7); break;
        case 'Son 1 Ay': start = subMonths(end, 1); break;
        case 'Son 3 Ay': start = subMonths(end, 3); break;
        case 'Son 6 Ay': start = subMonths(end, 6); break;
        case 'Son 1 Yıl': start = subMonths(end, 12); break;
        default: start = subMonths(end, 1);
    }
    return { startDate: start, endDate: end };
  }, [dateFilter]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight transition-colors">Raporlama & Analitik</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium transition-colors">İş performansı ve detaylı finansal analizler.</p>
        </div>
        <div className="flex items-center gap-2">
           <div className="relative">
               <select 
                 className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                 value={dateFilter}
                 onChange={(e) => setDateFilter(e.target.value)}
               >
                 <option>Son 1 Hafta</option>
                 <option>Son 1 Ay</option>
                 <option>Son 3 Ay</option>
                 <option>Son 6 Ay</option>
                 <option>Son 1 Yıl</option>
               </select>
               <Button 
                variant="outline" 
                className="gap-2 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-colors"
               >
                  {dateFilter} <Calendar className="w-4 h-4 text-slate-400 dark:text-slate-500" />
               </Button>
           </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-800 transition-colors">
        <nav className="flex space-x-6 overflow-x-auto" aria-label="Tabs">
          {['Projeler', 'Finans', 'Personel Analizi', 'Müşteri Analizi'].filter(t => isManager || t !== 'Finans').map((tab) => {
            const key = tab.toLowerCase().split(' ')[0];
            return (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={cn(
                      "py-4 px-1 inline-flex items-center gap-2 border-b-2 font-bold text-sm whitespace-nowrap transition-all focus:outline-none",
                      activeTab === key
                      ? "border-violet-600 dark:border-violet-500 text-violet-600 dark:text-violet-500"
                      : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700"
                  )}
                >
                  {tab}
                </button>
            )
          })}
        </nav>
      </div>
      
      {activeTab === 'projeler' && (
          <ProjectAnalysis dateRange={{ startDate, endDate }} projects={projects} workOrders={workOrders} />
      )}

      {activeTab === 'finans' && (
        <ErrorBoundary>
            <FinanceAnalysis transactions={transactions} dateFilter={dateFilter} />
        </ErrorBoundary>
      )}

      {activeTab === 'personel' && (
          <PersonnelAnalysis 
            projects={projects} 
            profiles={profiles} 
            sessions={workSessions}
            workOrders={workOrders}
            externalTasks={externalTasks}
            dateRange={{ startDate, endDate }} 
            dateFilter={dateFilter} 
          />
      )}

      {activeTab === 'müşteri' && (
          <ErrorBoundary>
              <ClientAnalysis dateRange={{ startDate, endDate }} projects={projects} clients={clients} />
          </ErrorBoundary>
      )}
    </div>
  );
}
