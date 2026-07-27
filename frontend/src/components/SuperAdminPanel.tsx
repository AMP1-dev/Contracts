import React, { useState } from 'react';
import { ShieldCheck, Users, KeyRound, CheckCircle2, AlertTriangle, RefreshCw, CreditCard, Landmark, QrCode, Search, Edit3, Trash2 } from 'lucide-react';
import type { UserSession } from '../types/database';

interface TenantUser {
  id: string;
  name: string;
  email: string;
  companyName: string;
  status: 'ativo' | 'trial_30d' | 'suspenso' | 'cancelado';
  createdAt: string;
  plan: string;
  lastPaymentDate?: string;
}

const INITIAL_TENANTS: TenantUser[] = [
  {
    id: 'tenant-1',
    name: 'Administrador AMP',
    email: 'consultoria@amp.adm.br',
    companyName: 'AMP do Brasil Soluções Tecnológicas',
    status: 'ativo',
    createdAt: '2026-07-20',
    plan: 'Promocional 1º Ano (R$ 49,90/mês)',
    lastPaymentDate: '2026-07-20',
  },
  {
    id: 'tenant-2',
    name: 'Carlos Eduardo Santos',
    email: 'suporte@amp.ia.br',
    companyName: 'AMP Suporte & Testes',
    status: 'trial_30d',
    createdAt: '2026-07-26',
    plan: '30 Dias Grátis (Demandas Ilimitadas)',
    lastPaymentDate: 'Pendente',
  },
  {
    id: 'tenant-3',
    name: 'Valquíria Ramos Cruz',
    email: 'valquiria@gestaoconsultorias.com.br',
    companyName: 'Valquíria Ramos Consultorias',
    status: 'ativo',
    createdAt: '2026-07-21',
    plan: 'Promocional 1º Ano (R$ 49,90/mês)',
    lastPaymentDate: '2026-07-21',
  },
  {
    id: 'tenant-4',
    name: 'Roberto Mendes',
    email: 'roberto@mendesconsultoria.com.br',
    companyName: 'Mendes & Associados Consultorias',
    status: 'suspenso',
    createdAt: '2026-07-15',
    plan: 'Promocional 1º Ano (R$ 49,90/mês)',
    lastPaymentDate: 'Atrasado',
  }
];

export function SuperAdminPanel() {
  const [tenants, setTenants] = useState<TenantUser[]>(INITIAL_TENANTS);
  const [search, setSearch] = useState('');
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Bank Data Config State (C6 / Nubank / PIX)
  const [pixKey, setPixKey] = useState('financeiro@amp.adm.br (CNPJ: 13.290.962/0001-74)');
  const [bancoNome, setBancoNome] = useState('Banco C6 S.A. / Nubank Pagamentos');
  const [agenciaConta, setAgenciaConta] = useState('Agência: 0001 • Conta Corrente: 887654-9');
  const [favorecido, setFavorecido] = useState('AMP DO BRASIL SOLUCOES ADMINISTRATIVAS E TECNOLOGICAS LTDA');
  const [savedBankData, setSavedBankData] = useState(false);

  const filteredTenants = tenants.filter(t => 
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.email.toLowerCase().includes(search.toLowerCase()) ||
    t.companyName.toLowerCase().includes(search.toLowerCase())
  );

  const handleResetPassword = (email: string, name: string) => {
    setActionSuccess(`Senha do usuário ${name} (${email}) foi resetada com sucesso para "1234"!`);
    setTimeout(() => setActionSuccess(null), 4000);
  };

  const handleUpdateStatus = (id: string, newStatus: TenantUser['status']) => {
    setTenants(prev => prev.map(t => t.id === id ? { ...t, status: newStatus } : t));
    setActionSuccess(`Status do assinante atualizado com sucesso!`);
    setTimeout(() => setActionSuccess(null), 3000);
  };

  const handleSaveBankData = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedBankData(true);
    setActionSuccess(`Dados bancários para Depósito/PIX atualizados com sucesso!`);
    setTimeout(() => setActionSuccess(null), 4000);
  };

  return (
    <div className="max-w-6xl mx-auto w-full space-y-6 pb-12 font-sans">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900 border border-purple-800/40 p-6 rounded-3xl shadow-xl text-white relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-purple-600/20 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center text-purple-300 shrink-0">
              <ShieldCheck size={28} />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-purple-500/30 border border-purple-400/40 text-purple-200 text-[10px] font-extrabold rounded-md uppercase tracking-wider mb-1">
                <span>Acesso Master SuperAdmin</span>
              </div>
              <h2 className="text-xl font-extrabold tracking-tight">Painel de Gestão do Sistema & Assinantes</h2>
              <p className="text-xs text-slate-300 mt-0.5">
                Logado como: <strong className="text-white">consultoria@amp.adm.br</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 bg-slate-800/80 border border-slate-700 text-slate-200 text-xs font-bold rounded-xl">
              Total de Assinantes: {tenants.length}
            </span>
          </div>
        </div>
      </div>

      {/* Alert Notification */}
      {actionSuccess && (
        <div className="p-4 bg-emerald-500/15 border border-emerald-500/30 rounded-2xl text-emerald-800 text-xs font-bold flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="text-emerald-600" />
            <span>{actionSuccess}</span>
          </div>
        </div>
      )}

      {/* Bank Account Config Card (C6 Bank / Nubank / Pix) */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-200 text-purple-700 flex items-center justify-center">
              <Landmark size={18} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Dados Bancários para Recebimento de Assinaturas (Depósito / Pix)</h3>
              <p className="text-xs text-slate-500">Cadastre a chave Pix e conta bancária (C6 / Nubank) que aparecerão aos assinantes para depósito.</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSaveBankData} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Instituição Bancária</label>
            <input
              type="text"
              value={bancoNome}
              onChange={e => setBancoNome(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-purple-600"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Chave PIX Oficial</label>
            <input
              type="text"
              value={pixKey}
              onChange={e => setPixKey(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-purple-600"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Agência & Conta Corrente</label>
            <input
              type="text"
              value={agenciaConta}
              onChange={e => setAgenciaConta(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-purple-600"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Nome do Favorecido / Razão Social</label>
            <input
              type="text"
              value={favorecido}
              onChange={e => setFavorecido(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-purple-600"
            />
          </div>

          <div className="col-span-1 md:col-span-2 flex justify-end">
            <button
              type="submit"
              className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-2"
            >
              <CheckCircle2 size={16} />
              <span>Salvar Configuração de Depósito / Pix</span>
            </button>
          </div>
        </form>
      </div>

      {/* Tenants Table */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <Users size={18} className="text-purple-600" />
              <span>Lista de Assinantes & Empresas Cadastradas</span>
            </h3>
            <p className="text-xs text-slate-500">Gerencie planos, resete senhas e controle o acesso por adimplência.</p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar assinante ou empresa..."
              className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-purple-600"
            />
          </div>
        </div>

        <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Empresa / Assinante</th>
                  <th className="py-3 px-4">Plano Vigente</th>
                  <th className="py-3 px-4">Status de Acesso</th>
                  <th className="py-3 px-4">Cadastro</th>
                  <th className="py-3 px-4 text-right">Ações SuperAdmin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredTenants.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{t.companyName}</div>
                      <div className="text-[11px] text-slate-500">{t.name} • <span className="text-purple-700 font-semibold">{t.email}</span></div>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800">
                      {t.plan}
                    </td>
                    <td className="py-3.5 px-4">
                      <select
                        value={t.status}
                        onChange={(e) => handleUpdateStatus(t.id, e.target.value as TenantUser['status'])}
                        className={`text-[11px] font-extrabold px-2.5 py-1 rounded-lg border cursor-pointer ${
                          t.status === 'ativo' ? 'bg-emerald-50 text-emerald-700 border-emerald-300' :
                          t.status === 'trial_30d' ? 'bg-purple-50 text-purple-700 border-purple-300' :
                          t.status === 'suspenso' ? 'bg-rose-50 text-rose-700 border-rose-300' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        <option value="ativo">Ativo (Adimplente ✅)</option>
                        <option value="trial_30d">30 Dias Grátis 🎁</option>
                        <option value="suspenso">Suspenso (Inadimplente ⚠️)</option>
                        <option value="cancelado">Cancelado ❌</option>
                      </select>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {t.createdAt}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleResetPassword(t.email, t.name)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-purple-50 text-slate-700 hover:text-purple-700 border border-slate-300 hover:border-purple-300 text-[11px] font-bold rounded-lg transition-colors inline-flex items-center gap-1"
                        title="Resetar senha deste usuário para '1234'"
                      >
                        <KeyRound size={13} />
                        <span>Resetar Senha ('1234')</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

    </div>
  );
}
