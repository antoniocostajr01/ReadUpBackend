import { SearchBookDTO } from '../../dtos/book.dto';
import { SupportedLanguage } from './language';

/**
 * Google Books reduzido ao papel de rede de segurança: só entra quando a Open
 * Library não devolve nada (fora do ar, ou título brasileiro que ela não indexa).
 *
 * Sem ranking, sem re-score, sem curadoria — tudo isso vivia aqui e foi deletado
 * porque tentava reconstruir "obra canônica" a partir de um índice de edições.
 */

const ENDPOINT = 'https://www.googleapis.com/books/v1/volumes';

interface GoogleVolume {
    id: string;
    volumeInfo?: {
        title?: string;
        authors?: string[];
        description?: string;
        pageCount?: number;
        language?: string;
        publishedDate?: string;
        imageLinks?: { thumbnail?: string; smallThumbnail?: string };
    };
}

interface GoogleResponse {
    items?: GoogleVolume[];
}

function normalizeCoverUrl(url?: string): string | null {
    if (!url) return null;
    // O edge=curl quebra o render da capa; http quebra em ATS.
    return url.replace(/^http:\/\//, 'https://').replace('&edge=curl', '').trim();
}

function toDTO(volume: GoogleVolume): SearchBookDTO {
    const info = volume.volumeInfo ?? {};
    return {
        id: volume.id,
        title: info.title ?? 'Untitled',
        author: info.authors?.join(', ') ?? null,
        totalPages: info.pageCount ?? 0,
        details: info.description?.trim() ?? null,
        coverUrl: normalizeCoverUrl(info.imageLinks?.thumbnail ?? info.imageLinks?.smallThumbnail),
        language: info.language ?? 'en',
        publishedDate: info.publishedDate ?? null,
    };
}

/** Mesmo papel de rede de segurança, mas pro lookup por ISBN. Sem langRestrict: o
 * ISBN já identifica uma edição específica, restringir por idioma só derrubaria o match. */
export async function lookupIsbnFallback(isbn: string): Promise<SearchBookDTO | null> {
    const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
    if (!apiKey) return null;

    const params = new URLSearchParams({
        q: `isbn:${isbn}`,
        maxResults: '1',
        key: apiKey,
    });

    try {
        const response = await fetch(`${ENDPOINT}?${params.toString()}`);
        if (!response.ok) return null;
        const data = (await response.json()) as GoogleResponse;
        const volume = (data.items ?? []).find(item => Boolean(item.volumeInfo?.title));
        return volume ? toDTO(volume) : null;
    } catch (error) {
        console.error('Google Books fallback unreachable:', error);
        return null;
    }
}

export async function searchFallback(
    query: string,
    lang: SupportedLanguage,
    limit: number
): Promise<SearchBookDTO[]> {
    const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
    if (!apiKey) return [];

    const params = new URLSearchParams({
        q: `"${query.replace(/"/g, '')}"`,
        langRestrict: lang,
        printType: 'books',
        maxResults: String(Math.min(limit, 40)),
        key: apiKey,
    });

    try {
        const response = await fetch(`${ENDPOINT}?${params.toString()}`);
        if (!response.ok) return [];
        const data = (await response.json()) as GoogleResponse;
        return (data.items ?? [])
            .filter(volume => Boolean(volume.volumeInfo?.title))
            .map(toDTO);
    } catch (error) {
        console.error('Google Books fallback unreachable:', error);
        return [];
    }
}
