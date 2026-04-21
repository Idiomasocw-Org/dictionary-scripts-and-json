const fs = require('fs');
const path = require('path');

const jsonDir = path.join(__dirname, '../json');
const targetMovies = path.join(jsonDir, 'movies');
const targetSeries = path.join(jsonDir, 'series');

// Create targets if they don't exist
if (!fs.existsSync(targetMovies)) fs.mkdirSync(targetMovies, { recursive: true });
if (!fs.existsSync(targetSeries)) fs.mkdirSync(targetSeries, { recursive: true });

function getAllFiles(dirPath, arrayOfFiles) {
    const files = fs.readdirSync(dirPath);
    arrayOfFiles = arrayOfFiles || [];

    files.forEach(function(file) {
        if (fs.statSync(dirPath + "/" + file).isDirectory()) {
            arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
        } else {
            arrayOfFiles.push(path.join(dirPath, "/", file));
        }
    });

    return arrayOfFiles;
}

const allFiles = getAllFiles(jsonDir);
const jsonFiles = allFiles.filter(f => f.endsWith('.json'));

jsonFiles.forEach(file => {
    // Avoid moving files that are already in the target directories (but at the top level)
    if (path.dirname(file) === targetMovies || path.dirname(file) === targetSeries) {
        return;
    }

    try {
        const content = JSON.parse(fs.readFileSync(file, 'utf8'));
        const type = content.type;
        const fileName = path.basename(file);
        
        let destination = null;
        if (type === 'movie') {
            destination = path.join(targetMovies, fileName);
        } else if (type === 'series') {
            destination = path.join(targetSeries, fileName);
        }

        if (destination) {
            // Check for name collision
            if (fs.existsSync(destination)) {
                console.log(`⚠️ Collision detected for ${fileName}, adding timestamp.`);
                const ext = path.extname(fileName);
                const base = path.basename(fileName, ext);
                destination = path.join(path.dirname(destination), `${base}_${Date.now()}${ext}`);
            }
            
            fs.renameSync(file, destination);
            console.log(`✅ Moved ${fileName} to ${type}s`);
        }
    } catch (err) {
        console.error(`❌ Error processing ${file}: ${err.message}`);
    }
});

console.log('\n🚀 JSON reorganization complete.');

// Clean up empty directories
function removeEmptyDirs(dirPath) {
    const files = fs.readdirSync(dirPath);
    if (files.length > 0) {
        files.forEach(file => {
            const fullPath = path.join(dirPath, file);
            if (fs.statSync(fullPath).isDirectory()) {
                removeEmptyDirs(fullPath);
            }
        });
    }

    // Re-check files after processing subdirs
    const finalFiles = fs.readdirSync(dirPath);
    if (finalFiles.length === 0 && dirPath !== jsonDir && dirPath !== targetMovies && dirPath !== targetSeries) {
        fs.rmdirSync(dirPath);
        console.log(`🗑️ Removed empty directory: ${path.relative(jsonDir, dirPath)}`);
    }
}

removeEmptyDirs(jsonDir);
