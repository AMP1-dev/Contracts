import React, { useState } from 'react';
import type { CompanyConfig, UserSession } from '../types/database';
import { Image, Lock, ShieldCheck, CreditCard, Sparkles, Check, Save, Upload, KeyRound } from 'lucide-react';

interface SettingsPanelProps {
  config: CompanyConfig;
  onUpdateConfig: (newConfig: CompanyConfig) => void;
  currentUser: UserSession;
  onChangePassword: (newPass: string) => boolean;
}

export function SettingsPanel({ config, onUpdateConfig, currentUser, onChangePassword }: SettingsPanelProps) {
  const [activeTab, setActiveTab] = useState<'logo' | 'security' | 'subscription'>('logo');
  
  // Logo & Branding state
  const [logoUrl, setLogoUrl] = useState(config.logoUrl || '');
  const [companyName, setCompanyName] = useState(config.companyName || 'CRM Consultorias');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  // Password state
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [passError, setPassError] = useState('');
  const [passSuccess, setPassSuccess] = useState('');

  const handleSaveLogo = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateConfig({
      ...config,
      logoUrl: logoUrl.trim() || null,
      companyName: companyName.trim() || 'CRM Consultorias',
    });
    setSaveSuccessMsg('Configurações da logo e marca salvas com sucesso!');
    setTimeout(() => setSaveSuccessMsg(''), 3000);
  };

  const handleLogoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleChangePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPassError('');
    setPassSuccess('');

    if (newPass.length < 4) {
      setPassError('A nova senha deve ter pelo menos 4 caracteres.');
      return;
    }

    if (newPass !== confirmPass) {
      setPassError('A nova senha e a confirmação não coincidem.');
      return;
    }

    const updated = onChangePassword(newPass);
    if (updated) {
      setPassSuccess('Senha alterada com sucesso!');
      setNewPass('');
      setConfirmPass('');
      setTimeout(() => setPassSuccess(''), 3000);
    } else {
      setPassError('Não foi possível alterar a senha. Tente novamente.');
    }
  };

  return (
    <div className="h-full flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden font-sans">
      
      {/* Header Tabs */}
      <div className="border-b border-slate-200 bg-slate-50/70 px-6 pt-4 flex gap-6">
        <button
          onClick={() => setActiveTab('logo')}
          className={`pb-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-all ${
            activeTab === 'logo'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Image size={18} />
          <span>Marca & Logo</span>
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`pb-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-all ${
            activeTab === 'security'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Lock size={18} />
          <span>Segurança & Senha</span>
        </button>

        <button
          onClick={() => setActiveTab('subscription')}
          className={`pb-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-all ${
            activeTab === 'subscription'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <CreditCard size={18} />
          <span>Minha Assinatura</span>
        </button>
      </div>

      {/* Content Body */}
      <div className="flex-1 p-6 md:p-8 overflow-y-auto">
        
        {/* Tab 1: Logo & Branding */}
        {activeTab === 'logo' && (
          <div className="max-w-2xl space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-800">Personalização da Logo e Marca</h2>
              <p className="text-xs text-slate-500">Altere o nome da sua consultoria e faça o upload da sua logo</p>
            </div>

            {saveSuccessMsg && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold rounded-xl flex items-center gap-2">
                <Check size={16} />
                <span>{saveSuccessMsg}</span>
              </div>
            )}

            <form onSubmit={handleSaveLogo} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Nome da Consultoria / Empresa
                </label>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Logo da Empresa
                </label>
                
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 border border-slate-200 rounded-2xl bg-slate-50">
                  <div className="w-20 h-20 bg-white rounded-xl border border-slate-200 flex items-center justify-center overflow-hidden shadow-inner shrink-0">
                    {logoUrl ? (
                      <img src={logoUrl} alt="Logo" className="w-full h-full object-contain p-1" />
                    ) : (
                      <span className="text-xs font-bold text-slate-400">Sem Logo</span>
                    )}
                  </div>

                  <div className="flex-1 space-y-2">
                    <label className="inline-flex items-center gap-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold px-3.5 py-2 rounded-xl cursor-pointer shadow-sm transition-all">
                      <Upload size={14} />
                      <span>Fazer upload de imagem</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoFileUpload}
                        className="hidden"
                      />
                    </label>
                    <p className="text-[11px] text-slate-400">Suporta PNG, JPG ou SVG (tamanho recomendado: 200x200px)</p>
                  </div>
                </div>

                <div className="mt-3">
                  <span className="text-xs text-slate-500 font-medium block mb-1">Ou cole uma URL da imagem da Logo:</span>
                  <input
                    type="url"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="https://suaempresa.com.br/logo.png"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 text-xs text-slate-800 focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="pt-3">
                <button
                  type="submit"
                  className="bg-primary hover:bg-primary-hover text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-md shadow-purple-500/20 transition-all flex items-center gap-2"
                >
                  <Save size={16} />
                  <span>Salvar Alterações de Marca</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tab 2: Security & Password */}
        {activeTab === 'security' && (
          <div className="max-w-xl space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-800">Segurança da Conta & Troca de Senha</h2>
              <p className="text-xs text-slate-500">Altere a senha de acesso do usuário administrador</p>
            </div>

            <div className="p-3.5 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-600 flex items-center gap-2">
              <ShieldCheck size={18} className="text-primary" />
              <span>Usuário logado: <strong className="text-slate-800 font-semibold">{currentUser.email}</strong></span>
            </div>

            {passError && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl">
                {passError}
              </div>
            )}

            {passSuccess && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold rounded-xl flex items-center gap-2">
                <Check size={16} />
                <span>{passSuccess}</span>
              </div>
            )}

            <form onSubmit={handleChangePasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Nova Senha
                </label>
                <input
                  type="password"
                  required
                  value={newPass}
                  onChange={(e) => setNewPass(e.target.value)}
                  placeholder="Digite a nova senha"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Confirmar Nova Senha
                </label>
                <input
                  type="password"
                  required
                  value={confirmPass}
                  onChange={(e) => setConfirmPass(e.target.value)}
                  placeholder="Confirme a nova senha"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-primary"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="bg-primary hover:bg-primary-hover text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-md shadow-purple-500/20 transition-all flex items-center gap-2"
                >
                  <KeyRound size={16} />
                  <span>Atualizar Senha de Acesso</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tab 3: Subscription & Billing */}
        {activeTab === 'subscription' && (
          <div className="max-w-2xl space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-800">Status da Sua Assinatura</h2>
              <p className="text-xs text-slate-500">Gerencie a modalidade do seu plano e benefícios ativos</p>
            </div>

            {/* Trial Card */}
            <div className="p-6 bg-gradient-to-br from-purple-900 to-indigo-900 text-white rounded-2xl shadow-xl relative overflow-hidden">
              <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
              
              <div className="flex items-start justify-between">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-400/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold rounded-full mb-3">
                    <Sparkles size={14} />
                    <span>Teste Grátis Ativo</span>
                  </div>
                  <h3 className="text-xl font-extrabold tracking-tight">Período de Teste por 40 Dias</h3>
                  <p className="text-xs text-purple-200 mt-1">Aproveite o acesso ilimitado a todas as ferramentas do CRM.</p>
                </div>
                <div className="bg-white/10 backdrop-blur-md p-3 rounded-2xl text-center border border-white/20">
                  <span className="text-2xl font-extrabold block">40</span>
                  <span className="text-[10px] uppercase font-bold text-purple-200">Dias Restantes</span>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs text-purple-200">Preço pós-teste: <strong>R$ 79/mês (Plano Anual)</strong> ou <strong>R$ 99/mês (Mensal)</strong></span>
                <button
                  type="button"
                  className="bg-white text-purple-900 hover:bg-slate-100 font-bold text-xs px-4 py-2 rounded-xl transition-colors shadow"
                >
                  Efetuar Upgrade / Mudar Plano
                </button>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
