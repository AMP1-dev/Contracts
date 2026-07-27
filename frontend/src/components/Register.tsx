import React, { useState } from 'react';
import { CheckCircle2, ArrowLeft, Sparkles, Building, User, Mail, Phone, Lock } from 'lucide-react';
import type { UserSession } from '../types/database';

interface RegisterProps {
  onRegisterSuccess: (session: UserSession, newPassword?: string) => void;
  onBackToLogin: () => void;
}

export function Register({ onRegisterSuccess, onBackToLogin }: RegisterProps) {
  const [billingCycle, setBillingCycle] = useState<'mensal' | 'anual'>('anual');
  const [companyName, setCompanyName] = useState('');
  const [adminName, setAdminName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    setTimeout(() => {
      const now = new Date().toISOString();
      const session: UserSession = {
        id: `user-${Date.now()}`,
        email: email.trim().toLowerCase(),
        name: adminName || 'Administrador',
        companyName: companyName || 'AMP Consultorias',
        role: 'admin',
        createdAt: now,
        plan: 'promocional_ano1',
        priceMonthly: 49.90,
        regularPriceMonthly: 99.90,
        termsAccepted: false, // Pop-up obrigatório de aceite no 1º acesso
        subscriptionStatus: 'ativo',
      };

      onRegisterSuccess(session, password);
      setIsLoading(false);
    }, 600);
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 flex flex-col items-center justify-center p-4 md:p-8 font-sans relative overflow-x-hidden">
      
      {/* Background Glow Effects */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[140px] pointer-events-none"></div>
      <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[140px] pointer-events-none"></div>

      <div className="w-full max-w-4xl relative z-10">
        
        {/* Back Button */}
        <button
          onClick={onBackToLogin}
          className="mb-6 inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors bg-slate-900/60 border border-slate-800 px-3.5 py-2 rounded-xl"
        >
          <ArrowLeft size={16} />
          <span>Voltar para o Login</span>
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Benefits & Promotional Offer */}
          <div className="lg:col-span-5 space-y-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-300 text-xs font-bold mb-3">
                <Sparkles size={14} className="text-emerald-400" />
                <span>Oferta Especial: 50% OFF no 1º Ano</span>
              </div>
              <h1 className="text-3xl font-extrabold text-white tracking-tight leading-tight">
                Assine o CRM Consultorias e impulsione seus contratos
              </h1>
              <p className="text-slate-400 text-sm mt-2">
                Aproveite o preço promocional exclusivo de lançamento no 1º ano.
              </p>
            </div>

            {/* Price Box Highlight (R$ 49,90/mês) */}
            <div className="bg-gradient-to-br from-purple-900/40 to-slate-900 border border-purple-500/30 p-5 rounded-3xl shadow-xl space-y-2">
              <span className="text-[11px] font-extrabold text-purple-400 uppercase tracking-wider block">1º Ano Promocional</span>
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-black text-white">R$ 49,90<span className="text-xs text-slate-400 font-semibold">/mês</span></span>
                <span className="text-sm text-slate-500 line-through">R$ 99,90</span>
              </div>
              <p className="text-xs text-emerald-400 font-bold pt-1">
                🎉 Economia de R$ 600,00 nos 12 primeiros meses!
              </p>
              <p className="text-[11px] text-slate-400">
                • 12 boletos mensais emitidos<br/>
                • Renovação regular no 2º ano por R$ 99,90/mês
              </p>
            </div>

            {/* List of Features */}
            <div className="space-y-3 pt-1">
              <FeatureItem text="Visão Kanban completa de todos os seus contratos" />
              <FeatureItem text="Leitura automática de Ordens de Serviço em PDF com IA" />
              <FeatureItem text="Captura inteligente de e-mails de projetos" />
              <FeatureItem text="Gestão completa de consultores credenciados" />
              <FeatureItem text="Envio automático de alertas pelo Telegram" />
              <FeatureItem text="Garantia de preço promocional no 1º ano por R$ 49,90/mês" />
            </div>
          </div>

          {/* Right Column: Registration Form */}
          <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
              <div>
                <h2 className="text-lg font-bold text-white">Criar Nova Conta de Empresa</h2>
                <p className="text-xs text-slate-400">Preencha os dados para ativar seu plano promocional</p>
              </div>
              <div className="bg-purple-500/10 border border-purple-500/20 text-purple-300 text-[11px] font-bold px-3 py-1 rounded-lg">
                1º Ano R$ 49,90/mês
              </div>
            </div>

            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Nome da Empresa / Consultoria</label>
                <div className="relative">
                  <Building size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-10 pr-3 text-white text-sm focus:outline-none focus:border-purple-500 transition-all"
                    placeholder="Ex: AMP Consultorias & Gestão"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Nome do Administrador</label>
                  <div className="relative">
                    <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      required
                      value={adminName}
                      onChange={(e) => setAdminName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-10 pr-3 text-white text-sm focus:outline-none focus:border-purple-500 transition-all"
                      placeholder="Ex: João da Silva"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Telefone / WhatsApp</label>
                  <div className="relative">
                    <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-10 pr-3 text-white text-sm focus:outline-none focus:border-purple-500 transition-all"
                      placeholder="(11) 99999-9999"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">E-mail Corporativo (Suporte/Admin)</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-10 pr-3 text-white text-sm focus:outline-none focus:border-purple-500 transition-all"
                    placeholder="suporte@suaempresa.com.br"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Senha de Acesso ao Sistema</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="password"
                    required
                    minLength={4}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-10 pr-3 text-white text-sm focus:outline-none focus:border-purple-500 transition-all"
                    placeholder="Crie sua senha segura"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:opacity-95 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-purple-600/30 transition-all flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <span className="inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  ) : (
                    <>
                      <Sparkles size={18} />
                      <span>Assinar Plano Promocional (R$ 49,90/mês) 🚀</span>
                    </>
                  )}
                </button>
              </div>

              <p className="text-[11px] text-center text-slate-500 mt-3">
                Ao clicar em Assinar, você concorda com os termos de uso. O valor promocional de R$ 49,90/mês é válido para os primeiros 12 meses.
              </p>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
}

function FeatureItem({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2.5 text-xs text-slate-300">
      <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
      <span>{text}</span>
    </div>
  );
}
