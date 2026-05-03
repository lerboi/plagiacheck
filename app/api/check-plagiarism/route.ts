import { Mistral } from '@mistralai/mistralai';
import { getUserFromRequest } from '@/lib/server-auth';
import {
  calculateTextTokenCost,
  deductTextTokens,
  refundTextTokens,
} from '@/lib/server-tokens';
import { recordToolUse } from '@/lib/server-history';

const mistralClient = process.env.MISTRAL_API_KEY ? new Mistral({
  apiKey: process.env.MISTRAL_API_KEY
}) : null;

const MISTRAL_MODEL = process.env.MISTRAL_MODEL || 'mistral-large-latest';
const MAX_INPUT_LENGTH = 50_000;

function detectPotentialPlagiarism(text: string): { matches: any[], score: number } {
  const matches: any[] = [];
  const words = text.toLowerCase().split(/\s+/);
  const wordCount: { [key: string]: number } = {};

  words.forEach((word) => {
    if (word.length > 6) {
      wordCount[word] = (wordCount[word] || 0) + 1;
    }
  });

  let totalSimilarity = 0;
  let matchCount = 0;

  Object.entries(wordCount).forEach(([word, count]) => {
    if (count > 5) {
      const similarity = Math.min(count * 10, 70);
      matches.push({
        text: `Repeated word: "${word}" appears ${count} times`,
        similarity,
      });
      totalSimilarity += similarity;
      matchCount++;
    }
  });

  const averageSimilarity = matchCount > 0 ? totalSimilarity / matchCount : 0;

  return {
    matches: matches.slice(0, 3),
    score: Math.min(averageSimilarity * 0.5, 25),
  };
}

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

const ENHANCED_SYSTEM_PROMPT = `You are an advanced plagiarism detection system. Analyze the input text for plagiarism and identify specific text segments that are potentially plagiarized.

For each potentially plagiarized segment, you must:
1. Extract the EXACT text from the input (word-for-word)
2. Provide the start and end positions of that text in the original input
3. Explain why it's flagged

Return ONLY a valid JSON object with this exact structure:

{
  "plagiarismPercentage": number between 0 and 100,
  "matches": [
    {
      "text": "exact text segment from input",
      "startIndex": number (character position where match starts),
      "endIndex": number (character position where match ends),
      "similarity": number between 0 and 100,
      "reason": "brief explanation of why this was flagged"
    }
  ]
}

IMPORTANT:
- The "text" field must contain the EXACT text from the input
- startIndex and endIndex must be accurate character positions
- Only flag text that shows clear signs of plagiarism
- Be precise with character positions for highlighting

If no plagiarism is detected, return:
{
  "plagiarismPercentage": 0,
  "matches": []
}`;

export async function POST(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const text: unknown = body?.text;

  if (!text || typeof text !== 'string') {
    return Response.json({ error: 'Missing or invalid text parameter' }, { status: 400 });
  }

  if (text.length > MAX_INPUT_LENGTH) {
    return Response.json(
      { error: `Text exceeds maximum length of ${MAX_INPUT_LENGTH} characters` },
      { status: 400 }
    );
  }

  const cost = calculateTextTokenCost(text);
  const newBalance = await deductTextTokens(user.id, cost);
  if (newBalance === null) {
    return Response.json(
      { error: 'Insufficient tokens', code: 'INSUFFICIENT_TOKENS' },
      { status: 402 }
    );
  }

  const userId = user.id;
  const inputText = text;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let refunded = false;
      const safeRefund = async () => {
        if (refunded) return;
        refunded = true;
        await refundTextTokens(userId, cost);
      };

      try {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ progress: 0 })}\n\n`));

        let result: any = null;

        if (mistralClient) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ progress: 30 })}\n\n`));

          try {
            const completion = await mistralClient.chat.complete({
              model: MISTRAL_MODEL,
              messages: [
                { role: 'system', content: ENHANCED_SYSTEM_PROMPT },
                { role: 'user', content: `Analyze this text for plagiarism:\n\n${inputText}` },
              ],
              temperature: 0.1,
            });

            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ progress: 80 })}\n\n`));

            if (completion.choices && completion.choices[0]?.message?.content) {
              const mistralContent = completion.choices[0].message.content;
              const mistralContentString: string = typeof mistralContent === 'string'
                ? mistralContent
                : Array.isArray(mistralContent)
                  ? mistralContent.map((chunk: any) => chunk.text || '').join('')
                  : String(mistralContent);
              result = extractJSON(mistralContentString);
            }
          } catch (aiErr) {
            console.error('Mistral plagiarism error, falling back:', aiErr);
            // Fall through to algorithmic fallback below.
          }
        }

        if (!result) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ progress: 70 })}\n\n`));
          const basicDetection = detectPotentialPlagiarism(inputText);
          result = {
            plagiarismPercentage: Math.round(basicDetection.score),
            matches: basicDetection.matches.map((match) => ({
              text: match.text,
              similarity: Math.round(match.similarity),
            })),
          };
        }

        if (!result || typeof result.plagiarismPercentage !== 'number') {
          result = { plagiarismPercentage: 0, matches: [] };
        }

        result.plagiarismPercentage = Math.max(0, Math.min(100, result.plagiarismPercentage));

        if (!Array.isArray(result.matches)) {
          result.matches = [];
        }

        result.matches = result.matches
          .map((match: any) => {
            const startIndex = typeof match.startIndex === 'number' ? match.startIndex : null;
            const endIndex = typeof match.endIndex === 'number' ? match.endIndex : null;
            return {
              text: match.text || 'Unknown match',
              startIndex,
              endIndex,
              similarity: Math.max(0, Math.min(100, match.similarity || 0)),
              reason: match.reason || 'Potential plagiarism detected',
            };
          })
          .filter((match: any) => {
            // Keep matches that have valid non-zero-length spans, OR that are
            // fallback messages without indices.
            if (match.startIndex === null && match.endIndex === null) return true;
            if (match.startIndex === null || match.endIndex === null) return false;
            return match.endIndex > match.startIndex;
          });

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ progress: 100 })}\n\n`));
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              progress: 100,
              result,
              remainingTokens: newBalance,
              tokensUsed: cost,
            })}\n\n`
          )
        );

        await recordToolUse({
          userId,
          tool: 'plagiarism',
          input: inputText,
          output: `${Math.round(result.plagiarismPercentage)}% plagiarism — ${result.matches.length} match${result.matches.length === 1 ? '' : 'es'}`,
          metadata: {
            plagiarismPercentage: result.plagiarismPercentage,
            matchCount: result.matches.length,
          },
          tokensUsed: cost,
        });
      } catch (error) {
        console.error('Error in plagiarism detection:', error);
        await safeRefund();
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              progress: 100,
              error: 'Analysis failed. Tokens have been refunded.',
            })}\n\n`
          )
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
