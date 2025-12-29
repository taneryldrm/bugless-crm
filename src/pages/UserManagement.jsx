import React, { useState, useEffect } from 'react';
import { Plus, Search, Users, UserCheck, Eye, Pencil, Trash2, Loader2 } from 'lucide-react';
import CreateUserModal from '@/components/modals/CreateUserModal';
import UserDetailModal from '@/components/modals/UserDetailModal';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';

// Initialize a secondary client for user creation to avoid session conflict
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch Users
  const fetchUsers = async () => {
    try {
        setLoading(true);
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });
            
        if (error) throw error;
        setUsers(data || []);
    } catch (err) {
        console.error("Error fetching users:", err);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSaveUser = async (userData) => {
    const { name, email, password, role } = userData;
    
    // If editing existing user (Only profile update supported for now, not auth email/password from here easily)
    if (selectedUser) {
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ 
                    full_name: name,
                    role: role,
                    address: userData.address,
                    iban: userData.iban
                })
                .eq('id', selectedUser.id);
            
            if (error) throw error;
            alert('Kullanıcı güncellendi.');
            fetchUsers();
            setIsCreateModalOpen(false);
        } catch (err) {
            alert('Güncelleme hatası: ' + err.message);
        }
        return;
    }

    // Creating NEW User
    try {
        // Use a temporary client to sign up the new user without logging out the admin
        const tempSupabase = createClient(supabaseUrl, supabaseKey, {
            auth: {
                persistSession: false, // Critical: Do not persist this session
                autoRefreshToken: false,
                detectSessionInUrl: false
            }
        });

        const { data, error } = await tempSupabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: name,
                    role: role,
                    address: userData.address,
                    iban: userData.iban
                }
            }
        });

        if (error) throw error;

        // User is created. Profile is auto-created by trigger.
        // Wait for trigger to complete (usually <500ms but being safe)
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // If role is NOT default 'Mühendis', update it
        if (role && role !== 'Mühendis' && data?.user?.id) {
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ role: role })
                .eq('id', data.user.id);
            
            if (updateError) console.error("Role update failed:", updateError);
        }
        
        // Refresh user list
        await fetchUsers();

        alert('Kullanıcı oluşturuldu! (E-posta onayı gerekebilir)');
        setIsCreateModalOpen(false);

    } catch (err) {
        console.error("User creation error:", err);
        alert('Kullanıcı oluşturma hatası: ' + err.message);
    }
  };

  const handleEditClick = (user) => {
    // Map profile data to modal expected format
    setSelectedUser({
        id: user.id,
        name: user.full_name,
        email: '...', // We can't see emails in profiles table unless we duplicated it there. 
                      // For now, let's assume we can't edit email or we need to add email column to profiles for display?
                      // Supabase Auth emails are private. 
                      // WORKAROUND: For this CRM, we might want to store email in profiles too or use a cloud function.
                      // Let's just use what we have. If email is missing, show placeholder.
        role: user.role,
        address: user.address,
        iban: user.iban,
        status: 'Aktif'
    });
    setIsCreateModalOpen(true);
  };

  const handleDetailClick = (user) => {
    setSelectedUser(user);
    setIsDetailModalOpen(true);
  };

  const handleDeleteClick = async (userId) => {
    if (!confirm('Bu kullanıcıyı ve tüm verilerini silmek istediğinizden emin misiniz? Bu işlem geri alınamaz!')) return;

    try {
        setLoading(true);
        const { error } = await supabase.rpc('delete_user_account', { target_user_id: userId });

        if (error) throw error;

        alert('Kullanıcı başarıyla silindi.');
        await fetchUsers(); // Refresh list
    } catch (err) {
        console.error("Delete error:", err);
        alert('Silme işlemi başarısız: ' + err.message);
    } finally {
        setLoading(false);
    }
  };

  const handleCreateClick = () => {
    setSelectedUser(null);
    setIsCreateModalOpen(true);
  };

  const filteredUsers = users.filter(user => 
    (user.full_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) || 
    (user.role?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Kullanıcı Yönetimi</h1>
          <p className="text-gray-500 dark:text-slate-400 mt-1">Sistem kullanıcılarını yönetin</p>
        </div>
        <Button 
          onClick={handleCreateClick}
          className="gap-2 bg-blue-600 hover:bg-blue-700 shadow-blue-200 dark:shadow-blue-900/40 text-white"
        >
          <Plus className="w-5 h-5" />
          Yeni Kullanıcı
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Stats Cards (Simplified) */}
         <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm flex items-center justify-between transition-colors">
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-slate-400">Toplam Kullanıcı</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{users.length}</p>
          </div>
          <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400">
            <Users className="w-6 h-6" />
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
        {/* Search */}
        <div className="p-4 border-b border-gray-100 dark:border-slate-800">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-slate-500" />
            <input 
              type="text" 
              placeholder="Kullanıcı ara..." 
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-gray-400 dark:placeholder:text-slate-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
             <div className="p-8 flex justify-center">
                 <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
             </div>
        ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50/50 dark:bg-slate-800/50 text-xs uppercase font-medium text-gray-500 dark:text-slate-400 border-b border-gray-100 dark:border-slate-800">
              <tr>
                <th className="px-6 py-4">Kullanıcı</th>
                <th className="px-6 py-4">Rol</th>
                <th className="px-6 py-4 text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="group hover:bg-gray-50/50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={cn("w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-medium shadow-sm bg-blue-600")}>
                        {user.full_name?.substring(0,2).toUpperCase() || 'K'}
                      </div>
                      <span className="font-medium text-gray-900 dark:text-white">{user.full_name || 'İsimsiz'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                      user.role === 'Yönetici' ? "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400" : "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                    )}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 text-gray-400 dark:text-slate-500">
                      <Button 
                         variant="ghost"
                         size="icon"
                         onClick={() => handleEditClick(user)}
                         className="w-8 h-8 text-gray-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 dark:hover:bg-slate-800"
                      >
                         <Pencil className="w-4 h-4" />
                      </Button>
                      <Button 
                         variant="ghost"
                         size="icon"
                         onClick={() => handleDeleteClick(user.id)}
                         className="w-8 h-8 text-gray-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 dark:hover:bg-slate-800"
                      >
                         <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
      </div>

      {/* Modals */}
      <CreateUserModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
        onCreate={handleSaveUser}
        initialData={selectedUser}
      />
      
      <UserDetailModal
         isOpen={isDetailModalOpen}
         onClose={() => setIsDetailModalOpen(false)}
         user={selectedUser}
      />
    </div>
  );
}
