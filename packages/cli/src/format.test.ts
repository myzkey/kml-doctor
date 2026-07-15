import { describe, expect, it } from 'vitest';
import { formatDoctor, formatInfo, formatValidate } from './format.js';
import type { KmlDoctorResult, KmlInfoResult, KmlValidateResult } from '@kml-doctor/core';

const baseStats = {
  fileSizeBytes: undefined,
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
};

describe('CLI formatters', () => {
  it('formats unknown values and zero bytes in info output', () => {
    const result: KmlInfoResult = {
      stats: {
        ...baseStats,
        fileSizeBytes: 0,
      },
    };

    expect(formatInfo(result)).toContain('File Size   : 0 B');
    expect(formatInfo(result)).toContain('CRS         : unknown');
    expect(formatInfo(result)).toContain('Bounds      : unknown');
  });

  it('formats KB, MB, km, and square km values', () => {
    const result: KmlInfoResult = {
      fileName: 'sample.kml',
      stats: {
        ...baseStats,
        fileSizeBytes: 1_536,
        estimatedLengthMeters: 1_500,
        estimatedAreaSquareMeters: 2_500_000,
        bounds: { west: 139, south: 35, east: 140, north: 36 },
      },
    };
    const output = formatInfo(result);

    expect(output).toContain('File: sample.kml');
    expect(output).toContain('File Size   : 1.5 KB');
    expect(output).toContain('Length      : 1.50 km');
    expect(output).toContain('Area        : 2.50 km²');
  });

  it('formats meter and square meter values', () => {
    const result: KmlInfoResult = {
      stats: {
        ...baseStats,
        estimatedLengthMeters: 900,
        estimatedAreaSquareMeters: 900,
      },
    };
    const output = formatInfo(result);

    expect(output).toContain('Length      : 900.0 m');
    expect(output).toContain('Area        : 900.0 m²');
  });

  it('formats valid validation output', () => {
    const result: KmlValidateResult = {
      valid: true,
      diagnostics: [],
      stats: baseStats,
    };

    expect(formatValidate(result)).toBe('✔ XML Valid\n✔ Geometry Valid');
  });

  it('formats invalid validation output', () => {
    const result: KmlValidateResult = {
      fileName: 'bad.kml',
      valid: false,
      stats: baseStats,
      diagnostics: [
        {
          code: 'LONGITUDE_OUT_OF_RANGE',
          category: 'coordinate',
          severity: 'error',
          target: 'coordinates #1.1',
          message: 'Longitude 181 is outside -180 to 180.',
        },
      ],
    };

    expect(formatValidate(result)).toContain(
      '✖ coordinates #1.1: Longitude 181 is outside -180 to 180.',
    );
  });

  it('formats doctor output with no issues', () => {
    const result: KmlDoctorResult = {
      stats: baseStats,
      diagnostics: [],
      xmlValid: true,
      geometryValid: true,
      valid: true,
    };

    expect(formatDoctor(result)).toContain('No issues found.');
  });

  it('formats doctor output with errors and warnings', () => {
    const result: KmlDoctorResult = {
      fileName: 'doctor.kml',
      stats: baseStats,
      xmlValid: true,
      geometryValid: false,
      valid: false,
      diagnostics: [
        {
          code: 'POLYGON_NOT_CLOSED',
          category: 'polygon',
          severity: 'error',
          message: 'Polygon ring is not closed.',
        },
        {
          code: 'PLACEMARK_NAME_EMPTY',
          category: 'placemark',
          severity: 'warning',
          message: 'Placemark name is empty.',
        },
      ],
    };
    const output = formatDoctor(result);

    expect(output).toContain('File: doctor.kml');
    expect(output).toContain('✖ Geometry Invalid');
    expect(output).toContain('Errors');
    expect(output).toContain('Warnings');
    expect(output).toContain('✖ Polygon ring is not closed.');
    expect(output).toContain('⚠ Placemark name is empty.');
  });
});
