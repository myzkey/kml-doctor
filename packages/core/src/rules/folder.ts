import { directChildrenByName, elementsByName } from '../dom.js';
import type { DiagnosticRule } from './types.js';
import { targetName } from './helpers.js';

export const emptyFolderRule: DiagnosticRule = {
  name: 'empty-folder',
  phase: 'doctor',
  run: ({ document }) =>
    elementsByName(document, 'Folder').flatMap((folder, index) => {
      const usefulChildren = ['Placemark', 'Folder', 'GroundOverlay', 'ScreenOverlay'].some(
        (name) => directChildrenByName(folder, name).length > 0,
      );

      if (usefulChildren) {
        return [];
      }

      return [
        {
          code: 'FOLDER_EMPTY',
          category: 'folder',
          severity: 'warning',
          target: targetName('Folder', index),
          message: 'Folder is empty.',
        },
      ];
    }),
};
