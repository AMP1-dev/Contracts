import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Mail, CheckCircle2, XCircle, Clock, FileText, Trash2, RefreshCw, Play } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface EmailProcessado {
  id: string;
  message_id: string;
  remetente: string | null;
  assunto: string | null;
  status: 'recebido' | 'processado' | 'erro';
  erro_detalhe: string | null;
  anexo_nome: string | null;
  criado_em: string;
}

const DEMO_EMAILS: EmailProcessado[] = [
  {
    id: 'email-os-07873',
    message_id: 'msg-07873',
    remetente: 'williampa@sebraesp.com.br',
    assunto: 'Ordem de Serviço nº 070873/2026 - Ericka Clemente dos Santos Nunes (R$ 170,00)',
    status: 'processado',
    erro_detalhe: null,
    anexo_nome: 'OS_070873_Ericka_Clemente_170.pdf',
    criado_em: new Date().toISOString(),
  },
  {
    id: 'email-os-071208',
    message_id: 'msg-071208',
    remetente: 'liviars@sebraesp.com.br',
    assunto: 'Ordem de Serviço nº 071208/2026 - SP0720261208 (9 Clientes Desmembrados - R$ 11.016,00)',
    status: 'processado',
    erro_detalhe: null,
    anexo_nome: 'OS_071208_SGF_2026_9_Clientes.pdf',
    criado_em: new Date().toISOString(),
  }
];

export function Inbox() {
  const [emails, setEmails] = useState<EmailProcessado[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchEmails = async () => {
    try {
      const { data, error } = await supabase
        .from('emails_processados')
        .select('*')
        .order('criado_em', { ascending: false })
        .limit(50);

      if (!error && data && data.length > 0) {
        setEmails(data as EmailProcessado[]);
      } else {
        setEmails(DEMO_EMAILS);
      }
    } catch (e) {
      setEmails(DEMO_EMAILS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmails();
  }, []);

  const handleProcessPdf = async (emailProcessadoId: string) => {
    setProcessingId(emailProcessadoId);
    try {
      const targetEmail = emails.find(e => e.id === emailProcessadoId);
      if (!targetEmail) return;

      const res = await fetch('/api/poll-emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          reprocessMessageId: targetEmail.message_id,
          force: true 
        })
      });

      if (!res.ok) {
        throw new Error(`Erro na API (${res.status}): ${res.statusText}`);
      }

      const data = await res.json();
      if (!data.ok) {
        throw new Error(data.error || 'Falha ao processar e-mail');
      }

      await fetchEmails();
      alert('✅ Demanda processada com sucesso via IA! Os dados do cliente, RAE e contrato foram salvos no Kanban.');
    } catch (err: any) {
      console.error('Erro ao processar PDF:', err);
      alert('Erro ao processar PDF: ' + err.message);
    } finally {
      setProcessingId(null);
    }
  };

  const handleDeleteEmail = async (emailId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Deseja remover este e-mail da Caixa de Entrada do app? Se você clicar em "Sincronizar Agora", ele poderá ser relido da sua caixa de e-mails.')) {
      return;
    }
    try {
      const { error } = await supabase
        .from('emails_processados')
        .delete()
        .eq('id', emailId);

      if (error) throw error;
      setEmails(prev => prev.filter(item => item.id !== emailId));
    } catch (err: any) {
      alert('Erro ao remover e-mail da caixa: ' + err.message);
    }
  };

  const handleSyncEmails = async () => {
    try {
      setLoading(true);
      // Dispara o robô de sincronização via API do próprio domínio com verificação recente
      const res = await fetch('/api/poll-emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force: true })
      });

      if (!res.ok) {
        throw new Error(`Erro na API (${res.status}): ${res.statusText}`);
      }

      const data = await res.json();
      if (!data.ok) {
        if (data.requiresConfig) {
          alert('⚠️ ' + data.message);
          return;
        }
        throw new Error(data.error || 'Erro desconhecido ao processar e-mails');
      }

      // Busca os emails novos que o robô acabou de salvar
      await fetchEmails();
      alert(`✅ ${data.message || 'Sincronização concluída com sucesso!'}`);
    } catch (err: any) {
      console.error(err);
      alert('Erro ao sincronizar e-mails: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto w-full">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        
        {/* Inbox Header */}
        <div className="border-b border-slate-200 bg-slate-50/50 p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h2 className="text-base sm:text-lg font-semibold text-slate-800 flex items-center gap-2 truncate">
              <Mail className="text-primary shrink-0" size={20} />
              <span>Caixa de Entrada (Demandas & Contratos Sebrae)</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Ordens de Serviço e Demandas capturadas automaticamente pelo robô IA.
            </p>
          </div>
          <div className="flex gap-2 items-center shrink-0 w-full sm:w-auto justify-between sm:justify-end">
            <span className="bg-white border border-slate-200 text-slate-600 text-xs font-medium px-3 py-1.5 rounded-lg shadow-sm">
              {emails.filter(e => e.status === 'recebido').length} Pendentes
            </span>
            <button 
              onClick={handleSyncEmails}
              className="bg-primary text-white text-xs font-medium px-3 py-1.5 rounded-lg shadow-sm hover:bg-primary-hover transition-colors flex items-center gap-1.5 shrink-0"
            >
              <Clock size={14} /> Sincronizar Agora
            </button>
          </div>
        </div>

        {/* Inbox List */}
        <div className="divide-y divide-slate-100">
          {emails.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <Mail size={40} className="mx-auto mb-3 opacity-20" />
              Nenhum e-mail processado ainda.
            </div>
          ) : (
            emails.map((email) => (
              <div key={email.id} className="p-4 hover:bg-slate-50 transition-colors flex gap-4 items-start group">
                
                {/* Status Icon */}
                <div className="mt-1 flex-shrink-0">
                  {email.status === 'recebido' && <Clock className="text-amber-500" size={20} />}
                  {email.status === 'processado' && <CheckCircle2 className="text-emerald-500" size={20} />}
                  {email.status === 'erro' && <XCircle className="text-rose-500" size={20} />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <h3 className="text-sm font-semibold text-slate-800 truncate">
                        {email.remetente || 'Remetente Desconhecido'}
                      </h3>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                        email.status === 'processado' 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                          : email.status === 'erro'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {email.status === 'processado' ? 'Processado no Kanban' : email.status === 'erro' ? 'Erro' : 'Pendente'}
                      </span>
                    </div>
                    <span className="text-xs text-slate-400 whitespace-nowrap">
                      {format(new Date(email.criado_em), "dd MMM, HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                  
                  <p className="text-sm text-slate-600 truncate font-medium">
                    {email.assunto || 'Sem Assunto'}
                  </p>
                  
                  {email.erro_detalhe && (
                    <p className="text-xs text-rose-500 mt-1 bg-rose-50 px-2 py-1 rounded-md inline-block">
                      Erro: {email.erro_detalhe}
                    </p>
                  )}

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    {email.anexo_nome ? (
                      <div className="flex items-center gap-1.5 bg-white border border-slate-200 shadow-sm rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-600">
                        <FileText size={14} className="text-primary shrink-0" />
                        <span className="truncate max-w-[280px]">{email.anexo_nome}</span>
                      </div>
                    ) : <div />}

                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleProcessPdf(email.id)}
                        disabled={processingId === email.id}
                        title={email.status === 'processado' ? 'Reprocessar e reenviar ao Kanban' : 'Processar PDF e enviar ao Kanban'}
                        className="text-xs font-semibold text-white bg-primary hover:bg-primary-hover px-3 py-1.5 rounded-md shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {processingId === email.id ? (
                          <>
                            <RefreshCw size={13} className="animate-spin" /> Processando IA...
                          </>
                        ) : email.status === 'processado' ? (
                          <>
                            <RefreshCw size={13} /> Reprocessar no Kanban
                          </>
                        ) : (
                          <>
                            <Play size={13} /> Processar PDF
                          </>
                        )}
                      </button>

                      <button
                        onClick={(e) => handleDeleteEmail(email.id, e)}
                        title="Remover este e-mail da caixa do app (permite reler do servidor)"
                        className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-1.5 rounded-md transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
