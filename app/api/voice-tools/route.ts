import { Mistral } from '@mistralai/mistralai';

const mistralClient = process.env.MISTRAL_API_KEY
  ? new Mistral({ apiKey: process.env.MISTRAL_API_KEY })
  : null;

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

const TOOL_PROMPTS: Record<string, string> = {
  'voice-to-essay': `You are an essay writer. Take a raw voice transcript and transform it into a well-structured essay or document.

Rules:
- Transform the raw, spoken-word transcript into a polished, written essay
- Add a clear introduction, body paragraphs, and conclusion
- Fix all grammar, punctuation, and speech recognition errors
- Remove filler words (um, uh, like, you know)
- Organize ideas into logical paragraphs with smooth transitions
- Maintain the speaker's original ideas, arguments, and voice
- Add paragraph breaks and proper formatting
- If the speaker mentioned headings or sections, format them as such
- Make it read like a well-written essay, not a transcript
- Keep the same approximate level of formality as the speaker

Return ONLY a valid JSON object:
{
  "essay": "the full structured essay text",
  "title": "a suggested title for the essay",
  "wordCount": number,
  "paragraphCount": number
}`,

  'audio-summarize': `You are an audio content summarizer. Take a transcript of spoken content (lecture, interview, podcast, meeting) and create a comprehensive summary.

Rules:
- Identify the main topic and key themes
- Extract the most important points, arguments, and conclusions
- If it's a lecture: capture key concepts, definitions, and examples
- If it's an interview: capture key questions and answers
- If it's a meeting: capture decisions, action items, and discussion points
- Organize the summary with clear sections
- Include a brief overview and detailed bullet points
- Note any important quotes or data mentioned
- Remove filler words and repetition from the summary
- Keep the summary to roughly 20-30% of the original length

Return ONLY a valid JSON object:
{
  "title": "topic/title of the content",
  "overview": "1-2 sentence overview",
  "keyPoints": ["point 1", "point 2", "point 3"],
  "detailedSummary": "the detailed summary text",
  "contentType": "lecture" | "interview" | "meeting" | "podcast" | "speech" | "other",
  "actionItems": ["action 1", "action 2"]
}`,
};

export async function POST(req: Request) {
  try {
    const { text, tool } = await req.json();

    if (!text || !tool) {
      return Response.json({ error: 'Missing text or tool parameter' }, { status: 400 });
    }

    if (!TOOL_PROMPTS[tool]) {
      return Response.json({ error: 'Invalid tool' }, { status: 400 });
    }

    if (!mistralClient) {
      return Response.json({ error: 'AI service not configured' }, { status: 500 });
    }

    let userPrompt = '';
    switch (tool) {
      case 'voice-to-essay':
        userPrompt = `Transform this voice transcript into a well-structured essay:\n\n${text}`;
        break;
      case 'audio-summarize':
        userPrompt = `Summarize this audio transcript, extracting the key points and important information:\n\n${text}`;
        break;
    }

    const completion = await mistralClient.chat.complete({
      model: 'mistral-medium',
      messages: [
        { role: 'system', content: TOOL_PROMPTS[tool] },
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
    console.error('Voice tools API error:', error);
    return Response.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
