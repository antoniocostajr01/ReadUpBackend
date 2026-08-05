/**
 * Decide em que idioma os resultados devem vir.
 *
 * Regra: segue o idioma do aparelho, MAS se a query estiver claramente em outro
 * idioma, esse idioma ganha. Ex.: aparelho em pt + "the lord of the rings" → en.
 */

export type SupportedLanguage = 'pt' | 'en';

const SUPPORTED: SupportedLanguage[] = ['pt', 'en'];

// Stopwords servem só pra inferir o idioma da query — não entram na busca.
const PT_STOPWORDS = new Set([
    'o', 'os', 'a', 'as', 'um', 'uma', 'uns', 'umas', 'de', 'do', 'da', 'dos', 'das',
    'no', 'na', 'nos', 'nas', 'e', 'que', 'com', 'para', 'por', 'em', 'ao', 'aos',
    'meu', 'minha', 'seu', 'sua', 'não', 'é', 'são',
]);

const EN_STOPWORDS = new Set([
    'the', 'of', 'and', 'an', 'to', 'in', 'on', 'for', 'with', 'is', 'are', 'my',
    'your', 'from', 'at', 'as', 'about', 'how',
]);

// A Open Library usa códigos MARC de três letras.
const MARC: Record<SupportedLanguage, string> = { pt: 'por', en: 'eng' };

function normalize(code?: string): SupportedLanguage {
    if (!code) return 'en';
    const base = code.toLowerCase().split('-')[0] as SupportedLanguage;
    return SUPPORTED.includes(base) ? base : 'en';
}

export function resolveLanguage(query: string, deviceLang?: string): SupportedLanguage {
    const q = query.toLowerCase();

    // Diacríticos que só existem em português: sinal forte, decide sozinho.
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
    return normalize(deviceLang);
}

export function toMarcLanguage(lang: SupportedLanguage): string {
    return MARC[lang];
}
