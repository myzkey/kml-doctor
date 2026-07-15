import { directChildText, elementsByName } from '../dom.js';
import type { DiagnosticRule } from './types.js';
import { targetName } from './helpers.js';

export const placemarkNameRule: DiagnosticRule = {
  name: 'placemark-name',
  phase: 'doctor',
  run: ({ document }) =>
    elementsByName(document, 'Placemark').flatMap((placemark, index) => {
      if (directChildText(placemark, 'name').length > 0) {
        return [];
      }

      return [
        {
          code: 'PLACEMARK_NAME_EMPTY',
          category: 'placemark',
          severity: 'warning',
          target: targetName('Placemark', index),
          message: 'Placemark name is empty.',
        },
      ];
    }),
};
