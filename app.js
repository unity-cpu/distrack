(() => {
  const STORAGE_KEY = 'motdMakerState_v1';

  const QUICK_COLORS = [
    '#f87171', '#fbbf24', '#22d3ee', '#4ade80', '#a855f7', '#f472b6',
    '#2dd4bf', '#fb923c', '#3b82f6', '#a3e635', '#f97316', '#84cc16',
    '#ffffff', '#94a3b8', '#06b6d4', '#2563eb', '#d946ef', '#eab308'
  ];

  const TEMPLATES = {
    newline: '\\n',
    boldwrap: null, // handled specially (wraps selection)
    welcome: 'Welcome to ',
    update: 'Update: ',
    discord: 'discord.gg/yourinvite'
  };

  const defaultState = () => ({
    motd: '',
    credits: [
      { name: 'Orxify', role: 'Creator' },
      { name: 'You', role: 'Contributor' }
    ],
    lines: [
      '<color=#22d3ee>Welcome to the server!</color>',
      '<color=#a855f7>Type /help for commands</color>'
    ],
    history: [],
    settings: { accent: '#22d3ee', tagFormat: 'color' }
  });

  let state = loadState();

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      const parsed = JSON.parse(raw);
      return Object.assign(defaultState(), parsed);
    } catch (e) {
      return defaultState();
    }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  // ---------- helpers ----------
  function escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function wrapColor(hex, text) {
    if (state.settings.tagFormat === 'section') return `&${hex};${text}`;
    return `<color=${hex}>${text}</color>`;
  }

  function hexToRgb(hex) {
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
    return [
      parseInt(hex.substr(0, 2), 16) || 0,
      parseInt(hex.substr(2, 2), 16) || 0,
      parseInt(hex.substr(4, 2), 16) || 0
    ];
  }

  function rgbToHex(r, g, b) {
    return '#' + [r, g, b]
      .map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0'))
      .join('');
  }

  function isValidHex(hex) {
    return /^#[0-9a-fA-F]{6}$/.test(hex);
  }

  function renderPreview(raw) {
    if (!raw) return '';
    let s = escapeHtml(raw);
    s = s.replace(/\\n/g, '<br>').replace(/\n/g, '<br>');
    s = s.replace(/&lt;b&gt;([\s\S]*?)&lt;\/b&gt;/g, '<strong>$1</strong>');
    s = s.replace(/&lt;color=(#[0-9a-fA-F]{6})&gt;([\s\S]*?)&lt;\/color&gt;/g,
      (m, hex, txt) => `<span style="color:${hex}">${txt}</span>`);

    const parts = s.split(/(&amp;#[0-9a-fA-F]{6};)/g);
    if (parts.length > 1) {
      let out = '', current = null;
      for (const part of parts) {
        const m = part.match(/^&amp;(#[0-9a-fA-F]{6});$/);
        if (m) { current = m[1]; continue; }
        out += current ? `<span style="color:${current}">${part}</span>` : part;
      }
      s = out;
    }
    return s;
  }

  function insertAtCursor(ta, wrapFn) {
    const start = ta.selectionStart, end = ta.selectionEnd;
    const val = ta.value;
    const selected = val.slice(start, end);
    const inserted = wrapFn(selected);
    ta.value = val.slice(0, start) + inserted + val.slice(end);
    const pos = start + inserted.length;
    ta.selectionStart = ta.selectionEnd = pos;
    ta.focus();
  }

  function gradientColors(fromHex, toHex, n, style) {
    const [r1, g1, b1] = hexToRgb(fromHex);
    const [r2, g2, b2] = hexToRgb(toHex);
    const colors = [];
    for (let i = 0; i < n; i++) {
      let t = n <= 1 ? 0 : i / (n - 1);
      if (style === 'bounce') {
        const half = (n - 1) / 2 || 1;
        t = i <= half ? (i / half) : ((n - 1 - i) / half);
      } else if (style === 'reverse') {
        t = 1 - t;
      }
      colors.push(rgbToHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t));
    }
    return colors;
  }

  function buildGradientTags(text, fromHex, toHex, style) {
    const chars = text.split('');
    const idxs = chars.map((c, i) => i).filter(i => chars[i] !== ' ');
    const colors = gradientColors(fromHex, toHex, idxs.length || 1, style);
    let out = '', ci = 0;
    for (const c of chars) {
      if (c === ' ') { out += ' '; continue; }
      out += wrapColor(colors[ci], c);
      ci++;
    }
    return out;
  }

  // ---------- tabs ----------
  function initTabs() {
    document.querySelectorAll('.tab').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById('panel-' + btn.dataset.tab).classList.add('active');
        if (btn.dataset.tab === 'json') syncJsonEditor();
      });
    });
  }

  // ---------- editor tab ----------
  const motdInput = document.getElementById('motdInput');
  const livePreview = document.getElementById('livePreview');
  const charCount = document.getElementById('charCount');
  const emptyState = document.getElementById('emptyState');

  function onMotdChange() {
    state.motd = motdInput.value;
    charCount.textContent = `${state.motd.length} CHARS`;
    emptyState.style.display = state.motd.length ? 'none' : 'inline-block';
    livePreview.innerHTML = state.motd ? renderPreview(state.motd) : '<span style="color:var(--text-faint)">Start typing...</span>';
    saveState();
  }

  function initEditor() {
    motdInput.value = state.motd;
    onMotdChange();
    motdInput.addEventListener('input', onMotdChange);

    document.getElementById('saveBtn').addEventListener('click', () => {
      if (!state.motd.trim()) return;
      state.history.unshift({ text: state.motd, ts: Date.now() });
      state.history = state.history.slice(0, 50);
      saveState();
      renderHistory();
      flashPill(emptyState, 'SAVED');
    });

    document.getElementById('copyBtn').addEventListener('click', () => copyText(state.motd));

    document.getElementById('clearBtn').addEventListener('click', () => {
      motdInput.value = '';
      onMotdChange();
    });

    document.getElementById('wrapAllBtn').addEventListener('click', () => {
      const hex = QUICK_COLORS[Math.floor(Math.random() * QUICK_COLORS.length)];
      motdInput.value = wrapColor(hex, motdInput.value);
      onMotdChange();
    });

    // quick colors
    const swatchRow = document.getElementById('quickColors');
    QUICK_COLORS.forEach(hex => {
      const sw = document.createElement('div');
      sw.className = 'swatch';
      sw.style.background = hex;
      sw.title = hex;
      sw.addEventListener('click', () => {
        insertAtCursor(motdInput, (sel) => wrapColor(hex, sel || 'text'));
        onMotdChange();
      });
      swatchRow.appendChild(sw);
    });

    // templates
    document.getElementById('templateRow').addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-template]');
      if (!btn) return;
      const key = btn.dataset.template;
      if (key === 'boldwrap') {
        insertAtCursor(motdInput, (sel) => `<b>${sel || 'bold text'}</b>`);
      } else {
        insertAtCursor(motdInput, () => TEMPLATES[key]);
      }
      onMotdChange();
    });

    // quick gradient insert (editor tab)
    const qFrom = document.getElementById('gradFromHex');
    const qFromSw = document.getElementById('gradFromSwatch');
    const qTo = document.getElementById('gradToHex');
    const qToSw = document.getElementById('gradToSwatch');
    const qText = document.getElementById('gradQuickText');
    const qPreview = document.getElementById('gradQuickPreview');

    function syncQuickGradient() {
      if (isValidHex(qFrom.value)) qFromSw.value = qFrom.value;
      if (isValidHex(qTo.value)) qToSw.value = qTo.value;
      const tags = buildGradientTags(qText.value || '', qFromSw.value, qToSw.value, 'linear');
      qPreview.innerHTML = renderPreview(tags) || '<span style="color:var(--text-faint)">...</span>';
      qPreview.dataset.tags = tags;
    }
    qFromSw.addEventListener('input', () => { qFrom.value = qFromSw.value; syncQuickGradient(); });
    qToSw.addEventListener('input', () => { qTo.value = qToSw.value; syncQuickGradient(); });
    qFrom.addEventListener('input', syncQuickGradient);
    qTo.addEventListener('input', syncQuickGradient);
    qText.addEventListener('input', syncQuickGradient);
    syncQuickGradient();

    document.getElementById('gradQuickInsert').addEventListener('click', () => {
      insertAtCursor(motdInput, () => qPreview.dataset.tags || '');
      onMotdChange();
    });
    document.getElementById('gradQuickCopy').addEventListener('click', () => copyText(qPreview.dataset.tags || ''));
  }

  function flashPill(el, text) {
    const original = el.textContent;
    el.textContent = text;
    el.style.display = 'inline-block';
    setTimeout(() => { el.textContent = original; onMotdChange(); }, 1200);
  }

  function copyText(text) {
    navigator.clipboard?.writeText(text).catch(() => {});
  }

  // ---------- gradient tab ----------
  function initGradientTab() {
    const gFrom = document.getElementById('gFromHex');
    const gFromSw = document.getElementById('gFromSwatch');
    const gTo = document.getElementById('gToHex');
    const gToSw = document.getElementById('gToSwatch');
    const gStyle = document.getElementById('gStyle');
    const gText = document.getElementById('gradText');
    const gPreview = document.getElementById('gradPreview');
    const gOutput = document.getElementById('gradOutput');

    function recalc() {
      if (isValidHex(gFrom.value)) gFromSw.value = gFrom.value;
      if (isValidHex(gTo.value)) gToSw.value = gTo.value;
      const tags = buildGradientTags(gText.value || '', gFromSw.value, gToSw.value, gStyle.value);
      gOutput.value = tags;
      gPreview.innerHTML = renderPreview(tags) || '<span style="color:var(--text-faint)">...</span>';
    }

    gFromSw.addEventListener('input', () => { gFrom.value = gFromSw.value; recalc(); });
    gToSw.addEventListener('input', () => { gTo.value = gToSw.value; recalc(); });
    gFrom.addEventListener('input', recalc);
    gTo.addEventListener('input', recalc);
    gStyle.addEventListener('change', recalc);
    gText.addEventListener('input', recalc);

    document.getElementById('gradInsertBtn').addEventListener('click', () => {
      insertAtCursor(motdInput, () => gOutput.value);
      onMotdChange();
    });
    document.getElementById('gradCopyBtn').addEventListener('click', () => copyText(gOutput.value));

    recalc();
  }

  // ---------- credits tab ----------
  function renderCredits() {
    const list = document.getElementById('creditsList');
    list.innerHTML = '';
    if (!state.credits.length) {
      list.innerHTML = '<p class="empty-note">No credits added yet.</p>';
    }
    state.credits.forEach((c, i) => {
      const row = document.createElement('div');
      row.className = 'credit-row';
      row.innerHTML = `<span><span class="who">${escapeHtml(c.name)}</span><span class="role">${escapeHtml(c.role)}</span></span>`;
      const del = document.createElement('button');
      del.textContent = 'Remove';
      del.addEventListener('click', () => {
        state.credits.splice(i, 1);
        saveState();
        renderCredits();
      });
      row.appendChild(del);
      list.appendChild(row);
    });

    const previewText = state.credits.map(c => wrapColor(state.settings.accent, c.name) + ` — ${c.role}`).join('\\n');
    document.getElementById('creditsPreview').innerHTML = renderPreview(previewText) || '<span style="color:var(--text-faint)">No credits yet</span>';
    document.getElementById('creditsPreview').dataset.text = previewText;
  }

  function initCreditsTab() {
    document.getElementById('addCreditBtn').addEventListener('click', () => {
      const nameEl = document.getElementById('creditName');
      const roleEl = document.getElementById('creditRole');
      const name = nameEl.value.trim();
      const role = roleEl.value.trim() || 'Contributor';
      if (!name) return;
      state.credits.push({ name, role });
      nameEl.value = ''; roleEl.value = '';
      saveState();
      renderCredits();
    });

    document.getElementById('creditsInsertBtn').addEventListener('click', () => {
      const text = document.getElementById('creditsPreview').dataset.text || '';
      insertAtCursor(motdInput, () => text);
      onMotdChange();
    });
    document.getElementById('creditsCopyBtn').addEventListener('click', () => {
      copyText(document.getElementById('creditsPreview').dataset.text || '');
    });

    renderCredits();
  }

  // ---------- json editor tab ----------
  function syncJsonEditor() {
    document.getElementById('jsonEditor').value = JSON.stringify(state, null, 2);
    document.getElementById('jsonError').textContent = '';
    document.getElementById('jsonStatus').textContent = 'SYNCED';
  }

  function initJsonTab() {
    document.getElementById('jsonApplyBtn').addEventListener('click', () => {
      const errEl = document.getElementById('jsonError');
      try {
        const parsed = JSON.parse(document.getElementById('jsonEditor').value);
        state = Object.assign(defaultState(), parsed);
        saveState();
        rerenderAll();
        errEl.textContent = '';
        document.getElementById('jsonStatus').textContent = 'APPLIED';
      } catch (e) {
        errEl.textContent = 'Invalid JSON: ' + e.message;
        document.getElementById('jsonStatus').textContent = 'ERROR';
      }
    });
    document.getElementById('jsonReloadBtn').addEventListener('click', syncJsonEditor);
    document.getElementById('jsonCopyBtn').addEventListener('click', () => copyText(document.getElementById('jsonEditor').value));
    syncJsonEditor();
  }

  // ---------- multi-line tab ----------
  function renderLines() {
    const list = document.getElementById('linesList');
    list.innerHTML = '';
    state.lines.forEach((line, i) => {
      const row = document.createElement('div');
      row.className = 'line-row';
      const ta = document.createElement('textarea');
      ta.value = line;
      ta.addEventListener('input', () => {
        state.lines[i] = ta.value;
        saveState();
        renderLinesPreview();
      });
      const del = document.createElement('button');
      del.textContent = 'Remove';
      del.addEventListener('click', () => {
        state.lines.splice(i, 1);
        saveState();
        renderLines();
      });
      row.appendChild(ta);
      row.appendChild(del);
      list.appendChild(row);
    });
    renderLinesPreview();
  }

  function renderLinesPreview() {
    const box = document.getElementById('linesPreview');
    box.innerHTML = '';
    state.lines.forEach(line => {
      const div = document.createElement('div');
      div.innerHTML = renderPreview(line) || '<span style="color:var(--text-faint)">empty line</span>';
      box.appendChild(div);
    });
  }

  function initMultilineTab() {
    document.getElementById('addLineBtn').addEventListener('click', () => {
      state.lines.push('');
      saveState();
      renderLines();
    });
    document.getElementById('linesInsertBtn').addEventListener('click', () => {
      motdInput.value = state.lines.join('\\n');
      onMotdChange();
    });
    document.getElementById('linesCopyBtn').addEventListener('click', () => {
      copyText(state.lines.join('\\n'));
    });
    renderLines();
  }

  // ---------- history tab ----------
  function renderHistory() {
    const list = document.getElementById('historyList');
    list.innerHTML = '';
    if (!state.history.length) {
      list.innerHTML = '<p class="empty-note">No saved MOTDs yet — hit Save on the Editor tab.</p>';
      return;
    }
    state.history.forEach((h, i) => {
      const item = document.createElement('div');
      item.className = 'history-item';
      const date = new Date(h.ts);
      item.innerHTML = `
        <div class="h-meta"><span>#${state.history.length - i}</span><span>${date.toLocaleString()}</span></div>
        <div class="h-text">${renderPreview(h.text)}</div>
      `;
      const btnRow = document.createElement('div');
      btnRow.className = 'btn-row';
      const loadBtn = document.createElement('button');
      loadBtn.className = 'btn btn-primary';
      loadBtn.textContent = 'Load';
      loadBtn.addEventListener('click', () => {
        motdInput.value = h.text;
        onMotdChange();
        document.querySelector('.tab[data-tab="editor"]').click();
      });
      const delBtn = document.createElement('button');
      delBtn.className = 'btn';
      delBtn.textContent = 'Delete';
      delBtn.addEventListener('click', () => {
        state.history.splice(i, 1);
        saveState();
        renderHistory();
      });
      btnRow.appendChild(loadBtn);
      btnRow.appendChild(delBtn);
      item.appendChild(btnRow);
      list.appendChild(item);
    });
  }

  function initHistoryTab() {
    document.getElementById('clearHistoryBtn').addEventListener('click', () => {
      state.history = [];
      saveState();
      renderHistory();
    });
    renderHistory();
  }

  // ---------- settings tab ----------
  function applyAccent(hex) {
    document.documentElement.style.setProperty('--accent', hex);
  }

  function initSettingsTab() {
    const accentPicker = document.getElementById('accentPicker');
    accentPicker.value = state.settings.accent;
    applyAccent(state.settings.accent);
    accentPicker.addEventListener('input', () => {
      state.settings.accent = accentPicker.value;
      applyAccent(accentPicker.value);
      saveState();
    });

    const tagFormat = document.getElementById('tagFormat');
    tagFormat.value = state.settings.tagFormat;
    tagFormat.addEventListener('change', () => {
      state.settings.tagFormat = tagFormat.value;
      saveState();
    });

    document.getElementById('exportDataBtn').addEventListener('click', () => {
      const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'motd-maker-data.json';
      a.click();
      URL.revokeObjectURL(url);
    });

    document.getElementById('wipeDataBtn').addEventListener('click', () => {
      if (!confirm('Wipe all locally stored data? This cannot be undone.')) return;
      state = defaultState();
      saveState();
      rerenderAll();
    });
  }

  // ---------- init ----------
  function rerenderAll() {
    motdInput.value = state.motd;
    onMotdChange();
    renderCredits();
    renderLines();
    renderHistory();
    syncJsonEditor();
    document.getElementById('accentPicker').value = state.settings.accent;
    applyAccent(state.settings.accent);
    document.getElementById('tagFormat').value = state.settings.tagFormat;
  }

  document.addEventListener('DOMContentLoaded', () => {
    initTabs();
    initEditor();
    initGradientTab();
    initCreditsTab();
    initJsonTab();
    initMultilineTab();
    initHistoryTab();
    initSettingsTab();
  });
})();
