import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Mail, CheckCircle2, XCircle, Clock, FileText } from 'lucide-react';
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

export function Inbox() {
  const [emails, setEmails] = useState<EmailProcessado[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchEmails = async () => {
    const { data, error } = await supabase
      .from('emails_processados')
      .select('*')
      .order('criado_em', { ascending: false })
      .limit(50);

    if (!error && data) {
      setEmails(data as EmailProcessado[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchEmails();
  }, []);

  const handleProcessPdf = async (emailProcessadoId: string) => {
    setProcessingId(emailProcessadoId);
    try {
      const { error } = await supabase.functions.invoke('process-pdf', {
        body: { emailProcessadoId }
      });

      if (error) {
        throw new Error(error.message);
      }
      
      // Refresh list to show success or error
      await fetchEmails();
      alert('PDF processado com sucesso! Verifique o Kanban.');
    } catch (err: any) {
      console.error(err);
      alert('Erro ao processar PDF: ' + err.message);
      await fetchEmails(); // Refresh to show error state
    } finally {
      setProcessingId(null);
    }
  };

  const handleSyncEmails = async () => {
    try {
      // Refresh local list first to show loading state if needed
      setLoading(true);
      // Dispara o robô de e-mails na nuvem
      const { error } = await supabase.functions.invoke('poll-emails');
      if (error) throw new Error(error.message);
      
      // Busca os emails novos que o robô acabou de salvar
      await fetchEmails();
      alert('Sincronização concluída! A caixa foi atualizada.');
    } catch (err: any) {
      console.error(err);
      alert('Erro ao sincronizar e-mails: ' + err.message);
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
        <div className="border-b border-slate-200 bg-slate-50/50 p-6 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <Mail className="text-primary" size={20} />
              Caixa de Entrada (Contratos)
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Ordens de Serviço capturadas automaticamente pelo robô.
            </p>
          </div>
          <div className="flex gap-2 items-center">
            <span className="bg-white border border-slate-200 text-slate-600 text-xs font-medium px-3 py-1.5 rounded-lg shadow-sm">
              {emails.filter(e => e.status === 'recebido').length} Pendentes
            </span>
            <button 
              onClick={handleSyncEmails}
              className="bg-primary text-white text-xs font-medium px-3 py-1.5 rounded-lg shadow-sm hover:bg-primary-hover transition-colors flex items-center gap-1.5"
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
                    <h3 className="text-sm font-semibold text-slate-800 truncate">
                      {email.remetente || 'Remetente Desconhecido'}
                    </h3>
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

                  {email.anexo_nome && (
                    <div className="mt-3 flex items-center gap-2">
                      <div className="flex items-center gap-1.5 bg-white border border-slate-200 shadow-sm rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-600 cursor-pointer hover:border-primary/50 transition-colors">
                        <FileText size={14} className="text-primary" />
                        <span className="truncate max-w-[200px]">{email.anexo_nome}</span>
                      </div>
                      
                      {email.status === 'recebido' && (
                        <button 
                          onClick={() => handleProcessPdf(email.id)}
                          disabled={processingId === email.id}
                          className="text-xs font-semibold text-white bg-primary hover:bg-primary-hover px-3 py-1.5 rounded-md shadow-sm transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {processingId === email.id ? 'Processando IA...' : 'Processar PDF'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
