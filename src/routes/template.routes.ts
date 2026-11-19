import { Router, Request, Response } from 'express';
import { TemplateLoader } from '../engine/template-loader.js';

export const templateRouter = Router();
const loader = TemplateLoader.getInstance();

/**
 * List all available document templates in the engine
 */
templateRouter.get('/', (req: Request, res: Response) => {
  try {
    const templates = loader.listTemplates();
    res.json({ success: true, count: templates.length, templates });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

/**
 * Get sample data payload for a template
 */
templateRouter.get('/:templateId/sample', (req: Request, res: Response) => {
  try {
    const { templateId } = req.params;
    const sample = loader.getSampleData(templateId);
    if (!sample) {
      return res.status(404).json({ success: false, error: `No sample data for template '${templateId}'` });
    }
    res.json({ success: true, templateId, sampleData: sample });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});
