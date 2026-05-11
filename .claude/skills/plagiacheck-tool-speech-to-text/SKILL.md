---
name: plagiacheck-tool-speech-to-text
description: How the Speech to Text tool works — the page at /speech-to-text using the browser Web Speech API for transcription, and the /api/speech-to-text route for Mistral-powered cleanup. Browser support is required (Chrome/Edge/Safari only). Use when the user asks about speech recognition, voice transcription, the microphone button, or wants to modify the speech-to-text tool.
---

# Speech to Text

Records the user's voice via the browser's Web Speech API and sends the raw transcript to Mistral for cleanup.

**Status:** functional but **browser-dependent** — only Chrome, Edge, and Safari expose `webkitSpeechRecognition` / `SpeechRecognition`. Firefox and many mobile browsers will see a "not supported" notice.

## Files

| File | Role |
|------|------|
| `app/speech-to-text/page.tsx` | Tool page — recording, live transcript, cleanup trigger |
| `app/api/speech-to-text/route.ts` | API route — Mistral cleanup (action: "clean") |

## How it works

1. Page checks for `(window as any).SpeechRecognition || webkitSpeechRecognition`. If absent → `setIsSupported(false)`.
2. On record, instantiates `SpeechRecognition` with `continuous=true`, `interimResults=true`, `lang="en-US"`.
3. As the user speaks, interim results stream into the textarea and final results are appended to `rawTranscript`.
4. When the user clicks "Clean Up", the page POSTs the transcript to `/api/speech-to-text` (`action: "clean"`).
5. The route deducts text tokens, calls Mistral with a "transcript cleaner" system prompt, returns `{ cleanedText, changes }`.

## API contract

```
POST /api/speech-to-text
{
  "transcript": "...",
  "action": "clean" | "format"
}
```

Returns `{ result: { cleanedText, changes }, remainingTokens, tokensUsed }`.

- `action: "clean"` — remove filler words, fix recognition errors, paragraph splits, light grammar fixes.
- `action: "format"` — only adds punctuation/capitalization/paragraphs without changing words.

## Token cost

`Math.ceil(transcript.length / 6)` text tokens (the cleanup is the billable step). Recording itself is free — no tokens are charged for the Web Speech API call, since it runs in the browser.

## Browser caveats

- **Firefox is unsupported.** The page shows a banner via `isSupported=false`.
- **HTTPS is required** for `getUserMedia` in browsers. The production site is on HTTPS; localhost is exempt.
- **Quality is browser-dependent.** Chrome's recognition engine is the default reference; results vary on Safari.

## Common edits

- Switching languages: change `recognition.lang = "en-US"` and add a language picker.
- The "live transcript" textarea is editable — the user can fix recognition mistakes before sending to cleanup.
