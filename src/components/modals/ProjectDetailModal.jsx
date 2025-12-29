import React, { useState, useEffect, useRef } from 'react';
import { X, Trash2, Calendar, Pencil, Save, Plus, CheckCircle2, LayoutDashboard, CheckSquare, Paperclip, MessageSquare, Send, FileText, Link as LinkIcon, Download, Book } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';
import { format, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';
import { useSupabaseAuth } from '@/context/SupabaseAuthContext';


export default function ProjectDetailModal({ isOpen, onClose, project, onDelete, onUpdate }) {
  const { user } = useSupabaseAuth();
  const [activeTab, setActiveTab] = useState('overview'); // overview, tasks, files, activity
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState(null);
  const [loading, setLoading] = useState(false);

  // Sub-data
  const [subtasks, setSubtasks] = useState([]);
  const [files, setFiles] = useState([]);
  const [activities, setActivities] = useState([]);
  const [availablePersonnel, setAvailablePersonnel] = useState([]);
  const [availableClients, setAvailableClients] = useState([]);

  // Inputs
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newFile, setNewFile] = useState({ name: '', url: '', type: 'link' });
  const [newMessage, setNewMessage] = useState('');
  const chatScrollRef = useRef(null);

  useEffect(() => {
      if (isOpen && project) {
          // Reset
          setActiveTab('overview');
          setSubtasks([]);
          setFiles([]);
          setActivities([]);

          // Prep Edit Data
          setEditData({ 
            ...project,
            startDate: project.start_date ? project.start_date.split('T')[0] : '',
            endDate: project.end_date ? project.end_date.split('T')[0] : '',
            team_ids: project.team_ids || []
          });
          setIsEditing(false);
          
          // Fetch Core Data & Related Data
          const fetchData = async () => {
              setLoading(true);
              const { data: clients } = await supabase.from('clients').select('id, name');
              const { data: profiles } = await supabase.from('profiles').select('id, full_name, avatar_url'); // added avatar_url if exists locally? assuming profile logic
              setAvailableClients(clients || []);
              setAvailablePersonnel(profiles || []);

              // Fetch Subtasks
              const { data: st } = await supabase.from('project_subtasks').select('*').eq('project_id', project.id).order('created_at');
              setSubtasks(st || []);

              // Fetch Files
              const { data: fl } = await supabase.from('project_files').select('*').eq('project_id', project.id).order('created_at', { ascending: false });
              setFiles(fl || []);

              // Fetch Activity
              const { data: ac } = await supabase
                .from('project_activity')
                .select('*, profiles(full_name)')
                .eq('project_id', project.id)
                .order('created_at', { ascending: true });
              setActivities(ac || []);

              setLoading(false);
          };
          fetchData();
          
          // Subscribe to Realtime (Bonus)
          const sub = supabase.channel(`project-${project.id}`)
            .on('postgres_changes', { event: '*', schema: 'public', filter: `project_id=eq.${project.id}` }, (payload) => {
                // Ideally refresh all, simplifying for now
                // fetchData(); 
            })
            .subscribe();

          return () => {
              supabase.removeChannel(sub);
          }
      }
  }, [isOpen, project]);

  // Scroll chat to bottom
  useEffect(() => {
      if (activeTab === 'activity' && chatScrollRef.current) {
          chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
      }
  }, [activities, activeTab]);

  if (!isOpen || !project || !editData) return null;

  // --- Actions ---

  const handleSave = () => {
      onUpdate({
          ...editData,
          start_date: editData.startDate ? new Date(editData.startDate).toISOString() : null,
          end_date: editData.endDate ? new Date(editData.endDate).toISOString() : null,
          price: typeof editData.price === 'string' 
            ? parseFloat(editData.price.replace(/\./g, '').replace(',', '.')) || 0 
            : parseFloat(editData.price) || 0
      });
      setIsEditing(false);
      logActivity('Proje bilgilerini güncelledi.');
  };

  const logActivity = async (msg, type='log') => {
      if(!user) return;
      const { error } = await supabase.from('project_activity').insert({
          project_id: project.id,
          user_id: user.id,
          message: msg,
          type: type
      });
      if (!error) {
          // Optimistic update
          const newAct = {
              id: Date.now(),
              project_id: project.id,
              user_id: user.id,
              message: msg,
              type: type,
              created_at: new Date().toISOString(),
              profiles: { full_name: 'Ben' } // temporary
          };
          setActivities([...activities, newAct]);
      }
  };

  const handleAddTask = async (e) => {
      e.preventDefault();
      if (!newTaskTitle.trim()) return;
      
      const { data, error } = await supabase.from('project_subtasks').insert({
          project_id: project.id,
          title: newTaskTitle,
          is_completed: false
      }).select().single();

      if (!error && data) {
          setSubtasks([...subtasks, data]);
          setNewTaskTitle('');
          logActivity(`Yeni görev ekledi: ${newTaskTitle}`);
      }
  };

  const toggleTask = async (task) => {
      const { error } = await supabase.from('project_subtasks').update({ is_completed: !task.is_completed }).eq('id', task.id);
      if (!error) {
          setSubtasks(subtasks.map(t => t.id === task.id ? { ...t, is_completed: !t.is_completed } : t));
      }
  };

  const deleteTask = async (id) => {
      await supabase.from('project_subtasks').delete().eq('id', id);
      setSubtasks(subtasks.filter(t => t.id !== id));
  };

  const handleAddFile = async (e) => {
    e.preventDefault();
    if (!newFile.url || !newFile.name) return;

    const { data, error } = await supabase.from('project_files').insert({
        project_id: project.id,
        name: newFile.name,
        url: newFile.url,
        type: newFile.type,
        uploaded_by: user?.id
    }).select().single();

    if (!error && data) {
        setFiles([data, ...files]);
        setNewFile({ name: '', url: '', type: 'link' });
        logActivity(`Yeni dosya ekledi: ${newFile.name}`);
    }
  };

  const deleteFile = async (id) => {
      await supabase.from('project_files').delete().eq('id', id);
      setFiles(files.filter(f => f.id !== id));
  };

  const handleSendMessage = async (e) => {
      e.preventDefault();
      if (!newMessage.trim()) return;
      await logActivity(newMessage, 'comment');
      setNewMessage('');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Devam Ediyor': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      case 'Tamamlandı': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30';
      case 'Hazırlık': case 'Planlama': return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30';
      default: return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
    }
  };

  // --- Render Tabs ---
  
  const renderOverview = () => (
      <div className="space-y-6 animate-in fade-in duration-300">
         {/* ... (Existing Overview UI but simplified/integrated) ... */}
         {isEditing ? (
             <div className="space-y-4">
                 {/* ... Edit Form (Reusing existing logic slightly refactored) ... */}
                 {/* Name */}
                 <div className="space-y-1.5">
                   <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Proje Adı</label>
                   <input className="w-full input-primary" value={editData.name} onChange={e => setEditData({...editData, name: e.target.value})} />
                 </div>
                 {/* Client & Status Row */}
                 <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="label-text">Müşteri</label>
                        <select className="w-full input-primary" value={editData.client_id} onChange={e => setEditData({...editData, client_id: e.target.value})}>
                            <option value="">Seçiniz...</option>
                            {availableClients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                     </div>
                     <div>
                        <label className="label-text">Durum</label>
                        <select className="w-full input-primary" value={editData.status} onChange={e => setEditData({...editData, status: e.target.value})}>
                            <option>Hazırlık</option>
                            <option>Devam Ediyor</option>
                            <option>Tamamlandı</option>
                        </select>
                     </div>
                 </div>
                 {/* Description */}
                 <div>
                    <label className="label-text">Açıklama</label>
                    <textarea rows={3} className="w-full input-primary resize-none" value={editData.description} onChange={e => setEditData({...editData, description: e.target.value})} />
                 </div>
                 {/* Dates & Price */}
                 <div className="grid grid-cols-3 gap-4">
                     <div><label className="label-text">Başlangıç</label><input type="date" className="w-full input-primary" value={editData.startDate} onChange={e => setEditData({...editData, startDate: e.target.value})} /></div>
                     <div><label className="label-text">Bitiş</label><input type="date" className="w-full input-primary" value={editData.endDate} onChange={e => setEditData({...editData, endDate: e.target.value})} /></div>
                     <div><label className="label-text">Bütçe (₺)</label><input type="text" className="w-full input-primary" value={editData.price} onChange={e => setEditData({...editData, price: e.target.value})} /></div>
                 </div>
                 {/* Team Selection */}
                 <div>
                    <label className="label-text">Ekip</label>
                    <select className="w-full input-primary" onChange={(e) => {
                        if (e.target.value && !editData.team_ids.includes(e.target.value)) {
                            setEditData({ ...editData, team_ids: [...editData.team_ids, e.target.value] });
                        }
                        e.target.value = '';
                    }}>
                        <option value="">Personel Ekle...</option>
                        {availablePersonnel.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                    </select>
                    <div className="flex flex-wrap gap-2 mt-2">
                        {editData.team_ids.map(id => (
                            <div key={id} className="badge-chip">
                                {availablePersonnel.find(p => p.id === id)?.full_name}
                                <X className="w-3 h-3 cursor-pointer hover:text-red-500" onClick={() => setEditData({...editData, team_ids: editData.team_ids.filter(t => t !== id)})} />
                            </div>
                        ))}
                    </div>
                 </div>

                 <div className="flex justify-end gap-2 pt-4">
                     <Button variant="ghost" onClick={() => setIsEditing(false)}>İptal</Button>
                     <Button onClick={handleSave}>Kaydet</Button>
                 </div>
             </div>
         ) : (
             <div className="space-y-6">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800">
                         <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Proje Bilgileri</h4>
                         <div className="space-y-3">
                             <div>
                                 <span className="text-xs text-slate-500">Müşteri:</span>
                                 <p className="font-semibold text-slate-900 dark:text-white">{project.clients?.name || 'Yok'}</p>
                             </div>
                             <div>
                                 <span className="text-xs text-slate-500">Yönetici:</span>
                                 <p className="font-semibold text-slate-900 dark:text-white">{availablePersonnel.find(p => p.id === project.manager_id)?.full_name || '-'}</p>
                             </div>
                             <div>
                                 <span className="text-xs text-slate-500">Tarihler:</span>
                                 <p className="font-semibold text-slate-900 dark:text-white text-sm">
                                     {project.start_date ? format(parseISO(project.start_date), 'd MMM', {locale: tr}) : '?'} - 
                                     {project.end_date ? format(parseISO(project.end_date), 'd MMM yyyy', {locale: tr}) : '?'}
                                 </p>
                             </div>
                         </div>
                     </div>
                     <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800">
                         <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Finans & Durum</h4>
                         <div className="space-y-4">
                             <div>
                                <span className={cn("px-2.5 py-1 rounded-lg text-xs font-bold border", getStatusColor(project.status))}>
                                     {project.status}
                                </span>
                             </div>
                             <div>
                                 <span className="text-xs text-slate-500">Bütçe:</span>
                                 <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">₺{project.price?.toLocaleString()}</p>
                             </div>
                         </div>
                     </div>
                 </div>
                 
                 <div>
                     <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Açıklama</h4>
                     <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl">
                         {project.description || 'Açıklama yok.'}
                     </p>
                 </div>

                 <div>
                     <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Proje Ekibi</h4>
                     <div className="flex flex-wrap gap-2">
                         {(project.team_ids || []).map(id => (
                             <div key={id} className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm">
                                 <div className="w-5 h-5 rounded-full bg-violet-100 dark:bg-violet-900 text-violet-600 dark:text-violet-300 flex items-center justify-center text-xs font-bold">
                                     {availablePersonnel.find(p => p.id === id)?.full_name?.charAt(0) || 'U'}
                                 </div>
                                 <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                     {availablePersonnel.find(p => p.id === id)?.full_name}
                                 </span>
                             </div>
                         ))}
                     </div>
                 </div>
             </div>
         )}
      </div>
  );

  const renderTasks = () => (
      <div className="space-y-6 animate-in fade-in duration-300">
          <form onSubmit={handleAddTask} className="flex gap-2">
              <input 
                autoFocus
                placeholder="Yeni bir görev ekle..." 
                className="flex-1 input-primary"
                value={newTaskTitle}
                onChange={e => setNewTaskTitle(e.target.value)}
              />
              <Button type="submit" disabled={!newTaskTitle.trim()}>
                  <Plus className="w-4 h-4 mr-2" /> Ekle
              </Button>
          </form>

          <div className="space-y-1">
              {subtasks.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 dark:text-slate-600">
                      <CheckSquare className="w-10 h-10 mx-auto mb-2 opacity-50" />
                      <p>Henüz iş maddesi eklenmemiş.</p>
                  </div>
              ) : subtasks.map(task => (
                  <div key={task.id} className="flex items-start gap-3 p-3 group hover:bg-slate-50 dark:hover:bg-slate-900/50 rounded-lg transition-colors">
                      <button 
                        onClick={() => toggleTask(task)}
                        className={cn(
                          "mt-0.5 w-5 h-5 rounded border flex items-center justify-center transition-all",
                          task.is_completed ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-300 dark:border-slate-600 hover:border-violet-500 text-transparent"
                        )}
                      >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                      </button>
                      <div className="flex-1">
                          <p className={cn("text-sm transition-all", task.is_completed ? "text-slate-400 line-through" : "text-slate-800 dark:text-slate-200")}>
                             {task.title}
                          </p>
                      </div>
                      <button onClick={() => deleteTask(task.id)} className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-opacity">
                          <Trash2 className="w-4 h-4" />
                      </button>
                  </div>
              ))}
          </div>
      </div>
  );

  const renderFiles = () => (
      <div className="space-y-6 animate-in fade-in duration-300">
          <form onSubmit={handleAddFile} className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                  <input placeholder="Dosya Adı (Örn: Sözleşme)" className="input-primary text-sm" value={newFile.name} onChange={e => setNewFile({...newFile, name: e.target.value})} />
                  <select className="input-primary text-sm" value={newFile.type} onChange={e => setNewFile({...newFile, type: e.target.value})}>
                      <option value="link">Harici Link</option>
                      <option value="drive">Google Drive</option>
                      <option value="figma">Figma</option>
                      <option value="file">Dosya</option>
                  </select>
              </div>
              <div className="flex gap-2">
                 <input placeholder="URL veya Dosya Linki" className="flex-1 input-primary text-sm" value={newFile.url} onChange={e => setNewFile({...newFile, url: e.target.value})} />
                 <Button type="submit" size="sm" disabled={!newFile.url}>Ekle</Button>
              </div>
          </form>

          <div className="grid grid-cols-1 gap-2">
              {files.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 dark:text-slate-600">
                      <Paperclip className="w-10 h-10 mx-auto mb-2 opacity-50" />
                      <p>Dosya bulunmuyor.</p>
                  </div>
              ) : files.map(file => (
                  <div key={file.id} className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 hover:shadow-sm transition-all">
                      <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 flex items-center justify-center">
                              {file.type === 'link' ? <LinkIcon className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                          </div>
                          <div>
                              <p className="text-sm font-semibold text-slate-900 dark:text-white">{file.name}</p>
                              <a href={file.url} target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline max-w-[200px] truncate block opacity-80">
                                  {file.url}
                              </a>
                          </div>
                      </div>
                      <button onClick={() => deleteFile(file.id)} className="text-slate-400 hover:text-red-500 p-2"><Trash2 className="w-4 h-4" /></button>
                  </div>
              ))}
          </div>
      </div>
  );

  const renderActivity = () => (
      <div className="flex flex-col h-[500px] animate-in fade-in duration-300">
          <div className="flex-1 overflow-y-auto space-y-4 p-2" ref={chatScrollRef}>
              {activities.length === 0 && (
                   <div className="text-center py-20 text-slate-400 dark:text-slate-600">
                       <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-50" />
                       <p>Henüz bir aktivite yok.</p>
                   </div>
              )}
              {activities.map(act => {
                  const isLog = act.type === 'log';
                  const isMe = act.user_id === user?.id; // user object from context
                  
                  if (isLog) {
                      return (
                          <div key={act.id} className="flex items-center justify-center gap-2 my-4">
                              <div className="h-px w-8 bg-slate-200 dark:bg-slate-800"></div>
                              <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">{act.message} • {format(parseISO(act.created_at), 'HH:mm')}</span>
                              <div className="h-px w-8 bg-slate-200 dark:bg-slate-800"></div>
                          </div>
                      );
                  }

                  return (
                      <div key={act.id} className={cn("flex gap-3 max-w-[85%]", isMe ? "ml-auto flex-row-reverse" : "")}>
                          <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0", isMe ? "bg-violet-600 text-white" : "bg-slate-200 text-slate-600")}>
                               {act.profiles?.full_name?.charAt(0) || '?'}
                          </div>
                          <div className={cn("p-3 rounded-2xl text-sm", isMe ? "bg-violet-600 text-white rounded-tr-none" : "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-none")}>
                              <p>{act.message}</p>
                              <span className={cn("text-[10px] block mt-1 opacity-70", isMe ? "text-violet-200" : "text-slate-400")}>
                                  {format(parseISO(act.created_at), 'HH:mm', {locale: tr})}
                              </span>
                          </div>
                      </div>
                  )
              })}
          </div>
          <form onSubmit={handleSendMessage} className="pt-4 border-t border-slate-100 dark:border-slate-800 flex gap-2">
              <input 
                placeholder="Yorum yaz..." 
                className="flex-1 input-primary" 
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
              />
              <Button type="submit" size="icon" className="bg-violet-600"><Send className="w-4 h-4" /></Button>
          </form>
      </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-2xl h-[85vh] flex flex-col border border-slate-200 dark:border-slate-800 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-slate-800">
            <div>
               <h2 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                   {project.name}
                   {!isEditing && <Pencil className="w-4 h-4 text-slate-400 cursor-pointer hover:text-violet-600" onClick={() => setIsEditing(true)} />}
               </h2>
               <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">{project.clients?.name}</p>
            </div>
            <div className="flex gap-2">
                {!isEditing && (
                    <Button variant="ghost" size="icon" className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20" onClick={() => { if(confirm('Sil?')) onDelete(project.id) }}>
                         <Trash2 className="w-5 h-5" />
                    </Button>
                )}
                <Button variant="ghost" size="icon" onClick={onClose}>
                   <X className="w-5 h-5" />
                </Button>
            </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 px-6 border-b border-gray-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
            {[
                { id: 'overview', label: 'Genel Bakış', icon: LayoutDashboard },
                { id: 'tasks', label: 'İş Listesi', icon: CheckSquare },
                { id: 'files', label: 'Dosyalar', icon: Paperclip },

                { id: 'activity', label: 'Günlük', icon: MessageSquare },
            ].map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={cn(
                            "flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all relative",
                            isActive ? "text-violet-600 dark:text-violet-400" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                        )}
                    >
                        <Icon className="w-4 h-4" />
                        {tab.label}
                        {isActive && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-violet-600 dark:bg-violet-400 rounded-t-full" />}
                    </button>
                )
            })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
            {loading ? <div className="text-center py-20 text-slate-400">Yükleniyor...</div> : (
                <>
                    {activeTab === 'overview' && renderOverview()}
                    {activeTab === 'tasks' && renderTasks()}
                    {activeTab === 'files' && renderFiles()}

                    {activeTab === 'activity' && renderActivity()}
                </>
            )}
        </div>

      </div>
    </div>
  );
}
