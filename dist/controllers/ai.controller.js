"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiController = void 0;
const ai_service_1 = require("../services/ai.service");
class AiController {
    aiService = new ai_service_1.AiService();
    chat = async (req, res) => {
        try {
            const { messages } = req.body;
            if (!messages || !Array.isArray(messages) || messages.length === 0) {
                res.status(400).json({ error: 'Messages array is required.' });
                return;
            }
            // Valida que cada mensagem tem role e content
            const isValid = messages.every((msg) => msg &&
                typeof msg.content === 'string' &&
                msg.content.trim().length > 0 &&
                (msg.role === 'user' || msg.role === 'assistant'));
            if (!isValid) {
                res.status(400).json({ error: 'Each message must have a valid role (user/assistant) and non-empty content.' });
                return;
            }
            const reply = await this.aiService.chat(messages);
            res.status(200).json({ reply });
        }
        catch (error) {
            const status = error.message.includes('not configured') ? 500 : 502;
            res.status(status).json({ error: error.message });
        }
    };
}
exports.AiController = AiController;
