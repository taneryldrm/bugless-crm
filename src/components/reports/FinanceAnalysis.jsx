import React, { useMemo } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  ArrowUpRight, 
  ArrowDownRight, 
  PieChart as PieChartIcon, 
  Activity,
  Target
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, subDays, subMonths, parseISO, isSameDay, isSameMonth } from 'date-fns';
// Removing locale import for now to prevent build/bundler issues
// import { tr } from 'date-fns/locale';

// --- HELPERS (Defined outside to be safe and static) ---

// Safe amount parser
const safeAmount = (amt) => {
  if (typeof amt === 'number') return amt;
  if (!amt) return 0;
  if (typeof amt === 'string') {
      // Handle "1.000,00" format vs "1000.00"
      // Simplistic approach: remove non-numeric chars except dot/comma, then normalize
      // But here we'll assume the format is either clean or we return 0
      const clean = amt.replace(/[^0-9.,-]/g, '').replace(',', '.');
      return parseFloat(clean) || 0;
  }
  return 0;
};

// Robust Date Parser
const parseDate = (dateStr) => {
  if (!dateStr) return new Date();
  
  // If it's already a Date object
  if (dateStr instanceof Date) return dateStr;

  if (typeof dateStr !== 'string') return new Date();
  
  try {
      // ISO Format (YYYY-MM-DD)
      if (dateStr.includes('-')) {
          return parseISO(dateStr);
      }
      
      // Legacy Format (DD.MM.YYYY)
      const parts = dateStr.split('.');
      if (parts.length === 3) {
          return new Date(parts[2], parts[1] - 1, parts[0]);
      }
  } catch (e) {
      console.warn("Date parse error", e);
  }
  
  return new Date(); // Return "now" as fallback or maybe an invalid date? "now" is safer for UI not to crash
};

export default function FinanceAnalysis({ transactions: rawTransactions = [], dateFilter = 'Son 1 Ay' }) {
  // Ensure transactions is always an array
  const passedTransactions = Array.isArray(rawTransactions) ? rawTransactions : [];

  const transactions = useMemo(() => {
      return passedTransactions;
  }, [passedTransactions]);

  // --- DATE LOGIC ---
  const { startDate, endDate } = useMemo(() => {
    const end = new Date();
    let start = new Date();
    // Default to 1 month if logic fails
    try {
        switch (dateFilter) {
            case 'Son 1 Hafta': start = subDays(end, 7); break;
            case 'Son 1 Ay': start = subMonths(end, 1); break;
            case 'Son 3 Ay': start = subMonths(end, 3); break;
            case 'Son 6 Ay': start = subMonths(end, 6); break;
            case 'Son 1 Yıl': start = subMonths(end, 12); break;
            default: start = subMonths(end, 1);
        }
    } catch(e) {
        start = subMonths(end, 1);
    }
    return { startDate: start, endDate: end };
  }, [dateFilter]);

  // --- DATA FILTERING ---
  const filteredTransactions = useMemo(() => {
      return transactions.filter(t => {
          if (!t) return false;
          try {
              const tDate = parseDate(t.date); 
              if (isNaN(tDate.getTime())) return false;
              return tDate >= startDate && tDate <= endDate;
          } catch (e) {
              return false;
          }
      });
  }, [transactions, startDate, endDate]);

  // --- CORE METRICS ---
  const incomeTransactions = filteredTransactions.filter(t => t.type === 'income');
  const expenseTransactions = filteredTransactions.filter(t => t.type === 'expense');

  const totalIncome = incomeTransactions.reduce((acc, t) => acc + safeAmount(t.amount), 0);
  const totalExpense = expenseTransactions.reduce((acc, t) => acc + safeAmount(t.amount), 0);
  const netProfit = totalIncome - totalExpense;
  const profitMargin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0;

  // --- COMPARISON LOGIC (Previous Period) ---
  const prevMetrics = useMemo(() => {
    try {
        const duration = endDate.getTime() - startDate.getTime();
        const prevEndDate = new Date(startDate.getTime());
        const prevStartDate = new Date(prevEndDate.getTime() - duration);

        const prevTxs = transactions.filter(t => {
            if (!t) return false;
            const tDate = parseDate(t.date);
            if (isNaN(tDate.getTime())) return false;
            return tDate >= prevStartDate && tDate < prevEndDate;
        });

        const prevInc = prevTxs.filter(t => t.type === 'income').reduce((acc, t) => acc + safeAmount(t.amount), 0);
        const prevExp = prevTxs.filter(t => t.type === 'expense').reduce((acc, t) => acc + safeAmount(t.amount), 0);
        
        return { income: prevInc, expense: prevExp };
    } catch (e) {
        return { income: 0, expense: 0 };
    }
  }, [transactions, startDate, endDate]);
  
  const calculateChange = (curr, prev) => {
      if (prev === 0) return curr > 0 ? 100 : 0;
      return ((curr - prev) / prev) * 100;
  };

  const incomeChange = calculateChange(totalIncome, prevMetrics.income);
  const expenseChange = calculateChange(totalExpense, prevMetrics.expense);

  // --- CATEGORY ANALYSIS ---
  const getCategoryStats = (txs) => {
      const grouped = txs.reduce((acc, t) => {
          const cat = t.category || 'Diğer';
          acc[cat] = (acc[cat] || 0) + safeAmount(t.amount);
          return acc;
      }, {});
      
      const total = Object.values(grouped).reduce((a, b) => a + b, 0);
      
      return Object.entries(grouped)
          .sort(([,a], [,b]) => b - a)
          .map(([name, value]) => ({
              name,
              value,
              percent: total > 0 ? (value / total) * 100 : 0
          }));
  };

  const incomeCategories = getCategoryStats(incomeTransactions);
  const expenseCategories = getCategoryStats(expenseTransactions);

  // --- TREND DATA ---
  const trendData = useMemo(() => {
      try {
        const duration = endDate.getTime() - startDate.getTime();
        const daysDiff = Math.ceil(duration / (1000 * 60 * 60 * 24));
        const isDaily = daysDiff <= 32;
        
        // Safety cap for infinite loops
        if (daysDiff > 400) return []; 

        let intervals = [];
        let current = new Date(startDate);
        const end = new Date(endDate); // copy

        if (isDaily) {
            while (current <= end) {
                intervals.push(new Date(current));
                current.setDate(current.getDate() + 1);
            }
        } else {
            current.setDate(1); // Normalise to start of month
            while (current <= end) {
                intervals.push(new Date(current));
                current.setMonth(current.getMonth() + 1);
            }
        }

        return intervals.map(date => {
            // Using basic formatting to avoid locale issues for now
            const day = date.getDate();
            const monthStr = date.toLocaleString('default', { month: 'short' }); 
            let label = isDaily ? `${day} ${monthStr}` : monthStr;
            
            const intervalTxs = transactions.filter(t => {
                const tDate = parseDate(t.date);
                if (isNaN(tDate.getTime())) return false;
                if (isDaily) return isSameDay(tDate, date);
                return isSameMonth(tDate, date) && tDate.getFullYear() === date.getFullYear();
            });

            const inc = intervalTxs.filter(t => t.type === 'income').reduce((acc, t) => acc + safeAmount(t.amount), 0);
            const exp = intervalTxs.filter(t => t.type === 'expense').reduce((acc, t) => acc + safeAmount(t.amount), 0);

            return { label, income: inc, expense: exp };
        });
      } catch (e) {
          console.error("Trend Calc Error", e);
          return [];
      }
  }, [startDate, endDate, transactions]);


  return (
    <div className="space-y-6 animate-in fade-in duration-500">
        {/* 1. KEY METRICS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Income */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm relative overflow-hidden group transition-colors">
                <div className="flex justify-between items-start mb-4 relative z-10">
                    <div>
                        <p className="text-gray-500 dark:text-slate-400 text-sm font-medium">Toplam Gelir</p>
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">₺{totalIncome.toLocaleString()}</h3>
                    </div>
                    <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                        <ArrowUpRight className="w-5 h-5" />
                    </div>
                </div>
                <div className="flex items-center gap-2 text-sm relative z-10">
                    <span className={cn("font-medium", incomeChange >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400")}>
                        {incomeChange > 0 ? '+' : ''}{incomeChange.toFixed(0)}%
                    </span>
                    <span className="text-gray-400 dark:text-slate-500">geçen döneme göre</span>
                </div>
            </div>

            {/* Expense */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm relative overflow-hidden group transition-colors">
                <div className="flex justify-between items-start mb-4 relative z-10">
                    <div>
                        <p className="text-gray-500 dark:text-slate-400 text-sm font-medium">Toplam Gider</p>
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">₺{totalExpense.toLocaleString()}</h3>
                    </div>
                    <div className="p-2 bg-red-50 dark:bg-red-900/30 rounded-lg text-red-600 dark:text-red-400 group-hover:scale-110 transition-transform">
                        <ArrowDownRight className="w-5 h-5" />
                    </div>
                </div>
                 <div className="flex items-center gap-2 text-sm relative z-10">
                    <span className={cn("font-medium", expenseChange > 0 ? "text-red-500 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400")}>
                        {expenseChange > 0 ? '+' : ''}{expenseChange.toFixed(0)}%
                    </span>
                    <span className="text-gray-400 dark:text-slate-500">geçen döneme göre</span>
                </div>
            </div>

            {/* Net Profit */}
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 p-6 rounded-2xl shadow-lg relative overflow-hidden text-white group">
                 <div className="flex justify-between items-start mb-4 relative z-10">
                    <div>
                        <p className="text-gray-400 text-sm font-medium">Net Kar</p>
                        <h3 className="text-2xl font-bold mt-1">₺{netProfit.toLocaleString()}</h3>
                    </div>
                    <div className="p-2 bg-white/10 rounded-lg text-white group-hover:scale-110 transition-transform">
                        <Activity className="w-5 h-5" />
                    </div>
                </div>
                 <div className="flex items-center gap-2 text-sm relative z-10">
                    <Target className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-400 font-medium">
                        %{profitMargin.toFixed(1)} Kar Marjı
                    </span>
                </div>
            </div>

            {/* Forecast / Health */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm relative overflow-hidden group transition-colors">
                 <div className="flex justify-between items-start mb-4 relative z-10">
                    <div>
                        <p className="text-gray-500 dark:text-slate-400 text-sm font-medium">Finansal Sağlık</p>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mt-1">
                            {profitMargin > 20 ? 'Mükemmel' : profitMargin > 0 ? 'İyi' : 'Riskli'}
                        </h3>
                    </div>
                    <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
                        <Activity className="w-5 h-5" />
                    </div>
                </div>
                <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed">
                   {profitMargin > 0 
                     ? "Gelirleriniz yeterli seviyede." 
                     : "Giderleriniz gelirlerinizi aşıyor."}
                </p>
            </div>
        </div>

        {/* 2. CHART SECTION */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Trend Chart */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm flex flex-col transition-colors">
                <div className="mb-6 flex justify-between items-center">
                    <div>
                        <h3 className="font-bold text-gray-900 dark:text-white">Nakit Akışı Trendi</h3>
                        <p className="text-sm text-gray-500 dark:text-slate-400">Dönemsel gelir vs gider</p>
                    </div>
                    <div className="flex items-center gap-3 text-xs font-medium dark:text-slate-300">
                        <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div> Gelir</div>
                        <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-red-500"></div> Gider</div>
                    </div>
                </div>
                
                <div className="flex-1 min-h-[250px] relative flex items-end justify-between px-2 gap-2">
                     {trendData.length > 0 ? trendData.map((d, i) => {
                         const rawMax = Math.max(...trendData.map(t => Math.max(t.income, t.expense)));
                         const max = rawMax > 0 ? rawMax : 100;
                         const incHeight = max > 0 ? Math.min((d.income / max) * 100, 100) : 0;
                         const expHeight = max > 0 ? Math.min((d.expense / max) * 100, 100) : 0;

                         return (
                             <div key={i} className="flex flex-col items-center flex-1 h-full justify-end group relative">
                                  {/* Tooltip */}
                                  <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 dark:bg-black text-white text-xs rounded-lg p-2 z-20 pointer-events-none w-32 text-center shadow-xl">
                                      <div className="font-bold mb-1">{d.label}</div>
                                      <div className="text-emerald-400">G: ₺{d.income.toLocaleString()}</div>
                                      <div className="text-red-400">Ç: ₺{d.expense.toLocaleString()}</div>
                                  </div>

                                  <div className="w-full flex gap-1 items-end justify-center h-full max-w-[40px]">
                                      <div style={{ height: `${isNaN(incHeight) ? 0 : incHeight}%` }} className="w-1/2 bg-emerald-200 dark:bg-emerald-900/50 group-hover:bg-emerald-500 transition-all rounded-t-sm"></div>
                                      <div style={{ height: `${isNaN(expHeight) ? 0 : expHeight}%` }} className="w-1/2 bg-red-200 dark:bg-red-900/50 group-hover:bg-red-500 transition-all rounded-t-sm"></div>
                                  </div>
                                  <span className="text-[10px] text-gray-400 dark:text-slate-500 mt-2 truncate w-full text-center block">
                                      {/* Only show label if sparse enough */}
                                      {(trendData.length <= 12 || i % 5 === 0 || i === trendData.length - 1) ? d.label : ''}
                                  </span>
                             </div>
                         )
                     }) : <div className="w-full h-full flex items-center justify-center text-gray-400">Veri yok</div>}
                </div>
            </div>

            {/* Breakdown Chart (Pie-like) */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm transition-colors">
                 <h3 className="font-bold text-gray-900 dark:text-white mb-6">Karlılık Analizi</h3>
                 <div className="relative w-48 h-48 mx-auto mb-8">
                     <svg viewBox="0 0 36 36" className="w-full h-full rotate-[-90deg]">
                        <path className="text-gray-100 dark:text-slate-800" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3.8" />
                        
                        {/* Safe Rendering for Path */}
                        {(!isNaN(profitMargin) && netProfit !== 0) && (
                            <path 
                               className={netProfit >= 0 ? "text-emerald-500" : "text-red-500"} 
                               strokeDasharray={`${Math.min(profitMargin > 0 ? profitMargin : 0, 100)}, 100`}
                               d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" 
                               fill="none" 
                               stroke="currentColor" 
                               strokeWidth="3.8"
                               strokeLinecap="round"
                            />
                        )}
                     </svg>
                     <div className="absolute inset-0 flex flex-col items-center justify-center">
                         <span className="text-3xl font-bold text-gray-900 dark:text-white">{(isNaN(profitMargin) ? 0 : profitMargin).toFixed(0)}%</span>
                         <span className="text-xs text-gray-500 dark:text-slate-400">Net Marj</span>
                     </div>
                 </div>

                 <div className="space-y-3">
                     <div className="flex justify-between text-sm">
                         <span className="text-gray-500 dark:text-slate-400">Brüt Gelir</span>
                         <span className="font-medium dark:text-slate-200">₺{totalIncome.toLocaleString()}</span>
                     </div>
                     <div className="flex justify-between text-sm">
                         <span className="text-gray-500 dark:text-slate-400">Toplam Gider</span>
                         <span className="font-medium text-red-600 dark:text-red-400">-₺{totalExpense.toLocaleString()}</span>
                     </div>
                     <div className="pt-3 border-t border-gray-100 dark:border-slate-800 flex justify-between text-sm">
                         <span className="font-bold text-gray-900 dark:text-white">Kalan Nakit</span>
                         <span className={cn("font-bold", netProfit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400")}>
                             {netProfit >= 0 ? '+' : '-'}₺{Math.abs(netProfit).toLocaleString()}
                         </span>
                     </div>
                 </div>
            </div>
        </div>

        {/* 3. CATEGORY LEAGUE TABLES */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <CategoryCard title="En Çok Gelir Getirenler" items={incomeCategories} type="income" />
            <CategoryCard title="En Çok Harcama Yapılanlar" items={expenseCategories} type="expense" />
        </div>
    </div>
  );
}

function CategoryCard({ title, items, type }) {
    const isIncome = type === 'income';
    return (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm transition-colors">
            <h3 className="font-bold text-gray-900 dark:text-white mb-6">{title}</h3>
            <div className="space-y-4">
                {items.slice(0, 5).map((item, idx) => (
                    <div key={idx} className="group">
                        <div className="flex justify-between text-sm mb-1.5">
                            <div className="flex items-center gap-2">
                                <span className={cn(
                                    "w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold",
                                    isIncome ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400" : "bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                                )}>
                                    {idx + 1}
                                </span>
                                <span className="font-medium text-gray-700 dark:text-slate-300">{item.name}</span>
                            </div>
                            <div className="text-right">
                                <span className="block font-bold text-gray-900 dark:text-white">₺{item.value.toLocaleString()}</span>
                            </div>
                        </div>
                        <div className="w-full bg-gray-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                            <div 
                                className={cn("h-full rounded-full", isIncome ? "bg-emerald-500" : "bg-red-500")}
                                style={{ width: `${item.percent}%` }}
                            ></div>
                        </div>
                    </div>
                ))}
                {items.length === 0 && <p className="text-sm text-gray-400 py-4 text-center">Veri yok</p>}
            </div>
        </div>
    )
}


