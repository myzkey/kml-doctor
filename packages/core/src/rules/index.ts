import { gxExtensionRule } from './extensions.js';
import { emptyFolderRule } from './folder.js';
import { geometryInteropRule } from './geometry.js';
import { placemarkNameRule } from './placemark-name.js';
import { polygonValidityRule } from './polygon-validity.js';
import { requiredTagsRule } from './required-tags.js';
import { styleReferencesRule } from './style-references.js';
import type { DiagnosticRule } from './types.js';

export const validationRules: DiagnosticRule[] = [polygonValidityRule, requiredTagsRule];

export const doctorRules: DiagnosticRule[] = [
  placemarkNameRule,
  styleReferencesRule,
  geometryInteropRule,
  emptyFolderRule,
  gxExtensionRule,
];
