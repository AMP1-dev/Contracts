export type ProjectStatus = 
  | 'novo_contrato'
  | 'contato_inicial'
  | 'agendamento'
  | 'atendimento_realizado'
  | 'relatorio_elaboracao'
  | 'relatorio_enviado'
  | 'nf_pendente'
  | 'pagamento_aguardando'
  | 'concluido';

export interface Project {
  id: string;
  consultor_id: string | null;
  codigo_rae: string | null;
  status: ProjectStatus;
  
  // Cliente
  nome_cliente: string | null;
  razao_social: string | null;
  nome_fantasia: string | null;
  cnpj: string | null;
  cpf: string | null;
  telefone: string | null;
  celular: string | null;
  email_cliente: string | null;
  municipio: string | null;
  estado: string | null;
  endereco: string | null;
  
  // Atendimento
  programa: string | null;
  solucao_contratada: string | null;
  objetivo_atendimento: string | null;
  horas_contratadas: number | null;
  horas_realizadas: number;
  data_prevista_inicio: string | null;
  data_prevista_fim: string | null;
  modalidade: string | null;

  // Financeiro e Extras
  valor_consultoria: number | null;
  observacoes: string | null;
  dados_extra: any;

  criado_em: string;
  atualizado_em: string;
}

export interface KanbanColumnDef {
  id: ProjectStatus;
  title: string;
  color: string;
}

export const KANBAN_COLUMNS: KanbanColumnDef[] = [
  { id: 'novo_contrato', title: 'Novo Contrato', color: 'bg-indigo-500' },
  { id: 'contato_inicial', title: 'Contato Inicial', color: 'bg-sky-500' },
  { id: 'agendamento', title: 'Agendamento', color: 'bg-amber-500' },
  { id: 'atendimento_realizado', title: 'Atend. Realizado', color: 'bg-fuchsia-500' },
  { id: 'relatorio_elaboracao', title: 'Fazendo Relatório', color: 'bg-pink-500' },
  { id: 'relatorio_enviado', title: 'Relatório Enviado', color: 'bg-purple-500' },
  { id: 'nf_pendente', title: 'NF Pendente', color: 'bg-rose-500' },
  { id: 'pagamento_aguardando', title: 'Aguard. Pagamento', color: 'bg-orange-500' },
  { id: 'concluido', title: 'Concluído', color: 'bg-emerald-500' },
];

export interface UserSession {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'consultor';
  createdAt: string;
  trialStartDate?: string;
  trialDaysRemaining?: number;
  plan?: 'mensal' | 'anual' | 'trial';
}

export interface CompanyConfig {
  logoUrl: string | null;
  companyName: string;
  primaryColor: string;
  adminEmail: string;
}

