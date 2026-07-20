(() => {
  'use strict';

  const MAX_EPUB_BYTES = 120 * 1024 * 1024;
  const SUPPORTED_DOCUMENT_TYPES = new Set([
    'application/xhtml+xml',
    'text/html',
    'application/xml',
    'text/xml'
  ]);

  function normalisePath(path) {
    const parts = String(path || '').replace(/\\/g, '/').split('/');
    const output = [];
    for (const part of parts) {
      if (!part || part === '.') continue;
      if (part === '..') output.pop();
      else output.push(part);
    }
    return output.join('/');
  }

  function dirname(path) {
    const value = normalisePath(path);
    const index = value.lastIndexOf('/');
    return index >= 0 ? value.slice(0, index) : '';
  }

  function resolvePath(baseFile, href) {
    const cleanHref = String(href || '').split('#')[0].split('?')[0];
    return normalisePath(`${dirname(baseFile)}/${cleanHref}`);
  }

  function safeDecode(value) {
    try { return decodeURIComponent(value); } catch (_) { return value; }
  }

  function findEntry(zip, requestedPath) {
    const normal = normalisePath(requestedPath);
    if (zip.file(normal)) return zip.file(normal);
    const decoded = safeDecode(normal);
    if (zip.file(decoded)) return zip.file(decoded);
    const match = Object.keys(zip.files).find(name => {
      const candidate = normalisePath(name);
      return candidate === normal || safeDecode(candidate) === decoded;
    });
    return match ? zip.file(match) : null;
  }

  function parseXml(text, label) {
    const doc = new DOMParser().parseFromString(text, 'application/xml');
    const parserError = doc.getElementsByTagName('parsererror')[0];
    if (parserError) throw new Error(`${label} is not valid XML.`);
    return doc;
  }

  function elementsByLocalName(root, localName) {
    const namespaced = root.getElementsByTagNameNS?.('*', localName);
    if (namespaced?.length) return Array.from(namespaced);
    return Array.from(root.getElementsByTagName(localName));
  }

  function firstTextByLocalName(root, localName) {
    const element = elementsByLocalName(root, localName)[0];
    return element?.textContent?.replace(/\s+/g, ' ').trim() || '';
  }

  function cleanText(value) {
    return String(value || '')
      .replace(/\u00ad/g, '')
      .replace(/\u00a0/g, ' ')
      .replace(/[ \t\f\v]+/g, ' ')
      .replace(/\s*\n\s*/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  function extractDocument(html, fallbackTitle, index) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    doc.querySelectorAll('script,style,svg,canvas,noscript,template,nav[epub\\:type="toc"],nav[role="doc-toc"]').forEach(el => el.remove());

    const headingElement = Array.from(doc.querySelectorAll('h1,h2,h3,h4')).find(el => {
      const text = cleanText(el.textContent);
      return text.length >= 1 && text.length <= 180;
    });
    const documentTitle = cleanText(headingElement?.textContent)
      || cleanText(doc.querySelector('title')?.textContent)
      || cleanText(fallbackTitle)
      || `Section ${index + 1}`;

    const body = doc.body || doc.documentElement;
    let blocks = Array.from(body.querySelectorAll('h1,h2,h3,h4,h5,h6,p,blockquote,li,pre'))
      .map(el => cleanText(el.textContent))
      .filter(text => text.length > 0);

    if (!blocks.length) {
      const fallback = cleanText(body.textContent);
      if (fallback) blocks = fallback.split(/\n{2,}/).map(cleanText).filter(Boolean);
    }

    const deduplicated = [];
    for (const block of blocks) {
      if (deduplicated.at(-1) !== block) deduplicated.push(block);
    }
    if (deduplicated[0]?.toLocaleLowerCase() === documentTitle.toLocaleLowerCase()) deduplicated.shift();

    return {
      title: documentTitle,
      text: deduplicated.join('\n\n').trim()
    };
  }

  async function readTextEntry(zip, path, label) {
    const entry = findEntry(zip, path);
    if (!entry) throw new Error(`${label} was not found in the EPUB archive.`);
    return entry.async('string');
  }

  async function parse(file, options = {}) {
    if (!file) throw new Error('No EPUB file was supplied.');
    if (!globalThis.JSZip) throw new Error('The embedded EPUB archive reader did not load.');
    if (file.size > MAX_EPUB_BYTES) throw new Error('This EPUB is larger than the current 120 MB import limit.');

    const onProgress = typeof options.onProgress === 'function' ? options.onProgress : () => {};
    onProgress('Opening EPUB archive…');

    let zip;
    try {
      zip = await JSZip.loadAsync(await file.arrayBuffer());
    } catch (error) {
      throw new Error(`The selected file is not a readable EPUB archive: ${error.message}`);
    }

    const mimetypeEntry = findEntry(zip, 'mimetype');
    if (mimetypeEntry) {
      const mimetype = (await mimetypeEntry.async('string')).trim();
      if (mimetype && mimetype !== 'application/epub+zip') {
        throw new Error('The archive does not identify itself as an EPUB file.');
      }
    }

    onProgress('Reading EPUB package…');
    const containerXml = await readTextEntry(zip, 'META-INF/container.xml', 'META-INF/container.xml');
    const containerDoc = parseXml(containerXml, 'EPUB container');
    const rootfile = elementsByLocalName(containerDoc, 'rootfile')[0];
    const packagePath = rootfile?.getAttribute('full-path');
    if (!packagePath) throw new Error('The EPUB package path is missing from META-INF/container.xml.');

    const packageXml = await readTextEntry(zip, packagePath, 'The EPUB package document');
    const packageDoc = parseXml(packageXml, 'EPUB package document');
    const packageTitle = firstTextByLocalName(packageDoc, 'title');
    const packageAuthor = firstTextByLocalName(packageDoc, 'creator');
    const packageLanguage = firstTextByLocalName(packageDoc, 'language');

    const manifest = new Map();
    for (const item of elementsByLocalName(packageDoc, 'item')) {
      const id = item.getAttribute('id');
      if (!id) continue;
      manifest.set(id, {
        id,
        href: item.getAttribute('href') || '',
        mediaType: item.getAttribute('media-type') || '',
        properties: item.getAttribute('properties') || ''
      });
    }

    const spine = elementsByLocalName(packageDoc, 'itemref')
      .filter(itemref => (itemref.getAttribute('linear') || 'yes').toLowerCase() !== 'no')
      .map(itemref => manifest.get(itemref.getAttribute('idref')))
      .filter(Boolean)
      .filter(item => SUPPORTED_DOCUMENT_TYPES.has(item.mediaType) || /\.(xhtml?|html?)$/i.test(item.href))
      .filter(item => !/(^|\s)nav(\s|$)/.test(item.properties));

    if (!spine.length) throw new Error('The EPUB contains no readable spine documents. It may be malformed or protected by DRM.');

    const chapters = [];
    const warnings = [];
    for (let i = 0; i < spine.length; i += 1) {
      const item = spine[i];
      onProgress(`Reading EPUB section ${i + 1} of ${spine.length}…`);
      const documentPath = resolvePath(packagePath, item.href);
      const entry = findEntry(zip, documentPath);
      if (!entry) {
        warnings.push(`Skipped missing spine document: ${documentPath}`);
        continue;
      }
      try {
        const parsed = extractDocument(await entry.async('string'), safeDecode(item.href).split('/').pop()?.replace(/\.[^.]+$/, ''), chapters.length);
        if (parsed.text.length >= 20) chapters.push({ ...parsed, sourcePath: documentPath });
      } catch (error) {
        warnings.push(`Skipped unreadable spine document ${documentPath}: ${error.message}`);
      }
    }

    if (!chapters.length) {
      throw new Error('No readable novel text could be extracted from the EPUB. The file may contain DRM-protected or image-only content.');
    }

    const text = chapters.map((chapter, index) => {
      const heading = `CHAPTER ${index + 1}: ${chapter.title}`;
      return `${heading}\n\n${chapter.text}`;
    }).join('\n\n');

    onProgress('EPUB text ready');
    return {
      title: packageTitle || file.name.replace(/\.epub$/i, ''),
      author: packageAuthor,
      language: packageLanguage,
      text,
      chapters,
      warnings
    };
  }

  globalThis.NovelLensEpub = {
    parse,
    extractDocument,
    normalisePath,
    resolvePath
  };
})();
