import React, { useState } from 'react';
import { X, Plus, FileText, Building2, User, Clock, Layers, Users } from 'lucide-react';
import type { Project, ProjectStatus } from '../types/database';
import { maskPhone } from '../lib/utils';

interface EmpresaAdicional {
  codigoRae: string;
  nome: string;
  cnpj: string;
  celular: string;
}

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (newProjects: Project | Project[]) => void;
}

export function NewProjectModal({ isOpen, onClose, onCreate }: NewProjectModalProps) {
  // Dados do Contrato (Guarda-Chuva)
  const [contratoNo, setContratoNo] = useState('');
  const [edital, setEdital] = useState('');
  const [processoNo, setProcessoNo] = useState('');
  const [programa, setPrograma] = useState('FOCO - Sebrae RJ');
  const [modalidade, setModalidade] = useState('Remoto');
  const [dataAtendimento, setDataAtendimento] = useState('');
  const [horasContratadas, setHorasContratadas] = useState('4');
  const [valorConsultoria, setValorConsultoria] = useState('');
  const [solucao, setSolucao] = useState('');
  const [empresaCredenciada, setEmpresaCredenciada] = useState('AMP DO BRASIL SOLUCOES ADMINISTRATIVAS E TECNOLOGICAS LTDA');
  const [profissionalResponsavel, setProfissionalResponsavel] = useState('MARCO ANTONIO PAVANI');

  // Quantidade de Empresas: DEVE VIR EM BRANCO por padrão conforme solicitação
  const [qtdEmpresas, setQtdEmpresas] = useState('');

  // Dados Individuais da 1ª Empresa
  const [codigoRae, setCodigoRae] = useState('');
  const [nomeCliente, setNomeCliente] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [celular, setCelular] = useState('');
  const [emailCliente, setEmailCliente] = useState('');
  const [municipio, setMunicipio] = useState('');
  const [estado, setEstado] = useState('RJ');

  // Lista de Empresas Adicionais (para casos de guarda-chuva > 1)
  const [empresasAdicionais, setEmpresasAdicionais] = useState<EmpresaAdicional[]>([]);

  const resetForm = () => {
    setContratoNo('');
    setEdital('');
    setProcessoNo('');
    setPrograma('FOCO - Sebrae RJ');
    setModalidade('Remoto');
    setDataAtendimento('');
    setHorasContratadas('4');
    setValorConsultoria('');
    setSolucao('');

    // Quantidade em branco
    setQtdEmpresas('');

    // Dados individuais da 1ª empresa
    setCodigoRae('');
    setNomeCliente('');
    setCnpj('');
    setCelular('');
    setEmailCliente('');
    setMunicipio('');
    setEstado('RJ');

    setEmpresasAdicionais([]);
  };

  React.useEffect(() => {
    if (isOpen) {
      resetForm();
    }
  }, [isOpen]);

  // Calcula total efetivo de empresas
  const totalEmpresas = parseInt(qtdEmpresas) || 1;

  // Sincroniza a lista de empresas adicionais quando a quantidade muda
  const handleQtdChange = (valStr: string) => {
    setQtdEmpresas(valStr);
    const parsed = parseInt(valStr) || 1;
    const needed = Math.max(0, Math.min(49, parsed - 1));

    setEmpresasAdicionais((prev) => {
      const updated = [...prev];
      if (updated.length < needed) {
        for (let i = updated.length; i < needed; i++) {
          updated.push({
            codigoRae: '',
            nome: `Empresa ${i + 2}`,
            cnpj: '',
            celular: '',
          });
        }
      } else if (updated.length > needed) {
        return updated.slice(0, needed);
      }
      return updated;
    });
  };

  const handleEmpresaAdicionalChange = (index: number, field: keyof EmpresaAdicional, value: string) => {
    setEmpresasAdicionais((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  if (!isOpen) return null;

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const timestamp = Date.now();
    const count = totalEmpresas;

    const baseShared = {
      consultor_id: 'admin-1',
      status: 'novo_contrato' as ProjectStatus,
      cpf: null,
      municipio: municipio.trim() || (estado === 'RJ' ? 'Rio de Janeiro' : 'São Paulo'),
      estado: estado.trim() || 'RJ',
      endereco: '',
      programa: programa || 'Sebrae',
      solucao_contratada: solucao.trim() || 'Consultoria de Gestão e Processos',
      objetivo_atendimento: 'Atendimento e consultoria Sebrae agendados.',
      horas_contratadas: parseFloat(horasContratadas) || 0,
      horas_realizadas: 0,
      data_atendimento: dataAtendimento.trim() || null,
      data_prevista_inicio: dataAtendimento.trim() || new Date().toISOString().split('T')[0],
      data_prevista_fim: null,
      modalidade: modalidade,
      valor_consultoria: parseFloat(valorConsultoria) || 0,
      contrato_no: contratoNo.trim() || null,
      edital: edital.trim() || null,
      processo_no: processoNo.trim() || null,
      empresa_credenciada: empresaCredenciada.trim() || 'AMP DO BRASIL SOLUCOES ADMINISTRATIVAS E TECNOLOGICAS LTDA',
      profissional_responsavel: profissionalResponsavel.trim() || 'MARCO ANTONIO PAVANI',
      natureza: 'CONSULTORIA',
      plataforma_utilizada: modalidade,
      observacoes: count > 1 ? `Contrato Guarda-Chuva (${count} empresas no total)` : 'Demanda cadastrada manualmente pelo sistema.',
      dados_extra: {},
      criado_em: new Date().toISOString(),
      atualizado_em: new Date().toISOString(),
    };

    const projectsToCreate: Project[] = [];

    // 1ª Empresa (com seu RAE / CO individual)
    const emp1Name = nomeCliente.trim() || 'Empresa 1';
    const emp1Code = codigoRae.trim() || (contratoNo.trim() ? `${contratoNo.trim()}-01` : `CO-${Math.floor(1000 + Math.random() * 9000)}`);
    projectsToCreate.push({
      ...baseShared,
      id: `manual-${timestamp}-1`,
      codigo_rae: emp1Code,
      nome_cliente: emp1Name,
      razao_social: emp1Name,
      nome_fantasia: emp1Name,
      cnpj: cnpj.trim() || null,
      telefone: celular.trim() || null,
      celular: celular.trim() || null,
      email_cliente: emailCliente.trim() || null,
    });

    // Empresas Adicionais (2 até N - cada uma com seu RAE / CO individual)
    if (count > 1) {
      empresasAdicionais.forEach((emp, idx) => {
        const num = idx + 2;
        const numStr = num < 10 ? `0${num}` : `${num}`;
        const name = emp.nome.trim() || `${emp1Name} (Empresa ${num}/${count})`;
        const empCode = emp.codigoRae.trim() 
          ? emp.codigoRae.trim() 
          : codigoRae.trim() 
            ? `${codigoRae.trim()}-${numStr}` 
            : contratoNo.trim() 
              ? `${contratoNo.trim()}-${numStr}` 
              : `CO-${Math.floor(1000 + Math.random() * 9000)}-${numStr}`;

        projectsToCreate.push({
          ...baseShared,
          id: `manual-${timestamp}-${num}`,
          codigo_rae: empCode,
          nome_cliente: name,
          razao_social: name,
          nome_fantasia: name,
          cnpj: emp.cnpj.trim() || null,
          telefone: emp.celular.trim() || null,
          celular: emp.celular.trim() || null,
          email_cliente: null,
        });
      });
    }

    onCreate(projectsToCreate);
    resetForm();
    onClose();
  };

  return (
    <>
      <div 
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40"
        onClick={handleClose}
      />

      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-white rounded-3xl shadow-2xl z-50 p-6 md:p-8 space-y-5 font-sans border border-slate-200 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Plus size={20} className="text-primary" />
              Cadastrar Nova Demanda / Contrato
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Contrato é o guarda-chuva compartilhado; RAE / CO e dados do cliente são de preenchimento individual
            </p>
          </div>
          <button 
            onClick={handleClose}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* BLOCO 1: DADOS DO CONTRATO (GUARDA-CHUVA) */}
          <div className="bg-purple-50/70 border border-purple-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-purple-900 uppercase tracking-wider flex items-center gap-1.5">
                <Layers size={15} className="text-purple-600" />
                Dados do Contrato (Guarda-Chuva)
              </span>
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-purple-950">Qtd. Empresas:</label>
                <input 
                  type="number"
                  min={1}
                  max={50}
                  placeholder="1"
                  value={qtdEmpresas}
                  onChange={(e) => handleQtdChange(e.target.value)}
                  className="w-16 bg-white border border-purple-300 rounded-lg px-2 py-1 text-xs text-center font-bold text-purple-900 placeholder:text-slate-400 focus:outline-none focus:border-primary"
                  title="Deixe em branco para 1 empresa ou digite a quantidade total do contrato (ex: 9)"
                />
              </div>
            </div>

            {/* Linha 1 do Contrato */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Contrato Nº</label>
                <input
                  type="text"
                  value={contratoNo}
                  onChange={(e) => setContratoNo(e.target.value)}
                  placeholder="Ex: RJ0520260103"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Edital (opcional)</label>
                <input
                  type="text"
                  value={edital}
                  onChange={(e) => setEdital(e.target.value)}
                  placeholder="Ex: 001/2026"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Processo Nº (opcional)</label>
                <input
                  type="text"
                  value={processoNo}
                  onChange={(e) => setProcessoNo(e.target.value)}
                  placeholder="Ex: 1777/2025"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            {/* Linha 2 do Contrato: Programa, Modalidade e Data */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Programa Sebrae</label>
                <select
                  value={programa}
                  onChange={(e) => setPrograma(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-primary"
                >
                  <option value="FOCO - Sebrae RJ">FOCO - Sebrae RJ</option>
                  <option value="Sebrae Mais">Sebrae Mais</option>
                  <option value="Brasil Mais">Brasil Mais</option>
                  <option value="Sebraetec">Sebraetec</option>
                  <option value="ALI - Agentes Locais">ALI - Agentes Locais</option>
                  <option value="Outro">Outro Programa</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">(Remoto/Presencial)</label>
                <select
                  value={modalidade}
                  onChange={(e) => setModalidade(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-primary"
                >
                  <option value="Remoto">Remoto</option>
                  <option value="Presencial">Presencial</option>
                  <option value="Online">Online</option>
                  <option value="Híbrido">Híbrido</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Data do Atendimento</label>
                <input
                  type="text"
                  value={dataAtendimento}
                  onChange={(e) => setDataAtendimento(e.target.value)}
                  placeholder="Ex: 31/07/2026"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            {/* Linha 3 do Contrato: Horas e Valor */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Horas Contratadas (por empresa)</label>
                <input
                  type="number"
                  value={horasContratadas}
                  onChange={(e) => setHorasContratadas(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Valor Unitário da Consultoria (R$)</label>
                <input
                  type="number"
                  value={valorConsultoria}
                  onChange={(e) => setValorConsultoria(e.target.value)}
                  placeholder="Ex: 170.00"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            {totalEmpresas > 1 && (
              <div className="bg-white/90 border border-purple-200 rounded-xl p-2.5 text-xs text-purple-900 flex items-center gap-2">
                <Users size={15} className="text-purple-600 shrink-0" />
                <span>
                  <strong>Guarda-Chuva Ativo:</strong> Serão criados <strong>{totalEmpresas} cards</strong> no Kanban compartilhando este contrato!
                </span>
              </div>
            )}
          </div>

          {/* BLOCO 2: DADOS DA EMPRESA / CLIENTE (PREENCHIMENTO INDIVIDUAL) */}
          <div className="space-y-3 pt-1">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Building2 size={15} className="text-slate-500" />
              {totalEmpresas > 1 ? '1ª Empresa (Preenchimento Individual)' : 'Dados da Empresa / Cliente (Preenchimento Individual)'}
            </h3>

            {/* Linha 1 da Empresa: RAE/CO individual, Nome e CNPJ */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Código RAE / CO (Sebrae) *
                </label>
                <input
                  type="text"
                  value={codigoRae}
                  onChange={(e) => setCodigoRae(e.target.value)}
                  placeholder="Ex: CO RJ052026-01 ou RAE 070873"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-primary font-medium"
                />
              </div>
              <div className="sm:col-span-2">
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

            {/* Linha 2 da Empresa: CNPJ, Celular, Município e Estado */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">CNPJ do Cliente</label>
                <input
                  type="text"
                  value={cnpj}
                  onChange={(e) => setCnpj(e.target.value)}
                  placeholder="00.000.000/0001-00"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Celular / WhatsApp</label>
                <input
                  type="text"
                  value={celular}
                  onChange={(e) => setCelular(maskPhone(e.target.value))}
                  placeholder="(21) 99999-9999"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Município</label>
                <input
                  type="text"
                  value={municipio}
                  onChange={(e) => setMunicipio(e.target.value)}
                  placeholder="Rio de Janeiro"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Estado (UF)</label>
                <select
                  value={estado}
                  onChange={(e) => setEstado(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-primary font-bold"
                >
                  <option value="RJ">RJ - Rio de Janeiro</option>
                  <option value="SP">SP - São Paulo</option>
                  <option value="MG">MG - Minas Gerais</option>
                  <option value="ES">ES - Espírito Santo</option>
                  <option value="PR">PR - Paraná</option>
                  <option value="SC">SC - Santa Catarina</option>
                  <option value="RS">RS - Rio Grande do Sul</option>
                  <option value="BA">BA - Bahia</option>
                  <option value="DF">DF - Distrito Federal</option>
                  <option value="Outro">Outro Estado</option>
                </select>
              </div>
            </div>
          </div>

          {/* BLOCO 3: EMPRESAS ADICIONAIS DO GUARDA-CHUVA (2 até N) COM RAE/CO INDIVIDUAL */}
          {totalEmpresas > 1 && empresasAdicionais.length > 0 && (
            <div className="border border-purple-200 rounded-2xl p-4 bg-slate-50/90 space-y-3">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Users size={14} className="text-primary" />
                Demais Empresas do Contrato (Preenchimento Individual)
              </span>
              <p className="text-[11px] text-slate-500">
                Cada empresa possui seu próprio código <strong>RAE / CO</strong> e identificação cadastral:
              </p>

              <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                {empresasAdicionais.map((emp, idx) => (
                  <div key={idx} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                    <span className="sm:col-span-1 text-xs font-bold text-purple-700">#{idx + 2}</span>
                    <input
                      type="text"
                      placeholder="Código RAE / CO"
                      value={emp.codigoRae}
                      onChange={(e) => handleEmpresaAdicionalChange(idx, 'codigoRae', e.target.value)}
                      className="sm:col-span-3 bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-primary font-medium"
                    />
                    <input
                      type="text"
                      placeholder={`Nome da Empresa ${idx + 2}`}
                      value={emp.nome}
                      onChange={(e) => handleEmpresaAdicionalChange(idx, 'nome', e.target.value)}
                      className="sm:col-span-4 bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-primary"
                    />
                    <input
                      type="text"
                      placeholder="CNPJ (opcional)"
                      value={emp.cnpj}
                      onChange={(e) => handleEmpresaAdicionalChange(idx, 'cnpj', e.target.value)}
                      className="sm:col-span-2 bg-slate-50 border border-slate-300 rounded-lg px-2 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-primary"
                    />
                    <input
                      type="text"
                      placeholder="WhatsApp"
                      value={emp.celular}
                      onChange={(e) => handleEmpresaAdicionalChange(idx, 'celular', maskPhone(e.target.value))}
                      className="sm:col-span-2 bg-slate-50 border border-slate-300 rounded-lg px-2 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-primary"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
            <span className="text-[11px] text-slate-500 font-medium">
              {totalEmpresas > 1 ? `Criará ${totalEmpresas} cards no Kanban` : 'Criará 1 card no Kanban'}
            </span>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 bg-slate-100 text-slate-600 font-semibold rounded-xl text-xs hover:bg-slate-200"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl text-xs shadow-md shadow-purple-500/20 flex items-center gap-1.5"
              >
                <Plus size={16} />
                <span>{totalEmpresas > 1 ? `Criar ${totalEmpresas} Demandas no Kanban` : 'Criar Demanda no Kanban'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </>
  );
}
