import { TemplateLoader } from './template-loader.js';
import { v4 as uuidv4 } from 'uuid';

export interface IRenderOptions {
  watermark?: string;
  isDraft?: boolean;
  documentNumber?: string;
  currency?: string;
  generatedBy?: string;
}

export interface IRenderResult {
  html: string;
  documentId: string;
  templateId: string;
  timestamp: string;
  metadata: Record<string, any>;
}

export class DocumentRenderer {
  private loader: TemplateLoader;

  constructor() {
    this.loader = TemplateLoader.getInstance();
  }

  public render(
    templateId: string,
    data: Record<string, any>,
    options: IRenderOptions = {}
  ): IRenderResult {
    const template = this.loader.getTemplate(templateId);
    const documentId = options.documentNumber || `FNG-${Date.now().toString(36).toUpperCase()}-${uuidv4().substring(0, 4).toUpperCase()}`;
    const timestamp = new Date().toISOString();

    const enrichedContext = {
      ...data,
      _system: {
        documentId,
        templateId,
        generatedAt: timestamp,
        isDraft: options.isDraft ?? false,
        watermark: options.watermark || (options.isDraft ? 'DRAFT' : ''),
        currency: options.currency || 'INR',
        generatedBy: options.generatedBy || 'FinGrid Automation Core',
        version: '2.4.0',
      },
    };

    const html = template(enrichedContext);

    return {
      html,
      documentId,
      templateId,
      timestamp,
      metadata: enrichedContext._system,
    };
  }
}
