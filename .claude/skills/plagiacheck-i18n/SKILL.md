---
name: plagiacheck-i18n
description: How English / Simplified Chinese translation works in Plagiacheck — next-intl v4 without locale routing, the NEXT_LOCALE cookie, the per-namespace messages/{en,zh} JSON files, typed keys, the language toggle in the nav, the API error translation helper, and the text-only rule for payment pages. Use when adding or changing any user-visible text, adding a page or tool, touching the language toggle, or when the user asks about translations, Chinese, locales, or i18n.
---

# Plagiacheck i18n (English + Simplified Chinese)

Every user-visible string goes through next-intl. English is the source language; Chinese must have exactly the same keys.

## How the language is chosen

- **No locale in the URL.** There is no `app/[locale]` segment and no i18n middleware; `middleware.ts` only handles CORS for `/api/*`.
- `i18n/request.ts` picks the locale per request: `NEXT_LOCALE` cookie, then the browser's `Accept-Language` (any `zh-*` -> `zh`), then `en`.
- `i18n/actions.ts` — `setUserLocale()` server action writes the cookie for a year. Setting a cookie from a server action re-renders the current route in place, so switching language keeps typed text.
- `app/layout.tsx` sets `<html lang>` from `localeTags` and wraps the app in `NextIntlClientProvider`.
- Trade-off: one URL per page, so search engines index English only.

## Files

| Path | Purpose |
|------|---------|
| `i18n/config.ts` | `locales`, `defaultLocale`, `LOCALE_COOKIE`, `localeNames` (each name in its own language), `localeTags` (`en-US` / `zh-CN`, used for `<html lang>`, Web Speech and dates) |
| `messages/en/*.json`, `messages/zh/*.json` | One file per namespace. `summarizer.json` -> `"Summarizer"`, `plagia-ai.json` -> `"PlagiaAi"` |
| `messages/{en,zh}/index.ts` | Registers every namespace file. The zh index is typed `typeof en`, so a missing key fails `tsc` |
| `global.d.ts` | Declares next-intl's `AppConfig` (`Locale`, `Messages`), so every `t("key")` is type-checked |
| `scripts/check-messages.mjs` | `npm run i18n:check` — same files, same keys, same `{placeholders}`, no arrays, no empty strings |
| `components/language-toggle.tsx` | `LanguageToggle` (desktop icon button next to the theme toggle) and `LanguageMenuRow` (mobile sheet row, where History used to be) |
| `lib/i18n/api-errors.ts` | `useApiErrorMessage()` — translates the English error messages the API routes return |

Shared namespaces: `Common`, `Nav` (nav, token badges, profile menu, theme and language labels), `ToolCatalog` (every tool's name and short description, category labels), `Faq` (default FAQ), `Shell` (metadata, footer, error/404 pages, tool sign-in prompt), `ApiErrors`.

## Adding or changing text

1. Add the key to `messages/en/<ns>.json` with the exact English, and to `messages/zh/<ns>.json` with the Chinese.
2. Client component: `const t = useTranslations("Ns")` at the top of the component body. Server component: `useTranslations` if not async, `await getTranslations("Ns")` if async. Page metadata: `generateMetadata()` with `getTranslations`.
3. New namespace: create both JSON files and register them in both `index.ts` files.
4. Run `npm run i18n:check` and `npx tsc --noEmit`.

Rules of thumb:
- **No arrays in messages.** Lists use objects keyed by id plus an `as const` key list in code, e.g. `FAQ_KEYS.map((k) => ({ question: t(`faq.${k}.question`), ... }))`.
- ICU syntax: `{name}`, `{count, plural, one {# word} other {# words}}`; rich text via `t.rich("key", { b: (c) => <strong>{c}</strong> })`. No bare `<` / `>`; write literal braces as `'{'`.
- Translate the label, never the value: mode/tone/tool ids, option values, `planName` and anything sent to an API, stored, or compared in logic stays English.
- Prompts and tool declarations sent to Gemini (`lib/plagia-ai/tools.ts`, system prompts in API routes) stay English; the models already answer in the user's language.
- Dates: `toLocaleDateString(localeTags[locale], ...)` (keeps the browser time zone). Don't use `useFormatter` for dates — the server's time zone would leak into the client.
- Speech recognition uses `localeTags[locale]` as `recognition.lang`.

## API errors

The API routes answer in English and were deliberately left unchanged. In a component:

```ts
const apiError = useApiErrorMessage()
// ...
description: apiError(errorOrResponseBody, t("errors.fallback"))
```

In English it returns the server text unchanged (or the fallback). In Chinese it translates known messages (and the `INSUFFICIENT_TOKENS` / `INSUFFICIENT_IMAGE_TOKENS` codes), keeps text that is already Chinese, and otherwise shows the translated fallback. When a route gets a new user-facing error message, add it to `KNOWN_MESSAGES` and `ApiErrors`.

## Payment pages: text only

`app/pricing`, `app/billing`, `components/PricingPage/*` and the `app/api/*-success` pages are translated, but the only allowed edits there are replacing a text literal with a `t()` lookup plus the import/hook line. Prices, price IDs, `plan.name` (sent to checkout), handlers, state, effects and dependency arrays must not change. See `plagiacheck-payments` for the restricted API routes, which are never edited.

## Chinese style

Simplified Chinese, mainland usage. tokens -> 积分 (文本积分 / 图片积分); sign in -> 登录; sign up -> 注册. Plagiacheck, PlagiaAI and the plan names Plus / Premium stay in Latin script. Full-width punctuation in Chinese sentences, and a space between Chinese and Latin letters or numbers ("AI 检测", "1,000 积分").
