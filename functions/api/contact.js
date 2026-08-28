const CONTACT_EMAIL = 'kabir.alexander2010@gmail.com';
const FROM_EMAIL = 'forms@bahaijeopardy.com';
const ALLOWED_FORMS = new Set(['feedback', 'question-suggestion']);

const SUBJECTS = {
  feedback: "Bahá'í Jeopardy — Feedback",
  'question-suggestion': "Bahá'í Jeopardy — Question Suggestion"
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

function sanitizeFields(fields) {
  const clean = {};
  for (const [key, value] of Object.entries(fields || {})) {
    if (typeof value !== 'string') continue;
    clean[key] = value.trim().slice(0, 1200);
  }
  return clean;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatPlainText(formName, fields) {
  const lines = [`Form: ${formName}`, ''];
  for (const [key, value] of Object.entries(fields)) {
    if (value) lines.push(`${key}: ${value}`);
  }
  return lines.join('\n');
}

function formatHtmlTable(formName, fields) {
  const rows = Object.entries(fields)
    .filter(([, value]) => value)
    .map(([key, value]) => `<tr><th align="left">${escapeHtml(key)}</th><td>${escapeHtml(value)}</td></tr>`)
    .join('');

  return `
    <p><strong>Form:</strong> ${escapeHtml(formName)}</p>
    <table border="1" cellpadding="8" cellspacing="0">${rows}</table>
  `.trim();
}

async function sendEmail({ subject, text, html }) {
  const response = await fetch('https://api.mailchannels.net/tx/v1/send', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: CONTACT_EMAIL }] }],
      from: { email: FROM_EMAIL, name: "Bahá'í Jeopardy" },
      subject,
      content: [
        { type: 'text/plain', value: text },
        { type: 'text/html', value: html }
      ]
    })
  });

  return response.ok;
}

export async function onRequestPost({ request }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: 'invalid_json' }, 400);
  }

  const formName = body.formName;
  const honeypot = body.honeypot || '';
  const fields = sanitizeFields(body.fields);

  if (honeypot) {
    return json({ ok: true });
  }

  if (!ALLOWED_FORMS.has(formName)) {
    return json({ ok: false, error: 'invalid_form' }, 400);
  }

  if (formName === 'feedback' && !fields.message) {
    return json({ ok: false, error: 'missing_message' }, 400);
  }

  if (formName === 'question-suggestion' && (!fields.clue || !fields.answer)) {
    return json({ ok: false, error: 'missing_clue_or_answer' }, 400);
  }

  const subject = SUBJECTS[formName];
  const text = formatPlainText(formName, fields);
  const html = formatHtmlTable(formName, fields);
  const sent = await sendEmail({ subject, text, html });

  if (!sent) {
    return json({ ok: false, error: 'delivery_failed' }, 502);
  }

  return json({ ok: true });
}
