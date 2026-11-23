import fs from 'fs';
import path from 'path';
import { config } from '../config.js';

export interface IPdfOptions {
  paperSize?: 'A4' | 'Letter';
  orientation?: 'portrait' | 'landscape';
  marginTop?: string;
  marginBottom?: string;
  marginLeft?: string;
  marginRight?: string;
  preferGotenberg?: boolean;
}

export interface IPdfResult {
  buffer: Buffer;
  filePath: string;
  /** 'pdf' when Gotenberg rendered a real PDF, 'html' when it fell back to the HTML source */
  format: 'pdf' | 'html';
  /** Why the PDF could not be produced (only set when format === 'html') */
  fallbackReason?: string;
}

export class PdfGenerator {
  public static async generateFromHtml(
    html: string,
    documentId: string,
    options: IPdfOptions = {}
  ): Promise<IPdfResult> {
    const outputDir = config.outputDir;
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const htmlPath = path.join(outputDir, `${documentId}.html`);
    const pdfPath = path.join(outputDir, `${documentId}.pdf`);

    // Save HTML backup
    fs.writeFileSync(htmlPath, html, 'utf-8');

    // Attempt Gotenberg if available
    let fallbackReason = 'Gotenberg disabled (preferGotenberg=false or GOTENBERG_URL unset)';
    if (options.preferGotenberg !== false && config.gotenbergUrl) {
      try {
        const pdfBuffer = await this.renderViaGotenberg(html, options);
        fs.writeFileSync(pdfPath, pdfBuffer);
        return { buffer: pdfBuffer, filePath: pdfPath, format: 'pdf' };
      } catch (err) {
        fallbackReason = `Gotenberg unavailable at ${config.gotenbergUrl} (${(err as Error).message})`;
        console.warn(`${fallbackReason}. Falling back to HTML output.`);
      }
    }

    // Fallback: no PDF renderer available. Return the HTML itself, saved with an
    // .html extension, so callers never receive HTML disguised as a .pdf file.
    return { buffer: Buffer.from(html, 'utf-8'), filePath: htmlPath, format: 'html', fallbackReason };
  }

  private static async renderViaGotenberg(html: string, options: IPdfOptions): Promise<Buffer> {
    const formData = new FormData();
    const htmlBlob = new Blob([html], { type: 'text/html' });
    formData.append('files', htmlBlob, 'index.html');

    if (options.marginTop) formData.append('marginTop', options.marginTop);
    if (options.marginBottom) formData.append('marginBottom', options.marginBottom);
    if (options.orientation === 'landscape') formData.append('landscape', 'true');

    const endpoint = `${config.gotenbergUrl}/forms/chromium/convert/html`;
    const response = await fetch(endpoint, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Gotenberg returned ${response.status}: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }
}
