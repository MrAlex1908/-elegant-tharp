/**
 * Site Controller — runs in the visitor's browser.
 * Connects to the SSE stream and executes commands from the voice agent:
 * scroll_to_section, highlight_text, show_popup.
 *
 * Usage: inject via Tilda HTML block or load from CDN.
 * Requires window.__GAR_SERVER_URL and window.__GAR_SESSION_ID to be set before loading.
 */

(function () {
  'use strict';

  const SERVER_URL = window.__GAR_SERVER_URL || '';
  const HIGHLIGHT_DURATION = 5000; // auto-remove highlights after 5s
  const HEADER_OFFSET = 80; // offset for fixed Tilda header

  // Section ID → CSS selector mapping (real Tilda rec IDs)
  const SECTION_MAP = {
    home: '#rec2113260303',             // Hero — "Your customers get answers instantly…"
    hero: '#rec2113260303',
    get_a_robot: '#rec1551125221',      // "Get a robot — One AI Robot. Every call and message."
    problem: '#rec1551125261',          // "The Problem With Common AI"
    stats: '#rec2113262533',            // Call loss statistics
    solution: '#rec1565293461',         // "Automatic Scheduling & Smart Dispatching"
    features_today: '#rec1551125241',   // Current features (CRM, returning customers)
    features_tomorrow: '#rec1565311381',// "AI That Speaks in Your Voice", voice cloning
    features_future: '#rec1567566371',  // Mobile app, unified communication
    innovate: '#rec1551125381',         // "Innovate Today"
    scenarios: '#rec1551125351',        // Call scenarios — "statistics based on 100,000 conversations"
    call_samples: '#rec1551125341',     // "After-Hours Call", call recording samples
    faq: '#rec1551125371',             // "How does the integration work…"
    try_voice: '#rec1573999981',       // "Try our voice AI"
    book_meeting: '#rec1634057011',    // "Book a meeting to setup our AI"
    navigate: '#rec2113264443',        // "Let our agent navigate you"
    footer: '#rec1579560031',          // Footer — getarobot.ai
  };

  let evtSource = null;

  // ─── SSE Connection ────────────────────────────────────────────────

  /**
   * Connect to the SSE stream for the given session.
   * @param {string} sessionId
   */
  function connect(sessionId) {
    if (evtSource) {
      evtSource.close();
    }

    evtSource = new EventSource(`${SERVER_URL}/sse/${sessionId}`);

    evtSource.addEventListener('connected', () => {
      console.log('[GAR] SSE connected');
    });

    evtSource.addEventListener('command', (e) => {
      try {
        const cmd = JSON.parse(e.data);
        handleCommand(cmd);
      } catch (err) {
        console.error('[GAR] Failed to parse command:', err);
      }
    });

    evtSource.onerror = () => {
      console.warn('[GAR] SSE connection error');
    };
  }

  /**
   * Disconnect the SSE stream.
   */
  function disconnect() {
    if (evtSource) {
      evtSource.close();
      evtSource = null;
    }
  }

  // ─── Command Router ────────────────────────────────────────────────

  /**
   * Route an incoming command to the appropriate handler.
   * @param {{ type: string, data: object }} cmd
   */
  function handleCommand(cmd) {
    console.log('[GAR] Command received:', cmd.type, cmd.data);
    switch (cmd.type) {
      case 'scroll_to_section':
        scrollToSection(cmd.data);
        break;
      case 'highlight_text':
        highlightText(cmd.data);
        break;
      case 'show_popup':
        showPopup(cmd.data);
        break;
      default:
        console.warn('[GAR] Unknown command type:', cmd.type);
    }
  }

  // ─── scroll_to_section ─────────────────────────────────────────────

  /**
   * Smooth-scroll to a named section on the page.
   * @param {{ section_id: string }} data
   */
  function scrollToSection({ section_id }) {
    const selector = SECTION_MAP[section_id] || `#${section_id}`;
    const el = document.querySelector(selector);
    if (!el) {
      console.warn('[GAR] Section not found:', section_id);
      return;
    }

    const top = el.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET;
    window.scrollTo({ top, behavior: 'smooth' });
  }

  // ─── highlight_text ────────────────────────────────────────────────

  /**
   * Find and highlight text on the page.
   * @param {{ text_query: string, clear_previous?: boolean }} data
   */
  function highlightText({ text_query, clear_previous = true }) {
    if (clear_previous) {
      clearHighlights();
    }

    const found = findAndWrapText(document.body, text_query);
    if (!found) {
      console.warn('[GAR] Text not found for highlight:', text_query);
      return;
    }

    // Auto-remove after HIGHLIGHT_DURATION
    setTimeout(clearHighlights, HIGHLIGHT_DURATION);
  }

  /**
   * Walk the DOM tree to find a text node containing the query and wrap it.
   * @param {Node} root
   * @param {string} query
   * @returns {boolean}
   */
  function findAndWrapText(root, query) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        // Skip script/style nodes
        const tag = node.parentElement?.tagName;
        if (tag === 'SCRIPT' || tag === 'STYLE') return NodeFilter.FILTER_REJECT;
        return node.textContent.includes(query) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
      },
    });

    const textNode = walker.nextNode();
    if (!textNode) return false;

    const idx = textNode.textContent.indexOf(query);
    if (idx === -1) return false;

    const range = document.createRange();
    range.setStart(textNode, idx);
    range.setEnd(textNode, idx + query.length);

    const mark = document.createElement('mark');
    mark.className = 'gar-highlight';
    range.surroundContents(mark);

    // Scroll into view
    mark.scrollIntoView({ behavior: 'smooth', block: 'center' });

    return true;
  }

  /**
   * Remove all current highlights.
   */
  function clearHighlights() {
    document.querySelectorAll('.gar-highlight').forEach((mark) => {
      const parent = mark.parentNode;
      parent.replaceChild(document.createTextNode(mark.textContent), mark);
      parent.normalize();
    });
  }

  // ─── show_popup ────────────────────────────────────────────────────

  /**
   * Show a popup overlay.
   * @param {{ popup_type: string }} data
   */
  function showPopup({ popup_type }) {
    // Close any existing popup first
    closePopup();

    const overlay = document.createElement('div');
    overlay.className = 'gar-popup-overlay';
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closePopup();
    });

    const card = document.createElement('div');
    card.className = 'gar-popup-card';

    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.className = 'gar-popup-close';
    closeBtn.textContent = '\u00d7';
    closeBtn.addEventListener('click', closePopup);
    card.appendChild(closeBtn);

    // Content based on popup type
    const content = document.createElement('div');
    content.className = 'gar-popup-content';
    content.innerHTML = getPopupContent(popup_type);
    card.appendChild(content);

    overlay.appendChild(card);
    document.body.appendChild(overlay);
  }

  /**
   * Get HTML content for a popup type.
   * @param {string} type
   * @returns {string}
   */
  function getPopupContent(type) {
    switch (type) {
      case 'demo_form':
        return `
          <h3>Request a Demo</h3>
          <p>Leave your details and we\u2019ll get back to you shortly.</p>
          <form class="gar-popup-form" onsubmit="return false;">
            <input type="text" placeholder="Your name" required />
            <input type="email" placeholder="Email" required />
            <input type="tel" placeholder="Phone" />
            <button type="submit">Send</button>
          </form>`;
      case 'pricing_summary':
        return `
          <h3>Pricing</h3>
          <p>Contact us for a personalized quote based on your needs.</p>
          <ul>
            <li>Starter \u2014 from $299/mo</li>
            <li>Business \u2014 from $799/mo</li>
            <li>Enterprise \u2014 custom</li>
          </ul>`;
      case 'comparison_table':
        return `
          <h3>How We Compare</h3>
          <table class="gar-comparison">
            <thead><tr><th></th><th>Us</th><th>Others</th></tr></thead>
            <tbody>
              <tr><td>Setup time</td><td>1 day</td><td>2\u20134 weeks</td></tr>
              <tr><td>AI voice quality</td><td>Natural</td><td>Robotic</td></tr>
              <tr><td>Custom integrations</td><td>\u2713</td><td>Limited</td></tr>
            </tbody>
          </table>`;
      case 'contact_info':
        return `
          <h3>Contact Us</h3>
          <p>\ud83d\udce7 hello@getarobot.ai</p>
          <p>\ud83d\udcde +1 (555) 000-0000</p>`;
      default:
        return `<p>Information not available.</p>`;
    }
  }

  /**
   * Close and remove the current popup.
   */
  function closePopup() {
    const overlay = document.querySelector('.gar-popup-overlay');
    if (overlay) overlay.remove();
  }

  // ─── Public API ────────────────────────────────────────────────────

  window.GARController = {
    connect,
    disconnect,
    handleCommand,
    scrollToSection,
    highlightText,
    showPopup,
    closePopup,
    clearHighlights,
  };
})();
