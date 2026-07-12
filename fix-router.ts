import * as fs from 'fs';
import * as path from 'path';

function fixRouterInFile(filePath: string) {
  let content = fs.readFileSync(filePath, 'utf8');
  if (content.includes('navigate(')) {
    content = content.replace(/navigate\(/g, 'navigate.push(');
    fs.writeFileSync(filePath, content);
    console.log(`Fixed router in ${filePath}`);
  }
}

function processDirectory(dir: string) {
  if (!fs.existsSync(dir)) return;
  for (const file of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      fixRouterInFile(fullPath);
    }
  }
}

processDirectory(path.join(process.cwd(), 'src'));
console.log('Router fixes complete.');
