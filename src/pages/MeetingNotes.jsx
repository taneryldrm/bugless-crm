import React, { useState, useEffect, useRef } from 'react';
import { 
  Calendar, Clock, Users, Play, Pause, Square, Mic, MicOff, 
  CheckCircle, Plus, Hash, Save, Share2, MoreVertical, Layout,
  ChevronLeft, ChevronRight, Zap, Target, Search, MoreHorizontal,
  Trash2, FileText, CornerDownLeft, Loader2 
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { useSupabaseAuth } from '@/context/SupabaseAuthContext';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { extractTasksFromNotes } from '@/lib/ai';

export default function MeetingNotes() {
  const { user } = useSupabaseAuth();
  const [activeNote, setActiveNote] = useState(null); 
  const [history, setHistory] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [zenMode, setZenMode] = useState(false);
  const [showRightRail, setShowRightRail] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch History
  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setLoading(true);
    const { data } = await supabase.from('meeting_notes').select('*').order('created_at', { ascending: false });
    
    setHistory(data || []);
    setLoading(false);
    
    // Auto-select first note if exists, otherwise ready for new
    if (data && data.length > 0) {
        // Optional: Auto open latest? 
        // setActiveNote(data[0]); 
    }
  };

  const createNewNote = async (template = null) => {
    const title = template ? `${template} - ${format(new Date(), 'd MMM')}` : '';
    
    const newNote = {
      title: title, 
      type: template || 'Genel',
      date: new Date().toISOString(),
      content: '', // Start empty
      attendees: [],
      decisions: [],
      duration: 0,
      efficiency_score: 50,
      created_by: user?.id
    };

    // Optimistic UI - Add immediately
    const tempId = 'temp-' + Date.now();
    const optimisticNote = { ...newNote, id: tempId, isTemp: true };
    setActiveNote(optimisticNote);
    
    // We don't save to DB until they type something or change title
  };

  const saveToDb = async (noteToSave) => {
      if (noteToSave.isTemp) {
           // EXCLUDE 'id' too, because 'temp-...' is not a valid UUID for the DB.
           const { isTemp, id, ...insertData } = noteToSave;
           
           // Default title if empty
           if (!insertData.title || !insertData.title.trim()) insertData.title = 'Yeni Toplantı';
           
           const { data, error } = await supabase.from('meeting_notes').insert(insertData).select().single();
           
           if (error) {
               console.error("Save Error:", error);
               alert("Kayıt başarısız: " + error.message);
               return null;
           }

           if (data) {
               setHistory([data, ...history]);
               setActiveNote(data); // Switch to the real active note (with real ID)
               return data;
           }
      } else {
          await supabase.from('meeting_notes').update({
              title: noteToSave.title,
              content: noteToSave.content,
              duration: noteToSave.duration,
              decisions: noteToSave.decisions,
              action_items: noteToSave.action_items,
              efficiency_score: noteToSave.efficiency_score,
              updated_at: new Date().toISOString()
          }).eq('id', noteToSave.id);
          
          setHistory(history.map(h => h.id === noteToSave.id ? { ...h, ...noteToSave } : h));
          return noteToSave;
      }
  };

  const filteredHistory = history.filter(h => h.title?.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className={cn("h-[calc(100vh-4rem)] flex bg-[#F9FAFB] dark:bg-[#020617] group/app", zenMode && "fixed inset-0 z-50 h-screen bg-white dark:bg-black")}>
      
      {/* 1. LEFT SIDEBAR - NAVIGATION */}
      {!zenMode && (
          <div className="w-72 flex flex-col border-r border-gray-200 dark:border-slate-800 bg-white dark:bg-[#0B1120]">
            {/* Header */}
            <div className="p-4 border-b border-gray-100 dark:border-slate-800/50">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <FileText className="w-5 h-5 text-indigo-600" />
                        Notlar
                    </h2>
                    <Button size="icon" variant="ghost" onClick={() => createNewNote()} className="h-8 w-8 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20">
                        <Plus className="w-5 h-5" />
                    </Button>
                </div>
                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input 
                        className="w-full bg-gray-50 dark:bg-slate-900 border-none rounded-lg py-2 pl-9 pr-3 text-sm focus:ring-1 focus:ring-indigo-500"
                        placeholder="Ara..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {filteredHistory.length === 0 && !loading && (
                    <div className="text-center py-10 opacity-50">
                         <p className="text-xs">Henüz not yok.</p>
                         <Button variant="link" size="sm" onClick={() => createNewNote()} className="text-indigo-500 mt-1">Oluştur</Button>
                    </div>
                )}
                
                {filteredHistory.map(note => (
                    <div 
                        key={note.id} 
                        onClick={() => setActiveNote(note)}
                        className={cn(
                            "group flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all border border-transparent",
                            activeNote?.id === note.id 
                                ? "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-100 dark:border-indigo-900/30" 
                                : "hover:bg-gray-50 dark:hover:bg-slate-800/50"
                        )}
                    >
                        <div className="mt-1 min-w-[4px] h-[4px] rounded-full bg-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="flex-1 min-w-0">
                            <h3 className={cn("text-sm font-semibold truncate", activeNote?.id === note.id ? "text-indigo-900 dark:text-indigo-100" : "text-gray-700 dark:text-slate-300")}>
                                {note.title || 'Yeni Not'}
                            </h3>
                            <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-0.5 flex items-center gap-2">
                                <span>{format(new Date(note.date), 'd MMM', { locale: tr })}</span>
                                {note.duration > 0 && <span>• {Math.floor(note.duration/60)}dk</span>}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
          </div>
      )}

      {/* 2. MAIN EDITOR */}
      <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-[#020617] relative">
          {activeNote ? (
              <ActiveNoteEditor 
                  key={activeNote.id} // Reset state on note change
                  note={activeNote} 
                  zenMode={zenMode} 
                  toggleZen={() => setZenMode(!zenMode)}
                  showRightRail={showRightRail}
                  toggleRightRail={() => setShowRightRail(!showRightRail)}
                  onSave={saveToDb}
              />
          ) : (
              // Enhanced Empty State
              <div className="flex-1 flex flex-col items-center justify-center text-center p-12 bg-gray-50/50 dark:bg-slate-900/20">
                  <div className="w-20 h-20 bg-gradient-to-br from-indigo-100 to-white dark:from-slate-800 dark:to-slate-900 rounded-2xl shadow-xl flex items-center justify-center mb-6">
                      <FileText className="w-10 h-10 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Hazır mısınız?</h1>
                  <p className="text-gray-500 dark:text-slate-400 max-w-sm mb-8">
                      Yeni bir toplantı notu oluşturun veya sol menüden geçmiş bir notu seçin.
                  </p>
                  
                  <div className="grid grid-cols-2 gap-4 w-full max-w-md">
                      <button onClick={() => createNewNote('Haftalık')} className="p-4 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl hover:border-indigo-500 hover:shadow-lg transition-all text-left group">
                          <Clock className="w-6 h-6 text-indigo-500 mb-3 group-hover:scale-110 transition-transform" />
                          <div className="font-semibold text-gray-900 dark:text-white">Haftalık Rapor</div>
                          <div className="text-xs text-gray-400 mt-1">Standart haftalık özet şablonu</div>
                      </button>
                      
                      <button onClick={() => createNewNote('Müşteri')} className="p-4 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl hover:border-violet-500 hover:shadow-lg transition-all text-left group">
                          <Users className="w-6 h-6 text-violet-500 mb-3 group-hover:scale-110 transition-transform" />
                          <div className="font-semibold text-gray-900 dark:text-white">Müşteri Görüşmesi</div>
                          <div className="text-xs text-gray-400 mt-1">Notlar ve aksiyonlar için</div>
                      </button>
                  </div>
                  
                  <button onClick={() => createNewNote()} className="mt-8 flex items-center gap-2 text-sm text-gray-500 hover:text-indigo-600 font-medium">
                      <Plus className="w-4 h-4" />
                      Boş Not Başlat
                  </button>
              </div>
          )}
      </div>

    </div>
  );
}

// --- EDITOR COMPONENT ---

function ActiveNoteEditor({ note, zenMode, toggleZen, showRightRail, toggleRightRail, onSave }) {
    const [title, setTitle] = useState(note.title);
    const [content, setContent] = useState(note.content || '');
    const [decisions, setDecisions] = useState(note.decisions || []);
    const [newDecision, setNewDecision] = useState('');
    const [newTask, setNewTask] = useState('');
    // Initialize tasks from saved action_items (converted back to object format for display)
    const [recentTasks, setRecentTasks] = useState(
        (note.action_items || []).map(t => ({ title: t })) || []
    ); 
    const [saving, setSaving] = useState(false);
    
    // Voice Context - Using Ref to solve closure staleness in Speech API callback
    const [activeField, setActiveField] = useState('content'); 
    const activeFieldRef = useRef('content');

    // Sync Ref with State
    useEffect(() => {
        activeFieldRef.current = activeField;
    }, [activeField]);
    
    // Timer
    const [timerRunning, setTimerRunning] = useState(false);
    const [seconds, setSeconds] = useState(note.duration || 0);
    const timerRef = useRef(null);
    
    // Voice
    const [listening, setListening] = useState(false);
    const recognitionRef = useRef(null);

    // Initial Save Trigger (Create Record if Temp)
    useEffect(() => {
        // If it's a temp note and user starts typing, we should probably persist it eventually
        // For now, let's just let the user type.
    }, []);

    // Timer Logic
    useEffect(() => {
        if (timerRunning) {
            timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
        } else {
            clearInterval(timerRef.current);
        }
        return () => clearInterval(timerRef.current);
    }, [timerRunning]);

    // Auto Save
    useEffect(() => {
        const timeout = setTimeout(() => {
            if (title !== note.title || content !== note.content || seconds !== note.duration) {
                handleSave();
            }
        }, 2000); // Debounce 2s
        return () => clearTimeout(timeout);
    }, [title, content, seconds]);

    const handleSave = async () => {
        setSaving(true);
        try {
            await onSave({ 
                ...note, 
                title, 
                content, 
                duration: seconds, 
                decisions,
                // Save task titles as simple array of strings
                action_items: recentTasks.map(t => t.title) 
            });
        } finally {
            setSaving(false);
        }
    };

    const handleAddDecision = () => {
        if (!newDecision.trim()) return;
        const updated = [...decisions, newDecision.trim()];
        setDecisions(updated);
        setNewDecision('');
        // Trigger save to persist immediately
        onSave({ 
            ...note, 
            title, 
            content, 
            duration: seconds, 
            decisions: updated,
            action_items: recentTasks.map(t => t.title)
        });
    };

    const removeDecision = (index) => {
        const updated = decisions.filter((_, i) => i !== index);
        setDecisions(updated);
        onSave({ 
            ...note, 
            title, 
            content, 
            duration: seconds, 
            decisions: updated,
            action_items: recentTasks.map(t => t.title)
        });
    };

    const handleCreateTask = async () => {
        if (!newTask.trim()) return;
        
        const taskTitle = newTask.trim();
        const tempTask = { id: Date.now(), title: taskTitle, status: 'Beklemede' };
        
        // Optimistic Update
        setRecentTasks([tempTask, ...recentTasks]);
        setNewTask('');

        const { error } = await supabase.from('external_tasks').insert({
            title: taskTitle,
            status: 'Beklemede',
            due_date: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
            priority: 'Normal'
        });

        if (error) {
            console.error("Task creation failed:", error);
            alert("Görev oluşturulamadı.");
        } else {
             // Save to Note State as well
             const updatedTasks = [tempTask, ...recentTasks];
             onSave({
                 ...note,
                 title,
                 content,
                 duration: seconds,
                 decisions,
                 action_items: updatedTasks.map(t => t.title)
             });
        }
    };

    const copySummary = () => {
        const decisionText = decisions.length > 0 ? decisions.map(d => `✅ ${d}`).join('\n') : '-';
        const taskText = recentTasks.length > 0 ? recentTasks.map(t => `👉 ${t.title}`).join('\n') : '-';
        
        const text = `📅 *${title}* (${format(new Date(), 'd MMM')})\n\n` +
                     `📝 *NOTLAR:*\n${content}\n\n` +
                     `📌 *ALINAN KARARLAR:*\n${decisionText}\n\n` +
                     `🚀 *AKSİYONLAR:*\n${taskText}`;
                     
        navigator.clipboard.writeText(text);
        alert("Özet kopyalandı! (WhatsApp için hazır)");
    };
    
    const toggleVoice = () => {
        if (listening) {
            recognitionRef.current?.stop();
            setListening(false);
        } else {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (!SpeechRecognition) return alert("Sesli yazma bu tarayıcıda desteklenmiyor.");
            
            const recognition = new SpeechRecognition();
            recognition.lang = 'tr-TR';
            recognition.continuous = true;
            recognition.interimResults = true;
            
            // Store the content at the moment recording starts
            // We will append the live transcript to this base
            let baseContent = content; 

            recognition.onstart = () => {
                 baseContent = content + (content && !content.endsWith(' ') ? ' ' : '');
            };
            
            recognition.onresult = (event) => {
                let interimTranscript = '';
                let finalTranscript = '';

                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        finalTranscript += event.results[i][0].transcript;
                    } else {
                        interimTranscript += event.results[i][0].transcript;
                    }
                }
                
                // If we have a finalized chunk, commit it to baseContent
                if (finalTranscript) {
                     baseContent += finalTranscript + ' ';
                }
                // We will use the `onresult` to just display what is being said, 
                 if (event.results[event.results.length - 1].isFinal) {
                     const newSentence = event.results[event.results.length - 1][0].transcript;
                     
                     // DIRECT TO ACTIVE FIELD
                     if (activeField === 'title') {
                         setTitle(prev => (prev + ' ' + newSentence).trim());
                     } else if (activeField === 'decision') {
                         setNewDecision(prev => (prev + ' ' + newSentence).trim());
                     } else if (activeField === 'task') {
                         setNewTask(prev => (prev + ' ' + newSentence).trim());
                     } else {
                         // Default to Content
                         setContent(prev => {
                             const prefix = prev.trim() ? prev.trim() + ' ' : '';
                             return prefix + newSentence.trim();
                         });
                     }
                 }
            };
            
            // Handle errors
            recognition.onerror = (event) => {
                console.error("Speech error", event.error);
                setListening(false);
            };

            recognition.start();
            recognitionRef.current = recognition;
            setListening(true);
        }
    };

    // AI State
    const [isAiLoading, setIsAiLoading] = useState(false);

    const handleAiExtract = async () => {
        let apiKey = localStorage.getItem('gemini_api_key');
        if (!apiKey) {
            apiKey = prompt("Google Gemini API Anahtarınızı giriniz:");
            if (apiKey) localStorage.setItem('gemini_api_key', apiKey);
            else return;
        }

        if (!content || content.length < 10) {
            alert("Analiz için en az 10 karakterlik not girmelisiniz.");
            return;
        }

        setIsAiLoading(true);
        try {
            const tasks = await extractTasksFromNotes(content, apiKey);
            
            // Add tasks one by one as if manually added
            // Using a loop to simulate individual adds, or we could bulk insert logic
            // For UI simplicity, let's just add them to the list and save
            
            const newTasksObjects = tasks.map((t, i) => ({ 
                id: Date.now() + i, 
                title: t, 
                status: 'Beklemede' 
            }));

            const updatedTasks = [...newTasksObjects, ...recentTasks];
            setRecentTasks(updatedTasks);
            
            // Persist to DB ? Ideally yes, insert to external_tasks
            for (const t of tasks) {
                await supabase.from('external_tasks').insert({
                    title: t,
                    status: 'Beklemede',
                    due_date: new Date(Date.now() + 86400000).toISOString(),
                    priority: 'Normal'
                });
            }

            // Save Note
            onSave({ 
                 ...note, 
                 title, 
                 content, 
                 duration: seconds, 
                 decisions,
                 action_items: updatedTasks.map(t => t.title)
             });

            alert(`${tasks.length} adet aksiyon bulundu ve eklendi.`);

        } catch (e) {
            alert("AI Hatası: " + e.message);
        } finally {
            setIsAiLoading(false);
        }
    };

    return (
        <div className="flex-1 flex h-full">
            {/* CENTRAL EDITOR */}
            <div className="flex-1 flex flex-col h-full bg-white dark:bg-[#020617] relative">
                
                {/* TOOLBAR */}
                <div className={cn("h-16 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between px-6 transition-all", zenMode && "opacity-0 hover:opacity-100 absolute top-0 left-0 right-0 z-50 bg-white/90 dark:bg-black/90 backdrop-blur-sm")}>
                    <div className="flex items-center gap-4">
                        <Button 
                            size="sm" 
                            onClick={handleSave} 
                            disabled={saving}
                            className={cn("gap-2 transition-all", saving ? "bg-yellow-500" : "bg-indigo-600 hover:bg-indigo-700 text-white")}
                        >
                            <Save className="w-4 h-4" />
                            {saving ? 'Kaydediliyor...' : 'Kaydet'}
                        </Button>
                        <span className="text-xs text-gray-400 font-mono hidden sm:inline-block">{format(new Date(), 'd MMMM HH:mm', { locale: tr })}</span>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Timer Pill */}
                         <div className={cn("hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full border transition-colors", timerRunning ? "bg-red-50 border-red-200 text-red-600" : "bg-gray-50 border-gray-200 text-gray-600")}>
                            <button onClick={() => setTimerRunning(!timerRunning)}>
                                {timerRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                            </button>
                            <span className="text-xs font-mono font-medium w-12 text-center">
                                {Math.floor(seconds/60)}:{String(seconds%60).padStart(2,'0')}
                            </span>
                         </div>
                        
                        <div className="w-px h-6 bg-gray-200 dark:bg-slate-800 mx-2" />

                        <Button size="icon" variant="ghost" onClick={toggleVoice} className={cn(listening && "text-red-500 animate-pulse")}>
                            {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                        </Button>
                        <Button size="icon" variant="ghost" onClick={toggleZen}>
                            <Layout className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={toggleRightRail} className={cn(showRightRail && "text-indigo-600 bg-indigo-50")}>
                            <CornerDownLeft className="w-4 h-4 flip-x" />
                        </Button>
                    </div>
                </div>

                {/* WRITING AREA */}
                <div 
                    className="flex-1 overflow-y-auto w-full max-w-4xl mx-auto px-12 py-12 cursor-text"
                    onClick={() => setActiveField('content')} // Catch-all click on background
                >
                    <input 
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        onFocus={() => setActiveField('title')}
                        onClick={(e) => { e.stopPropagation(); setActiveField('title'); }}
                        placeholder="Not Başlığı..."
                        className={cn(
                            "w-full text-4xl font-extrabold text-gray-900 dark:text-white placeholder:text-gray-300 dark:placeholder:text-slate-700 border-none focus:outline-none bg-transparent mb-8 transition-all rounded-lg px-2 -ml-2",
                            listening && activeField === 'title' && "ring-2 ring-red-500 bg-red-50/50 dark:bg-red-900/20"
                        )}
                    />
                    
                    <textarea 
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        onFocus={() => setActiveField('content')}
                        onClick={(e) => { e.stopPropagation(); setActiveField('content'); }}
                        placeholder="Buraya yazın..."
                        className={cn(
                            "w-full h-[calc(100%-8rem)] resize-none text-lg leading-loose text-gray-700 dark:text-gray-300 placeholder:text-gray-200 dark:placeholder:text-slate-800 border-none focus:outline-none bg-transparent font-serif transition-all rounded-lg p-2 -ml-2",
                            listening && activeField === 'content' && "ring-2 ring-red-500 bg-red-50/50 dark:bg-red-900/20"
                        )}
                    />
                </div>
            </div>

            {/* 3. RIGHT RAIL - UTILITIES */}
            {showRightRail && !zenMode && (
                <div className="w-80 bg-gray-50/80 dark:bg-[#0B1120] border-l border-gray-200 dark:border-slate-800 flex flex-col">
                    <div className="p-4 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between">
                         <h3 className="font-bold text-sm text-gray-700 dark:text-slate-200">Asistan</h3>
                         <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Aktif</span>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-6">
                        
                        {/* Kararlar */}
                        <div className="space-y-3">
                            <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-500">
                                <CheckCircle className="w-3.5 h-3.5" />
                                Alınan Kararlar
                            </h4>
                            <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg p-2 shadow-sm space-y-2">
                                {decisions.map((d, i) => (
                                    <div key={i} className="flex items-start gap-2 text-sm group">
                                        <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                                        <span className="flex-1 text-gray-700 dark:text-gray-300">{d}</span>
                                        <button onClick={() => removeDecision(i)} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500">
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ))}
                                <div className="flex items-center gap-2 mt-2 pt-2 border-t border-dashed border-gray-100 dark:border-slate-800">
                                    <Plus className="w-4 h-4 text-gray-400" />
                                    <input 
                                        className={cn(
                                            "w-full text-sm bg-transparent border-none focus:outline-none placeholder:text-gray-400 p-1 rounded transition-all",
                                            listening && activeField === 'decision' && "ring-2 ring-red-500 bg-red-50"
                                        )}
                                        placeholder="Yeni karar ekle... (Tıkla ve Konuş)" 
                                        value={newDecision}
                                        onFocus={() => setActiveField('decision')}
                                        onClick={() => setActiveField('decision')}
                                        onChange={(e) => setNewDecision(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleAddDecision()}
                                    />
                                </div>
                            </div>
                        </div>

                         {/* Aksiyonlar */}
                         <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-500">
                                    <Target className="w-3.5 h-3.5" />
                                    Aksiyon / Görev
                                </h4>
                                <Button 
                                    variant="ghost" 
                                    size="xs" 
                                    onClick={handleAiExtract} 
                                    disabled={isAiLoading || !content.trim()}
                                    className="h-6 text-[10px] text-indigo-600 hover:bg-indigo-50"
                                >
                                    {isAiLoading ? <Loader2 className="w-3 h-3 animate-spin mr-1"/> : <Zap className="w-3 h-3 mr-1" />}
                                    AI ile Bul
                                </Button>
                            </div>
                            
                            <div className="flex gap-2">
                                <input 
                                    className={cn(
                                        "flex-1 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:border-indigo-500 transition-all",
                                        listening && activeField === 'task' && "ring-2 ring-red-500"
                                    )}
                                    placeholder="Görev ekle... (Tıkla ve Konuş)" 
                                    value={newTask}
                                    onFocus={() => setActiveField('task')}
                                    onClick={() => setActiveField('task')}
                                    onChange={(e) => setNewTask(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleCreateTask()}
                                />
                                <Button size="sm" className="bg-indigo-600 text-white" onClick={handleCreateTask}>
                                    <Plus className="w-3 h-3" />
                                </Button>
                            </div>
                            
                            {/* Task List */}
                            <div className="space-y-2 mt-2">
                                {recentTasks.map((t, i) => (
                                    <div key={i} className="flex items-center gap-2 text-xs text-gray-600 dark:text-slate-400 bg-white dark:bg-slate-900 p-2 rounded border border-gray-100 dark:border-slate-800 animate-in fade-in slide-in-from-top-1">
                                        <div className="w-4 h-4 rounded-full border border-orange-200 bg-orange-50 flex items-center justify-center">
                                            <div className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                                        </div>
                                        <span className="truncate">{t.title}</span>
                                    </div>
                                ))}
                                {recentTasks.length === 0 && (
                                    <p className="text-[10px] text-gray-400 italic px-1">Bu toplantıdan henüz görev oluşturulmadı.</p>
                                )}
                            </div>
                        </div>

                        {/* Calendar Snippet */}
                        <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-900/40">
                             <div className="text-xs font-bold text-indigo-800 dark:text-indigo-300 mb-2 flex items-center gap-2">
                                 <Calendar className="w-3 h-3" />
                                 Takvim Senkronu
                             </div>
                             <p className="text-[10px] text-indigo-600/80 dark:text-indigo-300/70">
                                 Şu an yaklaşan bir toplantı bulunamadı.
                             </p>
                        </div>

                    </div>
                    
                    <div className="p-4 border-t border-gray-200 dark:border-slate-800">
                        <Button className="w-full bg-black dark:bg-white text-white dark:text-black gap-2 hover:bg-gray-800 transition-colors" size="sm" onClick={copySummary}>
                            <Share2 className="w-3 h-3" />
                            Özeti Paylaş
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
