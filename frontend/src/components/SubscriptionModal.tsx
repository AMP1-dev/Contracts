import React, { useState } from 'react';
import { CreditCard, CheckCircle2, Download, Copy, AlertTriangle, ShieldCheck, X, FileText, Lock, Sparkles, RefreshCw } from 'lucide-react';
import type { UserSession, BoletoItem } from '../types/database';

interface SubscriptionModalProps {
  session: UserSession;
  onClose: () => void;
  onUpdateSession: (updated: UserSession) => void;
}

export function SubscriptionModal({ session, onClose, onUpdateSession }: SubscriptionModalProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Generate 12 boletos for 1st year if not generated yet
  const boletos: BoletoItem[] = session.boletosEmitidos || Array.from({ length: 12 }).map((_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() + i);
    const dateStr = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    return {
      numeroParcela: i + 1,
      vencimento: `10/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`,
      valor: 49.90,
      status: i === 0 ? 'pago' : (i === 1 ? 'pendente' : 'pendente'),
      linhaDigitavel: `23793.38128 60007.827101 92000.123456 1 ${9000 + i}0000004990`,
    };
  });

  const handleCopyCode = (code: string, index: number) => {
    navigator.clipboard.writeText(code);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleTogglePaymentStatus = (parcelaIndex: number) => {
    const updatedBoletos = [...boletos];
    const current = updatedBoletos[parcelaIndex].status;
    updatedBoletos[parcelaIndex].status = current === 'pago' ? 'pendente' : 'pago';
    
    // Check if any overdue/unpaid blocks access
    const anyAtrasado = updatedBoletos.some((b, idx) => idx > 0 && b.status === 'atrasado');

    onUpdateSession({
      ...session,
      subscriptionStatus: anyAtrasado ? 'suspenso' : 'ativo',
      boletosEmitidos: updatedBoletos,
    });
  };

  const handleSimulateOverdue = () => {
    const updatedBoletos = boletos.map((b, i) => i === 1 ? { ...b, status: 'atrasado' as const } : b);
    onUpdateSession({
      ...session,
      subscriptionStatus: 'suspenso',
      boletosEmitidos: updatedBoletos,
    });
  };

  const handleClearOverdue = () => {
    const updatedBoletos = boletos.map(b => ({ ...b, status: 'pago' as const }));
    onUpdateSession({
      ...session,
      subscriptionStatus: 'ativo',
      boletosEmitidos: updatedBoletos,
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-[90] flex items-center justify-center p-4 overflow-y-auto font-sans animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl max-w-3xl w-full overflow-hidden flex flex-col my-auto max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="bg-slate-900 text-white p-6 flex items-center justify-between border-b border-slate-800 relative">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center text-purple-300">
              <CreditCard size={20} />
            </div>
            <div>
              <h2 className="text-lg font-extrabold tracking-tight">Gestão de Assinatura & Boletos</h2>
              <p className="text-xs text-slate-400">Carnê do 1º Ano Promocional (12 Parcelas)</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          
          {/* Active Plan & Plan Selection Overview Card */}
          <div className="bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 text-white rounded-2xl p-5 border border-purple-800/40 shadow-xl relative overflow-hidden space-y-4">
            <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600/20 rounded-full blur-3xl pointer-events-none"></div>

            <div className="flex items-center justify-between border-b border-purple-800/60 pb-3">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold rounded-md">
                <Sparkles size={12} />
                <span>30 Dias Grátis Ativos + Escolha a Modalidade</span>
              </div>
              <span className="text-xs text-purple-300 font-semibold">Sem compromisso nos primeiros 30 dias</span>
            </div>

            {/* Plan Cards Comparison */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              
              {/* Option 1: Plano Básico (R$ 19,90/mês) */}
              <div className="bg-slate-900/80 border border-purple-500/40 p-4 rounded-xl space-y-2 relative">
                <span className="text-[10px] font-extrabold text-purple-300 uppercase tracking-wider block">Plano Básico (Baixo Volume)</span>
                <h4 className="text-2xl font-black text-white">R$ 19,90 <span className="text-xs font-normal text-slate-400">/mês no 1º Ano</span></h4>
                <ul className="text-[11px] text-slate-300 space-y-1 pt-1">
                  <li>• <strong>Até 5 OSs (PDFs)</strong> mensais</li>
                  <li>• Até 5 clientes por Ordem de Serviço</li>
                  <li>• Leitura de PDFs por IA e Kanban</li>
                </ul>
              </div>

              {/* Option 2: Plano Profissional (R$ 49,90/mês) */}
              <div className="bg-purple-900/40 border-2 border-purple-400 p-4 rounded-xl space-y-2 relative shadow-lg">
                <span className="absolute -top-2.5 right-3 bg-emerald-500 text-slate-950 font-black text-[9px] px-2 py-0.5 rounded-full uppercase">
                  Recomendado
                </span>
                <span className="text-[10px] font-extrabold text-emerald-300 uppercase tracking-wider block">Plano Profissional (Ilimitado)</span>
                <h4 className="text-2xl font-black text-white">R$ 49,90 <span className="text-xs font-normal text-slate-300">/mês no 1º Ano</span></h4>
                <ul className="text-[11px] text-purple-100 space-y-1 pt-1">
                  <li>• <strong>Demandas & OSs Ilimitadas</strong></li>
                  <li>• Clientes ilimitados por Ordem de Serviço</li>
                  <li>• Suporte prioritário e robô IA ilimitado</li>
                </ul>
              </div>

            </div>
          </div>

          {/* Test Overdue Simulation Control */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 text-xs text-slate-700">
              <AlertTriangle size={18} className="text-amber-500 shrink-0" />
              <span>
                <strong>Testar Bloqueio de Acesso:</strong> Simule a falta de pagamento de boleto para testar a tela de suspensão.
              </span>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={handleSimulateOverdue}
                className="flex-1 sm:flex-initial px-3 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-700 text-xs font-bold rounded-xl transition-colors"
              >
                Simular Inadimplência
              </button>
              <button
                onClick={handleClearOverdue}
                className="flex-1 sm:flex-initial px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 text-xs font-bold rounded-xl transition-colors"
              >
                Quitar Tudo (Ativar)
              </button>
            </div>
          </div>

          {/* Boletos Table / Carnê List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <FileText size={16} className="text-purple-600" />
                <span>Carnê de 12 Boletos (1º Ano Promocional)</span>
              </h4>
              <button
                onClick={() => alert("Baixando PDF completo do Carnê com 12 Boletos...")}
                className="text-xs text-purple-700 font-bold hover:underline inline-flex items-center gap-1"
              >
                <Download size={14} />
                <span>Baixar Carnê Completo (PDF)</span>
              </button>
            </div>

            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs bg-white">
              <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                {boletos.map((b, idx) => (
                  <div key={idx} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-xl font-black text-xs flex items-center justify-center ${
                        b.status === 'pago' ? 'bg-emerald-100 text-emerald-700' : (b.status === 'atrasado' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600')
                      }`}>
                        {b.numeroParcela}º
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800 text-xs">Parcela {b.numeroParcela} de 12</span>
                          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                            b.status === 'pago' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : (b.status === 'atrasado' ? 'bg-rose-100 text-rose-800 border border-rose-200 animate-pulse' : 'bg-amber-100 text-amber-800 border border-amber-200')
                          }`}>
                            {b.status === 'pago' ? 'PAGO ✅' : (b.status === 'atrasado' ? 'ATRASADO ⚠️' : 'PENDENTE ⏳')}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Vencimento: <strong className="text-slate-700">{b.vencimento}</strong> • Valor: <strong className="text-slate-800">R$ {b.valor.toFixed(2).replace('.', ',')}</strong>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 justify-end">
                      {b.linhaDigitavel && (
                        <button
                          onClick={() => handleCopyCode(b.linhaDigitavel!, idx)}
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold rounded-lg transition-colors inline-flex items-center gap-1"
                          title="Copiar Linha Digitável"
                        >
                          <Copy size={12} />
                          <span>{copiedIndex === idx ? 'Copiado!' : 'Copiar Pix/Código'}</span>
                        </button>
                      )}

                      <button
                        onClick={() => handleTogglePaymentStatus(idx)}
                        className={`px-3 py-1.5 text-[11px] font-bold rounded-lg transition-colors ${
                          b.status === 'pago'
                            ? 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                            : 'bg-purple-600 text-white hover:bg-purple-700 shadow-xs'
                        }`}
                      >
                        {b.status === 'pago' ? 'Marcar Pendente' : 'Confirmar Pago'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <ShieldCheck size={16} className="text-emerald-600" />
            <span>Assinatura com garantia AMP do Brasil</span>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl shadow-xs"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
}
