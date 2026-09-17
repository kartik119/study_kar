const fs = require('fs');
const lines = fs.readFileSync('scratch/restore_mcqs.sql', 'utf8').split('\n');
let newLines = [];
for (let i = 0; i < lines.length; i++) {
  let line = lines[i];
  if (i === 0) {
    line = line.replace(', "knowledgeAreaId"', '');
    newLines.push(line.trimEnd());
    continue;
  }
  if (line.trimEnd() === '\\.') {
    newLines.push('\\.');
    break;
  }
  if (!line.trim()) continue;
  const cols = line.split('\t');
  if (cols.length > 28) {
    cols.splice(28, 1);
  }
  newLines.push(cols.join('\t'));
}
fs.writeFileSync('scratch/restore_mcqs_clean.sql', newLines.join('\n') + '\n');
