import Handlebars from 'handlebars';
import {
  formatINR,
  formatNumber,
  numberToWordsIndian,
  formatDate,
  calculateRatio,
  calculateYoY,
} from '../utils/financial-helpers.js';

export function registerHandlebarsHelpers(): void {
  // Currency & Numeric helpers
  Handlebars.registerHelper('formatINR', (amount: number, includeDecimals?: boolean) => {
    return formatINR(amount, typeof includeDecimals === 'boolean' ? includeDecimals : true);
  });

  Handlebars.registerHelper('formatNumber', (val: number, decimals?: number) => {
    return formatNumber(val, typeof decimals === 'number' ? decimals : 2);
  });

  Handlebars.registerHelper('numberToWords', (val: number) => {
    return numberToWordsIndian(val);
  });

  Handlebars.registerHelper('formatDate', (dateVal: string | Date, format?: string) => {
    return formatDate(dateVal, typeof format === 'string' ? format : 'DD-MMM-YYYY');
  });

  // Financial ratios & metrics
  Handlebars.registerHelper('calculateRatio', (num: number, den: number, decimals?: number) => {
    return calculateRatio(num, den, typeof decimals === 'number' ? decimals : 2);
  });

  Handlebars.registerHelper('yoyVariance', (current: number, previous: number) => {
    const yoy = calculateYoY(current, previous);
    const colorClass = yoy.direction === 'UP' ? 'text-green-600' : yoy.direction === 'DOWN' ? 'text-red-600' : 'text-gray-500';
    const arrow = yoy.direction === 'UP' ? '▲' : yoy.direction === 'DOWN' ? '▼' : '—';
    return new Handlebars.SafeString(`<span class="${colorClass}">${arrow} ${yoy.formatted}</span>`);
  });

  // Logical operators
  Handlebars.registerHelper('eq', (a, b) => a === b);
  Handlebars.registerHelper('ne', (a, b) => a !== b);
  Handlebars.registerHelper('lt', (a, b) => Number(a) < Number(b));
  Handlebars.registerHelper('gt', (a, b) => Number(a) > Number(b));
  Handlebars.registerHelper('lte', (a, b) => Number(a) <= Number(b));
  Handlebars.registerHelper('gte', (a, b) => Number(a) >= Number(b));
  Handlebars.registerHelper('and', (...args) => args.slice(0, -1).every(Boolean));
  Handlebars.registerHelper('or', (...args) => args.slice(0, -1).some(Boolean));

  // Math helpers
  Handlebars.registerHelper('add', (a: number, b: number) => Number(a) + Number(b));
  Handlebars.registerHelper('subtract', (a: number, b: number) => Number(a) - Number(b));
  Handlebars.registerHelper('multiply', (a: number, b: number) => Number(a) * Number(b));
  Handlebars.registerHelper('percentage', (value: number, total: number) => {
    if (!total || total === 0) return '0.0%';
    return `${((Number(value) / Number(total)) * 100).toFixed(1)}%`;
  });

  // eSign Anchor Tag Generator
  Handlebars.registerHelper('esignAnchor', (signerId: string, role: string, width = 140, height = 50) => {
    const anchorTag = `[[sig:${signerId}:${width}:${height}]]`;
    return new Handlebars.SafeString(`
      <div class="esign-anchor-box" data-signer-id="${signerId}" data-signer-role="${role}">
        <span class="esign-token-hidden" style="color: transparent; font-size: 1px; user-select: none;">${anchorTag}</span>
        <div class="esign-placeholder-line"></div>
        <div class="esign-label">${role} (${signerId})</div>
      </div>
    `);
  });

  // String & formatting utilities
  Handlebars.registerHelper('uppercase', (str: string) => (str ? String(str).toUpperCase() : ''));
  Handlebars.registerHelper('lowercase', (str: string) => (str ? String(str).toLowerCase() : ''));
  Handlebars.registerHelper('defaultVal', (val: any, fallback: any) => (val !== undefined && val !== null && val !== '' ? val : fallback));
  Handlebars.registerHelper('json', (context: any) => JSON.stringify(context, null, 2));
}
