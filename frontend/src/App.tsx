import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Users, Settings, Inbox as InboxIcon, Menu, LogOut, User as UserIcon, ShieldCheck } from 'lucide-react';
import { KanbanBoard } from './components/KanbanBoard';
import { Inbox } from './components/Inbox';
import { Login } from './components/Login';
import { Register } from './components/Register';
import { SettingsPanel } from './components/SettingsPanel';
import type { UserSession, CompanyConfig } from './types/database';

type ViewState = 'kanban' | 'inbox' | 'consultores' | 'configuracoes';
type AuthState = 'authenticated' | 'login' | 'register';

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [currentView, setCurrentView] = useState<ViewState>('kanban');

  // Auth & Storage state
  const [authState, setAuthState] = useState<AuthState>(() => {
    const saved = localStorage.getItem('amp_auth_session');
    return saved ? 'authenticated' : 'login';
  });

  const [session, setSession] = useState<UserSession | null>(() => {
    const saved = localStorage.getItem('amp_auth_session');
    return saved ? JSON.parse(saved) : null;
  });

  const [adminPassword, setAdminPassword] = useState<string>(() => {
    return localStorage.getItem('amp_admin_password') || '1234';
  });

  const [companyConfig, setCompanyConfig] = useState<CompanyConfig>(() => {
    const saved = localStorage.getItem('amp_company_config');
    return saved
      ? JSON.parse(saved)
      : {
          logoUrl: null,
          companyName: 'CRM Consultorias',
          primaryColor: '#aa3bff',
          adminEmail: 'suporte@amp.ia.br',
        };
  });

  // Save session changes
  useEffect(() => {
    if (session) {
      localStorage.setItem('amp_auth_session', JSON.stringify(session));
    } else {
      localStorage.removeItem('amp_auth_session');
    }
  }, [session]);

  // Save config changes
  const handleUpdateConfig = (newConfig: CompanyConfig) => {
    setCompanyConfig(newConfig);
    localStorage.setItem('amp_company_config', JSON.stringify(newConfig));
  };

  // Check password
  const checkPassword = (inputPass: string) => {
    return inputPass === adminPassword;
  };

  // Change password
  const handleChangePassword = (newPass: string) => {
    setAdminPassword(newPass);
    localStorage.setItem('amp_admin_password', newPass);
    return true;
  };

  // Handle Login
  const handleLoginSuccess = (newSession: UserSession) => {
    setSession(newSession);
    setAuthState('authenticated');
  };

  // Handle Registration Success (Trial 40 days)
  const handleRegisterSuccess = (newSession: UserSession, newPass?: string) => {
    if (newPass) {
      setAdminPassword(newPass);
      localStorage.setItem('amp_admin_password', newPass);
    }
    setCompanyConfig((prev) => ({
      ...prev,
      adminEmail: newSession.email,
    }));
    setSession(newSession);
    setAuthState('authenticated');
  };

  // Logout
  const handleLogout = () => {
    setSession(null);
    setAuthState('login');
  };

  const getPageTitle = () => {
    switch (currentView) {
      case 'kanban':
        return 'Visão Geral - Projetos';
      case 'inbox':
        return 'Caixa de Entrada de Contratos';
      case 'consultores':
        return 'Gestão de Consultores';
      case 'configuracoes':
        return 'Configurações do Sistema';
      default:
        return '';
    }
  };

  // Unauthenticated Views
  if (authState === 'login') {
    return (
      <Login
        onLogin={handleLoginSuccess}
        onGoToRegister={() => setAuthState('register')}
        adminEmail={companyConfig.adminEmail}
        checkPassword={checkPassword}
      />
    );
  }

  if (authState === 'register') {
    return (
      <Register
        onRegisterSuccess={handleRegisterSuccess}
        onBackToLogin={() => setAuthState('login')}
      />
    );
  }

  // Authenticated Dashboard Layout
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans text-slate-800">
      {/* Sidebar */}
      <aside
        className={`bg-white border-r border-slate-200 transition-all duration-300 ${
          isSidebarOpen ? 'w-64' : 'w-20'
        } flex flex-col h-screen sticky top-0 z-20`}
      >
        <div className="h-16 flex items-center px-4 border-b border-slate-200 justify-between bg-white">
          {isSidebarOpen ? (
            <div className="flex items-center gap-2.5 overflow-hidden">
              {companyConfig.logoUrl ? (
                <img
                  src={companyConfig.logoUrl}
                  alt="Logo"
                  className="h-8 max-w-[120px] object-contain"
                />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                  <ShieldCheck size={18} className="text-primary" />
                </div>
              )}
              <span className="font-bold text-base text-slate-900 truncate tracking-tight">
                {companyConfig.companyName}
              </span>
            </div>
          ) : (
            <div className="w-full flex justify-center">
              {companyConfig.logoUrl ? (
                <img
                  src={companyConfig.logoUrl}
                  alt="Logo"
                  className="h-7 w-7 object-contain"
                />
              ) : (
                <ShieldCheck size={20} className="text-primary" />
              )}
            </div>
          )}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
          >
            <Menu size={18} />
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

          <div className="my-3 border-t border-slate-100"></div>

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

        {/* User Footer in Sidebar */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/50">
          <div
            className={`flex items-center gap-3 p-2 rounded-xl bg-white border border-slate-200/80 shadow-xs ${
              !isSidebarOpen && 'justify-center'
            }`}
          >
            <div className="w-8 h-8 rounded-lg bg-purple-100 text-primary font-bold flex items-center justify-center shrink-0 text-xs">
              <UserIcon size={16} />
            </div>
            {isSidebarOpen && (
              <div className="flex-1 overflow-hidden">
                <p className="text-xs font-bold text-slate-800 truncate">
                  {session?.name || 'Administrador'}
                </p>
                <p className="text-[10px] text-slate-500 truncate">{session?.email}</p>
              </div>
            )}
            {isSidebarOpen && (
              <button
                onClick={handleLogout}
                title="Sair do Sistema"
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
              >
                <LogOut size={16} />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-50/50">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shadow-xs z-10">
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">
            {getPageTitle()}
          </h1>

          {/* Trial & User Quick Status Badge */}
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 bg-purple-50 text-primary border border-purple-200 text-xs font-bold rounded-full">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Teste Grátis (40 dias)</span>
            </span>

            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-rose-600 bg-slate-100 hover:bg-rose-50 px-3 py-1.5 rounded-lg transition-colors border border-slate-200"
            >
              <LogOut size={14} />
              <span>Sair</span>
            </button>
          </div>
        </header>

        <div className="flex-1 p-6 md:p-8 overflow-hidden flex flex-col relative">
          {/* Subtle background decoration */}
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/3"></div>

          {currentView === 'kanban' && <KanbanBoard />}
          {currentView === 'inbox' && (
            <div className="h-full overflow-y-auto pb-10 hide-scrollbar">
              <Inbox />
            </div>
          )}
          {currentView === 'configuracoes' && session && (
            <SettingsPanel
              config={companyConfig}
              onUpdateConfig={handleUpdateConfig}
              currentUser={session}
              onChangePassword={handleChangePassword}
            />
          )}
          {currentView === 'consultores' && (
            <div className="flex h-full items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl bg-white/50 backdrop-blur-sm">
              Gestão de Consultores - Em breve
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function SidebarItem({
  icon,
  label,
  isOpen,
  active = false,
  onClick,
  badge,
}: {
  icon: React.ReactNode;
  label: string;
  isOpen: boolean;
  active?: boolean;
  onClick: () => void;
  badge?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 w-full group relative overflow-hidden
      ${
        active
          ? 'bg-primary/10 text-primary font-semibold shadow-xs'
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-medium'
      } 
      ${!isOpen && 'justify-center'}`}
      title={label}
    >
      <div
        className={
          active
            ? 'text-primary'
            : 'text-slate-400 group-hover:text-slate-600 transition-colors'
        }
      >
        {icon}
      </div>
      {isOpen && <span className="flex-1 text-left">{label}</span>}
      {isOpen && badge && (
        <span className="bg-primary text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md">
          {badge}
        </span>
      )}

      {/* Active Indicator */}
      {active && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-md"></div>
      )}
    </button>
  );
}

export default App;
