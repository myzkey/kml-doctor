import type {
  BoundingBox,
  KmlDiagnostic,
  KmlDoctorResult,
  KmlInfoResult,
  KmlStats,
  KmlValidateResult,
} from '@kml-doctor/core';

const formatBytes = (bytes: number | undefined): string => {
  if (bytes === undefined) {
    return 'unknown';
  }

  if (bytes === 0) {
    return '0 B';
  }

  const units = ['B', 'KB', 'MB', 'GB'] as const;
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** index;
  return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
};

const formatBounds = (bounds: BoundingBox | null): string =>
  bounds
    ? `west=${bounds.west}, south=${bounds.south}, east=${bounds.east}, north=${bounds.north}`
    : 'unknown';

const formatMeters = (meters: number | null): string => {
  if (meters === null) {
    return 'unknown';
  }

  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(2)} km`;
  }

  return `${meters.toFixed(1)} m`;
};

const formatSquareMeters = (squareMeters: number | null): string => {
  if (squareMeters === null) {
    return 'unknown';
  }

  if (squareMeters >= 1_000_000) {
    return `${(squareMeters / 1_000_000).toFixed(2)} km²`;
  }

  return `${squareMeters.toFixed(1)} m²`;
};

const statLines = (stats: KmlStats): string[] => [
  `File Size   : ${formatBytes(stats.fileSizeBytes)}`,
  `Placemark   : ${stats.placemarkCount}`,
  `Folder      : ${stats.folderCount}`,
  `Point       : ${stats.pointCount}`,
  `Polygon     : ${stats.polygonCount}`,
  `LineString  : ${stats.lineStringCount}`,
  `Style       : ${stats.styleCount}`,
  `CRS         : ${stats.crs ?? 'unknown'}`,
  `Bounds      : ${formatBounds(stats.bounds)}`,
  `Length      : ${formatMeters(stats.estimatedLengthMeters)}`,
  `Area        : ${formatSquareMeters(stats.estimatedAreaSquareMeters)}`,
  `NetworkLink : ${stats.networkLinkCount}`,
  `GroundOverlay: ${stats.groundOverlayCount}`,
  `PhotoOverlay : ${stats.photoOverlayCount}`,
  `ScreenOverlay: ${stats.screenOverlayCount}`,
  `TimeSpan    : ${stats.timeSpanCount}`,
  `TimeStamp   : ${stats.timeStampCount}`,
];

const diagnosticLine = (diagnostic: KmlDiagnostic): string => {
  const prefix =
    diagnostic.severity === 'error' ? '✖' : diagnostic.severity === 'warning' ? '⚠' : '•';
  const target = diagnostic.target ? `${diagnostic.target}: ` : '';
  return `${prefix} ${target}${diagnostic.message}`;
};

export const formatInfo = (result: KmlInfoResult): string => {
  const lines = result.fileName ? [`File: ${result.fileName}`, ''] : [];
  return [...lines, ...statLines(result.stats)].join('\n');
};

export const formatValidate = (result: KmlValidateResult): string => {
  const lines = result.fileName ? [`File: ${result.fileName}`, ''] : [];

  if (result.valid) {
    lines.push('✔ XML Valid', '✔ Geometry Valid');
  } else {
    lines.push('Validation Errors', '');
    lines.push(...result.diagnostics.map(diagnosticLine));
  }

  return lines.join('\n');
};

export const formatDoctor = (result: KmlDoctorResult): string => {
  const errors = result.diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
  const warnings = result.diagnostics.filter((diagnostic) => diagnostic.severity === 'warning');
  const lines = result.fileName ? [`File: ${result.fileName}`, ''] : [];

  lines.push(result.xmlValid ? '✔ XML Valid' : '✖ XML Invalid');
  lines.push(result.geometryValid ? '✔ Geometry Valid' : '✖ Geometry Invalid');

  if (errors.length > 0) {
    lines.push('', 'Errors', '', ...errors.map(diagnosticLine));
  }

  if (warnings.length > 0) {
    lines.push('', 'Warnings', '', ...warnings.map(diagnosticLine));
  }

  if (errors.length === 0 && warnings.length === 0) {
    lines.push('', 'No issues found.');
  }

  lines.push('', 'Summary', '', ...statLines(result.stats));

  return lines.join('\n');
};
