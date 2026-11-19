import fs from 'fs';
import path from 'path';
import Handlebars from 'handlebars';
import { config } from '../config.js';
import { registerHandlebarsHelpers } from './helpers.js';

export interface ITemplateMetadata {
  id: string;
  name: string;
  description: string;
  version: string;
  category: 'credit' | 'legal' | 'financial' | 'operations';
  hasSampleData: boolean;
}

export class TemplateLoader {
  private static instance: TemplateLoader;
  private templateCache: Map<string, HandlebarsTemplateDelegate> = new Map();
  private partialsLoaded = false;

  private constructor() {
    registerHandlebarsHelpers();
  }

  public static getInstance(): TemplateLoader {
    if (!TemplateLoader.instance) {
      TemplateLoader.instance = new TemplateLoader();
    }
    return TemplateLoader.instance;
  }

  public loadPartials(forceReload = false): void {
    if (this.partialsLoaded && !forceReload && config.nodeEnv === 'production') {
      return;
    }

    const partialsDir = path.join(config.templatesDir, 'partials');
    if (!fs.existsSync(partialsDir)) {
      return;
    }

    const files = fs.readdirSync(partialsDir);
    for (const file of files) {
      if (file.endsWith('.hbs')) {
        const partialName = path.basename(file, '.hbs');
        const partialContent = fs.readFileSync(path.join(partialsDir, file), 'utf-8');
        Handlebars.registerPartial(partialName, partialContent);
      }
    }

    this.partialsLoaded = true;
  }

  public getTemplate(templateId: string): HandlebarsTemplateDelegate {
    this.loadPartials();

    if (config.nodeEnv === 'production' && this.templateCache.has(templateId)) {
      return this.templateCache.get(templateId)!;
    }

    const templatePath = path.join(config.templatesDir, templateId, 'template.hbs');
    if (!fs.existsSync(templatePath)) {
      throw new Error(`Template not found: '${templateId}' at path ${templatePath}`);
    }

    const templateSource = fs.readFileSync(templatePath, 'utf-8');
    const compiled = Handlebars.compile(templateSource);
    this.templateCache.set(templateId, compiled);
    return compiled;
  }

  public getSampleData(templateId: string): Record<string, any> | null {
    const samplePath = path.join(config.templatesDir, templateId, 'sample-data.json');
    if (fs.existsSync(samplePath)) {
      try {
        const raw = fs.readFileSync(samplePath, 'utf-8');
        return JSON.parse(raw);
      } catch (err) {
        console.error(`Error parsing sample data for template ${templateId}:`, err);
      }
    }
    return null;
  }

  public listTemplates(): ITemplateMetadata[] {
    const templatesDir = config.templatesDir;
    if (!fs.existsSync(templatesDir)) return [];

    const dirs = fs.readdirSync(templatesDir, { withFileTypes: true });
    const templates: ITemplateMetadata[] = [];

    for (const d of dirs) {
      if (d.isDirectory() && d.name !== 'partials') {
        const hasTemplate = fs.existsSync(path.join(templatesDir, d.name, 'template.hbs'));
        const hasSample = fs.existsSync(path.join(templatesDir, d.name, 'sample-data.json'));

        if (hasTemplate) {
          templates.push({
            id: d.name,
            name: this.formatTemplateName(d.name),
            description: `Dynamic document template for ${d.name}`,
            version: '1.0.0',
            category: this.categorizeTemplate(d.name),
            hasSampleData: hasSample,
          });
        }
      }
    }

    return templates;
  }

  private formatTemplateName(dirName: string): string {
    return dirName
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  private categorizeTemplate(dirName: string): 'credit' | 'legal' | 'financial' | 'operations' {
    if (dirName.includes('cam')) return 'credit';
    if (dirName.includes('profit') || dirName.includes('loss')) return 'financial';
    if (dirName.includes('closure') || dirName.includes('sanction')) return 'legal';
    return 'operations';
  }
}
