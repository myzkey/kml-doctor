#!/usr/bin/env node
import { readFile, stat } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import { doctorKml, getKmlInfo, validateKml } from '@kml-doctor/core';
import { formatDoctor, formatInfo, formatValidate } from './format.js';

type Command = 'info' | 'validate' | 'doctor';

interface CliArgs {
  command: Command;
  filePath: string;
  json: boolean;
}

const commands = new Set<Command>(['info', 'validate', 'doctor']);

const usage = `Usage:
  kml-doctor info <file.kml> [--json]
  kml-doctor validate <file.kml> [--json]
  kml-doctor doctor <file.kml> [--json]`;

const isCommand = (value: string): value is Command => commands.has(value as Command);

const parseArgs = (argv: string[]): CliArgs => {
  const json = argv.includes('--json');
  const positional = argv.filter((arg) => arg !== '--json');
  const [command, filePath] = positional;

  if (!command || !isCommand(command) || !filePath) {
    throw new Error(usage);
  }

  return { command, filePath, json };
};

const loadInput = async (filePath: string) => {
  const absolutePath = resolve(filePath);
  const [source, fileStat] = await Promise.all([
    readFile(absolutePath, 'utf8'),
    stat(absolutePath),
  ]);

  return {
    source,
    fileName: basename(filePath),
    sizeBytes: fileStat.size,
  };
};

const printJson = (value: unknown): void => {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
};

export const run = async (argv: string[]): Promise<number> => {
  const args = parseArgs(argv);
  const input = await loadInput(args.filePath);

  if (args.command === 'info') {
    const result = getKmlInfo(input);
    if (args.json) {
      printJson(result);
    } else {
      process.stdout.write(`${formatInfo(result)}\n`);
    }
    return 0;
  }

  if (args.command === 'validate') {
    const result = validateKml(input);
    if (args.json) {
      printJson(result);
    } else {
      process.stdout.write(`${formatValidate(result)}\n`);
    }
    return result.valid ? 0 : 1;
  }

  const result = doctorKml(input);
  if (args.json) {
    printJson(result);
  } else {
    process.stdout.write(`${formatDoctor(result)}\n`);
  }
  return result.valid ? 0 : 1;
};

run(process.argv.slice(2))
  .then((exitCode) => {
    process.exitCode = exitCode;
  })
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  });
