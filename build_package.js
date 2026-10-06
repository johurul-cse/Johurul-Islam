import fs from 'fs';
import path from 'path';
import { PDFDocument } from 'pdf-lib';
import { generateTenderPackage } from './src/utils/pdfGenerator.js';

// Read JSON
const reqData = JSON.parse(fs.readFileSync('problem-pack/sample-pack/requirements.json', 'utf8'));

// Map files
const filesToLoad = [
  { id: 'R01', filename: 'trade_license_2026.pdf' },
  { id: 'R02', filename: '03_tin_certificate.pdf' },
  { id: 'R03', filename: '04_vat_certificate.pdf' },
  { id: 'R04', filename: 'bank_solvency.pdf' },
  { id: 'R05', filename: 'experience_cert.pdf' },
  { id: 'R06', filename: null }, // Optional
  { id: 'R07', filename: null }, // Optional
  { id: 'R08', filename: '02_technical_proposal.pdf' },
  { id: 'R09', filename: '01_financial_proposal.pdf' },
  { id: 'R10', filename: 'scan_0042.pdf' }
];

const filesData = {};
const matchedFilesMap = {};

for (const f of filesToLoad) {
  if (f.filename) {
    const bytes = fs.readFileSync(path.join('problem-pack/sample-pack/documents', f.filename));
    filesData[f.filename] = {
      name: f.filename,
      bytes: new Uint8Array(bytes),
      pageCount: 1 // mock
    };
    matchedFilesMap[f.id] = f.filename;
  }
}

// Generate
async function run() {
  const result = await generateTenderPackage({
    tender: reqData.tender,
    requirements: reqData.requirements,
    matchedFilesMap,
    filesData,
    sealFile: { bytes: new Uint8Array(fs.readFileSync('problem-pack/sample-pack/documents/company_logo.png')) },
    sealPages: 'all'
  });

  if (!fs.existsSync('output')) fs.mkdirSync('output');
  fs.writeFileSync('output/T-2026-0417_Package.pdf', result.bytes);
  console.log("Success!");
}

run().catch(console.error);
