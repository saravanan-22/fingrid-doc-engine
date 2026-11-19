import { ISignatureAnchor } from './types.js';

export class AnchorParser {
  /**
   * Scans HTML content for signature anchor tags.
   * Pattern: [[sig:signerId:width:height]] or [[sig:signerId]]
   */
  public static parseAnchors(htmlContent: string): ISignatureAnchor[] {
    const anchors: ISignatureAnchor[] = [];
    const regex = /\[\[sig:([a-zA-Z0-9_-]+)(?::(\d+):(\d+))?\]\]/g;

    let match: RegExpExecArray | null;
    while ((match = regex.exec(htmlContent)) !== null) {
      const signerId = match[1];
      const width = match[2] ? parseInt(match[2], 10) : 150;
      const height = match[3] ? parseInt(match[3], 10) : 50;

      // Avoid duplicates
      if (!anchors.some(a => a.signerId === signerId)) {
        anchors.push({
          signerId,
          role: signerId.toUpperCase(),
          anchorText: match[0],
          width,
          height,
        });
      }
    }

    return anchors;
  }
}
