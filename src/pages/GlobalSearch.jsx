import React, { useState, useEffect } from 'react';
import { Search, ArrowRight, User, Phone, Wallet, Briefcase, Calendar } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/Button';

import { supabase } from '@/lib/supabase';

// Icon mapping for search results
const ICON_MAP = {
  'Proje': Briefcase,
  'Müşteri': User,
  'İş Emri': Briefcase, 
  'Personel': User,
  'Gelir': Wallet,
  'Gider': Wallet
};

export default function GlobalSearch() {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const handleSearch = async (term) => {
    // Determine the query string safely
    let query = typeof term === 'string' ? term : searchTerm;
    query = (query || '').trim();
    
    // Don't search if empty (unless we want to clear results?)
    if (!query) {
        setResults([]);
        return;
    }
    
    setLoading(true);
    // Note: We don't clear results immediately to avoid UI flickering
    try {
      console.log("Searching for:", query);
      const { data, error } = await supabase.rpc('global_search', { search_term: query });
      
      if (error) {
          console.error("RPC Error:", error);
          throw error;
      }
      console.log("Search results:", data);
      setResults(data || []);
    } catch (e) {
      console.error("Global search error:", e);
    } finally {
      setLoading(false);
    }
  };

  // Debounce Auto-Search
  useEffect(() => {
     const timer = setTimeout(() => {
         if (searchTerm.trim()) {
             handleSearch(searchTerm);
         } else {
             setResults([]);
         }
     }, 400); // 400ms delay for natural typing feel

     return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    const q = searchParams.get('q');
    if (q && q !== searchTerm) { // Only update if different to avoid loop/double trigger
        setSearchTerm(q);
        // handleSearch will be triggered by the debounce effect above automatically
    }
  }, [searchParams]);

  const handleResultClick = (link) => {
    navigate(link);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm p-6 min-h-[calc(100vh-8rem)] transition-colors">
         <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">Geçmiş Arama</h1>

         <div className="space-y-2 mb-8">
            <label className="text-sm font-medium text-gray-700 dark:text-slate-300">Arama Kriterleri</label>
            <div className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-xl border border-gray-200 dark:border-slate-800 transition-colors">
               <label className="text-sm font-medium text-gray-500 dark:text-slate-400 mb-1.5 block">Arama Terimi</label>
               <div className="flex gap-4">
                  <div className="relative flex-1">
                     <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-slate-500" />
                     <input 
                       type="text" 
                       placeholder="İsim, telefon, tutar, açıklama..." 
                       className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-gray-400 dark:placeholder:text-slate-600"
                       value={searchTerm}
                       onChange={(e) => setSearchTerm(e.target.value)}
                       onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                     />
                  </div>
                  <div className="flex items-center gap-2">
                     <input type="checkbox" id="all-time" className="rounded border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-primary focus:ring-primary" checked readOnly/>
                     <label htmlFor="all-time" className="text-sm text-gray-700 dark:text-slate-300">Tüm Zamanlar</label>
                  </div>
                  <Button onClick={handleSearch} disabled={loading} className="px-6 gap-2">
                     <Search className="w-4 h-4" />
                     {loading ? 'Aranıyor...' : 'Ara'}
                  </Button>
               </div>
            </div>
         </div>

         {/* Results */}
         {(results.length > 0 || loading) && (
           <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-500 dark:text-slate-400">Sonuçlar ({results.length})</h3>
              <div className="grid gap-3">
                 {results.map((result) => (
                    <div 
                      key={`${result.type}-${result.id}`} 
                      onClick={() => handleResultClick(result.link)}
                      className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-4 flex items-center justify-between hover:border-primary dark:hover:border-primary hover:shadow-md transition-all cursor-pointer group"
                    >
                      <div className="flex items-center gap-4">
                         <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/30 text-primary dark:text-blue-400 flex items-center justify-center">
                            {(() => {
                               const Icon = ICON_MAP[result.type] || Briefcase;
                               return <Icon className="w-5 h-5" />;
                            })()}
                         </div>
                         <div>
                            <div className="flex items-center gap-2">
                               <h4 className="font-semibold text-gray-900 dark:text-white group-hover:text-primary dark:group-hover:text-blue-400 transition-colors">{result.title}</h4>
                               <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 text-xs font-medium border border-gray-200 dark:border-slate-700">
                                  {result.type}
                               </span>
                            </div>
                            <p className="text-sm text-gray-500 dark:text-slate-400">{result.subtitle}</p>
                         </div>
                      </div>
                      <div className="flex items-center gap-4 text-gray-400 dark:text-slate-500">
                         <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform text-primary dark:text-blue-400" />
                      </div>
                    </div>
                  ))}
                 {results.length === 0 && !loading && (
                   <div className="text-center py-12 text-gray-400 dark:text-slate-500">
                     Sonuç bulunamadı.
                   </div>
                 )}
              </div>
           </div>
         )}
      </div>
    </div>
  );
}
