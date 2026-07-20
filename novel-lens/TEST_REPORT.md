# Verification report

Verified on 20 July 2026.

## EPUB import correction

The earlier build intentionally rejected EPUB files. The current build now:

- exposes `.epub` and `application/epub+zip` in the file picker
- accepts EPUB files through file selection and drag-and-drop
- opens the EPUB ZIP archive locally with the embedded JSZip library
- reads `META-INF/container.xml`
- resolves the EPUB package document
- follows the manifest and linear spine order
- extracts readable XHTML/HTML sections
- imports package title, author and language metadata when available
- converts the ordered sections into text suitable for the existing analysis engine
- reports malformed, unreadable, oversized, DRM-protected or image-only EPUB limitations instead of silently failing

No EPUB content is uploaded during deterministic import.

## Automated core checks

- JavaScript syntax checked for `analysis-core.js`, `app.js` and `epub-parser.js`.
- The file picker was checked for EPUB support.
- The application was checked for the embedded ZIP reader and EPUB parser scripts.
- The file-import workflow was checked to invoke `NovelLensEpub.parse`.
- Demonstration text analysed as a complete text.
- Seven sections detected.
- Eight plot-spine stages generated.
- Recurring characters Mara, Elias, Nessa and Venn detected.
- The institution “Company” excluded from character results.
- Multiple theme candidates generated.
- Private-sovereignty historical matching generated with evidence.
- Every displayed historical match retains source-passage references.
- Evidence-first question retrieval returns passages.

Core command:

```text
node tests/core.test.js
```

## Valid EPUB fixture test

A standards-structured EPUB 3 fixture was generated with:

- a stored `mimetype` entry
- `META-INF/container.xml`
- OPF metadata, manifest and spine
- navigation document
- two compressed XHTML chapters in nested folders

Verified in Chromium:

- title extracted: `The Test River`
- author extracted: `Test Author`
- EPUB sections extracted: 2
- analysis sections detected: 2
- imported words analysed: 239
- parser warnings: 0

## Full file-picker workflow

The actual application interface was rendered in Chromium and the EPUB fixture was supplied through the hidden file input.

Verified at 1440 × 1000:

- status changed to `EPUB loaded · 2 sections · Test Author`
- title field populated from EPUB metadata
- both chapters appeared in the imported text in spine order
- Analyse Novel completed
- status changed to `Analysis ready`
- word count displayed as 239
- section count displayed as 2
- the interface changed to Essence
- six Essence cards rendered
- no browser console errors or page errors occurred

Verified at 390 × 844:

- EPUB import and analysis completed
- six Essence cards rendered
- no horizontal overflow occurred
- no browser console errors or page errors occurred

## Current limitations

- DRM-protected EPUBs cannot be decrypted.
- Image-only and some fixed-layout EPUBs may not contain enough extractable text.
- EPUB files larger than 120 MB are rejected.
- PDF and DOCX parsing are not included.
- Connectivity to a specific local-model server was not tested because no endpoint was supplied.
- Comprehensive claims of historical novelty remain outside the compact demonstration corpus.
