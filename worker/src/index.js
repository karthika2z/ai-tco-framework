/**
 * DroidWork.ai — Lead Capture API
 * Cloudflare Worker
 *
 * Handles POST /leads:
 *   - Validates input
 *   - Stores lead in D1
 *   - Sends user confirmation email via Resend
 *   - Sends admin lead notification via Resend
 */

const ALLOWED_ORIGIN = 'https://droidwork.ai';
const FROM_EMAIL     = 'DroidWork.ai <hello@droidwork.ai>';
const NOTIFY_EMAIL   = 'your-notify-email@example.com'; // ← replace with your email
const CALC_URL       = 'https://droidwork.ai/calculator';
const METH_URL       = 'https://droidwork.ai/calculator/methodology';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return corsResponse('', 204);
    }

    if (request.method === 'POST' && url.pathname === '/leads') {
      return handleLeads(request, env);
    }

    if (request.method === 'GET' && url.pathname === '/health') {
      return corsResponse(JSON.stringify({ status: 'ok', service: 'droidwork-api' }), 200);
    }

    return corsResponse(JSON.stringify({ error: 'Not found' }), 404);
  },
};

// ─── Lead Handler ──────────────────────────────────────────────────────────────

async function handleLeads(request, env) {
  let data;
  try {
    data = await request.json();
  } catch {
    return corsResponse(JSON.stringify({ error: 'Invalid JSON' }), 400);
  }

  const { email, name, company, role, emp_cost, ai_cost, savings, npv, payback, pdf_base64 } = data;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return corsResponse(JSON.stringify({ error: 'Valid work email required' }), 400);
  }
  if (!company || !company.trim()) {
    return corsResponse(JSON.stringify({ error: 'Company name required' }), 400);
  }

  const cleanName    = (name    || '').trim();
  const cleanCompany = company.trim();
  const cleanRole    = (role    || '').trim();
  const date         = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  // Store in D1
  try {
    await env.DB.prepare(`
      INSERT INTO leads (name, email, company, role, emp_cost, ai_cost, savings, npv, payback)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(cleanName, email, cleanCompany, cleanRole, emp_cost || null, ai_cost || null, savings || null, npv || null, payback || null).run();
  } catch (dbErr) {
    console.error('D1 insert error:', dbErr);
    // Don't fail the request — still send the email
  }

  // Build attachment payload for Resend if PDF was provided
  const attachment = pdf_base64 ? [{
    filename:     `DroidWork-AI-TCO-Report-${cleanCompany.replace(/[^a-z0-9]/gi, '-')}.pdf`,
    content:      pdf_base64,
    content_type: 'application/pdf',
  }] : undefined;

  // Send both emails via Resend (in parallel)
  const [userResult, adminResult] = await Promise.allSettled([
    sendEmail(env.RESEND_API_KEY, {
      from:        FROM_EMAIL,
      to:          [email],
      subject:     `Your AI TCO Executive Report — ${cleanCompany} · ${date}`,
      html:        buildUserEmail({ name: cleanName, email, company: cleanCompany, role: cleanRole, emp_cost, ai_cost, savings, npv, payback, date, hasAttachment: !!attachment }),
      attachments: attachment,
    }),
    sendEmail(env.RESEND_API_KEY, {
      from:        FROM_EMAIL,
      to:          [NOTIFY_EMAIL],
      reply_to:    email,
      subject:     `New Lead: ${cleanName || email} — ${cleanCompany}`,
      html:        buildAdminEmail({ name: cleanName, email, company: cleanCompany, role: cleanRole, emp_cost, ai_cost, savings, npv, payback, date }),
      attachments: attachment,
    }),
  ]);

  const emailOk = userResult.status === 'fulfilled' && userResult.value.ok;

  return corsResponse(JSON.stringify({
    success: true,
    email_sent: emailOk,
  }), 200);
}

// ─── Resend API ─────────────────────────────────────────────────────────────

async function sendEmail(apiKey, payload) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.text();
    console.error('Resend error:', res.status, body);
  }
  return res;
}

// ─── Email Templates ──────────────────────────────────────────────────────────

function buildUserEmail({ name, company, role, emp_cost, ai_cost, savings, npv, payback, date, hasAttachment }) {
  const greeting = name ? `Hi ${name.split(' ')[0]},` : 'Hi there,';
  const roleLabel = role ? `<div style="display:inline-block;background:#e0f2fe;color:#0369a1;font-size:11px;font-weight:600;padding:3px 10px;border-radius:20px;margin-bottom:20px;letter-spacing:.5px;text-transform:uppercase">${role}</div>` : '';

  const rows = [
    { label: 'Employee True Cost',  value: emp_cost, highlight: false },
    { label: 'AI Full TCO (Annual)', value: ai_cost,  highlight: false },
    { label: 'Annual Savings',       value: savings,  highlight: true  },
    { label: '3-Year NPV',           value: npv,      highlight: false },
    { label: 'Payback Period',       value: payback,  highlight: false },
  ].filter(r => r.value).map((r, i) => `
    <tr style="background:${r.highlight ? '#f0fdf4' : (i % 2 === 0 ? '#ffffff' : '#f8fafc')}">
      <td style="padding:11px 16px;font-size:13px;color:#475569;border-bottom:1px solid #f1f5f9;white-space:nowrap">${r.label}</td>
      <td style="padding:11px 16px;font-size:14px;font-weight:700;color:${r.highlight ? '#059669' : '#0f172a'};border-bottom:1px solid #f1f5f9;text-align:right">${r.value}</td>
    </tr>`).join('');

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 16px">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%">

        <!-- Header -->
        <tr><td style="background:#0f2042;border-radius:12px 12px 0 0;padding:32px 40px">
          <img src="https://droidwork.ai/logo.png" alt="DroidWork.ai" height="32" style="display:block;margin-bottom:16px">
          <div style="color:#ffffff;font-size:20px;font-weight:700;line-height:1.3">Your AI TCO Executive Summary</div>
          <div style="color:#7ea8d4;font-size:13px;margin-top:6px">Enterprise AI vs. Employee · Total Cost of Ownership Analysis</div>
        </td></tr>

        <!-- Body -->
        <tr><td style="background:#ffffff;padding:36px 40px">
          ${roleLabel}
          <p style="margin:0 0 6px;font-size:15px;color:#0f172a;font-weight:600">${greeting}</p>
          <p style="margin:0 0 24px;font-size:14px;color:#475569;line-height:1.6">${hasAttachment ? `Your full PDF executive report is <strong>attached to this email</strong>. Here's a summary of your results for <strong>${company}</strong>:` : `Here's a summary of your results for <strong>${company}</strong>:`}</p>

          <!-- Results table -->
          <table width="100%" cellpadding="0" cellspacing="0" style="border-radius:10px;overflow:hidden;border:1px solid #e2e8f0;margin-bottom:28px">
            <tr style="background:#f8fafc">
              <td style="padding:10px 16px;font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.8px">Metric</td>
              <td style="padding:10px 16px;font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.8px;text-align:right">Value</td>
            </tr>
            ${rows}
          </table>

          <!-- CTAs -->
          <table cellpadding="0" cellspacing="0" style="margin-bottom:28px">
            <tr>
              <td style="padding-right:12px">
                <a href="${CALC_URL}" style="display:inline-block;background:#0f2042;color:#ffffff;font-size:13px;font-weight:600;padding:10px 20px;border-radius:8px;text-decoration:none">Re-run Calculator →</a>
              </td>
              <td>
                <a href="${METH_URL}" style="display:inline-block;background:#f1f5f9;color:#0f2042;font-size:13px;font-weight:600;padding:10px 20px;border-radius:8px;text-decoration:none">View Methodology →</a>
              </td>
            </tr>
          </table>

          <p style="margin:0;font-size:13px;color:#64748b;line-height:1.6">This analysis is for planning purposes only. Real-world results vary based on implementation quality, organizational readiness, and AI deployment complexity.</p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#f8fafc;border-radius:0 0 12px 12px;padding:20px 40px;border-top:1px solid #e2e8f0">
          <p style="margin:0;font-size:11px;color:#94a3b8;line-height:1.6">
            Generated ${date} · <a href="https://droidwork.ai" style="color:#0284c7;text-decoration:none">DroidWork.ai</a> · Enterprise AI Cost Intelligence<br>
            You received this because you requested a TCO report. We will not email you again unless you return to the calculator.
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body></html>`;
}

function buildAdminEmail({ name, email, company, role, emp_cost, ai_cost, savings, npv, payback, date }) {
  const tcoRows = [
    ['Employee True Cost',  emp_cost],
    ['AI Full TCO (Annual)', ai_cost],
    ['Annual Savings',       savings],
    ['3-Year NPV',           npv],
    ['Payback Period',       payback],
  ].filter(([, v]) => v).map(([label, value]) => `
    <tr>
      <td style="padding:6px 0;font-size:12px;color:#475569;width:55%">${label}</td>
      <td style="padding:6px 0;font-size:13px;font-weight:700;color:#0f172a">${value}</td>
    </tr>`).join('');

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%">

        <!-- Header -->
        <tr><td style="background:#0f2042;border-radius:12px 12px 0 0;padding:24px 32px">
          <div style="color:#34d399;font-size:13px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;margin-bottom:4px">New Lead</div>
          <div style="color:#ffffff;font-size:18px;font-weight:700">DroidWork.ai Calculator</div>
          <div style="color:#7ea8d4;font-size:12px;margin-top:4px">${date}</div>
        </td></tr>

        <!-- Body -->
        <tr><td style="background:#ffffff;padding:28px 32px;border-radius:0 0 12px 12px;border:1px solid #e2e8f0;border-top:none">

          <!-- Contact -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px">
            <tr>
              <td style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.8px;padding-bottom:12px" colspan="2">Contact</td>
            </tr>
            ${name    ? `<tr><td style="padding:5px 0;font-size:12px;color:#64748b;width:100px">Name</td><td style="padding:5px 0;font-size:13px;font-weight:600;color:#0f172a">${name}</td></tr>` : ''}
            <tr><td style="padding:5px 0;font-size:12px;color:#64748b">Email</td><td style="padding:5px 0;font-size:13px"><a href="mailto:${email}" style="color:#0284c7;font-weight:600;text-decoration:none">${email}</a></td></tr>
            <tr><td style="padding:5px 0;font-size:12px;color:#64748b">Company</td><td style="padding:5px 0;font-size:13px;font-weight:600;color:#0f172a">${company}</td></tr>
            ${role    ? `<tr><td style="padding:5px 0;font-size:12px;color:#64748b">Role</td><td style="padding:5px 0;font-size:13px;color:#0f172a">${role}</td></tr>` : ''}
          </table>

          <!-- TCO Numbers -->
          ${tcoRows ? `
          <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:10px;padding:18px 20px;margin-bottom:20px">
            <div style="font-size:11px;font-weight:700;color:#166534;text-transform:uppercase;letter-spacing:.8px;margin-bottom:12px">Their TCO Numbers</div>
            <table width="100%" cellpadding="0" cellspacing="0">${tcoRows}</table>
          </div>` : ''}

          <!-- Quick actions -->
          <table cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding-right:10px">
                <a href="mailto:${email}" style="display:inline-block;background:#0f2042;color:#ffffff;font-size:12px;font-weight:600;padding:9px 18px;border-radius:7px;text-decoration:none">Reply to Lead</a>
              </td>
              <td>
                <a href="${CALC_URL}" style="display:inline-block;background:#f1f5f9;color:#0f172a;font-size:12px;font-weight:600;padding:9px 18px;border-radius:7px;text-decoration:none">View Calculator</a>
              </td>
            </tr>
          </table>

        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

// ─── CORS Helper ──────────────────────────────────────────────────────────────

function corsResponse(body, status) {
  return new Response(body || null, {
    status,
    headers: {
      'Content-Type':                 'application/json',
      'Access-Control-Allow-Origin':  ALLOWED_ORIGIN,
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
