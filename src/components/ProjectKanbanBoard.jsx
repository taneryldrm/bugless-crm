import React, { useState } from 'react';
import { 
  DndContext, 
  closestCorners, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors, 
  DragOverlay 
} from '@dnd-kit/core';
import { 
  arrayMove, 
  SortableContext, 
  sortableKeyboardCoordinates, 
  verticalListSortingStrategy 
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import { Briefcase, Calendar, MoreVertical } from 'lucide-react';
import { format } from 'date-fns';

const COLUMNS = [
  { id: 'Beklemede', title: 'Beklemede', color: 'bg-slate-100 dark:bg-slate-800' },
  { id: 'Planlama', title: 'Planlama', color: 'bg-indigo-50 dark:bg-indigo-900/10' },
  { id: 'Devam Ediyor', title: 'Devam Ediyor', color: 'bg-amber-50 dark:bg-amber-900/10' },
  { id: 'Tamamlandı', title: 'Tamamlandı', color: 'bg-emerald-50 dark:bg-emerald-900/10' }
];

function SortableItem({ project, onClick }) {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging
    } = useSortable({ id: project.id, data: { ...project } });
  
    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
    };
  
    return (
      <div 
         ref={setNodeRef} 
         style={style} 
         {...attributes} 
         {...listeners}
         onClick={onClick}
         className={cn(
             "bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm cursor-grab active:cursor-grabbing hover:border-violet-300 dark:hover:border-violet-700 transition-colors group relative",
             isDragging && "opacity-50"
         )}
      >
          <div className="flex justify-between items-start mb-2">
              <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">
                  {project.customer?.slice(0, 15)}
              </span>
              <button className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded">
                  <MoreVertical className="w-3 h-3 text-slate-400" />
              </button>
          </div>
          <h4 className="font-bold text-slate-900 dark:text-white text-sm mb-3 leading-snug">
              {project.name}
          </h4>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-50 dark:border-slate-800">
               {project.end_date ? (
                   <div className={cn(
                       "flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded bg-slate-50 dark:bg-slate-800 text-slate-500",
                       new Date(project.end_date) < new Date() && project.status !== 'Tamamlandı' && "bg-red-50 text-red-600"
                   )}>
                       <Calendar className="w-3 h-3" />
                       {format(new Date(project.end_date), 'd MMM')}
                   </div>
               ) : <span />}
               
               {project.price > 0 && (
                   <span className="text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                       ₺{project.price.toLocaleString()}
                   </span>
               )}
          </div>
      </div>
    );
}

export function ProjectKanbanBoard({ projects, onDragEnd, onProjectClick }) {
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
          coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const [activeId, setActiveId] = useState(null);

    const handleDragStart = (event) => {
        setActiveId(event.active.id);
    };

    const handleDragEndInternal = (event) => {
        setActiveId(null);
        onDragEnd(event);
    };

    return (
        <DndContext 
          sensors={sensors} 
          collisionDetection={closestCorners} 
          onDragStart={handleDragStart}
          onDragEnd={handleDragEndInternal}
        >
            <div className="flex h-full gap-4 overflow-x-auto pb-4 items-start">
                {COLUMNS.map(col => {
                    const colProjects = projects.filter(p => {
                        // Normalize status
                        const s = p.status === 'Hazırlık' ? 'Planlama' : p.status;
                        return s === col.id;
                    });
                    
                    return (
                        <div key={col.id} className="flex-shrink-0 w-80 flex flex-col gap-3">
                            {/* Column Header */}
                            <div className="flex items-center justify-between px-1">
                                <h3 className="font-bold text-slate-700 dark:text-slate-300 text-sm flex items-center gap-2">
                                    <span className={cn("w-2 h-2 rounded-full", 
                                        col.id === 'Devam Ediyor' ? 'bg-amber-500' :
                                        col.id === 'Tamamlandı' ? 'bg-emerald-500' :
                                        col.id === 'Planlama' ? 'bg-indigo-500' : 'bg-slate-400'
                                    )} />
                                    {col.title}
                                    <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 text-xs px-2 py-0.5 rounded-full ml-1">
                                        {colProjects.length}
                                    </span>
                                </h3>
                            </div>

                            {/* Column Body */}
                            <div className={cn("flex-1 rounded-2xl p-3 min-h-[500px]", col.color)}>
                                <SortableContext 
                                  items={colProjects.map(p => p.id)} 
                                  strategy={verticalListSortingStrategy}
                                >
                                    <div className="flex flex-col gap-3">
                                        {colProjects.map(project => (
                                            <SortableItem 
                                              key={project.id} 
                                              project={project} 
                                              onClick={() => onProjectClick(project)} 
                                            />
                                        ))}
                                    </div>
                                </SortableContext>
                                {colProjects.length === 0 && (
                                    <div className="h-full flex items-center justify-center text-slate-400/50 text-sm font-medium italic">
                                        Boş
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Drag Overlay (Visual candy while dragging) */}
            <DragOverlay>
                {activeId ? (
                   <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border-2 border-violet-500 shadow-xl rotate-3 cursor-grabbing opacity-90 scale-105">
                       {/* Simplified Project Card for Overlay */}
                       <div className="h-4 w-20 bg-slate-100 rounded mb-2" />
                       <div className="h-4 w-32 bg-slate-200 rounded" />
                   </div>
                ) : null}
            </DragOverlay>
        </DndContext>
    );
}
