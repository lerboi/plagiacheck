import { Mistral } from '@mistralai/mistralai';
import { getUserFromRequest } from '@/lib/server-auth';
import { calculateTextTokenCost, deductTextTokens, refundTextTokens } from '@/lib/server-tokens';
import { recordToolUse } from '@/lib/server-history';

const mistralClient = process.env.MISTRAL_API_KEY
  ? new Mistral({ apiKey: process.env.MISTRAL_API_KEY })
  : null;

const MISTRAL_MODEL = process.env.MISTRAL_MODEL || 'mistral-large-latest';

export async function POST(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { transcript, action } = await req.json();

    if (!transcript) {
      return Response.json({ error: 'No transcript provided' }, { status: 400 });
    }

    if (!mistralClient) {
      return Response.json({ error: 'AI service not configured' }, { status: 500 });
    }

    const cost = calculateTextTokenCost(transcript);
    const newBalance = await deductTextTokens(user.id, cost);
    if (newBalance === null) {
      return Response.json({ error: 'Insufficient tokens', code: 'INSUFFICIENT_TOKENS' }, { status: 402 });
    }

    let systemPrompt = '';
    let userPrompt = '';

    if (action === 'clean') {
      systemPrompt = `You are a transcript cleaner and formatter. Take a raw speech-to-text transcript and clean it up.

Rules:
- Fix obvious speech recognition errors and misheard words
- Add proper punctuation and capitalization
- Fix grammar issues introduced by speech recognition
- Preserve the original meaning and tone
- Remove filler words like "um", "uh", "like", "you know" if they don't add meaning
- Split into proper paragraphs where there are natural topic changes
- Do NOT change the content or meaning, just clean up the formatting

Return ONLY a valid JSON object:
{
  "cleanedText": "the cleaned transcript",
  "changes": number (count of corrections made)
}`;
      userPrompt = `Clean up and format this raw speech transcript:\n\n${transcript}`;
    } else {
      systemPrompt = `You are a text formatter. Format the given transcript into clean, readable text.

Rules:
- Add proper punctuation and capitalization
- Split into paragraphs at natural breaks
- Keep the original words exactly as-is

Return ONLY a valid JSON object:
{
  "cleanedText": "the formatted transcript",
  "changes": 0
}`;
      userPrompt = `Format this transcript:\n\n${transcript}`;
    }

    try {
      const completion = await mistralClient.chat.complete({
        model: MISTRAL_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.2,
      });

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

      let result;
      try {
        result = JSON.parse(contentString);
      } catch {
        const jsonMatch = contentString.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            result = JSON.parse(jsonMatch[0]);
          } catch {
            result = { cleanedText: contentString, changes: 0 };
          }
        } else {
          result = { cleanedText: contentString, changes: 0 };
        }
      }

      await recordToolUse({
        userId: user.id,
        tool: 'speech-to-text',
        input: transcript,
        output: String(result.cleanedText || '').slice(0, 200),
        tokensUsed: cost,
      });

      return Response.json({ result, remainingTokens: newBalance, tokensUsed: cost });
    } catch (error: any) {
      await refundTextTokens(user.id, cost);
      console.error('Speech-to-text API error:', error);
      return Response.json(
        { error: error.message || 'Failed to process transcript' },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Speech-to-text API error:', error);
    return Response.json(
      { error: error.message || 'Failed to process transcript' },
      { status: 500 }
    );
  }
}
