# Novel Lens

Novel Lens is a self-contained browser prototype for rapid literary understanding, evidence retrieval and historical-fork analysis.

## Run

Extract the ZIP and open `index.html` in a modern browser. No web server or internet connection is required for deterministic analysis or EPUB import.

## Current import formats

- EPUB 2 and EPUB 3 reflowable books
- TXT
- Markdown
- HTML

The EPUB importer opens the archive locally, reads `META-INF/container.xml`, follows the package manifest and spine, then extracts readable XHTML/HTML sections in book order. The imported book is not uploaded.

Current EPUB limits:

- DRM-protected EPUBs cannot be decrypted.
- Image-only or fixed-layout books may contain too little extractable text.
- EPUB files larger than 120 MB are rejected.
- PDF and DOCX import are not yet included.

## What works offline

- EPUB package and spine parsing
- chapter/section detection
- extractive whole-text and chapter summaries
- eight-stage plot spine
- heuristic recurring-character detection
- candidate themes based on repetition and spread
- recurring lexical motifs
- evidence passage browser
- evidence-first question retrieval
- compact historical pattern corpus
- historical baseline, similarity score and candidate fork classification
- standalone HTML report export
- local browser storage for the most recently imported text

## Optional local AI

The Settings dialog supports an OpenAI-compatible local endpoint, for example a local server exposed by LM Studio, llama.cpp or another compatible runtime.

Default example endpoint:

`http://localhost:1234/v1`

The app calls:

`POST /chat/completions`

Local AI is used only for:

- challenging the deterministic Essence analysis
- challenging historical parallels and forks
- synthesising answers from retrieved passages

The deterministic engine still functions when no model is configured. Browser-to-local-server access may require CORS to be enabled by the local server.

## Historical-analysis limits

The built-in corpus is a compact demonstration taxonomy, not a comprehensive historical database. It includes:

- emergency powers
- revolutionary escalation
- crisis-driven scapegoating
- private sovereignty
- technological displacement
- colonial frontiers
- mass migration
- epidemic response

The phrase “no close analogue” means no close match was found inside this included corpus. It does not establish that an event is historically unprecedented.

## Evidence and reliability

Generated literary conclusions are labelled as extractive, structured inference, thematic candidate or speculative. Historical conclusions state the corpus limitation. Passage buttons expose the underlying novel text used for each claim.

## Included dependency

JSZip 3.10.1 is embedded in `vendor/jszip.min.js` and is used only to read EPUB ZIP archives locally. Its licence is included at `vendor/JSZIP_LICENSE.md`. No CDN is used.

## UOS logos

Add the official light- and dark-theme UOS SVG files to `assets/` using these exact paths:

- `assets/uos-logo-forward.svg`
- `assets/uos-logo-forward-dark.svg`

The application does not recreate or recolour the official logo artwork and displays only the logo appropriate to the active theme.

## Technology

- HTML5
- CSS3
- vanilla JavaScript
- JSZip 3.10.1, embedded locally
- Web File API
- Web Storage API
- Fetch API for optional local-model access

No CDNs, analytics or trackers are included.
