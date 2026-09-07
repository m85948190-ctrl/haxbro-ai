(() => {
  const MAX_TRIES = 3;
  const key = 'haxbro_landing_trial_uses_v1';
  const input = document.getElementById('trialInput');
  const form = document.getElementById('trialForm');
  const send = document.getElementById('trialSend');
  const messages = document.getElementById('trialMessages');
  const counter = document.getElementById('trialCounter');
  const locked = document.getElementById('trialLocked');
  if (!input || !form || !send || !messages || !counter || !locked) return;

  let uses = Math.min(MAX_TRIES, Math.max(0, Number(localStorage.getItem(key) || 0)));
  const render = () => {
    const left = Math.max(0, MAX_TRIES - uses);
    counter.textContent = `${left} / ${MAX_TRIES} TRIES`;
    if (uses >= MAX_TRIES) {
      input.disabled = true;
      send.disabled = true;
      locked.hidden = false;
    }
  };
  const add = (who, text, error = false) => {
    const el = document.createElement('div');
    el.className = `trial-message trial-${who}${error ? ' trial-error' : ''}`;
    const b = document.createElement('b');
    b.textContent = who === 'ai' ? 'HAxBRO AI' : 'YOU';
    const span = document.createElement('span');
    span.textContent = text;
    el.append(b, span);
    messages.appendChild(el);
    el.scrollIntoView({behavior:'smooth', block:'nearest'});
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (uses >= MAX_TRIES) return render();
    const prompt = input.value.trim();
    if (!prompt) return;
    uses += 1;
    localStorage.setItem(key, String(uses));
    input.value = '';
    input.disabled = true;
    send.disabled = true;
    add('user', prompt);
    render();
    try {
      const r = await fetch('/api/chat', {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({prompt, mode:'normal'})
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || 'HAxBRO could not answer right now.');
      add('ai', d.response || 'No response returned.');
    } catch (err) {
      add('ai', err.message || 'Something went wrong. Please use the real HAxBRO app.', true);
    } finally {
      input.disabled = uses >= MAX_TRIES;
      send.disabled = uses >= MAX_TRIES;
      render();
      if (uses >= MAX_TRIES) locked.hidden = false;
      else input.focus();
    }
  });

  render();
})();