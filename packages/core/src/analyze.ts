import type { Document as XmlDocument } from '@xmldom/xmldom';
import { extendBounds, parseCoordinateText, validateCoordinate } from './coordinates.js';
import { elementsByName } from './dom.js';
import { doctorRules, validationRules } from './rules/index.js';
import type { RuleContext } from './rules/types.js';
import type {
  BoundingBox,
  KmlDiagnostic,
  KmlDoctorResult,
  KmlInfoResult,
  KmlInput,
  KmlReport,
  KmlStats,
  KmlValidateResult,
} from './types.js';
import { parseXml } from './xml.js';

const emptyStats = (sizeBytes?: number): KmlStats => ({
  fileSizeBytes: sizeBytes,
  placemarkCount: 0,
  folderCount: 0,
  pointCount: 0,
  polygonCount: 0,
  lineStringCount: 0,
  styleCount: 0,
  networkLinkCount: 0,
  groundOverlayCount: 0,
  photoOverlayCount: 0,
  screenOverlayCount: 0,
  timeSpanCount: 0,
  timeStampCount: 0,
  estimatedLengthMeters: null,
  estimatedAreaSquareMeters: null,
  crs: null,
  bounds: null,
});

const earthRadiusMeters = 6_371_008.8;

const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;

const haversineDistance = (
  from: { longitude: number; latitude: number },
  to: { longitude: number; latitude: number },
): number => {
  const deltaLatitude = toRadians(to.latitude - from.latitude);
  const deltaLongitude = toRadians(to.longitude - from.longitude);
  const fromLatitude = toRadians(from.latitude);
  const toLatitude = toRadians(to.latitude);
  const a =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(fromLatitude) * Math.cos(toLatitude) * Math.sin(deltaLongitude / 2) ** 2;

  return 2 * earthRadiusMeters * Math.asin(Math.sqrt(a));
};

const estimatePathLength = (coordinatesText: string): number => {
  const coordinates = parseCoordinateText(coordinatesText).filter(
    (coordinate) => coordinate !== null,
  );
  let length = 0;

  for (let index = 1; index < coordinates.length; index += 1) {
    const previous = coordinates[index - 1];
    const current = coordinates[index];

    if (previous && current) {
      length += haversineDistance(previous, current);
    }
  }

  return length;
};

const estimateRingArea = (coordinatesText: string): number => {
  const coordinates = parseCoordinateText(coordinatesText).filter(
    (coordinate) => coordinate !== null,
  );

  if (coordinates.length < 4) {
    return 0;
  }

  let area = 0;

  for (let index = 0; index < coordinates.length - 1; index += 1) {
    const current = coordinates[index];
    const next = coordinates[index + 1];

    if (current && next) {
      area +=
        toRadians(next.longitude - current.longitude) *
        (2 + Math.sin(toRadians(current.latitude)) + Math.sin(toRadians(next.latitude)));
    }
  }

  return Math.abs((area * earthRadiusMeters ** 2) / 2);
};

const estimateTotalLength = (document: XmlDocument): number | null => {
  const lineLength = elementsByName(document, 'LineString')
    .map((lineString) => elementsByName(lineString, 'coordinates')[0]?.textContent ?? '')
    .reduce((total, coordinatesText) => total + estimatePathLength(coordinatesText), 0);

  return lineLength > 0 ? lineLength : null;
};

const estimateTotalArea = (document: XmlDocument): number | null => {
  const polygonArea = elementsByName(document, 'Polygon')
    .flatMap((polygon) => elementsByName(polygon, 'LinearRing'))
    .map((ring) => elementsByName(ring, 'coordinates')[0]?.textContent ?? '')
    .reduce((total, coordinatesText) => total + estimateRingArea(coordinatesText), 0);

  return polygonArea > 0 ? polygonArea : null;
};

const collectBoundsAndCoordinateDiagnostics = (
  document: XmlDocument,
): { bounds: BoundingBox | null; diagnostics: KmlDiagnostic[]; coordinateCount: number } => {
  let bounds: BoundingBox | null = null;
  let coordinateCount = 0;
  const diagnostics: KmlDiagnostic[] = [];

  elementsByName(document, 'coordinates').forEach((element, elementIndex) => {
    const tokens = (element.textContent ?? '').trim().split(/\s+/).filter(Boolean);
    const parsed = parseCoordinateText(element.textContent ?? '');

    parsed.forEach((coordinate, tokenIndex) => {
      const target = `coordinates #${elementIndex + 1}.${tokenIndex + 1}`;
      diagnostics.push(...validateCoordinate(coordinate, target, tokens[tokenIndex] ?? ''));

      if (coordinate) {
        coordinateCount += 1;
        bounds = extendBounds(bounds, coordinate);
      }
    });
  });

  return { bounds, diagnostics, coordinateCount };
};

const collectStats = (
  document: XmlDocument,
  sizeBytes?: number,
  bounds?: BoundingBox | null,
): KmlStats => ({
  fileSizeBytes: sizeBytes,
  placemarkCount: elementsByName(document, 'Placemark').length,
  folderCount: elementsByName(document, 'Folder').length,
  pointCount: elementsByName(document, 'Point').length,
  polygonCount: elementsByName(document, 'Polygon').length,
  lineStringCount: elementsByName(document, 'LineString').length,
  styleCount: elementsByName(document, 'Style').length,
  networkLinkCount: elementsByName(document, 'NetworkLink').length,
  groundOverlayCount: elementsByName(document, 'GroundOverlay').length,
  photoOverlayCount: elementsByName(document, 'PhotoOverlay').length,
  screenOverlayCount: elementsByName(document, 'ScreenOverlay').length,
  timeSpanCount: elementsByName(document, 'TimeSpan').length,
  timeStampCount: elementsByName(document, 'TimeStamp').length,
  estimatedLengthMeters: estimateTotalLength(document),
  estimatedAreaSquareMeters: estimateTotalArea(document),
  crs: bounds ? 'EPSG:4326 (KML default)' : null,
  bounds: bounds ?? null,
});

const runRules = (context: RuleContext, rules: typeof validationRules): KmlDiagnostic[] =>
  rules.flatMap((rule) => rule.run(context));

export const analyzeKml = (input: KmlInput): KmlReport => {
  const parsed = parseXml(input.source);

  if (!parsed.document) {
    const stats = emptyStats(input.sizeBytes);

    return {
      fileName: input.fileName,
      stats,
      diagnostics: parsed.diagnostics,
      xmlValid: false,
      geometryValid: false,
      valid: false,
    };
  }

  const coordinateResult = collectBoundsAndCoordinateDiagnostics(parsed.document);
  const ruleContext = {
    document: parsed.document,
    coordinateCount: coordinateResult.coordinateCount,
  };
  const validationDiagnostics = [
    ...coordinateResult.diagnostics,
    ...runRules(ruleContext, validationRules),
  ];
  const warnings = runRules(ruleContext, doctorRules);
  const diagnostics = [...validationDiagnostics, ...warnings];
  const geometryValid = !validationDiagnostics.some(
    (diagnostic) => diagnostic.severity === 'error',
  );

  return {
    fileName: input.fileName,
    stats: collectStats(parsed.document, input.sizeBytes, coordinateResult.bounds),
    diagnostics,
    xmlValid: true,
    geometryValid,
    valid: geometryValid,
  };
};

export const getKmlInfo = (input: KmlInput): KmlInfoResult => {
  const report = analyzeKml(input);
  return {
    fileName: report.fileName,
    stats: report.stats,
  };
};

export const validateKml = (input: KmlInput): KmlValidateResult => {
  const report = analyzeKml(input);
  return {
    fileName: report.fileName,
    valid: report.valid,
    diagnostics: report.diagnostics.filter((diagnostic) => diagnostic.severity === 'error'),
    stats: report.stats,
  };
};

export const doctorKml = (input: KmlInput): KmlDoctorResult => analyzeKml(input);
