# kml-doctor

`kml-doctor` is a CLI-first toolkit for inspecting and diagnosing KML files.

The project starts as KML-first, but its architecture is designed so additional geospatial formats such as GeoJSON, GPX, and Shapefile can reuse the same diagnostic engine over time.

Many KML tools focus on conversion. `kml-doctor` focuses on understanding why a geospatial file does not behave as expected.

Instead of only answering "is this valid?", it answers:

- Why doesn't Google Earth display this?
- Why won't QGroundControl import it?
- Why is DJI ignoring this feature?
- Which parts of this file are likely to cause interoperability problems?

The current MVP focuses on a reusable TypeScript core plus a thin CLI wrapper. Future Web UI, VSCode Extension, and npm library entry points should call the same core APIs instead of duplicating KML logic.

## Features

- `kml-doctor info <file.kml>`
- `kml-doctor validate <file.kml>`
- `kml-doctor doctor <file.kml>`
- `--json` output for all commands
- XML parsing, KML statistics, coordinate validation, polygon validation, and operational diagnostics
- ESM, TypeScript strict, Node.js 20+

## Monorepo Layout

```text
packages/
  core/          # XML parsing, KML analysis, validation, diagnostics
  cli/           # File I/O and command formatting only
  parser/        # Reserved future package boundary
  validator/     # Reserved future package boundary
  diagnostics/   # Reserved future package boundary
```

Planned package additions:

```text
packages/
  web/
  vscode/
```

The core is intentionally moving toward a rule-based diagnostic engine:

```text
packages/core/src/rules/
  polygon-validity.ts
  placemark-name.ts
  style-references.ts
  geometry.ts
```

Rules are registered as arrays, which keeps the door open for future profiles such as Google Earth, DJI, QGroundControl, or strict OGC-oriented checks.

## Setup

```bash
corepack enable
pnpm install
```

## Development

```bash
pnpm lint
pnpm test
pnpm build
pnpm check
```

Run the CLI locally after building:

```bash
pnpm build
node packages/cli/dist/index.js info sample.kml
node packages/cli/dist/index.js validate sample.kml
node packages/cli/dist/index.js doctor sample.kml --json
```

## Commands

### info

```bash
kml-doctor info sample.kml
```

Displays:

- File size
- Placemark count
- Folder count
- Point count
- Polygon count
- LineString count
- Style count
- CRS when inferable
- Bounding Box
- Estimated length
- Estimated area
- NetworkLink count
- GroundOverlay count
- PhotoOverlay count
- ScreenOverlay count
- TimeSpan count
- TimeStamp count

### validate

```bash
kml-doctor validate sample.kml
```

Validates:

- XML syntax
- Longitude and latitude range
- Polygon closure
- Polygon vertex count
- Coordinate format
- Required KML tags

Returns exit code `1` when validation errors exist.

### doctor

```bash
kml-doctor doctor sample.kml
```

Unlike `validate`, `doctor` focuses on real-world interoperability issues.

It detects problems that are technically valid KML but may fail or behave differently across tools such as Google Earth, DJI, QGroundControl, and other GIS software.

It currently checks operational diagnostics such as:

- Empty Placemark names
- Duplicate Style IDs
- Unused styles
- Broken style references
- gx extension usage
- Unsupported `altitudeMode`
- Empty folders
- Abnormally high coordinate counts

Returns exit code `1` when validation errors exist.

### JSON Output

```bash
kml-doctor doctor mission.kml --json
```

JSON output is intended for future Web UI, VSCode Extension, Electron, and npm library integrations.

Example:

```json
{
  "stats": {
    "placemarkCount": 53,
    "polygonCount": 12
  },
  "diagnostics": [
    {
      "code": "PLACEMARK_NAME_EMPTY",
      "category": "placemark",
      "severity": "warning",
      "message": "Placemark #12 has no name."
    }
  ],
  "xmlValid": true,
  "geometryValid": true,
  "valid": true
}
```

## Core API

```ts
import { doctorKml, getKmlInfo, validateKml } from '@kml-doctor/core';

const result = doctorKml({
  source: kmlText,
  fileName: 'mission.kml',
  sizeBytes: kmlText.length,
});
```

The core package accepts strings and returns plain JSON-compatible objects. File system access stays in `packages/cli`.

## Roadmap

- `repair` auto-fix common KML issues
  - close unclosed polygons
  - remove unused styles
  - fix duplicated IDs
  - save as `mission.fixed.kml`
- `convert`
- `diff`
- `stats`
- KMZ support
- GPX support
- GeoJSON support
- Shapefile support
- Web UI
- VSCode Extension
- npm library packaging
