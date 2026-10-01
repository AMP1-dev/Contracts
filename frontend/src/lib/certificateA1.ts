import forge from 'node-forge';

export interface CertificateA1Info {
  fileName: string;
  pfxBase64: string;
  password?: string;
  titular: string;
  documento: string; // CNPJ ou CPF formatado
  tipoDocumento: 'CPF' | 'CNPJ' | 'OUTRO';
  emissor: string;
  validadeInicio: string;
  validadeFim: string;
  isValido: boolean;
  diasRestantes: number;
  serialNumber: string;
  ativo: boolean;
  dataUpload: string;
}

/**
 * Lê e valida um arquivo de Certificado Digital A1 (.pfx / .p12) com a senha fornecida.
 * Extrai o titular (e-CPF ou e-CNPJ), documento, autoridade certificadora e período de validade.
 */
export function parsePfxCertificate(
  pfxArrayBuffer: ArrayBuffer,
  password: string,
  fileName: string
): CertificateA1Info {
  // Converte ArrayBuffer para string binária suportada pelo forge
  const bytes = new Uint8Array(pfxArrayBuffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }

  let p12Asn1;
  try {
    p12Asn1 = forge.asn1.fromDer(binary);
  } catch (err: any) {
    throw new Error('O arquivo selecionado não é um certificado PKCS#12 (.pfx / .p12) válido.');
  }

  let p12;
  try {
    p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, password);
  } catch (err: any) {
    throw new Error('Senha do certificado A1 incorreta ou arquivo corrompido.');
  }

  // Localiza o certificado do usuário
  const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
  const certBagList = certBags[forge.pki.oids.certBag] || [];
  if (certBagList.length === 0) {
    throw new Error('Nenhum certificado X.509 encontrado dentro do arquivo .pfx.');
  }

  let cert = certBagList[0]?.cert;
  for (const b of certBagList) {
    if (b.cert && b.cert.extensions) {
      const isCa = b.cert.extensions.find(
        (ext: any) => ext.name === 'basicConstraints' && ext.cA === true
      );
      if (!isCa) {
        cert = b.cert;
        break;
      }
    }
  }

  if (!cert) {
    throw new Error('Certificado principal do titular não identificado.');
  }

  // Extração do Nome do Titular e Documento a partir do CN (Common Name)
  const subjectAttrs = cert.subject.attributes;
  const cnAttr = subjectAttrs.find(
    (a: any) => a.name === 'commonName' || a.type === '2.5.4.3'
  );
  const rawCn = cnAttr ? String(cnAttr.value) : 'Certificado Digital ICP-Brasil';

  let titular = rawCn;
  let documento = '';
  let tipoDocumento: 'CPF' | 'CNPJ' | 'OUTRO' = 'OUTRO';

  if (rawCn.includes(':')) {
    const parts = rawCn.split(':');
    titular = parts[0].trim();
    const docPart = parts[1].trim().replace(/\D/g, '');
    if (docPart.length === 11) {
      documento = docPart.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
      tipoDocumento = 'CPF';
    } else if (docPart.length === 14) {
      documento = docPart.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
      tipoDocumento = 'CNPJ';
    } else {
      documento = docPart;
    }
  }

  // Autoridade Certificadora Emissora
  const issuerAttrs = cert.issuer.attributes;
  const issuerCn = issuerAttrs.find(
    (a: any) => a.name === 'commonName' || a.type === '2.5.4.3'
  );
  const issuerO = issuerAttrs.find(
    (a: any) => a.name === 'organizationName' || a.type === '2.5.4.10'
  );
  const emissor = issuerCn
    ? String(issuerCn.value)
    : issuerO
    ? String(issuerO.value)
    : 'Autoridade Certificadora ICP-Brasil';

  // Validade
  const notBefore = cert.validity.notBefore;
  const notAfter = cert.validity.notAfter;
  const now = new Date();
  const isValido = now >= notBefore && now <= notAfter;
  const diffMs = notAfter.getTime() - now.getTime();
  const diasRestantes = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

  // Serial Number
  const serialNumber = cert.serialNumber || '';

  // Converte para Base64 seguro
  let base64 = '';
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    base64 += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunkSize)));
  }
  const pfxBase64 = btoa(base64);

  return {
    fileName,
    pfxBase64,
    password,
    titular,
    documento: documento || 'Padrão ICP-Brasil',
    tipoDocumento,
    emissor,
    validadeInicio: notBefore.toLocaleDateString('pt-BR'),
    validadeFim: notAfter.toLocaleDateString('pt-BR'),
    isValido,
    diasRestantes,
    serialNumber,
    ativo: isValido,
    dataUpload: new Date().toISOString(),
  };
}

/**
 * Assina criptograficamente uma string ou dados de relatório com a Chave Privada RSA do Certificado A1.
 * Gera o Hash SHA-256 e a Assinatura RSA em Base64 para compor o carimbo oficial.
 */
export function signDocumentHash(
  pfxBase64: string,
  password: string,
  contentToSign: string
): { signatureHex: string; signatureBase64: string; hashSHA256: string; timestampIso: string } {
  const binary = atob(pfxBase64);
  const p12Asn1 = forge.asn1.fromDer(binary);
  const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, password);

  // Localiza a chave privada
  const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
  const keyBagList = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag] || [];
  let keyBag = keyBagList[0];
  if (!keyBag) {
    const normalKeyBags = p12.getBags({ bagType: forge.pki.oids.keyBag });
    keyBag = (normalKeyBags[forge.pki.oids.keyBag] || [])[0];
  }

  if (!keyBag || !keyBag.key) {
    throw new Error('Chave privada RSA não localizada no certificado A1.');
  }

  const privateKey: any = keyBag.key;

  // Calcula o Hash SHA-256
  const md = forge.md.sha256.create();
  md.update(contentToSign, 'utf8');
  const hashSHA256 = md.digest().toHex().toUpperCase();

  // Assina com RSA-SHA256
  const signatureBytes = privateKey.sign(md);
  const signatureHex = forge.util.bytesToHex(signatureBytes);
  const signatureBase64 = forge.util.encode64(signatureBytes);

  return {
    signatureHex,
    signatureBase64,
    hashSHA256,
    timestampIso: new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
  };
}

/**
 * Recupera o certificado A1 salvo no localStorage ou configurações da empresa.
 */
export function getSavedCertificateA1(): CertificateA1Info | null {
  try {
    const saved = localStorage.getItem('amp_company_config');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.certificateA1 && parsed.certificateA1.ativo) {
        return parsed.certificateA1 as CertificateA1Info;
      }
    }
  } catch (e) {
    console.error('Erro ao ler certificado A1 salvo:', e);
  }
  return null;
}
