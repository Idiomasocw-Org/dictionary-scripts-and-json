const fs = require('fs');
const path = require('path');

// ─────────────────────────────────────────────────────────────────
// STEP 1: Expand optional groups marked with (parentheses)
//
// Each (...) block is OPTIONAL — it generates two versions:
//   - one WITH the content inside the parens
//   - one WITHOUT it
//
// Example:
//   "a (little) bit more about"
//     → "a little bit more about"
//     → "a bit more about"
//
// Works recursively for multiple groups in a single phrase:
//   "in the same way (as/that)"
//     → "in the same way as/that"  (then slash-expanded later)
//     → "in the same way"
// ─────────────────────────────────────────────────────────────────
function expandOptionalGroups(phrase) {
    const match = phrase.match(/\(([^)]*)\)/);

    if (!match) {
        // No more parentheses — return cleaned phrase
        const cleaned = phrase.replace(/\s+/g, ' ').trim();
        return cleaned.length > 0 ? [cleaned] : [];
    }

    const before = phrase.substring(0, match.index);
    const content = match[1]; // text inside the parens
    const after = phrase.substring(match.index + match[0].length);

    // Version 1: WITHOUT the optional group
    const withoutOptional = (before + after).replace(/\s+/g, ' ').trim();

    // Version 2: WITH the content replacing the (group)
    const withOptional = (before + content + after).replace(/\s+/g, ' ').trim();

    const results = new Set();

    // Recurse on both versions (there may be more groups)
    for (const p of expandOptionalGroups(withoutOptional)) {
        if (p) results.add(p);
    }
    for (const p of expandOptionalGroups(withOptional)) {
        if (p) results.add(p);
    }

    return Array.from(results);
}

// ─────────────────────────────────────────────────────────────────
// STEP 2: Expand slash alternatives within individual tokens
//
// Each token that contains "/" is split into its alternatives.
//
// Example:
//   "a/the reduction in"
//     → "a reduction in"
//     → "the reduction in"
//
//   "is/are likely to"
//     → "is likely to"
//     → "are likely to"
// ─────────────────────────────────────────────────────────────────
function expandSlashAlternatives(phrase) {
    const tokens = phrase.split(/\s+/).filter(t => t.length > 0);
    let combinations = [[]];

    for (const token of tokens) {
        if (token.includes('/')) {
            const alternatives = token.split('/').filter(a => a.length > 0);
            const newCombinations = [];
            for (const existing of combinations) {
                for (const alt of alternatives) {
                    newCombinations.push([...existing, alt]);
                }
            }
            combinations = newCombinations;
        } else {
            for (const combo of combinations) {
                combo.push(token);
            }
        }
    }

    return combinations
        .map(c => c.join(' ').replace(/\s+/g, ' ').trim())
        .filter(p => p.length > 0);
}

// ─────────────────────────────────────────────────────────────────
// STEP 3: Run both expansions on a single phrase
// ─────────────────────────────────────────────────────────────────
function expandPhrase(phrase) {
    const afterParens = expandOptionalGroups(phrase);
    const results = new Set();

    for (const p of afterParens) {
        const slashExpanded = expandSlashAlternatives(p);
        for (const final of slashExpanded) {
            if (final.length > 0) {
                results.add(final);
            }
        }
    }

    return Array.from(results);
}

// ─────────────────────────────────────────────────────────────────
// MAIN: Read file → expand all phrases → deduplicate → write CSV
// ─────────────────────────────────────────────────────────────────
function generateExpandedCSV(inputFilePath, outputFileName = 'vocab.csv') {
    try {
        // Read the input file
        const content = fs.readFileSync(inputFilePath, 'utf8');

        // Split into lines and discard empty ones
        const lines = content
            .split('\n')
            .map(l => l.trim())
            .filter(l => l.length > 0);

        console.log(`\n📖 Reading: ${inputFilePath}`);
        console.log(`   Lines in file: ${lines.length}`);

        // Expand every line and collect unique results (lowercase)
        const allPhrases = new Set();

        for (const line of lines) {
            const expanded = expandPhrase(line);
            for (const phrase of expanded) {
                allPhrases.add(phrase.toLowerCase());
            }
        }

        // Sort alphabetically for readability
        const sorted = Array.from(allPhrases).sort();

        // Build CSV rows
        const csvRows = sorted.map(phrase => {
            // Escape internal quotes to be CSV-safe
            const escaped = phrase.includes('"')
                ? `"${phrase.replace(/"/g, '""')}"`
                : phrase;
            return `${escaped},en,PENDING`;
        });

        // Assemble final CSV content
        const csvContent = ['lemma,language_code,status', ...csvRows].join('\n');

        // Write to output file in the same directory as the input
        const outputPath = path.join(path.dirname(inputFilePath), outputFileName);
        fs.writeFileSync(outputPath, csvContent, 'utf8');

        console.log(`\n✅ Done!`);
        console.log(`   Output file  : ${outputPath}`);
        console.log(`   Original lines  : ${lines.length}`);
        console.log(`   Unique entries after expansion: ${allPhrases.size}`);

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        process.exit(1);
    }
}

// ─────────────────────────────────────────────────────────────────
// CLI usage:
//   node expand-vocab.js <input-file> [output-filename]
//
// Examples:
//   node expand-vocab.js oxford-phrasal-academic-lexicon.txt
//   node expand-vocab.js oxford-phrasal-academic-lexicon.txt my-vocab.csv
// ─────────────────────────────────────────────────────────────────
const inputFile = process.argv[2];
const outputFile = process.argv[3];

if (!inputFile) {
    console.error('\nUsage:   node expand-vocab.js <input-file> [output-filename]');
    console.error('Example: node expand-vocab.js oxford-phrasal-academic-lexicon.txt');
    process.exit(1);
}

generateExpandedCSV(inputFile, outputFile);
