import { ai } from '@/lib/ai';
import { getUserFromRequest } from '@/lib/server-auth';
import { IMAGE_TOKEN_COST, deductImageTokens, refundImageTokens } from '@/lib/server-tokens';
import { recordToolUse } from '@/lib/server-history';


export async function POST(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { imageBase64, mimeType } = await req.json();

    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return Response.json({ error: 'No image provided' }, { status: 400 });
    }

    if (imageBase64.length > 8 * 1024 * 1024 * 1.4) {
      return Response.json({ error: 'Image too large (max ~8MB)' }, { status: 413 });
    }

    const ALLOWED_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);
    const safeMimeType = ALLOWED_MIME_TYPES.has(mimeType) ? mimeType : 'image/png';

    if (!ai.isConfigured()) {
      return Response.json({ error: 'AI service not configured' }, { status: 500 });
    }

    const cost = IMAGE_TOKEN_COST.imageToText;
    const newBalance = await deductImageTokens(user.id, cost);
    if (newBalance === null) {
      return Response.json({ error: 'Insufficient image tokens', code: 'INSUFFICIENT_IMAGE_TOKENS' }, { status: 402 });
    }

    try {
      // Gemini takes the image as an inlineData part with RAW base64 — a full
      // data: URL passed as `data` is accepted but silently produces garbage.
      const contentString = await ai.generate({
        prompt: `Extract ALL text from this image. This could be a photo of a document, handwritten notes, a screenshot, a printed page, or any image containing text.

Rules:
- Extract every piece of text visible in the image
- Preserve the original formatting, paragraphs, and line breaks as much as possible
- If the text is handwritten, do your best to read it accurately
- If there are multiple columns or sections, read them in a logical order (left to right, top to bottom)
- Do NOT add any commentary, just return the extracted text
- If no text is found, return "No text detected in this image."

Return ONLY a valid JSON object:
{
  "extractedText": "the full extracted text here",
  "confidence": "high" | "medium" | "low",
  "textType": "printed" | "handwritten" | "mixed" | "screenshot",
  "wordCount": number
}`,
        image: { base64: imageBase64, mimeType: safeMimeType },
        temperature: 0.1,
        json: true,
      });

      if (!contentString) {
        await refundImageTokens(user.id, cost);
        return Response.json({ error: 'No response from AI' }, { status: 500 });
      }

      let result;
      try {
        result = JSON.parse(contentString);
      } catch {
        const jsonMatch = contentString.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            result = JSON.parse(jsonMatch[0]);
          } catch {
            result = {
              extractedText: contentString,
              confidence: 'medium',
              textType: 'unknown',
              wordCount: contentString.split(/\s+/).length,
            };
          }
        } else {
          result = {
            extractedText: contentString,
            confidence: 'medium',
            textType: 'unknown',
            wordCount: contentString.split(/\s+/).length,
          };
        }
      }

      await recordToolUse({
        userId: user.id,
        tool: 'image-to-text',
        input: `[image, ${safeMimeType}, ${Math.round(imageBase64.length / 1024)} KB]`,
        output: result.extractedText,
        metadata: { confidence: result.confidence, textType: result.textType },
        tokensUsed: cost,
      });

      return Response.json({ result, remainingImageTokens: newBalance, tokensUsed: cost });
    } catch (error: any) {
      await refundImageTokens(user.id, cost);
      console.error('Image-to-text API error:', error);
      return Response.json(
        { error: 'Failed to process image. Please try again.' },
        { status: 502 }
      );
    }
  } catch (error: any) {
    console.error('Image-to-text API error:', error);
    return Response.json({ error: 'Failed to process image' }, { status: 500 });
  }
}
