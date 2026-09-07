import * as pdfjsLib from 'pdfjs-dist';
import type { Project } from '../types/database';

// Configure pdfjs worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export interface ParsedOSResult {
  osNumber: string | null;
  codigoSgf: string | null;
  produto: string | null;
  unidadeDemandante: string | null;
  gestorResponsavel: string | null;
  emailGestor: string | null;
  clients: Array<{
    rae: string | null;
    cpf: string | null;
    cnpj: string | null;
    nome: string | null;
    telefone: string | null;
    localAtendimento: string | null;
  }>;
}

export async function parsePdfFile(file: File): Promise<Project[]> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdfDoc = await loadingTask.promise;

  let fullText = '';
  for (let i = 1; i <= pdfDoc.numPages; i++) {
    const page = await pdfDoc.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item: any) => item.str).join(' ');
    fullText += pageText + '\n';
  }

  return parseOsText(fullText, file.name);
}

export function parseOsText(text: string, fileName: string): Project[] {
  const now = new Date().toISOString();

  // Extract OS Number
  const osMatch = text.match(/(?:N[º°]?\s*ORDEM\s*SERVIÇO|Ordem\s*de\s*Serviço\s*n[º°]?)\s*[:\s]*([0-9\/\-]+)/i);
  const osNumber = osMatch ? osMatch[1].trim() : null;

  // Extract SGF Code
  const sgfMatch = text.match(/CÓDIGO\s*SGF\s*[:\s]*([A-Z0-9]+)/i);
  const codigoSgf = sgfMatch ? sgfMatch[1].trim() : null;

  // Extract Gestor
  const gestorMatch = text.match(/GESTOR\s*RESPONSÁVEL\s*[:\s]*([A-Z\s]+?)(?=\s*E-MAIL|\s*CÓDIGO|$)/i);
  const gestor = gestorMatch ? gestorMatch[1].trim() : null;

  // Extract E-mail Gestor
  const emailGestorMatch = text.match(/E-MAIL\s*[:\s]*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
  const emailGestor = emailGestorMatch ? emailGestorMatch[1].trim() : null;

  // Extract Produto Aplicado
  const produtoMatch = text.match(/PRODUTO\s*APLICADO\s*[:\s]*([^]+?)(?=\s*OBJETO|\s*DADOS DO|$)/i);
  const produto = produtoMatch ? produtoMatch[1].trim().replace(/\s+/g, ' ') : 'Consultoria Sebrae';

  // Extract Modalidade
  const isPresencial = /presencial/i.test(text);
  const modalidade = isPresencial ? 'Presencial' : 'À Distância (Online)';

  // Parse Clients from DADOS DO(S) CLIENTE(S)
  // Format typically: Cliente 01 Código RAE: 39165712 CPF do Cliente: 389.775.118-60 Nome do Cliente: PRICILA DE OLIVEIRA CIACCO CNPJ: 52.018.274/0001-01 Telefone do Cliente: (19) 98266-0000
  const clientRegex = /Cliente\s*(\d+)[\s\S]*?Código\s*RAE\s*[:\s]*([0-9]+)[\s\S]*?CPF\s*(?:do\s*Cliente)?\s*[:\s]*([0-9.\-]+)[\s\S]*?Nome\s*(?:do\s*Cliente)?\s*[:\s]*([A-ZÁÉÍÓÚÂÊÔÃÕÇ\s\-]+?)\s*CNPJ\s*[:\s]*([0-9.\/\-]+)[\s\S]*?Telefone\s*(?:do\s*Cliente)?\s*[:\s]*(\([0-9]{2}\)\s*[0-9\-\s]+)/gi;

  const parsedClients: any[] = [];
  let match;
  while ((match = clientRegex.exec(text)) !== null) {
    parsedClients.push({
      num: match[1],
      rae: match[2],
      cpf: match[3],
      nome: match[4].trim(),
      cnpj: match[5],
      telefone: match[6].trim(),
    });
  }

  // Fallback matchers if regex is slightly off
  if (parsedClients.length === 0) {
    // Try splitting by "Cliente XX" or "Cliente "
    const clientBlocks = text.split(/Cliente\s+\d+/i);
    if (clientBlocks.length > 1) {
      for (let i = 1; i < clientBlocks.length; i++) {
        const block = clientBlocks[i];
        const raeM = block.match(/RAE\s*[:\s]*([0-9]+)/i);
        const cpfM = block.match(/CPF\s*[:\s]*([0-9.\-]+)/i);
        const cnpjM = block.match(/CNPJ\s*[:\s]*([0-9.\/\-]+)/i);
        const nomeM = block.match(/Nome\s*(?:do\s*Cliente)?\s*[:\s]*([A-ZÁÉÍÓÚÂÊÔÃÕÇ\s\-]{3,40})/i);
        const telM = block.match(/Telefone\s*(?:do\s*Cliente)?\s*[:\s]*(\([0-9]{2}\)\s*[0-9\-\s]+)/i);

        if (nomeM || raeM || cnpjM) {
          parsedClients.push({
            num: String(i),
            rae: raeM ? raeM[1] : null,
            cpf: cpfM ? cpfM[1] : null,
            nome: nomeM ? nomeM[1].trim() : `Cliente ${i}`,
            cnpj: cnpjM ? cnpjM[1] : null,
            telefone: telM ? telM[1].trim() : null,
          });
        }
      }
    }
  }

  // If no structured clients found, create single project
  if (parsedClients.length === 0) {
    const singleRae = text.match(/(?:RAE|RAE\s*Código)\s*[:\s]*([0-9\/\-]+)/i);
    const singleCnpj = text.match(/CNPJ\s*[:\s]*([0-9.\/\-]+)/i);
    const singleCpf = text.match(/CPF\s*[:\s]*([0-9.\-]+)/i);
    const singleNome = text.match(/Nome\s*(?:do\s*Cliente)?\s*[:\s]*([A-ZÁÉÍÓÚÂÊÔÃÕÇ\s\-]{3,50})/i);

    return [{
      id: `pdf-${Date.now()}`,
      consultor_id: 'admin-1',
      codigo_rae: singleRae ? singleRae[1] : (osNumber ? `OS ${osNumber}` : `RAE-${Math.floor(1000 + Math.random() * 9000)}`),
      status: 'novo_contrato',
      nome_cliente: singleNome ? singleNome[1].trim() : fileName.replace(/\.pdf$/i, ''),
      razao_social: singleNome ? singleNome[1].trim() : fileName.replace(/\.pdf$/i, ''),
      cnpj: singleCnpj ? singleCnpj[1] : null,
      cpf: singleCpf ? singleCpf[1] : null,
      solucao_contratada: produto,
      objetivo_atendimento: `Ordem de Serviço ${osNumber || ''} importada via PDF.`,
      horas_contratadas: 4,
      horas_realizadas: 0,
      data_prevista_inicio: now.split('T')[0],
      data_prevista_fim: now.split('T')[0],
      modalidade,
      valor_consultoria: 1224,
      observacoes: `Gestor: ${gestor || 'N/A'} (${emailGestor || 'N/A'}) | SGF: ${codigoSgf || 'N/A'}`,
      dados_extra: { os_number: osNumber, sgf: codigoSgf, gestor, email_gestor: emailGestor },
      criado_em: now,
      atualizado_em: now,
    }];
  }

  // Desmembrar: Generate 1 Project per Client
  return parsedClients.map((client, idx) => ({
    id: `pdf-${osNumber || Date.now()}-${idx + 1}`,
    consultor_id: 'admin-1',
    codigo_rae: client.rae ? client.rae : (osNumber ? `OS ${osNumber}` : `RAE-${idx + 1}`),
    status: 'novo_contrato' as const,
    nome_cliente: client.nome,
    razao_social: client.nome,
    cnpj: client.cnpj,
    cpf: client.cpf,
    telefone: client.telefone,
    solucao_contratada: produto,
    objetivo_atendimento: `Atendimento ${client.nome} - OS ${osNumber || ''} (Cliente ${idx + 1}/${parsedClients.length})`,
    horas_contratadas: 4,
    horas_realizadas: 0,
    data_prevista_inicio: now.split('T')[0],
    data_prevista_fim: now.split('T')[0],
    modalidade,
    valor_consultoria: 1224,
    observacoes: `OS ${osNumber || ''} | Cliente ${idx + 1} de ${parsedClients.length} | Gestor: ${gestor || 'LIVIA ROMERO SILVA'} (${emailGestor || 'liviars@sebraesp.com.br'})`,
    dados_extra: {
      os_number: osNumber,
      sgf: codigoSgf,
      gestor,
      email_gestor: emailGestor,
      cliente_num: client.num || idx + 1,
    },
    criado_em: now,
    atualizado_em: now,
  }));
}
