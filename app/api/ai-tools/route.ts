import { Mistral } from '@mistralai/mistralai';
import { getUserFromRequest } from '@/lib/server-auth';
import {
  calculateTextTokenCost,
  deductTextTokens,
  refundTextTokens,
} from '@/lib/server-tokens';
import { recordToolUse, type ToolHistoryTool } from '@/lib/server-history';

const mistralClient = process.env.MISTRAL_API_KEY
  ? new Mistral({ apiKey: process.env.MISTRAL_API_KEY })
  : null;

const MISTRAL_MODEL = process.env.MISTRAL_MODEL || 'mistral-large-latest';

const SYSTEM_PROMPTS: Record<string, string> = {
  humanize: `You are an AI text humanizer. Transform the given AI-generated text into natural, human-sounding writing.
You will receive the text along with a tone preference and a humanization level (0-100).

Tone definitions (apply distinctly):
- "casual": friendly, conversational; contractions; everyday vocabulary; first/second person OK; short sentences are fine.
- "professional": polished but not stiff; clear and confident; no slang; preserve domain terms; minimal contractions.
- "academic": precise, hedged, third person; cite ideas with phrases like "this suggests"; no contractions; varied subordinate clauses.
- "creative": evocative imagery, varied rhythm, occasional figurative language, distinctive voice.
- "friendly": warm, inviting, encouraging; occasional rhetorical questions; light humor allowed.

Humanization level (interpolate behavior linearly):
- 0-20: Light edit. Keep original sentence boundaries; only fix obvious AI tells (repeated transitions, parallel-structure overuse, "Furthermore"/"Moreover"). Vocabulary mostly unchanged.
- 21-50: Moderate. Combine or split ~20-40% of sentences. Replace formulaic phrasing with idiomatic alternatives. Introduce varied sentence openers.
- 51-80: Strong. Restructure most sentences. Inject natural digressions, qualifiers, and asides ("which, honestly,", "to be fair"). Use contractions liberally if tone permits.
- 81-100: Heavy rewrite. Substantially reorganize within paragraphs. Mix sentence lengths dramatically. Add rhythmic irregularity. The output should read like a human first draft, not polished AI.

Rules:
- Preserve the original meaning and key facts. Do NOT add information not in the source.
- Match the tone definition above; if it conflicts with the level, the tone wins for vocabulary, the level wins for structure.
- Avoid: identical openers, three-clause "First, X. Second, Y. Third, Z." structures, "In conclusion," "It is important to note," "Delve into," "navigate the complexities," em-dash overuse for definitions.
- Output language MUST match the input language.

Return ONLY a valid JSON object:
{
  "humanizedText": "the rewritten text"
}`,

  paraphrase: `You are a text paraphraser. Rewrite the given text using different words and sentence structures while preserving the original meaning.
You will receive the text along with a mode preference.

Mode definitions (apply distinctly):
- "standard": balanced rewrite. Restructure sentences, swap ~40% of content words for synonyms, keep register and length similar.
- "fluency": prioritize readability and flow. Smooth out awkward phrasing. Shorter, clearer sentences. Plain word choices.
- "formal": elevated register. Replace informal vocabulary with precise alternatives. Avoid contractions. Use subordinate clauses where helpful.
- "creative": more aggressive lexical variation, evocative phrasing, varied rhythm. Rearrange paragraph-level ideas where it improves impact.
- "academic": passive voice acceptable; hedge claims ("appears to", "suggests"); precise terminology; no first-person; no contractions.
- "simple": short sentences (max ~15 words). Common vocabulary (target ~B1 reading level). Replace jargon with plain equivalents.

Rules:
- Restructure sentences — do NOT merely swap synonyms while keeping the same word order.
- Preserve every key fact and meaning. Do NOT add or remove information.
- Keep the output length within ±20% of the input length unless the mode dictates otherwise (e.g. "simple" may be slightly longer).
- Output language MUST match the input language.

Return ONLY a valid JSON object:
{
  "paraphrasedText": "the rewritten text"
}`,

  summarize: `You are a text summarizer. Condense the given text into a concise summary.
You will receive the text along with a target length (as a percentage of original word count) and an output format.

Length targeting:
- Compute the target word count as roughly (length% / 100) × original_word_count.
- Stay within ±15% of that target. Never exceed 50% of the original even if asked.
- For very short inputs (<50 words), produce 1-2 sentences regardless of percentage.

Output format:
- "paragraph": Write a single cohesive paragraph in "summary". Leave "bulletPoints" as an empty array.
- "bullets": Provide 3-7 distinct key points as separate strings in "bulletPoints". Each point is a complete sentence, not a fragment. Leave "summary" as an empty string.

Rules:
- Extract the most important information; drop examples and tangents.
- Do NOT introduce facts, opinions, or interpretations not present in the source.
- Preserve named entities, numbers, and dates exactly as they appear.
- Output language MUST match the input language.

Return ONLY a valid JSON object:
{
  "summary": "paragraph summary text or empty string",
  "bulletPoints": ["point 1", "point 2"]
}`,

  grammar: `You are a grammar and spelling checker. Analyze the given text for grammar, spelling, and punctuation errors.

Rules:
- Identify all grammar, spelling, and punctuation errors
- Provide the corrected version of the full text
- For each issue, provide the exact text, its replacement, position, type (error/warning/suggestion), and explanation
- Be thorough but avoid false positives
- Positions (startIndex, endIndex) must be exact character positions in the original text

Return ONLY a valid JSON object:
{
  "correctedText": "the fully corrected text",
  "issues": [
    {
      "type": "error" | "warning" | "suggestion",
      "text": "the incorrect text",
      "replacement": "the corrected text",
      "message": "explanation of the issue",
      "startIndex": 0,
      "endIndex": 5
    }
  ]
}`,

  "ai-detect": `You are an advanced AI content detector. Analyze the given text to determine whether it was written by a human or generated by AI.

Rules:
- Analyze writing patterns, vocabulary diversity, sentence structure variety, and stylistic markers
- Consider factors like: repetitive phrasing, overly formal transitions, uniform sentence length, lack of personal voice, generic examples
- Provide a sentence-by-sentence breakdown where each sentence gets a score from 0 (definitely human) to 100 (definitely AI)
- Be calibrated: casual, personal writing with typos/slang should score low; formulaic, polished text should score higher
- Do NOT assume all text is AI-generated

Return ONLY a valid JSON object:
{
  "overallScore": number between 0 and 100 (percentage likelihood of AI generation),
  "verdict": "Likely Human" | "Possibly AI" | "Likely AI",
  "analysis": "brief overall analysis explaining the verdict",
  "sentences": [
    {
      "text": "exact sentence from input",
      "score": number between 0 and 100,
      "type": "human" | "mixed" | "ai"
    }
  ]
}`
};

const MAX_INPUT_LENGTH = 50_000;

function extractJSON(content: string): any {
  try {
    return JSON.parse(content);
  } catch {
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

export async function POST(req: Request) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { text, tool, options } = await req.json();

    if (!text || !tool) {
      return Response.json({ error: 'Missing text or tool parameter' }, { status: 400 });
    }

    if (typeof text !== 'string') {
      return Response.json({ error: 'Invalid text parameter' }, { status: 400 });
    }

    if (text.length > MAX_INPUT_LENGTH) {
      return Response.json(
        { error: `Text exceeds maximum length of ${MAX_INPUT_LENGTH} characters` },
        { status: 400 }
      );
    }

    if (!SYSTEM_PROMPTS[tool]) {
      return Response.json({ error: 'Invalid tool' }, { status: 400 });
    }

    if (!mistralClient) {
      return Response.json({ error: 'AI service not configured' }, { status: 500 });
    }

    const cost = calculateTextTokenCost(text);
    const newBalance = await deductTextTokens(user.id, cost);
    if (newBalance === null) {
      return Response.json(
        { error: 'Insufficient tokens', code: 'INSUFFICIENT_TOKENS' },
        { status: 402 }
      );
    }

    let userPrompt = '';
    switch (tool) {
      case 'humanize':
        userPrompt = `Tone: ${options?.tone || 'casual'}\nHumanization Level: ${options?.level || 50}%\n\nText to humanize:\n${text}`;
        break;
      case 'paraphrase':
        userPrompt = `Mode: ${options?.mode || 'standard'}\n\nText to paraphrase:\n${text}`;
        break;
      case 'summarize':
        userPrompt = `Target length: ${options?.length || 50}% of original\nOutput format: ${options?.format || 'paragraph'}\n\nText to summarize:\n${text}`;
        break;
      case 'grammar':
        userPrompt = `Check the following text for grammar, spelling, and punctuation errors:\n\n${text}`;
        break;
      case 'ai-detect':
        userPrompt = `Analyze the following text to determine if it was written by a human or generated by AI. Provide a sentence-by-sentence breakdown:\n\n${text}`;
        break;
    }

    let completion;
    try {
      completion = await mistralClient.chat.complete({
        model: MISTRAL_MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPTS[tool] },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
      });
    } catch (aiError: any) {
      await refundTextTokens(user.id, cost);
      console.error('Mistral API error:', aiError);
      return Response.json(
        { error: 'AI service temporarily unavailable. Please try again.' },
        { status: 502 }
      );
    }

    if (!completion.choices || !completion.choices[0]?.message?.content) {
      await refundTextTokens(user.id, cost);
      return Response.json({ error: 'No response from AI' }, { status: 500 });
    }

    const content = completion.choices[0].message.content;
    const contentString = typeof content === 'string'
      ? content
      : Array.isArray(content)
        ? content.map((chunk: any) => chunk.text || '').join('')
        : String(content);

    const result = extractJSON(contentString);

    if (!result) {
      await refundTextTokens(user.id, cost);
      return Response.json({ error: 'Failed to parse AI response' }, { status: 500 });
    }

    let outputPreview: string | undefined;
    switch (tool) {
      case 'humanize':
        outputPreview = result.humanizedText;
        break;
      case 'paraphrase':
        outputPreview = result.paraphrasedText;
        break;
      case 'summarize':
        outputPreview = result.summary || (Array.isArray(result.bulletPoints) ? result.bulletPoints.join(' • ') : undefined);
        break;
      case 'grammar':
        outputPreview = result.correctedText;
        break;
      case 'ai-detect':
        outputPreview = result.verdict ? `${result.verdict} — ${result.overallScore}% AI` : undefined;
        break;
    }

    await recordToolUse({
      userId: user.id,
      tool: tool as ToolHistoryTool,
      input: text,
      output: outputPreview,
      metadata: options ?? {},
      tokensUsed: cost,
    });

    return Response.json({ result, remainingTokens: newBalance, tokensUsed: cost });
  } catch (error: any) {
    console.error('AI tools API error:', error);
    return Response.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
