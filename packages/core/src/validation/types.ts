import type { Document as XmlDocument } from '@xmldom/xmldom';
import type { KmlDiagnostic } from '../types.js';

export type RulePhase = 'validate' | 'doctor';

export interface RuleContext {
  document: XmlDocument;
  coordinateCount: number;
}

export interface DiagnosticRule {
  name: string;
  phase: RulePhase;
  run: (context: RuleContext) => KmlDiagnostic[];
}
