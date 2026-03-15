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
  infographic: `You are an infographic generator. Analyze the given text and produce a structured infographic representation using SVG markup.

Rules:
- Extract the key points, statistics, and main ideas from the text
- Create a clean, professional infographic layout as an SVG
- Use a vertical layout with sections for: title, key statistics (if any), main points (3-5), and a conclusion
- Use rounded rectangles, circles, and simple icons represented as text/shapes
- Use a harmonious color palette (blues, teals, and grays)
- Make the SVG 800px wide and appropriately tall
- Include proper text sizing: title (24px bold), headings (18px), body (14px)
- Use white/light backgrounds with colored accent elements
- Keep text concise — infographic style, not paragraphs

Return ONLY a valid JSON object:
{
  "svg": "<svg>...</svg>",
  "title": "infographic title",
  "pointCount": number of key points extracted
}`,

  thumbnail: `You are a blog/article thumbnail generator. Create an eye-catching cover image as an SVG based on the given title and topic.

Rules:
- Create a visually striking SVG thumbnail/cover image
- Dimensions: 1200x630 (standard OG image size)
- Use a bold gradient background
- Include the title text prominently (max 2 lines, large font)
- Add decorative geometric shapes, patterns, or abstract elements
- Use a modern, clean design aesthetic
- Include a subtle brand-style element or icon relevant to the topic
- Choose colors that match the topic mood (tech=blue, nature=green, business=purple, etc.)
- Text should be white or light colored for contrast

Return ONLY a valid JSON object:
{
  "svg": "<svg>...</svg>",
  "title": "the cover title used",
  "style": "the design style used"
}`,

  chart: `You are a chart and diagram generator. Create a visual chart or diagram as an SVG based on the user's description.

Rules:
- Interpret the user's description to determine the best chart type (bar, line, pie, flowchart, mind map, timeline, comparison, etc.)
- Create a clean, professional SVG visualization
- Dimensions: 800px wide, height as appropriate
- Use clear labels, legends, and titles
- Use a professional color palette
- For data charts: include axes, gridlines, and data labels
- For flowcharts/diagrams: use clear shapes, arrows, and connectors
- For mind maps: use a radial or tree layout
- Make sure all text is readable (minimum 12px)
- Add a subtle background and border for a polished look
- If the user provides data, plot it accurately
- If the user describes a concept, create an appropriate diagram type

Return ONLY a valid JSON object:
{
  "svg": "<svg>...</svg>",
  "chartType": "bar" | "line" | "pie" | "flowchart" | "mindmap" | "timeline" | "comparison" | "other",
  "title": "chart title",
  "description": "brief description of what the chart shows"
}`,
};

export async function POST(req: Request) {
  try {
    const { text, tool, options } = await req.json();

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
      case 'infographic':
        userPrompt = `Create an infographic from this text:\n\n${text}`;
        break;
      case 'thumbnail':
        userPrompt = `Style: ${options?.style || 'modern'}\n\nCreate a thumbnail/cover image for this title/topic:\n\n${text}`;
        break;
      case 'chart':
        userPrompt = `Chart type preference: ${options?.chartType || 'auto-detect'}\n\nCreate a chart or diagram from this description:\n\n${text}`;
        break;
    }

    const completion = await mistralClient.chat.complete({
      model: 'mistral-medium',
      messages: [
        { role: 'system', content: TOOL_PROMPTS[tool] },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.4,
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
    console.error('Generate image API error:', error);
    return Response.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
