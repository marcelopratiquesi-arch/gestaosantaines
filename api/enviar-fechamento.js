export default async function handler(req, res) {
  // Sempre responder JSON
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  // Esta rota aceita somente POST
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }

  try {
    const apiKey = process.env.RESEND_API_KEY;
    const emailTo = process.env.REPORT_EMAIL_TO;
    const emailFrom = process.env.REPORT_EMAIL_FROM;

    // Confere se as variáveis da Vercel existem
    if (!apiKey || !emailTo || !emailFrom) {
      console.error('[FECHAMENTO] Variáveis de ambiente ausentes.');
      return res.status(500).json({
        success: false,
        error: 'Configuração de e-mail incompleta.'
      });
    }

    const payload = req.body || {};
    console.log('[FECHAMENTO] Solicitação recebida.');

    // --- FUNÇÕES DE FORMATAÇÃO SEGURA ---
    const isInvalid = (val) => val === null || val === undefined || Number.isNaN(val);

    const formatMoney = (val) => {
      if (isInvalid(val)) return null;
      return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
    };

    const formatInt = (val) => {
      if (isInvalid(val)) return null;
      return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(val);
    };

    // Renderiza uma linha de tabela apenas se o valor existir
    const renderRow = (label, value, isCurrency = false) => {
      if (isInvalid(value)) return '';
      const formattedValue = isCurrency ? formatMoney(value) : formatInt(value);
      if (!formattedValue) return ''; // Dupla verificação de segurança
      
      return `
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #F3F4F6; color: #4B5563; font-size: 14px;">${label}</td>
          <td style="padding: 8px 0; border-bottom: 1px solid #F3F4F6; text-align: right; color: #111827; font-weight: bold; font-size: 14px;">${formattedValue}</td>
        </tr>
      `;
    };

    // Renderiza status dos arquivos
    const renderFileStatus = (label, isLoaded) => {
      if (isLoaded) {
        return `<div style="color: #10B981; font-weight: bold; font-size: 14px; margin-bottom: 4px;">✓ ${label}</div>`;
      }
      return `<div style="color: #9CA3AF; font-size: 14px; margin-bottom: 4px;">— ${label} <span style="font-size: 11px; font-weight: normal;">(Não carregado)</span></div>`;
    };

    // Renderiza a composição das entradas se existir
    const renderGrupos = (grupos) => {
      if (!grupos) return '';
      return `
        <div style="margin-top: 16px; background: #F9FAFB; border-radius: 8px; padding: 16px;">
          <h4 style="margin: 0 0 12px 0; font-size: 12px; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px;">Composição das Entradas</h4>
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            ${renderRow('Nutri', grupos.nutri)}
            ${renderRow('Plus', grupos.plus)}
            ${renderRow('Fit', grupos.fit)}
            ${renderRow('Class', grupos.class)}
            ${renderRow('Outros Planos', grupos.outros)}
          </table>
        </div>
      `;
    };

    // Dados seguros de arquivos
    const arquivos = payload.arquivos || {};

    // --- MONTAGEM DO HTML DO E-MAIL ---
    const html = `
      <!DOCTYPE html>
      <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background-color: #F3F4F6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
          
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #F3F4F6; padding: 20px 10px;">
            <tr>
              <td align="center">
                
                <!-- CONTAINER PRINCIPAL -->
                <table width="100%" max-width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #FFFFFF; border-radius: 12px; overflow: hidden; max-width: 600px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                  
                  <!-- CABEÇALHO -->
                  <tr>
                    <td style="background-color: #111827; border-top: 4px solid #ED1C24; padding: 32px 24px; text-align: center;">
                      <h2 style="margin: 0; color: #9CA3AF; font-size: 12px; text-transform: uppercase; letter-spacing: 2px;">Painel Gestão Santa Inês</h2>
                      <h1 style="margin: 8px 0; color: #FFFFFF; font-size: 24px; font-weight: bold;">Relatório de Fechamento</h1>
                      <p style="margin: 0; color: #F3F4F6; font-size: 14px;">${escapeHtml(payload.dataStr || '--/--/----')} • ${escapeHtml(payload.horaStr || '--:--')}</p>
                    </td>
                  </tr>

                  <!-- ARQUIVOS PROCESSADOS -->
                  <tr>
                    <td style="padding: 24px; border-bottom: 1px solid #E5E7EB; background: #F9FAFB;">
                      <h3 style="margin: 0 0 16px 0; font-size: 13px; color: #4B5563; text-transform: uppercase; letter-spacing: 1px;">Arquivos Processados</h3>
                      ${renderFileStatus('Faturamento', arquivos.hasSales)}
                      ${renderFileStatus('Recebimento', arquivos.hasReceipts)}
                      ${renderFileStatus('Recebíveis', arquivos.hasReceivables)}
                      ${renderFileStatus('Ativos', arquivos.hasActives)}
                      ${renderFileStatus('Entradas', arquivos.hasEntradas)}
                      ${renderFileStatus('Cancelados', arquivos.hasCancelados)}
                      ${renderFileStatus('Visitantes', arquivos.hasVisitantes)}
                    </td>
                  </tr>

                  <!-- SANTA INÊS 1 -->
                  <tr>
                    <td style="padding: 32px 24px; border-bottom: 1px solid #E5E7EB;">
                      <h3 style="margin: 0 0 20px 0; font-size: 18px; color: #ED1C24; font-weight: bold;">SANTA INÊS 1</h3>
                      <table width="100%" cellpadding="0" cellspacing="0" border="0">
                        ${renderRow('Faturamento', payload.si1?.faturamento, true)}
                        ${renderRow('Recebimento', payload.si1?.recebimento, true)}
                        ${renderRow('Recebíveis', payload.si1?.recebiveis, true)}
                        ${renderRow('Ativos', payload.si1?.ativos)}
                        ${renderRow('Entradas', payload.si1?.entradas)}
                        ${renderRow('Cancelados', payload.si1?.cancelados)}
                      </table>
                      ${renderGrupos(payload.si1?.gruposEntradas)}
                    </td>
                  </tr>

                  <!-- SANTA INÊS 2 -->
                  <tr>
                    <td style="padding: 32px 24px; border-bottom: 1px solid #E5E7EB;">
                      <h3 style="margin: 0 0 20px 0; font-size: 18px; color: #1E3A8A; font-weight: bold;">SANTA INÊS 2</h3>
                      <table width="100%" cellpadding="0" cellspacing="0" border="0">
                        ${renderRow('Faturamento', payload.si2?.faturamento, true)}
                        ${renderRow('Recebimento', payload.si2?.recebimento, true)}
                        ${renderRow('Recebíveis', payload.si2?.recebiveis, true)}
                        ${renderRow('Ativos', payload.si2?.ativos)}
                        ${renderRow('Entradas', payload.si2?.entradas)}
                        ${renderRow('Cancelados', payload.si2?.cancelados)}
                        ${renderRow('Personal Class', payload.si2?.personalClass)}
                      </table>
                      ${renderGrupos(payload.si2?.gruposEntradas)}
                    </td>
                  </tr>

                  <!-- INDICADORES GERAIS -->
                  ${payload.globais && (!isInvalid(payload.globais.visitantes) || !isInvalid(payload.globais.visitantesWellhub)) ? `
                  <tr>
                    <td style="padding: 32px 24px; border-bottom: 1px solid #E5E7EB;">
                      <h3 style="margin: 0 0 20px 0; font-size: 16px; color: #059669; font-weight: bold;">INDICADORES GLOBAIS</h3>
                      <table width="100%" cellpadding="0" cellspacing="0" border="0">
                        ${renderRow('Visitantes', payload.globais.visitantes)}
                        ${renderRow('Visitantes Wellhub', payload.globais.visitantesWellhub)}
                      </table>
                    </td>
                  </tr>
                  ` : ''}

                  <!-- CONSOLIDADO GERAL -->
                  ${payload.consolidado ? `
                  <tr>
                    <td style="padding: 32px 24px; background-color: #1F2937;">
                      <h3 style="margin: 0 0 20px 0; font-size: 16px; color: #FFFFFF; text-transform: uppercase; letter-spacing: 1px;">Consolidado Geral</h3>
                      <table width="100%" cellpadding="0" cellspacing="0" border="0">
                        ${renderRow('<span style="color:#D1D5DB">Faturamento Total</span>', payload.consolidado.faturamento, true).replace('color: #111827', 'color: #FFFFFF')}
                        ${renderRow('<span style="color:#D1D5DB">Recebimento Total</span>', payload.consolidado.recebimento, true).replace('color: #111827', 'color: #4ADE80')}
                        ${renderRow('<span style="color:#D1D5DB">Recebíveis Total</span>', payload.consolidado.recebiveis, true).replace('color: #111827', 'color: #C084FC')}
                        ${renderRow('<span style="color:#D1D5DB">Ativos Total</span>', payload.consolidado.ativos).replace('color: #111827', 'color: #60A5FA')}
                        ${renderRow('<span style="color:#D1D5DB">Entradas Total</span>', payload.consolidado.entradas).replace('color: #111827', 'color: #FBBF24')}
                        ${renderRow('<span style="color:#D1D5DB">Cancelados Total</span>', payload.consolidado.cancelados).replace('color: #111827', 'color: #F472B6')}
                      </table>
                    </td>
                  </tr>
                  ` : ''}

                  <!-- CONFIGURAÇÃO -->
                  ${payload.configuracao ? `
                  <tr>
                    <td style="padding: 24px; background-color: #F9FAFB; border-top: 1px solid #E5E7EB;">
                      <h3 style="margin: 0 0 16px 0; font-size: 13px; color: #4B5563; text-transform: uppercase; letter-spacing: 1px;">Classificação das Nomenclaturas</h3>
                      <table width="100%" cellpadding="0" cellspacing="0" border="0">
                        ${renderRow('Santa Inês 1', payload.configuracao.si1)}
                        ${renderRow('Santa Inês 2', payload.configuracao.si2)}
                        ${renderRow('Não Classificados', payload.configuracao.ignorados)}
                      </table>
                      ${payload.configuracao.ignorados >= 1 ? `
                        <p style="margin: 12px 0 0 0; font-size: 12px; color: #D97706; background: #FEF3C7; padding: 12px; border-radius: 6px;">
                          <strong>Aviso:</strong> ${payload.configuracao.ignorados} nomenclatura(s) permanece(m) como "Não Classificado" e não entrou/entraram nas métricas acima.
                        </p>
                      ` : ''}
                    </td>
                  </tr>
                  ` : ''}

                  <!-- RODAPÉ -->
                  <tr>
                    <td style="padding: 24px; text-align: center; background-color: #E5E7EB;">
                      <p style="margin: 0; font-size: 12px; color: #6B7280;">
                        Relatório gerado automaticamente pelo<br><strong>Painel Gestão Santa Inês</strong>.
                      </p>
                    </td>
                  </tr>

                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',

      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },

      body: JSON.stringify({
        from: emailFrom,
        to: [emailTo],
        subject: `Fechamento Santa Inês • ${payload.dataStr || ''} • ${payload.horaStr || ''}`,
        html: html
      })
    });

    const responseText = await resendResponse.text();
    let resendData = null;

    try {
      resendData = JSON.parse(responseText);
    } catch {
      resendData = null;
    }

    if (!resendResponse.ok) {
      console.error(
        '[FECHAMENTO] Resend recusou o envio:',
        resendResponse.status,
        responseText
      );

      return res.status(502).json({
        success: false,
        error: 'O serviço de e-mail recusou o envio.'
      });
    }

    console.log(
      '[FECHAMENTO] E-mail aceito pelo provedor.',
      resendData?.id || ''
    );

    return res.status(200).json({
      success: true,
      messageId: resendData?.id || null
    });

  } catch (error) {
    console.error('[FECHAMENTO] Erro interno:', error);

    return res.status(500).json({
      success: false,
      error: 'Erro interno ao enviar o fechamento.'
    });
  }
}

// Impede que conteúdo recebido seja interpretado como HTML do e-mail (Proteção contra XSS simples)
function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
