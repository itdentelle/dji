const fs = require('fs');
const path = require('path');

const files = [
  'actions/employee-actions.ts',
  'actions/continuous-actions.ts',
  'actions/qc-actions.ts'
];

files.forEach(file => {
  const filePath = path.join(__dirname, '..', file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    // regex to match mode: "no-cors", (with optional spaces/newlines around it)
    content = content.replace(/[ \t]*mode:\s*"no-cors",[ \t]*\n?/g, '');
    fs.writeFileSync(filePath, content);
    console.log(`Replaced in ${file}`);
  }
});
