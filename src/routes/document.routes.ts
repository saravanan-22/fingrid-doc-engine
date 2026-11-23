import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { config } from '../config.js';
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
      format: pdf.format,
      pdfGenerated: pdf.format === 'pdf',
      ...(pdf.fallbackReason ? { warning: `PDF not generated: ${pdf.fallbackReason}. Returned HTML instead.` } : {}),
      filePath: pdf.filePath,
      pdfFilePath: pdf.format === 'pdf' ? pdf.filePath : null,
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
 * Download a previously generated document (PDF if available, otherwise the HTML fallback)
 */
documentRouter.get('/:documentId/download', (req: Request, res: Response) => {
  const { documentId } = req.params;
  if (!/^[A-Za-z0-9-]+$/.test(documentId)) {
    return res.status(400).json({ success: false, error: 'Invalid documentId' });
  }
  for (const [ext, type] of [['pdf', 'application/pdf'], ['html', 'text/html; charset=utf-8']] as const) {
    const filePath = path.join(config.outputDir, `${documentId}.${ext}`);
    if (fs.existsSync(filePath)) {
      res.setHeader('Content-Type', type);
      res.setHeader('Content-Disposition', `attachment; filename="${documentId}.${ext}"`);
      return res.sendFile(filePath);
    }
  }
  res.status(404).json({ success: false, error: `Document not found: ${documentId}` });
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
