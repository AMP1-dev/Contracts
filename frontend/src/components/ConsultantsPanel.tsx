import { useState } from 'react';
import { UserCheck, Plus, Mail, Phone, Shield, Award, Trash2 } from 'lucide-react';

export interface Consultor {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  especialidade: string;
  status: 'ativo' | 'inativo';
  raesAtivas: number;
}

const INITIAL_CONSULTORES: Consultor[] = [
  {
    id: 'c1',
    nome: 'Carlos Eduardo Santos',
    email: 'carlos.consultor@amp.ia.br',
    telefone: '(11) 98765-1122',
    especialidade: 'Finanças & DRE Sebrae',
    status: 'ativo',
    raesAtivas: 4,
  },
  {
    id: 'c2',
    nome: 'Mariana Oliveira',
    email: 'mariana.consultora@amp.ia.br',
    telefone: '(19) 99123-4455',
    especialidade: 'Processos & Eficiência Operacional',
    status: 'ativo',
    raesAtivas: 3,
  },
  {
    id: 'c3',
    nome: 'Roberto Mendes',
    email: 'roberto.mendes@amp.ia.br',
    telefone: '(16) 98111-9988',
    especialidade: 'Sebraetec & Marca/Patentes',
    status: 'ativo',
    raesAtivas: 2,
  }
];

export function ConsultantsPanel() {
  const [consultores, setConsultores] = useState<Consultor[]>(INITIAL_CONSULTORES);
  const [isAdding, setIsAdding] = useState(false);

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [especialidade, setEspecialidade] = useState('');

  const handleAddConsultor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome || !email) return;

    const newC: Consultor = {
      id: `consultor-${Date.now()}`,
      nome,
      email,
      telefone: telefone || '(11) 99999-0000',
      especialidade: especialidade || 'Consultor Geral Sebrae',
      status: 'ativo',
      raesAtivas: 0,
    };

    setConsultores([newC, ...consultores]);
    setIsAdding(false);
    setNome('');
    setEmail('');
    setTelefone('');
    setEspecialidade('');
  };

  const handleRemove = (id: string) => {
    setConsultores(consultores.filter(c => c.id !== id));
  };

  return (
    <div className="max-w-6xl mx-auto w-full space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
            <UserCheck className="text-primary" size={24} />
            Gestão de Consultores Credenciados
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Cadastre os consultores da sua equipe para vincular demandas, RAEs e acompanhar atendimentos Sebrae.
          </p>
        </div>

        <button
          onClick={() => setIsAdding(!isAdding)}
          className="bg-primary hover:bg-primary-hover text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-md shadow-purple-500/20 transition-all flex items-center gap-2"
        >
          <Plus size={16} />
          <span>Cadastrar Novo Consultor</span>
        </button>
      </div>

      {/* Add Modal / Form */}
      {isAdding && (
        <div className="bg-purple-50/70 border border-purple-200 p-6 rounded-2xl animate-fadeIn space-y-4">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Novo Consultor</h3>
          <form onSubmit={handleAddConsultor} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Nome Completo</label>
              <input
                type="text"
                required
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: João da Silva"
                className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">E-mail Corporativo</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="joao@consultoria.com.br"
                className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Telefone / WhatsApp</label>
              <input
                type="text"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                placeholder="(11) 99999-9999"
                className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Especialidade / Programas Sebrae</label>
              <input
                type="text"
                value={especialidade}
                onChange={(e) => setEspecialidade(e.target.value)}
                placeholder="Ex: Finanças, Sebraetec, Brasil Mais"
                className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-primary"
              />
            </div>

            <div className="col-span-1 md:col-span-2 flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-4 py-2 bg-slate-200 text-slate-700 hover:bg-slate-300 text-xs font-semibold rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl shadow"
              >
                Salvar Consultor
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Grid of Consultants */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {consultores.map((c) => (
          <div key={c.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 hover:shadow-md transition-shadow relative group">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-purple-100 border border-purple-200 text-primary font-bold text-sm flex items-center justify-center">
                  {c.nome.split(' ').map(n => n[0]).slice(0,2).join('')}
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">{c.nome}</h3>
                  <span className="inline-block px-2 py-0.5 bg-purple-50 border border-purple-200 text-purple-700 text-[10px] font-bold rounded-md mt-0.5">
                    {c.especialidade}
                  </span>
                </div>
              </div>

              <button
                onClick={() => handleRemove(c.id)}
                className="text-slate-300 hover:text-rose-600 transition-colors opacity-0 group-hover:opacity-100"
                title="Remover consultor"
              >
                <Trash2 size={16} />
              </button>
            </div>

            <div className="space-y-1.5 pt-2 text-xs text-slate-600 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <Mail size={14} className="text-slate-400 shrink-0" />
                <span className="truncate">{c.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone size={14} className="text-slate-400 shrink-0" />
                <span>{c.telefone}</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
              <span className="text-slate-500 font-medium">Demandas Ativas:</span>
              <span className="font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md">
                {c.raesAtivas} Contratos RAE
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
