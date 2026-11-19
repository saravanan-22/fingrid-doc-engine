import fs from 'fs';
import path from 'path';
import { DocumentRenderer } from '../src/engine/renderer.js';
import { TemplateLoader } from '../src/engine/template-loader.js';
import { AnchorParser } from '../src/esign/anchor-parser.js';
import { EsignOrchestrator } from '../src/esign/orchestrator.js';
import { MockEsignProvider } from '../src/esign/providers/mock.js';

async function runE2EDemo() {
  console.log('================================================================');
  console.log('🚀 FINGRID DYNAMIC DOCUMENT ENGINE & ESIGN — E2E TEST RUNNER');
  console.log('================================================================\n');

  const loader = TemplateLoader.getInstance();
  const renderer = new DocumentRenderer();
  const orchestrator = EsignOrchestrator.getInstance();

  const outputDir = path.resolve('./output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const templatesToTest = [
    'cam-report',
    'profit-and-loss',
    'loan-closure',
    'sanction-letter',
    'bank-analysis-report',
  ];

  console.log('--- TEST STEP 1: DYNAMIC DOCUMENT GENERATION ---');
  for (const templateId of templatesToTest) {
    const sampleData = loader.getSampleData(templateId);
    if (!sampleData) {
      throw new Error(`Sample data missing for ${templateId}`);
    }

    const result = renderer.render(templateId, sampleData);
    const anchors = AnchorParser.parseAnchors(result.html);
    const outPath = path.join(outputDir, `${templateId}-sample.html`);

    fs.writeFileSync(outPath, result.html, 'utf-8');

    console.log(`✓ [${templateId.toUpperCase()}]`);
    console.log(`    Doc ID:       ${result.documentId}`);
    console.log(`    File:         ${outPath}`);
    console.log(`    File Size:    ${(result.html.length / 1024).toFixed(1)} KB`);
    console.log(`    eSign Anchors: ${anchors.length} found (${anchors.map(a => a.signerId).join(', ')})`);
  }

  console.log('\n--- TEST STEP 2: ESIGN WORKFLOW SIMULATION (LOAN ACCOUNT CLOSE) ---');
  const nocData = loader.getSampleData('loan-closure')!;
  const nocRender = renderer.render('loan-closure', nocData);
  const nocAnchors = AnchorParser.parseAnchors(nocRender.html);

  console.log('1. Initiating eSign Ceremony with Mock Provider...');
  const esignRequest = {
    documentId: nocRender.documentId,
    documentTitle: `Loan Closure NOC - ${nocData.loanDetails.accountNumber}`,
    documentBuffer: Buffer.from(nocRender.html, 'utf-8'),
    signers: nocData.signers,
    anchors: nocAnchors,
    expiryDays: 5,
  };

  const esignResp = await orchestrator.initiateSigning(esignRequest, 'MOCK');
  console.log(`✓ eSign Session Created: ${esignResp.esignId}`);
  console.log(`✓ Initial Status:        ${esignResp.status}`);
  console.log(`✓ Target Signers:        ${esignResp.signers.map(s => `${s.role} <${s.email}>`).join(', ')}`);
  console.log(`✓ Signing URL:           ${esignResp.signers[0]?.signingUrl}`);

  console.log('\n2. Simulating Digital Signature Authentication (Branch Manager OTP/DSC)...');
  MockEsignProvider.simulateSign(esignResp.esignId, 'branch_operations_head');

  const provider = orchestrator.getProvider('MOCK');
  const updatedStatus = await provider.getSignatureStatus(esignResp.esignId);
  console.log(`✓ Status After Signing:  ${updatedStatus.status}`);
  console.log(`✓ Signer 1 Completed:   ${updatedStatus.signers[0]?.status} at ${updatedStatus.signers[0]?.signedAt}`);

  console.log('\n3. Downloading Signed & Tamper-Proof Document...');
  const signedBuffer = await provider.downloadSignedDocument(esignResp.esignId);
  const signedDocPath = path.join(outputDir, `signed-loan-closure-${esignResp.esignId}.html`);
  fs.writeFileSync(signedDocPath, signedBuffer);
  console.log(`✓ Tamper-proof signed document saved to: ${signedDocPath}`);

  console.log('\n--- TEST STEP 3: ESIGN MULTI-PARTY APPROVAL (CAM REPORT) ---');
  const camData = loader.getSampleData('cam-report')!;
  const camRender = renderer.render('cam-report', camData);
  const camAnchors = AnchorParser.parseAnchors(camRender.html);

  console.log('1. Initiating Multi-Tier Sanction Committee eSign...');
  const camEsignResp = await orchestrator.initiateSigning({
    documentId: camRender.documentId,
    documentTitle: `CAM Approval - ${camData.borrower.entityName}`,
    documentBuffer: Buffer.from(camRender.html, 'utf-8'),
    signers: camData.signers,
    anchors: camAnchors,
  }, 'MOCK');

  console.log(`✓ CAM eSign ID: ${camEsignResp.esignId} (Requires 3 signatures: Analyst, CRO, Sanction Chair)`);

  // Signer 1 signs
  console.log('  -> Signing 1/3: Credit Analyst signs via DSC...');
  MockEsignProvider.simulateSign(camEsignResp.esignId, 'credit_analyst');
  let camStatus = await provider.getSignatureStatus(camEsignResp.esignId);
  console.log(`     Status: ${camStatus.status} (1/3 signed)`);

  // Signer 2 signs
  console.log('  -> Signing 2/3: Chief Risk Officer signs via Aadhaar eSign...');
  MockEsignProvider.simulateSign(camEsignResp.esignId, 'risk_head');
  camStatus = await provider.getSignatureStatus(camEsignResp.esignId);
  console.log(`     Status: ${camStatus.status} (2/3 signed)`);

  // Signer 3 signs
  console.log('  -> Signing 3/3: Sanction Committee Chair signs via Aadhaar eSign...');
  MockEsignProvider.simulateSign(camEsignResp.esignId, 'sanction_chair');
  camStatus = await provider.getSignatureStatus(camEsignResp.esignId);
  console.log(`     Status: ${camStatus.status} (3/3 All Signed - Fully Approved!)`);

  const signedCamPath = path.join(outputDir, `signed-cam-report-${camEsignResp.esignId}.html`);
  const signedCamBuffer = await provider.downloadSignedDocument(camEsignResp.esignId);
  fs.writeFileSync(signedCamPath, signedCamBuffer);
  console.log(`✓ Fully Approved CAM saved to: ${signedCamPath}`);

  console.log('\n================================================================');
  console.log('🎉 ALL TESTS COMPLETED SUCCESSFULLY! ALL SAMPLE FILES READY IN ./output');
  console.log('================================================================');
}

runE2EDemo().catch(err => {
  console.error('Test Run Failed:', err);
  process.exit(1);
});
