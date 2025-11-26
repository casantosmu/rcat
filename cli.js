#!/usr/bin/env node

import path from "node:path";
import fs from "node:fs";
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
      --dotfiles, -D  Include dotfiles (hidden files)
      --list,     -l  Only list files without printing content

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
      dotfiles: {
        type: "boolean",
        shortFlag: "D",
        default: false,
      },
      list: {
        type: "boolean",
        shortFlag: "l",
        default: false,
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
  dot: cli.flags.dotfiles, 
});

for await (const relativePath of stream) {
  const absolutePath = path.join(cwd, relativePath);

  const isBinary = isBinaryPath(absolutePath);
  if (isBinary) {
    continue;
  }

  if (cli.flags.list) {
    console.log(relativePath);
    continue; 
  }

  console.log(`\n--- ${relativePath} ---`);

  const readStream = fs.createReadStream(absolutePath, "utf8");

  for await (const chunk of readStream) {
    const canWrite = process.stdout.write(chunk);

    if (!canWrite) {
      await new Promise((resolve) => process.stdout.once("drain", resolve));
    }
  }
}
