import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Building2, FileText, GripVertical } from 'lucide-react';
import type { Project } from '../types/database';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ProjectCardProps {
  project: Project;
  isOverlay?: boolean;
  onClick?: (project: Project) => void;
}

export function ProjectCard({ project, isOverlay, onClick }: ProjectCardProps) {
  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: project.id,
    data: {
      type: 'Project',
      project,
    },
  });

  const style = {
    transition,
    transform: CSS.Transform.toString(transform),
  };

  const formattedDate = format(new Date(project.criado_em), "dd MMM, yyyy", { locale: ptBR });

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        touchAction: 'none',
      }}
      className={cn(
        "group relative flex flex-col gap-3 rounded-xl border bg-white p-4 text-left shadow-sm transition-all hover:shadow-md hover:border-primary/50 select-none",
        isDragging && "opacity-30 border-primary shadow-xl scale-105",
        isOverlay && "cursor-grabbing opacity-100 shadow-2xl scale-105 rotate-2 border-primary/50 ring-2 ring-primary/20",
        !isOverlay && "cursor-grab active:cursor-grabbing"
      )}
      {...attributes}
      {...listeners}
      onClick={(e) => {
        if (!isDragging && onClick) {
          onClick(project);
        }
      }}
    >
      <div className="flex flex-col gap-1.5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-bold text-slate-800 text-sm leading-tight line-clamp-2">
            {project.nome_cliente || 'Cliente Sem Nome'}
          </h3>
          <div className="text-slate-400 opacity-60 group-hover:opacity-100 transition-opacity hover:text-slate-600 shrink-0">
            <GripVertical size={16} />
          </div>
        </div>

        {/* Tags / Badges (Produto Aplicado & Modalidade) */}
        <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
          {project.programa && (
            <span className="bg-purple-100 text-purple-800 border border-purple-200 text-[10px] font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider">
              {project.programa}
            </span>
          )}
          {project.modalidade && (
            <span className={cn(
              "text-[10px] font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider border",
              project.modalidade.toLowerCase() === 'remoto' && "bg-emerald-50 text-emerald-700 border-emerald-200",
              project.modalidade.toLowerCase() === 'presencial' && "bg-amber-50 text-amber-700 border-amber-200",
              project.modalidade.toLowerCase() === 'híbrido' && "bg-blue-50 text-blue-700 border-blue-200"
            )}>
              {project.modalidade}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1.5 mt-1">
        {project.cnpj && (
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <Building2 size={14} className="text-slate-400 shrink-0" />
            <span className="truncate">{project.cnpj}</span>
          </div>
        )}
        {project.codigo_rae && (
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <FileText size={14} className="text-slate-400 shrink-0" />
            <span className="truncate bg-slate-100 px-1.5 py-0.5 rounded-md text-slate-700 font-semibold">
              {project.codigo_rae}
            </span>
          </div>
        )}
      </div>

      <div className="mt-2 flex items-center justify-between pt-3 border-t border-slate-100">
        <span className="text-[11px] font-medium text-slate-400 bg-slate-50 px-2 py-1 rounded-md">
          {formattedDate}
        </span>
        <span className="text-xs font-black text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
          {project.valor_consultoria !== undefined && project.valor_consultoria !== null
            ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(project.valor_consultoria)
            : 'R$ 0,00'}
        </span>
      </div>
    </div>
  );
}
