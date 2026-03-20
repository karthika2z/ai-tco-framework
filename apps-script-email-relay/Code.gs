/**
 * DroidWork.ai — Summary Email Relay + Lead Capture
 * Google Apps Script web app
 *
 * DEPLOY STEPS (one-time, ~3 minutes):
 *  1. Go to script.google.com → click "+ New project"
 *  2. Delete any existing code, paste this entire file
 *  3. Click Deploy → New deployment
 *  4. Type: Web app
 *  5. Execute as: Me
 *  6. Who has access: Anyone
 *  7. Click Deploy → authorize Gmail permission when prompted
 *  8. Copy the /exec URL → paste into CONFIG.appsScriptUrl in ai-cost-calculator.html
 *
 * Every submission:
 *  - Sends a summary confirmation email to the user (no PDF attachment — PDF is downloaded locally)
 *  - Sends a lead notification to LEAD_NOTIFY_EMAIL
 *
 * Quota: 100 emails/day (free Gmail) · 1,500/day (Google Workspace)
 */

const LEAD_NOTIFY_EMAIL = 'your-notify-email@example.com'; // ← replace with your email

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    if (!data.to_email) {
      throw new Error('Missing to_email');
    }

    const date    = data.date || new Date().toDateString();
    const calcUrl = data.calc_url || 'https://droidwork.ai/calculator';
    const methUrl = data.meth_url || 'https://droidwork.ai/calculator/methodology';

    // ── 1. Send summary confirmation to the user ─────────────────
    const userHtml = `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1e293b">
  <div style="background:#0f2042;padding:28px 32px;border-radius:12px 12px 0 0">
    <h1 style="color:#ffffff;margin:0;font-size:22px;font-weight:700">Your AI TCO Executive Summary</h1>
    <p style="color:#94b4d6;margin:6px 0 0;font-size:13px">AI vs. Employee Total Cost of Ownership Analysis · DroidWork.ai</p>
  </div>
  <div style="background:#f8fafc;padding:28px 32px;border-radius:0 0 12px 12px;border:1px solid #e2e8f0;border-top:none">
    <p style="margin:0 0 20px">Hi ${data.to_name || 'there'},</p>
    <p style="margin:0 0 20px">Your PDF report has already been downloaded to your device. Here's a summary of your results:</p>
    <table style="width:100%;border-collapse:collapse;margin:0 0 24px">
      <tr style="background:#e2e8f0">
        <td style="padding:10px 14px;font-size:13px;font-weight:600">Metric</td>
        <td style="padding:10px 14px;font-size:13px;font-weight:600">Value</td>
      </tr>
      <tr style="background:#ffffff">
        <td style="padding:10px 14px;font-size:13px;border:1px solid #e2e8f0">Employee True Cost</td>
        <td style="padding:10px 14px;font-size:13px;border:1px solid #e2e8f0">${data.emp_cost || '—'}</td>
      </tr>
      <tr style="background:#f8fafc">
        <td style="padding:10px 14px;font-size:13px;border:1px solid #e2e8f0">AI Annual Cost</td>
        <td style="padding:10px 14px;font-size:13px;border:1px solid #e2e8f0">${data.ai_cost || '—'}</td>
      </tr>
      <tr style="background:#f0fdf4">
        <td style="padding:10px 14px;font-size:13px;border:1px solid #e2e8f0;font-weight:600">Annual Savings</td>
        <td style="padding:10px 14px;font-size:13px;border:1px solid #e2e8f0;color:#059669;font-weight:700">${data.savings || '—'}</td>
      </tr>
      <tr style="background:#ffffff">
        <td style="padding:10px 14px;font-size:13px;border:1px solid #e2e8f0">3-Year NPV</td>
        <td style="padding:10px 14px;font-size:13px;border:1px solid #e2e8f0">${data.npv || '—'}</td>
      </tr>
      <tr style="background:#f8fafc">
        <td style="padding:10px 14px;font-size:13px;border:1px solid #e2e8f0">Payback Period</td>
        <td style="padding:10px 14px;font-size:13px;border:1px solid #e2e8f0">${data.payback || '—'}</td>
      </tr>
    </table>
    <p style="margin:0 0 8px">
      <a href="${calcUrl}" style="color:#059669">Re-run the calculator</a> ·
      <a href="${methUrl}" style="color:#059669">View methodology</a>
    </p>
    <p style="margin:24px 0 0;font-size:11px;color:#94a3b8">Generated ${date} · DroidWork.ai · For planning purposes only.</p>
  </div>
</div>`;

    MailApp.sendEmail({
      to:       data.to_email,
      subject:  'Your AI TCO Summary — ' + (data.company ? data.company + ' · ' : '') + date,
      htmlBody: userHtml,
      name:     'DroidWork.ai',
    });

    // ── 2. Send lead notification ────────────────────────────────
    const leadHtml = `
<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#1e293b">
  <div style="background:#0f2042;padding:20px 28px;border-radius:10px 10px 0 0">
    <h2 style="color:#34d399;margin:0;font-size:16px;font-weight:700">🎯 New Lead — DroidWork.ai Calculator</h2>
    <p style="color:#94b4d6;margin:4px 0 0;font-size:12px">${date}</p>
  </div>
  <div style="background:#f8fafc;padding:24px 28px;border-radius:0 0 10px 10px;border:1px solid #e2e8f0;border-top:none">
    <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
      <tr><td style="padding:8px 12px;font-size:13px;font-weight:600;width:140px;color:#64748b">Name</td><td style="padding:8px 12px;font-size:13px;border-bottom:1px solid #f1f5f9"><strong>${data.to_name || '—'}</strong></td></tr>
      <tr><td style="padding:8px 12px;font-size:13px;font-weight:600;color:#64748b">Email</td><td style="padding:8px 12px;font-size:13px;border-bottom:1px solid #f1f5f9"><a href="mailto:${data.to_email}" style="color:#0284c7">${data.to_email}</a></td></tr>
      <tr><td style="padding:8px 12px;font-size:13px;font-weight:600;color:#64748b">Company</td><td style="padding:8px 12px;font-size:13px;border-bottom:1px solid #f1f5f9">${data.company || '—'}</td></tr>
    </table>
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px 20px;margin-bottom:16px">
      <div style="font-size:12px;font-weight:700;color:#166534;margin-bottom:8px">THEIR TCO NUMBERS</div>
      <table style="width:100%;border-collapse:collapse">
        <tr><td style="font-size:12px;color:#374151;padding:3px 0;width:50%">Employee True Cost</td><td style="font-size:12px;font-weight:700;color:#1e293b">${data.emp_cost || '—'}</td></tr>
        <tr><td style="font-size:12px;color:#374151;padding:3px 0">AI Annual Cost</td><td style="font-size:12px;font-weight:700;color:#1e293b">${data.ai_cost || '—'}</td></tr>
        <tr><td style="font-size:12px;color:#374151;padding:3px 0">Annual Savings</td><td style="font-size:12px;font-weight:700;color:#059669">${data.savings || '—'}</td></tr>
        <tr><td style="font-size:12px;color:#374151;padding:3px 0">3-Year NPV</td><td style="font-size:12px;font-weight:700;color:#1e293b">${data.npv || '—'}</td></tr>
        <tr><td style="font-size:12px;color:#374151;padding:3px 0">Payback Period</td><td style="font-size:12px;font-weight:700;color:#1e293b">${data.payback || '—'}</td></tr>
      </table>
    </div>
    <p style="font-size:11px;color:#94a3b8;margin:0">Submitted via droidwork.ai/calculator</p>
  </div>
</div>`;

    MailApp.sendEmail({
      to:       LEAD_NOTIFY_EMAIL,
      replyTo:  data.to_email, // replies go back to the lead
      subject:  '🎯 New Lead: ' + (data.to_name || data.to_email) + ' — ' + (data.company || 'unknown co') + ' [DroidWork.ai]',
      htmlBody: leadHtml,
      name:     'DroidWork.ai Lead Capture',
    });

    return ContentService
      .createTextOutput(JSON.stringify({ status: 'ok' }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    console.error(err);
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok', info: 'DroidWork.ai email relay is running' }))
    .setMimeType(ContentService.MimeType.JSON);
}
