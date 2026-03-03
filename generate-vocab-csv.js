const fs = require('fs');
const path = require('path');

/**
 * Generates a CSV file from a word list file
 * @param {string} inputFilePath - Path to the input file containing words (one per line)
 * @param {string} outputFileName - Name of the output CSV file (optional, defaults to 'vocab.csv')
 */
function generateVocabCSV(inputFilePath, outputFileName = 'vocab.csv') {
    try {
        // Read the input file
        const content = fs.readFileSync(inputFilePath, 'utf8');

        // Split by newlines and filter out empty lines
        const words = content
            .split('\n')
            .map(word => word.trim())
            .filter(word => word.length > 0);

        // Create CSV rows
        const csvRows = words.map(word => {
            // Escape quotes in words if necessary
            const escapedWord = word.includes('"') ? `"${word.replace(/"/g, '""')}"` : word;
            return `${escapedWord},en,PENDING`;
        });

        // Add header
        const csvContent = ['lemma,language_code,status', ...csvRows].join('\n');

        // Determine output path
        const outputPath = path.join(path.dirname(inputFilePath), outputFileName);

        // Write the CSV file
        fs.writeFileSync(outputPath, csvContent, 'utf8');

        console.log(`✓ CSV file created successfully!`);
        console.log(`  Input file: ${inputFilePath}`);
        console.log(`  Output file: ${outputPath}`);
        console.log(`  Total words: ${words.length}`);
    } catch (error) {
        console.error('Error generating CSV:', error.message);
        process.exit(1);
    }
}

// Main execution
const inputFile = process.argv[2];
const outputFile = process.argv[3];

if (!inputFile) {
    console.error('Usage: node generate-vocab-csv.js <input-file> [output-filename]');
    console.error('Example: node generate-vocab-csv.js spokenwords.txt');
    process.exit(1);
}

generateVocabCSV(inputFile, outputFile);
