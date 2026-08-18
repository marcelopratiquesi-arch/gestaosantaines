export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Método não permitido. Utilize POST.' });
    }

    try {
        const payload = req.body;
        
        if (!payload || !payload.arquivos) {
            return res.status(400).json({ success: false, error: 'Payload incompleto.' });
        }

        // Validação Mínimo 3 Arquivos (Qualquer Combinação)
        const loadedCount = Object.values(payload.arquivos).filter(Boolean).length;
        if (loadedCount < 3) {
            return res.status(400).json({ success: false, error: 'O relatório requer no mínimo 3 fontes de dados para ser válido.' });
        }

        const API_KEY = process.env.RESEND_API_KEY;
        const EMAIL_TO = process.env.REPORT_EMAIL_TO || 'marcelopratiquesi@gmail.com'; 
        const EMAIL_FROM = process.env.REPORT_EMAIL_FROM || 'onboarding@resend.dev';

        if (!API_KEY) {
            console.error("[RELATORIO_TECNICO] Erro: Vercel Env Var RESEND_API_KEY ausente.");
            return res.status(500).json({ success: false, error: 'Configuração de provedor de e-mail ausente.' });
        }

        const formatMoney = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
        const formatNumber = (val) => new Intl.NumberFormat('pt-BR').format(val || 0);

        const renderValue = (isLoaded, value, isCurrency = false) => {
            if (!isLoaded) return '<span style="color: #9CA3AF; font-style: italic;">Não carregado</span>';
            return isCurrency ? formatMoney(value) : formatNumber(value);
        };

        const renderGroups = (isLoaded, grupos) => {
            if (!isLoaded || !grupos) return '';
            return `
            <div class="comp-box">
                <div class="comp-title">Composição das Entradas</div>
                <div class="comp-row"><span>🥗 Nutri</span><strong>${formatNumber(grupos.nutri)}</strong></div>
                <div class="comp-row"><span>⭐ Plus</span><strong>${formatNumber(grupos.plus)}</strong></div>
                <div class="comp-row"><span>🏃 Fit</span><strong>${formatNumber(grupos.fit)}</strong></div>
                <div class="comp-row"><span>🏋️ Class</span><strong>${formatNumber(grupos.class)}</strong></div>
                <div class="comp-row"><span>🧩 Outros Planos</span><strong>${formatNumber(grupos.outros)}</strong></div>
            </div>`;
        };

        const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #F3F4F6; padding: 20px; color: #111827; }
                .container { max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                .header { background-color: #111827; color: #FFFFFF; padding: 20px; text-align: center; border-top: 4px solid #ED1C24; }
                .header h1 { margin: 0; font-size: 20px; letter-spacing: 1px; text-transform: uppercase; }
                .header p { margin: 5px 0 0 0; font-size: 12px; color: #9CA3AF; }
                
                .files-section { background-color: #F9FAFB; padding: 15px 20px; border-bottom: 1px solid #E5E7EB; font-size: 12px; }
                .files-title { font-weight: bold; color: #6B7280; text-transform: uppercase; margin-bottom: 8px; }
                .file-tag { display: inline-block; padding: 3px 8px; border-radius: 4px; margin: 2px 4px 2px 0; background: #E5E7EB; color: #374151; }
                .file-tag.ok { background: #DCFCE7; color: #166534; }
                
                .section { padding: 20px; border-bottom: 1px solid #E5E7EB; }
                .section-title { font-size: 16px; font-weight: bold; color: #ED1C24; text-transform: uppercase; margin-top: 0; margin-bottom: 15px; }
                .si2-title { color: #111827; border-bottom: 2px solid #111827; padding-bottom: 4px; display: inline-block;}
                .si1-title { color: #ED1C24; border-bottom: 2px solid #ED1C24; padding-bottom: 4px; display: inline-block;}
                
                table { border-collapse: collapse; margin-bottom: 15px; width: 100%; }
                td { padding: 8px 0; border-bottom: 1px dashed #F3F4F6; font-size: 14px; }
                .val { text-align: right; font-weight: bold; }
                
                .comp-box { background-color: #F9FAFB; padding: 15px; border-radius: 6px; margin-top: 15px; border: 1px solid #E5E7EB; }
                .comp-title { font-size: 12px; font-weight: bold; color: #6B7280; text-transform: uppercase; margin-bottom: 10px; }
                .comp-row { display: flex; justify-content: space-between; font-size: 13px; padding: 4px 0; }
                
                .footer { background-color: #111827; color: #FFFFFF; padding: 20px; }
                .footer-title { color: #FFFFFF; font-size: 16px; text-transform: uppercase; margin-top:0; border-bottom: 1px solid #374151; padding-bottom: 10px; }
                .footer td { border-bottom: 1px solid #374151; color: #D1D5DB; }
                .footer .val { color: #FFFFFF; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Relatório de Visualização</h1>
                    <p>Painel Executivo • Santa Inês</p>
                    <p>${payload.dataStr} às ${payload.horaStr}</p>
                </div>

                <div class="files-section">
                    <div class="files-title">FONTES UTILIZADAS NA CONSULTA (${loadedCount} de 8)</div>
                    <span class="file-tag ${payload.arquivos.hasSales ? 'ok' : ''}">${payload.arquivos.hasSales ? '✓ Faturamento' : '○ Faturamento (ausente)'}</span>
                    <span class="file-tag ${payload.arquivos.hasReceipts ? 'ok' : ''}">${payload.arquivos.hasReceipts ? '✓ Recebimento' : '○ Recebimento (ausente)'}</span>
                    <span class="file-tag ${payload.arquivos.hasReceivables ? 'ok' : ''}">${payload.arquivos.hasReceivables ? '✓ Recebíveis' : '○ Recebíveis (ausente)'}</span>
                    <span class="file-tag ${payload.arquivos.hasActives ? 'ok' : ''}">${payload.arquivos.hasActives ? '✓ Ativos' : '○ Ativos (ausente)'}</span>
                    <span class="file-tag ${payload.arquivos.hasPaidActives ? 'ok' : ''}">${payload.arquivos.hasPaidActives ? '✓ Ativos Pagos' : '○ Ativos Pagos (ausente)'}</span>
                    <span class="file-tag ${payload.arquivos.hasEntradas ? 'ok' : ''}">${payload.arquivos.hasEntradas ? '✓ Entradas' : '○ Entradas (ausente)'}</span>
                    <span class="file-tag ${payload.arquivos.hasCancelados ? 'ok' : ''}">${payload.arquivos.hasCancelados ? '✓ Cancelados' : '○ Cancelados (ausente)'}</span>
                    <span class="file-tag ${payload.arquivos.hasVisitantes ? 'ok' : ''}">${payload.arquivos.hasVisitantes ? '✓ Visitantes' : '○ Visitantes (ausente)'}</span>
                </div>

                <!-- SANTA INES 1 -->
                <div class="section">
                    <h2 class="section-title si1-title">SANTA INÊS 1</h2>
                    <table>
                        <tr><td>Faturamento</td><td class="val">${renderValue(payload.arquivos.hasSales, payload.si1.faturamento, true)}</td></tr>
                        <tr><td>Recebimento (Caixa)</td><td class="val">${renderValue(payload.arquivos.hasReceipts, payload.si1.recebimento, true)}</td></tr>
                        <tr><td>Recebíveis</td><td class="val">${renderValue(payload.arquivos.hasReceivables, payload.si1.recebiveis, true)}</td></tr>
                        <tr><td>Alunos Ativos</td><td class="val">${renderValue(payload.arquivos.hasActives, payload.si1.ativos)}</td></tr>
                        <tr><td style="color: #059669; font-weight: bold;">Ativos Pagos</td><td class="val" style="color: #059669;">${renderValue(payload.arquivos.hasPaidActives, payload.si1.ativosPagos)}</td></tr>
                        <tr><td>Entradas Totais</td><td class="val">${renderValue(payload.arquivos.hasEntradas, payload.si1.entradas)}</td></tr>
                        <tr><td style="border-bottom:none">Cancelados</td><td class="val" style="border-bottom:none">${renderValue(payload.arquivos.hasCancelados, payload.si1.cancelados)}</td></tr>
                    </table>

                    ${renderGroups(payload.arquivos.hasEntradas, payload.si1.gruposEntradas)}
                </div>

                <!-- SANTA INES 2 -->
                <div class="section">
                    <h2 class="section-title si2-title">SANTA INÊS 2</h2>
                    <table>
                        <tr><td>Faturamento</td><td class="val">${renderValue(payload.arquivos.hasSales, payload.si2.faturamento, true)}</td></tr>
                        <tr><td>Recebimento (Caixa)</td><td class="val">${renderValue(payload.arquivos.hasReceipts, payload.si2.recebimento, true)}</td></tr>
                        <tr><td>Recebíveis</td><td class="val">${renderValue(payload.arquivos.hasReceivables, payload.si2.recebiveis, true)}</td></tr>
                        <tr><td>Alunos Ativos</td><td class="val">${renderValue(payload.arquivos.hasActives, payload.si2.ativos)}</td></tr>
                        <tr><td style="color: #059669; font-weight: bold;">Ativos Pagos</td><td class="val" style="color: #059669;">${renderValue(payload.arquivos.hasPaidActives, payload.si2.ativosPagos)}</td></tr>
                        <tr><td>Entradas Totais</td><td class="val">${renderValue(payload.arquivos.hasEntradas, payload.si2.entradas)}</td></tr>
                        <tr><td>Cancelados</td><td class="val">${renderValue(payload.arquivos.hasCancelados, payload.si2.cancelados)}</td></tr>
                        <tr><td style="border-bottom:none; color: #0D9488; font-weight: bold;">Personal Class Recebido</td><td class="val" style="border-bottom:none; color: #0D9488;">${renderValue(payload.arquivos.hasReceipts, payload.si2.personalClass)}</td></tr>
                    </table>

                    ${renderGroups(payload.arquivos.hasEntradas, payload.si2.gruposEntradas)}
                </div>

                <!-- GLOBAIS & CONFIG -->
                <div class="section">
                    <h2 class="section-title" style="color:#0284C7;">INDICADORES GLOBAIS</h2>
                    <table>
                        <tr><td>Visitantes Avulsos</td><td class="val">${renderValue(payload.arquivos.hasVisitantes, payload.globais ? payload.globais.visitantes : null)}</td></tr>
                        <tr><td style="border-bottom:none">Visitantes Wellhub</td><td class="val" style="border-bottom:none">${renderValue(payload.arquivos.hasVisitantes, payload.globais ? payload.globais.visitantesWellhub : null)}</td></tr>
                    </table>

                    <h2 class="section-title" style="color:#6B7280; margin-top:20px;">RESUMO DA CONFIGURAÇÃO</h2>
                    <table>
                        <tr><td>Planos na SI1</td><td class="val">${payload.configuracao.si1}</td></tr>
                        <tr><td>Planos na SI2</td><td class="val">${payload.configuracao.si2}</td></tr>
                        <tr><td style="border-bottom:none">Não Classificados / Ignore</td><td class="val" style="border-bottom:none">${payload.configuracao.ignorados}</td></tr>
                    </table>
                </div>

                <!-- CONSOLIDADO -->
                <div class="footer">
                    <h2 class="footer-title">CONSOLIDADO GERAL</h2>
                    <table>
                        <tr><td>Faturamento Total</td><td class="val" style="color:#FFF">${renderValue(payload.arquivos.hasSales, payload.consolidado.faturamento, true)}</td></tr>
                        <tr><td>Caixa Total</td><td class="val" style="color:#4ADE80">${renderValue(payload.arquivos.hasReceipts, payload.consolidado.recebimento, true)}</td></tr>
                        <tr><td>Recebíveis Total</td><td class="val" style="color:#C084FC">${renderValue(payload.arquivos.hasReceivables, payload.consolidado.recebiveis, true)}</td></tr>
                        <tr><td>Ativos Total</td><td class="val" style="color:#60A5FA">${renderValue(payload.arquivos.hasActives, payload.consolidado.ativos)}</td></tr>
                        <tr><td>Ativos Pagos Total</td><td class="val" style="color:#34D399">${renderValue(payload.arquivos.hasPaidActives, payload.consolidado.ativosPagos)}</td></tr>
                        <tr><td>Entradas Total</td><td class="val" style="color:#FB923C">${renderValue(payload.arquivos.hasEntradas, payload.consolidado.entradas)}</td></tr>
                        <tr><td style="border-bottom:none">Cancelados Total</td><td class="val" style="color:#F472B6; border-bottom:none">${renderValue(payload.arquivos.hasCancelados, payload.consolidado.cancelados)}</td></tr>
                    </table>
                </div>
            </div>
        </body>
        </html>
        `;

        console.log(`[RELATORIO] Solicitando envio. FROM: ${EMAIL_FROM} TO: ${EMAIL_TO}`);

        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                from: EMAIL_FROM, // CORREÇÃO CIRÚRGICA: Removida a concatenação extra que causava o 502
                to: [EMAIL_TO],
                subject: `Consulta Painel Pratique — ${payload.dataStr} às ${payload.horaStr}`,
                html: htmlContent
            })
        });

        const contentType = response.headers.get('content-type') || '';
        const resendData = contentType.includes('application/json') ? await response.json() : await response.text();

        if (!response.ok) {
            console.error("[RELATORIO_TECNICO] Erro na resposta do Provedor de E-mail:", resendData);
            return res.status(response.status).json({ success: false, error: typeof resendData === 'string' ? 'Falha técnica no provedor.' : (resendData.message || 'Falha ao despachar o e-mail.') });
        }

        console.log(`[RELATORIO_TECNICO] E-mail Aceito. Message ID: ${resendData.id} | Status Code: 200`);
        return res.status(200).json({ success: true, messageId: resendData.id });

    } catch (error) {
        console.error("[RELATORIO_TECNICO] Erro interno severo na Vercel Function:", error);
        return res.status(500).json({ success: false, error: 'Erro de processamento interno no servidor.' });
    }
}
