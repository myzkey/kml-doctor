import { gxExtensionRule } from './extensions.js';
import { emptyFolderRule } from './folder.js';
import { geometryInteropRule } from './geometry.js';
import { placemarkNameRule } from './placemark-name.js';
import { styleReferencesRule } from './style-references.js';
import type { DiagnosticRule } from '../validation/types.js';

export const doctorRules: DiagnosticRule[] = [
  placemarkNameRule,
  styleReferencesRule,
  geometryInteropRule,
  emptyFolderRule,
  gxExtensionRule,
];
