---
name: plagiacheck-components
description: Inventory of Plagiacheck's React components — the nav with the categorized tools mega-menu, ToolPageHeader and ToolSignInPrompt for tool pages, FAQ, Hero, FeatureShowcase, the Profile dropdown, the Billing badges, and the shadcn/ui kit. Use when the user asks where a UI piece lives, wants to add a new tool page header, modify the nav, change the tools mega-menu, or asks about the component layout.
---

# Plagiacheck Components

The component tree is split into three layers:
1. **Page-level building blocks** in `components/` (nav, hero, FAQ, etc.)
2. **Tool-page primitives** (header + sign-in prompt)
3. **shadcn/ui kit** in `components/ui/`

## Page-level building blocks (`components/`)

| File | What it does |
|------|--------------|
| `nav.tsx` | Top nav with the **3-category Tools mega-menu** (Writing / Image & Visual / Voice & Audio), token badge, profile dropdown, mobile drawer |
| `Hero.tsx` | Marketing hero (used in some pages) |
| `FAQ.tsx` | Accordion-based FAQ block, used at the bottom of every tool page |
| `FeatureShowcase.tsx` | "Features" grid section |
| `footer.tsx` | Site footer |
| `PageSkeleton.tsx` | Loading skeleton wrapper |
| `plagiarism-results.tsx` | Used only by the home page — renders the plagiarism score + matches |
| `theme-provider.tsx` | Wraps `next-themes` provider; default theme is dark |
| `theme-toggle.tsx` | Light/dark toggle button |
| `tool-page-header.tsx` | Title + description + icon + category pill at the top of each tool page |
| `tool-signin-prompt.tsx` | "Sign in to use this tool" inline card shown when an unauthenticated user clicks a tool action |

## Categorized nav structure

`components/nav.tsx` defines `toolCategories` — the source of truth for the mega-menu. It has 3 categories:

- **Writing Tools** (7): Plagiarism Checker, AI Detector, AI Humanizer, Paraphraser, Summarizer, Grammar Checker, Word Counter
- **Image & Visual** (4): Image to Text, Infographic Generator, Thumbnail Generator, Chart Generator (all marked `usesImageTokens: true`)
- **Voice & Audio** (4): Speech to Text, Text to Speech (`isFree: true`), Voice to Essay, Audio Summarizer

When you add a new tool:
1. Add a page at `app/<tool>/page.tsx`.
2. Add an entry to the appropriate category in `nav.tsx` with `name`, `href`, `icon` (lucide-react), `desc`, `color`, `bgColor`, plus optional `isFree` / `usesImageTokens` flags.
3. Add it to the home-page `tools` array in `app/page.tsx` if you want it on the public showcase grid (only the most prominent 9 are shown).

## Tool-page primitives

Every tool page follows the same skeleton:

```tsx
<div className="min-h-screen bg-background">
  <Nav />
  <ToolPageHeader
    icon={...}
    title="..."
    description="..."
    category="Writing Tools"  // or "Image & Visual", "Voice & Audio"
    gradient="from-cyan-500/[0.07]"
    iconColor="text-cyan-500"
    iconBg="bg-cyan-500/10 border-cyan-500/20"
    categoryColor="text-cyan-600 dark:text-cyan-400"
  />
  <section className="container max-w-5xl mx-auto px-4 py-6 space-y-4">
    {needsSignIn && !user && <ToolSignInPrompt />}
    {/* tool UI */}
  </section>
  <FAQ />
</div>
```

Don't deviate from this without a strong reason — consistency across the 14+ tool pages is a deliberate design constraint.

## Feature components

| Path | Purpose |
|------|---------|
| `components/PricingPage/CustomPlanSlider.tsx` | The "custom token amount" slider on `/pricing` |
| `components/PricingPage/TrustSection.tsx` | Testimonials/trust block |
| `components/Billing/Badge.tsx` | Payment status badges (paid/past-due/canceled) on `/billing` |
| `components/Profile/Avatar.tsx` | User avatar with initials fallback |
| `components/Profile/ProfileDropdown.tsx` | The user menu in the nav |

## shadcn/ui kit (`components/ui/`)

Standard Radix-based primitives. Available:

- `accordion`, `avatar`, `button`, `card`, `dropdown-menu`, `input`, `label`, `progress`, `select`, `skeleton`, `slider`, `tabs`, `textarea`, `toast`, `toaster`

Configured via `components.json` with the `@/` path alias. To add a new shadcn component, run the appropriate `shadcn-ui` CLI command (or hand-port from the docs into the existing patterns).

## Common edits

- **Restyle the nav menu:** edit `components/nav.tsx`. The mega-menu width is hardcoded at `w-[680px]` and lays out 3 columns of tool links.
- **Change the FAQ:** edit `components/FAQ.tsx`. The questions are defined inline as an array of `{ q, a }` objects.
- **Add a new shadcn primitive:** put it in `components/ui/` and follow the existing forwardRef + cva patterns.
