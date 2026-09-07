import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in component tree:', error, errorInfo);
  }

  private handleReset = () => {
    try {
      localStorage.removeItem('amp_projects');
      localStorage.removeItem('amp_auth_session');
      localStorage.removeItem('amp_company_config');
    } catch (e) {}
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-6 font-sans">
          <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-3xl p-8 text-center shadow-2xl">
            <div className="w-16 h-16 bg-rose-500/20 border border-rose-500/40 rounded-2xl flex items-center justify-center mx-auto mb-4 text-rose-400">
              <AlertTriangle size={32} />
            </div>
            <h2 className="text-xl font-bold mb-2">Recuperação do Sistema</h2>
            <p className="text-sm text-slate-400 mb-6">
              Ocorreu uma instabilidade no carregamento inicial. Clique no botão abaixo para restaurar o ambiente limpo.
            </p>
            <button
              onClick={this.handleReset}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-600/30"
            >
              <RefreshCw size={18} />
              <span>Restaurar e Abrir Kanban</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
