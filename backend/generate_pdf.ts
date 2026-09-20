import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

const backendSrcDir = '/Users/madushanminuwantha/Desktop/project/UWE/backend/src';
const frontendSrcDir = '/Users/madushanminuwantha/Desktop/project/UWE/src';
const outputFile = '/Users/madushanminuwantha/Desktop/project/UWE/uwe_complete_code.pdf';

function getFilesRecursively(dir: string, fileList: string[] = []): string[] {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      getFilesRecursively(filePath, fileList);
    } else {
      if (filePath.endsWith('.ts') || filePath.endsWith('.tsx') || filePath.endsWith('.js') || filePath.endsWith('.css')) {
        fileList.push(filePath);
      }
    }
  }
  return fileList;
}

const doc = new PDFDocument({ margin: 30, size: 'A4' });
doc.pipe(fs.createWriteStream(outputFile));

doc.fontSize(24).text('UWE Complete Source Code', { align: 'center' });
doc.moveDown(2);

const files = [
  ...getFilesRecursively(backendSrcDir),
  ...getFilesRecursively(frontendSrcDir)
];

let fileCount = 0;

for (const file of files) {
  fileCount++;
  const relPath = path.relative('/Users/madushanminuwantha/Desktop/project/UWE', file);
  const content = fs.readFileSync(file, 'utf8');
  
  doc.addPage();
  doc.fontSize(14).font('Helvetica-Bold').text(`File: ${relPath}`, { underline: true });
  doc.moveDown();
  
  // Use a monospace-like standard font since we don't have Courier embedded by default, Courier is standard 14
  doc.fontSize(8).font('Courier').text(content, { lineBreak: true });
}

doc.end();
console.log(`Generated PDF with ${fileCount} files at ${outputFile}`);
