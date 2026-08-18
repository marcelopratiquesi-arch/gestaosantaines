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

    // O front-end já calcula os dados.
    // Aqui apenas recebemos o resumo para encaminhamento.
    const html = `
      <!DOCTYPE html>
      <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
        </head>

        <body style="font-family:Arial,sans-serif;background:#f5f5f5;padding:24px;">

          <div style="
            max-width:700px;
            margin:auto;
            background:#ffffff;
            padding:28px;
            border-radius:12px;
          ">

            <h1 style="margin-top:0;">
              Relatório de Fechamento
            </h1>

            <p>
              Um fechamento foi visualizado no Painel Gestão Santa Inês.
            </p>

            <p>
              <strong>Data/Hora:</strong>
              ${new Date().toLocaleString('pt-BR', {
                timeZone: 'America/Sao_Paulo'
              })}
            </p>

            <hr>

            <h2>Dados recebidos pelo painel</h2>

            <pre style="
              white-space:pre-wrap;
              word-break:break-word;
              background:#f4f4f4;
              padding:16px;
              border-radius:8px;
              font-size:12px;
            ">${escapeHtml(JSON.stringify(payload, null, 2))}</pre>

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
        from: emailFrom,
        to: [emailTo],
        subject: 'Relatório de Fechamento - Gestão Santa Inês',
        html
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


// Impede que conteúdo recebido seja interpretado como HTML do e-mail
function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
