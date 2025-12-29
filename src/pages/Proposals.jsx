import React, { useState, useEffect } from 'react';
import { Plus, Search, FileText, CheckCircle2, Clock, XCircle, Eye, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import ProposalBuilder from '@/components/modals/ProposalBuilder';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { useSupabaseAuth } from '@/context/SupabaseAuthContext';

export default function Proposals() {
  const { user } = useSupabaseAuth(); // Use context
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedProposalId, setSelectedProposalId] = useState(null);
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);

  useEffect(() => {
    fetchProposals();
  }, []);

  const fetchProposals = async () => {
    setLoading(true);
    let query = supabase.from('proposals').select('*, clients(name)').order('created_at', { ascending: false });
    
    if (search) {
      query = query.ilike('title', `%${search}%`);
    }

    const { data, error } = await query;
    if (error) console.error(error);
    setProposals(data || []);
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!user) {
        alert("Oturum açmanız gerekiyor.");
        return;
    }

    try {
        const { data, error } = await supabase.from('proposals').insert({
            title: 'Yeni Taslak Teklif',
            status: 'Taslak',
            user_id: user.id
        }).select().single();
        
        if (error) throw error;

        if (data) {
            setSelectedProposalId(data.id);
            setIsBuilderOpen(true);
        }
    } catch (e) {
        console.error("Teklif oluşturma hatası:", e);
        alert("Teklif oluşturulamadı: " + e.message + "\nLütfen veritabanı kurulumunu yaptığınızdan emin olun.");
    }
  };

  /* New state for custom confirm */
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    // Instead of confirm, show the in-card UI
    setConfirmDeleteId(id);
  };

  const executeDelete = async (e, id) => {
    e.stopPropagation();
    try {
        // 1. Delete associated items first
        await supabase.from('proposal_items').delete().eq('proposal_id', id);

        // 2. Delete the proposal
        const { error } = await supabase.from('proposals').delete().eq('id', id);
        
        if (error) throw error;
        
        setConfirmDeleteId(null);
        fetchProposals();
    } catch (err) {
        alert('Hata: ' + err.message);
    }
  };

  const statusColors = {
    'Taslak': 'bg-gray-100 text-gray-600',
    'Gönderildi': 'bg-blue-100 text-blue-600',
    'Onaylandı': 'bg-green-100 text-green-600',
    'Reddedildi': 'bg-red-100 text-red-600'
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 bg-clip-text text-transparent">
            Teklif Yönetimi
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Profesyonel teklifler hazırlayın ve satışları takip edin.
          </p>
        </div>
        <Button onClick={handleCreate} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/20">
          <Plus className="w-4 h-4 mr-2" /> Yeni Teklif Oluştur
        </Button>
      </div>

      {/* Filters (Mock) */}
      <div className="flex gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
              placeholder="Teklif ara..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchProposals()}
            />
          </div>
      </div>

      {/* Grid List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {proposals.map((prop) => (
          <div 
             key={prop.id} 
             onClick={() => { setSelectedProposalId(prop.id); setIsBuilderOpen(true); }}
             className="group bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl p-6 hover:shadow-xl hover:border-indigo-500/30 transition-all cursor-pointer relative overflow-hidden"
          >
             {/* Delete Confirmation Overlay */}
             {confirmDeleteId === prop.id && (
                 <div className="absolute inset-0 z-50 bg-white/95 dark:bg-slate-900/95 flex flex-col items-center justify-center p-4 text-center animate-in fade-in duration-200" onClick={e => e.stopPropagation()}>
                    <Trash2 className="w-10 h-10 text-red-500 mb-2 opacity-20" />
                    <p className="text-sm font-bold text-gray-900 dark:text-white mb-4">Teklifi silmek istediğinize emin misiniz?</p>
                    <div className="flex gap-2 w-full">
                        <Button 
                           variant="outline" 
                           className="flex-1 text-xs" 
                           onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(null); }}
                        >
                            Vazgeç
                        </Button>
                        <Button 
                           className="flex-1 bg-red-600 hover:bg-red-700 text-white text-xs"
                           onClick={(e) => executeDelete(e, prop.id)}
                        >
                            Sil
                        </Button>
                    </div>
                 </div>
             )}

             <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />
             
             <div className="flex justify-between items-start mb-4">
                <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wider ${statusColors[prop.status] || 'bg-gray-100'}`}>
                    {prop.status}
                </span>
                <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-gray-400">#{prop.proposal_number}</span>
                    <button 
                        type="button"
                        onClick={(e) => handleDelete(e, prop.id)}
                        className="relative z-20 p-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-sm border border-red-100 dark:border-red-900/30"
                        title="Teklifi Sil"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
             </div>

             <h3 className="font-bold text-lg mb-1 truncate">{prop.title}</h3>
             <p className="text-sm text-gray-500 mb-4">{prop.clients?.name || 'Müşteri Seçilmedi'}</p>

             <div className="flex justify-between items-end">
                <div>
                   <p className="text-xs text-gray-400">Toplam Tutar</p>
                   <p className="font-bold text-xl text-gray-900 dark:text-white">
                        {prop.total_amount?.toLocaleString()} {prop.currency}
                   </p>
                </div>
                <div className="flex gap-2 text-gray-400">
                    {prop.view_count > 0 && (
                        <div className="flex items-center gap-1 text-amber-500" title="Görüntülendi">
                            <Eye className="w-4 h-4" /> 
                            <span className="text-xs font-bold">{prop.view_count}</span>
                        </div>
                    )}
                </div>
             </div>
             
             <div className="mt-4 pt-4 border-t border-gray-50 dark:border-slate-800 flex justify-between text-xs text-gray-400">
                 <span className="flex items-center gap-1">
                     <Clock className="w-3 h-3" /> {format(new Date(prop.created_at), 'dd MMM', {locale: tr})}
                 </span>
             </div>
          </div>
        ))}

        {proposals.length === 0 && !loading && (
            <div className="col-span-full py-20 text-center text-gray-400">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>Henüz hiç teklif oluşturmadınız.</p>
            </div>
        )}
      </div>

      {isBuilderOpen && (
          <ProposalBuilder 
              proposalId={selectedProposalId} 
              onClose={() => { setIsBuilderOpen(false); setSelectedProposalId(null); fetchProposals(); }} 
              onUpdate={fetchProposals}
          />
      )}
    </div>
  );
}
