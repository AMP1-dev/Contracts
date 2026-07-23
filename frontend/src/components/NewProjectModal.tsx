import React, { useState } from 'react';
import { X, Plus, FileText, Building2, User, Clock } from 'lucide-react';
import type { Project, ProjectStatus } from '../types/database';

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (newProject: Project) => void;
}

export function NewProjectModal({ isOpen, onClose, onCreate }: NewProjectModalProps) {
  const [codigoRae, setCodigoRae] = useState('');
  const [nomeCliente, setNomeCliente] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [emailCliente, setEmailCliente] = useState('');
  const [celular, setCelular] = useState('');
  const [municipio, setMunicipio] = useState('');
  const [programa, setPrograma] = useState('Sebrae Mais');
  const [solucao, setSolucao] = useState('');
  const [horasContratadas, setHorasContratadas] = useState('20');
  const [valorConsultoria, setValorConsultoria] = useState('3000');
  const [modalidade, setModalidade] = useState('Presencial');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newP: Project = {
      id: `manual-${Date.now()}`,
      consultor_id: 'admin-1',
      codigo_rae: codigoRae.trim() || `RAE-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      status: 'novo_contrato' as ProjectStatus,
      nome_cliente: nomeCliente.trim(),
      razao_social: nomeCliente.trim(),
      nome_fantasia: nomeCliente.trim(),
      cnpj: cnpj.trim() || null,
      cpf: null,
      telefone: celular.trim() || null,
      celular: celular.trim() || null,
      email_cliente: emailCliente.trim() || null,
      municipio: municipio.trim() || 'São Paulo',
      estado: 'SP',
      endereco: '',
      programa: programa || 'Sebrae',
      solucao_contratada: solucao.trim() || 'Consultoria de Gestão e Processos',
      objetivo_atendimento: 'Atendimento e consultoria Sebrae agendados.',
      horas_contratadas: parseFloat(horasContratadas) || 20,
      horas_realizadas: 0,
      data_prevista_inicio: new Date().toISOString().split('T')[0],
      data_prevista_fim: null,
      modalidade: modalidade,
      valor_consultoria: parseFloat(valorConsultoria) || 0,
      observacoes: 'Demanda cadastrada manualmente pelo sistema.',
      dados_extra: {},
      criado_em: new Date().toISOString(),
      atualizado_em: new Date().toISOString(),
    };

    onCreate(newP);
    onClose();
  };

  return (
    <>
      <div 
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-xl bg-white rounded-3xl shadow-2xl z-50 p-6 md:p-8 space-y-6 font-sans border border-slate-200 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Plus size={20} className="text-primary" />
              Cadastrar Nova Demanda / Contrato
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Preencha os dados básicos para incluir o contrato no Kanban</p>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Código RAE (Sebrae)</label>
              <input
                type="text"
                value={codigoRae}
                onChange={(e) => setCodigoRae(e.target.value)}
                placeholder="Ex: RAE-2026-1234"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Nome do Cliente / Empresa *</label>
              <input
                type="text"
                required
                value={nomeCliente}
                onChange={(e) => setNomeCliente(e.target.value)}
                placeholder="Ex: Padaria Estrela LTDA"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">CNPJ do Cliente</label>
              <input
                type="text"
                value={cnpj}
                onChange={(e) => setCnpj(e.target.value)}
                placeholder="00.000.000/0001-00"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Celular / WhatsApp</label>
              <input
                type="text"
                value={celular}
                onChange={(e) => setCelular(e.target.value)}
                placeholder="(11) 99999-9999"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">E-mail do Cliente</label>
              <input
                type="email"
                value={emailCliente}
                onChange={(e) => setEmailCliente(e.target.value)}
                placeholder="cliente@empresa.com.br"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Município / Cidade</label>
              <input
                type="text"
                value={municipio}
                onChange={(e) => setMunicipio(e.target.value)}
                placeholder="São Paulo"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Programa Sebrae</label>
              <select
                value={programa}
                onChange={(e) => setPrograma(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-primary"
              >
                <option value="Sebrae Mais">Sebrae Mais</option>
                <option value="Brasil Mais">Brasil Mais</option>
                <option value="Sebraetec">Sebraetec</option>
                <option value="ALI - Agentes Locais">ALI - Agentes Locais</option>
                <option value="Outro">Outro Programa</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Modalidade</label>
              <select
                value={modalidade}
                onChange={(e) => setModalidade(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-primary"
              >
                <option value="Presencial">Presencial</option>
                <option value="Online">Online</option>
                <option value="Híbrido">Híbrido</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Horas Contratadas</label>
              <input
                type="number"
                value={horasContratadas}
                onChange={(e) => setHorasContratadas(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Valor da Consultoria (R$)</label>
              <input
                type="number"
                value={valorConsultoria}
                onChange={(e) => setValorConsultoria(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-100 text-slate-600 font-semibold rounded-xl text-xs hover:bg-slate-200"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl text-xs shadow-md shadow-purple-500/20"
            >
              Criar Demanda no Kanban
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
