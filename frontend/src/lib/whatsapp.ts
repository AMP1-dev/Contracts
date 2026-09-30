import type { Project } from '../types/database';

export interface WhatsAppTemplateOption {
  id: 'convite' | 'cobranca_1' | 'cobranca_urgente' | 'lembrete' | 'retorno' | 'livre';
  title: string;
  subtitle: string;
  badge: string;
  badgeColor: string;
  iconName: string;
}

export const WHATSAPP_TEMPLATES: WhatsAppTemplateOption[] = [
  {
    id: 'convite',
    title: '1º Contato (Convite Inicial)',
    subtitle: 'Enviar link da agenda para primeiro agendamento',
    badge: '1º Contato',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    iconName: 'Send',
  },
  {
    id: 'cobranca_1',
    title: 'Cobrança (2º Contato - Sem Retorno)',
    subtitle: 'Cobrar cliente que não agendou após o primeiro contato',
    badge: 'Cobrança',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
    iconName: 'Clock',
  },
  {
    id: 'cobranca_urgente',
    title: 'Cobrança Urgente (Último Aviso)',
    subtitle: 'Aviso sobre encerramento do prazo de atendimento',
    badge: 'Urgente',
    badgeColor: 'bg-rose-100 text-rose-800 border-rose-300',
    iconName: 'AlertTriangle',
  },
  {
    id: 'lembrete',
    title: 'Lembrete de Encontro Agendado',
    subtitle: 'Confirmar horário e encontro online/presencial',
    badge: 'Lembrete',
    badgeColor: 'bg-sky-100 text-sky-800 border-sky-300',
    iconName: 'Calendar',
  },
  {
    id: 'retorno',
    title: 'Retorno / 2º Momento (Pós-Atendimento)',
    subtitle: 'Alinhar segunda etapa de retorno com cliente já atendido',
    badge: 'Retorno',
    badgeColor: 'bg-purple-100 text-purple-800 border-purple-300',
    iconName: 'RotateCcw',
  },
  {
    id: 'livre',
    title: 'Conversa Livre (Sem Mensagem Pronta)',
    subtitle: 'Abrir o chat do WhatsApp sem texto pré-preenchido',
    badge: 'Livre',
    badgeColor: 'bg-slate-100 text-slate-700 border-slate-300',
    iconName: 'MessageSquare',
  },
];

export function buildWhatsAppMessage(templateId: WhatsAppTemplateOption['id'], project: Partial<Project>): string {
  if (templateId === 'livre') return '';

  const clientName = project.nome_cliente || project.razao_social || 'Cliente';
  const programa = project.programa || 'Consultoria Empresarial';

  let calendar = 'https://calendar.app.google/skRSHv2QBUjY9ae16';
  try {
    const saved = localStorage.getItem('amp_company_config');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.calendarLink) calendar = parsed.calendarLink;
    }
  } catch (e) {}

  switch (templateId) {
    case 'convite':
      return `Olá ${clientName}, tudo bem? Espero lhe encontrar bem!\n\nSou Marco Antonio, consultor credenciado e estou entrando em contato para comunicar que estamos a um passo de marcar nossa consultoria (${programa}).\n\nSegue o link para que possa escolher uma data e horário para este nosso encontro:\n👉 ${calendar}\n\nÉ muito importante que agende uma data para darmos início ao nosso trabalho, espero e desejo muito que possa contribuir com a sua empresa.`;

    case 'cobranca_1':
      return `Olá ${clientName}, tudo bem?\n\nTentei contato anteriormente para agendarmos sua consultoria (${programa}), mas ainda não tivemos seu retorno.\n\nComo as datas da agenda são limitadas, peço a gentileza de escolher o seu melhor dia e horário pelo link abaixo:\n👉 ${calendar}\n\nCaso prefira agendar diretamente por aqui, basta me responder informando se tem preferência pelo período da manhã ou da tarde. Um abraço!`;

    case 'cobranca_urgente':
      return `Olá ${clientName}, tudo bem?\n\n⚠️ *Aviso Importante sobre sua Consultoria (${programa})*:\nO prazo oficial para a realização do seu atendimento está se aproximando do limite.\n\nPara garantir a sua consultoria sem risco de cancelamento, por favor acesse o link e reserve seu horário agora mesmo:\n👉 ${calendar}\n\nEstou à disposição para realizarmos um excelente trabalho na sua empresa!`;

    case 'lembrete':
      return `Olá ${clientName}, tudo bem?\n\nPassando para lembrar do nosso encontro de consultoria (${programa}).\n\nCaso o atendimento seja online, acesse no horário combinado. Se precisar de qualquer ajuste na data ou horário, por favor me avise com antecedência por aqui.\n\nAté breve!`;

    case 'retorno':
      return `Olá ${clientName}, tudo bem? Espero que esteja tudo ótimo!\n\nConforme conversamos em nossa consultoria (${programa}), estou entrando em contato para combinarmos nossa etapa de retorno e acompanhamento dos resultados da sua empresa.\n\nComo está sua disponibilidade esta semana para marcarmos esse bate-papo?`;

    default:
      return '';
  }
}

export function openWhatsApp(phone: string | null | undefined, message: string) {
  if (!phone) {
    alert('Telefone do cliente não cadastrado.');
    return;
  }
  const clean = phone.replace(/\D/g, '');
  if (!clean) {
    alert('Telefone inválido.');
    return;
  }
  const target = clean.length <= 11 && !clean.startsWith('55') ? `55${clean}` : clean;
  const url = message 
    ? `https://api.whatsapp.com/send?phone=${target}&text=${encodeURIComponent(message)}`
    : `https://api.whatsapp.com/send?phone=${target}`;
  window.open(url, '_blank');
}
