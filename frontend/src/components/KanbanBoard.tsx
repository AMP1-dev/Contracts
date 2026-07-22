import { useState, useEffect } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
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

export function KanbanBoard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  // Load projects from Supabase
  useEffect(() => {
    async function loadProjects() {
      setLoading(true);
      const { data, error } = await supabase
        .from('projetos')
        .select('*')
        .order('atualizado_em', { ascending: false });

      if (!error && data) {
        setProjects(data as Project[]);
      }
      setLoading(false);
    }
    loadProjects();
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
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

    // Dropping a project over another project
    if (isOverAProject) {
      setProjects((projects) => {
        const activeIndex = projects.findIndex((p) => p.id === activeId);
        const overIndex = projects.findIndex((p) => p.id === overId);

        if (projects[activeIndex].status !== projects[overIndex].status) {
          const newProjects = [...projects];
          newProjects[activeIndex].status = projects[overIndex].status;
          return arrayMove(newProjects, activeIndex, overIndex);
        }
        return arrayMove(projects, activeIndex, overIndex);
      });
    }

    // Dropping a project over an empty column
    if (isOverAColumn) {
      setProjects((projects) => {
        const activeIndex = projects.findIndex((p) => p.id === activeId);
        const newProjects = [...projects];
        newProjects[activeIndex].status = overId as ProjectStatus;
        return arrayMove(newProjects, activeIndex, activeIndex);
      });
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveProject(null);
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;
    
    const activeProject = projects.find((p) => p.id === activeId);
    if (!activeProject) return;

    const targetStatus = over.data.current?.type === 'Column' 
      ? overId 
      : projects.find((p) => p.id === overId)?.status;

    if (targetStatus && activeProject.status !== targetStatus) {
      // Optimitic update already happened in DragOver. 
      // Now we persist to Supabase.
      await supabase
        .from('projetos')
        .update({ status: targetStatus })
        .eq('id', activeId);
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
