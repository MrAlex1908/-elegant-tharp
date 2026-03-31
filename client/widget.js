/**
 * Voice Agent Widget — floating "Talk to Alex" button.
 * Manages the Retell Web SDK call lifecycle and SSE session.
 *
 * Dependencies:
 *   - Retell Web SDK: <script src="https://cdn.jsdelivr.net/npm/retell-client-js-sdk@latest/dist/index.umd.min.js"></script>
 *   - site-controller.js (loaded before this script)
 *
 * Set window.__GAR_SERVER_URL before loading.
 */

(function () {
  'use strict';

  const SERVER_URL = window.__GAR_SERVER_URL || '';

  // ─── State ─────────────────────────────────────────────────────────

  const STATE = {
    IDLE: 'idle',
    CONNECTING: 'connecting',
    ACTIVE: 'active',
    ERROR: 'error',
  };

  let currentState = STATE.IDLE;
  let sessionId = null;
  let retellClient = null;

  // ─── DOM ───────────────────────────────────────────────────────────

  function createWidget() {
    const widget = document.createElement('div');
    widget.className = 'gar-widget';
    widget.innerHTML = `
      <button class="gar-widget-btn" aria-label="Talk to Alex">
        <span class="gar-widget-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
            <line x1="12" y1="19" x2="12" y2="23"/>
            <line x1="8" y1="23" x2="16" y2="23"/>
          </svg>
        </span>
        <span class="gar-widget-label">Talk to Alex</span>
      </button>
    `;

    const btn = widget.querySelector('.gar-widget-btn');
    btn.addEventListener('click', onWidgetClick);

    document.body.appendChild(widget);
    return widget;
  }

  /**
   * Update the widget visual state.
   * @param {string} state
   * @param {string} [label]
   */
  function updateWidget(state, label) {
    currentState = state;
    const widget = document.querySelector('.gar-widget');
    if (!widget) return;

    const btn = widget.querySelector('.gar-widget-btn');
    const labelEl = widget.querySelector('.gar-widget-label');

    // Remove all state classes
    btn.classList.remove('gar-state-idle', 'gar-state-connecting', 'gar-state-active', 'gar-state-error');
    btn.classList.add(`gar-state-${state}`);

    const labels = {
      [STATE.IDLE]: 'Talk to Alex',
      [STATE.CONNECTING]: 'Connecting...',
      [STATE.ACTIVE]: 'Listening...',
      [STATE.ERROR]: 'Retry',
    };
    labelEl.textContent = label || labels[state] || '';
  }

  // ─── Click handler ─────────────────────────────────────────────────

  async function onWidgetClick() {
    if (currentState === STATE.ACTIVE) {
      await endCall();
      return;
    }

    if (currentState === STATE.CONNECTING) return;

    updateWidget(STATE.CONNECTING);

    try {
      // 1. Create session
      const sessionRes = await fetch(`${SERVER_URL}/session/create`, { method: 'POST', headers: { 'Content-Type': 'application/json' } });
      if (!sessionRes.ok) throw new Error('Failed to create session');
      const sessionData = await sessionRes.json();
      sessionId = sessionData.session_id;

      // 2. Connect SSE
      if (window.GARController) {
        window.GARController.connect(sessionId);
      }

      // 3. Create Retell web call
      const callRes = await fetch(`${SERVER_URL}/retell/create-web-call`, { method: 'POST', headers: { 'Content-Type': 'application/json' } });
      if (!callRes.ok) throw new Error('Failed to create web call');
      const callData = await callRes.json();

      // 4. Start Retell call
      if (typeof RetellWebClient === 'undefined') {
        throw new Error('Retell Web SDK not loaded');
      }

      retellClient = new RetellWebClient();

      retellClient.on('call_started', () => {
        updateWidget(STATE.ACTIVE);
      });

      retellClient.on('call_ended', () => {
        cleanup();
        updateWidget(STATE.IDLE);
      });

      retellClient.on('error', (err) => {
        console.error('[GAR] Retell error:', err);
        cleanup();
        updateWidget(STATE.ERROR);
      });

      await retellClient.startCall({ accessToken: callData.access_token });

      // 5. Link session to Retell call
      if (callData.call_id) {
        await fetch(`${SERVER_URL}/session/${sessionId}/link`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ call_id: callData.call_id }),
        });
      }
    } catch (err) {
      console.error('[GAR] Widget error:', err);
      cleanup();
      updateWidget(STATE.ERROR);
    }
  }

  // ─── Call lifecycle ────────────────────────────────────────────────

  async function endCall() {
    if (retellClient) {
      retellClient.stopCall();
    }
    cleanup();
    updateWidget(STATE.IDLE);
  }

  function cleanup() {
    if (window.GARController) {
      window.GARController.disconnect();
    }
    retellClient = null;
    sessionId = null;
  }

  // ─── Init ──────────────────────────────────────────────────────────

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createWidget);
  } else {
    createWidget();
  }
})();
