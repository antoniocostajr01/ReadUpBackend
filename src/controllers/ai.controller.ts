import { Request, Response } from 'express';
import { AiService } from '../services/ai.service';

export class AiController {
    private aiService = new AiService();

    chat = async (req: Request, res: Response): Promise<void> => {
        try {
            const { messages } = req.body;

            if (!messages || !Array.isArray(messages) || messages.length === 0) {
                res.status(400).json({ error: 'Messages array is required.' });
                return;
            }

            // Valida que cada mensagem tem role e content
            const isValid = messages.every(
                (msg: any) =>
                    msg &&
                    typeof msg.content === 'string' &&
                    msg.content.trim().length > 0 &&
                    (msg.role === 'user' || msg.role === 'assistant')
            );

            if (!isValid) {
                res.status(400).json({ error: 'Each message must have a valid role (user/assistant) and non-empty content.' });
                return;
            }

            const reply = await this.aiService.chat(messages);
            res.status(200).json({ reply });
        } catch (error: any) {
            const status = error.message.includes('not configured') ? 500 : 502;
            res.status(status).json({ error: error.message });
        }
    };
}
