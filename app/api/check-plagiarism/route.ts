import { Configuration, OpenAIApi } from 'openai-edge'

const config = new Configuration({
  apiKey: process.env.OPENAI_API_KEY
})
const openai = new OpenAIApi(config)

export async function POST(req: Request) {
  const { text } = await req.json()
  console.log("Text received, encoding...")
  // Initialize the encoder
  const encoder = new TextEncoder()
  console.log("Creating TransformStream...")
  // Create a TransformStream for handling the response
  const stream = new TransformStream()
  const writer = stream.writable.getWriter()
  console.log("TransformStream created...")
  // Function to send progress updates
  const sendProgress = async (progress: number) => {
    await writer.write(
      encoder.encode(`data: ${JSON.stringify({ progress })}\n\n`)
    )
  }

  try {
    // Send initial progress
    console.log("SendProgress...")
    await sendProgress(0)
    console.log("Sending API call...")
    // Make the API call to OpenAI
    const completion = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `You are a plagiarism detection AI. Analyze the given text and determine if it contains plagiarized content. 
          Return a JSON object with the following structure:
          {
            "plagiarismPercentage": number (0-100),
            "matches": [
              {
                "text": "matched text",
                "similarity": number (0-100)
              }
            ]
          }`
        },
        {
          role: 'user',
          content: text
        }
      ],
      temperature: 0.5,
    })
    console.log("API call sent...")
    // Simulate progress updates
    for (let i = 10; i <= 90; i += 10) {
      await sendProgress(i)
      await new Promise(resolve => setTimeout(resolve, 500))
    }

    const result = await completion.json()
    const content = result.choices[0].message.content
    
    // Send the final result
    await writer.write(
      encoder.encode(`data: ${JSON.stringify({ 
        progress: 100,
        result: JSON.parse(content)
      })}\n\n`)
    )
  } catch (error) {
    console.error('Error:', error)
    await writer.write(
      encoder.encode(`data: ${JSON.stringify({ error: 'Failed to check plagiarism' })}\n\n`)
    )
  } finally {
    await writer.close()
  }

  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}

