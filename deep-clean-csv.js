const fs = require('fs');
const path = require('path');

const dirPath = 'c:\\Users\\barbara\\Documents\\raw-videos-ocw\\dictionary-scripts-and-json\\';
const csvFiles = fs.readdirSync(dirPath).filter(f => f.endsWith('.csv'));

const posTags = [
    'adj', 'adv', 'prep', 'conj', 'det', 'pron', 'v', 'n',
    'modal', 'article', 'exclam', 'interjection', 'predeterminer', 'auxiliary',
    'adj\\.', 'adv\\.', 'prep\\.', 'conj\\.', 'det\\.', 'pron\\.', 'v\\.', 'n\\.'
];

const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

const noisePhrases = [
    'indefinite article',
    'represents the core',
    'is a list of',
    '390 million words',
    'longman corpus network',
    'longman communication 3000',
    'oxford phrasal academic',
    'oxford university press',
    'spoken single words',
    'written phrases',
    'signposting and focusing',
    'by knowing this list',
    'Jeremy Harmer',
    'EL T author',
    'these 3000 most frequent',
    'S1 S2 S3', 'W1 W2 W3',
    'spontaneous speech',
    'university of lancaster',
    'geoffrey leech',
    'professor of english',
    'learner’s dictionaries',
    'indefinite article',
    'indefinite'
];

function superClean(lemma) {
    let clean = lemma;

    // Remove (...) and the content inside
    clean = clean.replace(/\([^)]*\)/g, '');

    // Remove ellipses (...)
    clean = clean.replace(/\.\.\./g, '');

    // Remove metadata numbers at start (e.g., "1 1. ", "5. ")
    clean = clean.replace(/^(\d+\s*)+[.,]?\s*/, '');

    // Remove level markers
    levels.forEach(lvl => {
        const re = new RegExp(`\\b${lvl}\\b`, 'gi');
        clean = clean.replace(re, '');
    });

    // Remove POS tags
    posTags.forEach(tag => {
        const re = new RegExp(`[,\\s]+${tag}(?=[,\\s]|$)`, 'gi');
        clean = clean.replace(re, '');
    });

    // Noise check
    let isNoise = false;
    noisePhrases.forEach(phrase => {
        if (clean.toLowerCase().includes(phrase.toLowerCase())) {
            isNoise = true;
        }
    });
    if (isNoise) return null;

    // Remove ALL symbols/quotes/parentheses/slashes
    // Keep internal spaces and letters/apostrophes only for phrases
    clean = clean.replace(/["'()\\=«»“”‘’]/g, '');

    // Remove non-standard unicode characters (garbage like )
    clean = clean.replace(/[^\x20-\x7E]/g, '');

    // Trim and multiple spaces
    clean = clean.replace(/\s+/g, ' ').trim();

    // Final checks
    if (clean.length <= 1 && !['a', 'i'].includes(clean.toLowerCase())) return null;
    if (/^[.,;!?-]+$/.test(clean)) return null;
    if (clean.split(' ').length > 10) return null; // Too long for a phrase

    return clean;
}

for (const file of csvFiles) {
    const filePath = path.join(dirPath, file);
    const content = fs.readFileSync(filePath, 'utf8').split('\n');
    const header = content[0];
    const lines = content.slice(1).filter(l => l.trim());

    const cleanedLines = [];
    const seenLemmas = new Set();

    for (const line of lines) {
        let rawLemma = '';
        if (line.startsWith('"')) {
            const closingQuoteIndex = line.indexOf('"', 1);
            rawLemma = line.substring(1, closingQuoteIndex);
        } else {
            rawLemma = line.split(',')[0];
        }

        let lemma = superClean(rawLemma);

        if (lemma && !seenLemmas.has(lemma.toLowerCase())) {
            seenLemmas.add(lemma.toLowerCase());
            const finalLemma = lemma.replace(/,/g, '');
            cleanedLines.push(`${finalLemma},en,PENDING`);
        }
    }

    const output = [header, ...cleanedLines.sort()].join('\n');
    fs.writeFileSync(filePath, output, 'utf8');
    console.log(`✅ ${file} cleaned. Entries: ${cleanedLines.length}`);
}

console.log('\n✨ DONE! Deep cleaning complete.');
