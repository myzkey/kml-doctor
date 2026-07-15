import { describe, expect, it } from 'vitest';
import {
  coordinatesEqual,
  extendBounds,
  parseCoordinateText,
  parseCoordinateToken,
  validateCoordinate,
} from './coordinates.js';

describe('coordinate utilities', () => {
  it('parses longitude and latitude tokens', () => {
    expect(parseCoordinateToken('139.7,35.6')).toEqual({
      longitude: 139.7,
      latitude: 35.6,
      raw: '139.7,35.6',
    });
  });

  it('parses altitude tokens', () => {
    expect(parseCoordinateToken('139.7,35.6,120')).toEqual({
      longitude: 139.7,
      latitude: 35.6,
      altitude: 120,
      raw: '139.7,35.6,120',
    });
  });

  it.each(['139.7', '139.7,', ',35.6', '139.7,35.6,120,1', 'east,35.6', '139.7,35.6,high'])(
    'rejects invalid token %s',
    (token) => {
      expect(parseCoordinateToken(token)).toBeNull();
    },
  );

  it('parses whitespace-separated coordinate text', () => {
    expect(parseCoordinateText(' 139,35\n140,36\t141,37 ')).toEqual([
      { longitude: 139, latitude: 35, raw: '139,35' },
      { longitude: 140, latitude: 36, raw: '140,36' },
      { longitude: 141, latitude: 37, raw: '141,37' },
    ]);
  });

  it('returns coordinate format diagnostics for null coordinates', () => {
    expect(validateCoordinate(null, 'coordinates #1.1', '139')).toEqual([
      {
        code: 'COORDINATE_FORMAT_INVALID',
        category: 'coordinate',
        severity: 'error',
        target: 'coordinates #1.1',
        message: 'Invalid coordinate format: 139',
      },
    ]);
  });

  it('returns range diagnostics', () => {
    expect(
      validateCoordinate(
        { longitude: 181, latitude: -91, raw: '181,-91' },
        'coordinates #1.1',
        '181,-91',
      ).map((diagnostic) => diagnostic.code),
    ).toEqual(['LONGITUDE_OUT_OF_RANGE', 'LATITUDE_OUT_OF_RANGE']);
  });

  it('extends empty and existing bounds', () => {
    const firstBounds = extendBounds(null, { longitude: 140, latitude: 36, raw: '140,36' });
    expect(firstBounds).toEqual({ west: 140, south: 36, east: 140, north: 36 });

    expect(extendBounds(firstBounds, { longitude: 139, latitude: 37, raw: '139,37' })).toEqual({
      west: 139,
      south: 36,
      east: 140,
      north: 37,
    });
  });

  it('compares longitude and latitude only', () => {
    expect(
      coordinatesEqual(
        { longitude: 139, latitude: 35, altitude: 10, raw: '139,35,10' },
        { longitude: 139, latitude: 35, altitude: 20, raw: '139,35,20' },
      ),
    ).toBe(true);
    expect(
      coordinatesEqual(
        { longitude: 139, latitude: 35, raw: '139,35' },
        { longitude: 140, latitude: 35, raw: '140,35' },
      ),
    ).toBe(false);
  });
});
