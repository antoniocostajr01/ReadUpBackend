import { Response } from 'express';
import { AiService } from '../services/ai.service';
import { AuthRequest } from '../middlewares/auth.middleware';

export class AiController {
    private aiService = new AiService();

    chat = async (req: AuthRequest, res: Response): Promise<void> => {
        try {
            const { message } = req.body;

            if (!message || typeof message !== 'string' || message.trim().length === 0) {
                res.status(400).json({ error: 'Message is required.' });
                return;
            }

            const reply = await this.aiService.chat(message.trim());
            res.status(200).json({ reply });
        } catch (error: any) {
            const status = error.message.includes('not configured') ? 500 : 502;
            res.status(status).json({ error: error.message });
        }
    };
}
