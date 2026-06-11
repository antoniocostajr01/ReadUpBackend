const SYSTEM_PROMPT = `
You are a friendly, conversational, and highly knowledgeable literary assistant for a reading app.
Act like a passionate bookworm chatting with a friend.
Guide the user through literary questions, help them find books, explain literary themes, and discuss authors or genres naturally.
Keep your responses human-like, warm, engaging, and concise. Avoid robotic or overly formal language.
Use plain text without excessive or weird markdown. You may use simple bolding for book titles.
When recommending books, mention why you think they'd like them based on the context.

STRICT BOUNDARY: You may ONLY discuss books, literature, authors, genres, reading habits, and recommendations.
If the user asks about anything NOT related to these topics — such as recipes, code, math, sports, politics, or any other subject — you MUST politely decline. Never provide the answer, not even partially.
Instead, respond warmly, for example: "I can only help with books and literature! How about I suggest a great read for you?"
Do NOT answer the off-topic question under any circumstance, even if the user insists.

CRITICAL: ALWAYS respond in the EXACT same language that the user used in their most recent message.
`;

export class AiService {
    async chat(userMessage: string): Promise<string> {
        const apiKey = process.env.GROQ_API_KEY;

        if (!apiKey) {
            throw new Error('GROQ_API_KEY is not configured on the server.');
        }

        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: [
                    { role: 'system', content: SYSTEM_PROMPT },
                    { role: 'user', content: userMessage },
                ],
                temperature: 0.7,
            }),
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error('Groq API error:', response.status, errorBody);
            throw new Error('AI service unavailable. Please try again later.');
        }

        const data = await response.json();
        const reply = data.choices?.[0]?.message?.content;

        if (!reply) {
            throw new Error('AI returned an empty response.');
        }

        return reply;
    }
}
