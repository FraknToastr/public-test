(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.NovelLensCore = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const STOPWORDS = new Set((
    'a an and are as at be been being but by can could did do does doing down during each few for from further had has have having he her here hers herself him himself his how i if in into is it its itself just me more most my myself no nor not now of off on once only or other our ours ourselves out over own same she should so some such than that the their theirs them themselves then there these they this those through to too under until up very was we were what when where which while who whom why will with would you your yours yourself yourselves said says say went came come go got get made make like one two three also still even back before after again around away every may might must shall'.split(/\s+/)
  ));

  const SENTENCE_START_EXCLUSIONS = new Set((
    'The A An And But Or So Then When While After Before As At In On From To He She It They We I His Her Their This That These Those There Here Chapter Part Book Volume Section Meanwhile Later Soon Finally Perhaps Maybe However Although Because If Yet No Yes Oh Dear Sir Madam Mr Mrs Ms Dr Professor Captain Colonel General King Queen Lord Lady Father Mother Uncle Aunt Company Council Government Committee State City Town River Valley Archive People Workers Guards Citizens Families Children Parents'.split(/\s+/)
  ));

  const THEMES = [
    {
      id: 'power', name: 'Power and control',
      keywords: ['power','control','command','rule','authority','obey','obedience','govern','government','law','order','dominate','master','subject','freedom','liberty','prison','cage'],
      proposition: 'The text repeatedly tests who is permitted to act, who must obey, and what power does to both ruler and subject.'
    },
    {
      id: 'identity', name: 'Identity and belonging',
      keywords: ['identity','name','self','belong','home','stranger','outsider','family','heritage','memory','remember','past','origin','mask','face','recognise'],
      proposition: 'Characters negotiate the tension between inherited identity, chosen identity and the need to belong.'
    },
    {
      id: 'love', name: 'Love, loyalty and betrayal',
      keywords: ['love','loved','heart','loyal','loyalty','trust','betray','betrayal','faithful','promise','marriage','friend','friendship','devotion','jealous','kiss'],
      proposition: 'Intimate bonds create obligations that can sustain characters or expose them to betrayal.'
    },
    {
      id: 'justice', name: 'Justice, guilt and responsibility',
      keywords: ['justice','guilt','guilty','innocent','crime','punish','punishment','judge','trial','blame','responsible','responsibility','wrong','right','mercy','revenge','vengeance'],
      proposition: 'The text asks whether formal judgment, personal conscience and moral responsibility lead to the same conclusion.'
    },
    {
      id: 'change', name: 'Change, progress and loss',
      keywords: ['change','changed','new','old','progress','future','past','machine','technology','factory','modern','tradition','loss','lost','decay','ruin','build','destroy'],
      proposition: 'Change is presented as both possibility and destruction, forcing characters to decide what should be preserved.'
    },
    {
      id: 'mortality', name: 'Mortality and meaning',
      keywords: ['death','dead','die','dying','grave','funeral','life','alive','age','old','time','eternal','soul','illness','blood','body','meaning'],
      proposition: 'Awareness of death alters the value of time, attachment, sacrifice and unfinished action.'
    },
    {
      id: 'truth', name: 'Truth, memory and perception',
      keywords: ['truth','true','lie','lied','secret','remember','memory','forget','dream','illusion','appear','seem','believe','know','knowledge','witness','story','voice'],
      proposition: 'Knowledge is unstable: memory, narration and self-interest compete to determine what counts as truth.'
    },
    {
      id: 'nature', name: 'Humanity and the natural world',
      keywords: ['nature','forest','tree','river','sea','ocean','earth','land','animal','wild','garden','storm','rain','sun','moon','season','field','mountain'],
      proposition: 'The natural world acts as setting, pressure, refuge or moral counterweight to human systems.'
    }
  ];

  const HISTORY_PATTERNS = [
    {
      id: 'emergency-power', name: 'Emergency powers becoming permanent', category: 'Political consolidation',
      keywords: ['emergency','crisis','security','temporary','decree','suspend','curfew','martial','surveillance','authority','order','threat','enemy'],
      sequence: ['Public crisis or perceived threat','Exceptional authority is granted','Oversight is weakened','Temporary measures become normal'],
      precedents: [
        { title: 'Roman emergency dictatorship', period: 'Roman Republic', note: 'Exceptional powers were constitutionally time-limited, though later political practice eroded those constraints.' },
        { title: 'Wartime emergency legislation', period: '19th–20th centuries', note: 'Governments repeatedly expanded censorship, detention and executive power during war.' },
        { title: 'Security-state expansion after political violence', period: 'Modern states', note: 'Public fear has often enabled durable surveillance and policing powers.' }
      ],
      baseline: 'Emergency authority usually persists when institutions, courts or organised opposition cannot reassert limits.'
    },
    {
      id: 'revolution', name: 'Revolutionary escalation and elite replacement', category: 'Regime change',
      keywords: ['revolution','rebellion','rebel','uprising','riot','mob','people','palace','throne','overthrow','regime','comrade','liberation','purge','traitor'],
      sequence: ['Legitimacy crisis','Coalition forms against incumbents','Old authority collapses','Revolutionary coalition fragments','New elite consolidates'],
      precedents: [
        { title: 'French Revolution', period: '1789–1799', note: 'Broad opposition to the old order fractured as violence, war and institutional collapse intensified.' },
        { title: 'Russian Revolution', period: '1917 onward', note: 'Competing revolutionary forces were displaced by a more disciplined organisation able to consolidate power.' },
        { title: 'Post-colonial and anti-authoritarian revolutions', period: '20th century', note: 'Liberation coalitions frequently divided over the structure of the successor state.' }
      ],
      baseline: 'Removing an old regime does not resolve conflicts inside the coalition that removed it.'
    },
    {
      id: 'scapegoat', name: 'Crisis-driven scapegoating', category: 'Social exclusion',
      keywords: ['outsider','stranger','foreign','foreigners','minority','blame','disease','plague','traitor','enemy','pure','impure','banish','expel','witch','rumour'],
      sequence: ['Crisis lacks a simple explanation','A visible group is blamed','Exclusion is normalised','Violence or expulsion follows'],
      precedents: [
        { title: 'Persecution during epidemics', period: 'Medieval to modern periods', note: 'Disease outbreaks repeatedly produced rumours and violence against minorities and outsiders.' },
        { title: 'Witch persecutions', period: 'Early modern Europe and colonies', note: 'Local crisis, accusation networks and institutional incentives converted suspicion into punishment.' },
        { title: 'Ethnonational exclusion campaigns', period: '19th–20th centuries', note: 'Political actors have converted economic and security anxiety into group-based blame.' }
      ],
      baseline: 'Scapegoating gains force when it provides emotional clarity and material advantage to organisers.'
    },
    {
      id: 'private-sovereignty', name: 'Private power displacing public authority', category: 'Institutional capture',
      keywords: ['company','corporation','merchant','contract','private','owner','debt','bank','monopoly','charter','factory','platform','network','system','administrator'],
      sequence: ['Public institution becomes dependent on a private actor','Dependency grants bargaining power','Private rules replace public accountability','Economic control becomes political authority'],
      precedents: [
        { title: 'Chartered trading companies', period: '17th–19th centuries', note: 'Commercial corporations exercised taxation, military and administrative powers across large territories.' },
        { title: 'Company towns', period: 'Industrial era', note: 'Employers controlled housing, stores, policing and local political life.' },
        { title: 'Infrastructure monopolies', period: 'Industrial and digital eras', note: 'Control of essential networks can convert market position into quasi-governmental influence.' }
      ],
      baseline: 'Private sovereignty emerges when essential infrastructure cannot be readily substituted or democratically controlled.'
    },
    {
      id: 'technology-displacement', name: 'Technology-driven displacement', category: 'Economic transformation',
      keywords: ['machine','machines','automation','automated','factory','engine','robot','algorithm','technology','workers','labour','job','work','replace','obsolete','efficiency'],
      sequence: ['New technique lowers costs','Existing skills lose value','Resistance and adaptation occur','New institutions or inequalities emerge'],
      precedents: [
        { title: 'Industrial mechanisation', period: '18th–19th centuries', note: 'Mechanisation increased output while disrupting craft labour, settlement and political organisation.' },
        { title: 'Agricultural mechanisation', period: '19th–20th centuries', note: 'Productivity gains accelerated rural displacement and urban migration.' },
        { title: 'Computerisation and platform work', period: 'Late 20th–21st centuries', note: 'Digital systems reorganised clerical, professional and service labour as well as industrial production.' }
      ],
      baseline: 'Technology rarely removes only tasks; it redistributes bargaining power, income, status and geographic opportunity.'
    },
    {
      id: 'imperial-frontier', name: 'Expansion, settlement and frontier conflict', category: 'Colonial expansion',
      keywords: ['empire','colony','colonial','settler','settlement','native','frontier','territory','conquest','mission','civilise','land','survey','fort','tribe','indigenous'],
      sequence: ['Territory is reclassified as available','Settlement or extraction expands','Existing sovereignty is denied','Resistance is criminalised','New institutions entrench possession'],
      precedents: [
        { title: 'European settler colonialism', period: '15th–20th centuries', note: 'Land seizure was accompanied by legal reclassification, violence, displacement and cultural suppression.' },
        { title: 'Internal imperial frontiers', period: 'Multiple regions and periods', note: 'States extended taxation, settlement and administrative control into territories treated as peripheral.' },
        { title: 'Resource concessions', period: '19th–21st centuries', note: 'Extraction projects have often combined state authority, private capital and dispossession.' }
      ],
      baseline: 'Frontier systems endure by converting contested occupation into law, infrastructure and ordinary administration.'
    },
    {
      id: 'migration', name: 'Mass migration and social reorganisation', category: 'Population movement',
      keywords: ['refugee','refugees','migrant','migration','flee','flight','exile','displaced','border','camp','journey','hunger','famine','war','home','return'],
      sequence: ['Violence, scarcity or opportunity drives movement','Borders and receiving communities respond','Temporary settlement becomes prolonged','Identity and labour systems change'],
      precedents: [
        { title: 'War and partition displacement', period: 'Ancient to modern periods', note: 'Conflict and state formation repeatedly moved populations across contested borders.' },
        { title: 'Famine migration', period: 'Multiple periods', note: 'Food-system collapse reshaped cities, labour markets and diasporas.' },
        { title: 'Industrial and transoceanic migration', period: '19th–20th centuries', note: 'Mass movement connected labour demand, empire, transport technology and exclusionary politics.' }
      ],
      baseline: 'Migration changes both migrants and receiving institutions; prolonged uncertainty often matters more than the initial movement.'
    },
    {
      id: 'epidemic', name: 'Epidemic shock and institutional response', category: 'Public health crisis',
      keywords: ['plague','epidemic','pandemic','disease','infection','infected','fever','quarantine','sick','hospital','doctor','contagion','vaccine','dead','burial'],
      sequence: ['Uncertain threat spreads','Authorities impose controls','Trust and compliance vary','Inequality shapes exposure','Institutions adapt or lose legitimacy'],
      precedents: [
        { title: 'Black Death responses', period: '14th century', note: 'Mortality, labour scarcity, religious interpretation and persecution transformed European societies.' },
        { title: 'Cholera and urban sanitation', period: '19th century', note: 'Repeated epidemics drove public-health infrastructure and disputes over state intervention.' },
        { title: 'Influenza and coronavirus pandemics', period: '20th–21st centuries', note: 'Public measures exposed tensions among expertise, liberty, trust and unequal risk.' }
      ],
      baseline: 'Health crises become political crises when burdens, information and enforcement are distributed unequally.'
    }
  ];

  const EMOTION_WORDS = {
    fear: ['fear','afraid','terror','dread','panic','anxious','horror'],
    anger: ['anger','angry','rage','furious','hate','hatred','resent'],
    grief: ['grief','sorrow','sad','sadness','weep','cry','mourning','loss'],
    hope: ['hope','hopeful','promise','future','believe','faith','dawn'],
    joy: ['joy','happy','happiness','laugh','smile','delight','glad'],
    shame: ['shame','ashamed','humiliation','disgrace','guilt']
  };

  function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function stripHtml(input) {
    return String(input || '')
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>|<\/div>|<\/h[1-6]>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'");
  }

  function normaliseText(input) {
    return stripHtml(input)
      .replace(/\r\n?/g, '\n')
      .replace(/[\t\f\v]+/g, ' ')
      .replace(/[ ]{2,}/g, ' ')
      .replace(/\n[ ]+/g, '\n')
      .replace(/[ ]+\n/g, '\n')
      .replace(/\n{4,}/g, '\n\n\n')
      .trim();
  }

  function tokenize(text) {
    return (String(text).toLowerCase().match(/[a-zÀ-ÖØ-öø-ÿ][a-zÀ-ÖØ-öø-ÿ'’-]*/g) || [])
      .map(w => w.replace(/^['’]|['’]$/g, ''))
      .filter(Boolean);
  }

  function splitSentences(text) {
    const cleaned = String(text).replace(/\s+/g, ' ').trim();
    if (!cleaned) return [];
    const matches = cleaned.match(/[^.!?]+(?:[.!?]+["'’”)]*|$)/g) || [];
    return matches.map(s => s.trim()).filter(s => s.length > 18);
  }

  function splitParagraphs(text) {
    return String(text).split(/\n\s*\n+/).map(p => p.replace(/\s+/g, ' ').trim()).filter(Boolean);
  }

  function chapterHeading(line) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.length > 90) return false;
    return /^(chapter|part|book|volume|section|prologue|epilogue|interlude|act)\b[\s.:—-]*(?:[ivxlcdm]+|\d+|[a-z]+)?(?:\b.*)?$/i.test(trimmed)
      || /^(?:[IVXLCDM]{1,8}|\d{1,3})[.:]?$/i.test(trimmed);
  }

  function splitChapters(text) {
    const lines = text.split('\n');
    const headingIndexes = [];
    lines.forEach((line, index) => { if (chapterHeading(line)) headingIndexes.push(index); });

    const chapters = [];
    if (headingIndexes.length >= 2) {
      if (headingIndexes[0] > 0 && lines.slice(0, headingIndexes[0]).join(' ').trim().length > 80) {
        headingIndexes.unshift(0);
      }
      headingIndexes.forEach((start, i) => {
        const end = i + 1 < headingIndexes.length ? headingIndexes[i + 1] : lines.length;
        const chunk = lines.slice(start, end);
        const rawTitle = chapterHeading(chunk[0] || '') ? chunk.shift().trim() : `Opening`;
        const body = chunk.join('\n').trim();
        if (body) chapters.push({ id: `chapter-${chapters.length + 1}`, index: chapters.length, title: rawTitle || `Section ${chapters.length + 1}`, text: body });
      });
    }

    if (chapters.length < 2) {
      const words = text.split(/\s+/);
      const target = Math.max(1400, Math.min(2600, Math.ceil(words.length / Math.max(1, Math.ceil(words.length / 2000)))));
      for (let i = 0; i < words.length; i += target) {
        const body = words.slice(i, i + target).join(' ').trim();
        if (body) chapters.push({ id: `chapter-${chapters.length + 1}`, index: chapters.length, title: `Section ${chapters.length + 1}`, text: body });
      }
    }
    return chapters;
  }

  function buildPassages(chapters) {
    const passages = [];
    chapters.forEach(chapter => {
      let pars = splitParagraphs(chapter.text);
      if (pars.length <= 1) {
        const sentences = splitSentences(chapter.text);
        pars = [];
        for (let i = 0; i < sentences.length; i += 4) pars.push(sentences.slice(i, i + 4).join(' '));
      }
      pars.forEach((text, pIndex) => {
        const sentences = splitSentences(text);
        if (!sentences.length) return;
        passages.push({
          id: `p-${passages.length + 1}`,
          chapterId: chapter.id,
          chapterIndex: chapter.index,
          chapterTitle: chapter.title,
          paragraphIndex: pIndex,
          text,
          sentences,
          words: tokenize(text)
        });
      });
    });
    return passages;
  }

  function wordFrequency(tokens) {
    const freq = new Map();
    tokens.forEach(word => {
      if (word.length < 3 || STOPWORDS.has(word)) return;
      freq.set(word, (freq.get(word) || 0) + 1);
    });
    return freq;
  }

  function scoreSentence(sentence, freq, positionRatio) {
    const words = tokenize(sentence).filter(w => !STOPWORDS.has(w));
    if (words.length < 4 || words.length > 55) return -Infinity;
    const lexical = words.reduce((sum, word) => sum + Math.log1p(freq.get(word) || 0), 0) / Math.sqrt(words.length);
    const narrative = positionRatio < .08 || positionRatio > .9 ? .35 : 0;
    const action = /\b(decided|refused|left|returned|revealed|discovered|killed|died|escaped|arrived|changed|began|ended|destroyed|saved|betrayed|confessed|married|fought|won|lost)\b/i.test(sentence) ? .5 : 0;
    return lexical + narrative + action;
  }

  function rankedSentences(text, limit = 6) {
    const sentences = splitSentences(text);
    const freq = wordFrequency(tokenize(text));
    return sentences.map((sentence, index) => ({
      sentence,
      index,
      score: scoreSentence(sentence, freq, sentences.length > 1 ? index / (sentences.length - 1) : 0)
    })).filter(x => Number.isFinite(x.score)).sort((a, b) => b.score - a.score).slice(0, limit);
  }

  function summariseText(text, limit = 3) {
    return rankedSentences(text, Math.max(limit * 3, limit))
      .slice(0, limit)
      .sort((a, b) => a.index - b.index)
      .map(x => x.sentence)
      .join(' ');
  }

  function evidenceForSentence(sentence, passages, limit = 3) {
    const query = new Set(tokenize(sentence).filter(w => !STOPWORDS.has(w)));
    return passages.map(p => {
      const overlap = p.words.reduce((sum, word) => sum + (query.has(word) ? 1 : 0), 0);
      return { id: p.id, score: overlap / Math.max(1, Math.sqrt(p.words.length)) };
    }).filter(x => x.score > 0).sort((a, b) => b.score - a.score).slice(0, limit).map(x => x.id);
  }

  function extractNames(text) {
    const candidates = new Map();
    const sentences = splitSentences(text);
    sentences.forEach((sentence, sIndex) => {
      const matches = sentence.match(/\b(?:Mr|Mrs|Ms|Miss|Dr|Professor|Captain|Colonel|General|Lord|Lady|Sir|Dame|Father|Mother)?\.?\s*[A-Z][a-zÀ-ÖØ-öø-ÿ'’-]{2,}(?:\s+[A-Z][a-zÀ-ÖØ-öø-ÿ'’-]{2,}){0,2}\b/g) || [];
      matches.forEach(raw => {
        const name = raw.replace(/\s+/g, ' ').trim();
        const base = name.replace(/^(Mr|Mrs|Ms|Miss|Dr|Professor|Captain|Colonel|General|Lord|Lady|Sir|Dame|Father|Mother)\.?\s+/i, '');
        const first = base.split(' ')[0];
        if (SENTENCE_START_EXCLUSIONS.has(first) || base.length < 3 || /^(Chapter|Part|Book|Section|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|January|February|March|April|May|June|July|August|September|October|November|December)$/.test(base)) return;
        const key = base.toLowerCase();
        const current = candidates.get(key) || { name: base, count: 0, sentenceIndexes: [], forms: new Set() };
        current.count += 1;
        current.sentenceIndexes.push(sIndex);
        current.forms.add(name);
        if (base.split(' ').length > current.name.split(' ').length) current.name = base;
        candidates.set(key, current);
      });
    });

    const entries = Array.from(candidates.values()).filter(x => x.count >= 2);
    const merged = [];
    entries.sort((a, b) => b.name.length - a.name.length).forEach(entry => {
      const surname = entry.name.split(' ').slice(-1)[0].toLowerCase();
      const existing = merged.find(m => m.name.toLowerCase() === entry.name.toLowerCase() || (entry.name.includes(' ') && m.name.toLowerCase().endsWith(surname)));
      if (existing) {
        existing.count += entry.count;
        existing.sentenceIndexes.push(...entry.sentenceIndexes);
      } else merged.push(entry);
    });
    return merged.sort((a, b) => b.count - a.count).slice(0, 12);
  }

  function extractCharacters(text, passages, chapters) {
    const sentences = splitSentences(text);
    const names = extractNames(text);
    return names.map((record, index) => {
      const rx = new RegExp(`\\b${escapeRegExp(record.name.split(' ').slice(-1)[0])}\\b`, 'i');
      const related = passages.filter(p => rx.test(p.text));
      const first = related[0];
      const last = related[related.length - 1];
      const verbs = new Map();
      related.flatMap(p => p.sentences).forEach(s => {
        const words = tokenize(s);
        const nameIndex = words.findIndex(w => w === record.name.split(' ').slice(-1)[0].toLowerCase());
        words.slice(Math.max(0, nameIndex), nameIndex + 8).forEach(w => {
          if (/ed$|ing$/.test(w) || ['wants','wanted','seeks','sought','fears','feared','loves','loved','hates','hated','refuses','refused','decides','decided','leaves','left','returns','returned'].includes(w)) verbs.set(w, (verbs.get(w) || 0) + 1);
        });
      });
      const dominantVerbs = Array.from(verbs.entries()).sort((a,b) => b[1]-a[1]).slice(0,3).map(x=>x[0]);
      const firstSentence = first ? first.sentences.find(s => rx.test(s)) || first.sentences[0] : '';
      const lastSentence = last ? [...last.sentences].reverse().find(s => rx.test(s)) || last.sentences[last.sentences.length - 1] : '';
      const span = related.length ? ((last.chapterIndex - first.chapterIndex + 1) / Math.max(1, chapters.length)) : 0;
      return {
        id: `character-${index + 1}`,
        name: record.name,
        mentions: related.length,
        coverage: span,
        firstEvidence: first ? first.id : null,
        lastEvidence: last ? last.id : null,
        evidence: related.slice(0, 2).concat(related.slice(-2)).map(p => p.id).filter((id, i, arr) => arr.indexOf(id) === i),
        firstSentence,
        lastSentence,
        descriptors: dominantVerbs,
        role: index === 0 ? 'Most textually prominent character' : span > .65 ? 'Major recurring character' : 'Supporting recurring character',
        arc: firstSentence && lastSentence && firstSentence !== lastSentence
          ? `The evidence moves from “${truncate(firstSentence, 125)}” toward “${truncate(lastSentence, 125)}”. This is an observed textual shift, not a definitive psychological interpretation.`
          : 'The available passages do not establish a clear beginning-to-ending transformation.'
      };
    });
  }

  function countKeywords(tokens, keywords) {
    const set = new Set(keywords);
    return tokens.reduce((sum, w) => sum + (set.has(w) ? 1 : 0), 0);
  }

  function extractThemes(text, passages, chapters) {
    const tokens = tokenize(text);
    return THEMES.map(theme => {
      const count = countKeywords(tokens, theme.keywords);
      const evidenceScores = passages.map(p => ({ id: p.id, chapterIndex: p.chapterIndex, score: countKeywords(p.words, theme.keywords) }))
        .filter(x => x.score > 0).sort((a,b) => b.score-a.score);
      const uniqueChapters = new Set(evidenceScores.map(x => x.chapterIndex)).size;
      const spread = uniqueChapters / Math.max(1, chapters.length);
      const score = Math.min(100, Math.round((count / Math.max(8, tokens.length / 850)) * 30 + spread * 45));
      return {
        ...theme,
        count,
        spread,
        score,
        evidence: evidenceScores.slice(0, 4).map(x => x.id),
        confidence: score >= 70 ? 'Strongly supported candidate' : score >= 45 ? 'Plausible candidate' : 'Weak signal'
      };
    }).filter(t => t.count >= 2).sort((a,b) => b.score-a.score).slice(0,6);
  }

  function stem(word) {
    return word.replace(/(?:'s|’s)$/,'').replace(/(?:ing|edly|edly|ed|es|s)$/i, match => word.length - match.length >= 4 ? '' : match);
  }

  function extractMotifs(text, passages, characters, chapters) {
    const characterWords = new Set(characters.flatMap(c => tokenize(c.name)));
    const freq = new Map();
    const passageMap = new Map();
    passages.forEach(p => {
      const unique = new Set();
      p.words.forEach(raw => {
        const w = stem(raw);
        if (w.length < 4 || STOPWORDS.has(w) || characterWords.has(w)) return;
        freq.set(w, (freq.get(w) || 0) + 1);
        unique.add(w);
      });
      unique.forEach(w => {
        const arr = passageMap.get(w) || [];
        arr.push(p);
        passageMap.set(w, arr);
      });
    });
    return Array.from(freq.entries())
      .map(([word, count]) => {
        const related = passageMap.get(word) || [];
        const spread = new Set(related.map(p => p.chapterIndex)).size / Math.max(1, chapters.length);
        return { word, count, spread, score: count * (.5 + spread), evidence: related.slice(0,3).map(p => p.id) };
      })
      .filter(x => x.count >= 4 && x.spread >= Math.min(.3, 2 / Math.max(1, chapters.length)))
      .sort((a,b) => b.score-a.score)
      .slice(0,10);
  }

  function extractEmotionTrajectory(chapters) {
    return chapters.map(chapter => {
      const tokens = tokenize(chapter.text);
      const emotions = {};
      Object.entries(EMOTION_WORDS).forEach(([name, words]) => { emotions[name] = countKeywords(tokens, words); });
      const dominant = Object.entries(emotions).sort((a,b) => b[1]-a[1])[0];
      return { chapterId: chapter.id, chapterTitle: chapter.title, emotions, dominant: dominant && dominant[1] > 0 ? dominant[0] : 'neutral' };
    });
  }

  function extractPlotSpine(text, passages) {
    const sentences = splitSentences(text);
    const freq = wordFrequency(tokenize(text));
    const stages = [
      ['Initial situation', 0, .09],
      ['Disrupting event', .08, .2],
      ['Escalating conflict', .18, .38],
      ['Major turning point', .36, .55],
      ['Crisis', .53, .7],
      ['Climax', .68, .86],
      ['Resolution', .84, .96],
      ['Final consequence', .94, 1]
    ];
    return stages.map(([label, start, end], index) => {
      const from = Math.floor(sentences.length * start);
      const to = Math.max(from + 1, Math.ceil(sentences.length * end));
      const candidates = sentences.slice(from, to).map((sentence, localIndex) => ({
        sentence,
        globalIndex: from + localIndex,
        score: scoreSentence(sentence, freq, sentences.length > 1 ? (from + localIndex)/(sentences.length-1) : 0)
      })).filter(x => Number.isFinite(x.score)).sort((a,b) => b.score-a.score);
      const best = candidates[0] || { sentence: sentences[Math.min(from, sentences.length-1)] || 'No reliable event sentence detected.' };
      return { index: index + 1, label, text: best.sentence, evidence: evidenceForSentence(best.sentence, passages, 2), confidence: candidates.length ? 'Extractive candidate' : 'Insufficient evidence' };
    });
  }

  function historicalMatches(text, passages, chapters) {
    const tokens = tokenize(text);
    const techTerms = ['algorithm','artificial','automated','automation','machine','network','platform','robot','digital','computer','system'];
    const speedTerms = ['suddenly','overnight','immediately','instant','within days','within hours','rapid','swift'];
    const reversalTerms = ['instead','opposite','reversed','failed','unexpected','paradox'];
    return HISTORY_PATTERNS.map(pattern => {
      const rawCount = countKeywords(tokens, pattern.keywords);
      const evidence = passages.map(p => ({ id: p.id, score: countKeywords(p.words, pattern.keywords), chapterIndex: p.chapterIndex }))
        .filter(x => x.score > 0).sort((a,b) => b.score-a.score);
      const spread = new Set(evidence.map(x => x.chapterIndex)).size / Math.max(1, chapters.length);
      const score = Math.min(99, Math.round((rawCount / Math.max(6, tokens.length/1100))*32 + spread*42));
      const evidenceText = evidence.slice(0,5).map(e => passages.find(p=>p.id===e.id)?.text || '').join(' ').toLowerCase();
      const tech = techTerms.some(term => evidenceText.includes(term));
      const speed = speedTerms.some(term => evidenceText.includes(term));
      const reversal = reversalTerms.some(term => evidenceText.includes(term));
      let forkType = 'Convergent fork';
      let forkReason = 'The fictional sequence appears to vary the route while retaining a historically familiar institutional outcome.';
      if (tech && pattern.id !== 'technology-displacement') {
        forkType = 'Compound or novel fork';
        forkReason = 'A familiar historical pattern is combined with a technology-dependent transfer of capability not represented closely in the compact corpus.';
      } else if (speed) {
        forkType = 'Accelerated fork';
        forkReason = 'The sequence appears to compress a process that historical parallels usually distribute across longer institutional conflict.';
      } else if (reversal) {
        forkType = 'Reversed fork';
        forkReason = 'The text signals an outcome that may run against the baseline direction of the closest pattern.';
      }
      return {
        ...pattern,
        rawCount,
        score,
        spread,
        evidence: evidence.slice(0,4).map(x=>x.id),
        forkType,
        forkReason,
        novelty: score >= 72 ? 'Strong historical-pattern candidate' : score >= 45 ? 'Partial historical analogue' : 'No close analogue in compact corpus',
        dimensions: {
          structure: score >= 65 ? 'Precedented' : 'Partial',
          technology: tech ? 'Potentially novel combination' : 'Not central',
          speed: speed ? 'Unusually compressed' : 'Within broad precedent',
          outcome: reversal ? 'Possible reversal' : 'Broadly comparable',
          corpus: 'Compact demonstration corpus'
        }
      };
    }).filter(x => x.rawCount >= 2).sort((a,b)=>b.score-a.score).slice(0,5);
  }

  function buildEssence(text, passages, themes, plotSpine, characters) {
    const ranked = rankedSentences(text, 12);
    const top = ranked[0]?.sentence || 'No reliable essence sentence could be extracted.';
    const paragraph = ranked.slice(0,4).sort((a,b)=>a.index-b.index).map(x=>x.sentence).join(' ');
    const primaryTheme = themes[0];
    const centralCharacter = characters[0];
    const lastStage = plotSpine[plotSpine.length - 1];
    return {
      oneSentence: top,
      oneParagraph: paragraph || top,
      reallyAbout: primaryTheme
        ? `${primaryTheme.name}: ${primaryTheme.proposition} The signal is distributed across ${Math.round(primaryTheme.spread*100)}% of detected sections.`
        : 'No theme reached the minimum repeat-and-spread threshold.',
      centralConflict: centralCharacter && primaryTheme
        ? `${centralCharacter.name}, the most textually prominent recurring figure, is repeatedly situated inside the novel’s strongest detected concern: ${primaryTheme.name.toLowerCase()}.`
        : 'The deterministic evidence is insufficient to state a central human conflict confidently.',
      endingMeaning: lastStage ? `The closing evidence centres on: “${truncate(lastStage.text, 220)}” Its meaning should be tested against the earlier theme and character evidence rather than treated as definitive.` : 'No ending evidence available.',
      unresolved: inferUnresolved(text),
      evidence: evidenceForSentence(top, passages, 3)
    };
  }

  function inferUnresolved(text) {
    const ending = text.slice(Math.floor(text.length * .88));
    const questions = (ending.match(/[^?]{10,}\?/g) || []).slice(-3).map(q => q.trim());
    if (questions.length) return questions.join(' ');
    const uncertainty = splitSentences(ending).filter(s => /\b(perhaps|maybe|seemed|might|could|unknown|never knew|wondered|uncertain)\b/i.test(s));
    return uncertainty.length ? uncertainty.slice(-2).join(' ') : 'No explicit unresolved question was detected; ambiguity may still be thematic or structural.';
  }

  function truncate(text, max = 180) {
    const value = String(text || '').trim();
    return value.length <= max ? value : value.slice(0, max - 1).replace(/\s+\S*$/, '') + '…';
  }

  function searchPassages(passages, query, limit = 8) {
    const qTokens = tokenize(query).filter(w => !STOPWORDS.has(w));
    if (!qTokens.length) return [];
    return passages.map(p => {
      const set = new Set(p.words);
      let score = qTokens.reduce((sum, token) => sum + (set.has(token) ? 3 : 0), 0);
      const lower = p.text.toLowerCase();
      if (lower.includes(query.toLowerCase())) score += 8;
      qTokens.forEach(token => {
        if (lower.includes(token)) score += 1;
      });
      return { passage: p, score };
    }).filter(x => x.score > 0).sort((a,b)=>b.score-a.score).slice(0,limit);
  }

  function questionAnswer(report, query) {
    const matches = searchPassages(report.passages, query, 5);
    if (!matches.length) return { answer: 'No passage matched the important terms in the question. Try character names, places, objects or a more concrete event.', matches: [] };
    const summary = summariseText(matches.map(x => x.passage.text).join(' '), 3);
    return {
      answer: `The strongest retrievable evidence suggests: ${summary}\n\nThis is an extractive answer. It identifies relevant passages but does not establish a definitive interpretation.`,
      matches
    };
  }

  function buildDossier(report, section) {
    const base = {
      title: report.title,
      scope: { words: report.stats.wordCount, sections: report.chapters.length },
      rules: [
        'Use only supplied evidence and structured findings.',
        'Distinguish explicit text, strong inference and speculation.',
        'Do not invent quotations or historical facts.',
        'State that historical coverage is limited to the supplied compact corpus.'
      ]
    };
    if (section === 'history') {
      base.historicalMatches = report.history.map(h => ({ name:h.name, score:h.score, baseline:h.baseline, forkType:h.forkType, forkReason:h.forkReason, passages:h.evidence.map(id => passageExcerpt(report, id)) }));
    } else {
      base.essence = report.essence;
      base.plotSpine = report.plotSpine;
      base.characters = report.characters.slice(0,6).map(c => ({ name:c.name, role:c.role, arc:c.arc, passages:c.evidence.slice(0,2).map(id => passageExcerpt(report,id)) }));
      base.themes = report.themes.slice(0,5);
    }
    return base;
  }

  function passageExcerpt(report, id) {
    const p = report.passages.find(x => x.id === id);
    return p ? { id:p.id, section:p.chapterTitle, text:truncate(p.text, 420) } : null;
  }

  function analyseNovel(input, options = {}) {
    const text = normaliseText(input);
    if (tokenize(text).length < 120) throw new Error('The text is too short for a meaningful novel analysis. Add at least 120 words.');
    const chapters = splitChapters(text);
    const passages = buildPassages(chapters);
    const characters = extractCharacters(text, passages, chapters);
    const themes = extractThemes(text, passages, chapters);
    const motifs = extractMotifs(text, passages, characters, chapters);
    const plotSpine = extractPlotSpine(text, passages);
    const history = historicalMatches(text, passages, chapters);
    const essence = buildEssence(text, passages, themes, plotSpine, characters);
    const chapterSummaries = chapters.map(c => ({ id:c.id, title:c.title, summary:summariseText(c.text,2), wordCount:tokenize(c.text).length }));
    const stats = {
      wordCount: tokenize(text).length,
      sentenceCount: splitSentences(text).length,
      passageCount: passages.length,
      chapterCount: chapters.length,
      estimatedMinutes: Math.ceil(tokenize(text).length / 250)
    };
    return {
      version: '0.1.0',
      title: options.title || 'Untitled novel',
      createdAt: new Date().toISOString(),
      text,
      chapters,
      passages,
      chapterSummaries,
      stats,
      characters,
      themes,
      motifs,
      plotSpine,
      history,
      essence,
      emotionTrajectory: extractEmotionTrajectory(chapters),
      limitations: [
        'Literary interpretations are candidate explanations generated from repeated textual patterns.',
        'Historical matches use a compact demonstration corpus rather than comprehensive historical scholarship.',
        'Named-entity extraction is heuristic and may split or merge characters incorrectly.',
        'Apparently unprecedented means no close match was found in the included corpus.'
      ]
    };
  }

  return {
    analyseNovel,
    normaliseText,
    splitChapters,
    splitSentences,
    splitParagraphs,
    tokenize,
    summariseText,
    searchPassages,
    questionAnswer,
    buildDossier,
    truncate,
    constants: { THEMES, HISTORY_PATTERNS }
  };
});
