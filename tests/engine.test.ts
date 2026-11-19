import assert from 'node:assert';
import { test, describe } from 'node:test';
import {
  formatINR,
  numberToWordsIndian,
  calculateRatio,
  calculateYoY,
} from '../src/utils/financial-helpers.js';
import { DocumentRenderer } from '../src/engine/renderer.js';
import { TemplateLoader } from '../src/engine/template-loader.js';
import { AnchorParser } from '../src/esign/anchor-parser.js';
import { MockEsignProvider } from '../src/esign/providers/mock.js';
import { EsignOrchestrator } from '../src/esign/orchestrator.js';

describe('FinGrid Document Engine - Core Test Suite', () => {
  describe('Financial Utility Helpers', () => {
    test('formatINR formats currency in Indian numbering system', () => {
      assert.strictEqual(formatINR(2500000), '₹25,00,000.00');
      assert.strictEqual(formatINR(10000000, false), '₹1,00,00,000');
      assert.strictEqual(formatINR(500), '₹500.00');
      assert.strictEqual(formatINR(0), '₹0.00');
    });

    test('numberToWordsIndian converts numbers to words in Lakhs and Crores', () => {
      assert.strictEqual(numberToWordsIndian(2500000), 'Twenty-Five Lakh Rupees Only');
      assert.strictEqual(numberToWordsIndian(15000000), 'One Crore Fifty Lakh Rupees Only');
      assert.strictEqual(numberToWordsIndian(0), 'Zero Rupees Only');
    });

    test('calculateRatio computes decimal coverage ratios', () => {
      assert.strictEqual(calculateRatio(195, 100), '1.95');
      assert.strictEqual(calculateRatio(100, 0), 'N/A');
    });

    test('calculateYoY calculates percentage change and direction', () => {
      const yoyUp = calculateYoY(120, 100);
      assert.strictEqual(yoyUp.direction, 'UP');
      assert.strictEqual(yoyUp.formatted, '+20.0%');

      const yoyDown = calculateYoY(80, 100);
      assert.strictEqual(yoyDown.direction, 'DOWN');
      assert.strictEqual(yoyDown.formatted, '-20.0%');
    });
  });

  describe('Template Rendering & Data Binding', () => {
    const loader = TemplateLoader.getInstance();
    const renderer = new DocumentRenderer();

    test('Loads and lists all default financial templates', () => {
      const templates = loader.listTemplates();
      assert.ok(templates.length >= 4, 'Should have at least 4 default templates');
      const templateIds = templates.map(t => t.id);
      assert.ok(templateIds.includes('cam-report'));
      assert.ok(templateIds.includes('profit-and-loss'));
      assert.ok(templateIds.includes('loan-closure'));
      assert.ok(templateIds.includes('sanction-letter'));
    });

    test('Renders CAM Report template with sample data', () => {
      const sample = loader.getSampleData('cam-report');
      assert.ok(sample, 'CAM sample data must exist');

      const result = renderer.render('cam-report', sample);
      assert.ok(result.html.includes('Credit Appraisal Memo (CAM)'));
      assert.ok(result.html.includes('Apex Precision Engineering Pvt Ltd'));
      assert.ok(result.html.includes('₹3,00,00,000.00'));
      assert.ok(result.html.includes('Suresh Chandra Gupta'));
    });

    test('Renders Profit and Loss statement with sample data', () => {
      const sample = loader.getSampleData('profit-and-loss');
      assert.ok(sample, 'P&L sample data must exist');

      const result = renderer.render('profit-and-loss', sample);
      assert.ok(result.html.includes('Statement of Profit and Loss'));
      assert.ok(result.html.includes('Sterling Renewable Technologies Limited'));
      assert.ok(result.html.includes('Total Income (I)'));
    });

    test('Renders Loan Closure & NOC template with zero balance verification', () => {
      const sample = loader.getSampleData('loan-closure');
      assert.ok(sample, 'Loan closure sample data must exist');

      const result = renderer.render('loan-closure', sample);
      assert.ok(result.html.includes('NO OBJECTION CERTIFICATE & LOAN CLOSURE'));
      assert.ok(result.html.includes('Pratap Automotives India Private Limited'));
      assert.ok(result.html.includes('NIL DUES'));
    });

    test('Renders Sanction Letter with dual acceptance parameters', () => {
      const sample = loader.getSampleData('sanction-letter');
      assert.ok(sample, 'Sanction letter sample data must exist');

      const result = renderer.render('sanction-letter', sample);
      assert.ok(result.html.includes('KEY FACT STATEMENT & SANCTION LETTER'));
      assert.ok(result.html.includes('Kaveri Agro Bio-Products LLP'));
      assert.ok(result.html.includes('₹85,00,000.00'));
    });
  });

  describe('eSign Anchors and Mock Workflow', () => {
    test('AnchorParser discovers signature placeholders in rendered HTML', () => {
      const sampleHtml = `
        <div>Agreement Text</div>
        [[sig:borrower_1:150:50]]
        <div>Terms and Conditions</div>
        [[sig:sanction_chair:160:60]]
      `;
      const anchors = AnchorParser.parseAnchors(sampleHtml);
      assert.strictEqual(anchors.length, 2);
      assert.strictEqual(anchors[0].signerId, 'borrower_1');
      assert.strictEqual(anchors[1].signerId, 'sanction_chair');
    });

    test('Mock eSign Orchestrator initiates and transitions signing state', async () => {
      const orchestrator = EsignOrchestrator.getInstance();

      const req = {
        documentId: 'DOC-TEST-001',
        documentTitle: 'Test Agreement',
        documentBuffer: Buffer.from('<html><body>Test Agreement</body></html>'),
        signers: [
          {
            id: 'signer_1',
            name: 'Aakash Mehra',
            email: 'aakash@example.com',
            role: 'BORROWER',
            status: 'PENDING' as const,
          },
          {
            id: 'signer_2',
            name: 'Pooja Iyer',
            email: 'pooja@fingrid.example.com',
            role: 'CREDIT_HEAD',
            status: 'PENDING' as const,
          },
        ],
      };

      const resp = await orchestrator.initiateSigning(req, 'MOCK');
      assert.ok(resp.esignId.startsWith('MOCK-ESIGN-'));
      assert.strictEqual(resp.status, 'REQUESTED');
      assert.strictEqual(resp.signers.length, 2);

      // Sign for first signer
      MockEsignProvider.simulateSign(resp.esignId, 'signer_1');
      const provider = orchestrator.getProvider('MOCK');
      const status1 = await provider.getSignatureStatus(resp.esignId);
      assert.strictEqual(status1.status, 'PARTIALLY_SIGNED');

      // Sign for second signer
      MockEsignProvider.simulateSign(resp.esignId, 'signer_2');
      const status2 = await provider.getSignatureStatus(resp.esignId);
      assert.strictEqual(status2.status, 'SIGNED');

      // Verify signed document download
      const signedDoc = await provider.downloadSignedDocument(resp.esignId);
      assert.ok(signedDoc.toString('utf-8').includes('FINGRID VERIFIED DIGITAL SIGNATURE'));
    });
  });
});
