import { describe, expect, it } from 'vitest';
import { analyzeKml, doctorKml, getKmlInfo, validateKml } from './index.js';

const kml = (body: string, attributes = ''): string => `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2"${attributes}>
  <Document>${body}</Document>
</kml>`;

const diagnosticCodes = (source: string): string[] =>
  doctorKml({ source }).diagnostics.map((diagnostic) => diagnostic.code);

describe('core API', () => {
  it('returns full KML info, bounds, estimated area, and a null length when no lines exist', () => {
    const result = getKmlInfo({
      source: kml(`
        <Style id="line-style" />
        <Folder>
          <name>Mission</name>
          <Placemark>
            <name>Point A</name>
            <styleUrl>#line-style</styleUrl>
            <Point><coordinates>139.7,35.6</coordinates></Point>
          </Placemark>
          <Placemark>
            <name>Area A</name>
            <Polygon>
              <outerBoundaryIs>
                <LinearRing>
                  <coordinates>139.7,35.6 139.8,35.6 139.8,35.7 139.7,35.6</coordinates>
                </LinearRing>
              </outerBoundaryIs>
            </Polygon>
          </Placemark>
        </Folder>
      `),
      sizeBytes: 123,
      fileName: 'sample.kml',
    });

    expect(result.fileName).toBe('sample.kml');
    expect(result.stats).toMatchObject({
      fileSizeBytes: 123,
      placemarkCount: 2,
      folderCount: 1,
      pointCount: 1,
      polygonCount: 1,
      lineStringCount: 0,
      styleCount: 1,
      networkLinkCount: 0,
      groundOverlayCount: 0,
      photoOverlayCount: 0,
      screenOverlayCount: 0,
      timeSpanCount: 0,
      timeStampCount: 0,
      crs: 'EPSG:4326 (KML default)',
      bounds: {
        west: 139.7,
        south: 35.6,
        east: 139.8,
        north: 35.7,
      },
    });
    expect(result.stats.estimatedAreaSquareMeters).toBeGreaterThan(0);
    expect(result.stats.estimatedLengthMeters).toBeNull();
  });

  it('estimates LineString length and leaves area null when there are no polygons', () => {
    const result = getKmlInfo({
      source: kml(`
        <Placemark>
          <name>Route</name>
          <LineString><coordinates>139.7,35.6 139.8,35.7</coordinates></LineString>
        </Placemark>
      `),
    });

    expect(result.stats.lineStringCount).toBe(1);
    expect(result.stats.estimatedLengthMeters).toBeGreaterThan(14_000);
    expect(result.stats.estimatedLengthMeters).toBeLessThan(15_000);
    expect(result.stats.estimatedAreaSquareMeters).toBeNull();
  });

  it('counts overlay, network link, and time elements', () => {
    const result = getKmlInfo({
      source: kml(
        '<NetworkLink/><GroundOverlay/><PhotoOverlay/><ScreenOverlay/><TimeSpan/><TimeStamp/>',
      ),
    });

    expect(result.stats).toMatchObject({
      networkLinkCount: 1,
      groundOverlayCount: 1,
      photoOverlayCount: 1,
      screenOverlayCount: 1,
      timeSpanCount: 1,
      timeStampCount: 1,
    });
  });

  it('returns empty stats and XML diagnostics for malformed XML', () => {
    const result = validateKml({ source: '<kml><Document></kml>', sizeBytes: 20 });

    expect(result.valid).toBe(false);
    expect(result.stats).toMatchObject({
      fileSizeBytes: 20,
      placemarkCount: 0,
      bounds: null,
      crs: null,
    });
    expect(result.diagnostics[0]?.code).toBe('XML_INVALID');
  });

  it('reports a missing kml root tag', () => {
    const result = validateKml({ source: '<Document />' });

    expect(result.valid).toBe(false);
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain('KML_ROOT_MISSING');
  });

  it('accepts valid coordinate altitude values', () => {
    const result = validateKml({
      source: kml(
        '<Placemark><name>A</name><Point><coordinates>139.7,35.6,120</coordinates></Point></Placemark>',
      ),
    });

    expect(result.valid).toBe(true);
    expect(result.diagnostics).toEqual([]);
  });

  it.each([
    ['missing latitude', '139.7'],
    ['too many coordinate parts', '139.7,35.6,10,1'],
    ['non-numeric longitude', 'east,35.6'],
    ['non-numeric altitude', '139.7,35.6,high'],
  ])('reports invalid coordinate format: %s', (_label, coordinates) => {
    const result = validateKml({
      source: kml(
        `<Placemark><name>A</name><Point><coordinates>${coordinates}</coordinates></Point></Placemark>`,
      ),
    });

    expect(result.valid).toBe(false);
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      'COORDINATE_FORMAT_INVALID',
    );
  });

  it('reports longitude and latitude range violations', () => {
    const result = validateKml({
      source: kml(
        '<Placemark><name>A</name><Point><coordinates>181,91</coordinates></Point></Placemark>',
      ),
    });

    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toEqual(
      expect.arrayContaining(['LONGITUDE_OUT_OF_RANGE', 'LATITUDE_OUT_OF_RANGE']),
    );
  });

  it('reports placemarks without supported geometry', () => {
    const result = validateKml({
      source: kml('<Placemark><name>No geometry</name></Placemark>'),
    });

    expect(result.valid).toBe(false);
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      'PLACEMARK_GEOMETRY_MISSING',
    );
  });

  it('reports polygons without rings', () => {
    const result = validateKml({
      source: kml('<Placemark><name>A</name><Polygon /></Placemark>'),
    });

    expect(result.valid).toBe(false);
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      'POLYGON_RING_MISSING',
    );
  });

  it('reports polygon point count and closure errors', () => {
    const result = validateKml({
      source: kml(`
        <Placemark>
          <name>A</name>
          <Polygon>
            <outerBoundaryIs>
              <LinearRing><coordinates>139,35 140,35 140,36</coordinates></LinearRing>
            </outerBoundaryIs>
          </Polygon>
        </Placemark>
      `),
    });

    expect(result.valid).toBe(false);
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toEqual(
      expect.arrayContaining(['POLYGON_TOO_FEW_POINTS', 'POLYGON_NOT_CLOSED']),
    );
  });

  it('keeps doctor valid when only warnings exist', () => {
    const result = doctorKml({
      source: kml('<Placemark><Point><coordinates>139,35</coordinates></Point></Placemark>'),
    });

    expect(result.valid).toBe(true);
    expect(result.geometryValid).toBe(true);
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      'PLACEMARK_NAME_EMPTY',
    );
  });

  it('reports duplicate, unused, and broken style references', () => {
    const result = doctorKml({
      source: kml(`
        <Style id="a" />
        <Style id="a" />
        <Style id="unused" />
        <Placemark>
          <name>A</name>
          <styleUrl>#missing</styleUrl>
          <Point><coordinates>139,35</coordinates></Point>
        </Placemark>
      `),
    });

    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toEqual(
      expect.arrayContaining(['STYLE_ID_DUPLICATE', 'STYLE_REFERENCE_BROKEN', 'STYLE_UNUSED']),
    );
  });

  it('does not mark external style URLs as broken local references', () => {
    const codes = diagnosticCodes(
      kml(`
        <Placemark>
          <name>A</name>
          <styleUrl>https://example.com/styles.kml#style</styleUrl>
          <Point><coordinates>139,35</coordinates></Point>
        </Placemark>
      `),
    );

    expect(codes).not.toContain('STYLE_REFERENCE_BROKEN');
  });

  it('reports unsupported altitude modes', () => {
    const codes = diagnosticCodes(
      kml(`
        <Placemark>
          <name>A</name>
          <Point>
            <altitudeMode>relativeToSeaFloor</altitudeMode>
            <coordinates>139,35,100</coordinates>
          </Point>
        </Placemark>
      `),
    );

    expect(codes).toContain('ALTITUDE_MODE_UNSUPPORTED');
  });

  it('does not report supported altitude modes', () => {
    const codes = diagnosticCodes(
      kml(`
        <Placemark>
          <name>A</name>
          <Point>
            <altitudeMode>absolute</altitudeMode>
            <coordinates>139,35,100</coordinates>
          </Point>
        </Placemark>
      `),
    );

    expect(codes).not.toContain('ALTITUDE_MODE_UNSUPPORTED');
  });

  it('reports empty folders and ignores folders with useful children', () => {
    const result = doctorKml({
      source: kml(`
        <Folder />
        <Folder><Placemark><name>A</name><Point><coordinates>139,35</coordinates></Point></Placemark></Folder>
      `),
    });

    const emptyFolderDiagnostics = result.diagnostics.filter(
      (diagnostic) => diagnostic.code === 'FOLDER_EMPTY',
    );
    expect(emptyFolderDiagnostics).toHaveLength(1);
    expect(emptyFolderDiagnostics[0]?.target).toBe('Folder #1');
  });

  it('reports gx extension usage', () => {
    const codes = diagnosticCodes(
      kml(
        '<Placemark><name>A</name><Point><coordinates>139,35</coordinates></Point><gx:Track /></Placemark>',
        ' xmlns:gx="http://www.google.com/kml/ext/2.2"',
      ),
    );

    expect(codes).toContain('GX_EXTENSION_USED');
  });

  it('reports abnormally high coordinate counts', () => {
    const coordinates = Array.from({ length: 100_001 }, (_value, index) => `139.${index},35`).join(
      ' ',
    );
    const codes = diagnosticCodes(
      kml(
        `<Placemark><name>A</name><LineString><coordinates>${coordinates}</coordinates></LineString></Placemark>`,
      ),
    );

    expect(codes).toContain('COORDINATE_COUNT_HIGH');
  });

  it('returns JSON-serializable doctor reports', () => {
    const result = analyzeKml({
      source: kml(
        '<Placemark><name>A</name><Point><coordinates>139,35</coordinates></Point></Placemark>',
      ),
    });

    expect(JSON.parse(JSON.stringify(result))).toEqual(result);
  });
});
