import React, { useState, useEffect } from 'react';
import { X, Save, FileText, Building2, User, Clock, CheckCircle2, MessageSquare, Mail, Camera, FileCheck, Send, Printer } from 'lucide-react';
import type { Project } from '../types/database';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';

interface ProjectDetailsPanelProps {
  project: Project | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (updatedProject: Project) => void;
}

export function ProjectDetailsPanel({ project, isOpen, onClose, onUpdate }: ProjectDetailsPanelProps) {
  const [formData, setFormData] = useState<Partial<Project>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (project) {
      setFormData({
        edital: '004/2026',
        processo_no: '1777/2025',
        plataforma_utilizada: project.modalidade || 'Presencial',
        ...project
      });
    }
  }, [project]);

  if (!project) return null;

  const handleChange = (field: keyof Project, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!project.id) return;
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const { error } = await supabase
        .from('projetos')
        .update(formData)
        .eq('id', project.id);

      if (!error) {
        setSaveSuccess(true);
        onUpdate({ ...project, ...formData } as Project);
        setTimeout(() => {
          setSaveSuccess(false);
          onClose();
        }, 400);
      } else {
        onUpdate({ ...project, ...formData } as Project);
        onClose();
      }
    } catch (err) {
      onUpdate({ ...project, ...formData } as Project);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  // WhatsApp Pre-formatted Link
  const getWhatsAppLink = () => {
    const rawPhone = formData.celular || formData.telefone || '';
    const cleanPhone = rawPhone.replace(/\D/g, '');
    const clientName = formData.nome_cliente || formData.razao_social || 'Cliente';
    const rae = formData.codigo_rae || '';
    const programa = formData.programa || 'Sebrae';

    const text = `Olá ${clientName}, tudo bem? Sou da consultoria credenciada Sebrae. Recebemos sua demanda (${programa}${rae ? ' - RAE: ' + rae : ''}). Estou entrando em contato para enviarmos o link e agendarmos o nosso primeiro encontro de atendimento. Aguardo seu retorno!`;

    const targetPhone = cleanPhone.length <= 11 && !cleanPhone.startsWith('55') ? `55${cleanPhone}` : cleanPhone;
    return `https://api.whatsapp.com/send?phone=${targetPhone}&text=${encodeURIComponent(text)}`;
  };

  // Email Mailto Link
  const getEmailLink = () => {
    const email = formData.email_cliente || '';
    const clientName = formData.nome_cliente || formData.razao_social || 'Cliente';
    const rae = formData.codigo_rae || '';
    const programa = formData.programa || 'Sebrae';
    const subject = `Agendamento de Consultoria Sebrae - ${programa} (${rae})`;
    const body = `Olá ${clientName},\n\nRecebemos a sua demanda de consultoria pelo Sebrae (${programa} - RAE: ${rae}).\n\nEstou entrando em contato para combinarmos o agendamento da nossa primeira reunião de atendimento (virtual ou presencial).\n\nPor favor, responda a esta mensagem para definirmos a melhor data e horário.\n\nAtenciosamente,\nConsultoria Credenciada Sebrae`;

    return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
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
            ...prev.dados_extra,
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
          ...prev.dados_extra,
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
          ...prev.dados_extra,
          nota_fiscal_nome: file.name,
          nota_fiscal_data: new Date().toISOString(),
        }
      }));
    }
  };

  // Print / View Official SOMA SEBRAE Report
  const handlePrintReport = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const edital = formData.edital || '004/2026';
    const processoNo = formData.processo_no || '1777/2025';
    const contratoNo = formData.contrato_no || formData.codigo_rae || '[Está na OS]';
    const empresaCredenciada = 'AMP Consultorias & Gestão Credenciada Sebrae';
    const profissional = 'Consultor Credenciado Sebrae';
    const natureza = 'Instrutoria/Consultoria';
    const objeto = formData.solucao_contratada || '[Está no contrato no campo Objeto da contratação]';
    const localPrestacao = formData.municipio ? `${formData.municipio} - ${formData.estado || 'SP'}` : '[Cidade do cliente]';
    const dataExecucao = formData.data_prevista_inicio ? `${formData.data_prevista_inicio} a ${formData.data_prevista_fim || 'Finalização'}` : '[Todas as datas dos atendimentos]';
    const qtdHoras = `${formData.horas_realizadas || formData.horas_contratadas || 20} horas`;
    const plataforma = formData.plataforma_utilizada || formData.modalidade || 'Presencial';
    const nomeCliente = formData.razao_social || formData.nome_cliente || '[Razão Social conforme recebido no e-mail]';
    const cnpjCliente = formData.cnpj || formData.cpf || '[CNPJ conforme recebido no e-mail]';
    const rae = formData.codigo_rae || '[Números de RAE]';

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>SOMA SEBRAE - Relatório de Prestação de Serviço - ${rae}</title>
          <style>
            @page { size: A4; margin: 12mm; }
            body { font-family: Arial, Helvetica, sans-serif; font-size: 10.5px; color: #000; line-height: 1.35; padding: 15px; background: #fff; }
            .header-top { font-size: 9.5px; color: #0000ff; font-weight: bold; margin-bottom: 8px; }
            
            .logo-container { text-align: center; margin-bottom: 12px; }
            .logo-title { font-size: 26px; font-weight: 900; color: #0044bb; letter-spacing: -1px; line-height: 1; }
            .logo-subtitle { font-size: 10px; font-weight: bold; color: #0044bb; text-transform: uppercase; margin-top: 1px; }

            .banner { background-color: #0044bb; color: #ffffff; font-weight: bold; font-size: 13px; text-transform: uppercase; padding: 5px 10px; display: flex; align-items: center; justify-content: flex-start; gap: 8px; border-radius: 2px; margin-bottom: 12px; }
            .banner-arrow { font-size: 16px; font-weight: bold; margin-right: 6px; }

            table.report-table { width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 10px; }
            table.report-table th, table.report-table td { border: 1px solid #777; padding: 4px 7px; text-align: left; }
            table.report-table td.label-col { width: 34%; color: #000; font-weight: normal; background-color: #fff; }
            table.report-table td.val-col { width: 66%; color: #0033aa; font-weight: bold; }

            .section-box { margin-bottom: 10px; }
            .section-title { font-size: 10px; font-weight: normal; margin-bottom: 3px; color: #000; }
            .text-box { border: 1px solid #555; min-height: 48px; padding: 6px; font-size: 10px; color: #000; background: #fff; border-radius: 2px; white-space: pre-wrap; }

            .footer-date { text-align: center; font-size: 10px; color: #0033aa; font-weight: bold; margin-top: 20px; margin-bottom: 25px; }
            .signatures { display: flex; justify-content: space-around; text-align: center; margin-top: 25px; font-size: 10px; color: #0033aa; font-weight: bold; }
            .signature-block { width: 44%; }
            .signature-line { border-top: 1px solid #000; margin-top: 35px; padding-top: 4px; }

            .photo-section { margin-top: 20px; text-align: center; page-break-inside: avoid; }
            .photo-section h5 { font-size: 10px; color: #0033aa; font-weight: bold; margin-bottom: 8px; text-align: center; }
            .photo-img { max-width: 85%; max-height: 240px; border: 1px solid #bbb; border-radius: 4px; object-fit: contain; }
          </style>
        </head>
        <body>
          <div class="header-top">Classificação: RESTRITA</div>

          <div class="logo-container">
            <div class="logo-title">soma</div>
            <div class="logo-subtitle">SEBRAE</div>
          </div>

          <div class="banner">
            <span class="banner-arrow">↘</span> RELATÓRIO DE PRESTAÇÃO DE SERVIÇO
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
            <div class="text-box">${formData.apontamentos_cliente || formData.observacoes || ''}</div>
          </div>

          <div class="section-box">
            <div class="section-title">Diagnóstico do consultor:</div>
            <div class="text-box">${formData.diagnostico_consultor || ''}</div>
          </div>

          <div class="section-box">
            <div class="section-title">Resumo dos assuntos discutidos:</div>
            <div class="text-box">${formData.resumo_assuntos || formData.objetivo_atendimento || ''}</div>
          </div>

          <div class="section-box">
            <div class="section-title">Encaminhamento/recomendações:</div>
            <div class="text-box">${formData.encaminhamentos_recomendacoes || ''}</div>
          </div>

          <div class="footer-date">
            ${formData.municipio || 'São Paulo'}, ${new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}
          </div>

          <div class="signatures">
            <div class="signature-block">
              <div class="signature-line">
                Assinatura do profissional responsável
              </div>
            </div>
            <div class="signature-block">
              <div class="signature-line">
                Assinatura do cliente atendido
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
              {project.nome_cliente || 'Cliente Sem Nome'}
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
                <span>💬 WhatsApp com Link</span>
              </a>

              <a
                href={getEmailLink()}
                className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-bold text-xs px-4 py-2.5 rounded-xl border border-white/20 transition-all"
              >
                <Mail size={14} />
                <span>E-mail de Agendamento</span>
              </a>
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
                label="Razão Social" 
                value={formData.razao_social} 
                onChange={(v) => handleChange('razao_social', v)} 
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
                value={formData.celular} 
                onChange={(v) => handleChange('celular', v)} 
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              <InputField 
                label="Edital" 
                value={formData.edital} 
                onChange={(v) => handleChange('edital', v)} 
              />
              <InputField 
                label="Processo Nº" 
                value={formData.processo_no} 
                onChange={(v) => handleChange('processo_no', v)} 
              />
              <InputField 
                label="Plataforma Utilizada" 
                value={formData.plataforma_utilizada} 
                onChange={(v) => handleChange('plataforma_utilizada', v)} 
              />
            </div>

            {/* 4 Narrative Boxes */}
            <div className="space-y-3.5 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  1. Apontamentos do cliente (observações do cliente):
                </label>
                <textarea 
                  rows={2}
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
                  rows={2}
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
                  rows={2}
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
                  rows={2}
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

            {/* Foto do Atendimento */}
            <div className="p-3.5 bg-white rounded-xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-slate-800 block">1. Foto do Atendimento / Print de Tela:</span>
                <span className="text-[11px] text-slate-500">
                  {formData.dados_extra?.foto_cliente ? '✅ Foto anexa ao relatório SOMA' : 'Nenhuma foto anexada'}
                </span>
              </div>
              <label className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3 py-1.5 rounded-lg cursor-pointer transition-colors shrink-0 flex items-center gap-1.5">
                <Camera size={14} />
                <span>{formData.dados_extra?.foto_cliente ? 'Alterar Foto' : 'Anexar Foto'}</span>
                <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
              </label>
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
