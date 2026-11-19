import { Router, Request, Response } from 'express';
import { DocumentRenderer } from '../engine/renderer.js';
import { PdfGenerator } from '../engine/pdf-generator.js';
import { AnchorParser } from '../esign/anchor-parser.js';

export const documentRouter = Router();
const renderer = new DocumentRenderer();

/**
 * Render dynamic document to HTML
 */
documentRouter.post('/render', (req: Request, res: Response) => {
  try {
    const { templateId, data, options } = req.body;
    if (!templateId || !data) {
      return res.status(400).json({ success: false, error: 'templateId and data are required' });
    }

    const result = renderer.render(templateId, data, options);
    const anchors = AnchorParser.parseAnchors(result.html);

    res.json({
      success: true,
      documentId: result.documentId,
      templateId: result.templateId,
      anchorsFound: anchors.length,
      anchors,
      html: result.html,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

/**
 * Render dynamic document and generate PDF
 */
documentRouter.post('/generate-pdf', async (req: Request, res: Response) => {
  try {
    const { templateId, data, options, pdfOptions } = req.body;
    if (!templateId || !data) {
      return res.status(400).json({ success: false, error: 'templateId and data are required' });
    }

    const result = renderer.render(templateId, data, options);
    const pdf = await PdfGenerator.generateFromHtml(result.html, result.documentId, pdfOptions);
    const anchors = AnchorParser.parseAnchors(result.html);

    res.json({
      success: true,
      documentId: result.documentId,
      templateId: result.templateId,
      pdfFilePath: pdf.filePath,
      fileSize: pdf.buffer.length,
      anchorsFound: anchors.length,
      anchors,
      downloadUrl: `/api/v1/documents/${result.documentId}/download`,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

/**
 * Preview document in browser directly as HTML
 */
documentRouter.post('/preview', (req: Request, res: Response) => {
  try {
    const { templateId, data, options } = req.body;
    const result = renderer.render(templateId, data, options);
    res.setHeader('Content-Type', 'text/html');
    res.send(result.html);
  } catch (err) {
    res.status(500).send(`<h3>Error generating preview: ${(err as Error).message}</h3>`);
  }
});
