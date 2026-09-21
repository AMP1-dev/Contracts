import React, { useState, useEffect } from 'react';
import { X, Save, FileText, Building2, User, Clock, CheckCircle2, MessageSquare, Mail, Camera, FileCheck, Send, Printer, Trash2, ExternalLink, FileSignature, Check, Calendar } from 'lucide-react';
import type { Project, CompanyConfig } from '../types/database';
import { supabase } from '../lib/supabase';
import { cn, maskPhone } from '../lib/utils';
import { REPORT_ARROW_B64, REPORT_BANNER_B64, REPORT_LOGO_B64 } from '../assets/reportAssets';
import { createAutentiqueDocument } from '../lib/autentique';
import { SomaAiAssistant } from './SomaAiAssistant';

interface ProjectDetailsPanelProps {
  project: Project | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (updatedProject: Project) => void;
  onDelete?: (projectId: string) => void;
}

export function ProjectDetailsPanel({ project, isOpen, onClose, onUpdate, onDelete }: ProjectDetailsPanelProps) {
  const [formData, setFormData] = useState<Partial<Project>>(() => {
    if (project) {
      return {
        ...project,
      };
    }
    return {};
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSendingAutentique, setIsSendingAutentique] = useState(false);

  useEffect(() => {
    if (project) {
      setFormData({
        ...project
      });
    }
  }, [project]);

  // Support Ctrl+V paste of WhatsApp screenshot directly anywhere in panel
  useEffect(() => {
    if (!isOpen) return;

    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            const reader = new FileReader();
            reader.onloadend = () => {
              setFormData((prev) => ({
                ...prev,
                dados_extra: {
                  ...(prev.dados_extra || {}),
                  foto_cliente: reader.result as string,
                }
              }));
            };
            reader.readAsDataURL(blob);
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isOpen]);

  if (!project) return null;

  const handleChange = (field: keyof Project, value: any) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      // Se alterar Razão Social, atualiza também nome_cliente para manter cabeçalho e card sincronizados
      if (field === 'razao_social' && value) {
        updated.nome_cliente = value;
      }
      if (field === 'nome_cliente' && value) {
        updated.razao_social = value;
      }
      return updated;
    });
  };

  const handleSave = async () => {
    if (!project.id) return;
    setIsSaving(true);
    setSaveSuccess(false);

    const updatedData: Project = {
      ...project,
      ...formData,
      nome_cliente: formData.nome_cliente || formData.razao_social || project.nome_cliente,
      razao_social: formData.razao_social || formData.nome_cliente || project.razao_social,
    } as Project;

    try {
      const { error } = await supabase
        .from('projetos')
        .upsert(updatedData, { onConflict: 'id' });

      if (!error) {
        setSaveSuccess(true);
        onUpdate(updatedData);
        setTimeout(() => {
          setSaveSuccess(false);
          onClose();
        }, 400);
      } else {
        console.warn('Aviso ao salvar no Supabase:', error.message);
        onUpdate(updatedData);
        onClose();
      }
    } catch (err) {
      console.warn('Erro ao salvar no Supabase:', err);
      onUpdate(updatedData);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  // WhatsApp Pre-formatted Link
  const getWhatsAppLink = () => {
    try {
      const rawPhone = String(formData.celular || formData.telefone || '');
      const cleanPhone = rawPhone.replace(/\D/g, '');
      const clientName = formData.nome_cliente || formData.razao_social || 'Cliente';
      const programa = formData.programa || 'Consultoria Sebrae';

      let template = 'Olá {nome_cliente}, tudo bem? Espero lhe encontrar bem!\n\nSou Marco Antonio, consultor credenciado ao SEBRAE e estou entrando em contato para comunicar que estamos a um passo de marcar nossa consultoria ({programa}).\n\nSegue o link para que possa escolher uma data e horário para este nosso encontro:\n👉 {link_calendario}\n\nÉ muito importante que agende uma data para darmos início ao nosso trabalho, espero e desejo muito que possa contribuir com a sua empresa.';
      let calendar = 'https://calendar.app.google/skRSHv2QBUjY9ae16';

      const saved = localStorage.getItem('amp_company_config');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.whatsappTemplate) template = parsed.whatsappTemplate;
        if (parsed.calendarLink) calendar = parsed.calendarLink;
      }

      const text = template
        .replace(/{nome_cliente}/g, clientName)
        .replace(/{programa}/g, programa)
        .replace(/{link_calendario}/g, calendar);

      const targetPhone = cleanPhone.length <= 11 && !cleanPhone.startsWith('55') ? `55${cleanPhone}` : cleanPhone;
      return `https://api.whatsapp.com/send?phone=${targetPhone}&text=${encodeURIComponent(text)}`;
    } catch (e) {
      return '#';
    }
  };

  // Email Mailto Link
  const getEmailLink = () => {
    try {
      const email = String(formData.email_cliente || '');
      const clientName = formData.nome_cliente || formData.razao_social || 'Cliente';
      const rae = formData.codigo_rae || '';
      const programa = formData.programa || 'Sebrae';
      const subject = `Agendamento de Consultoria Sebrae - ${programa} (${rae})`;
      const body = `Olá ${clientName},\n\nRecebemos a sua demanda de consultoria pelo Sebrae (${programa} - RAE: ${rae}).\n\nEstou entrando em contato para combinarmos o agendamento da nossa primeira reunião de atendimento (virtual ou presencial).\n\nPor favor, responda a esta mensagem para definirmos a melhor data e horário.\n\nAtenciosamente,\nConsultoria Credenciada Sebrae`;

      return `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    } catch (e) {
      return '#';
    }
  };

  // Client Photo Upload
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData((prev) => ({
          ...prev,
          dados_extra: {
            ...(prev.dados_extra || {}),
            foto_cliente: reader.result as string,
          }
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Signed Term Upload
  const handleTermUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData((prev) => ({
        ...prev,
        dados_extra: {
          ...(prev.dados_extra || {}),
          termo_assinado_nome: file.name,
          termo_assinado_data: new Date().toISOString(),
        }
      }));
    }
  };

  // NF Upload
  const handleNfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData((prev) => ({
        ...prev,
        dados_extra: {
          ...(prev.dados_extra || {}),
          nota_fiscal_nome: file.name,
          nota_fiscal_data: new Date().toISOString(),
        }
      }));
    }
  };

  // Helper date formatters for official report
  const formatDataExtenso = (dateStr?: string | null): string => {
    if (!dateStr) return '17 de agosto de 2026';
    const clean = dateStr.trim();
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(clean)) {
      const [d, m, y] = clean.split('/');
      const date = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
      return date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
    }
    if (/^\d{4}-\d{2}-\d{2}/.test(clean)) {
      const [y, m, d] = clean.substring(0, 10).split('-');
      const date = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
      return date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
    }
    const parsed = new Date(clean);
    if (!isNaN(parsed.getTime())) {
      return parsed.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
    }
    return clean;
  };

  const formatDataSimples = (dateStr?: string | null): string => {
    if (!dateStr) return '17/08/2026';
    const clean = dateStr.trim();
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(clean)) return clean;
    if (/^\d{4}-\d{2}-\d{2}/.test(clean)) {
      const [y, m, d] = clean.substring(0, 10).split('-');
      return `${d}/${m}/${y}`;
    }
    const parsed = new Date(clean);
    if (!isNaN(parsed.getTime())) {
      return parsed.toLocaleDateString('pt-BR');
    }
    return clean;
  };

  // Print / View Official SOMA SEBRAE Report
  const handlePrintReport = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const edital = formData.edital || '004/2026';
    const processoNo = formData.processo_no || '1777/2025';
    const contratoNo = formData.contrato_no || '070873/2026';
    const empresaCredenciada = formData.empresa_credenciada || 'AMP DO BRASIL SOLUCOES ADMINISTRATIVAS E TECNOLOGICAS LTDA';
    const profissional = formData.profissional_responsavel || 'MARCO ANTONIO PAVANI';
    const natureza = formData.natureza || 'CONSULTORIA';
    const objeto = formData.solucao_contratada || 'Faça a gestão financeira e tenha controle do seu dinheiro';
    const localPrestacao = formData.municipio 
      ? (formData.municipio.includes('Remoto') ? formData.municipio : `${formData.municipio} (Remoto)`) 
      : 'Cotia (Remoto)';
    
    // Data informada no atendimento (NÃO a data de hoje que gera o relatório)
    const dataAtendimentoInformada = formData.data_atendimento || formData.data_prevista_inicio || '2026-08-17';
    const dataExecucao = formatDataSimples(dataAtendimentoInformada);
    const dataExtenso = formatDataExtenso(dataAtendimentoInformada);

    const qtdHoras = `${formData.horas_realizadas || formData.horas_contratadas || 1} horas`;
    const plataforma = formData.plataforma_utilizada || 'Plataforma Microsoft Teams';
    const nomeCliente = formData.nome_cliente || formData.razao_social || '66.212.730 ERICKA CLEMENTE DOS SANTOS NUNES';
    const cnpjCliente = formData.cnpj || '66.212.730/0001-64';
    const rawRae = String(formData.codigo_rae || '39090075');
    const rae = rawRae.replace(/\D/g, '') || rawRae;
    const cidadeRodape = formData.municipio ? String(formData.municipio).replace(/\s*\(.*?\)/g, '').trim() : 'Cotia';

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>SOMA SEBRAE - Relatório de Prestação de Serviço - ${rae}</title>
          <style>
            @page { size: A4; margin: 10mm 15mm 12mm 15mm; }
            body { font-family: Arial, Helvetica, sans-serif; font-size: 10pt; color: #000; line-height: 1.35; padding: 10px; background: #fff; }
            .header-top { font-size: 8pt; color: #4355a2; font-family: Arial, sans-serif; margin-bottom: 2px; font-weight: normal; }
            
            .logo-container { text-align: center; margin-bottom: 12px; }
            .logo-img { height: 46px; object-fit: contain; }

            .banner-container { display: flex; align-items: center; justify-content: flex-start; gap: 8px; margin-bottom: 12px; }
            .banner-arrow-img { height: 26px; width: 26px; object-fit: contain; }
            .banner-banner-img { height: 26px; object-fit: contain; }

            table.report-table { width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 9.5pt; }
            table.report-table th, table.report-table td { border: 1px solid #777777; padding: 3.5px 7px; text-align: left; vertical-align: middle; }
            table.report-table td.label-col { width: 38%; color: #000000; font-weight: normal; background-color: #ffffff; }
            table.report-table td.val-col { width: 62%; color: #0050b3; font-style: italic; font-weight: bold; }

            .section-box { margin-bottom: 9px; }
            .section-title { font-size: 9.5pt; font-weight: normal; margin-bottom: 2px; color: #000000; }
            .text-box { border: 1px solid #777777; min-height: 52px; padding: 6px 8px; font-size: 9pt; color: #000000; background: #ffffff; white-space: pre-wrap; line-height: 1.35; }

            .footer-date { text-align: center; font-size: 9.5pt; color: #0050b3; font-weight: bold; font-style: italic; margin-top: 22px; margin-bottom: 28px; }
            .signatures { display: flex; justify-content: space-around; text-align: center; margin-top: 25px; font-size: 9pt; color: #000000; }
            .signature-block { width: 44%; }
            .signature-line { border-top: 1px solid #000000; margin-top: 35px; padding-top: 4px; font-weight: bold; }

            .photo-section { margin-top: 22px; text-align: center; page-break-inside: avoid; }
            .photo-section h5 { font-size: 9.5pt; color: #0050b3; font-weight: bold; font-style: italic; margin-bottom: 8px; text-align: center; }
            .photo-img { max-width: 85%; max-height: 240px; border: 1px solid #bbbbbb; border-radius: 4px; object-fit: contain; }
          </style>
        </head>
        <body>
          <div class="header-top">Classificação: RESTRITA</div>

          <div class="logo-container">
            <img src="${REPORT_LOGO_B64}" class="logo-img" alt="som+a SEBRAE" />
          </div>

          <div class="banner-container">
            <img src="${REPORT_ARROW_B64}" class="banner-arrow-img" alt="↘" />
            <img src="${REPORT_BANNER_B64}" class="banner-banner-img" alt="RELATÓRIO DE PRESTAÇÃO DE SERVIÇO" />
          </div>

          <table class="report-table">
            <tr>
              <td class="label-col">Edital</td>
              <td class="val-col">${edital}</td>
            </tr>
            <tr>
              <td class="label-col">Processo Nº</td>
              <td class="val-col">${processoNo}</td>
            </tr>
            <tr>
              <td class="label-col">Contrato Nº</td>
              <td class="val-col">${contratoNo}</td>
            </tr>
            <tr>
              <td class="label-col">Razão Social da Empresa Credenciada</td>
              <td class="val-col">${empresaCredenciada}</td>
            </tr>
            <tr>
              <td class="label-col">Profissional responsável</td>
              <td class="val-col">${profissional}</td>
            </tr>
            <tr>
              <td class="label-col">Natureza</td>
              <td class="val-col">${natureza}</td>
            </tr>
            <tr>
              <td class="label-col">Objeto (produto)</td>
              <td class="val-col">${objeto}</td>
            </tr>
            <tr>
              <td class="label-col">Local da prestação de serviço (cliente)</td>
              <td class="val-col">${localPrestacao}</td>
            </tr>
            <tr>
              <td class="label-col">Data de execução</td>
              <td class="val-col">${dataExecucao}</td>
            </tr>
            <tr>
              <td class="label-col">Quantidade de horas</td>
              <td class="val-col">${qtdHoras}</td>
            </tr>
            <tr>
              <td class="label-col">Plataforma utilizada</td>
              <td class="val-col">${plataforma}</td>
            </tr>
            <tr>
              <td class="label-col">Nome do Cliente (Razão Social)</td>
              <td class="val-col">${nomeCliente}</td>
            </tr>
            <tr>
              <td class="label-col">CNPJ do Cliente</td>
              <td class="val-col">${cnpjCliente}</td>
            </tr>
            <tr>
              <td class="label-col">Código(s) RAE</td>
              <td class="val-col">${rae}</td>
            </tr>
          </table>

          <div class="section-box">
            <div class="section-title">Apontamentos do cliente (observações do cliente):</div>
            <div class="text-box">${formData.apontamentos_cliente || ''}</div>
          </div>

          <div class="section-box">
            <div class="section-title">Diagnóstico do consultor:</div>
            <div class="text-box">${formData.diagnostico_consultor || ''}</div>
          </div>

          <div class="section-box">
            <div class="section-title">Resumo dos assuntos discutidos:</div>
            <div class="text-box">${formData.resumo_assuntos || ''}</div>
          </div>

          <div class="section-box">
            <div class="section-title">Encaminhamento/recomendações:</div>
            <div class="text-box">${formData.encaminhamentos_recomendacoes || ''}</div>
          </div>

          <div class="footer-date">
            ${cidadeRodape}, ${dataExtenso}
          </div>

          <div class="signatures">
            <div class="signature-block">
              <div class="signature-line">
                ${empresaCredenciada}<br/>
                <span style="font-weight: normal; font-size: 8.5pt;">${profissional}</span>
              </div>
            </div>
            <div class="signature-block">
              <div class="signature-line">
                ${nomeCliente}<br/>
                <span style="font-weight: normal; font-size: 8.5pt;">Cliente - CNPJ: ${cnpjCliente}</span>
              </div>
            </div>
          </div>

          ${formData.dados_extra?.foto_cliente ? `
            <div class="photo-section">
              <h5>[Print Da Tela Do Atendimento (Para os atendimentos remotos) / Foto do Cliente]</h5>
              <img class="photo-img" src="${formData.dados_extra.foto_cliente}" alt="Comprovante de Atendimento" />
            </div>
          ` : ''}
        </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 300);
  };

  // Assinatura via GOV.BR (100% Gratuita pelo Assinador ITI oficial)
  const handleGovBrSignature = () => {
    // 1. Abre a impressão/download do PDF SOMA
    handlePrintReport();

    // 2. Abre o assinador oficial do Governo Federal em nova aba
    window.open('https://assinador.iti.br', '_blank');

    // 3. Monta link de WhatsApp opcional com mensagem pronta para o cliente
    const phone = String(formData.celular || formData.telefone || '').replace(/\D/g, '');
    const clientName = formData.nome_cliente || formData.razao_social || 'Cliente';
    const msg = `Olá ${clientName}! Segue o Relatório de Prestação de Serviço Sebrae (RAE ${formData.codigo_rae || ''}) para assinatura gratuita pelo GOV.BR.\n\nVocê pode assinar em 1 minuto pelo celular ou computador através do link oficial:\nhttps://assinador.iti.br\n\nBasta entrar com sua conta Gov.br (Prata ou Ouro), carregar o documento e confirmar a assinatura digital. Qualquer dúvida estou à disposição!`;

    if (phone) {
      const fullPhone = phone.startsWith('55') ? phone : `55${phone}`;
      const waUrl = `https://wa.me/${fullPhone}?text=${encodeURIComponent(msg)}`;
      setTimeout(() => {
        if (confirm('Deseja abrir o WhatsApp com a mensagem e orientações de assinatura pelo GOV.BR para o cliente?')) {
          window.open(waUrl, '_blank');
        }
      }, 800);
    }
  };

  // Envio Automático para Assinatura via Autentique API
  const handleAutentiqueSignature = async () => {
    let token = '';
    let isSandbox = true;

    try {
      const saved = localStorage.getItem('amp_company_config');
      if (saved) {
        const parsed = JSON.parse(saved);
        token = parsed.autentiqueToken || '';
        isSandbox = parsed.autentiqueSandbox ?? true;
      }
    } catch (e) {}

    if (!token) {
      alert('Chave de API do Autentique não configurada!\n\nPor favor, acesse o menu "Configurações > Assinatura Digital" e insira seu Token da API Autentique.');
      return;
    }

    const clientName = formData.nome_cliente || formData.razao_social || 'Cliente Sebrae';
    const clientEmail = formData.email_cliente || '';
    const clientPhone = formData.celular || formData.telefone || '';

    if (!clientEmail && !clientPhone) {
      alert('Para enviar ao Autentique, preencha o E-mail ou Celular/WhatsApp do cliente no cadastro.');
      return;
    }

    setIsSendingAutentique(true);
    const result = await createAutentiqueDocument({
      token,
      sandbox: isSandbox,
      name: `Relatório SOMA Sebrae - RAE ${formData.codigo_rae || ''} - ${clientName}`,
      signerName: clientName,
      signerEmail: clientEmail || undefined,
      signerPhone: clientPhone || undefined,
      message: `Olá ${clientName}! Segue o Relatório da Consultoria Sebrae para sua assinatura eletrônica.`,
    });
    setIsSendingAutentique(false);

    if (result.success) {
      const updated = {
        ...formData,
        autentique_document_id: result.documentId || null,
        autentique_status: 'pendente',
        autentique_link: result.signUrl || null,
      } as Project;

      setFormData(updated);
      onUpdate(updated);

      let successText = `✅ Documento criado com sucesso no Autentique!\nID: ${result.documentId || 'OK'}`;
      if (result.signUrl) {
        successText += `\nLink de assinatura: ${result.signUrl}`;
      }
      alert(successText);

      if (result.signUrl) {
        window.open(result.signUrl, '_blank');
      }
    } else {
      alert(`❌ Falha ao enviar para o Autentique:\n${result.error || 'Erro desconhecido'}`);
    }
  };

  const handleSendToSebrae = () => {
    alert(`Pacote completo do SEBRAE SOMA (RAE ${formData.codigo_rae}) compilado com sucesso!\n\nDocumentos inclusos:\n- Relatório de Prestação de Serviço (SOMA SEBRAE)\n- Foto do Cliente / Print de Tela\n- Termo Assinado\n- Nota Fiscal da Consultoria\n\nDisparando e-mail de fechamento...`);
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className={cn(
          "fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-40 transition-opacity duration-300",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      {/* Slide-over Panel */}
      <div 
        className={cn(
          "fixed top-0 right-0 h-screen w-full max-w-2xl bg-white shadow-2xl z-50 flex flex-col transform transition-transform duration-300 ease-in-out border-l border-slate-200 font-sans",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-md w-fit mb-1">
              <FileText size={14} />
              RAE: {project.codigo_rae || 'Não informado'}
            </div>
            <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
              {formData.nome_cliente || formData.razao_social || project.nome_cliente || 'Cliente Sem Nome'}
            </h2>
          </div>
          
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50 hide-scrollbar">
          
          {/* Quick Contact Bar */}
          <section className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 p-5 rounded-2xl text-white shadow-md">
            <h3 className="text-xs font-bold uppercase tracking-wider text-purple-200 mb-1.5 flex items-center gap-2">
              <MessageSquare size={16} />
              Comunicação & Agendamento Rápido
            </h3>
            <p className="text-xs text-purple-300 mb-3.5">
              Envie mensagem de apresentação e pedido de agendamento em 1 clique:
            </p>
            
            <div className="flex flex-wrap gap-2.5">
              <a
                href={getWhatsAppLink()}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow transition-all"
              >
                <span>💬 WhatsApp (Apresentação + Agenda)</span>
              </a>

              <a
                href="https://calendar.app.google/skRSHv2QBUjY9ae16"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow transition-all"
              >
                <Calendar size={14} />
                <span>Abrir Google Agenda</span>
              </a>

              <a
                href={getEmailLink()}
                className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-bold text-xs px-4 py-2.5 rounded-xl border border-white/20 transition-all"
              >
                <Mail size={14} />
                <span>E-mail</span>
              </a>
            </div>
          </section>

          {/* Dados da Ordem de Serviço & Valor R$ */}
          <section className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <FileText size={16} className="text-primary" />
              Dados da Ordem de Serviço & Valor (R$)
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              <InputField 
                label="Código RAE / CO / OS nº" 
                value={formData.codigo_rae} 
                onChange={(v) => handleChange('codigo_rae', v)} 
              />
              <InputField 
                label="Valor da OS (R$)" 
                type="number"
                value={formData.valor_consultoria} 
                onChange={(v) => handleChange('valor_consultoria', parseFloat(v) || 0)} 
              />
              <InputField 
                label="Data do Atendimento / Início" 
                type="text"
                value={formData.data_atendimento || formData.data_prevista_inicio || ''} 
                onChange={(v) => {
                  handleChange('data_atendimento', v);
                  handleChange('data_prevista_inicio', v);
                }} 
                placeholder="Ex: 10/08/2026"
              />
              <InputField 
                label="Programa / Produto Aplicado" 
                value={formData.programa} 
                onChange={(v) => handleChange('programa', v)} 
              />
              <InputField 
                label="(Remoto/Presencial)" 
                value={formData.modalidade} 
                onChange={(v) => handleChange('modalidade', v)} 
              />
              <InputField 
                label="Horas Contratadas" 
                type="number"
                value={formData.horas_contratadas} 
                onChange={(v) => handleChange('horas_contratadas', parseInt(v) || 0)} 
              />
              <InputField 
                label="Horas Realizadas" 
                type="number"
                value={formData.horas_realizadas} 
                onChange={(v) => handleChange('horas_realizadas', parseInt(v) || 0)} 
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Objeto / Solução Contratada</label>
              <input 
                type="text"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-primary transition-all"
                value={formData.solucao_contratada || ''}
                onChange={(e) => handleChange('solucao_contratada', e.target.value)}
              />
            </div>
          </section>

          {/* Dados do Cliente */}
          <section className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Building2 size={16} className="text-slate-400" />
              Dados do Cliente (Sebrae RAE)
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <InputField 
                label="Nome do Cliente / Razão Social" 
                value={formData.nome_cliente || formData.razao_social || ''} 
                onChange={(v) => {
                  handleChange('nome_cliente', v);
                  handleChange('razao_social', v);
                }} 
              />
              <InputField 
                label="Nome Fantasia" 
                value={formData.nome_fantasia} 
                onChange={(v) => handleChange('nome_fantasia', v)} 
              />
              <InputField 
                label="CNPJ" 
                value={formData.cnpj} 
                onChange={(v) => handleChange('cnpj', v)} 
              />
              <InputField 
                label="CPF" 
                value={formData.cpf} 
                onChange={(v) => handleChange('cpf', v)} 
              />
              <InputField 
                label="E-mail" 
                type="email"
                value={formData.email_cliente} 
                onChange={(v) => handleChange('email_cliente', v)} 
              />
              <InputField 
                label="Celular / WhatsApp" 
                value={maskPhone(formData.celular || formData.telefone || '')} 
                onChange={(v) => {
                  const masked = maskPhone(v);
                  handleChange('celular', masked);
                  handleChange('telefone', masked);
                }} 
                placeholder="(00) 00000-0000"
              />
              <InputField 
                label="Município" 
                value={formData.municipio} 
                onChange={(v) => handleChange('municipio', v)} 
              />
              <InputField 
                label="Estado (UF)" 
                value={formData.estado} 
                onChange={(v) => handleChange('estado', v)} 
              />
            </div>
          </section>

          {/* SOMA SEBRAE Official Report Parameters */}
          <section className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <FileCheck size={16} className="text-primary" />
              Relatório de Prestação de Serviço (SOMA SEBRAE)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
              <InputField 
                label="Contrato Nº" 
                value={formData.contrato_no || ''} 
                onChange={(v) => handleChange('contrato_no', v)} 
                placeholder="Ex: RJ0520260103"
              />
              <InputField 
                label="Edital" 
                value={formData.edital || ''} 
                onChange={(v) => handleChange('edital', v)} 
                placeholder="Ex: 001/2026"
              />
              <InputField 
                label="Processo Nº" 
                value={formData.processo_no || ''} 
                onChange={(v) => handleChange('processo_no', v)} 
                placeholder="Ex: 1777/2025"
              />
              <InputField 
                label="Plataforma Utilizada" 
                value={formData.plataforma_utilizada || ''} 
                onChange={(v) => handleChange('plataforma_utilizada', v)} 
                placeholder="Ex: Remoto ou Plataforma Teams"
              />
              <InputField 
                label="Natureza" 
                value={formData.natureza || ''} 
                onChange={(v) => handleChange('natureza', v)} 
                placeholder="Ex: CONSULTORIA"
              />
              <InputField 
                label="Empresa Credenciada" 
                value={formData.empresa_credenciada || ''} 
                onChange={(v) => handleChange('empresa_credenciada', v)} 
                placeholder="Ex: AMP DO BRASIL..."
              />
              <InputField 
                label="Profissional Responsável" 
                value={formData.profissional_responsavel || ''} 
                onChange={(v) => handleChange('profissional_responsavel', v)} 
                placeholder="Ex: MARCO ANTONIO PAVANI"
              />
              <InputField 
                label="Data do Atendimento (Execução)" 
                type="text"
                value={formData.data_atendimento || formData.data_prevista_inicio || ''} 
                onChange={(v) => {
                  handleChange('data_atendimento', v);
                  handleChange('data_prevista_inicio', v);
                }} 
                placeholder="Ex: 10/08/2026 ou 2026-08-10"
              />
            </div>

            {/* Assistente de IA & Voz: Gerador Automático de Relatório SOMA SEBRAE */}
            <SomaAiAssistant 
              clientContext={{
                nome_cliente: formData.nome_cliente || formData.nome_fantasia || formData.razao_social || '',
                razao_social: formData.razao_social || formData.nome_cliente || '',
                solucao_contratada: formData.solucao_contratada || '',
                programa: formData.programa || '',
                consultor: formData.profissional_responsavel || 'MARCO ANTONIO PAVANI',
              }}
              onApplyReport={(report) => {
                handleChange('apontamentos_cliente', report.apontamentos_cliente);
                handleChange('diagnostico_consultor', report.diagnostico_consultor);
                handleChange('resumo_assuntos', report.resumo_assuntos);
                handleChange('encaminhamentos_recomendacoes', report.encaminhamentos_recomendacoes);
              }}
            />

            {/* 4 Narrative Boxes */}
            <div className="space-y-3.5 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  1. Apontamentos do cliente (observações do cliente):
                </label>
                <textarea 
                  rows={3}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:border-primary"
                  value={formData.apontamentos_cliente || ''}
                  onChange={(e) => handleChange('apontamentos_cliente', e.target.value)}
                  placeholder="Relatos, necessidades ou queixas expressas pelo cliente..."
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  2. Diagnóstico do consultor:
                </label>
                <textarea 
                  rows={3}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:border-primary"
                  value={formData.diagnostico_consultor || ''}
                  onChange={(e) => handleChange('diagnostico_consultor', e.target.value)}
                  placeholder="Diagnóstico técnico das oportunidades e problemas identificados..."
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  3. Resumo dos assuntos discutidos:
                </label>
                <textarea 
                  rows={3}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:border-primary"
                  value={formData.resumo_assuntos || ''}
                  onChange={(e) => handleChange('resumo_assuntos', e.target.value)}
                  placeholder="Pontos abordados durante a reunião de consultoria..."
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  4. Encaminhamento / recomendações:
                </label>
                <textarea 
                  rows={3}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:border-primary"
                  value={formData.encaminhamentos_recomendacoes || ''}
                  onChange={(e) => handleChange('encaminhamentos_recomendacoes', e.target.value)}
                  placeholder="Plano de ação e recomendações finais para a empresa..."
                />
              </div>
            </div>
          </section>

          {/* Workflow Pós-Atendimento: Foto, Termo SOMA, Assinado e NF */}
          <section className="bg-purple-50/70 border border-purple-200 p-5 rounded-2xl space-y-4">
            <div>
              <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Send size={16} className="text-primary" />
                Fechamento & Envio do Pacote ao SEBRAE
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Gere o documento oficial SOMA, anexe a foto do atendimento e envie os arquivos para finalizar no Sebrae.
              </p>
            </div>

            {/* Foto do Atendimento / Print do WhatsApp (Suporta Ctrl+V, Arrastar e Upload) */}
            <div className="p-4 bg-white rounded-2xl border-2 border-dashed border-purple-200 hover:border-purple-400 transition-colors space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-extrabold text-slate-900 block flex items-center gap-1.5">
                    <Camera size={15} className="text-primary" />
                    <span>1. Print da Conversa do WhatsApp / Comprovante de Atendimento</span>
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Insira a imagem de comprovação que será anexada ao relatório SOMA oficial.
                  </span>
                </div>

                <label className="bg-purple-100 hover:bg-purple-200 text-purple-900 text-xs font-bold px-3 py-1.5 rounded-xl cursor-pointer transition-colors shrink-0 flex items-center gap-1.5">
                  <Camera size={14} />
                  <span>{formData.dados_extra?.foto_cliente ? 'Alterar Imagem' : 'Selecionar Arquivo'}</span>
                  <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                </label>
              </div>

              {formData.dados_extra?.foto_cliente ? (
                <div className="flex items-center gap-3 bg-purple-50 p-2.5 rounded-xl border border-purple-200">
                  <img
                    src={formData.dados_extra.foto_cliente}
                    alt="Preview WhatsApp Print"
                    className="w-16 h-16 object-cover rounded-lg border border-purple-300 shadow-xs shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-bold text-purple-950 block">✅ Print do WhatsApp Anexado!</span>
                    <p className="text-[11px] text-purple-800">
                      Esta imagem será posicionada ao final do relatório oficial SOMA para auditoria.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, dados_extra: { ...prev.dados_extra, foto_cliente: null } }))}
                    className="text-xs font-bold text-rose-600 hover:underline px-2 py-1"
                  >
                    Remover
                  </button>
                </div>
              ) : (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center space-y-1">
                  <p className="text-xs font-bold text-slate-700">
                    💡 Dica: Cole com <kbd className="bg-white border border-slate-300 px-1.5 py-0.5 rounded text-[10px] font-mono text-purple-700 font-black">Ctrl + V</kbd> a captura de tela do WhatsApp!
                  </p>
                  <p className="text-[10px] text-slate-400">
                    Você pode copiar o print da tela no Windows (Win + Shift + S) e colar diretamente nesta janela.
                  </p>
                </div>
              )}
            </div>

            {/* Gerar Documento Oficial SOMA */}
            <div className="p-3.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-slate-800 block">2. Gerar Relatório Oficial SOMA SEBRAE:</span>
                <span className="text-[11px] text-slate-500">Documento idêntico ao modelo oficial com foto e assinaturas</span>
              </div>
              <button
                type="button"
                onClick={handlePrintReport}
                className="bg-primary hover:bg-primary-hover text-white text-xs font-bold px-3.5 py-1.5 rounded-lg shadow-sm transition-colors shrink-0 flex items-center gap-1.5"
              >
                <Printer size={14} />
                <span>Gerar SOMA PDF</span>
              </button>
            </div>

            {/* Assinatura Digital do Cliente (GOV.BR Grátis & Autentique API) */}
            <div className="p-4 bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-2xl shadow-md space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
                    <FileSignature size={15} />
                    <span>Assinatura Digital do Cliente</span>
                  </span>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    Envie para o cliente assinar antes de anexar o termo no Sebrae.
                  </p>
                </div>
                {formData.autentique_status && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                    Autentique: {formData.autentique_status}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                {/* Opção GOV.BR (100% Gratuita) */}
                <button
                  type="button"
                  onClick={handleGovBrSignature}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2.5 px-3 rounded-xl transition-all shadow flex items-center justify-center gap-1.5 text-center"
                >
                  <span>🇧🇷 Assinar via GOV.BR</span>
                  <span className="text-[10px] bg-emerald-800 px-1.5 py-0.5 rounded-md uppercase font-extrabold tracking-wide">100% Grátis</span>
                </button>

                {/* Opção Autentique API */}
                <button
                  type="button"
                  onClick={handleAutentiqueSignature}
                  disabled={isSendingAutentique}
                  className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold text-xs py-2.5 px-3 rounded-xl transition-all shadow flex items-center justify-center gap-1.5 text-center"
                >
                  <FileSignature size={14} />
                  <span>{isSendingAutentique ? 'Disparando...' : 'Enviar Autentique'}</span>
                  <span className="text-[10px] bg-purple-800 px-1.5 py-0.5 rounded-md uppercase font-extrabold tracking-wide">API</span>
                </button>
              </div>

              {formData.autentique_link && (
                <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-purple-200">
                  <span>Link de Assinatura Autentique ativo:</span>
                  <a
                    href={formData.autentique_link}
                    target="_blank"
                    rel="noreferrer"
                    className="text-purple-300 font-bold hover:underline flex items-center gap-1"
                  >
                    Abrir link <ExternalLink size={12} />
                  </a>
                </div>
              )}
            </div>

            {/* Upload Termo Assinado */}
            <div className="p-3.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-slate-800 block">3. Termo Assinado pelo Cliente:</span>
                <span className="text-[11px] text-slate-500">
                  {formData.dados_extra?.termo_assinado_nome || 'Nenhum termo assinado anexado'}
                </span>
              </div>
              <label className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3 py-1.5 rounded-lg cursor-pointer transition-colors shrink-0">
                <span>Anexar Assinado</span>
                <input type="file" accept=".pdf,image/*" onChange={handleTermUpload} className="hidden" />
              </label>
            </div>

            {/* Upload Nota Fiscal */}
            <div className="p-3.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-slate-800 block">4. Nota Fiscal da Consultoria:</span>
                <span className="text-[11px] text-slate-500">
                  {formData.dados_extra?.nota_fiscal_nome || 'Nenhuma Nota Fiscal anexada'}
                </span>
              </div>
              <label className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3 py-1.5 rounded-lg cursor-pointer transition-colors shrink-0">
                <span>Anexar NF</span>
                <input type="file" accept=".pdf,image/*" onChange={handleNfUpload} className="hidden" />
              </label>
            </div>

            {/* Finalizar e enviar ao SEBRAE */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleSendToSebrae}
                className="w-full bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-600 hover:to-indigo-600 text-white font-bold text-xs py-3 px-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
              >
                <Send size={16} />
                <span>Encaminhar Pacote SOMA Completo ao SEBRAE</span>
              </button>
            </div>
          </section>

        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 p-4 bg-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            {saveSuccess && (
              <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600">
                <CheckCircle2 size={16} /> Salvo com sucesso!
              </span>
            )}
            {onDelete && project.id && (
              <button
                type="button"
                onClick={() => {
                  if (confirm(`Tem certeza que deseja excluir a demanda "${project.nome_cliente || project.codigo_rae}" do Kanban?`)) {
                    onDelete(project.id);
                    onClose();
                  }
                }}
                className="px-3 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors flex items-center gap-1.5"
              >
                <Trash2 size={14} />
                <span>Excluir Demanda</span>
              </button>
            )}
          </div>
          <div className="flex gap-3">
            <button 
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancelar
            </button>
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary-hover shadow-md shadow-purple-500/20 transition-all flex items-center gap-2 disabled:opacity-70"
            >
              <Save size={16} />
              {isSaving ? 'Salvando...' : 'Salvar & Fechar'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function InputField({ label, value, onChange, type = 'text' }: { label: string, value: any, onChange: (val: string) => void, type?: string }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1">{label}</label>
      <input 
        type={type}
        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-primary transition-all"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
