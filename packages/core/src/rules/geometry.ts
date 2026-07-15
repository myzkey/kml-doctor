import { elementsByName, textOfFirstDescendant } from '../dom.js';
import type { KmlDiagnostic } from '../types.js';
import type { DiagnosticRule } from './types.js';
import { targetName } from './helpers.js';

const supportedAltitudeModes = new Set(['clampToGround', 'relativeToGround', 'absolute']);

export const geometryInteropRule: DiagnosticRule = {
  name: 'geometry-interop',
  phase: 'doctor',
  run: ({ document, coordinateCount }) => {
    const diagnostics: KmlDiagnostic[] = [];

    elementsByName(document, 'Placemark').forEach((placemark, index) => {
      const altitudeMode = textOfFirstDescendant(placemark, 'altitudeMode');

      if (altitudeMode && !supportedAltitudeModes.has(altitudeMode)) {
        diagnostics.push({
          code: 'ALTITUDE_MODE_UNSUPPORTED',
          category: 'geometry',
          severity: 'warning',
          target: targetName('Placemark', index),
          message: `Unsupported altitudeMode: ${altitudeMode}`,
        });
      }
    });

    if (coordinateCount > 100_000) {
      diagnostics.push({
        code: 'COORDINATE_COUNT_HIGH',
        category: 'geometry',
        severity: 'warning',
        message: `Abnormally high coordinate count: ${coordinateCount}`,
      });
    }

    return diagnostics;
  },
};
