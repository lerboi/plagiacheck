import { Mistral } from '@mistralai/mistralai';
import { createClient } from '@supabase/supabase-js';

const mistralClient = process.env.MISTRAL_API_KEY
  ? new Mistral({ apiKey: process.env.MISTRAL_API_KEY })
  : null;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL2!;
const supabaseKey = process.env.SUPABASE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const SYSTEM_PROMPTS: Record<string, string> = {
  humanize: `You are an AI text humanizer. Transform the given AI-generated text into natural, human-sounding writing.
You will receive the text along with a tone preference and humanization level.

Rules:
- Rewrite the text to sound natural and human-written
- Maintain the original meaning and key information
- Vary sentence structure and length naturally
- Use contractions, casual transitions, and natural phrasing
- Avoid overly formal or repetitive patterns typical of AI writing

Return ONLY a valid JSON object:
{
  "humanizedText": "the rewritten text"
}`,

  paraphrase: `You are a text paraphraser. Rewrite the given text using different words and sentence structures while preserving the original meaning.
You will receive the text along with a mode preference (standard, fluency, creative, formal).

Rules:
- Completely restructure sentences, don't just swap synonyms
- Maintain the original meaning accurately
- Adapt the style based on the requested mode
- Keep the same approximate length

Return ONLY a valid JSON object:
{
  "paraphrasedText": "the rewritten text"
}`,

  summarize: `You are a text summarizer. Condense the given text into a concise summary.
You will receive the text along with a target length percentage and output format preference.

Rules:
- Extract the most important information and key points
- Maintain accuracy - don't add information not in the original
- Respect the target summary length
- If bullet points format is requested, return key points as an array

Return ONLY a valid JSON object:
{
  "summary": "paragraph summary text",
  "bulletPoints": ["point 1", "point 2", "point 3"]
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
}`
};

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
    const { text, tool, options } = await req.json();

    if (!text || !tool) {
      return Response.json({ error: 'Missing text or tool parameter' }, { status: 400 });
    }

    if (!SYSTEM_PROMPTS[tool]) {
      return Response.json({ error: 'Invalid tool' }, { status: 400 });
    }

    if (!mistralClient) {
      return Response.json({ error: 'AI service not configured' }, { status: 500 });
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
    }

    const completion = await mistralClient.chat.complete({
      model: 'mistral-medium',
      messages: [
        { role: 'system', content: SYSTEM_PROMPTS[tool] },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3,
    });

    if (!completion.choices || !completion.choices[0]?.message?.content) {
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
      return Response.json({ error: 'Failed to parse AI response' }, { status: 500 });
    }

    return Response.json({ result });
  } catch (error: any) {
    console.error('AI tools API error:', error);
    return Response.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
