// "Chat with us" widget: opened via the #aiChatOpen button injected into the
// floating-contact menu (js/site-enhancements.js). Talks to the ai-chat
// Supabase Edge Function, which calls Claude on the server so the API key
// never reaches the browser. Falls back to a plain error bubble (pointing
// to phone/email) if the backend isn't configured yet or the call fails.
(function () {
  const t = (key) => (window.MagicstickI18N ? window.MagicstickI18N.t(key) : key);
  const esc = (v) => (window.MagicstickI18N ? window.MagicstickI18N.escapeHtml(v) : String(v ?? ''));
  const getLang = () => (window.MagicstickI18N ? window.MagicstickI18N.getLang() : 'en');

  const HISTORY_KEY = 'magicstick_ai_chat_history';
  const MAX_HISTORY = 16;

  let history = [];
  try { history = JSON.parse(sessionStorage.getItem(HISTORY_KEY) || '[]'); } catch (e) { history = []; }

  let panel, messagesEl, form, input, sendBtn, sending = false;

  function saveHistory() {
    try { sessionStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(-MAX_HISTORY))); } catch (e) { /* ignore */ }
  }

  function renderMessage(role, text) {
    const div = document.createElement('div');
    div.className = 'ai-chat-msg ' + (role === 'user' ? 'ai-chat-msg-user' : 'ai-chat-msg-bot');
    div.textContent = text;
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function showTyping() {
    const div = document.createElement('div');
    div.className = 'ai-chat-msg ai-chat-msg-bot ai-chat-typing';
    div.id = 'aiChatTyping';
    div.innerHTML = '<span></span><span></span><span></span>';
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }
  function hideTyping() {
    const el = document.getElementById('aiChatTyping');
    if (el) el.remove();
  }

  function getConfig() {
    return (window.MagicstickBackend && window.MagicstickBackend.config) || window.MAGICSTICK_CONFIG || {};
  }

  function buildPanel() {
    if (document.getElementById('aiChatPanel')) return;
    const wrap = document.createElement('div');
    wrap.innerHTML = `
      <div class="ai-chat-panel" id="aiChatPanel" hidden>
        <div class="ai-chat-header">
          <div>
            <div class="ai-chat-title">${esc(t('aiChat.title'))}</div>
            <div class="ai-chat-subtitle">${esc(t('aiChat.subtitle'))}</div>
          </div>
          <button type="button" class="ai-chat-close" id="aiChatClose" aria-label="${esc(t('aiChat.close'))}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="ai-chat-messages" id="aiChatMessages" role="log" aria-live="polite"></div>
        <form class="ai-chat-form" id="aiChatForm">
          <input type="text" id="aiChatInput" placeholder="${esc(t('aiChat.placeholder'))}" autocomplete="off" maxlength="1200" />
          <button type="submit" id="aiChatSend" aria-label="${esc(t('aiChat.send'))}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          </button>
        </form>
        <p class="ai-chat-disclaimer">${esc(t('aiChat.disclaimer'))}</p>
      </div>
    `;
    document.body.appendChild(wrap.firstElementChild);

    panel = document.getElementById('aiChatPanel');
    messagesEl = document.getElementById('aiChatMessages');
    form = document.getElementById('aiChatForm');
    input = document.getElementById('aiChatInput');
    sendBtn = document.getElementById('aiChatSend');

    document.getElementById('aiChatClose').addEventListener('click', closePanel);
    form.addEventListener('submit', onSubmit);

    renderMessage('assistant', t('aiChat.greeting'));
    history.forEach((m) => renderMessage(m.role, m.content));
  }

  function openPanel() {
    buildPanel();
    panel.hidden = false;
    const floating = document.querySelector('.floating-contact');
    if (floating) floating.classList.remove('open');
    setTimeout(() => input && input.focus(), 50);
  }
  function closePanel() {
    if (panel) panel.hidden = true;
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (sending) return;
    const text = input.value.trim();
    if (!text) return;

    const config = getConfig();
    if (!config.FUNCTIONS_URL) {
      renderMessage('user', text);
      input.value = '';
      renderMessage('assistant', t('aiChat.error'));
      return;
    }

    input.value = '';
    renderMessage('user', text);
    history.push({ role: 'user', content: text });
    saveHistory();

    sending = true;
    sendBtn.disabled = true;
    showTyping();

    try {
      const res = await fetch(`${config.FUNCTIONS_URL}/ai-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history, lang: getLang() }),
      });
      const data = await res.json();
      hideTyping();
      if (!res.ok || !data.reply) throw new Error(data.error || 'No reply');
      renderMessage('assistant', data.reply);
      history.push({ role: 'assistant', content: data.reply });
      saveHistory();
    } catch (err) {
      hideTyping();
      renderMessage('assistant', t('aiChat.error'));
    } finally {
      sending = false;
      sendBtn.disabled = false;
      input.focus();
    }
  }

  function init() {
    document.addEventListener('click', (e) => {
      if (e.target.closest('#aiChatOpen')) {
        e.preventDefault();
        openPanel();
      }
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && panel && !panel.hidden) closePanel();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
