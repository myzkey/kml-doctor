export type Severity = 'info' | 'warning' | 'error';

export type DiagnosticCategory =
  | 'xml'
  | 'coordinate'
  | 'polygon'
  | 'placemark'
  | 'style'
  | 'reference'
  | 'extension'
  | 'geometry'
  | 'folder'
  | 'overlay'
  | 'time';

export interface KmlInput {
  source: string;
  fileName?: string | undefined;
  sizeBytes?: number | undefined;
}

export interface KmlStats {
  fileSizeBytes?: number | undefined;
  placemarkCount: number;
  folderCount: number;
  pointCount: number;
  polygonCount: number;
  lineStringCount: number;
  styleCount: number;
  networkLinkCount: number;
  groundOverlayCount: number;
  photoOverlayCount: number;
  screenOverlayCount: number;
  timeSpanCount: number;
  timeStampCount: number;
  estimatedLengthMeters: number | null;
  estimatedAreaSquareMeters: number | null;
  crs: string | null;
  bounds: BoundingBox | null;
}

export interface BoundingBox {
  west: number;
  south: number;
  east: number;
  north: number;
}

export interface KmlDiagnostic {
  code: string;
  category: DiagnosticCategory;
  severity: Severity;
  message: string;
  target?: string;
}

export interface KmlReport {
  fileName?: string | undefined;
  stats: KmlStats;
  diagnostics: KmlDiagnostic[];
  xmlValid: boolean;
  geometryValid: boolean;
  valid: boolean;
}

export interface KmlInfoResult {
  fileName?: string | undefined;
  stats: KmlStats;
}

export interface KmlValidateResult {
  fileName?: string | undefined;
  valid: boolean;
  diagnostics: KmlDiagnostic[];
  stats: KmlStats;
}

export type KmlDoctorResult = KmlReport;

export interface Coordinate {
  longitude: number;
  latitude: number;
  altitude?: number;
  raw: string;
}
