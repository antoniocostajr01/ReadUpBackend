import { SearchBookDTO } from '../dtos/book.dto';
import { GENRE_SEEDS } from './genre-seeds';

/**
 * Proxy + camada de qualidade para a Google Books API.
 *
 * Objetivos (ver https://developers.google.com/books):
 *  - Esconder a API key (fica só no servidor, não no app).
 *  - Resultados mais ASSERTIVOS: restringe idioma (`langRestrict`) e tipo (`printType=books`),
 *    e mantém a ordem de relevância do Google como sinal dominante.
 *  - Resultados mais CONTEMPORÂNEOS: re-ranqueia dando boost para livros recentes,
 *    populares e com capa/descrição, sem destruir a relevância.
 */

const GOOGLE_BOOKS_ENDPOINT = 'https://www.googleapis.com/books/v1/volumes';
const SUPPORTED_LANGUAGES = ['pt', 'en'];
// Garante que um match de título fique acima de qualquer resultado genérico/de autor.
const TITLE_HIT_BONUS = 1000;
// Abaixo disso, completamos a lista com outros idiomas pra não devolver quase nada.
const MIN_RESULTS_IN_LANGUAGE = 6;

// Cache em memória das seções de gênero curadas (resolver seeds via Google é caro).
const SEED_CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6h
const seedCache = new Map<string, { at: number; data: SearchBookDTO[] }>();
// Títulos a ignorar ao resolver seeds: análises, resumos e guias (não são o livro em si).
const SEED_NOISE = /(análise|analise|resumo|super\s?resumo|sumário|sumario|guia de estudo|guia de leitura|sparknotes|study guide|summary of|workbook)/i;

// Stopwords usadas só para inferir o idioma da query (não para buscar).
const PT_STOPWORDS = new Set([
    'o', 'os', 'a', 'as', 'um', 'uma', 'uns', 'umas', 'de', 'do', 'da', 'dos', 'das',
    'no', 'na', 'nos', 'nas', 'e', 'que', 'com', 'para', 'por', 'em', 'ao', 'aos',
    'meu', 'minha', 'seu', 'sua', 'não', 'é', 'são',
]);
const EN_STOPWORDS = new Set([
    'the', 'of', 'and', 'an', 'to', 'in', 'on', 'for', 'with', 'is', 'are', 'my',
    'your', 'from', 'at', 'as', 'about', 'how',
]);

interface GoogleImageLinks {
    smallThumbnail?: string;
    thumbnail?: string;
}

interface GoogleVolumeInfo {
    title?: string;
    authors?: string[];
    description?: string;
    pageCount?: number;
    language?: string;
    publishedDate?: string;
    averageRating?: number;
    ratingsCount?: number;
    imageLinks?: GoogleImageLinks;
}

interface GoogleVolume {
    id: string;
    volumeInfo?: GoogleVolumeInfo;
}

interface GoogleBooksResponse {
    items?: GoogleVolume[];
}

/**
 * 'search'  → busca livre por título/autor: a relevância do Google manda, recência só
 *             desempata e livros antigos NÃO são penalizados (quem busca "Duna" quer Duna).
 * 'browse'  → navegação por gênero/descoberta: recência pesa mais, pra trazer contemporâneos.
 */
export type RankMode = 'search' | 'browse';

export interface SearchOptions {
    query: string;
    lang?: string;
    maxResults?: number;
    startIndex?: number;
    country?: string;
    mode?: RankMode;
}

interface RankWeights {
    relevanceStep: number;   // peso de cada posição na ordem de relevância do Google
    recency: (age: number) => number;
    popularityCap: number;   // teto do boost de popularidade (ratingsCount em escala log)
    langMatch: number;
    thumbnail: number;
    description: number;
}

const WEIGHTS: Record<RankMode, RankWeights> = {
    // Busca por título: relevância domina (step alto); recência leve e nunca penaliza antigos.
    search: {
        relevanceStep: 12,
        recency: age => (age <= 3 ? 10 : age <= 7 ? 6 : age <= 15 ? 3 : 0),
        popularityCap: 12,
        langMatch: 5,
        thumbnail: 6,
        description: 4,
    },
    // Gênero/descoberta: o pool já vem por orderBy=newest (posição = recência). Popularidade
    // reordena pra destacar os contemporâneos mais populares; recência reforça os bem recentes.
    browse: {
        relevanceStep: 2,
        recency: age => (age <= 2 ? 30 : age <= 5 ? 20 : age <= 10 ? 8 : 0),
        popularityCap: 25,
        langMatch: 5,
        thumbnail: 6,
        description: 4,
    },
};

export class GoogleBooksService {
    /** Normaliza um código de idioma ("pt-BR" → "pt"). */
    private normalizeLanguage(code?: string): string {
        if (!code) return 'en';
        const base = code.toLowerCase().split('-')[0];
        return SUPPORTED_LANGUAGES.includes(base) ? base : 'en';
    }

    /**
     * Resolve o idioma dos resultados: por padrão segue o idioma do aparelho (`deviceLang`),
     * MAS se a query estiver claramente em outro idioma, devolve esse idioma.
     * Ex.: aparelho em PT + busca "the lord of the rings" → en; "o senhor dos anéis" → pt.
     */
    private resolveLanguage(query: string, deviceLang: string): string {
        const q = query.toLowerCase();

        // Diacríticos exclusivos do português = sinal forte de PT.
        if (/[ãõç]/.test(q)) return 'pt';

        const tokens = q.replace(/[^a-zà-ú\s]/gi, ' ').split(/\s+/).filter(Boolean);
        let pt = 0;
        let en = 0;
        for (const token of tokens) {
            if (PT_STOPWORDS.has(token)) pt++;
            if (EN_STOPWORDS.has(token)) en++;
        }

        if (en > pt) return 'en';
        if (pt > en) return 'pt';
        // Sem sinal claro (ex.: "Duna", "Sapiens") → mantém o idioma do aparelho.
        return SUPPORTED_LANGUAGES.includes(deviceLang) ? deviceLang : 'en';
    }

    /** Garante https e remove o curl da borda, que costuma quebrar o render da capa. */
    private normalizeCoverUrl(url?: string): string | null {
        if (!url) return null;
        return url
            .replace(/^http:\/\//, 'https://')
            .replace('&edge=curl', '')
            .trim();
    }

    /** Normaliza texto para comparação de título (minúsculas, sem acentos/pontuação). */
    private normalizeForMatch(text: string): string {
        return text
            .toLowerCase()
            .normalize('NFD')
            .replace(/[̀-ͯ]/g, '')
            .replace(/[^a-z0-9\s]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    /** Extrai o ano de publicação ("2021-05-03" / "2021" → 2021). */
    private parseYear(publishedDate?: string): number | undefined {
        if (!publishedDate) return undefined;
        const match = publishedDate.match(/\d{4}/);
        return match ? Number(match[0]) : undefined;
    }

    /**
     * Score composto. A relevância do Google (posição original) é o sinal mais forte;
     * recência, popularidade, idioma e existência de capa/descrição desempatam.
     */
    private scoreFor(volume: GoogleVolume, index: number, total: number, preferredLang: string, weights: RankWeights, titleHit: boolean): number {
        const info = volume.volumeInfo ?? {};
        const lang = this.normalizeLanguage(info.language);
        const year = this.parseYear(info.publishedDate);
        const hasThumbnail = Boolean(info.imageLinks?.thumbnail || info.imageLinks?.smallThumbnail);
        const hasDescription = Boolean(info.description && info.description.trim().length > 0);
        const ratingsCount = info.ratingsCount ?? 0;

        // Base: ordem de relevância do Google. Sinal dominante (step alto no modo 'search').
        let score = (total - index) * weights.relevanceStep;

        // Match de título (veio da query `intitle:`) sobe forte: é o que o usuário digitou.
        if (titleHit) score += TITLE_HIT_BONUS;

        if (lang === preferredLang) score += weights.langMatch;
        if (hasThumbnail) score += weights.thumbnail;
        if (hasDescription) score += weights.description;

        // Recência (positiva; nunca penaliza, pra não derrubar buscas por título de clássicos).
        if (year !== undefined) {
            const age = new Date().getFullYear() - year;
            score += weights.recency(age);
        }

        // Popularidade (escala log). No browse pesa mais, pra premiar bestsellers atuais.
        if (ratingsCount > 0) {
            score += Math.min(weights.popularityCap, Math.log10(1 + ratingsCount) * 5);
        }

        return score;
    }

    private toDTO(volume: GoogleVolume): SearchBookDTO {
        const info = volume.volumeInfo ?? {};
        return {
            id: volume.id,
            title: info.title ?? 'Untitled',
            author: info.authors?.join(', ') ?? null,
            totalPages: info.pageCount ?? 0,
            details: info.description?.trim() ?? null,
            coverUrl: this.normalizeCoverUrl(info.imageLinks?.thumbnail ?? info.imageLinks?.smallThumbnail),
            language: this.normalizeLanguage(info.language),
            publishedDate: info.publishedDate ?? null,
            averageRating: info.averageRating ?? null,
            ratingsCount: info.ratingsCount ?? null,
        };
    }

    /** Só mantém itens minimamente úteis (têm título e capa OU descrição), pra cortar lixo. */
    private isUsable(volume: GoogleVolume): boolean {
        const info = volume.volumeInfo ?? {};
        const hasThumbnail = Boolean(info.imageLinks?.thumbnail || info.imageLinks?.smallThumbnail);
        const hasDescription = Boolean(info.description && info.description.trim().length > 0);
        return Boolean(info.title) && (hasThumbnail || hasDescription);
    }

    /** Faz uma chamada à Google Books API e devolve os volumes úteis. */
    private async fetchVolumes(q: string, preferredLang: string, maxResults: number, startIndex: number, country: string, apiKey: string, orderBy: 'relevance' | 'newest' = 'relevance'): Promise<GoogleVolume[]> {
        const params = new URLSearchParams({
            q,
            langRestrict: preferredLang,
            printType: 'books',
            orderBy,
            maxResults: String(maxResults),
            startIndex: String(startIndex),
            country,
            // Resposta parcial (doc de performance): só os campos que usamos.
            fields: 'items(id,volumeInfo(title,authors,description,pageCount,language,publishedDate,averageRating,ratingsCount,imageLinks/thumbnail,imageLinks/smallThumbnail))',
            key: apiKey,
        });

        const response = await fetch(`${GOOGLE_BOOKS_ENDPOINT}?${params.toString()}`);
        if (!response.ok) {
            const body = await response.text();
            console.error('Google Books API error:', response.status, body);
            throw new Error('Book search is unavailable. Please try again later.');
        }

        const data = (await response.json()) as GoogleBooksResponse;
        return (data.items ?? []).filter(v => this.isUsable(v));
    }

    /**
     * Monta uma seção de gênero a partir de títulos curados (ver genre-seeds.ts), resolvendo
     * cada um pela busca por título no idioma do usuário. Contorna a falta de catálogo pt por
     * gênero no Google. Resultado é cacheado por (gênero, idioma).
     */
    private async resolveSeeds(slug: string, lang: string, seeds: string[], maxResults: number, country: string, apiKey: string): Promise<SearchBookDTO[]> {
        const cacheKey = `${slug}:${lang}`;
        const cached = seedCache.get(cacheKey);
        if (cached && Date.now() - cached.at < SEED_CACHE_TTL_MS) {
            return cached.data.slice(0, maxResults);
        }

        const resolved = await Promise.all(
            seeds.map(async title => {
                try {
                    const volumes = await this.fetchVolumes(`intitle:${title}`, lang, 5, 0, country, apiKey);
                    // Só do idioma certo e sem ruído (análises/resumos/guias de estudo).
                    const candidates = volumes.filter(v =>
                        this.normalizeLanguage(v.volumeInfo?.language) === lang &&
                        !SEED_NOISE.test(v.volumeInfo?.title ?? '')
                    );
                    // Prefere o volume cujo título realmente contém o seed (evita match solto).
                    const seedNorm = this.normalizeForMatch(title);
                    const match = candidates.find(v => this.normalizeForMatch(v.volumeInfo?.title ?? '').includes(seedNorm))
                        ?? candidates[0];
                    return match ? this.toDTO(match) : null;
                } catch {
                    return null;
                }
            })
        );

        // Mantém a ordem curada (popular primeiro), só no idioma certo, dedup por id.
        const seen = new Set<string>();
        const data: SearchBookDTO[] = [];
        for (const dto of resolved) {
            if (dto && dto.language === lang && !seen.has(dto.id)) {
                seen.add(dto.id);
                data.push(dto);
            }
        }

        seedCache.set(cacheKey, { at: Date.now(), data });
        return data.slice(0, maxResults);
    }

    async search(options: SearchOptions): Promise<SearchBookDTO[]> {
        const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
        if (!apiKey) {
            throw new Error('GOOGLE_BOOKS_API_KEY is not configured on the server.');
        }

        const query = options.query.trim();
        if (query.length < 2) return [];

        // Idioma do aparelho é o padrão; a query pode forçar outro idioma (ver resolveLanguage).
        const deviceLang = this.normalizeLanguage(options.lang);
        const preferredLang = this.resolveLanguage(query, deviceLang);
        const maxResults = Math.min(Math.max(options.maxResults ?? 20, 1), 40);
        const startIndex = Math.max(options.startIndex ?? 0, 0);
        const country = options.country ?? (preferredLang === 'pt' ? 'BR' : 'US');
        const mode = options.mode ?? 'search';
        const weights = WEIGHTS[mode];

        // Coleta {volume, índice de relevância, se é match de título}, deduplicando por id.
        const collected = new Map<string, { volume: GoogleVolume; index: number; titleHit: boolean }>();

        if (mode === 'browse') {
            // Sugestão por gênero: se houver lista curada para esse gênero+idioma, usa ela
            // (garante livros no idioma do usuário, que o subject: do Google não entrega).
            const slug = query.replace(/^subject:/i, '').trim().toLowerCase();
            const seeds = GENRE_SEEDS[slug]?.[preferredLang as 'pt' | 'en'];
            if (seeds && seeds.length > 0) {
                return await this.resolveSeeds(slug, preferredLang, seeds, maxResults, country, apiKey);
            }

            // Sem curadoria (ex.: device em inglês): a query (ex.: "subject:fantasy") já fixa o gênero.
            // (Obs.: a Google Books API ignora orderBy=newest com subject:, então usamos
            // relevance e reordenamos por popularidade/recência pra subir os mais conhecidos e
            // atuais do pool.) Exigimos capa + descrição pra cortar itens sem metadados.
            const volumes = (await this.fetchVolumes(query, preferredLang, maxResults, startIndex, country, apiKey))
                .filter(v => {
                    const info = v.volumeInfo ?? {};
                    const hasThumbnail = Boolean(info.imageLinks?.thumbnail || info.imageLinks?.smallThumbnail);
                    const hasDescription = Boolean(info.description && info.description.trim().length > 0);
                    return hasThumbnail && hasDescription;
                });
            volumes.forEach((volume, index) => {
                if (!collected.has(volume.id)) collected.set(volume.id, { volume, index, titleHit: false });
            });
        } else {
            // Busca livre: FRASE EXATA no título e no autor (aspas), conforme a doc da API.
            // Sem aspas, `intitle:harry potter` vira intitle:harry + potter em qualquer campo,
            // o que trazia lixo (ex.: "The Americana Annual"). Não rodamos query geral full-text.
            const phrase = `"${query.replace(/"/g, '')}"`;
            const [titleVolumes, authorVolumes] = await Promise.all([
                this.fetchVolumes(`intitle:${phrase}`, preferredLang, maxResults, startIndex, country, apiKey),
                this.fetchVolumes(`inauthor:${phrase}`, preferredLang, maxResults, startIndex, country, apiKey),
            ]);

            titleVolumes.forEach((volume, index) => {
                if (!collected.has(volume.id)) collected.set(volume.id, { volume, index, titleHit: true });
            });
            authorVolumes.forEach((volume, index) => {
                if (!collected.has(volume.id)) collected.set(volume.id, { volume, index, titleHit: false });
            });
        }

        const total = collected.size;
        const ranked = Array.from(collected.values())
            .map(({ volume, index, titleHit }) => ({
                dto: this.toDTO(volume),
                score: this.scoreFor(volume, index, total, preferredLang, weights, titleHit),
            }))
            .sort((a, b) => b.score - a.score)
            .map(entry => entry.dto);

        // Filtra DE FATO pelo idioma alvo (o langRestrict do Google é fraco e devolve inglês
        // mesmo pedindo pt). Mostra só os do idioma do app; só completa com outros idiomas
        // quando há poucos resultados, pra não deixar a lista vazia.
        const inLang = ranked.filter(b => b.language === preferredLang);
        const others = ranked.filter(b => b.language !== preferredLang);
        const finalList = inLang.length >= MIN_RESULTS_IN_LANGUAGE ? inLang : [...inLang, ...others];

        return finalList.slice(0, maxResults);
    }
}
