import { coordinatesEqual, parseCoordinateText } from '../coordinates.js';
import { elementsByName } from '../dom.js';
import type { KmlDiagnostic } from '../types.js';
import type { DiagnosticRule } from './types.js';
import { targetName } from './helpers.js';

export const polygonValidityRule: DiagnosticRule = {
  name: 'polygon-validity',
  phase: 'validate',
  run: ({ document }) => {
    const diagnostics: KmlDiagnostic[] = [];

    elementsByName(document, 'Polygon').forEach((polygon, polygonIndex) => {
      const rings = elementsByName(polygon, 'LinearRing');

      if (rings.length === 0) {
        diagnostics.push({
          code: 'POLYGON_RING_MISSING',
          category: 'polygon',
          severity: 'error',
          target: targetName('Polygon', polygonIndex),
          message: 'Polygon is missing a LinearRing.',
        });
      }

      rings.forEach((ring, ringIndex) => {
        const coordinatesElement = elementsByName(ring, 'coordinates')[0];
        const coordinates = parseCoordinateText(coordinatesElement?.textContent ?? '').filter(
          (coordinate) => coordinate !== null,
        );
        const target = `Polygon #${polygonIndex + 1} ring #${ringIndex + 1}`;

        if (coordinates.length < 4) {
          diagnostics.push({
            code: 'POLYGON_TOO_FEW_POINTS',
            category: 'polygon',
            severity: 'error',
            target,
            message: 'Polygon ring needs at least 4 coordinates including the closing point.',
          });
        }

        const first = coordinates[0];
        const last = coordinates.at(-1);

        if (first && last && !coordinatesEqual(first, last)) {
          diagnostics.push({
            code: 'POLYGON_NOT_CLOSED',
            category: 'polygon',
            severity: 'error',
            target,
            message: 'Polygon ring is not closed.',
          });
        }
      });
    });

    return diagnostics;
  },
};
