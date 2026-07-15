import { describe, expect, it } from 'vitest';
import { doctorKml, getKmlInfo, validateKml } from './index.js';

const validKml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
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
  </Document>
</kml>`;

describe('core API', () => {
  it('returns KML info', () => {
    const result = getKmlInfo({ source: validKml, sizeBytes: 123, fileName: 'sample.kml' });

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
    });
    expect(result.stats.estimatedAreaSquareMeters).toBeGreaterThan(0);
    expect(result.stats.estimatedLengthMeters).toBeNull();
    expect(result.stats.bounds).toEqual({
      west: 139.7,
      south: 35.6,
      east: 139.8,
      north: 35.7,
    });
  });

  it('validates syntax, coordinates, required tags, and polygons', () => {
    const result = validateKml({
      source: `<kml><Document><Placemark><Polygon><outerBoundaryIs><LinearRing><coordinates>181,35 139,91 139.5,35.5</coordinates></LinearRing></outerBoundaryIs></Polygon></Placemark></Document></kml>`,
    });

    expect(result.valid).toBe(false);
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toEqual(
      expect.arrayContaining([
        'LONGITUDE_OUT_OF_RANGE',
        'LATITUDE_OUT_OF_RANGE',
        'POLYGON_TOO_FEW_POINTS',
        'POLYGON_NOT_CLOSED',
      ]),
    );
  });

  it('adds operational doctor warnings', () => {
    const result = doctorKml({
      source: `<kml xmlns:gx="http://www.google.com/kml/ext/2.2"><Document><Style id="a"/><Style id="a"/><Folder/><Placemark><styleUrl>#missing</styleUrl><Point><coordinates>139,35</coordinates></Point><gx:Track/></Placemark></Document></kml>`,
    });

    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toEqual(
      expect.arrayContaining([
        'PLACEMARK_NAME_EMPTY',
        'STYLE_ID_DUPLICATE',
        'STYLE_REFERENCE_BROKEN',
        'STYLE_UNUSED',
        'FOLDER_EMPTY',
        'GX_EXTENSION_USED',
      ]),
    );
  });

  it('counts overlay, network link, and time elements', () => {
    const result = getKmlInfo({
      source: `<kml><Document><NetworkLink/><GroundOverlay/><PhotoOverlay/><ScreenOverlay/><TimeSpan/><TimeStamp/></Document></kml>`,
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

  it('reports XML errors', () => {
    const result = validateKml({ source: '<kml><Document></kml>' });

    expect(result.valid).toBe(false);
    expect(result.diagnostics[0]?.code).toBe('XML_INVALID');
  });
});
