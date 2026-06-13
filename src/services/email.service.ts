export class EmailService {
    /**
     * Envia o email com o código de redefinição de senha via Resend.
     * Resend é uma API HTTP (mesmo estilo do AiService): não precisa de SMTP.
     */
    async sendPasswordResetCode(to: string, code: string): Promise<void> {
        const apiKey = process.env.RESEND_API_KEY;

        if (!apiKey) {
            throw new Error('RESEND_API_KEY is not configured on the server.');
        }

        // "onboarding@resend.dev" é o remetente de teste do Resend (funciona sem domínio verificado).
        // Quando tiver um domínio próprio verificado, troque por algo como "no-reply@seudominio.com".
        const from = process.env.RESEND_FROM ?? 'ReadUp <onboarding@resend.dev>';

        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                from,
                to,
                subject: 'Your ReadUp password reset code',
                html: `
                    <div style="font-family: -apple-system, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto;">
                        <h2 style="color: #1f2937;">Reset your password</h2>
                        <p style="color: #4b5563;">Use the code below to reset your ReadUp password. It expires in 15 minutes.</p>
                        <p style="font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #166534; text-align: center; margin: 24px 0;">${code}</p>
                        <p style="color: #9ca3af; font-size: 13px;">If you didn't request this, you can safely ignore this email.</p>
                    </div>
                `,
            }),
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error('Resend API error:', response.status, errorBody);
            throw new Error('Failed to send reset email. Please try again later.');
        }
    }
}
