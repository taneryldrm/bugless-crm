import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { CheckCircle2, XCircle, Download, FileText, Building2, Phone, Mail, Loader2, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

export default function PublicProposalView() {
  const { token } = useParams();
  const [proposal, setProposal] = useState(null);
  const [client, setClient] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [approving, setApproving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchProposal();
  }, [token]);

  const fetchProposal = async () => {
    try {
      setLoading(true);
      // Call the secure RPC function
      const { data, error } = await supabase.rpc('get_proposal_public', { token_input: token });

      if (error) throw error;
      if (!data || !data.proposal) throw new Error('Teklif bulunamadı veya süresi dolmuş.');

      setProposal(data.proposal);
      setItems(data.items || []);
      setClient(data.client); // returns object usually {name: ...}
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!confirm('Bu teklifi onaylıyor musunuz? Onayladığınızda işlem başlatılacaktır.')) return;
    
    try {
      setApproving(true);
      const { data, error } = await supabase.rpc('approve_proposal_public', { token_input: token });
      
      if (error) throw error;
      if (data === true) {
        setSuccess(true);
        // Refresh local state to show 'Approved' badge
        setProposal({ ...proposal, status: 'Onaylandı' });
      } else {
        alert("Onaylanamadı. Lütfen iletişime geçin.");
      }
    } catch (e) {
      alert("Hata: " + e.message);
    } finally {
      setApproving(false);
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-gray-400" /></div>;
  
  if (error) return (
    <div className="h-screen flex flex-col items-center justify-center bg-gray-50 text-center p-4">
        <XCircle className="w-16 h-16 text-red-400 mb-4" />
        <h1 className="text-2xl font-bold text-gray-900">Erişim Hatası</h1>
        <p className="text-gray-500 mt-2">{error}</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100 py-10 px-4 font-sans text-gray-800">
       <div className="max-w-4xl mx-auto bg-white shadow-2xl rounded-sm overflow-hidden min-h-[1123px] relative flex flex-col">
          {/* Top Colour Bar */}
          <div className="h-4 bg-indigo-600 w-full"></div>

          {/* Status Badge */}
          <div className="absolute top-10 right-10">
              {proposal.status === 'Onaylandı' || success ? (
                  <div className="flex flex-col items-center justify-center border-4 border-green-500 text-green-600 rounded-full w-32 h-32 transform rotate-12 opacity-80 backdrop-blur-sm">
                      <CheckCircle2 className="w-10 h-10" />
                      <span className="font-black text-lg uppercase">ONAYLANDI</span>
                      <span className="text-[10px] font-mono">{format(new Date(), 'dd.MM.yyyy')}</span>
                  </div>
              ) : (
                  <div className="bg-gray-100 text-gray-500 px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest">
                      {proposal.status}
                  </div>
              )}
          </div>

          <div className="p-16 flex-1 flex flex-col">
              {/* Header */}
              <div className="flex justify-between items-start mb-16">
                  <div>
                      <h1 className="text-4xl font-black text-gray-900 tracking-tight mb-2">Hizmet Teklifi</h1>
                      <p className="text-gray-400 font-medium">#{proposal.proposal_number || 'TRH-001'}</p>
                  </div>
                  <div className="text-right">
                      <h3 className="font-bold text-xl text-gray-800">Bugless Yazılım A.Ş.</h3>
                      <p className="text-sm text-gray-500 mt-1">Teknoloji Vadisi, İstanbul</p>
                      <p className="text-sm text-gray-500">info@bugless.com</p>
                      <p className="text-sm text-gray-500">+90 212 555 0000</p>
                  </div>
              </div>

              {/* Client & Date Info */}
              <div className="flex justify-between mb-16 border-b border-gray-100 pb-8">
                  <div className="w-1/2">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Sayın Müşteri</p>
                      <h2 className="text-2xl font-bold text-gray-900">{typeof client === 'object' ? client?.name : client}</h2>
                      <p className="text-gray-500 text-sm mt-1">{proposal.client_address || 'Adres bilgisi yok'}</p>
                  </div>
                  <div className="w-1/2 flex justify-end gap-12">
                      <div className="text-right">
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Teklif Tarihi</p>
                          <p className="font-bold text-gray-900">{format(new Date(proposal.created_at), 'dd MMM yyyy', {locale: tr})}</p>
                      </div>
                      <div className="text-right">
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Geçerlilik</p>
                          <p className="font-bold text-red-500">
                             {proposal.valid_until ? format(new Date(proposal.valid_until), 'dd MMM yyyy', {locale: tr}) : 'Belirtilmemiş'}
                          </p>
                      </div>
                  </div>
              </div>

              {/* Items Table */}
              <div className="mb-12">
                  <table className="w-full">
                      <thead className="border-b-2 border-gray-900">
                          <tr>
                              <th className="text-left py-3 text-sm font-bold text-gray-900 uppercase tracking-wide w-1/2">Hizmet / Açıklama</th>
                              <th className="text-center py-3 text-sm font-bold text-gray-900 uppercase tracking-wide">Miktar</th>
                              <th className="text-right py-3 text-sm font-bold text-gray-900 uppercase tracking-wide">Birim Fiyat</th>
                              <th className="text-right py-3 text-sm font-bold text-gray-900 uppercase tracking-wide">Toplam</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                          {items.map((item, idx) => (
                              <tr key={idx}>
                                  <td className="py-4 pr-4">
                                      <p className="font-bold text-gray-800">{item.description}</p>
                                      {/* <p className="text-sm text-gray-500 mt-0.5">Detay açıklama...</p> */}
                                  </td>
                                  <td className="py-4 text-center text-gray-600">{item.quantity}</td>
                                  <td className="py-4 text-right text-gray-600">{parseFloat(item.unit_price).toLocaleString()} {proposal.currency}</td>
                                  <td className="py-4 text-right font-medium text-gray-900">{(item.quantity * item.unit_price).toLocaleString()} {proposal.currency}</td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>

              {/* Total Calculation */}
              <div className="flex justify-end mb-16">
                  <div className="w-72 space-y-3">
                      <div className="flex justify-between text-gray-500">
                          <span>Ara Toplam</span>
                          <span>{proposal.total_amount?.toLocaleString()} {proposal.currency}</span>
                      </div>
                      <div className="flex justify-between text-gray-500">
                          <span>KDV (%{proposal.tax_rate})</span>
                          <span>{(proposal.total_amount * (proposal.tax_rate/100)).toLocaleString()} {proposal.currency}</span>
                      </div>
                      <div className="flex justify-between items-center py-4 border-t-2 border-gray-900">
                          <span className="font-black text-xl text-gray-900">GENEL TOPLAM</span>
                          <span className="font-black text-2xl text-indigo-700">
                              {(proposal.total_amount * (1 + (proposal.tax_rate/100))).toLocaleString()} {proposal.currency}
                          </span>
                      </div>
                  </div>
              </div>

              {/* Terms / Footer */}
              <div className="mt-auto pt-8 border-t border-gray-100">
                   <h4 className="text-sm font-bold text-gray-900 uppercase mb-2">Hizmet Şartları & Notlar</h4>
                   <p className="text-sm text-gray-500 leading-relaxed max-w-2xl">
                       {proposal.notes || 'Bu teklif 15 gün süreyle geçerlidir. Ödeme %50 peşin, %50 iş tesliminde tahsil edilecektir. Fiyatlara KDV dahil değildir (yukarıda ayrıca belirtilmiştir).'}
                   </p>
              </div>
          </div>

          {/* Action Bar (Only visible if not printed) */}
          <div className="bg-gray-900 text-white p-6 print:hidden flex items-center justify-between sticky bottom-0 z-50">
              <div className="text-sm opacity-80">
                  Bu belge <strong>Bugless CRM</strong> altyapısı ile oluşturulmuştur.
              </div>
              <div className="flex gap-4">
                  <button onClick={() => window.print()} className="flex items-center gap-2 px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg font-bold transition-all">
                      <Download className="w-4 h-4" /> PDF İndir
                  </button>
                  {proposal.status !== 'Onaylandı' && !success && (
                      <button 
                        onClick={handleApprove} 
                        disabled={approving}
                        className="flex items-center gap-2 px-8 py-3 bg-green-600 hover:bg-green-500 rounded-lg font-bold shadow-lg shadow-green-900/20 transform hover:-translate-y-1 transition-all"
                      >
                          {approving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                          TEKLİFİ ONAYLA
                      </button>
                  )}
              </div>
          </div>
       </div>

       {/* Print Styles */}
       <style>{`
           @media print {
               @page { size: A4; margin: 0; }
               body { background: white; -webkit-print-color-adjust: exact; }
               .print\\:hidden { display: none !important; }
               .shadow-2xl { box-shadow: none !important; }
               .min-h-screen { padding: 0 !important; }
           }
       `}</style>
    </div>
  );
}
