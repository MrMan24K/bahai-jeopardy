const CONTACT_EMAIL = 'kabir.alexander2010@gmail.com';
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

  const delivery = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(CONTACT_EMAIL)}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body: JSON.stringify({
      _subject: SUBJECTS[formName],
      _template: 'table',
      _captcha: 'false',
      form: formName,
      ...fields
    })
  });

  if (!delivery.ok) {
    return json({ ok: false, error: 'delivery_failed' }, 502);
  }

  const result = await delivery.json().catch(() => ({}));
  if (result.success === 'false' || result.success === false) {
    return json({ ok: false, error: 'delivery_failed' }, 502);
  }

  return json({ ok: true });
}
