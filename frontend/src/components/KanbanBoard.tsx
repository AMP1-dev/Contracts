import { useState, useEffect } from 'react';
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
    solucao_contratada: 'Desenvolvimento de Marca e Registro de Patente',
    objetivo_atendimento: 'Adequação visual e proteção de ativos tecnológicos',
    horas_contratadas: 40,
    horas_realizadas: 40,
    data_prevista_inicio: '2026-07-01',
    data_prevista_fim: '2026-07-20',
    modalidade: 'Online',
    valor_consultoria: 5800,
    observacoes: 'Atendimento concluído, elaborando relatório final',
    dados_extra: {},
    criado_em: new Date().toISOString(),
    atualizado_em: new Date().toISOString(),
  }
];

export function KanbanBoard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  // Load projects from Supabase (with fallback demo data)
  useEffect(() => {
    async function loadProjects() {
      setLoading(true);
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

    if (targetStatus && currentProject.status !== targetStatus) {
      setProjects((currentProjects) =>
        currentProjects.map((p) =>
          p.id === activeId ? { ...p, status: targetStatus } : p
        )
      );

      // Persist to Supabase if not a demo ID
      if (!activeId.toString().startsWith('demo-')) {
        await supabase
          .from('projetos')
          .update({ status: targetStatus })
          .eq('id', activeId);
      }
    }
  }

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
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex h-full gap-6 overflow-x-auto pb-4 pt-2 hide-scrollbar">
          {KANBAN_COLUMNS.map((col) => (
            <KanbanColumn
              key={col.id}
              column={col}
              projects={projects.filter((p) => p.status === col.id)}
              onProjectClick={setSelectedProject}
            />
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

      <ProjectDetailsPanel 
        project={selectedProject} 
        isOpen={!!selectedProject} 
        onClose={() => setSelectedProject(null)} 
        onUpdate={handleProjectUpdate}
      />
    </>
  );
}
