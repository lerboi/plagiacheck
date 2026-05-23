# UI polish + ChatGPT-style layout spec

**Status:** active spec. Referenced by FE-13, FE-14, FE-15.
**Authored:** 2026-05-24, mid-loop pause for hand layout work.
**Read order for the loop:** read this file in full before starting FE-13, FE-14, or FE-15. It documents the design principles established mid-loop so future iterations don't drift.

---

## Why this file exists

The user paused the loop after FE-10 to fix two complaints by hand:
1. The PlagiaAI page layout (sidebar + chat column) looked off and didn't feel like ChatGPT.
2. Buttons across the site had no click feedback; only a handful of surfaces had hover/scroll motion.

The fix-up session in commit/branch `auto/fix-home-viewport-fill` (or a follow-on user-named branch) implemented:
- A ChatGPT-style 3-zone layout (Nav → sidebar flush left → centered chat column).
- A global `:active scale(0.97)` press feedback on every native button.
- Scroll-reveal entrances on the homepage marketing sections (HowItWorks, TrustSignals, OneChatAllTools).
- A smooth width transition on the conversation sidebar collapse.
- Hover lifts on suggestion chips, marketing cards, all-tools tool cards.
- A framer-motion mobile menu open/close on the nav.

This spec captures the principles so future FE items maintain them.

---

## Layout principles (PlagiaAI surface only)

### Container structure

```
<div min-h-screen flex flex-col>
  <Nav />                                  ← 3.5rem sticky
  <section flex-1 min-h-[calc(100svh-3.5rem)]>
    <div flex-1 flex flex-row min-h-0>     ← NO max-width container here
      <ConversationSidebar />              ← flush left, full section height
      <div flex-1 flex flex-col min-w-0>
        <div max-w-3xl mx-auto px-4 py-6>  ← chat content's own max-width
          ... chat ...
        </div>
      </div>
    </div>
  </section>
  {marketing or FAQ}
</div>
```

### Rules

1. **The chat-row flex container has no `max-w-*`.** The sidebar must be flush against the viewport edge, like ChatGPT. Constraining the row inside `max-w-7xl` (an earlier hack) pushed the sidebar inside a centered box and looked broken.
2. **The chat column gets its OWN `max-w-3xl mx-auto` internally.** The chat content centers within the column flex slot. The visual asymmetry (chat sits right of viewport center when sidebar is open) is intentional and matches ChatGPT.
3. **Do not add a "mirror spacer" on the right** to force viewport-center alignment. ChatGPT doesn't do this either; the sidebar earns its real estate.
4. **Section uses `min-h-[calc(100svh-3.5rem)]`** (small viewport height) so the chat region fills the viewport below the sticky nav without overshoot on iOS Safari.
5. **Sidebar uses `transition-[width] duration-200 ease-out`** between collapsed (`w-14`) and expanded (`w-[260px]`) states.

### What goes in the sidebar

- Header row: "New chat" pill (expanded) OR collapse-toggle + new-chat icons stacked (collapsed).
- AnimatePresence-wrapped conversation list (fades in/out on collapse).
- No internal `pr-3 mr-1` artefacts. Border-right defines the right edge; chat column starts cleanly after.

### What NOT to do

- Don't reintroduce `container max-w-*` on the chat-row flex container.
- Don't add right-side spacers.
- Don't constrain the sidebar inside a centered container.
- Don't make the chat itself wider than `max-w-3xl` — readability beats fill.

---

## Animation principles (site-wide)

### Cost discipline

- **Transform + opacity only.** No `width`/`height`/`top`/`left` animations on layout-affecting properties. Width animation on the sidebar is the lone exception because the sidebar is `shrink-0` and doesn't reflow text inside.
- **≤200ms for most interactions, ≤300ms for entrances, ≤500ms for marketing scroll-reveal.** Anything longer feels sluggish on a mobile.
- **Respect `prefers-reduced-motion: reduce`** — the global `button:active` rule already does. Any new framer-motion entrance should fall back to instant on this media query (use `useReducedMotion()` from framer-motion when in doubt, OR scope the motion to a CSS class that's media-query-gated).

### The four patterns in use

1. **Press feedback** (`button:active { transform: scale(0.97); }` in globals.css) — universal.
2. **Hover lift** (`hover:-translate-y-0.5` + transform-included transition) — cards, chips, links.
3. **Scroll-reveal entrance** (framer-motion `whileInView` with `viewport={{ once: true, margin: "-80px" }}`) — marketing sections.
4. **Mount entrance** (framer-motion `initial` + `animate`) — empty state hero, chat messages (already in place from FS-03), suggestion chips.

### Reusable component

`components/plagia-ai/MarketingReveal.tsx` wraps any block in a `whileInView` reveal. Use it for new marketing sections instead of repeating the motion props inline.

### Where motion is still missing (work for FE-13 / FE-14)

- ToolPageHeader entrance (every tool page bar `/`).
- Tool page result panel entrance after a successful API call.
- AI Detector PDF download — no toast or confirmation animation.
- Pricing card hover (already has `hover:scale-105` but the transition is generic `transition-all` — should be scoped to color, border, transform).
- Reset-password / forgot-password — page-level entrance.

---

## Restricted areas (unchanged from RULES.md)

All standard restrictions apply. **Specifically:** the global `button:active` rule in `app/globals.css` does NOT affect the restricted payment routes because those are server-only. Any FE item touching `app/pricing/page.tsx` can change visual layout but never `priceId` or dollar strings.

---

## When picking FE-13 / FE-14 / FE-15

Read this file, then check `improvements.md` for the specific item's acceptance criteria. The four-pillar charter from `improvements.md` PLAGIA-AI EVOLUTION section still applies: only motion / layout work that serves intent-accuracy, conversational-quality, speed-and-reliability, or frictionless-interaction.

A motion change that's *just* decoration without serving a pillar is **out of scope**. Examples:
- ✅ "Scroll-reveal the OneChatAllTools section so users notice the tool list" → serves frictionless-interaction (discoverability).
- ✅ "Animate the sidebar collapse so the user understands what happened" → serves frictionless-interaction.
- ❌ "Add particles to the homepage" → no pillar served, no.
- ❌ "Sparkle animation on tokens" → fluff.

---

## Out of scope

- Refactoring framer-motion to a different motion library.
- Adding a heavyweight animation system (Lottie, GSAP).
- Page-route transitions (P2-01 in the backlog — defer until that item is picked).
- Replacing shadcn primitives.
