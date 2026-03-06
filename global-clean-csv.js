const fs = require('fs');
const path = require('path');

const dirPath = 'c:\\Users\\barbara\\Documents\\raw-videos-ocw\\dictionary-scripts-and-json\\';
const csvFiles = fs.readdirSync(dirPath).filter(f => f.endsWith('.csv'));

// Extended list of noise to remove
const posTags = [
    'adj', 'adv', 'prep', 'conj', 'det', 'pron', 'v', 'n',
    'modal', 'article', 'exclam', 'interjection', 'predeterminer', 'auxiliary',
    'adj\\.', 'adv\\.', 'prep\\.', 'conj\\.', 'det\\.', 'pron\\.', 'v\\.', 'n\\.'
];

const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

function superClean(lemma) {
    let clean = lemma;

    // 1. Remove anything inside or including parentheses
    // The user wants parentheses removed, but usually that means both content and parens
    // since "(sth)" or "(sb)" is noise.
    clean = clean.replace(/\([^)]*\)/g, '');

    // 2. Remove level markers (A1, B2, etc.) - especially at the end or mid-line followed by comma
    levels.forEach(lvl => {
        const re = new RegExp(`\\b${lvl}\\b`, 'gi');
        clean = clean.replace(re, '');
    });

    // 3. Remove POS tags with optional dots and commas
    posTags.forEach(tag => {
        // Tag could be "v." or "adj, n"
        const re = new RegExp(`[,\\s]+${tag}(?=[,\\s]|$)`, 'gi');
        clean = clean.replace(re, '');
    });

    // 4. Remove leading/trailing punctuation noise leftovers
    // like commas at the end, or double spaces
    clean = clean.replace(/[,;.:]+$/, '');
    clean = clean.replace(/^[,;.:]+/, '');

    // 5. User specifically asked to remove all quotes and parentheses if any remain
    clean = clean.replace(/["'()]/g, '');

    // 6. Clean up white spaces
    clean = clean.replace(/\s+/g, ' ').trim();

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
        // Find which is the lemma part (everything before the first comma NOT inside quotes)
        // Since we are cleaning, we can be more aggressive.
        // Usually lemma is the first field.
        let rawLemma = '';
        if (line.startsWith('"')) {
            const closingQuoteIndex = line.indexOf('"', 1);
            rawLemma = line.substring(1, closingQuoteIndex);
        } else {
            rawLemma = line.split(',')[0];
        }

        let lemma = superClean(rawLemma);

        if (lemma && lemma.length > 1 && !seenLemmas.has(lemma)) {
            seenLemmas.add(lemma);
            // Re-build standard line. NO QUOTES by user demand.
            // If the lemma still has a comma, we might want to escape it, but the user asked to remove quotes.
            // I'll replace internal commas in lemma with space to be safe for CSV.
            const finalLemma = lemma.replace(/,/g, '');
            cleanedLines.push(`${finalLemma},en,PENDING`);
        }
    }

    // Re-save. Sorted.
    const output = [header, ...cleanedLines.sort()].join('\n');
    fs.writeFileSync(filePath, output, 'utf8');
    console.log(`✅ File cleaned: ${file} (${cleanedLines.length} entries)`);
}

console.log('\n🚀 All CSV files cleaned of quotes, parentheses and metadata noise.');
