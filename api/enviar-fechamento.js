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

    // --- HELPERS DE FORMATAÇÃO E HTML (Limpos e Seguros) ---
    const formatMoney = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
    const formatNumber = (val) => new Intl.NumberFormat('pt-BR').format(val || 0);

    const renderRow = (label, value, isCurrency = false) => {
        if (value === null || value === undefined || Number.isNaN(value)) return '';
        const displayValue = isCurrency ? formatMoney(value) : formatNumber(value);
        return `
        <tr>
            <td style="padding: 8px 0; border-bottom: 1px dashed #F3F4F6; font-size: 14px; color: #4B5563;">${label}</td>
            <td style="padding: 8px 0; border-bottom: 1px dashed #F3F4F6; font-size: 14px; color: #111827; font-weight: bold; text-align: right;">${displayValue}</td>
        </tr>`;
    };

    const renderGrupos = (grupos) => {
        if (!grupos) return '';
        return `
        <div style="background-color: #F9FAFB; padding: 15px; border-radius: 6px; margin-top: 15px; border: 1px solid #E5E7EB;">
            <div style="font-size: 12px; font-weight: bold; color: #6B7280; text-transform: uppercase; margin-bottom: 10px;">Composição das Entradas</div>
            <div style="display: flex; justify-content: space-between; font-size: 13px; padding: 4px 0; color: #374151;"><span>🥗 Nutri</span><strong>${formatNumber(grupos.nutri)}</strong></div>
            <div style="display: flex; justify-content: space-between; font-size: 13px; padding: 4px 0; color: #374151;"><span>⭐ Plus</span><strong>${formatNumber(grupos.plus)}</strong></div>
            <div style="display: flex; justify-content: space-between; font-size: 13px; padding: 4px 0; color: #374151;"><span>🏃 Fit</span><strong>${formatNumber(grupos.fit)}</strong></div>
            <div style="display: flex; justify-content: space-between; font-size: 13px; padding: 4px 0; color: #374151;"><span>🏋️ Class</span><strong>${formatNumber(grupos.class)}</strong></div>
            <div style="display: flex; justify-content: space-between; font-size: 13px; padding: 4px 0; color: #374151;"><span>🧩 Outros Planos</span><strong>${formatNumber(grupos.outros)}</strong></div>
        </div>`;
    };

    const h = payload.arquivos || {};

    const html = `
      <!DOCTYPE html>
      <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
        </head>
        <body style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #F3F4F6; padding: 20px; color: #111827;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            
            <!-- CABEÇALHO -->
            <div style="background-color: #111827; color: #FFFFFF; padding: 32px 24px; text-align: center; border-top: 4px solid #ED1C24;">
              <h2 style="margin: 0; color: #9CA3AF; font-size: 12px; text-transform: uppercase; letter-spacing: 2px;">Painel Gestão Santa Inês</h2>
              <h1 style="margin: 8px 0; color: #FFFFFF; font-size: 24px; font-weight: bold;">Relatório de Fechamento</h1>
              <p style="margin: 0; color: #F3F4F6; font-size: 14px;">${payload.dataStr || ''} • ${payload.horaStr || ''}</p>
            </div>

            <!-- ARQUIVOS PROCESSADOS -->
            <div style="padding: 24px; border-bottom: 1px solid #E5E7EB; background: #F9FAFB;">
              <h3 style="margin: 0 0 16px 0; font-size: 13px; color: #4B5563; text-transform: uppercase; letter-spacing: 1px;">Arquivos Processados</h3>
              <div style="font-size: 14px; line-height: 1.6; color: #374151;">
                <div>${h.hasSales ? '<span style="color:#10B981; font-weight:bold;">✓</span> Faturamento' : '<span style="color:#9CA3AF;">— Faturamento</span>'}</div>
                <div>${h.hasReceipts ? '<span style="color:#10B981; font-weight:bold;">✓</span> Recebimento' : '<span style="color:#9CA3AF;">— Recebimento</span>'}</div>
                <div>${h.hasActives ? '<span style="color:#10B981; font-weight:bold;">✓</span> Ativos' : '<span style="color:#9CA3AF;">— Ativos</span>'}</div>
                <div>${h.hasPaidActives ? '<span style="color:#10B981; font-weight:bold;">✓</span> Ativos Pagos' : '<span style="color:#9CA3AF;">— Ativos Pagos</span>'}</div>
                <div>${h.hasEntradas ? '<span style="color:#10B981; font-weight:bold;">✓</span> Entradas' : '<span style="color:#9CA3AF;">— Entradas</span>'}</div>
                <div>${h.hasCancelados ? '<span style="color:#10B981; font-weight:bold;">✓</span> Cancelados' : '<span style="color:#9CA3AF;">— Cancelados</span>'}</div>
                <div>${h.hasReceivables ? '<span style="color:#10B981; font-weight:bold;">✓</span> Recebíveis' : '<span style="color:#9CA3AF;">— Recebíveis</span>'}</div>
                <div>${h.hasVisitantes ? '<span style="color:#10B981; font-weight:bold;">✓</span> Visitantes' : '<span style="color:#9CA3AF;">— Visitantes</span>'}</div>
              </div>
            </div>

            <!-- SANTA INÊS 1 -->
            <div style="padding: 32px 24px; border-bottom: 1px solid #E5E7EB;">
              <h3 style="margin: 0 0 20px 0; font-size: 18px; color: #ED1C24; font-weight: bold; text-transform: uppercase;">Santa Inês 1</h3>
              <table style="width: 100%; border-collapse: collapse;">
                ${renderRow('Faturamento', payload.si1?.faturamento, true)}
                ${renderRow('Recebimento', payload.si1?.recebimento, true)}
                ${renderRow('Ativos', payload.si1?.ativos)}
                ${renderRow('Ativos Pagos', payload.si1?.ativosPagos)}
                ${renderRow('Entradas', payload.si1?.entradas)}
                ${renderRow('Cancelados', payload.si1?.cancelados)}
                ${renderRow('Recebíveis', payload.si1?.recebiveis, true)}
              </table>
              ${h.hasEntradas ? renderGrupos(payload.si1?.gruposEntradas) : ''}
            </div>

            <!-- SANTA INÊS 2 -->
            <div style="padding: 32px 24px; border-bottom: 1px solid #E5E7EB;">
              <h3 style="margin: 0 0 20px 0; font-size: 18px; color: #1E3A8A; font-weight: bold; text-transform: uppercase;">Santa Inês 2</h3>
              <table style="width: 100%; border-collapse: collapse;">
                ${renderRow('Faturamento', payload.si2?.faturamento, true)}
                ${renderRow('Recebimento', payload.si2?.recebimento, true)}
                ${renderRow('Ativos', payload.si2?.ativos)}
                ${renderRow('Ativos Pagos', payload.si2?.ativosPagos)}
                ${renderRow('Entradas', payload.si2?.entradas)}
                ${renderRow('Cancelados', payload.si2?.cancelados)}
                ${renderRow('Recebíveis', payload.si2?.recebiveis, true)}
                ${renderRow('Personal Class', payload.si2?.personalClass)}
              </table>
              ${h.hasEntradas ? renderGrupos(payload.si2?.gruposEntradas) : ''}
            </div>

            <!-- GLOBAIS E CONFIGURACAO -->
            <div style="padding: 32px 24px; border-bottom: 1px solid #E5E7EB;">
                ${h.hasVisitantes ? `
                <h3 style="margin: 0 0 20px 0; font-size: 16px; color: #059669; font-weight: bold; text-transform: uppercase;">Indicadores Globais</h3>
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
                    ${renderRow('Visitantes Avulsos', payload.globais?.visitantes)}
                    ${renderRow('Visitantes Wellhub', payload.globais?.visitantesWellhub)}
                </table>
                ` : ''}

                <h3 style="margin: 0 0 16px 0; font-size: 13px; color: #6B7280; text-transform: uppercase; letter-spacing: 1px;">Classificação das Nomenclaturas</h3>
                <div style="font-size: 13px; color: #4B5563; line-height: 1.8;">
                    <div>Santa Inês 1 ........ <strong>${payload.configuracao?.si1 || 0}</strong></div>
                    <div>Santa Inês 2 ........ <strong>${payload.configuracao?.si2 || 0}</strong></div>
                    <div>Não classificados ... <strong>${payload.configuracao?.ignorados || 0}</strong></div>
                </div>
                ${payload.configuracao?.ignorados >= 1 ? `<p style="margin: 12px 0 0 0; font-size: 12px; color: #D97706; background: #FEF3C7; padding: 12px; border-radius: 6px;">⚠️ ${payload.configuracao.ignorados} nomenclatura(s) permanece(m) Não Classificada(s).</p>` : ''}
            </div>

            <!-- CONSOLIDADO GERAL -->
            <div style="padding: 32px 24px; background-color: #111827;">
              <h3 style="margin: 0 0 20px 0; font-size: 16px; color: #FFFFFF; text-transform: uppercase; letter-spacing: 1px;">Consolidado Geral</h3>
              <table style="width: 100%; border-collapse: collapse;">
                ${renderRow('<span style="color:#D1D5DB">Faturamento Total</span>', payload.consolidado?.faturamento, true).replace('color: #111827', 'color: #FFFFFF')}
                ${renderRow('<span style="color:#D1D5DB">Recebimento Total</span>', payload.consolidado?.recebimento, true).replace('color: #111827', 'color: #4ADE80')}
                ${renderRow('<span style="color:#D1D5DB">Ativos Total</span>', payload.consolidado?.ativos).replace('color: #111827', 'color: #60A5FA')}
                ${renderRow('<span style="color:#D1D5DB">Ativos Pagos Total</span>', payload.consolidado?.ativosPagos).replace('color: #111827', 'color: #60A5FA')}
                ${renderRow('<span style="color:#D1D5DB">Entradas Total</span>', payload.consolidado?.entradas).replace('color: #111827', 'color: #FBBF24')}
                ${renderRow('<span style="color:#D1D5DB">Cancelados Total</span>', payload.consolidado?.cancelados).replace('color: #111827', 'color: #F472B6')}
                ${renderRow('<span style="color:#D1D5DB; border-bottom: none;">Recebíveis Total</span>', payload.consolidado?.recebiveis, true).replace('color: #111827', 'color: #C084FC').replace('border-bottom: 1px dashed #F3F4F6;', 'border-bottom: none;')}
              </table>
            </div>

          </div>
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
        from: `Pratique Painel <${emailFrom}>`,
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
      console.error('[FECHAMENTO] Resend recusou o envio:', resendResponse.status, responseText);
      return res.status(502).json({
        success: false,
        error: 'O serviço de e-mail recusou o envio.'
      });
    }

    console.log('[FECHAMENTO] E-mail aceito pelo provedor.', resendData?.id || '');

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
