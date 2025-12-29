import React, { useState, useEffect } from 'react';
import { Search, Eye, Filter, Mail, Briefcase, Calendar, MapPin, Users, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import StaffDetailModal from '@/components/modals/StaffDetailModal';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';
import { useSupabaseAuth } from '@/context/SupabaseAuthContext';
import { format, parseISO } from 'date-fns';

export default function Staff() {
  const [filter, setFilter] = useState('Tümü');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useSupabaseAuth();

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Map to expected format
      const mapped = data.map(p => ({
        id: p.id,
        name: p.full_name || 'İsimsiz',
        email: p.email || '-',
        role: p.role || 'Mühendis',
        team: p.team || null,
        joinedDate: p.created_at ? format(parseISO(p.created_at), 'dd.MM.yyyy') : '-',
        address: p.address || '',
        phone: p.phone || '',
        avatarColor: getAvatarColor(p.role)
      }));
      
      setStaffList(mapped);
    } catch (e) {
      console.error('Staff fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchStaff();
  }, [user]);

  const getAvatarColor = (role) => {
    if (role === 'Yönetici') return 'bg-gradient-to-br from-purple-500 to-indigo-600';
    return 'bg-gradient-to-br from-blue-500 to-cyan-600';
  };

  const filteredStaff = staffList.filter(staff => {
    const name = staff.name || '';
    const email = staff.email || '';
    const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          email.toLowerCase().includes(searchTerm.toLowerCase());
    if (filter === 'Tümü') return matchesSearch;
    return matchesSearch && staff.role === filter;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
           <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Personeller</h1>
           <p className="text-gray-500 dark:text-slate-400 mt-1">Kullanıcı Yönetimi'nden eklenen tüm personeller</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm flex items-center justify-between transition-colors">
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-slate-400">Toplam Personel</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{filteredStaff.length}</p>
          </div>
          <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400">
            <Users className="w-6 h-6" />
          </div>
       </div>

      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm space-y-4 transition-colors">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-slate-500" />
            <input 
              type="text" 
              placeholder="Personel ara (isim, email, rol)..." 
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-600"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-500 dark:text-slate-400">
               <Filter className="w-4 h-4" />
               <span className="hidden sm:inline">Rol Filtresi</span>
            </div>
            {['Tümü', 'Yönetici', 'Mühendis'].map((f) => (
              <Button
                key={f}
                onClick={() => setFilter(f)}
                variant={filter === f ? "default" : "ghost"}
                size="sm"
                className={cn(
                  "h-8 transition-all",
                  filter === f 
                    ? "bg-[#6366f1] text-white shadow-sm" 
                    : "text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800"
                )}
              >
                {f}
              </Button>
            ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
        </div>
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
         {filteredStaff.map((staff) => (
           <div key={staff.id} className="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 p-6 shadow-sm hover:shadow-md transition-all">
             <div className="flex items-start gap-4 mb-4">
                <div className={cn("w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg", staff.avatarColor)}>
                  {staff.name.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase()}
                </div>
                <div>
                   <div className="flex flex-col">
                       <h3 className="font-bold text-gray-900 dark:text-white">{staff.name}</h3>
                       <div className="flex items-center gap-2 mt-1">
                           <span className="text-sm text-gray-500 dark:text-slate-400">{staff.role}</span>
                           {staff.team && (
                               <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-900/50">
                                   {staff.team}
                               </span>
                           )}
                       </div>
                   </div>
                </div>
             </div>
             
             <div className="space-y-3 mb-6">
                <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-slate-400">
                   <Mail className="w-4 h-4 text-gray-400 dark:text-slate-500" />
                   <span className="truncate">{staff.email}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-slate-400">
                   <Briefcase className="w-4 h-4 text-gray-400 dark:text-slate-500" />
                   <span>{staff.role}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-slate-400">
                   <Calendar className="w-4 h-4 text-gray-400 dark:text-slate-500" />
                   <span>{staff.joinedDate}</span>
                </div>
                {staff.address && (
                   <div className="flex items-start gap-3 text-sm text-gray-600 dark:text-slate-400">
                     <MapPin className="w-4 h-4 text-gray-400 dark:text-slate-500 mt-0.5" />
                     <span className="line-clamp-2">{staff.address}</span>
                   </div>
                )}
             </div>

              <Button 
                variant="outline"
                onClick={() => setSelectedStaff(staff)}
                className="w-full gap-2 border-gray-200 dark:border-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800"
              >
                <Eye className="w-4 h-4" />
                Görüntüle
              </Button>
           </div>
         ))}
         {filteredStaff.length === 0 && !loading && (
           <div className="col-span-full text-center py-12">
             <p className="text-gray-500 dark:text-slate-400">Personel bulunamadı.</p>
           </div>
         )}
      </div>
      )}

      <StaffDetailModal 
        isOpen={!!selectedStaff} 
        onClose={() => setSelectedStaff(null)} 
        staff={selectedStaff} 
      />
    </div>
  );
}
