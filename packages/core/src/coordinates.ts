import type { BoundingBox, Coordinate, KmlDiagnostic } from './types.js';

export const parseCoordinateToken = (token: string): Coordinate | null => {
  const parts = token.split(',');

  if (parts.length < 2 || parts.length > 3 || parts.some((part) => part.trim() === '')) {
    return null;
  }

  const longitude = Number(parts[0]);
  const latitude = Number(parts[1]);
  const altitudeText = parts[2];
  const altitude = altitudeText === undefined ? undefined : Number(altitudeText);

  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
    return null;
  }

  if (altitudeText !== undefined && !Number.isFinite(altitude)) {
    return null;
  }

  return altitude === undefined
    ? { longitude, latitude, raw: token }
    : { longitude, latitude, altitude, raw: token };
};

export const parseCoordinateText = (text: string): Array<Coordinate | null> =>
  text
    .trim()
    .split(/\s+/)
    .filter((token) => token.length > 0)
    .map(parseCoordinateToken);

export const validateCoordinate = (
  coordinate: Coordinate | null,
  target: string,
  rawFallback: string,
): KmlDiagnostic[] => {
  if (!coordinate) {
    return [
      {
        code: 'COORDINATE_FORMAT_INVALID',
        category: 'coordinate',
        severity: 'error',
        target,
        message: `Invalid coordinate format: ${rawFallback}`,
      },
    ];
  }

  const diagnostics: KmlDiagnostic[] = [];

  if (coordinate.longitude < -180 || coordinate.longitude > 180) {
    diagnostics.push({
      code: 'LONGITUDE_OUT_OF_RANGE',
      category: 'coordinate',
      severity: 'error',
      target,
      message: `Longitude ${coordinate.longitude} is outside -180 to 180.`,
    });
  }

  if (coordinate.latitude < -90 || coordinate.latitude > 90) {
    diagnostics.push({
      code: 'LATITUDE_OUT_OF_RANGE',
      category: 'coordinate',
      severity: 'error',
      target,
      message: `Latitude ${coordinate.latitude} is outside -90 to 90.`,
    });
  }

  return diagnostics;
};

export const extendBounds = (bounds: BoundingBox | null, coordinate: Coordinate): BoundingBox => {
  if (!bounds) {
    return {
      west: coordinate.longitude,
      south: coordinate.latitude,
      east: coordinate.longitude,
      north: coordinate.latitude,
    };
  }

  return {
    west: Math.min(bounds.west, coordinate.longitude),
    south: Math.min(bounds.south, coordinate.latitude),
    east: Math.max(bounds.east, coordinate.longitude),
    north: Math.max(bounds.north, coordinate.latitude),
  };
};

export const coordinatesEqual = (a: Coordinate, b: Coordinate): boolean =>
  a.longitude === b.longitude && a.latitude === b.latitude;
