import { DOMParser, type Document as XmlDocument } from '@xmldom/xmldom';
import type { KmlDiagnostic } from '../types.js';

export interface ParsedXml {
  document: XmlDocument | null;
  diagnostics: KmlDiagnostic[];
}

export const parseXml = (source: string): ParsedXml => {
  const errors: string[] = [];
  const parser = new DOMParser({
    onError: (_level, message) => {
      errors.push(message);
    },
  });

  let document: XmlDocument;

  try {
    document = parser.parseFromString(source, 'application/xml');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'XML Parse Error';
    errors.push(message);
    document = parser.parseFromString('<kml />', 'application/xml');
  }

  if (errors.length > 0) {
    return {
      document: null,
      diagnostics: errors.map((message, index) => ({
        code: 'XML_INVALID',
        category: 'xml',
        severity: 'error',
        message: index === 0 ? `XML is invalid: ${message}` : message,
      })),
    };
  }

  return { document, diagnostics: [] };
};
