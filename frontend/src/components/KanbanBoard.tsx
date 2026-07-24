import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, SlidersHorizontal, Plus } from 'lucide-react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { KanbanColumn } from './KanbanColumn';
import { ProjectCard } from './ProjectCard';
import { ProjectDetailsPanel } from './ProjectDetailsPanel';
import { NewProjectModal } from './NewProjectModal';
import { supabase } from '../lib/supabase';
import { KANBAN_COLUMNS, type Project, type ProjectStatus } from '../types/database';

const DEMO_PROJECTS: Project[] = [
  {
    id: 'demo-1',
    consultor_id: 'admin-1',
    codigo_rae: 'RAE-2026-0891',
    status: 'novo_contrato',
    nome_cliente: 'Metalúrgica Inovação & Soluções',
    razao_social: 'Inovação Metalúrgica LTDA',
    nome_fantasia: 'Inovação Metal',
    cnpj: '45.123.890/0001-44',
    cpf: null,
    telefone: '(11) 3456-7890',
    celular: '(11) 98765-4321',
    email_cliente: 'diretoria@inovacaometal.com.br',
    municipio: 'São Paulo',
    estado: 'SP',
    endereco: 'Rua Industrial, 1200 - Dist. Industrial',
    programa: 'Sebrae Mais',
    solucao_contratada: 'Consultoria em Gestão Financeira e DRE',
    objetivo_atendimento: 'Mapeamento de custos operacionais e margem de contribuição',
    horas_contratadas: 30,
    horas_realizadas: 0,
    data_prevista_inicio: '2026-08-01',
    data_prevista_fim: '2026-09-15',
    modalidade: 'Presencial',
    valor_consultoria: 4500,
    observacoes: 'Ordem de serviço capturada via e-mail',
    dados_extra: {},
    criado_em: new Date().toISOString(),
    atualizado_em: new Date().toISOString(),
  },
  {
    id: 'demo-2',
    consultor_id: 'admin-1',
    codigo_rae: 'RAE-2026-0942',
    status: 'contato_inicial',
    nome_cliente: 'Empório & Alimentos Vila Rica',
    razao_social: 'Vila Rica Alimentos EIRELI',
    nome_fantasia: 'Empório Vila Rica',
    cnpj: '18.990.112/0001-88',
    cpf: null,
    telefone: '(19) 3211-9988',
    celular: '(19) 99123-8877',
    email_cliente: 'contato@vilarica.com.br',
    municipio: 'Campinas',
    estado: 'SP',
    endereco: 'Av. Brasil, 450 - Centro',
    programa: 'Brasil Mais',
    solucao_contratada: 'Consultoria de Processos e Eficiência Energetica',
    objetivo_atendimento: 'Redução de desperdício e reorganização de estoque',
    horas_contratadas: 24,
    horas_realizadas: 4,
    data_prevista_inicio: '2026-08-05',
    data_prevista_fim: '2026-08-30',
    modalidade: 'Híbrido',
    valor_consultoria: 3200,
    observacoes: 'Primeiro contato agendado com o gestor de compras',
    dados_extra: {},
    criado_em: new Date().toISOString(),
    atualizado_em: new Date().toISOString(),
  },
  {
    id: 'demo-3',
    consultor_id: 'admin-1',
    codigo_rae: 'RAE-2026-0410',
    status: 'atendimento_realizado',
    nome_cliente: 'Tecnologia AgroSistemas',
    razao_social: 'AgroSistemas Tecnologia SA',
    nome_fantasia: 'AgroSistemas',
    cnpj: '73.441.200/0001-55',
    cpf: null,
    telefone: '(16) 3300-1122',
    celular: '(16) 98111-2233',
    email_cliente: 'suporte@agrosistemas.com.br',
    municipio: 'Ribeirão Preto',
    estado: 'SP',
    endereco: 'Rod. Anhanguera, Km 302',
    programa: 'Sebraetec',
    solucao_contratada: 'Inovação e Mapeamento Tecnológico',
    objetivo_atendimento: 'Implementação de processos automatizados no campo',
    horas_contratadas: 40,
    horas_realizadas: 40,
    data_prevista_inicio: '2026-07-10',
    data_prevista_fim: '2026-07-22',
    modalidade: 'Presencial',
    valor_consultoria: 6800,
    observacoes: 'Atendimento presencial concluído',
    dados_extra: {},
    criado_em: new Date().toISOString(),
    atualizado_em: new Date().toISOString(),
  }
];

export function KanbanBoard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
      try {
        const { data, error } = await supabase
          .from('projetos')
          .select('*')
          .order('atualizado_em', { ascending: false });

        if (!error && data && data.length > 0) {
          setProjects(data as Project[]);
        } else {
          setProjects(DEMO_PROJECTS);
        }
      } catch (err) {
        console.warn("Usando projetos de demonstração:", err);
        setProjects(DEMO_PROJECTS);
      } finally {
        setLoading(false);
      }
    }
    loadProjects();
  }, []);

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 150,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragStart(event: DragStartEvent) {
    const { active } = event;
    const project = projects.find((p) => p.id === active.id);
    if (project) setActiveProject(project);
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) return;

    const isActiveAProject = active.data.current?.type === 'Project';
    const isOverAProject = over.data.current?.type === 'Project';
    const isOverAColumn = over.data.current?.type === 'Column';

    if (!isActiveAProject) return;

    // Dropping a project over another project in a different column
    if (isOverAProject) {
      setProjects((currentProjects) => {
        const activeIndex = currentProjects.findIndex((p) => p.id === activeId);
        const overIndex = currentProjects.findIndex((p) => p.id === overId);

        if (activeIndex === -1 || overIndex === -1) return currentProjects;

        if (currentProjects[activeIndex].status !== currentProjects[overIndex].status) {
          const updated = [...currentProjects];
          updated[activeIndex] = {
            ...updated[activeIndex],
            status: currentProjects[overIndex].status,
          };
          return arrayMove(updated, activeIndex, overIndex);
        }
        return arrayMove(currentProjects, activeIndex, overIndex);
      });
    }

    // Dropping a project over an empty column
    if (isOverAColumn) {
      setProjects((currentProjects) => {
        const activeIndex = currentProjects.findIndex((p) => p.id === activeId);
        if (activeIndex === -1) return currentProjects;

        const updated = [...currentProjects];
        updated[activeIndex] = {
          ...updated[activeIndex],
          status: overId as ProjectStatus,
        };
        return arrayMove(updated, activeIndex, activeIndex);
      });
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveProject(null);
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    const currentProject = projects.find((p) => p.id === activeId);
    if (!currentProject) return;

    const targetStatus = (over.data.current?.type === 'Column'
      ? overId
      : projects.find((p) => p.id === overId)?.status) as ProjectStatus;

    if (currentProject) {
      try {
        await supabase
          .from('projetos')
          .update({ status: currentProject.status, atualizado_em: new Date().toISOString() })
          .eq('id', activeId);
      } catch (err) {
        console.error('Erro ao salvar novo status do projeto:', err);
      }
    }
  };

  const handleCreateProject = (newProject: Project) => {
    setProjects([newProject, ...projects]);
  };

  const handleProjectUpdate = (updatedProject: Project) => {
    setProjects(projects.map(p => p.id === updatedProject.id ? updatedProject : p));
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col w-full max-w-full overflow-hidden">
      
      {/* Top Action & Slider Control Bar */}
      <div className="mb-3.5 flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
        
        {/* Left: Total & Column Switcher Pills */}
        <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar flex-1 min-w-0">
          <span className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 shrink-0">
            Total: <strong>{projects.length}</strong>
          </span>

          <div className="h-4 w-[1px] bg-slate-200 shrink-0 hidden sm:block"></div>

          {/* Quick Column Switcher Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar">
            {KANBAN_COLUMNS.map((col) => {
              const count = projects.filter((p) => p.status === col.id).length;
              return (
                <button
                  key={col.id}
                  onClick={() => handleScrollToColumn(col.id)}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 flex items-center gap-1.5 shrink-0"
                >
                  <span className={`w-2 h-2 rounded-full ${col.color}`}></span>
                  <span>{col.title}</span>
                  <span className="bg-white text-slate-600 font-bold px-1.5 py-0.2 rounded text-[10px] shadow-2xs">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Deslizante Arrows + Nova Demanda */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="flex items-center gap-1 bg-purple-50 p-1 rounded-xl border border-purple-200">
            <button
              onClick={() => handleScroll('left')}
              title="Deslizar Kanban para Esquerda"
              className="p-1.5 rounded-lg hover:bg-white text-primary font-bold shadow-2xs transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-[10px] font-extrabold text-primary px-1.5 uppercase tracking-wider">Deslizar</span>
            <button
              onClick={() => handleScroll('right')}
              title="Deslizar Kanban para Direita"
              className="p-1.5 rounded-lg hover:bg-white text-primary font-bold shadow-2xs transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <button
            onClick={() => setIsNewModalOpen(true)}
            className="bg-primary hover:bg-primary-hover text-white text-xs font-bold px-4 py-2 rounded-xl shadow-md shadow-purple-500/20 transition-all flex items-center gap-1.5 shrink-0"
          >
            <Plus size={14} />
            <span>+ Nova Demanda</span>
          </button>
        </div>
      </div>

      {/* Kanban Board Container with Touch Scroll & Visible Horizontal Scrollbar */}
      <div className="flex-1 overflow-hidden relative">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div
            ref={scrollRef}
            className="flex h-full gap-5 overflow-x-auto pb-4 pt-1 snap-x snap-mandatory scroll-smooth w-full"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            {KANBAN_COLUMNS.map((col) => (
              <div key={col.id} id={`col-${col.id}`} className="snap-start shrink-0">
                <KanbanColumn
                  column={col}
                  projects={projects.filter((p) => p.status === col.id)}
                  onProjectClick={setSelectedProject}
                />
              </div>
            ))}
          </div>

          <DragOverlay>
            {activeProject ? (
              <div className="w-80 opacity-90">
                 <ProjectCard project={activeProject} isOverlay />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      <ProjectDetailsPanel 
        project={selectedProject} 
        isOpen={!!selectedProject} 
        onClose={() => setSelectedProject(null)} 
        onUpdate={handleProjectUpdate}
      />

      <NewProjectModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        onCreate={handleCreateProject}
      />
    </div>
  );
}
