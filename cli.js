#!/usr/bin/env node

import path from "node:path";
import fs from "node:fs";
import { pipeline } from "node:stream/promises";
import meow from "meow";
import { globbyStream } from "globby";
import isBinaryPath from "is-binary-path";

const cli = meow(
  `
    Usage
      $ rcat [path]

    Options
      --includes, -i  Glob patterns to include
      --excludes, -e  Glob patterns to exclude
      --depth,    -d  Maximum recursion depth

    Examples
      # Output all text files in the current directory
      $ rcat

      # Output only .ts and .tsx files in the src directory
      $ rcat ./src --includes "**/*.ts" --includes "**/*.tsx"

      # Output everything except test files and the dist folder
      $ rcat --excludes "**/*.test.ts" --excludes "dist/**"

      # Output files only 2 levels deep
      $ rcat --depth 2
  `,
  {
    importMeta: import.meta,
    flags: {
      includes: {
        isMultiple: true,
        type: "string",
        shortFlag: "i",
        default: ["**/*"],
      },
      excludes: {
        isMultiple: true,
        type: "string",
        shortFlag: "e",
      },
      depth: {
        type: "number",
        shortFlag: "d",
      },
    },
  },
);

if (cli.input.length > 1) {
  console.error("Too many arguments");
  process.exit(1);
}

const cwd = cli.input[0] ?? process.cwd();

const stream = globbyStream(cli.flags.includes, {
  cwd,
  deep: cli.flags.depth,
  followSymbolicLinks: false,
  gitignore: true,
  ignore: cli.flags.excludes,
});

for await (const relativePath of stream) {
  const absolutePath = path.join(cwd, relativePath);

  const isBinary = isBinaryPath(absolutePath);
  if (isBinary) {
    continue;
  }

  console.log(`\n--- ${relativePath} ---`);

  const readStream = fs.createReadStream(absolutePath, "utf8");
  await pipeline(readStream, process.stdout, { end: false });
}
