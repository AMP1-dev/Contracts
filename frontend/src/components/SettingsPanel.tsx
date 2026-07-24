import React, { useState } from 'react';
import type { CompanyConfig, UserSession } from '../types/database';
import { Image, Lock, ShieldCheck, CreditCard, Sparkles, Check, Save, Upload, KeyRound, FileText, Plus, Trash2, Mail, Server, Send, Bell } from 'lucide-react';
import { sendTelegramNotification } from '../lib/telegram';

interface SettingsPanelProps {
  config: CompanyConfig;
  onUpdateConfig: (newConfig: CompanyConfig) => void;
  currentUser: UserSession;
  onChangePassword: (newPass: string) => boolean;
}

export function SettingsPanel({ config, onUpdateConfig, currentUser, onChangePassword }: SettingsPanelProps) {
  const [activeTab, setActiveTab] = useState<'logo' | 'security' | 'subscription' | 'keywords' | 'smtp' | 'telegram'>('logo');
  
  // Logo & Branding state
  const [logoUrl, setLogoUrl] = useState(config.logoUrl || '');
  const [companyName, setCompanyName] = useState(config.companyName || 'CRM Consultorias');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  // Password state
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [passError, setPassError] = useState('');
  const [passSuccess, setPassSuccess] = useState('');

  // PDF Keywords & Sebrae Capture rules state
  const defaultKeywords = ['RAE', 'Ordem de Serviço', 'Demanda', 'Sebrae', 'CNPJ', 'Valor Consultoria', 'Horas Contratadas', 'Razão Social', 'Solução Contratada'];
  const [keywords, setKeywords] = useState<string[]>(config.pdfKeywords || defaultKeywords);
  const [newKeyword, setNewKeyword] = useState('');
  const [customRules, setCustomRules] = useState(config.pdfCustomRules || 'Capturar prioritariamente o código RAE, CNPJ do cliente e valor total da consultoria nos documentos Sebrae.');
  const [keywordsSuccessMsg, setKeywordsSuccessMsg] = useState('');

  // Custom Domain SMTP State
  const [smtpHost, setSmtpHost] = useState(config.smtpHost || 'mail.amp.ia.br');
  const [smtpPort, setSmtpPort] = useState(config.smtpPort || 587);
  const [smtpUser, setSmtpUser] = useState(config.smtpUser || 'suporte@amp.ia.br');
  const [smtpPass, setSmtpPass] = useState(config.smtpPass || '');
  const [smtpSenderName, setSmtpSenderName] = useState(config.smtpSenderName || 'AMP Consultorias & Gestão');
  const [smtpUseSSL, setSmtpUseSSL] = useState(config.smtpUseSSL ?? true);
  const [smtpSuccessMsg, setSmtpSuccessMsg] = useState('');

  // Telegram Bot State
  const [telegramBotToken, setTelegramBotToken] = useState(config.telegramBotToken || '8881587002:AAE1BoSfGMSV4n96A1ISyNVscJJ-v0Ca8zo');
  const [telegramChatId, setTelegramChatId] = useState(config.telegramChatId || '1715550729');
  const [telegramEnabled, setTelegramEnabled] = useState(config.telegramEnabled ?? true);
  const [telegramSuccessMsg, setTelegramSuccessMsg] = useState('');
  const [isTestingTelegram, setIsTestingTelegram] = useState(false);

  const handleSaveTelegram = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateConfig({
      ...config,
      telegramBotToken: telegramBotToken.trim(),
      telegramChatId: telegramChatId.trim(),
      telegramEnabled,
    });
    setTelegramSuccessMsg('Configurações do Telegram salvas com sucesso!');
    setTimeout(() => setTelegramSuccessMsg(''), 3000);
  };

  const handleTestTelegram = async () => {
    if (!telegramChatId.trim()) {
      alert('Por favor, digite o seu Chat ID no campo para enviar o teste.');
      return;
    }

    setIsTestingTelegram(true);
    const result = await sendTelegramNotification(
      '<b>🔔 Alerta de Teste do CRM Consultorias Sebrae</b>\n\nConexão com seu Telegram estabelecida com sucesso! Você receberá avisos automáticos de novas demandas por aqui.',
      telegramBotToken.trim(),
      telegramChatId.trim()
    );
    setIsTestingTelegram(false);

    if (result.ok) {
      alert('✅ Notificação enviada com sucesso! Verifique a mensagem no seu Telegram.');
    } else {
      alert(`❌ Não foi possível enviar no Telegram:\n${result.description || 'Erro desconhecido'}\n\nDICA: Certifique-se de ter clicado em START no robô @AMPdemanda_bot e que seu Chat ID esteja correto.`);
    }
  };

  const handleSaveSmtp = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateConfig({
      ...config,
      smtpHost: smtpHost.trim(),
      smtpPort: Number(smtpPort),
      smtpUser: smtpUser.trim(),
      smtpPass: smtpPass.trim(),
      smtpSenderName: smtpSenderName.trim(),
      smtpUseSSL: smtpUseSSL,
    });
    setSmtpSuccessMsg('Configurações de SMTP do seu domínio salvas com sucesso!');
    setTimeout(() => setSaveSuccessMsg(''), 3000);
  };

  const handleAddKeyword = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newKeyword.trim();
    if (trimmed && !keywords.includes(trimmed)) {
      setKeywords([...keywords, trimmed]);
      setNewKeyword('');
    }
  };

  const handleRemoveKeyword = (kwToRemove: string) => {
    setKeywords(keywords.filter(k => k !== kwToRemove));
  };

  const handleSaveKeywords = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateConfig({
      ...config,
      pdfKeywords: keywords,
      pdfCustomRules: customRules,
    });
    setKeywordsSuccessMsg('Configurações de palavras-chave e regras de captura salvas!');
    setTimeout(() => setKeywordsSuccessMsg(''), 3000);
  };

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
      <div className="border-b border-slate-200 bg-slate-50/70 px-6 pt-4 flex gap-6 overflow-x-auto">
        <button
          onClick={() => setActiveTab('logo')}
          className={`pb-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'logo'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Image size={18} />
          <span>Marca & Logo</span>
        </button>

        <button
          onClick={() => setActiveTab('smtp')}
          className={`pb-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'smtp'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Server size={18} />
          <span>SMTP do Domínio (Envio E-mail)</span>
        </button>

        <button
          onClick={() => setActiveTab('telegram')}
          className={`pb-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'telegram'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Bell size={18} />
          <span>Telegram (Alertas no Celular)</span>
        </button>

        <button
          onClick={() => setActiveTab('keywords')}
          className={`pb-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'keywords'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText size={18} />
          <span>Palavras-Chave PDF (Sebrae/Demandas)</span>
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`pb-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
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
          className={`pb-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
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

        {/* Tab 2: Custom Domain SMTP Server */}
        {activeTab === 'smtp' && (
          <div className="max-w-2xl space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-800">Servidor SMTP do Seu Domínio Próprio</h2>
              <p className="text-xs text-slate-500">
                Configure os dados do servidor de envio de e-mail do seu próprio domínio (ex: mail.amp.ia.br / cPanel / Webmail / Outlook). O sistema disparará as notificações e os pacotes do Sebrae usando o seu endereço oficial.
              </p>
            </div>

            {smtpSuccessMsg && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold rounded-xl flex items-center gap-2">
                <Check size={16} />
                <span>{smtpSuccessMsg}</span>
              </div>
            )}

            <form onSubmit={handleSaveSmtp} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="col-span-1 md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Servidor SMTP (Host)
                  </label>
                  <input
                    type="text"
                    required
                    value={smtpHost}
                    onChange={(e) => setSmtpHost(e.target.value)}
                    placeholder="mail.amp.ia.br ou smtp.seu-dominio.com.br"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-primary font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Porta SMTP
                  </label>
                  <input
                    type="number"
                    required
                    value={smtpPort}
                    onChange={(e) => setSmtpPort(Number(e.target.value))}
                    placeholder="587 ou 465"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-primary font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Nome de Exibição do Remetente
                </label>
                <input
                  type="text"
                  required
                  value={smtpSenderName}
                  onChange={(e) => setSmtpSenderName(e.target.value)}
                  placeholder="Ex: AMP Consultorias - Sebrae"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    E-mail do Remetente (Usuário SMTP)
                  </label>
                  <input
                    type="email"
                    required
                    value={smtpUser}
                    onChange={(e) => setSmtpUser(e.target.value)}
                    placeholder="suporte@amp.ia.br"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-primary font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Senha da Conta de E-mail
                  </label>
                  <input
                    type="password"
                    value={smtpPass}
                    onChange={(e) => setSmtpPass(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-primary font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="useSSL"
                  checked={smtpUseSSL}
                  onChange={(e) => setSmtpUseSSL(e.target.checked)}
                  className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500 border-slate-300"
                />
                <label htmlFor="useSSL" className="text-xs font-medium text-slate-700 cursor-pointer">
                  Utilizar conexão segura SSL / TLS (Recomendado para porta 465 ou 587)
                </label>
              </div>

              <div className="pt-3">
                <button
                  type="submit"
                  className="bg-primary hover:bg-primary-hover text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-md shadow-purple-500/20 transition-all flex items-center gap-2"
                >
                  <Save size={16} />
                  <span>Salvar Servidor SMTP do Domínio</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tab 3: Telegram Bot Mobile Alerts */}
        {activeTab === 'telegram' && (
          <div className="max-w-2xl space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-800">Notificações Automáticas no Celular (Telegram)</h2>
              <p className="text-xs text-slate-500">
                Receba alertas de texto instantâneos no seu celular sempre que uma nova demanda Sebrae for capturada pelo robô IA.
              </p>
            </div>

            {/* Quick 2-Step Instructions Banner */}
            <div className="p-4 bg-sky-50 border border-sky-200 rounded-2xl space-y-2 text-xs text-sky-900">
              <span className="font-bold block text-sky-950">Como configurar seu Robô do Telegram em 2 passos rápidos:</span>
              <ol className="list-decimal list-inside space-y-1 text-slate-700">
                <li>Abra o Telegram, busque por <strong>@BotFather</strong>, envie <code className="bg-sky-100 px-1 py-0.5 rounded font-mono">/newbot</code> e copie o <strong>HTTP API Token</strong> gerado.</li>
                <li>Abra o seu robô no Telegram, clique em <strong>START</strong> (ou mande uma mensagem), e coloque o seu <strong>Chat ID</strong> abaixo.</li>
              </ol>
            </div>

            {telegramSuccessMsg && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold rounded-xl flex items-center gap-2">
                <Check size={16} />
                <span>{telegramSuccessMsg}</span>
              </div>
            )}

            <form onSubmit={handleSaveTelegram} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Telegram Bot API Token
                </label>
                <input
                  type="text"
                  required
                  value={telegramBotToken}
                  onChange={(e) => setTelegramBotToken(e.target.value)}
                  placeholder="Ex: 7123456789:AAFx9817hksd928374..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-primary font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Seu Chat ID (ou ID do Grupo de Consultores)
                </label>
                <input
                  type="text"
                  required
                  value={telegramChatId}
                  onChange={(e) => setTelegramChatId(e.target.value)}
                  placeholder="Ex: 123456789 ou -100123456789"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-primary font-mono"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="telegramEnabled"
                  checked={telegramEnabled}
                  onChange={(e) => setTelegramEnabled(e.target.checked)}
                  className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500 border-slate-300"
                />
                <label htmlFor="telegramEnabled" className="text-xs font-medium text-slate-700 cursor-pointer">
                  Ativar disparo de notificações automáticas ao receber demandas Sebrae
                </label>
              </div>

              <div className="pt-3 flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  className="bg-primary hover:bg-primary-hover text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-md shadow-purple-500/20 transition-all flex items-center gap-2"
                >
                  <Save size={16} />
                  <span>Salvar Configuração do Telegram</span>
                </button>

                <button
                  type="button"
                  onClick={handleTestTelegram}
                  disabled={isTestingTelegram}
                  className="bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  <Send size={14} />
                  <span>{isTestingTelegram ? 'Enviando Alerta...' : 'Enviar Alerta de Teste'}</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tab 3: PDF Keywords & Sebrae Demand Capture */}
        {activeTab === 'keywords' && (
          <div className="max-w-3xl space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-800">Palavras-Chave & Regras de Captura PDF</h2>
              <p className="text-xs text-slate-500">
                Configure as palavras-chave de identificação e instruções personalizadas que o robô IA utilizará para extrair dados das Ordens de Serviço e Demandas Sebrae.
              </p>
            </div>

            {keywordsSuccessMsg && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold rounded-xl flex items-center gap-2">
                <Check size={16} />
                <span>{keywordsSuccessMsg}</span>
              </div>
            )}

            {/* Keyword tags manager */}
            <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Palavras-Chave de Busca no PDF (Sebrae / Contratos)
              </label>

              <div className="flex flex-wrap gap-2 min-h-[48px] p-3 bg-white border border-slate-200 rounded-xl">
                {keywords.map((kw) => (
                  <span
                    key={kw}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-50 border border-purple-200 text-purple-700 text-xs font-semibold rounded-lg group"
                  >
                    <span>{kw}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveKeyword(kw)}
                      className="text-purple-400 hover:text-rose-600 transition-colors"
                      title="Remover palavra-chave"
                    >
                      <Trash2 size={12} />
                    </button>
                  </span>
                ))}
              </div>

              {/* Add keyword form */}
              <form onSubmit={handleAddKeyword} className="flex gap-2">
                <input
                  type="text"
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  placeholder="Nova palavra-chave (ex: RAE-2026, Termo de Adesão)"
                  className="flex-1 bg-white border border-slate-300 rounded-xl px-4 py-2 text-xs text-slate-800 focus:outline-none focus:border-primary"
                />
                <button
                  type="submit"
                  className="bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  <Plus size={14} />
                  <span>Adicionar Tag</span>
                </button>
              </form>
            </div>

            {/* Custom AI Rules for PDF */}
            <form onSubmit={handleSaveKeywords} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Instrução Especial de Leitura da IA (Prompt para Sebrae / Demandas)
                </label>
                <textarea
                  rows={3}
                  value={customRules}
                  onChange={(e) => setCustomRules(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3.5 text-xs text-slate-800 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  placeholder="Ex: Priorizar extração do número RAE, CNPJ e Valor Total da Ordem de Serviço Sebrae..."
                ></textarea>
                <p className="text-[11px] text-slate-500 mt-1">
                  Este procedimento se aplica a você e a todos os consultores associados que utilizam a mesma conta/recurso no Sebrae.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="bg-primary hover:bg-primary-hover text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-md shadow-purple-500/20 transition-all flex items-center gap-2"
                >
                  <Save size={16} />
                  <span>Salvar Regras de Captura PDF</span>
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
