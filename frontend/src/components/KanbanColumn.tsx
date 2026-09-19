import React, { useState } from 'react';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import type { KanbanColumnDef, Project, ProjectStatus } from '../types/database';
import { ProjectCard } from './ProjectCard';
import { cn, formatCurrency } from '../lib/utils';
import { ChevronRight, Minimize2, Maximize2 } from 'lucide-react';

interface KanbanColumnProps {
  column: KanbanColumnDef;
  projects: Project[];
  onProjectClick?: (project: Project) => void;
  onDeleteProject?: (projectId: string) => void;
  onStatusChange?: (projectId: string, newStatus: ProjectStatus) => void;
  isGlobalExpanded?: boolean;
}

export function KanbanColumn({
  column,
  projects,
  onProjectClick,
  onDeleteProject,
  onStatusChange,
  isGlobalExpanded = false,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: {
      type: 'Column',
      column,
    },
  });

  // Local expand state: auto-expand if has projects, if dragging over, or if globally expanded
  const [isManuallyExpanded, setIsManuallyExpanded] = useState<boolean | null>(null);

  const isExpanded =
    isOver ||
    (isManuallyExpanded !== null
      ? isManuallyExpanded
      : (isGlobalExpanded || projects.length > 0));

  const totalValue = projects.reduce((acc, p) => acc + (Number(p.valor_consultoria) || 0), 0);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col h-full max-h-[calc(100vh-190px)] transition-all duration-300 ease-in-out select-none",
        isExpanded
          ? "w-80 min-w-[310px] max-w-[340px] gap-3"
          : "w-16 min-w-[64px] max-w-[64px] cursor-pointer hover:bg-slate-100/90 rounded-2xl border border-slate-200 bg-white/70 p-2.5 items-center shadow-xs"
      )}
      onClick={() => {
        if (!isExpanded) {
          setIsManuallyExpanded(true);
        }
      }}
    >
      {/* Expanded Column View */}
      {isExpanded ? (
        <>
          {/* Column Header Horizontal */}
          <div className="flex items-center justify-between p-1 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <div className={cn("h-3 w-3 rounded-full shadow-sm shrink-0", column.color)} />
              <h2 className="font-semibold text-slate-700 text-sm tracking-tight truncate">{column.title}</h2>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {totalValue > 0 && (
                <span 
                  className="flex h-6 items-center rounded-full bg-emerald-50 border border-emerald-300 text-emerald-800 px-2 text-[11px] font-bold shadow-2xs whitespace-nowrap"
                  title={`Soma total dos contratos nesta etapa: ${formatCurrency(totalValue)}`}
                >
                  {formatCurrency(totalValue)}
                </span>
              )}
              <span className="flex h-6 min-w-[24px] items-center justify-center rounded-full bg-slate-100 px-2 text-xs font-semibold text-slate-500">
                {projects.length}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsManuallyExpanded(false);
                }}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
                title="Recolher coluna para modo vertical (ganhar espaço na tela)"
              >
                <Minimize2 size={13} />
              </button>
            </div>
          </div>

          {/* Column Body / Droppable Area */}
          <div
            className={cn(
              "flex flex-1 flex-col gap-3 rounded-2xl bg-slate-100/50 p-3 min-h-[150px] overflow-y-auto transition-colors border-2",
              isOver ? "border-primary/40 bg-primary/10 shadow-inner" : "border-transparent"
            )}
          >
            <SortableContext items={projects.map((p) => p.id)} strategy={verticalListSortingStrategy}>
              {projects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onClick={onProjectClick}
                  onDelete={onDeleteProject}
                  onStatusChange={onStatusChange}
                />
              ))}
            </SortableContext>
            
            {projects.length === 0 && (
              <div className="flex h-full items-center justify-center text-xs font-medium text-slate-400 border-2 border-dashed border-slate-200 rounded-xl p-4 text-center">
                Solte um contrato aqui
              </div>
            )}
          </div>
        </>
      ) : (
        /* Collapsed Column View (Vertical Indicator Header) */
        <div className="flex flex-col items-center justify-between h-full w-full py-1">
          {/* Top: Color Dot & Count */}
          <div className="flex flex-col items-center gap-1.5 pt-1">
            <div className={cn("h-3.5 w-3.5 rounded-full shadow-xs ring-2 ring-white", column.color)} />
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 border border-slate-200 text-[11px] font-bold text-slate-700 shadow-2xs">
              {projects.length}
            </span>
            {totalValue > 0 && (
              <span 
                className="text-[9px] font-extrabold text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded border border-emerald-200 truncate max-w-[56px] text-center"
                title={`Valor total: ${formatCurrency(totalValue)}`}
              >
                {totalValue >= 1000 ? `${(totalValue / 1000).toFixed(0)}k` : totalValue}
              </span>
            )}
          </div>

          {/* Middle: Vertical Title (Status na Vertical) */}
          <div
            className="flex-1 flex items-center justify-center my-4 cursor-pointer"
            title={`${column.title} (${projects.length}) - Clique para expandir`}
          >
            <span
              className="font-bold text-xs text-slate-600 tracking-wider whitespace-nowrap uppercase select-none"
              style={{
                writingMode: 'vertical-rl',
                transform: 'rotate(180deg)',
              }}
            >
              {column.title}
            </span>
          </div>

          {/* Bottom: Expand Icon */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsManuallyExpanded(true);
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
            title="Expandir esta coluna"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
