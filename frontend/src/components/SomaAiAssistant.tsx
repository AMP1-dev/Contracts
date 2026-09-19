import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Mic, MicOff, Wand2, Key, CheckCircle2, RotateCcw, FileText, ChevronDown, ChevronUp, Bot } from 'lucide-react';
import { generateSomaReport, type GeneratorContext } from '../lib/somaAiGenerator';

interface SomaAiAssistantProps {
  clientContext: {
    nome_cliente?: string;
    razao_social?: string;
    solucao_contratada?: string;
    programa?: string;
    consultor?: string;
  };
  onApplyReport: (report: {
    apontamentos_cliente: string;
    diagnostico_consultor: string;
    resumo_assuntos: string;
    encaminhamentos_recomendacoes: string;
  }) => void;
}

export function SomaAiAssistant({ clientContext, onApplyReport }: SomaAiAssistantProps) {
  const [briefing, setBriefing] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [showApiKeySettings, setShowApiKeySettings] = useState(false);

  // Chave e Provedor de IA
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('soma_ai_api_key') || '');
  const [aiProvider, setAiProvider] = useState<'auto' | 'openai' | 'gemini'>(() => {
    return (localStorage.getItem('soma_ai_provider') as any) || 'auto';
  });

  // Referência para o reconhecimento de fala
  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<any>(null);

  // Inicializa API de Reconhecimento de Voz do Navegador
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'pt-BR';

      recognition.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        if (event.results[event.results.length - 1].isFinal) {
          setBriefing((prev) => (prev ? `${prev} ${currentTranscript.trim()}` : currentTranscript.trim()));
        }
      };

      recognition.onerror = (event: any) => {
        console.error('Erro no reconhecimento de voz:', event.error);
        if (event.error !== 'no-speech') {
          setErrorMsg(`Microfone: ${event.error === 'not-allowed' ? 'Permissão de microfone negada no navegador.' : event.error}`);
        }
        stopRecording();
      };

      recognition.onend = () => {
        setIsRecording(false);
        clearInterval(timerRef.current);
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // ignore
        }
      }
      clearInterval(timerRef.current);
    };
  }, []);

  const toggleRecording = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Seu navegador não possui suporte nativo ao reconhecimento de voz. Recomendamos usar o Google Chrome ou Microsoft Edge.');
      return;
    }

    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const startRecording = () => {
    setErrorMsg('');
    try {
      recognitionRef.current?.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime((t) => t + 1);
      }, 1000);
    } catch (e: any) {
      console.warn('Erro ao iniciar gravação:', e);
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    try {
      recognitionRef.current?.stop();
    } catch (e) {
      // ignore
    }
    setIsRecording(false);
    clearInterval(timerRef.current);
  };

  const handleSaveApiSettings = () => {
    localStorage.setItem('soma_ai_api_key', apiKey.trim());
    localStorage.setItem('soma_ai_provider', aiProvider);
    setSuccessMsg('Configurações de IA salvas com sucesso!');
    setShowApiKeySettings(false);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleGenerate = async () => {
    if (!briefing.trim()) {
      setErrorMsg('Digite ou grave um áudio com o resumo do atendimento antes de gerar.');
      return;
    }

    if (isRecording) {
      stopRecording();
    }

    setErrorMsg('');
    setIsGenerating(true);

    try {
      const context: GeneratorContext = {
        ...clientContext,
        apiKey: apiKey.trim(),
        provider: aiProvider,
      };

      const result = await generateSomaReport(briefing, context);
      onApplyReport(result);
      setSuccessMsg('✨ Relatório gerado com sucesso! Os 4 campos oficiais foram preenchidos.');
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err: any) {
      console.error('Erro na geração:', err);
      setErrorMsg(err.message || 'Falha ao processar resumo.');
    } finally {
      setIsGenerating(false);
    }
  };

  const loadExample = () => {
    const exampleText = `Estela é sócia de a padaria junto com o marido, tem dificuldade aí, inclusive de relacionamento devido à situação da empresa familiar. A filha também ajuda, tenta trabalhar com o máximo de controle, fizeram reformas atualmente, tem um sistema simples para gestão, mas também não tinha conhecimento do gerenciamento sobre fluxo de caixa, ponto de equilíbrio, DRE, margem de lucro e os outros controles que nós oferecemos dentro da DR Online. A empresa está bem localizada, tem um movimento bom e tenta se manter e organizar no mercado para melhorar ainda mais a sua estrutura.`;
    setBriefing(exampleText);
    setErrorMsg('');
  };

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="bg-gradient-to-br from-purple-50/90 via-indigo-50/60 to-white border-2 border-purple-200/80 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3.5 my-2">
      {/* Cabeçalho do Assistente */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-purple-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold shadow-inner">
            <Sparkles size={18} className="animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs sm:text-sm font-extrabold text-slate-800">
                Assistente de IA & Voz: Gerador de Relatório SOMA
              </h4>
              <span className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shadow-xs">
                Master / Premium
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Grave o áudio do atendimento ou digite suas anotações brutas para preencher automaticamente os 4 blocos oficiais.
            </p>
          </div>
        </div>

        {/* Botão de Chave de IA */}
        <button
          type="button"
          onClick={() => setShowApiKeySettings(!showApiKeySettings)}
          className="text-xs text-purple-700 hover:text-purple-900 bg-purple-100/70 hover:bg-purple-100 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 font-medium transition-colors"
          title="Configurar Chave OpenAI / Gemini"
        >
          <Key size={13} />
          <span>Configurar IA</span>
          {showApiKeySettings ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>
      </div>

      {/* Painel Expansível de Configurações de IA */}
      {showApiKeySettings && (
        <div className="bg-white/80 border border-purple-200 rounded-xl p-3.5 space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-700 flex items-center gap-1.5">
              <Bot size={14} className="text-primary" /> Motor de Inteligência Artificial
            </span>
            <span className="text-[11px] text-slate-500">
              (Opcional: o sistema já inclui motor integrado gratuito)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Provedor</label>
              <select
                value={aiProvider}
                onChange={(e) => setAiProvider(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800"
              >
                <option value="auto">Automático / Integrado (Recomendado)</option>
                <option value="openai">OpenAI (ChatGPT / GPT-4o-mini)</option>
                <option value="gemini">Google Gemini (1.5 Flash)</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Chave de API (OpenAI ou Gemini - opcional)
              </label>
              <div className="flex gap-2">
                <input
                  type="password"
                  placeholder="sk-... ou AIza..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="flex-1 bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-primary"
                />
                <button
                  type="button"
                  onClick={handleSaveApiSettings}
                  className="bg-primary hover:bg-primary-hover text-white px-3 py-1.5 rounded-lg font-semibold text-xs transition-colors"
                >
                  Salvar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Caixa de Texto do Briefing / Transcrição com Botão de Microfone */}
      <div className="relative">
        <textarea
          rows={3}
          value={briefing}
          onChange={(e) => setBriefing(e.target.value)}
          placeholder="Exemplo: 'Estela é sócia da padaria com o marido, a filha ajuda, tem bom movimento e fizeram reforma. Falamos sobre fluxo de caixa, DRE, ponto de equilíbrio e margem de lucro...' ou clique no botão de microfone abaixo para falar!"
          className={`w-full rounded-xl p-3 text-xs text-slate-800 border transition-all focus:outline-none ${
            isRecording
              ? 'bg-rose-50/50 border-rose-400 ring-2 ring-rose-200'
              : 'bg-white border-purple-200 focus:border-primary focus:ring-1 focus:ring-primary/20'
          }`}
        />

        {/* Indicador Flutuante de Gravação em Tempo Real */}
        {isRecording && (
          <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 bg-rose-600 text-white px-2.5 py-1 rounded-full text-[11px] font-bold shadow-md animate-pulse">
            <span className="w-2 h-2 rounded-full bg-white animate-ping" />
            <span>Gravando: {formatTimer(recordingTime)}</span>
          </div>
        )}
      </div>

      {/* Barra de Ações: Microfone, Gerar com IA, Exemplo e Limpar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
        <div className="flex items-center gap-2">
          {/* Botão de Gravação de Voz */}
          <button
            type="button"
            onClick={toggleRecording}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-xs ${
              isRecording
                ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-500/30 animate-bounce'
                : 'bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 hover:border-rose-300'
            }`}
          >
            {isRecording ? <MicOff size={16} /> : <Mic size={16} className="text-rose-500" />}
            <span>{isRecording ? 'Parar Gravação' : 'Gravar Áudio'}</span>
          </button>

          {/* Carregar Exemplo do Usuário */}
          <button
            type="button"
            onClick={loadExample}
            className="px-3 py-2 rounded-xl text-xs font-semibold text-purple-700 bg-purple-100/60 hover:bg-purple-100 transition-colors flex items-center gap-1.5"
            title="Preencher com o caso real da Padaria para testar"
          >
            <FileText size={14} />
            <span>Carregar Exemplo Real</span>
          </button>

          {briefing && (
            <button
              type="button"
              onClick={() => setBriefing('')}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              title="Limpar texto"
            >
              <RotateCcw size={14} />
            </button>
          )}
        </div>

        {/* Botão Principal: Gerar Relatório Oficial com IA */}
        <button
          type="button"
          onClick={handleGenerate}
          disabled={isGenerating || !briefing.trim()}
          className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-purple-600 via-purple-700 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-md shadow-purple-600/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
        >
          {isGenerating ? (
            <>
              <Wand2 size={16} className="animate-spin" />
              <span>Gerando Relatório Inteligente...</span>
            </>
          ) : (
            <>
              <Sparkles size={16} />
              <span>Gerar Relatório com IA (4 Tópicos)</span>
            </>
          )}
        </button>
      </div>

      {/* Mensagens de Sucesso e Erro */}
      {successMsg && (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-3.5 py-2.5 rounded-xl font-medium">
          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs px-3.5 py-2.5 rounded-xl font-medium">
          {errorMsg}
        </div>
      )}
    </div>
  );
}
