import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { run } from './index.js';

const validKml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <Placemark><name>A</name><Point><coordinates>139,35</coordinates></Point></Placemark>
  </Document>
</kml>`;

const invalidKml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <Placemark><name>A</name><Point><coordinates>181,35</coordinates></Point></Placemark>
  </Document>
</kml>`;

describe('CLI run', () => {
  let tempDir: string;
  let output = '';

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'kml-doctor-test-'));
    output = '';
    vi.spyOn(process.stdout, 'write').mockImplementation((chunk: string | Uint8Array) => {
      output += chunk.toString();
      return true;
    });
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await rm(tempDir, { recursive: true, force: true });
  });

  const writeKml = async (name: string, source: string): Promise<string> => {
    const filePath = join(tempDir, name);
    await writeFile(filePath, source, 'utf8');
    return filePath;
  };

  it('prints info and exits with 0', async () => {
    const filePath = await writeKml('sample.kml', validKml);

    await expect(run(['info', filePath])).resolves.toBe(0);
    expect(output).toContain('File: sample.kml');
    expect(output).toContain('Placemark   : 1');
    expect(output).toContain('Bounds      : west=139, south=35, east=139, north=35');
  });

  it('prints JSON info', async () => {
    const filePath = await writeKml('sample.kml', validKml);

    await expect(run(['info', filePath, '--json'])).resolves.toBe(0);
    const parsed = JSON.parse(output) as { stats: { placemarkCount: number } };
    expect(parsed.stats.placemarkCount).toBe(1);
  });

  it('returns 0 for valid KML validation', async () => {
    const filePath = await writeKml('valid.kml', validKml);

    await expect(run(['validate', filePath])).resolves.toBe(0);
    expect(output).toContain('✔ XML Valid');
    expect(output).toContain('✔ Geometry Valid');
  });

  it('returns 1 and prints validation errors for invalid KML', async () => {
    const filePath = await writeKml('invalid.kml', invalidKml);

    await expect(run(['validate', filePath])).resolves.toBe(1);
    expect(output).toContain('Validation Errors');
    expect(output).toContain('Longitude 181 is outside -180 to 180.');
  });

  it('prints validation JSON and returns 1 for invalid KML', async () => {
    const filePath = await writeKml('invalid.kml', invalidKml);

    await expect(run(['validate', filePath, '--json'])).resolves.toBe(1);
    const parsed = JSON.parse(output) as {
      valid: boolean;
      diagnostics: Array<{ code: string }>;
    };
    expect(parsed.valid).toBe(false);
    expect(parsed.diagnostics).toContainEqual(
      expect.objectContaining({ code: 'LONGITUDE_OUT_OF_RANGE' }),
    );
  });

  it('prints doctor output in human-readable mode', async () => {
    const filePath = await writeKml(
      'warning.kml',
      '<kml><Document><Placemark><Point><coordinates>139,35</coordinates></Point></Placemark></Document></kml>',
    );

    await expect(run(['doctor', filePath])).resolves.toBe(0);
    expect(output).toContain('✔ XML Valid');
    expect(output).toContain('Warnings');
    expect(output).toContain('⚠ Placemark #1: Placemark name is empty.');
    expect(output).toContain('Summary');
  });

  it('prints doctor JSON and returns 0 when only warnings exist', async () => {
    const filePath = await writeKml(
      'warning.kml',
      '<kml><Document><Placemark><Point><coordinates>139,35</coordinates></Point></Placemark></Document></kml>',
    );

    await expect(run(['doctor', filePath, '--json'])).resolves.toBe(0);
    const parsed = JSON.parse(output) as {
      valid: boolean;
      diagnostics: Array<{ code: string; severity: string }>;
    };
    expect(parsed.valid).toBe(true);
    expect(parsed.diagnostics).toContainEqual(
      expect.objectContaining({ code: 'PLACEMARK_NAME_EMPTY', severity: 'warning' }),
    );
  });

  it('returns 1 from doctor when validation errors exist', async () => {
    const filePath = await writeKml('invalid.kml', invalidKml);

    await expect(run(['doctor', filePath])).resolves.toBe(1);
    expect(output).toContain('✖ Geometry Invalid');
    expect(output).toContain('Errors');
    expect(output).toContain('Longitude 181 is outside -180 to 180.');
  });

  it('throws usage text for invalid arguments', async () => {
    await expect(run([])).rejects.toThrow('Usage:');
  });

  it('throws for missing files', async () => {
    await expect(run(['info', join(tempDir, 'missing.kml')])).rejects.toThrow();
  });
});
