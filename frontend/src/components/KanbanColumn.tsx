import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import type { KanbanColumnDef, Project } from '../types/database';
import { ProjectCard } from './ProjectCard';
import { cn } from '../lib/utils';

interface KanbanColumnProps {
  column: KanbanColumnDef;
  projects: Project[];
  onProjectClick?: (project: Project) => void;
}

export function KanbanColumn({ column, projects, onProjectClick }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: {
      type: 'Column',
      column,
    },
  });

  return (
    <div className="flex w-80 min-w-[320px] flex-col gap-3">
      {/* Column Header */}
      <div className="flex items-center justify-between p-1">
        <div className="flex items-center gap-2">
          <div className={cn("h-3 w-3 rounded-full shadow-sm", column.color)} />
          <h2 className="font-semibold text-slate-700 text-sm tracking-tight">{column.title}</h2>
        </div>
        <span className="flex h-6 min-w-[24px] items-center justify-center rounded-full bg-slate-100 px-2 text-xs font-semibold text-slate-500">
          {projects.length}
        </span>
      </div>

      {/* Column Body / Droppable Area */}
      <div
        ref={setNodeRef}
        className={cn(
          "flex flex-1 flex-col gap-3 rounded-2xl bg-slate-100/50 p-3 min-h-[150px] transition-colors border-2",
          isOver ? "border-primary/20 bg-primary/5" : "border-transparent"
        )}
      >
        <SortableContext items={projects.map((p) => p.id)} strategy={verticalListSortingStrategy}>
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} onClick={onProjectClick} />
          ))}
        </SortableContext>
        
        {projects.length === 0 && (
          <div className="flex h-full items-center justify-center text-sm font-medium text-slate-400 border-2 border-dashed border-slate-200 rounded-xl p-4 text-center">
            Arraste um contrato para cá
          </div>
        )}
      </div>
    </div>
  );
}
