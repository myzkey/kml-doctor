import { polygonValidityRule } from './polygon-validity.js';
import { requiredTagsRule } from './required-tags.js';
import type { DiagnosticRule } from './types.js';

export const validationRules: DiagnosticRule[] = [polygonValidityRule, requiredTagsRule];
