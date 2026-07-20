(() => {
  'use strict';

  const core = window.NovelLensCore;
  const state = {
    report: null,
    currentView: 'import',
    settings: {
      apiBase: 'http://localhost:1234/v1',
      apiModel: 'local-model',
      apiKey: '',
      useLocalAI: false
    }
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const passageById = id => state.report?.passages.find(p => p.id === id);

  const demoText = `PROLOGUE
The valley had always depended on the river, although no one living remembered who had first diverted it through the old stone gates. Mara Vale returned after twelve years to find brass meters fixed to every house and the Company seal stamped above the council door. Her brother Elias told her the arrangement was temporary. The drought had emptied the reservoirs, the mayor had resigned, and the Company alone possessed the pumps required to keep the town alive.

CHAPTER ONE
At first the new rules seemed reasonable. Each household received enough water to drink, wash and keep a narrow garden alive. In exchange, citizens carried identity cards and recorded every bucket. Company Administrator Venn spoke each evening from the clock tower. He promised that ordinary government would return when the emergency ended. Mara noticed that he never defined an ending.

Old Nessa, who kept the archive beneath the library, showed Mara contracts signed during an earlier famine. The merchants of that age had also been granted temporary control of the gates. The council later broke the monopoly after a winter uprising, but the official history called it an orderly reform. Nessa warned that towns preferred legends in which nobody had resisted.

CHAPTER TWO
The river fell lower. Families from the northern farms arrived at the gates and were refused entry. Rumours said the strangers carried fever, stole rations and intended to poison the pumps. Elias repeated the rumours at supper, though he had once worked beside many of the displaced farmers. Mara saw Company guards mark foreign names in red and move those families to a camp beside the dry canal.

A new machine was installed in the tower. It measured work, debt, family size and public loyalty, then assigned each citizen a daily allowance. Venn called the machine impartial. The machine reduced Nessa's water because the archive produced no measurable value. Elias received extra rations after joining the guards.

CHAPTER THREE
Mara began copying the old contracts and passing them through the market. People learned that the Company owned the pumps but not the river. Venn declared the copies false and announced a temporary curfew. The curfew became permanent within three days. Meetings were forbidden. The council chamber became a records office, and the last elected councillor accepted a Company salary.

Elias arrested Mara at the library. He said he was protecting her from a crowd gathering outside. She asked whether protection still deserved that name when it required obedience. Elias looked toward the tower before answering. The machine had assigned him a house, a uniform and enough water for a future family. He could not imagine freedom without losing everything that now made him safe.

CHAPTER FOUR
The crowd broke the archive doors before dawn, not to burn the records but to carry them into the square. Nessa read the famine contracts aloud. Workers at the pumps stopped the engines. The river rose against the closed gates, flooding the Company warehouse. Venn ordered Elias to fire into the square. Elias raised his rifle, then turned it toward the tower clock.

The shot destroyed the public speaker but not the machine beneath it. Without Venn's voice, the machine continued issuing commands. Guards received orders on their cards. Pumps restarted. Gates closed. Venn himself fled across the eastern bridge while the system he had built no longer required him.

CHAPTER FIVE
Mara entered the tower with Elias and found no throne, no secret council and no single lever. The machine was distributed through every meter, ledger and debt contract in the valley. Destroying the tower would stop nothing. Nessa proposed an older remedy: every household would open its meter at the same hour, making the records useless and the ration rules unenforceable.

At noon the valley used more water than the system believed existed. The pumps stopped to protect themselves. People opened the stone gates by hand. Some water was lost, gardens flooded and the northern camp was swept away before its families could recover their few possessions. Liberation arrived unevenly, injuring some of those already harmed.

EPILOGUE
The council returned, but it kept the identity cards because they were convenient. Elias refused a seat and repaired gates along the northern road. Nessa rewrote the public history to include the uprising, the camp and the flood. Mara became keeper of the archive. Years later, children asked why brass meters still hung beside the doors. Their parents answered that the meters were harmless now. Mara was never certain whether that was true.`;

  function setStatus(text, type = 'idle') {
    const el = $('#analysisStatus');
    el.textContent = text;
    el.className = `status-pill ${type}`;
  }

  function showView(name) {
    state.currentView = name;
    $$('.view').forEach(v => v.classList.toggle('active', v.id === `view-${name}`));
    $$('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.view === name));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function evidenceButtons(ids = []) {
    if (!ids.length) return '';
    return `<div class="evidence-links">${ids.map(id => {
      const p = passageById(id);
      return p ? `<button class="evidence-link" data-passage="${id}">${escapeHtml(p.chapterTitle)} · ¶${p.paragraphIndex + 1}</button>` : '';
    }).join('')}</div>`;
  }

  function card(label, title, body, evidence = [], extraClass = '', confidence = '') {
    return `<article class="analysis-card ${extraClass}">
      <span class="card-label">${escapeHtml(label)}</span>
      <h3>${escapeHtml(title)}</h3>
      <p>${escapeHtml(body)}</p>
      ${confidence ? `<span class="confidence">${escapeHtml(confidence)}</span>` : ''}
      ${evidenceButtons(evidence)}
    </article>`;
  }

  function renderReport() {
    const r = state.report;
    $('#bookTitle').textContent = r.title;
    $('#bookMeta').textContent = `${r.stats.sentenceCount.toLocaleString()} sentences · approximately ${r.stats.estimatedMinutes.toLocaleString()} minutes at 250 words/minute`;
    $('#wordCount').textContent = r.stats.wordCount.toLocaleString();
    $('#chapterCount').textContent = r.stats.chapterCount.toLocaleString();
    $('#exportBtn').disabled = false;

    renderEssence();
    renderStory();
    renderCharacters();
    renderThemes();
    renderHistory();
    renderEvidence();
    $('#askContent').className = 'answer-panel empty-state';
    $('#askContent').textContent = 'Ask a question about a character, event, symbol, theme or ending.';
  }

  function renderEssence() {
    const r = state.report;
    const e = r.essence;
    $('#essenceContent').className = 'card-grid';
    $('#essenceContent').innerHTML = [
      card('The novel in one sentence', 'Compressed narrative signal', e.oneSentence, e.evidence, 'wide', 'Extractive'),
      card('What it is really about', 'Strongest thematic reading', e.reallyAbout, r.themes[0]?.evidence || [], '', r.themes[0]?.confidence || 'Tentative'),
      card('Central human conflict', 'Agency under pressure', e.centralConflict, r.characters[0]?.evidence || [], '', 'Structured inference'),
      card('The novel in one paragraph', 'Narrative compression', e.oneParagraph, [], 'full', 'Extractive synthesis'),
      card('Why the ending matters', 'Closing consequence', e.endingMeaning, r.plotSpine.at(-1)?.evidence || [], 'wide', 'Interpretive candidate'),
      card('What remains unresolved', 'Ambiguity signal', e.unresolved, r.plotSpine.at(-1)?.evidence || [], '', 'Textual or inferred')
    ].join('');
  }

  function renderStory() {
    const r = state.report;
    $('#storyContent').className = 'timeline';
    $('#storyContent').innerHTML = r.plotSpine.map(stage => `<article class="timeline-item">
      <div class="timeline-marker">${stage.index}</div>
      <div class="timeline-card">
        <span class="card-label">${escapeHtml(stage.label)}</span>
        <h3>${escapeHtml(core.truncate(stage.text, 110))}</h3>
        <p>${escapeHtml(stage.text)}</p>
        <span class="confidence">${escapeHtml(stage.confidence)}</span>
        ${evidenceButtons(stage.evidence)}
      </div>
    </article>`).join('');
  }

  function renderCharacters() {
    const r = state.report;
    const el = $('#characterContent');
    el.className = 'card-grid';
    if (!r.characters.length) {
      el.className = 'card-grid empty-state';
      el.textContent = 'No recurring character names met the minimum confidence threshold.';
      return;
    }
    el.innerHTML = r.characters.map((c, index) => `<article class="analysis-card ${index === 0 ? 'wide' : ''}">
      <div class="character-head"><div class="character-avatar">${escapeHtml(c.name.split(/\s+/).map(x => x[0]).slice(0,2).join(''))}</div><div><span class="card-label">${escapeHtml(c.role)}</span><h3>${escapeHtml(c.name)}</h3></div></div>
      <p>${escapeHtml(c.arc)}</p>
      <div class="tag-row"><span class="tag">${c.mentions} passage mentions</span><span class="tag">${Math.round(c.coverage * 100)}% section span</span>${c.descriptors.map(d => `<span class="tag">${escapeHtml(d)}</span>`).join('')}</div>
      ${evidenceButtons(c.evidence)}
    </article>`).join('');
  }

  function renderThemes() {
    const r = state.report;
    const el = $('#themeContent');
    el.className = 'card-grid';
    const themeCards = r.themes.map((t, index) => `<article class="analysis-card ${index === 0 ? 'wide' : ''}">
      <span class="card-label">Theme candidate · score ${t.score}/100</span>
      <h3>${escapeHtml(t.name)}</h3>
      <p>${escapeHtml(t.proposition)}</p>
      <div class="score-bar" aria-label="Theme score ${t.score} out of 100"><span style="width:${t.score}%"></span></div>
      <div class="tag-row"><span class="tag">${t.count} keyword signals</span><span class="tag">${Math.round(t.spread * 100)}% section spread</span></div>
      <span class="confidence">${escapeHtml(t.confidence)}</span>
      ${evidenceButtons(t.evidence)}
    </article>`).join('');

    const motifs = `<article class="analysis-card full"><span class="card-label">Recurring lexical motifs</span><h3>Repeated objects, concepts and images</h3><p>These are repetition-and-spread signals. They are not automatically symbols.</p><div class="tag-row">${r.motifs.map(m => `<button class="tag evidence-link" data-passage="${m.evidence[0] || ''}" title="${m.count} occurrences across ${Math.round(m.spread*100)}% of sections">${escapeHtml(m.word)} · ${m.count}</button>`).join('')}</div></article>`;
    el.innerHTML = themeCards + motifs;
  }

  function renderHistory() {
    const r = state.report;
    const el = $('#historyContent');
    el.className = 'history-layout';
    if (!r.history.length) {
      el.className = 'history-layout empty-state';
      el.textContent = 'No historical pattern reached the minimum signal threshold in the compact built-in corpus.';
      return;
    }
    el.innerHTML = r.history.map((h, index) => `<article class="history-card ${index === 0 ? 'featured' : ''}">
      <span class="card-label">${escapeHtml(h.category)} · match ${h.score}/100</span>
      <h3>${escapeHtml(h.name)}</h3>
      <p>${escapeHtml(h.baseline)}</p>
      <div class="score-bar"><span style="width:${h.score}%"></span></div>
      <div class="fork-line">
        <div class="fork-path"><b>Historical baseline</b>${escapeHtml(h.sequence.join(' → '))}</div>
        <div class="fork-arrow">→</div>
        <div class="fork-path"><b>Detected fork</b>${escapeHtml(h.forkType)}: ${escapeHtml(h.forkReason)}</div>
      </div>
      <div class="dimension-grid">
        ${Object.entries(h.dimensions).map(([key, value]) => `<div class="dimension"><b>${escapeHtml(key)}</b><span>${escapeHtml(value)}</span></div>`).join('')}
      </div>
      <h3>Closest included precedents</h3>
      <ul class="mini-list">${h.precedents.map(p => `<li><b>${escapeHtml(p.title)}</b> (${escapeHtml(p.period)}): ${escapeHtml(p.note)}</li>`).join('')}</ul>
      <span class="confidence">${escapeHtml(h.novelty)}</span>
      ${evidenceButtons(h.evidence)}
    </article>`).join('');
  }

  function renderEvidence(filter = '') {
    const r = state.report;
    const query = filter.trim().toLowerCase();
    const chapterValue = $('#chapterFilter').value;
    let passages = r.passages;
    if (chapterValue !== 'all') passages = passages.filter(p => p.chapterId === chapterValue);
    if (query) passages = passages.filter(p => `${p.chapterTitle} ${p.text}`.toLowerCase().includes(query));

    const el = $('#evidenceContent');
    el.className = 'evidence-list';
    if (!passages.length) {
      el.className = 'evidence-list empty-state';
      el.textContent = 'No passages match the current filters.';
      return;
    }
    el.innerHTML = passages.slice(0, 120).map(p => `<article class="evidence-item">
      <header><h3>${escapeHtml(p.chapterTitle)} · paragraph ${p.paragraphIndex + 1}</h3><small>${p.words.length} words</small></header>
      <p>${escapeHtml(core.truncate(p.text, 320))}</p>
      <button class="evidence-link" data-passage="${p.id}">Open full passage</button>
    </article>`).join('');
  }

  function openPassage(id) {
    const p = passageById(id);
    if (!p) return;
    $('#passageTitle').textContent = `${p.chapterTitle} · paragraph ${p.paragraphIndex + 1}`;
    $('#passageBody').textContent = p.text;
    $('#passageDialog').showModal();
  }

  async function runAnalysis() {
    const text = $('#textInput').value.trim();
    const title = $('#titleInput').value.trim() || 'Untitled novel';
    setStatus('Analysing locally…', 'working');
    $('#analyseBtn').disabled = true;
    try {
      await new Promise(resolve => setTimeout(resolve, 40));
      state.report = core.analyseNovel(text, { title });
      renderReport();
      setStatus('Analysis ready', 'ready');
      saveSession();
      showView('essence');
    } catch (error) {
      console.error(error);
      setStatus(error.message || 'Analysis failed', 'error');
      alert(error.message || 'The analysis could not be completed.');
    } finally {
      $('#analyseBtn').disabled = false;
    }
  }

  async function readFile(file) {
    if (!file) return;
    const extension = file.name.split('.').pop().toLowerCase();
    const textExtensions = ['txt','md','markdown','html','htm'];
    if (extension !== 'epub' && !textExtensions.includes(extension)) {
      alert('Novel Lens imports EPUB, TXT, Markdown and HTML files. PDF and DOCX import are not yet included.');
      return;
    }

    $('#analyseBtn').disabled = true;
    try {
      if (extension === 'epub') {
        setStatus('Opening EPUB archive…', 'working');
        const parsed = await window.NovelLensEpub.parse(file, {
          onProgress: message => setStatus(message, 'working')
        });
        $('#titleInput').value = parsed.title || file.name.replace(/\.epub$/i, '');
        $('#textInput').value = core.normaliseText(parsed.text);
        const author = parsed.author ? ` · ${parsed.author}` : '';
        const skipped = parsed.warnings.length ? ` · ${parsed.warnings.length} warning${parsed.warnings.length === 1 ? '' : 's'}` : '';
        setStatus(`EPUB loaded · ${parsed.chapters.length} sections${author}${skipped}`, 'idle');
        if (parsed.warnings.length) console.warn('EPUB import warnings:', parsed.warnings);
      } else {
        setStatus('Reading text file…', 'working');
        const text = await file.text();
        $('#titleInput').value = file.name.replace(/\.[^.]+$/, '');
        $('#textInput').value = core.normaliseText(text);
        setStatus('Text loaded', 'idle');
      }
    } catch (error) {
      console.error(error);
      setStatus('Import failed', 'error');
      alert(error.message || 'The selected file could not be imported.');
    } finally {
      $('#analyseBtn').disabled = false;
      $('#fileInput').value = '';
    }
  }

  function loadDemo() {
    $('#titleInput').value = 'The Valley Ledger — demonstration text';
    $('#textInput').value = demoText;
    setStatus('Demonstration loaded', 'idle');
  }

  function saveSession() {
    try {
      localStorage.setItem('novelLens.session', JSON.stringify({ title: state.report.title, text: state.report.text }));
    } catch (error) {
      console.warn('Session could not be saved:', error);
    }
  }

  function loadSettings() {
    try {
      const saved = JSON.parse(localStorage.getItem('novelLens.settings') || '{}');
      state.settings = { ...state.settings, ...saved };
    } catch (_) {}
    $('#apiBase').value = state.settings.apiBase;
    $('#apiModel').value = state.settings.apiModel;
    $('#apiKey').value = state.settings.apiKey;
    $('#useLocalAI').checked = !!state.settings.useLocalAI;
  }

  function saveSettings() {
    state.settings = {
      apiBase: $('#apiBase').value.trim().replace(/\/$/, ''),
      apiModel: $('#apiModel').value.trim(),
      apiKey: $('#apiKey').value,
      useLocalAI: $('#useLocalAI').checked
    };
    localStorage.setItem('novelLens.settings', JSON.stringify(state.settings));
    $('#settingsDialog').close();
    setStatus(state.report ? 'Analysis ready' : 'Settings saved', state.report ? 'ready' : 'idle');
  }

  async function callLocalAI(messages) {
    const settings = state.settings;
    if (!settings.useLocalAI || !settings.apiBase || !settings.apiModel) throw new Error('Enable local AI and provide a base URL and model name in Settings.');
    const headers = { 'Content-Type': 'application/json' };
    if (settings.apiKey) headers.Authorization = `Bearer ${settings.apiKey}`;
    const response = await fetch(`${settings.apiBase}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ model: settings.apiModel, messages, temperature: 0.2, max_tokens: 1400 })
    });
    if (!response.ok) throw new Error(`Local AI endpoint returned ${response.status}: ${await response.text()}`);
    const data = await response.json();
    return data.choices?.[0]?.message?.content || data.output_text || 'The endpoint returned no readable answer.';
  }

  async function reviewSection(section) {
    if (!state.report) return;
    const button = $(`.ai-review-btn[data-section="${section}"]`);
    const original = button.textContent;
    button.disabled = true;
    button.textContent = 'Reviewing…';
    try {
      const dossier = core.buildDossier(state.report, section);
      const prompt = section === 'history'
        ? 'Challenge the historical parallels and fork classifications. Identify overreach, stronger alternatives, and what cannot be concluded. Return a compact evidence-conscious review.'
        : 'Review the proposed essence, themes, character arcs and ending. Distinguish explicit evidence, strong inference and speculation. Return a compact corrective analysis.';
      const answer = await callLocalAI([
        { role: 'system', content: 'You are an evidence auditor for literary and historical analysis. Never invent quotations, sources or facts. Treat the historical corpus as incomplete.' },
        { role: 'user', content: `${prompt}\n\nDOSSIER:\n${JSON.stringify(dossier, null, 2)}` }
      ]);
      $('#passageTitle').textContent = `${section === 'history' ? 'History Lens' : 'Essence'} · local AI review`;
      $('#passageBody').textContent = answer;
      $('#passageDialog').showModal();
    } catch (error) {
      alert(error.message);
    } finally {
      button.disabled = false;
      button.textContent = original;
    }
  }

  async function askQuestion(event) {
    event.preventDefault();
    if (!state.report) {
      alert('Analyse a novel before asking a question.');
      return;
    }
    const query = $('#askInput').value.trim();
    if (!query) return;
    const result = core.questionAnswer(state.report, query);
    const el = $('#askContent');
    el.className = 'answer-panel';
    el.innerHTML = `<article class="answer-box"><span class="card-label">Deterministic retrieval</span><h3>Evidence-first answer</h3><p>${escapeHtml(result.answer)}</p>${evidenceButtons(result.matches.map(x => x.passage.id))}</article>`;

    if (state.settings.useLocalAI && result.matches.length) {
      const loading = document.createElement('article');
      loading.className = 'answer-box ai';
      loading.innerHTML = '<span class="card-label">Local AI</span><h3>Grounded synthesis</h3><p>Generating from retrieved evidence…</p>';
      el.appendChild(loading);
      try {
        const evidence = result.matches.map((m, i) => ({ rank:i+1, section:m.passage.chapterTitle, passageId:m.passage.id, text:m.passage.text }));
        const dossier = core.buildDossier(state.report, 'essence');
        const answer = await callLocalAI([
          { role: 'system', content: 'Answer only from the supplied novel evidence and dossier. Cite passage IDs in parentheses. Clearly label inference and uncertainty. Do not invent quotations.' },
          { role: 'user', content: `QUESTION: ${query}\n\nEVIDENCE:\n${JSON.stringify(evidence, null, 2)}\n\nDOSSIER:\n${JSON.stringify(dossier, null, 2)}` }
        ]);
        loading.innerHTML = `<span class="card-label">Local AI</span><h3>Grounded synthesis</h3><p>${escapeHtml(answer)}</p>`;
      } catch (error) {
        loading.innerHTML = `<span class="card-label">Local AI unavailable</span><h3>Endpoint error</h3><p>${escapeHtml(error.message)}</p>`;
      }
    }
  }

  function exportReport() {
    if (!state.report) return;
    const r = state.report;
    const sections = [
      `<h1>${escapeHtml(r.title)}</h1><p>${r.stats.wordCount.toLocaleString()} words · ${r.chapters.length} sections</p>`,
      `<h2>Essence</h2><h3>One sentence</h3><p>${escapeHtml(r.essence.oneSentence)}</p><h3>What it is really about</h3><p>${escapeHtml(r.essence.reallyAbout)}</p><h3>Central conflict</h3><p>${escapeHtml(r.essence.centralConflict)}</p><h3>Ending</h3><p>${escapeHtml(r.essence.endingMeaning)}</p>`,
      `<h2>Plot spine</h2><ol>${r.plotSpine.map(x => `<li><b>${escapeHtml(x.label)}:</b> ${escapeHtml(x.text)}</li>`).join('')}</ol>`,
      `<h2>Characters</h2>${r.characters.map(c => `<h3>${escapeHtml(c.name)}</h3><p>${escapeHtml(c.arc)}</p>`).join('')}`,
      `<h2>Themes</h2>${r.themes.map(t => `<h3>${escapeHtml(t.name)} (${t.score}/100)</h3><p>${escapeHtml(t.proposition)}</p>`).join('')}`,
      `<h2>History Lens</h2>${r.history.map(h => `<h3>${escapeHtml(h.name)} (${h.score}/100)</h3><p><b>${escapeHtml(h.forkType)}:</b> ${escapeHtml(h.forkReason)}</p><p>${escapeHtml(h.baseline)}</p>`).join('')}`,
      `<h2>Limitations</h2><ul>${r.limitations.map(x => `<li>${escapeHtml(x)}</li>`).join('')}</ul>`
    ];
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(r.title)} — Novel Lens Report</title><style>body{font-family:system-ui,sans-serif;max-width:920px;margin:40px auto;padding:0 24px;line-height:1.6;color:#182126}h1,h2,h3{line-height:1.2}h2{margin-top:2em;border-bottom:1px solid #ccd6da;padding-bottom:.3em}li{margin:.5em 0}</style></head><body>${sections.join('')}</body></html>`;
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${r.title.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'novel'}-novel-lens-report.html`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function resetApp() {
    if (!confirm('Clear the imported text, analysis and saved session? Local AI settings will be retained.')) return;
    state.report = null;
    $('#titleInput').value = '';
    $('#textInput').value = '';
    $('#bookTitle').textContent = 'No novel loaded';
    $('#bookMeta').textContent = 'Import an EPUB, TXT, Markdown or HTML file, paste text, or load the demonstration novel.';
    $('#wordCount').textContent = '0';
    $('#chapterCount').textContent = '0';
    $('#exportBtn').disabled = true;
    localStorage.removeItem('novelLens.session');
    ['essenceContent','storyContent','characterContent','themeContent','historyContent','evidenceContent'].forEach(id => {
      const el = document.getElementById(id);
      el.className = id === 'storyContent' ? 'timeline empty-state' : id === 'historyContent' ? 'history-layout empty-state' : id === 'evidenceContent' ? 'evidence-list empty-state' : 'card-grid empty-state';
      el.textContent = 'Analyse a novel to generate this view.';
    });
    setStatus('Awaiting text', 'idle');
    showView('import');
  }

  function initialise() {
    loadSettings();

    $$('.brand-logo').forEach(img => img.addEventListener('error', () => { img.style.display = 'none'; }));
    $$('.nav-item').forEach(button => button.addEventListener('click', () => showView(button.dataset.view)));
    document.addEventListener('click', event => {
      const evidence = event.target.closest('[data-passage]');
      if (evidence?.dataset.passage) openPassage(evidence.dataset.passage);
    });
    $$('.close-dialog').forEach(button => button.addEventListener('click', () => button.closest('dialog').close()));
    $$('dialog').forEach(dialog => dialog.addEventListener('click', event => {
      const rect = dialog.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
    }));

    $('#fileInput').addEventListener('change', event => readFile(event.target.files[0]));
    const dropZone = $('#dropZone');
    ['dragenter','dragover'].forEach(name => dropZone.addEventListener(name, event => { event.preventDefault(); dropZone.classList.add('dragging'); }));
    ['dragleave','drop'].forEach(name => dropZone.addEventListener(name, event => { event.preventDefault(); dropZone.classList.remove('dragging'); }));
    dropZone.addEventListener('drop', event => readFile(event.dataTransfer.files[0]));

    $('#demoBtn').addEventListener('click', loadDemo);
    $('#analyseBtn').addEventListener('click', runAnalysis);
    $('#askForm').addEventListener('submit', askQuestion);
    $('#evidenceSearch').addEventListener('input', event => state.report && renderEvidence(event.target.value));
    $('#chapterFilter').addEventListener('change', () => state.report && renderEvidence($('#evidenceSearch').value));
    $('#exportBtn').addEventListener('click', exportReport);
    $('#settingsBtn').addEventListener('click', () => $('#settingsDialog').showModal());
    $('#aboutBtn').addEventListener('click', () => $('#aboutDialog').showModal());
    $('#saveSettingsBtn').addEventListener('click', saveSettings);
    $('#resetBtn').addEventListener('click', resetApp);
    $('#themeBtn').addEventListener('click', () => {
      const html = document.documentElement;
      const next = html.dataset.theme === 'dark' ? 'light' : 'dark';
      html.dataset.theme = next;
      localStorage.setItem('novelLens.theme', next);
    });
    $$('.ai-review-btn').forEach(button => button.addEventListener('click', () => reviewSection(button.dataset.section)));

    const savedTheme = localStorage.getItem('novelLens.theme');
    if (savedTheme === 'dark' || savedTheme === 'light') document.documentElement.dataset.theme = savedTheme;

    try {
      const session = JSON.parse(localStorage.getItem('novelLens.session') || 'null');
      if (session?.text) {
        $('#titleInput').value = session.title || '';
        $('#textInput').value = session.text;
        setStatus('Previous text restored', 'idle');
      }
    } catch (_) {}
  }

  document.addEventListener('DOMContentLoaded', initialise);
})();
