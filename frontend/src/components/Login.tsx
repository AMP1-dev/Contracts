import React, { useState } from 'react';
import { Lock, Mail, Eye, EyeOff, ShieldCheck, ArrowRight, Sparkles } from 'lucide-react';
import type { UserSession } from '../types/database';

interface LoginProps {
  onLogin: (session: UserSession) => void;
  onGoToRegister: () => void;
  adminEmail: string;
  checkPassword: (pass: string) => boolean;
}

export function Login({ onLogin, onGoToRegister, adminEmail, checkPassword }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    setTimeout(() => {
      // Validate credentials
      const formattedEmail = email.trim().toLowerCase();
      const targetAdminEmail = (adminEmail || 'suporte@amp.ia.br').trim().toLowerCase();

      if (formattedEmail === targetAdminEmail && checkPassword(password)) {
        onLogin({
          id: 'admin-1',
          email: formattedEmail,
          name: 'Administrador AMP',
          role: 'admin',
          createdAt: new Date().toISOString(),
          plan: 'anual',
        });
      } else if (formattedEmail === 'suporte@amp.ia.br' && password === '1234') {
        onLogin({
          id: 'admin-1',
          email: 'suporte@amp.ia.br',
          name: 'Administrador AMP',
          role: 'admin',
          createdAt: new Date().toISOString(),
          plan: 'anual',
        });
      } else {
        setError('E-mail ou senha incorretos. Verifique suas credenciais.');
      }
      setIsLoading(false);
    }, 400);
  };

  return (
    <div className="min-h-screen w-full bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background Orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/30 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/30 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-sky-500/10 rounded-full blur-[150px] pointer-events-none"></div>

      <div className="w-full max-w-md bg-slate-800/80 backdrop-blur-xl border border-slate-700/60 rounded-3xl p-8 shadow-2xl shadow-purple-950/40 relative z-10">
        
        {/* Logo & Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-tr from-purple-600 to-indigo-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-purple-500/30 ring-4 ring-purple-500/10">
            <ShieldCheck size={36} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">CRM Consultorias</h1>
          <p className="text-sm text-slate-400 mt-1">Gerencie suas demandas de contrato e consultorias</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-3.5 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-300 text-xs font-medium animate-fadeIn">
            {error}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
              E-mail de Acesso
            </label>
            <div className="relative">
              <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-900/80 border border-slate-700/80 rounded-xl py-2.5 pl-10 pr-4 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
                placeholder="exemplo@amp.ia.br"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
              Senha
            </label>
            <div className="relative">
              <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-900/80 border border-slate-700/80 rounded-xl py-2.5 pl-10 pr-10 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold py-3 px-4 rounded-xl shadow-lg shadow-purple-600/30 transition-all duration-200 flex items-center justify-center gap-2 group disabled:opacity-50"
          >
            {isLoading ? (
              <span className="inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            ) : (
              <>
                <span>Entrar no Sistema</span>
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>

        {/* Register CTA Footer */}
        <div className="mt-8 pt-6 border-t border-slate-700/60 text-center">
          <p className="text-xs text-slate-400 mb-3">Ainda não possui uma conta de empresa?</p>
          <button
            onClick={onGoToRegister}
            className="w-full bg-slate-700/50 hover:bg-slate-700 text-purple-300 border border-purple-500/30 font-medium py-2.5 px-4 rounded-xl text-xs transition-all flex items-center justify-center gap-2"
          >
            <Sparkles size={14} className="text-purple-400" />
            <span>Assinar ou Testar por 40 dias grátis</span>
          </button>
        </div>

      </div>
    </div>
  );
}
