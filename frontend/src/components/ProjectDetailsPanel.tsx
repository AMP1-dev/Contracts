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
      setTimeout(() => setSaveSuccess(false), 3000);
    } else {
      console.error(error);
      alert('Erro ao salvar os dados.');
    }
    
    setIsSaving(false);
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
