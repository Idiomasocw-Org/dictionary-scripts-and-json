const fs = require('fs');
const content = fs.readFileSync('../transformed_vocabulary_data/master-vocab.csv', 'utf8').split('\n');
const offending = content.filter(l => l.includes('"') || l.includes('(') || l.includes(')'));
console.log('Total offending lines:', offending.length);
console.log('--- First 20 offending lines ---');
console.log(offending.slice(0, 20).join('\n'));
