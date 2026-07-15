import { attributeValue, elementsByName } from '../parser/dom.js';
import type { KmlDiagnostic } from '../types.js';
import { targetName } from '../validation/helpers.js';
import type { DiagnosticRule } from '../validation/types.js';

export const styleReferencesRule: DiagnosticRule = {
  name: 'style-references',
  phase: 'doctor',
  run: ({ document }) => {
    const diagnostics: KmlDiagnostic[] = [];
    const styleIds = new Map<string, number>();
    const referencedStyleIds = new Set<string>();

    elementsByName(document, 'Style').forEach((style) => {
      const id = attributeValue(style, 'id');

      if (id) {
        styleIds.set(id, (styleIds.get(id) ?? 0) + 1);
      }
    });

    styleIds.forEach((count, id) => {
      if (count > 1) {
        diagnostics.push({
          code: 'STYLE_ID_DUPLICATE',
          category: 'style',
          severity: 'warning',
          target: `Style #${id}`,
          message: `Duplicate Style ID: ${id}`,
        });
      }
    });

    elementsByName(document, 'styleUrl').forEach((styleUrl, index) => {
      const value = styleUrl.textContent?.trim() ?? '';

      if (value.startsWith('#')) {
        referencedStyleIds.add(value.slice(1));
      }

      if (value.startsWith('#') && !styleIds.has(value.slice(1))) {
        diagnostics.push({
          code: 'STYLE_REFERENCE_BROKEN',
          category: 'reference',
          severity: 'warning',
          target: targetName('styleUrl', index),
          message: `Broken Reference: ${value}`,
        });
      }
    });

    styleIds.forEach((_count, id) => {
      if (!referencedStyleIds.has(id)) {
        diagnostics.push({
          code: 'STYLE_UNUSED',
          category: 'style',
          severity: 'warning',
          target: `Style #${id}`,
          message: `Unused Style: ${id}`,
        });
      }
    });

    return diagnostics;
  },
};
