import React, { useState } from 'react';
import { Lock, AlertOctagon, FileText, Copy, ShieldAlert, CheckCircle2, PhoneCall } from 'lucide-react';
import type { UserSession } from '../types/database';

interface SuspendedAccessModalProps {
  session: UserSession;
  onReactivateAccess: () => void;
}

export function SuspendedAccessModal({ session, onReactivateAccess }: SuspendedAccessModalProps) {
  const [copied, setCopied] = useState(false);
  const sampleCode = "23793.38128 60007.827101 92000.123456 1 950000004990";

  const handleCopy = () => {
    navigator.clipboard.writeText(sampleCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-lg z-[120] flex items-center justify-center p-4 overflow-y-auto font-sans animate-fadeIn">
      <div className="bg-white border border-rose-200 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden my-auto">
        
        {/* Header Warning */}
        <div className="bg-gradient-to-r from-rose-600 to-red-700 text-white p-6 text-center relative overflow-hidden">
          <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center mx-auto mb-3 shadow-lg">
            <Lock size={32} className="text-white" />
          </div>
          <span className="inline-block px-3 py-1 bg-white/20 rounded-full text-white text-[10px] font-extrabold uppercase tracking-wider mb-2">
            Aviso de Cobrança & Acesso
          </span>
          <h2 className="text-2xl font-black tracking-tight">Acesso Suspenso</h2>
          <p className="text-xs text-rose-100 mt-1 max-w-xs mx-auto">
            Identificamos pendência financeira na assinatura de <strong className="text-white">{session.companyName || session.name}</strong>.
          </p>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-xs text-rose-900 space-y-2">
            <div className="flex items-center gap-2 font-bold text-rose-950">
              <ShieldAlert size={18} className="text-rose-600 shrink-0" />
              <span>Boleto em Atraso (Plano Promocional 1º Ano)</span>
            </div>
            <p className="text-slate-600 text-[11px] leading-relaxed">
              O acesso aos módulos do Kanban, Robô IA de PDFs e Caixa de Entrada foi bloqueado devido ao atraso no boleto mensal de <strong className="text-slate-800">R$ 49,90</strong>.
            </p>
          </div>

          {/* Boleto Pay Box */}
          <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700">Parcela Pendente:</span>
              <span className="font-black text-rose-600 text-sm">R$ 49,90</span>
            </div>

            <div className="bg-white border border-slate-300 rounded-xl p-3 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">Linha Digitável / Código Pix:</span>
              <code className="text-xs font-mono font-bold text-slate-800 break-all block">{sampleCode}</code>
            </div>

            <button
              onClick={handleCopy}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2"
            >
              <Copy size={14} />
              <span>{copied ? 'Código Copiado com Sucesso!' : 'Copiar Linha Digitável / Pix'}</span>
            </button>
          </div>

          <div className="text-[11px] text-slate-500 text-center space-y-1">
            <p>Após a quitação do boleto, a liberação do sistema é automática.</p>
            <p className="flex items-center justify-center gap-1 text-slate-400">
              <PhoneCall size={12} />
              <span>Dúvidas ou suporte: <strong>suporte@amp.ia.br</strong></span>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 text-center">
          <button
            onClick={onReactivateAccess}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <CheckCircle2 size={16} />
            <span>Simular Pagamento Efetuado (Liberar Sistema)</span>
          </button>
        </div>

      </div>
    </div>
  );
}
