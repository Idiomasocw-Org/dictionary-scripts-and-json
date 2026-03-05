const fs = require('fs');
const path = require('path');

// ─────────────────────────────────────────────────────────────────
// CLEANING LOGIC FOR OPAL/LONGMAN RAW LISTS
// ─────────────────────────────────────────────────────────────────
function cleanLine(line) {
    let text = line.trim();
    if (!text) return null;

    // 1. Ignore metadata/header lines
    if (text.startsWith('©')) return null;
    if (text.includes('Oxford Phrasal Academic Lexicon')) return null;
    if (text.includes('Longman Communication 3000')) return null;
    if (text.startsWith('Sublist')) return null;
    if (text.startsWith('Spoken')) return null;
    if (/^\d+\./.test(text)) return null; // Headers like "1. Signposting..."
    if (/^\d+\s*LONGMAN/.test(text)) return null;
    if (text.includes('OPAL has been created')) return null;
    if (text.includes('the Oxford Corpus')) return null;
    if (text.includes('S1 = one of')) return null;
    if (text.includes('W1 = one of')) return null;

    // 2. Remove frequency markers and POS tags at the END of the line
    // Regular markers: S1, S2, S3, W1, W2, W3
    // POS tags: n., v., adj., adv., prep., conj., det., pron., auxiliary, predeterminer, interjection, exclam
    // Note: Some tags don't have periods (e.g. "n", "v") in some files

    // Remove markers like "S1, W1" or "W3" or "S2"
    text = text.replace(/\s*[SW]\d(,?\s*[SW]\d)*\s*$/g, '');

    // Remove POS tags
    // We look for common POS tags at the end or before markers
    const posTags = [
        'auxiliary', 'predeterminer', 'interjection', 'exclam', 'determiner', 'pron',
        'adj\\.', 'adv\\.', 'prep\\.', 'conj\\.', 'n\\.', 'v\\.',
        'n', 'v', 'adj', 'adv', 'prep', 'conj', 'det'
    ];

    // Some lines have multiple POS separated by commas, like "adv, prep"
    // Regex for: optional comma/space + tag
    const tagRegex = new RegExp(`\\s*[,/]?\\s*(${posTags.join('|')})\\s*$`, 'i');

    // Run multiple times to catch "adv, prep"
    let prevText;
    do {
        prevText = text;
        text = text.replace(tagRegex, '').trim();
    } while (text !== prevText);

    // Final clean up
    text = text.replace(/\s+/g, ' ').trim();

    return text.length > 0 ? text : null;
}

// ─────────────────────────────────────────────────────────────────
// EXPANSION LOGIC (Copied from expand-vocab.js)
// ─────────────────────────────────────────────────────────────────
function expandOptionalGroups(phrase) {
    const match = phrase.match(/\(([^)]*)\)/);
    if (!match) {
        const cleaned = phrase.replace(/\s+/g, ' ').trim();
        return cleaned.length > 0 ? [cleaned] : [];
    }
    const before = phrase.substring(0, match.index);
    const content = match[1];
    const after = phrase.substring(match.index + match[0].length);
    const withoutOptional = (before + after).replace(/\s+/g, ' ').trim();
    const withOptional = (before + content + after).replace(/\s+/g, ' ').trim();
    const results = new Set();
    for (const p of expandOptionalGroups(withoutOptional)) if (p) results.add(p);
    for (const p of expandOptionalGroups(withOptional)) if (p) results.add(p);
    return Array.from(results);
}

function expandSlashAlternatives(phrase) {
    const tokens = phrase.split(/\s+/).filter(t => t.length > 0);
    let combinations = [[]];
    for (const token of tokens) {
        if (token.includes('/') && !token.includes('://')) { // Ignore URLs
            const alternatives = token.split('/').filter(a => a.length > 0);
            const newCombinations = [];
            for (const existing of combinations) {
                for (const alt of alternatives) newCombinations.push([...existing, alt]);
            }
            combinations = newCombinations;
        } else {
            for (const combo of combinations) combo.push(token);
        }
    }
    return combinations.map(c => c.join(' ').replace(/\s+/g, ' ').trim()).filter(p => p.length > 0);
}

function expandPhrase(phrase) {
    const afterParens = expandOptionalGroups(phrase);
    const results = new Set();
    for (const p of afterParens) {
        for (const final of expandSlashAlternatives(p)) if (final.length > 0) results.add(final);
    }
    return Array.from(results);
}

// ─────────────────────────────────────────────────────────────────
// PROCESSING FLOW
// ─────────────────────────────────────────────────────────────────
function processFile(inputFilePath) {
    const fileName = path.basename(inputFilePath);
    const outputFileName = fileName.replace('.txt', '-vocab.csv');
    const outputPath = path.join(path.dirname(inputFilePath), outputFileName);

    try {
        const content = fs.readFileSync(inputFilePath, 'utf8');
        const lines = content.split('\n');

        console.log(`\n📄 Processing: ${fileName}`);

        const uniquePhrases = new Set();
        let cleanedCount = 0;

        for (const line of lines) {
            const cleaned = cleanLine(line);
            if (!cleaned) continue;

            cleanedCount++;
            const expanded = expandPhrase(cleaned);
            for (const p of expanded) {
                uniquePhrases.add(p.toLowerCase());
            }
        }

        const sorted = Array.from(uniquePhrases).sort();
        const csvRows = sorted.map(phrase => `${phrase.includes(',') ? '"' + phrase + '"' : phrase},en,PENDING`);
        const csvContent = ['lemma,language_code,status', ...csvRows].join('\n');

        fs.writeFileSync(outputPath, csvContent, 'utf8');

        console.log(`   ✅ Original lines : ${lines.length}`);
        console.log(`   ✅ Cleaned words   : ${cleanedCount}`);
        console.log(`   ✅ Final entries   : ${uniquePhrases.size}`);
        console.log(`   📂 Output saved to : ${outputFileName}`);

        return uniquePhrases;
    } catch (error) {
        console.error(`   ❌ Error processing ${fileName}:`, error.message);
        return new Set();
    }
}

// ─────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────
const dirPath = 'c:\\Users\\barbara\\Documents\\raw-videos-ocw\\dictionary-scripts-and-json\\';
const files = fs.readdirSync(dirPath);
const filesToProcess = files.filter(f => f.startsWith('copia de ') && f.endsWith('.txt'));

const allNewPhrases = new Set();

for (const file of filesToProcess) {
    const filePath = path.join(dirPath, file);
    const set = processFile(filePath);
    for (const p of set) allNewPhrases.add(p);
}

// UPDATE MASTER MASTER MASTER
if (allNewPhrases.size > 0) {
    const masterPath = 'c:\\Users\\barbara\\Documents\\raw-videos-ocw\\dictionary-scripts-and-json\\master-vocab.csv';
    let masterEntries = [];
    if (fs.existsSync(masterPath)) {
        const masterContent = fs.readFileSync(masterPath, 'utf8').split('\n');
        masterEntries = masterContent.slice(1).filter(l => l.trim());
    }

    const finalSet = new Set();
    // Add old master entries
    for (const line of masterEntries) {
        const lemma = line.split(',')[0].toLowerCase().replace(/^"|"$/g, '').trim();
        if (lemma) finalSet.add(line);
    }

    // Map existing lemmas to check for duplicates quickly
    const existingLemmas = new Set(Array.from(finalSet).map(l => l.split(',')[0].toLowerCase().replace(/^"|"$/g, '').trim()));

    // Add new phrases
    for (const phrase of allNewPhrases) {
        if (!existingLemmas.has(phrase)) {
            const escaped = phrase.includes(',') ? `"${phrase}"` : phrase;
            finalSet.add(`${escaped},en,PENDING`);
        }
    }

    const sortedFinal = Array.from(finalSet).sort();
    const finalCSV = ['lemma,language_code,status', ...sortedFinal].join('\n');
    fs.writeFileSync(masterPath, finalCSV, 'utf8');

    console.log(`\n🏆 Master vocabulary updated: ${masterPath}`);
    console.log(`   Total entries now: ${finalSet.size}`);
}
