import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Printer, Copy, CheckCircle2, ArrowRightCircle, Wand2, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { generateProposalItems } from '@/lib/ai';

export default function ProposalBuilder({ proposalId, onClose, onUpdate }) {
  const [proposal, setProposal] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState([]);
  
  // AI State
  const [isAiLoading, setIsAiLoading] = useState(false);

  // New Item Input
  const [newItem, setNewItem] = useState({ description: '', quantity: 1, unit_price: 0 });

  useEffect(() => {
    fetchData();
  }, [proposalId]);

  const fetchData = async () => {
    setLoading(true);
    // Fetch Proposal & Items
    const { data: p, error } = await supabase.from('proposals').select('*').eq('id', proposalId).single();
    
    if(error) {
        console.error("Teklif yüklenemedi:", error);
        alert("Teklif yüklenemedi: " + error.message);
        onClose();
        return;
    }
    
    const { data: i } = await supabase.from('proposal_items').select('*').eq('proposal_id', proposalId).order('id'); // order by insertion ideally
    const { data: c } = await supabase.from('clients').select('id, name');
    
    setProposal(p);
    setItems(i || []);
    setClients(c || []);
    setLoading(false);
  };

  const handleAiGenerate = async () => {
      let apiKey = localStorage.getItem('gemini_api_key');
      if (!apiKey) {
          apiKey = prompt("Lütfen Google Gemini API Anahtarınızı giriniz:\n(Tarayıcınıza kaydedilecektir)");
          if (apiKey) localStorage.setItem('gemini_api_key', apiKey);
          else return;
      }

      const userPrompt = prompt("Nasıl bir proje için teklif hazırlamak istiyorsunuz?\nÖrn: E-ticaret sitesi, Mobil Uygulama, Logo Tasarımı");
      if (!userPrompt) return;

      setIsAiLoading(true);
      try {
          const aiItems = await generateProposalItems(userPrompt, apiKey);
          
          // Insert items to DB one by one (or bulk if Supabase allows, usually yes)
          const newDbItems = [];
          for (const item of aiItems) {
              const { data } = await supabase.from('proposal_items').insert({
                  proposal_id: proposalId,
                  description: item.description,
                  quantity: item.quantity,
                  unit_price: item.unit_price
              }).select().single();
              if (data) newDbItems.push(data);
          }

          const allItems = [...items, ...newDbItems];
          setItems(allItems);
          updateTotal(allItems);
          alert("AI başarıyla " + newDbItems.length + " kalem oluşturdu!");

      } catch (e) {
          alert("AI Hatası: " + e.message);
          if (e.message.includes("API Key")) localStorage.removeItem('gemini_api_key');
      } finally {
          setIsAiLoading(false);
      }
  };

  const handleAddItem = async () => {
    if (!newItem.description) return;
    const { data, error } = await supabase.from('proposal_items').insert({
        proposal_id: proposalId,
        description: newItem.description,
        quantity: newItem.quantity,
        unit_price: newItem.unit_price
    }).select().single();

    if (data) {
        setItems([...items, data]);
        setNewItem({ description: '', quantity: 1, unit_price: 0 });
        updateTotal(items.concat(data));
    }
  };

  const removeItem = async (id) => {
      await supabase.from('proposal_items').delete().eq('id', id);
      const newItems = items.filter(x => x.id !== id);
      setItems(newItems);
      updateTotal(newItems);
  };

  const updateTotal = async (currentItems) => {
      const total = currentItems.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
      await supabase.from('proposals').update({ total_amount: total }).eq('id', proposalId);
      setProposal({ ...proposal, total_amount: total });
      if (onUpdate) onUpdate();
  };

  const copyLink = () => {
      const url = `${window.location.origin}/proposal/${proposal.access_token}`;
      navigator.clipboard.writeText(url);
      alert('Müşteri linki kopyalandı! WhatsApp\'tan atabilirsiniz.\n' + url);
  };
  
  const convertToProject = async () => {
      if(!confirm('Bu teklifi Projeye dönüştürmek istediğinize emin misiniz?')) return;
      
      try {
          // 1. Create Project
          const { data: project, error: pErr } = await supabase.from('projects').insert({
              name: proposal.title,
              client_id: proposal.client_id,
              price: (proposal.total_amount * (1 + (proposal.tax_rate/100))), // Total with tax
              status: 'Hazırlık',
              description: `Teklif No: #${proposal.proposal_number} referansıyla oluşturuldu.`,
              start_date: new Date().toISOString()
          }).select().single();
          
          if(pErr) throw pErr;

          // 2. Update Proposal Status
          await supabase.from('proposals').update({ status: 'Onaylandı' }).eq('id', proposalId);
          
          alert('Başarılı! Proje oluşturuldu.');
          onClose();
          if (onUpdate) onUpdate();

      } catch(e) {
          alert('Hata: ' + e.message);
      }
  };

  if(!proposal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 w-full max-w-4xl h-[90vh] rounded-2xl flex flex-col items-center shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
          
          {/* Header */}
          <div className="w-full p-6 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900">
              <div>
                  <h2 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                       Teklif Düzenleyici
                       <span className="text-xs bg-violet-100 text-violet-700 px-2 py-1 rounded-full uppercase tracking-wider">#{proposal.proposal_number}</span>
                  </h2>
                  <p className="text-slate-500 dark:text-slate-400 text-sm">Hizmetleri ekleyin ve müşteriye gönderin.</p>
              </div>
              <div className="flex gap-2">
                   <Button variant="outline" onClick={handleAiGenerate} disabled={isAiLoading} className="border-indigo-200 text-indigo-600 hover:bg-indigo-50">
                       {isAiLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Wand2 className="w-4 h-4 mr-2" />}
                       AI Sihirbazı
                   </Button>
                   <Button variant="ghost" onClick={copyLink} className="text-blue-600 hover:bg-blue-50">
                       <Copy className="w-4 h-4 mr-2" /> Linki Kopyala
                   </Button>
                   <Button variant="ghost" size="icon" onClick={onClose}><X className="w-5 h-5" /></Button>
              </div>
          </div>

          <div className="flex-1 w-full overflow-hidden flex flex-col md:flex-row">
              {/* Left: Editor */}
              <div className="flex-1 p-6 overflow-y-auto space-y-8 bg-slate-50 dark:bg-slate-950/50">
                  
                  {/* Basic Info Card */}
                  <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                      <h3 className="font-bold text-gray-900 dark:text-white text-sm uppercase tracking-wide">Temel Bilgiler</h3>
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="text-xs font-semibold text-gray-500 mb-1 block">Başlık</label>
                              <input 
                                className="w-full p-2 rounded border border-gray-300 dark:border-slate-700 bg-transparent text-sm" 
                                value={proposal.title} 
                                onChange={async (e) => {
                                   setProposal({...proposal, title: e.target.value});
                                   // Auto-save debouncing omitted for brevity, simple onBlur usually
                                }}
                                onBlur={async () => await supabase.from('proposals').update({title: proposal.title}).eq('id', proposal.id)}
                              />
                          </div>
                          <div>
                              <label className="text-xs font-semibold text-gray-500 mb-1 block">Müşteri</label>
                              <select 
                                 className="w-full p-2 rounded border border-gray-300 dark:border-slate-700 bg-transparent text-sm"
                                 value={proposal.client_id || ''}
                                 onChange={async (e) => {
                                      setProposal({...proposal, client_id: e.target.value});
                                      await supabase.from('proposals').update({client_id: e.target.value}).eq('id', proposal.id);
                                 }}
                              >
                                  <option value="">Seçiniz</option>
                                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                              </select>
                          </div>
                          <div>
                              <label className="text-xs font-semibold text-gray-500 mb-1 block">Para Birimi</label>
                              <select 
                                 className="w-full p-2 rounded border border-gray-300 dark:border-slate-700 bg-transparent text-sm"
                                 value={proposal.currency}
                                 onChange={async (e) => {
                                      setProposal({...proposal, currency: e.target.value});
                                      await supabase.from('proposals').update({currency: e.target.value}).eq('id', proposal.id);
                                 }}
                              >
                                  <option value="TRY">TRY</option>
                                  <option value="USD">USD</option>
                                  <option value="EUR">EUR</option>
                              </select>
                          </div>
                          <div>
                              <label className="text-xs font-semibold text-gray-500 mb-1 block">KDV Oranı (%)</label>
                              <input 
                                className="w-full p-2 rounded border border-gray-300 dark:border-slate-700 bg-transparent text-sm" 
                                type="number"
                                value={proposal.tax_rate} 
                                onChange={async (e) => {
                                   setProposal({...proposal, tax_rate: e.target.value});
                                }}
                                onBlur={async () => await supabase.from('proposals').update({tax_rate: proposal.tax_rate}).eq('id', proposal.id)}
                              />
                          </div>
                      </div>
                  </div>

                  {/* Items Builder */}
                  <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h3 className="font-bold text-gray-900 dark:text-white text-sm uppercase tracking-wide">Hizmet Kalemleri</h3>
                        {/* Mobile AI Button could go here too */}
                      </div>
                      
                      {/* Item List */}
                      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                          <table className="w-full text-sm text-left">
                              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-500">
                                  <tr>
                                      <th className="p-3">Hizmet</th>
                                      <th className="p-3 w-20 text-center">Adet</th>
                                      <th className="p-3 w-32 text-right">Fiyat</th>
                                      <th className="p-3 w-32 text-right">Toplam</th>
                                      <th className="p-3 w-10"></th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                  {items.map(item => (
                                      <tr key={item.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                          <td className="p-3 font-medium">{item.description}</td>
                                          <td className="p-3 text-center">{item.quantity}</td>
                                          <td className="p-3 text-right">{item.unit_price}</td>
                                          <td className="p-3 text-right font-bold">{(item.quantity * item.unit_price).toLocaleString()}</td>
                                          <td className="p-3 text-center">
                                              <button onClick={() => removeItem(item.id)} className="text-slate-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                                          </td>
                                      </tr>
                                  ))}
                                  {/* Add Row */}
                                  <tr className="bg-slate-50 dark:bg-slate-950">
                                      <td className="p-2"><input placeholder="Yeni hizmet..." className="w-full bg-transparent p-1 outline-none" value={newItem.description} onChange={e => setNewItem({...newItem, description: e.target.value})} /></td>
                                      <td className="p-2"><input type="number" className="w-full bg-transparent p-1 outline-none text-center" value={newItem.quantity} onChange={e => setNewItem({...newItem, quantity: e.target.value})} /></td>
                                      <td className="p-2"><input type="number" className="w-full bg-transparent p-1 outline-none text-right" value={newItem.unit_price} onChange={e => setNewItem({...newItem, unit_price: e.target.value})} /></td>
                                      <td className="p-3"></td>
                                      <td className="p-2"><Button size="sm" onClick={handleAddItem} disabled={!newItem.description}><Plus className="w-4 h-4" /></Button></td>
                                  </tr>
                              </tbody>
                          </table>
                      </div>

                      {/* Summary */}
                      <div className="flex justify-end pr-4">
                          <div className="w-64 space-y-2 text-sm text-right">
                              <div className="flex justify-between text-slate-500"><span>Ara Toplam</span><span>{proposal.total_amount?.toLocaleString()} {proposal.currency}</span></div>
                              <div className="flex justify-between text-slate-500"><span>KDV (%{proposal.tax_rate})</span><span>{(proposal.total_amount * (proposal.tax_rate/100))?.toLocaleString()} {proposal.currency}</span></div>
                              <div className="flex justify-between font-bold text-lg text-slate-900 dark:text-white border-t pt-2"><span>TOPLAM</span><span>{(proposal.total_amount * (1 + (proposal.tax_rate/100)))?.toLocaleString()} {proposal.currency}</span></div>
                          </div>
                      </div>
                  </div>
              </div>

              {/* Right: Actions / Preview Helper */}
              <div className="w-full md:w-80 bg-white dark:bg-slate-900 border-l border-gray-100 dark:border-slate-800 p-6 flex flex-col gap-4">
                  
                  <div className="p-4 rounded-xl bg-violet-50 dark:bg-violet-900/20 border border-violet-100 dark:border-violet-800 text-center">
                      <p className="text-xs font-bold text-violet-500 uppercase mb-1">DURUM</p>
                      <p className="text-xl font-black text-violet-800 dark:text-violet-300">{proposal.status}</p>
                  </div>
                  
                  {proposal.view_count > 0 && (
                      <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 text-center">
                          <p className="text-xs font-bold text-amber-500 uppercase mb-1">GÖRÜNTÜLENME</p>
                          <div className="flex items-center justify-center gap-2">
                              <CheckCircle2 className="w-5 h-5 text-amber-600" />
                              <span className="text-lg font-bold text-amber-800 dark:text-amber-300">{proposal.view_count} Kez</span>
                          </div>
                      </div>
                  )}

                  <hr className="my-2 border-slate-100 dark:border-slate-800" />

                  <Button className="w-full bg-slate-800 hover:bg-slate-700 text-white" onClick={() => window.open(`/proposal/${proposal.access_token}`, '_blank')}>
                      <Printer className="w-4 h-4 mr-2" /> Önizle / Yazdır
                  </Button>

                  <Button className="w-full bg-violet-600 hover:bg-violet-700 text-white" onClick={copyLink}>
                      <Copy className="w-4 h-4 mr-2" /> Linki Kopyala
                  </Button>

                  {proposal.status !== 'Onaylandı' ? (
                       <Button variant="outline" className="w-full mt-auto" onClick={() => supabase.from('proposals').update({status: 'Onaylandı'}).eq('id', proposal.id).then(() => fetchData())}>
                           Manuel Onayla
                       </Button>
                  ) : (
                       <Button className="w-full mt-auto bg-green-600 hover:bg-green-700 text-white" onClick={convertToProject}>
                           <ArrowRightCircle className="w-4 h-4 mr-2" /> Projeye Çevir
                       </Button>
                  )}
              </div>
          </div>
      </div>
    </div>
  );
}
