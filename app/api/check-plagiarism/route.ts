import { Mistral } from '@mistralai/mistralai';

const apiKey = process.env.MISTRAL_API_KEY;
const client = new Mistral({ apiKey });

// Helper function to extract JSON from a text response
function extractJSON(content: string): any {
  try {
    return JSON.parse(content);
  } catch (e) {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch (e) {
        return null;
      }
    }
    return null;
  }
}

// Helper function for fallback response
function createFallbackResponse(text: string) {
  return {
    plagiarismPercentage: 0,
    matches: [],
    note: "Unable to generate detailed analysis, providing default response",
    originalResponse: text,
  };
}

export async function POST(req: Request) {
  const { text } = await req.json();
  console.log("Text received, encoding...");

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        console.log("Sending initial progress...");
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ progress: 0 })}\n\n`));

        console.log("Calling Mistral AI API...");
        const completion = await client.chat.complete({
          model: 'mistral-medium',
          messages: [
            {
              role: 'system',
              content: `
                You are a plagiarism detection AI. You must analyze the input text and check if the text matches known phrases, sentences, or excerpts that might exist across various sources, including articles, books, and online databases (without directly accessing them).
        
                You will return only a valid JSON object with no extra text. Your response should follow this structure:
        
                {
                  "plagiarismPercentage": number between 0 and 100, // The percentage of the text that is plagiarized.
                  "matches": [  // List of matched sentences or phrases, if any.
                    {
                      "text": "{Matched text string found in other sources}",
                      "similarity": number between 0 and 100  // The similarity score for this match, representing how closely the matched text compares to the input text.
                    }
                  ]
                }
        
                If no plagiarism is detected, return:
                {
                  "plagiarismPercentage": 0,
                  "matches": []
                }
              `,
            },
            {
              role: 'user',
              content: text, // The user's input text to check for plagiarism.
            },
          ],
          temperature: 0.9, 
        });        

        console.log("API call sent, simulating progress...");

        for (let i = 10; i <= 90; i += 10) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ progress: i })}\n\n`));
          await new Promise((resolve) => setTimeout(resolve, 500));
        }

        console.log("Fetching API response...");
        if (!completion.choices || completion.choices.length === 0) {
          throw new Error("No valid response from Mistral AI");
        }

        const content = completion.choices[0].message.content?.toString() || "";
        if (!content) {
          throw new Error("Empty response from Mistral AI");
        }

        // Extract JSON from response
        let parsedContent = extractJSON(content);

        console.log("Parsed content:", parsedContent);

        // Validate the response structure
        if (
          !parsedContent ||
          typeof parsedContent.plagiarismPercentage !== "number" ||
          !Array.isArray(parsedContent.matches)
        ) {
          console.warn("Invalid response structure, using fallback", parsedContent);
          parsedContent = createFallbackResponse(content);
        }


        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              progress: 100,
              result: parsedContent,
            })}\n\n`
          )
        );
      } catch (error) {
        console.error("Error:", error);
        const errorMessage = error instanceof Error ? error.message : "Failed to check plagiarism";
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              progress: 100,
              result: createFallbackResponse(errorMessage),
            })}\n\n`
          )
        );
      } finally {
        controller.close();
        console.log("Stream closed.");
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
