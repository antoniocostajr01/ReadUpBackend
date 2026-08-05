/**
 * Cache em memória com expiração. Usado pelo book-search pra não repetir chamadas
 * caras à Open Library (edição localizada e seções de gênero).
 *
 * ponytail: Map em memória — morre a cada deploy e não é compartilhado entre
 * instâncias. Vira Redis quando rodar mais de uma instância, não antes.
 */
export class TtlCache<T> {
    private entries = new Map<string, { at: number; value: T }>();
    private ttlMs: number;

    constructor(ttlMs: number) {
        this.ttlMs = ttlMs;
    }

    get(key: string): T | undefined {
        const entry = this.entries.get(key);
        if (!entry) return undefined;
        if (Date.now() - entry.at >= this.ttlMs) {
            this.entries.delete(key);
            return undefined;
        }
        return entry.value;
    }

    set(key: string, value: T): void {
        this.entries.set(key, { at: Date.now(), value });
    }
}
