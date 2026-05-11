import { Mistral } from '@mistralai/mistralai';
import { getUserFromRequest } from '@/lib/server-auth';
import { IMAGE_TOKEN_COST, deductImageTokens, refundImageTokens } from '@/lib/server-tokens';
import { recordToolUse } from '@/lib/server-history';
import type { ToolHistoryTool } from '@/lib/server-history';
import {
  buildChartSvg,
  renderInfographic,
  renderThumbnail,
  type ChartSpec,
  type InfographicSpec,
  type ThumbnailSpec,
} from '@/lib/svg-templates';

/**
 * Generates SVG output for the chart, infographic, and thumbnail tools.
 *
 * Architecture: the LLM produces a structured JSON SPEC describing the
 * content (title, data, sections, palette, etc.) — never raw SVG. The route
 * then builds a deterministic SVG from that spec via lib/svg-templates.ts,
 * which yields reliable, attractive output regardless of how the LLM phrases
 * its response.
 */

const mistralClient = process.env.MISTRAL_API_KEY
  ? new Mistral({ apiKey: process.env.MISTRAL_API_KEY })
  : null;

const MISTRAL_MODEL = process.env.MISTRAL_MODEL || 'mistral-large-latest';

const TOOL_COST: Record<string, number> = {
  chart: IMAGE_TOKEN_COST.chart,
  infographic: IMAGE_TOKEN_COST.infographic,
  thumbnail: IMAGE_TOKEN_COST.thumbnail,
};

const SUPPORTED_CHART_TYPES = ['bar', 'line', 'pie', 'flowchart', 'mindmap', 'timeline', 'comparison'] as const;
type SupportedChartType = (typeof SUPPORTED_CHART_TYPES)[number];

// ---------- system prompts (spec, NOT svg) ----------

const CHART_PROMPT = `You analyse the user's description and produce a STRUCTURED JSON SPEC for a chart. Do NOT emit SVG, HTML, or markdown — only JSON.

Pick the best chartType for the description. Honour the user's preferred chartType if they specify one and it makes sense for the content; otherwise auto-detect.

Supported chartType values and the schema for each:

- "bar": numeric comparison across discrete categories.
  { "chartType": "bar", "title": "...", "description": "...", "data": [ { "name": "Q1", "value": 50000 }, ... ] }

- "line": values over an ordered sequence (time, steps).
  { "chartType": "line", "title": "...", "description": "...", "data": [ { "name": "Jan", "value": 12 }, ... ] }

- "pie": parts of a whole (max 8 slices).
  { "chartType": "pie", "title": "...", "description": "...", "data": [ { "name": "Mobile", "value": 60 }, ... ] }

- "flowchart": linear sequence of steps (max 10 nodes).
  { "chartType": "flowchart", "title": "...", "description": "...", "nodes": [ { "label": "User signs up" }, { "label": "Verify email" } ] }

- "mindmap": one central concept with up to 8 branches.
  { "chartType": "mindmap", "title": "...", "description": "...", "center": "Productivity", "branches": ["Sleep", "Focus blocks", "..."] }

- "timeline": ordered events with dates (max 6).
  { "chartType": "timeline", "title": "...", "description": "...", "events": [ { "date": "1969", "label": "Moon landing" }, ... ] }

- "comparison": side-by-side comparison of items across attributes (max 4 items, max 8 rows).
  { "chartType": "comparison", "title": "...", "description": "...", "items": ["React", "Vue", "Svelte"], "rows": [ { "attribute": "Bundle size", "values": ["small", "small", "tiny"] }, ... ] }

Rules:
- Extract numeric values directly when present in the user's description. Don't invent data the user didn't provide.
- If the user gives no numeric data and asks for a data chart, switch chartType to "comparison" or "flowchart" as appropriate.
- Keep titles concise (≤ 60 chars). Keep labels short (≤ 30 chars where possible).
- Return ONLY the JSON object — no preamble, no code fences.`;

const INFOGRAPHIC_PROMPT = `You convert the user's text into a STRUCTURED JSON SPEC for an infographic. Do NOT emit SVG or HTML — only JSON.

Schema (every field is optional except title):
{
  "title": "Short headline (≤ 50 chars)",
  "intro": "1-3 sentence overview (≤ 240 chars)",
  "stats": [ { "label": "Active users", "value": "12M" }, ... ],   // 0-4 entries; value short (≤ 8 chars including units)
  "sections": [ { "heading": "Section heading", "body": "Body sentence (≤ 220 chars)" }, ... ],   // 3-5 entries
  "conclusion": "1-2 sentence takeaway (≤ 200 chars)"
}

Rules:
- Extract concrete facts from the source — don't invent statistics.
- Stat values should be punchy: "82%", "12M", "$4.2B", "3.5×", "180k". Avoid full sentences in stats.
- Section bodies are short summaries, not paragraphs.
- Return ONLY the JSON object.`;

const THUMBNAIL_PROMPT = `You design a 1200x630 cover thumbnail by producing a STRUCTURED JSON SPEC. Do NOT emit SVG or HTML — only JSON.

Schema:
{
  "title": "The main title text (verbatim from the user's topic if given)",
  "subtitle": "optional kicker line, ≤ 60 chars, may be empty string",
  "palette": {
    "from": "#hex",        // gradient start (top-left)
    "to": "#hex",          // gradient end (bottom-right)
    "text": "#hex",        // foreground text colour — must contrast with both gradient stops
    "accent": "#hex"       // small decorative accent colour
  },
  "vibe": "ONE-WORD label for the topic mood (e.g. TECH, NATURE, BUSINESS, FOOD, FITNESS, FINANCE)"
}

Palette guidance — pick mood-appropriate colours:
- tech / SaaS / AI: deep blues + electric purple/cyan, white text
- nature / wellness / sustainability: emerald + teal gradient, white text
- business / finance: navy + slate, white text, gold accent
- food / lifestyle: warm orange + pink, dark text
- fitness / energy: red-orange + magenta, white text
- minimalist / editorial: greys + a single bold accent

The "from" and "to" gradient must be DIFFERENT hex values. "text" should be #ffffff for dark gradients, #0f172a for very light gradients.

Style override: if the user requests a "minimal" style, pick a near-monochrome palette. If they request "bold", use saturated contrasting colours.

Return ONLY the JSON object.`;

// ---------- JSON extractor ----------

function extractJSON(content: string): any {
  try {
    return JSON.parse(content);
  } catch {
    // strip code fences if the model wrapped them
    const fenced = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (fenced && fenced[1]) {
      try {
        return JSON.parse(fenced[1]);
      } catch {
        /* fall through */
      }
    }
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
}

// ---------- spec validators ----------

function validateChartSpec(raw: any, requestedType: string): ChartSpec | null {
  if (!raw || typeof raw !== 'object') return null;
  const requested = SUPPORTED_CHART_TYPES.includes(requestedType as SupportedChartType)
    ? (requestedType as SupportedChartType)
    : null;
  const fromLLM = SUPPORTED_CHART_TYPES.includes(raw.chartType) ? (raw.chartType as SupportedChartType) : null;
  // Honour the user's explicit type preference; otherwise trust the LLM; otherwise fall back to bar.
  const chartType: SupportedChartType = requested ?? fromLLM ?? 'bar';
  const title = String(raw.title || 'Chart').slice(0, 80);
  const description = raw.description ? String(raw.description).slice(0, 240) : undefined;

  switch (chartType) {
    case 'bar':
    case 'line':
    case 'pie':
      return {
        chartType,
        title,
        description,
        data: Array.isArray(raw.data) ? raw.data : [],
      };
    case 'flowchart':
      return {
        chartType,
        title,
        description,
        nodes: Array.isArray(raw.nodes) ? raw.nodes : [],
      };
    case 'mindmap':
      return {
        chartType,
        title,
        description,
        center: String(raw.center || title).slice(0, 40),
        branches: Array.isArray(raw.branches) ? raw.branches : [],
      };
    case 'timeline':
      return {
        chartType,
        title,
        description,
        events: Array.isArray(raw.events) ? raw.events : [],
      };
    case 'comparison':
      return {
        chartType,
        title,
        description,
        items: Array.isArray(raw.items) ? raw.items : [],
        rows: Array.isArray(raw.rows) ? raw.rows : [],
      };
  }
}

function validateInfographicSpec(raw: any): InfographicSpec | null {
  if (!raw || typeof raw !== 'object') return null;
  return {
    title: String(raw.title || 'Untitled').slice(0, 80),
    intro: raw.intro ? String(raw.intro).slice(0, 280) : undefined,
    stats: Array.isArray(raw.stats)
      ? raw.stats
          .filter((s: any) => s && s.label && s.value)
          .slice(0, 4)
          .map((s: any) => ({ label: String(s.label).slice(0, 40), value: String(s.value).slice(0, 12) }))
      : undefined,
    sections: Array.isArray(raw.sections)
      ? raw.sections
          .filter((s: any) => s && s.heading)
          .slice(0, 5)
          .map((s: any) => ({ heading: String(s.heading).slice(0, 80), body: String(s.body || '').slice(0, 280) }))
      : undefined,
    conclusion: raw.conclusion ? String(raw.conclusion).slice(0, 240) : undefined,
  };
}

function validateThumbnailSpec(raw: any): ThumbnailSpec | null {
  if (!raw || typeof raw !== 'object') return null;
  return {
    title: String(raw.title || 'Untitled').slice(0, 120),
    subtitle: raw.subtitle ? String(raw.subtitle).slice(0, 80) : undefined,
    palette: raw.palette && typeof raw.palette === 'object' ? raw.palette : undefined,
    vibe: raw.vibe ? String(raw.vibe).slice(0, 16) : undefined,
  };
}

// ---------- handler ----------

export async function POST(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { text, tool, options } = await req.json();

    if (!text || !tool) {
      return Response.json({ error: 'Missing text or tool parameter' }, { status: 400 });
    }

    if (!TOOL_COST[tool]) {
      return Response.json({ error: 'Invalid tool' }, { status: 400 });
    }

    if (!mistralClient) {
      return Response.json({ error: 'AI service not configured' }, { status: 500 });
    }

    const cost = TOOL_COST[tool];
    const newBalance = await deductImageTokens(user.id, cost);
    if (newBalance === null) {
      return Response.json(
        { error: 'Insufficient image tokens', code: 'INSUFFICIENT_IMAGE_TOKENS' },
        { status: 402 }
      );
    }

    const refundAndFail = async (status: number, error: string) => {
      await refundImageTokens(user.id, cost);
      return Response.json({ error }, { status });
    };

    let systemPrompt = '';
    let userPrompt = '';
    switch (tool) {
      case 'chart': {
        systemPrompt = CHART_PROMPT;
        const requestedType = options?.chartType && options.chartType !== 'auto-detect'
          ? options.chartType
          : null;
        userPrompt = requestedType
          ? `Preferred chartType: ${requestedType}\n\nDescription:\n${text}`
          : `Description:\n${text}`;
        break;
      }
      case 'infographic':
        systemPrompt = INFOGRAPHIC_PROMPT;
        userPrompt = `Source content:\n${text}`;
        break;
      case 'thumbnail':
        systemPrompt = THUMBNAIL_PROMPT;
        userPrompt = `Style: ${options?.style || 'modern'}\n\nTopic / title:\n${text}`;
        break;
    }

    let completion;
    try {
      completion = await mistralClient.chat.complete({
        model: MISTRAL_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.4,
      });
    } catch (err: any) {
      console.error('Mistral chat error:', err);
      return refundAndFail(502, 'AI service temporarily unavailable. Please try again.');
    }

    if (!completion.choices || !completion.choices[0]?.message?.content) {
      return refundAndFail(500, 'No response from AI');
    }

    const content = completion.choices[0].message.content;
    const contentString =
      typeof content === 'string'
        ? content
        : Array.isArray(content)
          ? content.map((chunk: any) => chunk.text || '').join('')
          : String(content);

    const rawSpec = extractJSON(contentString);
    if (!rawSpec) {
      return refundAndFail(500, 'Failed to parse AI response');
    }

    let svg = '';
    let result: any = {};

    switch (tool) {
      case 'chart': {
        const requestedType = options?.chartType && options.chartType !== 'auto-detect' ? options.chartType : '';
        const spec = validateChartSpec(rawSpec, requestedType);
        if (!spec) return refundAndFail(500, 'Invalid chart spec from AI');
        svg = buildChartSvg(spec);
        result = {
          svg,
          chartType: spec.chartType,
          title: spec.title,
          description: spec.description ?? '',
        };
        break;
      }
      case 'infographic': {
        const spec = validateInfographicSpec(rawSpec);
        if (!spec) return refundAndFail(500, 'Invalid infographic spec from AI');
        svg = renderInfographic(spec);
        result = {
          svg,
          title: spec.title,
          pointCount: spec.sections?.length ?? 0,
        };
        break;
      }
      case 'thumbnail': {
        const spec = validateThumbnailSpec(rawSpec);
        if (!spec) return refundAndFail(500, 'Invalid thumbnail spec from AI');
        svg = renderThumbnail(spec);
        result = {
          svg,
          title: spec.title,
          style: options?.style || 'modern',
        };
        break;
      }
    }

    await recordToolUse({
      userId: user.id,
      tool: tool as ToolHistoryTool,
      input: text,
      output: result.title || svg.slice(0, 100),
      tokensUsed: cost,
    });

    return Response.json({ result, remainingImageTokens: newBalance, tokensUsed: cost });
  } catch (error: any) {
    console.error('Generate image API error:', error);
    return Response.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
