import type { DiagnosticRule } from './types.js';

export const gxExtensionRule: DiagnosticRule = {
  name: 'gx-extension',
  phase: 'doctor',
  run: ({ document }) =>
    Array.from(document.getElementsByTagName('*')).flatMap((element) => {
      if (element.prefix !== 'gx') {
        return [];
      }

      return [
        {
          code: 'GX_EXTENSION_USED',
          category: 'extension',
          severity: 'warning',
          target: element.nodeName,
          message: `gx extension is used: <${element.nodeName}>`,
        },
      ];
    }),
};
