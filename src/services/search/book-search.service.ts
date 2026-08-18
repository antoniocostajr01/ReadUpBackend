import { SearchBookDTO } from '../../dtos/book.dto';
import { resolveLanguage, SupportedLanguage } from './language';
import { browseSubject, filterDocs, localizedEdition, lookupIsbn, searchWorks, toDTO, LocalizedEdition } from './openlibrary.provider';
import { lookupIsbnFallback, searchFallback } from './google-books.provider';
import { TtlCache } from './ttl-cache';

/**
 * Orquestra a busca de livros: Open Library como índice, Google Books como rede
 * de segurança, edição localizada e cache.
 */

const DEFAULT_MAX_RESULTS = 20;
const MAX_RESULTS_CAP = 40;
const MIN_QUERY_LENGTH = 2;
// Resolver a edição PT custa um request por obra; só vale pros que aparecem primeiro.
const LOCALIZE_LIMIT = 10;
// Pedimos mais que o limite porque o filtro descarta parte. Sem isso, uma página que
// chega cheia da OL sai curta daqui, e o app interpreta lista curta como "acabou" e
// para o scroll infinito. Páginas podem repetir item; o app já deduplica por id.
const OVERFETCH_FACTOR = 2;

// Edição em português de uma obra não muda: TTL longo é seguro.
const EDITION_TTL_MS = 24 * 60 * 60 * 1000;
// Vitrine de gênero é igual pra todo usuário do mesmo idioma e abre a cada sessão.
const GENRE_TTL_MS = 6 * 60 * 60 * 1000;
// Um ISBN nunca passa a apontar pra outro livro: TTL longo, e vale cachear até o "não achei".
const ISBN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const ISBN_PATTERN = /^(\d{9}[\dX]|\d{13})$/;

export interface SearchOptions {
    query: string;
    lang?: string;
    maxResults?: number;
    startIndex?: number;
}

export interface BrowseOptions {
    subject: string;
    lang?: string;
    maxResults?: number;
}

export class BookSearchService {
    // Por instância (não módulo): a rota monta um BookSearchService por processo
    // (mesmo padrão dos outros controllers), então o cache já vive o processo
    // inteiro sem precisar ser global — e cada teste ganha um cache limpo.
    // Busca livre digitada NÃO é cacheada: cada usuário digita algo diferente, o
    // acerto seria baixo e o custo de resultado velho é real.
    private editionCache = new TtlCache<LocalizedEdition | null>(EDITION_TTL_MS);
    private genreCache = new TtlCache<SearchBookDTO[]>(GENRE_TTL_MS);
    // Cacheia também o "não achei" (null): um ISBN ausente dos dois índices agora
    // não vai aparecer de repente daqui a uma hora.
    private isbnCache = new TtlCache<SearchBookDTO | null>(ISBN_TTL_MS);

    async search(options: SearchOptions): Promise<SearchBookDTO[]> {
        const query = options.query.trim();
        if (query.length < MIN_QUERY_LENGTH) return [];

        const lang = resolveLanguage(query, options.lang);
        const limit = this.clampLimit(options.maxResults);
        const offset = Math.max(options.startIndex ?? 0, 0);

        const docs = filterDocs(await searchWorks(query, lang, limit * OVERFETCH_FACTOR, offset));

        // Open Library vazia: fora do ar, ou título brasileiro que ela não indexa.
        if (docs.length === 0) {
            return searchFallback(query, lang, limit);
        }

        return this.localize(docs.slice(0, limit).map(toDTO), lang);
    }

    /** Lookup por código de barras (EAN-13/ISBN-13, ou ISBN-10 legado). Open Library
     * primeiro, Google Books como rede de segurança, igual ao fluxo de busca livre. */
    async lookupIsbn(isbn: string): Promise<SearchBookDTO | null> {
        const normalized = isbn.replace(/[^0-9Xx]/g, '').toUpperCase();
        if (!ISBN_PATTERN.test(normalized)) return null;

        // Sem chave por idioma: o ISBN identifica uma edição só, e ela é a mesma pra
        // qualquer usuário — o resultado não depende do idioma do app.
        const cached = this.isbnCache.get(normalized);
        if (cached !== undefined) return cached;

        // Sem `localize`: ela troca o título pelo da edição PT da obra, e aqui a edição
        // certa já veio do próprio código de barras — trocar seria desfazer o acerto.
        const doc = await lookupIsbn(normalized);
        const result = doc
            ? toDTO(doc)
            : await lookupIsbnFallback(normalized);

        this.isbnCache.set(normalized, result);
        return result;
    }

    async browse(options: BrowseOptions): Promise<SearchBookDTO[]> {
        // O app manda `subject:fantasy`; a query aqui é só o assunto.
        const subject = options.subject.replace(/^subject:/i, '').trim().toLowerCase();
        if (subject.length === 0) return [];

        const lang = this.normalizeLang(options.lang);
        const limit = this.clampLimit(options.maxResults);

        const cacheKey = `${subject}:${lang}`;
        const cached = this.genreCache.get(cacheKey);
        if (cached) return cached.slice(0, limit);

        const docs = filterDocs(await browseSubject(subject, lang, limit));
        const results = await this.localize(docs.map(toDTO), lang);

        this.genreCache.set(cacheKey, results);
        return results;
    }

    private clampLimit(maxResults?: number): number {
        return Math.min(Math.max(maxResults ?? DEFAULT_MAX_RESULTS, 1), MAX_RESULTS_CAP);
    }

    private normalizeLang(lang?: string): SupportedLanguage {
        return lang?.toLowerCase().startsWith('pt') ? 'pt' : 'en';
    }

    /**
     * Troca título e capa pelos da edição no idioma do usuário. Só os primeiros
     * resultados, em paralelo, com cache por obra — cada obra custa ~1,9s e 40 KB.
     * Em inglês não faz nada: o título da obra já é o canônico em inglês.
     */
    private async localize(books: SearchBookDTO[], lang: SupportedLanguage): Promise<SearchBookDTO[]> {
        if (lang !== 'pt') return books;

        const head = books.slice(0, LOCALIZE_LIMIT);
        const tail = books.slice(LOCALIZE_LIMIT);

        const localized = await Promise.all(head.map(async book => {
            const cacheKey = `${book.id}:${lang}`;
            let edition = this.editionCache.get(cacheKey);
            if (edition === undefined) {
                edition = await localizedEdition(book.id, lang);
                this.editionCache.set(cacheKey, edition);
            }
            if (!edition) return book;

            return {
                ...book,
                title: edition.title,
                coverUrl: edition.coverUrl ?? book.coverUrl,
                // A edição costuma não trazer páginas; a mediana da obra é melhor que zero.
                totalPages: edition.totalPages ?? book.totalPages,
                language: 'por',
            };
        }));

        return [...localized, ...tail];
    }
}
