import React, { useState } from 'react';
import { ShieldCheck, Check, FileText, AlertCircle, Sparkles, Lock } from 'lucide-react';
import type { UserSession } from '../types/database';

interface TermsModalProps {
  session: UserSession;
  onAcceptTerms: () => void;
}

export function TermsModal({ session, onAcceptTerms }: TermsModalProps) {
  const [hasChecked, setHasChecked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = () => {
    if (!hasChecked) return;
    setIsSubmitting(true);
    setTimeout(() => {
      onAcceptTerms();
      setIsSubmitting(false);
    }, 400);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[100] flex items-center justify-center p-4 overflow-y-auto font-sans animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl max-w-xl w-full overflow-hidden flex flex-col my-auto">
        
        {/* Header */}
        <div className="bg-slate-900 text-white p-6 relative overflow-hidden">
          <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-purple-600/30 rounded-full blur-2xl pointer-events-none"></div>
          
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center text-purple-300 shrink-0">
              <FileText size={24} />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[10px] font-extrabold rounded-md uppercase tracking-wider mb-1">
                <Sparkles size={12} />
                <span>Oferta Especial de Lançamento</span>
              </div>
              <h2 className="text-xl font-extrabold tracking-tight">Termos de Assinatura & Aceite de Plano</h2>
            </div>
          </div>
          
          <p className="text-xs text-slate-300 mt-3">
            Seja bem-vindo(a) ao CRM Consultorias, <span className="font-bold text-white">{session.name}</span>! Por favor, confirme as condições da sua assinatura abaixo para liberar seu primeiro acesso.
          </p>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 flex-1 overflow-y-auto max-h-[60vh]">
          
          {/* Price Box Comparison */}
          <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <span className="text-[11px] font-bold text-purple-700 uppercase tracking-wide">Preço Promocional do 1º Ano</span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-2xl font-black text-slate-900">R$ 49,90<span className="text-xs font-semibold text-slate-500">/mês</span></span>
                <span className="text-xs text-slate-400 line-through">R$ 99,90/mês</span>
              </div>
              <p className="text-[11px] text-purple-800 font-medium mt-1">Economia de R$ 600,00 nos 12 primeiros meses de uso.</p>
            </div>

            <div className="bg-purple-600 text-white px-3 py-1.5 rounded-xl font-bold text-xs shadow-md shrink-0">
              50% OFF no 1º Ano
            </div>
          </div>

          {/* Detailed Clauses */}
          <div className="space-y-3 text-xs text-slate-600">
            <h3 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">Resumo das Condições Contratuais:</h3>
            
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200/70">
              <Check size={16} className="text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-800">1. Valor do 1º Ano (Meses 1 ao 12):</span>
                <p className="text-slate-500 mt-0.5">Sua assinatura terá o valor exclusivo de R$ 49,90 mensais durante os primeiros 12 meses.</p>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200/70">
              <Check size={16} className="text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-800">2. Renovação a partir do 2º Ano (Mês 13 em diante):</span>
                <p className="text-slate-500 mt-0.5">A partir do 13º mês de uso, a assinatura será renovada pelo valor regular de R$ 99,90/mês.</p>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50/70 border border-amber-200/80 text-amber-900">
              <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-amber-950">3. Boletos Mensais & Liberação de Acesso:</span>
                <p className="text-amber-800 mt-0.5">
                  Será gerado um carnê com os 12 boletos do 1º ano. O envio é feito via e-mail e disponibilizado no sistema. O não pagamento do boleto vigente poderá resultar na suspensão temporária do acesso.
                </p>
              </div>
            </div>
          </div>

          {/* Checkbox Acceptance */}
          <label className="flex items-start gap-3 p-3.5 rounded-2xl border-2 border-purple-200 bg-purple-50/40 hover:bg-purple-50 transition-colors cursor-pointer select-none">
            <input
              type="checkbox"
              checked={hasChecked}
              onChange={(e) => setHasChecked(e.target.checked)}
              className="w-5 h-5 rounded-lg text-purple-600 border-slate-300 focus:ring-purple-500 mt-0.5 cursor-pointer shrink-0"
            />
            <span className="text-xs text-slate-700 font-medium leading-relaxed">
              Li, entendi e <strong className="text-purple-900">aceito os termos da promoção de R$ 49,90/mês no 1º ano</strong> e a renovação por R$ 99,90/mês a partir do 2º ano, concordando com as condições de pagamento dos boletos mensais.
            </span>
          </label>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
            <Lock size={13} />
            <span>Ambiente Seguro AMP</span>
          </div>

          <button
            onClick={handleConfirm}
            disabled={!hasChecked || isSubmitting}
            className={`px-6 py-3 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 ${
              hasChecked && !isSubmitting
                ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-600/30 active:scale-98 cursor-pointer'
                : 'bg-slate-300 text-slate-500 cursor-not-allowed'
            }`}
          >
            <ShieldCheck size={16} />
            <span>{isSubmitting ? 'Validando...' : 'Aceitar Termos e Acessar o Sistema 🚀'}</span>
          </button>
        </div>

      </div>
    </div>
  );
}
