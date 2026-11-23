// bring-the-humans-03 entrypoint.
//
// The entry for this bounty is a TikTok video posted by the user. This
// program's single job is to hand the grader a pointer to that video:
// it copies the VIDEO.json file that ships with this repo into the
// output directory the grader reads from.

import { copyFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const POINTER_FILE = "VIDEO.json";

// The pointer file normally sits next to this script. When the grader
// sets MAKEFUN_BOT_DIR, the repo files live there instead, so check
// that location first.
function locatePointerFile(): string {
  const botDir = process.env.MAKEFUN_BOT_DIR;
  if (botDir) {
    const candidate = join(botDir, POINTER_FILE);
    if (existsSync(candidate)) {
      return candidate;
    }
  }
  const scriptDir = dirname(fileURLToPath(import.meta.url));
  return join(scriptDir, POINTER_FILE);
}

// Output goes to MAKEFUN_OUTPUT_DIR when the grader provides one and
// falls back to the conventional /output mount otherwise.
function outputPath(): string {
  const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
  return join(outDir, POINTER_FILE);
}

function run(): number {
  const source = locatePointerFile();
  if (!existsSync(source)) {
    console.error(`main: cannot find ${POINTER_FILE} (looked for ${source})`);
    return 1;
  }

  const destination = outputPath();
  try {
    mkdirSync(dirname(destination), { recursive: true });
    copyFileSync(source, destination);
  } catch (err) {
    console.error(`main: failed to write ${destination}: ${err.message}`);
    return 1;
  }

  // Verify what landed in the output directory: it must be valid JSON
  // carrying a non-empty "url" string, otherwise the grader would have
  // nothing to score even though the copy itself reported success.
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(destination, "utf8"));
  } catch (err) {
    console.error(`main: copied file is not valid JSON: ${err.message}`);
    return 1;
  }
  if (!parsed || typeof parsed.url !== "string" || parsed.url.length === 0) {
    console.error(`main: copied ${POINTER_FILE} has no usable "url" field`);
    return 1;
  }
  // A non-empty string is not enough: the grader will try to open this
  // link, so reject anything that is not a well-formed https URL here
  // rather than letting a typo'd pointer sail through as a "success".
  try {
    const url = new URL(parsed.url);
    if (url.protocol !== "https:") {
      throw new Error(`unexpected protocol "${url.protocol}"`);
    }
  } catch (err) {
    console.error(`main: copied ${POINTER_FILE} has an invalid "url": ${err.message}`);
    return 1;
  }

  console.log(`main: copied ${source} -> ${destination} (url: ${parsed.url})`);
  return 0;
}


process.exit(run());
