#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { DocumentRenderer } from './engine/renderer.js';
import { TemplateLoader } from './engine/template-loader.js';
import { AnchorParser } from './esign/anchor-parser.js';
import { PdfGenerator } from './engine/pdf-generator.js';

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === '--help' || command === '-h') {
    printHelp();
    return;
  }

  const loader = TemplateLoader.getInstance();
  const renderer = new DocumentRenderer();

  if (command === 'list') {
    const templates = loader.listTemplates();
    console.log('\n📄 Available FinGrid Document Templates:');
    templates.forEach(t => {
      console.log(`  • ${t.id.padEnd(20)} [${t.category.toUpperCase()}] - ${t.name}`);
    });
    console.log();
    return;
  }

  if (command === 'generate') {
    const templateIdx = args.indexOf('--template');
    const templateId = templateIdx !== -1 ? args[templateIdx + 1] : 'cam-report';

    const dataIdx = args.indexOf('--data');
    let data: any;

    if (dataIdx !== -1) {
      const dataFile = path.resolve(args[dataIdx + 1]);
      data = JSON.parse(fs.readFileSync(dataFile, 'utf-8'));
    } else {
      console.log(`No data file provided with --data. Loading sample data for '${templateId}'...`);
      data = loader.getSampleData(templateId);
      if (!data) {
        console.error(`Error: No sample data found for template '${templateId}'`);
        process.exit(1);
      }
    }

    const outIdx = args.indexOf('--out');
    const outFormat = args.includes('--pdf') ? 'pdf' : 'html';
    const outputFilename = outIdx !== -1 ? args[outIdx + 1] : `${templateId}-output.${outFormat}`;

    console.log(`Rendering document for template '${templateId}'...`);
    const result = renderer.render(templateId, data);
    const anchors = AnchorParser.parseAnchors(result.html);

    console.log(`✓ Document Rendered: ${result.documentId}`);
    console.log(`✓ Found ${anchors.length} signature anchors:`, anchors.map(a => a.signerId).join(', '));

    if (outFormat === 'pdf') {
      const pdf = await PdfGenerator.generateFromHtml(result.html, result.documentId);
      console.log(`✓ Generated PDF saved to: ${pdf.filePath}`);
    } else {
      fs.writeFileSync(outputFilename, result.html, 'utf-8');
      console.log(`✓ Generated HTML saved to: ${path.resolve(outputFilename)}`);
    }
    return;
  }

  printHelp();
}

function printHelp() {
  console.log(`
FinGrid Dynamic Document Generation CLI

Usage:
  npx tsx src/cli.ts list                                  List all available templates
  npx tsx src/cli.ts generate --template <name>           Generate using template sample data
  npx tsx src/cli.ts generate --template <name> --data <path.json> --out <output.html>
  npx tsx src/cli.ts generate --template <name> --pdf     Generate PDF document
`);
}

main().catch(err => {
  console.error('CLI Error:', err);
  process.exit(1);
});
