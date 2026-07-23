import { useState, useEffect } from 'react';
import { X, Save, FileText, Building2, User, Clock, CheckCircle2 } from 'lucide-react';
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
      setFormData(project);
    }
  }, [project]);

  if (!project) return null;

  const handleChange = (field: keyof Project, value: string | number | null) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!project.id) return;
    setIsSaving(true);
    setSaveSuccess(false);

    const { error } = await supabase
      .from('projetos')
      .update(formData)
      .eq('id', project.id);

    if (!error) {
      setSaveSuccess(true);
      onUpdate({ ...project, ...formData } as Project);
      setTimeout(() => {
        setSaveSuccess(false);
        onClose(); // Auto close modal after saving
      }, 500);
    } else {
      // Local fallback update if offline/demo
      onUpdate({ ...project, ...formData } as Project);
      onClose();
    }
    
    setIsSaving(false);
  };

  // Generate WhatsApp pre-formatted text link
  const getWhatsAppLink = () => {
    const rawPhone = formData.celular || formData.telefone || '';
    const cleanPhone = rawPhone.replace(/\D/g, '');
    const clientName = formData.nome_cliente || formData.razao_social || 'Cliente';
    const rae = formData.codigo_rae || '';
    const programa = formData.programa || 'Sebrae';

    const text = `Olá ${clientName}, tudo bem? Sou da consultoria credenciada Sebrae. Recebemos sua demanda (${programa}${rae ? ' - RAE: ' + rae : ''}). Gostaria de enviar o link para agendarmos o nosso primeiro encontro de atendimento. Aguardo seu retorno!`;

    const targetPhone = cleanPhone.length <= 11 && !cleanPhone.startsWith('55') ? `55${cleanPhone}` : cleanPhone;
    return `https://api.whatsapp.com/send?phone=${targetPhone}&text=${encodeURIComponent(text)}`;
  };

  // Generate Email mailto link
  const getEmailLink = () => {
    const email = formData.email_cliente || '';
    const clientName = formData.nome_cliente || formData.razao_social || 'Cliente';
    const rae = formData.codigo_rae || '';
    const programa = formData.programa || 'Sebrae';
    const subject = `Agendamento de Consultoria Sebrae - ${programa} (${rae})`;
    const body = `Olá ${clientName},\n\nRecebemos a sua demanda de consultoria pelo Sebrae (${programa} - RAE: ${rae}).\n\nEstou entrando em contato para combinarmos o agendamento da nossa primeira reunião de atendimento (virtual ou presencial).\n\nPor favor, responda a esta mensagem para definirmos a melhor data e horário.\n\nAtenciosamente,\nConsultoria Credenciada Sebrae`;

    return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  // Handle client photo upload simulation
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const updated = {
          ...formData,
          dados_extra: {
            ...formData.dados_extra,
            foto_cliente: reader.result as string,
          }
        };
        setFormData(updated);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle signed term upload simulation
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

  // Handle NF upload simulation
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

  // Print / View Generated Report
  const handlePrintReport = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Relatório de Atendimento Sebrae - ${formData.codigo_rae || 'Demanda'}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; color: #1e293b; line-height: 1.6; }
            .header { border-b: 2px solid #6366f1; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: center; }
            .title { font-size: 22px; font-weight: bold; color: #1e293b; }
            .subtitle { font-size: 14px; color: #64748b; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
            .card { background: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; }
            .card h4 { margin: 0 0 10px 0; color: #475569; font-size: 12px; text-transform: uppercase; }
            .card p { margin: 4px 0; font-size: 14px; }
            .photo-box { text-align: center; margin: 30px 0; border: 1px dashed #cbd5e1; padding: 20px; border-radius: 8px; }
            .photo-box img { max-height: 250px; border-radius: 8px; object-fit: contain; }
            .signatures { margin-top: 60px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; text-align: center; }
            .line { border-top: 1px solid #94a3b8; margin-top: 40px; padding-top: 8px; font-size: 13px; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="title">Relatório & Termo de Atendimento Sebrae</div>
              <div class="subtitle">Código RAE: ${formData.codigo_rae || 'N/A'} | Programa: ${formData.programa || 'Sebrae'}</div>
            </div>
            <div style="font-size: 12px; text-align: right; color: #64748b;">
              Data: ${new Date().toLocaleDateString('pt-BR')}<br>
              Status: Atendimento Concluído
            </div>
          </div>

          <div class="grid">
            <div class="card">
              <h4>Dados do Cliente</h4>
              <p><strong>Cliente/Empresa:</strong> ${formData.nome_cliente || formData.razao_social || 'N/A'}</p>
              <p><strong>CNPJ/CPF:</strong> ${formData.cnpj || formData.cpf || 'N/A'}</p>
              <p><strong>Município/UF:</strong> ${formData.municipio || ''} - ${formData.estado || ''}</p>
              <p><strong>E-mail:</strong> ${formData.email_cliente || 'N/A'}</p>
            </div>
            <div class="card">
              <h4>Dados do Atendimento</h4>
              <p><strong>Solução Contratada:</strong> ${formData.solucao_contratada || 'N/A'}</p>
              <p><strong>Horas Realizadas:</strong> ${formData.horas_realizadas || 0} / ${formData.horas_contratadas || 0} horas</p>
              <p><strong>Modalidade:</strong> ${formData.modalidade || 'Presencial'}</p>
              <p><strong>Valor Consultoria:</strong> R$ ${formData.valor_consultoria || 0}</p>
            </div>
          </div>

          <div class="card" style="margin-bottom: 30px;">
            <h4>Objetivo & Atividades Realizadas</h4>
            <p>${formData.objetivo_atendimento || 'Atendimento de consultoria executado com êxito conforme escopo contratado.'}</p>
          </div>

          ${formData.dados_extra?.foto_cliente ? `
            <div class="photo-box">
              <h4>Comprovante / Foto do Atendimento com o Cliente</h4>
              <img src="${formData.dados_extra.foto_cliente}" alt="Foto Atendimento" />
            </div>
          ` : ''}

          <div class="signatures">
            <div>
              <div class="line">Assinatura do Cliente<br><small>${formData.nome_cliente || formData.razao_social || ''}</small></div>
            </div>
            <div>
              <div class="line">Assinatura do Consultor Credenciado<br><small>Consultor Sebrae</small></div>
            </div>
          </div>
        </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 300);
  };

  const handleSendToSebrae = () => {
    alert(`Pacote completo de fechamento da demanda (RAE ${formData.codigo_rae}) enviado com sucesso para o SEBRAE!\n\nDocumentos inclusos:\n- Relatório de Atendimento\n- Foto do Cliente\n- Termo Assinado\n- Nota Fiscal`);
  };

  return (
    <>
      {/* Backdrop overlay */}
      <div 
        className={cn(
          "fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 transition-opacity duration-300",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      {/* Slide-over Panel */}
      <div 
        className={cn(
          "fixed top-0 right-0 h-screen w-full max-w-2xl bg-white shadow-2xl z-50 flex flex-col transform transition-transform duration-300 ease-in-out border-l border-slate-200",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-primary bg-primary/10 px-2.5 py-1 rounded-md w-fit mb-1">
              <FileText size={14} />
              RAE: {project.codigo_rae || 'Não informado'}
            </div>
            <h2 className="text-xl font-bold text-slate-800 tracking-tight">
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

        {/* Body (Scrollable Form) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-slate-50/50 hide-scrollbar">
          
          {/* Action Bar: Quick Contact WhatsApp & Email */}
          <section className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 p-5 rounded-2xl text-white shadow-md">
            <h3 className="text-xs font-bold uppercase tracking-wider text-purple-200 mb-2">
              Comunicação & Agendamento Rápido com o Cliente
            </h3>
            <p className="text-xs text-purple-300 mb-4">
              Dispare a mensagem de apresentação com pedido de agendamento em 1 clique:
            </p>
            
            <div className="flex flex-wrap gap-3">
              <a
                href={getWhatsAppLink()}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow transition-all"
              >
                <span>💬 Enviar WhatsApp com Link</span>
              </a>

              <a
                href={getEmailLink()}
                className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-bold text-xs px-4 py-2.5 rounded-xl border border-white/20 transition-all"
              >
                <span>✉️ Disparar E-mail ao Cliente</span>
              </a>
            </div>
          </section>

          {/* Cliente Section */}
          <section className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
            <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Building2 size={16} className="text-slate-400" />
              Dados do Cliente
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            </div>
          </section>

          {/* Contato e Endereço */}
          <section className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
            <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <User size={16} className="text-slate-400" />
              Contato e Localização
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputField 
                label="E-mail" 
                type="email"
                value={formData.email_cliente} 
                onChange={(v) => handleChange('email_cliente', v)} 
              />
              <InputField 
                label="Celular" 
                value={formData.celular} 
                onChange={(v) => handleChange('celular', v)} 
              />
              <div className="col-span-1 md:col-span-2">
                <InputField 
                  label="Endereço Completo" 
                  value={formData.endereco} 
                  onChange={(v) => handleChange('endereco', v)} 
                />
              </div>
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

          {/* Detalhes do Atendimento */}
          <section className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
            <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Clock size={16} className="text-slate-400" />
              Detalhes do Atendimento
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputField 
                label="Programa" 
                value={formData.programa} 
                onChange={(v) => handleChange('programa', v)} 
              />
              <InputField 
                label="Modalidade" 
                value={formData.modalidade} 
                onChange={(v) => handleChange('modalidade', v)} 
              />
              <div className="col-span-1 md:col-span-2">
                <InputField 
                  label="Solução Contratada" 
                  value={formData.solucao_contratada} 
                  onChange={(v) => handleChange('solucao_contratada', v)} 
                />
              </div>
              <div className="col-span-1 md:col-span-2">
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Objetivo do Atendimento</label>
                <textarea 
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all min-h-[80px]"
                  value={formData.objetivo_atendimento || ''}
                  onChange={(e) => handleChange('objetivo_atendimento', e.target.value)}
                />
              </div>
              
              <InputField 
                label="Horas Contratadas" 
                type="number"
                value={formData.horas_contratadas?.toString()} 
                onChange={(v) => handleChange('horas_contratadas', v ? parseFloat(v) : null)} 
              />
              <InputField 
                label="Horas Realizadas" 
                type="number"
                value={formData.horas_realizadas?.toString()} 
                onChange={(v) => handleChange('horas_realizadas', v ? parseFloat(v) : 0)} 
              />
            </div>
          </section>

          {/* Workflow Pós-Atendimento: Relatório, Foto, Termo Assinado & Nota Fiscal */}
          <section className="bg-purple-50/60 border border-purple-200 p-5 rounded-2xl space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileText size={18} className="text-primary" />
                Pós-Atendimento & Envio do Pacote ao SEBRAE
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Gere o termo resumido de atendimento, inclua a foto do cliente e anexe os documentos para finalizar o processo no Sebrae.
              </p>
            </div>

            {/* Foto do Atendimento */}
            <div className="p-3.5 bg-white rounded-xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-slate-800 block">1. Foto do Cliente / Atendimento:</span>
                <span className="text-[11px] text-slate-500">
                  {formData.dados_extra?.foto_cliente ? '✅ Foto anexa ao relatório' : 'Nenhuma foto anexada ainda'}
                </span>
              </div>
              <label className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-3 py-1.5 rounded-lg cursor-pointer transition-colors shrink-0">
                <span>{formData.dados_extra?.foto_cliente ? 'Alterar Foto' : '📷 Anexar Foto'}</span>
                <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
              </label>
            </div>

            {/* Gerar Documento para Assinatura */}
            <div className="p-3.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-slate-800 block">2. Termo de Atendimento com Foto:</span>
                <span className="text-[11px] text-slate-500">Gere o documento oficial pronto para o cliente assinar</span>
              </div>
              <button
                type="button"
                onClick={handlePrintReport}
                className="bg-primary hover:bg-primary-hover text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm transition-colors shrink-0 flex items-center gap-1.5"
              >
                <span>📄 Gerar Termo PDF</span>
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
              <label className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-3 py-1.5 rounded-lg cursor-pointer transition-colors shrink-0">
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
              <label className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-3 py-1.5 rounded-lg cursor-pointer transition-colors shrink-0">
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
                <span>🚀 Encaminhar Pacote Completo ao SEBRAE por E-mail</span>
              </button>
            </div>
          </section>

          {/* Observações */}
          <section className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Observações Extras</label>
            <textarea 
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all min-h-[100px]"
              value={formData.observacoes || ''}
              onChange={(e) => handleChange('observacoes', e.target.value)}
              placeholder="Anotações internas sobre o contrato..."
            />
          </section>

        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 p-4 bg-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            {saveSuccess && (
              <span className="flex items-center gap-1.5 text-sm font-medium text-emerald-600 animate-in fade-in slide-in-from-bottom-2">
                <CheckCircle2 size={16} /> Salvo com sucesso!
              </span>
            )}
          </div>
          <div className="flex gap-3">
            <button 
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancelar
            </button>
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className="px-5 py-2 rounded-lg text-sm font-medium text-white bg-primary hover:bg-primary-hover shadow-sm transition-all flex items-center gap-2 disabled:opacity-70"
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

  return (
    <>
      {/* Backdrop overlay */}
      <div 
        className={cn(
          "fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 transition-opacity duration-300",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      {/* Slide-over Panel */}
      <div 
        className={cn(
          "fixed top-0 right-0 h-screen w-full max-w-2xl bg-white shadow-2xl z-50 flex flex-col transform transition-transform duration-300 ease-in-out border-l border-slate-200",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-primary bg-primary/10 px-2.5 py-1 rounded-md w-fit mb-1">
              <FileText size={14} />
              RAE: {project.codigo_rae || 'Não informado'}
            </div>
            <h2 className="text-xl font-bold text-slate-800 tracking-tight">
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

        {/* Body (Scrollable Form) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-slate-50/50 hide-scrollbar">
          
          {/* Cliente Section */}
          <section className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
            <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Building2 size={16} className="text-slate-400" />
              Dados do Cliente
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            </div>
          </section>

          {/* Contato e Endereço */}
          <section className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
            <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <User size={16} className="text-slate-400" />
              Contato e Localização
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputField 
                label="E-mail" 
                type="email"
                value={formData.email_cliente} 
                onChange={(v) => handleChange('email_cliente', v)} 
              />
              <InputField 
                label="Celular" 
                value={formData.celular} 
                onChange={(v) => handleChange('celular', v)} 
              />
              <div className="col-span-1 md:col-span-2">
                <InputField 
                  label="Endereço Completo" 
                  value={formData.endereco} 
                  onChange={(v) => handleChange('endereco', v)} 
                />
              </div>
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

          {/* Atendimento */}
          <section className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
            <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Clock size={16} className="text-slate-400" />
              Detalhes do Atendimento
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputField 
                label="Programa" 
                value={formData.programa} 
                onChange={(v) => handleChange('programa', v)} 
              />
              <InputField 
                label="Modalidade" 
                value={formData.modalidade} 
                onChange={(v) => handleChange('modalidade', v)} 
              />
              <div className="col-span-1 md:col-span-2">
                <InputField 
                  label="Solução Contratada" 
                  value={formData.solucao_contratada} 
                  onChange={(v) => handleChange('solucao_contratada', v)} 
                />
              </div>
              <div className="col-span-1 md:col-span-2">
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Objetivo do Atendimento</label>
                <textarea 
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all min-h-[80px]"
                  value={formData.objetivo_atendimento || ''}
                  onChange={(e) => handleChange('objetivo_atendimento', e.target.value)}
                />
              </div>
              
              <InputField 
                label="Horas Contratadas" 
                type="number"
                value={formData.horas_contratadas?.toString()} 
                onChange={(v) => handleChange('horas_contratadas', v ? parseFloat(v) : null)} 
              />
              <InputField 
                label="Horas Realizadas" 
                type="number"
                value={formData.horas_realizadas?.toString()} 
                onChange={(v) => handleChange('horas_realizadas', v ? parseFloat(v) : 0)} 
              />
            </div>
          </section>

          {/* Observações */}
          <section className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Observações Extras</label>
            <textarea 
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all min-h-[120px]"
              value={formData.observacoes || ''}
              onChange={(e) => handleChange('observacoes', e.target.value)}
              placeholder="Anotações internas sobre o contrato..."
            />
          </section>

        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 p-4 bg-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            {saveSuccess && (
              <span className="flex items-center gap-1.5 text-sm font-medium text-emerald-600 animate-in fade-in slide-in-from-bottom-2">
                <CheckCircle2 size={16} /> Salvo com sucesso!
              </span>
            )}
          </div>
          <div className="flex gap-3">
            <button 
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancelar
            </button>
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className="px-5 py-2 rounded-lg text-sm font-medium text-white bg-primary hover:bg-primary-hover shadow-sm transition-all flex items-center gap-2 disabled:opacity-70"
            >
              <Save size={16} />
              {isSaving ? 'Salvando...' : 'Salvar Alterações'}
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
      <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">{label}</label>
      <input 
        type={type}
        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
