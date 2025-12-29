import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Trash2,
  Save,
  Printer,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, isSameMonth, parseISO } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { useSupabaseAuth } from '@/context/SupabaseAuthContext';

export default function Finance() {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const [allTransactions, setAllTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useSupabaseAuth();
  
  const [personnelList, setPersonnelList] = useState([]);
  
  // Fetch Data
  const fetchData = async () => {
     try {
         setLoading(true);
         const { data: txs, error } = await supabase
             .from('transactions')
             .select('*')
             .order('date', { ascending: true });
         
         if (error) throw error;
         setAllTransactions(txs || []);
         
         // Fetch profiles for payer dropdown
         const { data: profs } = await supabase.from('profiles').select('id, full_name');
         if (profs) {
             setPersonnelList(profs.map(p => ({ id: p.id, name: p.full_name })));
         }

     } catch (e) {
         console.error("Finance load error:", e);
     } finally {
         setLoading(false);
     }
  };

  useEffect(() => {
     if (user) fetchData();
  }, [user]);

  // Derived State for Current Month
  const { monthlyCollections, monthlyExpenses, openingBalance } = useMemo(() => {
      const start = startOfMonth(currentDate);
      const end = endOfMonth(currentDate);
      
      let openBal = 0;
      const mCollections = [];
      const mExpenses = [];

      allTransactions.forEach(t => {
          const tDate = parseISO(t.date);
          
          if (tDate < start) {
              // Opening Balance Calculation
              if (t.type === 'income') openBal += parseFloat(t.amount);
              else openBal -= parseFloat(t.amount);
          } else if (tDate <= end) {
              // Current Month
              // Note: We might have transactions slightly in future if user selected future month, 
              // but standard logic is usually strictly by month.
              // Logic check: Any tx in this month.
              if (t.type === 'income') {
                  mCollections.push({ ...t, isSaved: true }); // From DB implies saved
              } else {
                  mExpenses.push({ ...t, isSaved: true });
              }
          }
      });

      return { 
          monthlyCollections: mCollections, 
          monthlyExpenses: mExpenses, 
          openingBalance: openBal 
      };
  }, [allTransactions, currentDate]);

  // Local State for New/Edited Rows
  const [localCollections, setLocalCollections] = useState([]);
  const [localExpenses, setLocalExpenses] = useState([]);

  // Sync derived to local state when month changes or data loads
  // But wait, if I edit a row, I don't want it overwritten by memozied value immediately unless I saved.
  // Actually, standard pattern: Display list = DB data + Local Drafts.
  // For simplicity: I will merge specific drafts with the displayed list.
  // Or simpler: Just put everything in local state on load? No, complex.
  // I will maintain "pending rows" separately.
  // The existing UI treats "Add Row" as adding a remote row but unsaved.
  // I will map `monthlyCollections` to UI rows, and separate `draftCollections`.
  
  // BETTER APPROACH:
  // Just use one state `displayedCollections` initialized from `monthlyCollections`.
  // When `allTransactions` updates, it updates `displayedCollections`.
  // When user adds row, it adds to `displayedCollections` with `id: temp_...`
  // When user saves, it sends to DB, then refetches, which updates `allTransactions`.
  
  const [uiCollections, setUiCollections] = useState([]);
  const [uiExpenses, setUiExpenses] = useState([]);

  useEffect(() => {
     setUiCollections(monthlyCollections);
     setUiExpenses(monthlyExpenses);
  }, [monthlyCollections, monthlyExpenses]);


  const changeMonth = (delta) => {
      setCurrentDate(prev => delta > 0 ? addMonths(prev, 1) : subMonths(prev, 1));
  };
  
  const handleAddCollectionRow = () => {
      setUiCollections([...uiCollections, {
          id: `temp_${Date.now()}`,
          date: format(currentDate, 'yyyy-MM-dd'),
          amount: 0,
          category: '', // Used as 'customer' in UI? Original UI had 'customer'.
          // Schema has 'payer' which fits customer name, or check original UI mapping.
          // Original UI: customer -> saved to collection.customer.
          // DB: payer fits best for 'customer'.
          payer: '', 
          type: 'income',
          isSaved: false
      }]);
  };

  const handleAddExpenseRow = () => {
      setUiExpenses([...uiExpenses, {
          id: `temp_${Date.now()}`,
          detail: '', // description
          date: format(currentDate, 'yyyy-MM-dd'), // receiptDate
          amount: 0,
          payer: '', // Who paid? Schema: payer.
          method: 'Nakit',
          type: 'expense',
          isSaved: false
      }]);
  };

  const handleUpdateUiRow = (isIncome, id, field, value) => {
      const setter = isIncome ? setUiCollections : setUiExpenses;
      const list = isIncome ? uiCollections : uiExpenses;
      
      setter(list.map(item => item.id === id ? { ...item, [field]: value, isSaved: false } : item));
  };

  const handleSaveRow = async (item) => {
      try {
          const payload = {
              date: item.date || new Date().toISOString().split('T')[0],
              amount: parseFloat(item.amount) || 0,
              type: item.type,
              category: item.category || 'Genel', // Default category
              description: item.detail || item.description || '', // Mapping UI detail -> description
              payer: item.payer || item.customer || '-', 
              method: item.method || 'Nakit',
              // project_id?
          };

          if (item.id.toString().startsWith('temp_')) {
               // Insert
               const { error } = await supabase.from('transactions').insert(payload);
               if (error) throw error;

               // --- HESAPLANAN KOMİSYON HARCAMASI (OTOMATİK) ---
               // Eğer işlem bir "Gider" ise ve yöntem "Havale" ise %6.29 komisyon ekle.
               if (item.type === 'expense' && item.method === 'Havale') {
                   const commissionRate = 0.0629;
                   const commAmount = (payload.amount * commissionRate).toFixed(2);
                   
                   const commissionPayload = {
                       ...payload,
                       amount: commAmount,
                       description: `${payload.description} (Banka Komisyonu - %6.29)`,
                       payer: 'Banka', // Komisyonu alan
                       category: 'Banka Giderleri'
                   };

                   const { error: commError } = await supabase.from('transactions').insert(commissionPayload);
                   if (commError) console.error("Komisyon eklenirken hata:", commError);
               }
               // ------------------------------------------------
          } else {
               // Update
               const { error } = await supabase.from('transactions').update(payload).eq('id', item.id);
               if (error) throw error;
          }

          await fetchData(); // Refresh all
      } catch (e) {
          alert('Kaydetme hatası: ' + e.message);
      }
  };

  const handleDeleteRow = async (id) => {
      if (id.toString().startsWith('temp_')) {
          // Just remove from UI
          setUiCollections(uiCollections.filter(c => c.id !== id));
          setUiExpenses(uiExpenses.filter(c => c.id !== id));
      } else {
          if (!confirm('Silmek istediğinize emin misiniz?')) return;
          const { error } = await supabase.from('transactions').delete().eq('id', id);
          if (!error) fetchData();
      }
  };

  // Calculations
  const totalCollections = uiCollections.reduce((acc, c) => acc + (parseFloat(c.amount) || 0), 0);
  const totalExpenses = uiExpenses.reduce((acc, e) => acc + (parseFloat(e.amount) || 0), 0);
  const totalExpensesCash = uiExpenses.filter(e => e.method === 'Nakit').reduce((acc, e) => acc + (parseFloat(e.amount) || 0), 0);
  const currentMonthBalance = totalCollections + openingBalance - totalExpenses;
  
  const formattedMonth = new Intl.DateTimeFormat('tr-TR', { month: 'long', year: 'numeric' }).format(currentDate);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
         <div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Aylık Kasa</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">Gelir ve giderlerinizi aylık olarak yönetin ve raporlayın.</p>
         </div>
         
         <div className="flex items-center gap-4">
             <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1.5 rounded-xl shadow-sm">
                 <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
                     <ChevronLeft className="w-5 h-5" />
                 </button>
                 <div className="px-4 font-bold text-slate-700 dark:text-slate-200 min-w-[160px] text-center capitalize text-lg">
                     {formattedMonth}
                 </div>
                 <button onClick={() => changeMonth(1)} className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
                     <ChevronRight className="w-5 h-5" />
                 </button>
             </div>
             
             <Button variant="outline" className="gap-2 hidden md:flex border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-900">
                 <Printer className="w-4 h-4" /> Yazdır
             </Button>
         </div>
      </div>

      {/* MAIN CONTENT GRID */}
      {loading ? (
           <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-violet-600" /></div>
      ) : (
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          
          {/* LEFT COLUMN: COLLECTIONS (Green) */}
          <div className="flex flex-col gap-4">
              <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/30 p-4 rounded-t-xl flex justify-between items-center transition-colors">
                  <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-400 font-bold text-lg">
                      <TrendingUp className="w-5 h-5" />
                      <span>Aylık Genel Gelirler</span>
                  </div>
              </div>
              
              <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-b-xl shadow-sm overflow-hidden flex-1 flex flex-col transition-colors">
                  {/* Table */}
                  <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                          <thead className="bg-emerald-50/50 dark:bg-emerald-900/10 text-emerald-900 dark:text-emerald-300 font-semibold border-b border-emerald-100 dark:border-emerald-900/20">
                              <tr>
                                  <th className="p-3 text-center w-12">SIRA</th>
                                  <th className="p-3">MÜŞTERİ İSMİ</th>
                                  <th className="p-3 w-40">TARİH</th>
                                  <th className="p-3 min-w-[140px] text-right">TUTAR</th>
                                  <th className="p-3 w-12">İŞLEM</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                              {uiCollections.map((row, index) => (
                                  <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                                      <td className="p-3 text-center text-gray-500 dark:text-slate-500 font-mono">{index + 1}</td>
                                      <td className="p-3">
                                          <div className="relative">
                                              <Search className="w-3 h-3 text-gray-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                                              <input 
                                                  type="text" 
                                                  placeholder="Müşteri ara..."
                                                  className="w-full pl-8 pr-2 py-1.5 border border-gray-200 dark:border-slate-700 dark:bg-slate-950 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200 dark:focus:ring-emerald-900"
                                                  value={row.payer || row.customer || ''}
                                                  onChange={(e) => handleUpdateUiRow(true, row.id, 'payer', e.target.value)}
                                              />
                                          </div>
                                      </td>
                                      <td className="p-3">
                                          <input 
                                              type="date" 
                                              className="w-full px-2 py-1.5 border border-gray-200 dark:border-slate-700 dark:bg-slate-950 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:border-emerald-500"
                                              value={row.date}
                                              onChange={(e) => handleUpdateUiRow(true, row.id, 'date', e.target.value)}
                                          />
                                      </td>
                                      <td className="p-3">
                                          <input 
                                              type="number" 
                                              placeholder="0.00"
                                              className="w-full px-2 py-1.5 border border-gray-200 dark:border-slate-700 dark:bg-slate-950 rounded-lg text-sm text-right font-medium text-emerald-700 dark:text-emerald-400 focus:outline-none focus:border-emerald-500"
                                              value={row.amount}
                                              onChange={(e) => handleUpdateUiRow(true, row.id, 'amount', e.target.value)}
                                          />
                                      </td>
                                      <td className="p-3 text-center flex gap-1 justify-center">
                                          {!row.isSaved ? (
                                              <button 
                                                  onClick={() => handleSaveRow(row)}
                                                  className="p-1.5 text-emerald-600 dark:text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded transition-colors"
                                                  title="Kaydet"
                                              >
                                                  <Save className="w-4 h-4" />
                                              </button>
                                          ) : (
                                              <button 
                                                  onClick={() => handleDeleteRow(row.id)}
                                                  className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                                                  title="Sil"
                                              >
                                                  <Trash2 className="w-4 h-4" />
                                              </button>
                                          )}
                                      </td>
                                  </tr>
                              ))}
                              {uiCollections.length === 0 && (
                                  <tr>
                                      <td colSpan="5" className="p-8 text-center text-gray-500 dark:text-slate-500 border-dashed border-2 border-gray-100 dark:border-slate-800 rounded-lg m-4">
                                          Henüz tahsilat eklenmedi.
                                      </td>
                                  </tr>
                              )}
                          </tbody>
                      </table>
                  </div>

                  {/* Add Row Button */}
                  <div className="p-3 bg-gray-50 dark:bg-slate-800/50 border-t border-gray-200 dark:border-slate-800">
                      <Button onClick={handleAddCollectionRow} variant="outline" className="w-full border-dashed border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:border-emerald-500 dark:hover:border-emerald-600 bg-white dark:bg-slate-900">
                          <Plus className="w-4 h-4 mr-2" /> Satır Ekle
                      </Button>
                  </div>
              </div>

               {/* LEFT FOOTER SUMMARIES */}
               <div className="bg-emerald-50/50 dark:bg-emerald-900/10 rounded-xl p-4 border border-emerald-100 dark:border-emerald-900/20 space-y-3 transition-colors">
                  <div className="flex justify-between items-center text-sm font-semibold text-emerald-900 dark:text-emerald-300 border-b border-emerald-100 dark:border-emerald-900/20 pb-2">
                       <span>AYLIK TAHSİLAT TOPLAMI</span>
                       <span className="font-bold text-lg">₺{totalCollections.toLocaleString('tr-TR', {minimumFractionDigits: 2})}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm text-emerald-800 dark:text-emerald-400">
                       <span>GEÇEN AYDAN DEVİR</span>
                       <span className="font-mono">
                           ₺{openingBalance.toLocaleString('tr-TR', {minimumFractionDigits: 2})}
                       </span>
                  </div>
                  <div className="flex justify-between items-center text-base font-bold text-emerald-950 dark:text-emerald-200 pt-2 border-t border-emerald-100 dark:border-emerald-900/20">
                       <span>AYLIK KASA TOPLAMI</span>
                       <span className="text-xl">₺{currentMonthBalance.toLocaleString('tr-TR', {minimumFractionDigits: 2})}</span>
                  </div>
               </div>
          </div>


          {/* RIGHT COLUMN: EXPENSES (Red) */}
          <div className="flex flex-col gap-4">
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 p-4 rounded-t-xl flex justify-between items-center transition-colors">
                  <div className="flex items-center gap-2 text-red-800 dark:text-red-400 font-bold text-lg">
                      <TrendingUp className="w-5 h-5 rotate-180" />
                      <span>Aylık Genel Harcamalar</span>
                  </div>
              </div>
              
              <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-b-xl shadow-sm overflow-hidden flex-1 flex flex-col transition-colors">
                  {/* Table */}
                  <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                          <thead className="bg-red-50/50 dark:bg-red-900/10 text-red-900 dark:text-red-300 font-semibold border-b border-red-100 dark:border-red-900/20">
                              <tr>
                                  <th className="p-3 text-center w-12">SIRA</th>
                                  <th className="p-3">HARCAMA DETAYI</th>
                                  <th className="p-3 w-40">TARİH / FİŞ</th>
                                  <th className="p-3 min-w-[140px] text-right">TUTAR</th>
                                  <th className="p-3">ÖDEMEYİ YAPAN</th>
                                  <th className="p-3 w-28">YÖNTEM</th>
                                  <th className="p-3 w-12">İŞLEM</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                              {uiExpenses.map((row, index) => (
                                  <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                                      <td className="p-3 text-center text-gray-500 dark:text-slate-500 font-mono">{index + 1}</td>
                                      <td className="p-3">
                                          <input 
                                              type="text" 
                                              placeholder="Harcama detayı..."
                                              className="w-full px-2 py-1.5 border border-gray-200 dark:border-slate-700 dark:bg-slate-950 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:border-red-500"
                                              value={row.detail || row.description || ''}
                                              onChange={(e) => handleUpdateUiRow(false, row.id, 'detail', e.target.value)}
                                          />
                                      </td>
                                      <td className="p-3">
                                          <input 
                                              type="date"
                                              className="w-full px-2 py-1.5 border border-gray-200 dark:border-slate-700 dark:bg-slate-950 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:border-red-500"
                                              value={row.date}
                                              onChange={(e) => handleUpdateUiRow(false, row.id, 'date', e.target.value)}
                                          />
                                      </td>
                                      <td className="p-3">
                                          <input 
                                              type="number" 
                                              placeholder="0.00"
                                              className="w-full px-2 py-1.5 border border-gray-200 dark:border-slate-700 dark:bg-slate-950 rounded-lg text-sm text-right font-medium text-red-700 dark:text-red-400 focus:outline-none focus:border-red-500"
                                              value={row.amount}
                                              onChange={(e) => handleUpdateUiRow(false, row.id, 'amount', e.target.value)}
                                          />
                                      </td>
                                      <td className="p-3">
                                          <select 
                                              className="w-full px-2 py-1.5 border border-gray-200 dark:border-slate-700 dark:bg-slate-950 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:border-red-500 bg-white dark:bg-slate-950"
                                              value={row.payer || ''}
                                              onChange={(e) => handleUpdateUiRow(false, row.id, 'payer', e.target.value)}
                                          >
                                              <option value="">Seçiniz</option>
                                              {personnelList.map(p => (
                                                  <option key={p.id} value={p.name}>{p.name}</option>
                                              ))}
                                          </select>
                                      </td>
                                      <td className="p-3">
                                          <select 
                                              className="w-full px-2 py-1.5 border border-gray-200 dark:border-slate-700 dark:bg-slate-950 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:border-red-500 bg-white dark:bg-slate-950"
                                              value={row.method}
                                              onChange={(e) => handleUpdateUiRow(false, row.id, 'method', e.target.value)}
                                          >
                                              <option>Nakit</option>
                                              <option>Kredi Kartı</option>
                                              <option>Havale</option>
                                              <option>Cebinden</option>
                                          </select>
                                      </td>
                                      <td className="p-3 text-center flex gap-1 justify-center">
                                          {!row.isSaved ? (
                                              <button 
                                                  onClick={() => handleSaveRow(row)}
                                                  className="p-1.5 text-red-600 dark:text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                                                  title="Kaydet"
                                              >
                                                  <Save className="w-4 h-4" />
                                              </button>
                                          ) : (
                                              <button 
                                                  onClick={() => handleDeleteRow(row.id)}
                                                  className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                                                  title="Sil"
                                              >
                                                  <Trash2 className="w-4 h-4" />
                                              </button>
                                          )}
                                      </td>
                                  </tr>
                              ))}
                              {uiExpenses.length === 0 && (
                                  <tr>
                                      <td colSpan="7" className="p-8 text-center text-gray-500 dark:text-slate-500 border-dashed border-2 border-gray-100 dark:border-slate-800 rounded-lg m-4">
                                          Henüz harcama eklenmedi.
                                      </td>
                                  </tr>
                              )}
                          </tbody>
                      </table>
                  </div>

                  {/* Add Row Button */}
                  <div className="p-3 bg-gray-50 dark:bg-slate-800/50 border-t border-gray-200 dark:border-slate-800">
                      <Button onClick={handleAddExpenseRow} variant="outline" className="w-full border-dashed border-red-300 dark:border-red-700 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-500 dark:hover:border-red-600 bg-white dark:bg-slate-900">
                          <Plus className="w-4 h-4 mr-2" /> Satır Ekle
                      </Button>
                  </div>
              </div>

               {/* RIGHT FOOTER SUMMARIES */}
               <div className="bg-red-50/50 dark:bg-red-900/10 rounded-xl p-4 border border-red-100 dark:border-red-900/20 space-y-3 transition-colors">
                  <div className="flex justify-between items-center text-sm font-semibold text-red-900 dark:text-red-300 border-b border-red-100 dark:border-red-900/20 pb-2">
                       <span>AYLIK ÖDENEN GİDERLER (Nakit)</span>
                       <span className="font-bold text-lg">₺{totalExpensesCash.toLocaleString('tr-TR', {minimumFractionDigits: 2})}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm text-red-800 dark:text-red-400">
                       <span>TOPLAM GİDERLER (Tümü)</span>
                       <span>₺{totalExpenses.toLocaleString('tr-TR', {minimumFractionDigits: 2})}</span>
                  </div>
               </div>
          </div>
      </div>
      )}
    </div>
  );
}
