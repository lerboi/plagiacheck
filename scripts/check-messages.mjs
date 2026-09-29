// Checks that every language in messages/ matches the English messages:
// same files, same keys, same {placeholders}, string-only leaves, no empty values.
// Run with `npm run i18n:check`.
import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"

const ROOT = new URL("../messages/", import.meta.url).pathname
const BASE = "en"

const languages = readdirSync(ROOT, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)

const jsonFiles = (lang) =>
  readdirSync(join(ROOT, lang))
    .filter((name) => name.endsWith(".json"))
    .sort()

/** Flattens nested messages to { "a.b.c": "text" }, recording shape problems as it goes. */
function flatten(value, path, out, problems) {
  if (typeof value === "string") {
    if (value.trim() === "") problems.push(`${path}: empty string`)
    out[path] = value
    return out
  }
  if (Array.isArray(value)) {
    problems.push(`${path}: arrays are not supported, use an object with keys`)
    return out
  }
  if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      if (key.includes(".")) problems.push(`${path}.${key}: keys must not contain "."`)
      flatten(child, path ? `${path}.${key}` : key, out, problems)
    }
    return out
  }
  problems.push(`${path}: unsupported value ${JSON.stringify(value)}`)
  return out
}

/** The top-level ICU argument names in a message, e.g. "{count, plural, ...} {name}" -> count,name. */
function argumentNames(message) {
  const names = new Set()
  let depth = 0
  for (let i = 0; i < message.length; i++) {
    const char = message[i]
    if (char === "'") {
      // ICU quoting: '{' ... ' is literal text.
      const close = message.indexOf("'", i + 1)
      if (close > i + 1 && /[{}]/.test(message[i + 1])) {
        i = close
        continue
      }
    }
    if (char === "{") {
      if (depth === 0) {
        const match = /^\{\s*([A-Za-z0-9_]+)/.exec(message.slice(i))
        if (match) names.add(match[1])
      }
      depth++
    } else if (char === "}") {
      depth--
    }
  }
  return [...names].sort().join(",")
}

const problems = []
const baseFiles = jsonFiles(BASE)

for (const lang of languages) {
  const files = jsonFiles(lang)
  for (const file of baseFiles) if (!files.includes(file)) problems.push(`${lang}/${file}: missing file`)
  for (const file of files) if (!baseFiles.includes(file)) problems.push(`${lang}/${file}: not in ${BASE}/`)
}

for (const file of baseFiles) {
  const read = (lang) => {
    const shape = []
    const flat = flatten(JSON.parse(readFileSync(join(ROOT, lang, file), "utf8")), "", {}, shape)
    for (const problem of shape) problems.push(`${lang}/${file}: ${problem}`)
    return flat
  }
  const base = read(BASE)

  for (const lang of languages.filter((l) => l !== BASE)) {
    let other
    try {
      other = read(lang)
    } catch (error) {
      problems.push(`${lang}/${file}: ${error.message}`)
      continue
    }
    for (const key of Object.keys(base)) {
      if (!(key in other)) {
        problems.push(`${lang}/${file}: missing key ${key}`)
      } else if (argumentNames(base[key]) !== argumentNames(other[key])) {
        problems.push(
          `${lang}/${file}: ${key} placeholders differ (${BASE}: {${argumentNames(base[key])}} vs ${lang}: {${argumentNames(other[key])}})`
        )
      }
    }
    for (const key of Object.keys(other)) {
      if (!(key in base)) problems.push(`${lang}/${file}: extra key ${key}`)
    }
  }
}

if (problems.length > 0) {
  console.error(`Message check failed (${problems.length}):\n  ${problems.join("\n  ")}`)
  process.exit(1)
}

const count = Object.keys(
  baseFiles.reduce((all, file) => flatten(JSON.parse(readFileSync(join(ROOT, BASE, file), "utf8")), file, all, []), {})
).length
console.log(`Messages OK: ${languages.join(", ")} match across ${baseFiles.length} files, ${count} keys.`)
