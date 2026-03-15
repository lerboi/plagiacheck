import { Mistral } from '@mistralai/mistralai';
import { createClient } from '@supabase/supabase-js';

const mistralClient = process.env.MISTRAL_API_KEY
  ? new Mistral({ apiKey: process.env.MISTRAL_API_KEY })
  : null;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL2!;
const supabaseKey = process.env.SUPABASE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(req: Request) {
  try {
    const { imageBase64, mimeType } = await req.json();

    if (!imageBase64) {
      return Response.json({ error: 'No image provided' }, { status: 400 });
    }

    if (!mistralClient) {
      return Response.json({ error: 'AI service not configured' }, { status: 500 });
    }

    const dataUrl = `data:${mimeType || 'image/png'};base64,${imageBase64}`;

    const completion = await mistralClient.chat.complete({
      model: 'pixtral-12b-2409',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Extract ALL text from this image. This could be a photo of a document, handwritten notes, a screenshot, a printed page, or any image containing text.

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
}`
            },
            {
              type: 'image_url',
              imageUrl: dataUrl,
            }
          ],
        }
      ],
      temperature: 0.1,
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

    // Try to parse JSON, fallback to raw text
    let result;
    try {
      result = JSON.parse(contentString);
    } catch {
      const jsonMatch = contentString.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          result = JSON.parse(jsonMatch[0]);
        } catch {
          // Fallback: treat the whole response as extracted text
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

    return Response.json({ result });
  } catch (error: any) {
    console.error('Image-to-text API error:', error);
    return Response.json(
      { error: error.message || 'Failed to process image' },
      { status: 500 }
    );
  }
}
