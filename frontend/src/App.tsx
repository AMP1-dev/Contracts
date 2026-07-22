import React, { useState } from 'react';
import { LayoutDashboard, Users, Settings, Inbox as InboxIcon, Menu } from 'lucide-react';
import { KanbanBoard } from './components/KanbanBoard';
import { Inbox } from './components/Inbox';

type ViewState = 'kanban' | 'inbox' | 'consultores' | 'configuracoes';

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [currentView, setCurrentView] = useState<ViewState>('kanban');

  const getPageTitle = () => {
    switch (currentView) {
      case 'kanban': return 'Visão Geral - Projetos';
      case 'inbox': return 'Caixa de Entrada de Contratos';
      case 'consultores': return 'Gestão de Consultores';
      case 'configuracoes': return 'Configurações do Sistema';
      default: return '';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans text-slate-800">
      
      {/* Sidebar */}
      <aside className={`bg-white border-r border-slate-200 transition-all duration-300 ${isSidebarOpen ? 'w-64' : 'w-20'} flex flex-col h-screen sticky top-0 z-20`}>
        <div className="h-16 flex items-center px-4 border-b border-slate-200 justify-between bg-white">
          {isSidebarOpen && <span className="font-bold text-lg text-primary truncate tracking-tight">CRM Consultorias</span>}
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
            <Menu size={20} />
          </button>
        </div>
        
        <nav className="flex-1 py-6 flex flex-col gap-1.5 px-3">
          <SidebarItem 
            icon={<LayoutDashboard size={20} />} 
            label="Kanban" 
            isOpen={isSidebarOpen} 
            active={currentView === 'kanban'}
            onClick={() => setCurrentView('kanban')}
          />
          <SidebarItem 
            icon={<InboxIcon size={20} />} 
            label="Caixa de Entrada" 
            isOpen={isSidebarOpen} 
            active={currentView === 'inbox'}
            onClick={() => setCurrentView('inbox')}
            badge="Novo"
          />
          
          <div className="my-4 border-t border-slate-100"></div>
          
          <SidebarItem 
            icon={<Users size={20} />} 
            label="Consultores" 
            isOpen={isSidebarOpen} 
            active={currentView === 'consultores'}
            onClick={() => setCurrentView('consultores')}
          />
          <SidebarItem 
            icon={<Settings size={20} />} 
            label="Configurações" 
            isOpen={isSidebarOpen} 
            active={currentView === 'configuracoes'}
            onClick={() => setCurrentView('configuracoes')}
          />
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-50/50">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center px-8 shadow-sm z-10">
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">{getPageTitle()}</h1>
        </header>
        
        <div className="flex-1 p-8 overflow-hidden flex flex-col relative">
          
          {/* Subtle background decoration */}
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/3"></div>

          {currentView === 'kanban' && <KanbanBoard />}
          {currentView === 'inbox' && (
            <div className="h-full overflow-y-auto pb-10 hide-scrollbar">
              <Inbox />
            </div>
          )}
          {(currentView === 'consultores' || currentView === 'configuracoes') && (
            <div className="flex h-full items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl bg-white/50 backdrop-blur-sm">
              Em breve
            </div>
          )}
        </div>
      </main>
      
    </div>
  );
}

function SidebarItem({ icon, label, isOpen, active = false, onClick, badge }: { icon: React.ReactNode, label: string, isOpen: boolean, active?: boolean, onClick: () => void, badge?: string }) {
  return (
    <button 
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 w-full group relative overflow-hidden
      ${active ? 'bg-primary/10 text-primary font-semibold shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-medium'} 
      ${!isOpen && 'justify-center'}`} 
      title={label}
    >
      <div className={active ? 'text-primary' : 'text-slate-400 group-hover:text-slate-600 transition-colors'}>
        {icon}
      </div>
      {isOpen && (
        <span className="flex-1 text-left">{label}</span>
      )}
      {isOpen && badge && (
        <span className="bg-primary text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md">
          {badge}
        </span>
      )}
      
      {/* Active Indicator */}
      {active && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-md"></div>}
    </button>
  );
}

export default App;
