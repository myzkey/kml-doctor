import { elementsByName } from '../dom.js';
import type { KmlDiagnostic } from '../types.js';
import type { DiagnosticRule } from './types.js';
import { targetName } from './helpers.js';

export const requiredTagsRule: DiagnosticRule = {
  name: 'required-tags',
  phase: 'validate',
  run: ({ document }) => {
    const diagnostics: KmlDiagnostic[] = [];
    const root = document.documentElement;

    if (!root || root.localName !== 'kml') {
      diagnostics.push({
        code: 'KML_ROOT_MISSING',
        category: 'xml',
        severity: 'error',
        message: 'Required <kml> root tag is missing.',
      });
    }

    elementsByName(document, 'Placemark').forEach((placemark, index) => {
      const hasGeometry = ['Point', 'LineString', 'Polygon', 'MultiGeometry'].some(
        (name) => elementsByName(placemark, name).length > 0,
      );

      if (!hasGeometry) {
        diagnostics.push({
          code: 'PLACEMARK_GEOMETRY_MISSING',
          category: 'geometry',
          severity: 'error',
          target: targetName('Placemark', index),
          message: 'Placemark is missing a supported geometry tag.',
        });
      }
    });

    return diagnostics;
  },
};
