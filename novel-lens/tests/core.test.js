'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const core = require('../analysis-core.js');

const appSource = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');

const indexSource = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
assert(indexSource.includes('.epub'), 'The file picker must allow EPUB selection');
assert(indexSource.includes('vendor/jszip.min.js'), 'The embedded ZIP reader must load before the application');
assert(indexSource.includes('epub-parser.js'), 'The EPUB parser must be included in the application');
assert(appSource.includes('NovelLensEpub.parse'), 'The file-import workflow must invoke the EPUB parser');

const demoMatch = appSource.match(/const demoText = `([\s\S]*?)`;/);
assert(demoMatch, 'Demonstration text must remain embedded in app.js');

const report = core.analyseNovel(demoMatch[1], { title: 'Test novel' });
assert(report.stats.wordCount > 700, 'Expected the complete demonstration text to be analysed');
assert(report.chapters.length >= 6, 'Expected chapter detection to identify the demonstration structure');
assert.strictEqual(report.plotSpine.length, 8, 'Plot spine must contain eight stages');
assert(report.characters.some(c => c.name === 'Mara'), 'Mara should be detected as a recurring character');
assert(report.characters.some(c => c.name === 'Elias'), 'Elias should be detected as a recurring character');
assert(!report.characters.some(c => c.name === 'Company'), 'The institution “Company” must not be classified as a character');
assert(report.themes.length >= 3, 'Expected multiple candidate themes');
assert(report.history.some(h => h.id === 'private-sovereignty'), 'Expected private-sovereignty historical matching');
assert(report.history.every(h => h.evidence.length > 0), 'Every historical match must retain novel evidence');
assert(core.questionAnswer(report, 'Why does Elias obey the Company?').matches.length > 0, 'Grounded question retrieval should return evidence');
assert(report.essence.evidence.length > 0, 'The essence should retain evidence links');

console.log('Novel Lens core tests passed.');
console.log(JSON.stringify({
  words: report.stats.wordCount,
  sections: report.chapters.length,
  passages: report.passages.length,
  characters: report.characters.map(c => c.name),
  themes: report.themes.map(t => ({ name: t.name, score: t.score })),
  history: report.history.map(h => ({ name: h.name, score: h.score, fork: h.forkType }))
}, null, 2));
