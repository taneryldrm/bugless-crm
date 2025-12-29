import React, { useState, useEffect } from 'react';
import { Search, Plus, Folder, Clock, CheckCircle2, Briefcase, Eye, Filter, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import CreateProjectModal from '@/components/modals/CreateProjectModal';
import ProjectDetailModal from '@/components/modals/ProjectDetailModal';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';
import { useSupabaseAuth } from '@/context/SupabaseAuthContext';

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user, isAdmin } = useSupabaseAuth();
  const [filter, setFilter] = useState('Tümü');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Tüm Durumlar');
  
  const [stats, setStats] = useState({ total: 0, ongoing: 0, completed: 0, planning: 0 });

  // Load Projects
  const fetchProjects = async () => {
    try {
        setLoading(true);
        // Join with clients to get customer name
        const { data, error } = await supabase
            .from('projects')
            .select('*, clients(name)');
            
        if (error) throw error;
        
        // Transform data for UI
        const mapped = (data || []).map(p => ({
            ...p,
            customer: p.clients?.name || 'Bilinmiyor'
        }));
        
        setProjects(mapped);
        
        // Calc Stats
        const s = {
            total: mapped.length,
            ongoing: mapped.filter(p => p.status === 'Devam Ediyor').length,
            completed: mapped.filter(p => p.status === 'Tamamlandı').length,
            planning: mapped.filter(p => p.status === 'Hazırlık' || p.status === 'Planlama').length
        };
        setStats(s);

    } catch (e) {
        console.error("Projects fetch error:", e);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
     if (user) fetchProjects();
  }, [user]);


  const handleCreateProject = async (projectData) => {
    try {
        // 1. Resolve Client
        let clientId = null;
        
        // Try finding client
        const { data: existingClient } = await supabase.from('clients').select('id').eq('name', projectData.customer).single();
        if (existingClient) {
            clientId = existingClient.id;
        } else {
             // Create Client if not exists
             const { data: newClient, error: clientError } = await supabase.from('clients').insert({ name: projectData.customer, type: 'Normal', status: 'Aktif' }).select().single();
             if (!clientError) clientId = newClient.id;
        }

        const newProject = {
          name: projectData.name,
          client_id: clientId,
          status: projectData.status,
          price: parseFloat(projectData.price) || 0,
          description: projectData.description,
          start_date: projectData.startDate ? new Date(projectData.startDate).toISOString() : null,
          end_date: projectData.endDate ? new Date(projectData.endDate).toISOString() : null,
          manager_id: projectData.assignee || null,
          team_ids: projectData.team || []
        };
        
        const { error } = await supabase.from('projects').insert(newProject);
        if (error) throw error;
        
        alert('Proje oluşturuldu.');
        setIsModalOpen(false);
        fetchProjects();

    } catch (e) {
        console.error("Create project error:", e);
        alert("Hata: " + e.message);
    }
  };

  const handleDeleteProject = async (id) => {
      try {
          const { error } = await supabase.from('projects').delete().eq('id', id);
          if (error) throw error;
          fetchProjects(); // Refresh
      } catch(e) {
          alert('Silme hatası: ' + e.message);
      }
  };

  const handleUpdateProject = async (updatedProject) => {
      try {
          const { error } = await supabase.from('projects').update({
              status: updatedProject.status,
              // Add other fields as needed
          }).eq('id', updatedProject.id);
          
          if (error) throw error;
          fetchProjects();
      } catch(e) { console.error(e); }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Devam Ediyor': return 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400 border-amber-200 dark:border-amber-900/50';
      case 'Tamamlandı': return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50';
      case 'Planlama': case 'Hazırlık': return 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900/50';
      default: return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-400 border-slate-200 dark:border-slate-700';
    }
  }

  const filteredProjects = projects.filter(project => {
    const custName = project.customer || '';
    const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          custName.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Status normalization
    const pStatus = project.status === 'Hazırlık' ? 'Planlama' : project.status;
    const matchesFilter = statusFilter === 'Tüm Durumlar' || pStatus === statusFilter;
    
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Projeler</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">Tüm projeleri buradan takip et ve yönet.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="bg-violet-600 hover:bg-violet-700 text-white shadow-lg shadow-violet-500/20 dark:shadow-violet-900/40">
          <Plus className="w-4 h-4 mr-2" /> Yeni Proje
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border dark:border-slate-800 shadow-sm hover:shadow-md transition-all bg-violet-50 dark:bg-violet-900/20 border-violet-100 dark:border-violet-900/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Toplam Proje</p>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{stats.total}</h3>
              </div>
              <div className="p-3 bg-white dark:bg-slate-950/30 rounded-xl shadow-sm">
                <Folder className="w-6 h-6 text-violet-600 dark:text-violet-400" />
              </div>
            </div>
          </div>
          {/* ... Other stats (simplified for brevity, can map if desired) ... */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border dark:border-slate-800 shadow-sm hover:shadow-md transition-all bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-900/50">
             <div className="flex items-center justify-between">
               <div><p className="text-sm text-slate-500">Devam Eden</p><h3 className="text-2xl font-bold">{stats.ongoing}</h3></div>
               <div className="p-3 bg-white/50 rounded-xl"><Clock className="w-6 h-6 text-amber-600" /></div>
             </div>
          </div>
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border dark:border-slate-800 shadow-sm hover:shadow-md transition-all bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-900/50">
             <div className="flex items-center justify-between">
               <div><p className="text-sm text-slate-500">Tamamlanan</p><h3 className="text-2xl font-bold">{stats.completed}</h3></div>
               <div className="p-3 bg-white/50 rounded-xl"><CheckCircle2 className="w-6 h-6 text-emerald-600" /></div>
             </div>
          </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 w-5 h-5" />
          <input 
            type="text" 
            placeholder="Proje veya müşteri ara..." 
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all font-medium text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-600"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="relative">
             <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 w-4 h-4" />
             <select 
               className="pl-10 pr-8 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 bg-white dark:bg-slate-900 font-medium text-slate-700 dark:text-slate-200 appearance-none cursor-pointer"
               value={statusFilter}
               onChange={(e) => setStatusFilter(e.target.value)}
             >
               <option>Tüm Durumlar</option>
               <option>Devam Ediyor</option>
               <option>Planlama</option>
               <option>Tamamlandı</option>
             </select>
        </div>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
            <div className="col-span-full flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-violet-600" /></div>
        ) : filteredProjects.map((project) => (
          <div 
             key={project.id} 
             onClick={() => setSelectedProject(project)}
             className="group bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 hover:shadow-xl hover:border-violet-200 dark:hover:border-violet-900 transition-all duration-300 cursor-pointer relative overflow-hidden"
          >
             <div className="absolute top-0 left-0 w-1 h-full bg-violet-500 scale-y-0 group-hover:scale-y-100 transition-transform duration-300 origin-top" />
             
             <div className="flex justify-between items-start mb-4">
                <div className="flex gap-2">
                    <span className={cn("px-2.5 py-1 rounded-lg text-xs font-bold border", getStatusColor(project.status))}>
                      {project.status}
                    </span>
                </div>
                <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 group-hover:bg-violet-100 dark:group-hover:bg-violet-900/30 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                    <Eye className="w-4 h-4" />
                </div>
             </div>

             <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1 group-hover:text-violet-700 dark:group-hover:text-violet-400 transition-colors">{project.name}</h3>
             <p className="text-slate-500 dark:text-slate-400 text-sm mb-5 font-medium flex items-center gap-2">
                <Briefcase className="w-3.5 h-3.5" />
                {project.customer}
             </p>

             <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between text-sm">
                   <span className="text-slate-400 dark:text-slate-500 font-medium">Bütçe</span>
                   <span className="font-bold text-slate-900 dark:text-white">₺{project.price?.toLocaleString()}</span>
                </div>
             </div>
          </div>
        ))}
      </div>

      <CreateProjectModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSubmit={handleCreateProject} 
      />

      <ProjectDetailModal 
        isOpen={!!selectedProject}
        onClose={() => setSelectedProject(null)}
        project={selectedProject}
        onDelete={handleDeleteProject}
        onUpdate={handleUpdateProject}
      />
    </div>
  );
}
