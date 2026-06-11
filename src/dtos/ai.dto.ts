export interface ChatMessageDTO {
    role: 'user' | 'assistant';
    content: string;
}

export interface AIChatRequestDTO {
    messages: ChatMessageDTO[];
}

export interface AIChatResponseDTO {
    reply: string;
}
