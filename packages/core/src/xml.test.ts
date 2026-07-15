import { describe, expect, it } from 'vitest';
import { parseXml } from './xml.js';

describe('parseXml', () => {
  it('returns a document for valid XML', () => {
    const result = parseXml('<kml><Document /></kml>');

    expect(result.document?.documentElement?.localName).toBe('kml');
    expect(result.diagnostics).toEqual([]);
  });

  it('returns XML diagnostics for malformed XML', () => {
    const result = parseXml('<kml><Document></kml>');

    expect(result.document).toBeNull();
    expect(result.diagnostics[0]).toMatchObject({
      code: 'XML_INVALID',
      category: 'xml',
      severity: 'error',
    });
    expect(result.diagnostics[0]?.message).toContain('XML is invalid:');
  });
});
