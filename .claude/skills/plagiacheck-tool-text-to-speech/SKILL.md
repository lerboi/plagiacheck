---
name: plagiacheck-tool-text-to-speech
description: How the Text to Speech tool works — the page at /text-to-speech using the browser SpeechSynthesis API. FREE, no API route, no tokens consumed. Browser support is required. Use when the user asks about text-to-speech, reading text aloud, voice playback, the rate/pitch controls, or wants to modify this tool.
---

# Text to Speech

Reads pasted text aloud using the browser's built-in `window.speechSynthesis`. **FREE** — no auth required, no tokens consumed, no API call.

**Status:** functional but **browser-dependent**. Voice availability and quality vary widely by OS/browser.

## Files

| File | Role |
|------|------|
| `app/text-to-speech/page.tsx` | The entire tool — UI + browser API logic |

There is **no `/api/text-to-speech` route**. Don't add one — the tool is intentionally free and offline.

## How it works

1. On mount, checks `window.speechSynthesis`. If missing → `isSupported=false`.
2. Loads available voices via `getVoices()`, filtered to English (`v.lang.startsWith("en")`).
3. The voice selector exposes three options: `"default"`, `"male"`, `"female"`. The page picks a matching voice by name (heuristic match on `male`/`david`/`james` for male, `female`/`samantha`/`zira` for female).
4. Speak builds a `SpeechSynthesisUtterance` with `rate` and `pitch` from the sliders, attaches `onstart` / `onend` / `onboundary` / `onerror` handlers, then calls `speechSynthesis.speak(utterance)`.
5. Progress bar uses `onboundary.charIndex / text.length`.
6. Pause / Resume / Stop wrap `speechSynthesis.pause/resume/cancel`.

## Browser caveats

- **Voices are OS-provided.** Windows/macOS/iOS/Android each ship different voice sets. The "male"/"female" mapping is a name-substring heuristic — it can pick the wrong voice on uncommon systems.
- **Chrome on desktop has been known to time out** speeches longer than ~15 seconds. The current code does not implement the chunking workaround. If a user reports cutoffs, that's the cause.
- **Mobile Safari requires a user gesture** before `speak()` will start — the existing button click satisfies this.

## Common edits

- Adding a true voice picker: replace the 3-option `VOICES` array with a list built from `availableVoices`.
- Adding language support: drop the `.lang.startsWith("en")` filter.
- Implementing chunking for long text: split on sentence boundaries and queue utterances.

## Why "FREE" — keep it that way

This tool is one of the platform's two free entry points (alongside `/word-counter`). The "FREE" badge in `components/nav.tsx` is set via `isFree: true`. Do not gate it behind tokens without explicit user direction.
