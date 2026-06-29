/**
 * Sementes curadas por gênero (títulos populares/contemporâneos).
 *
 * Motivo: a Google Books API praticamente não retorna livros em português em buscas por
 * gênero (`subject:`), só em inglês. Como a busca POR TÍTULO funciona bem em pt, o backend
 * resolve cada título desta lista via busca por título e monta as seções de sugestão.
 *
 * Chave = slug do gênero (o texto após "subject:" enviado pelo app, em minúsculas).
 * Títulos sem edição no idioma do usuário simplesmente não resolvem e são ignorados,
 * então pode-se listar com folga.
 */
export const GENRE_SEEDS: Record<string, { pt?: string[]; en?: string[] }> = {
    'fantasy': {
        pt: [
            'O Nome do Vento', 'A Guerra dos Tronos', 'O Senhor dos Anéis',
            'Harry Potter e a Pedra Filosofal', 'O Império Final', 'O Priorado da Laranjeira',
            'Uma Corte de Espinhos e Rosas', 'Percy Jackson e o Ladrão de Raios',
            'A Roda do Tempo: O Olho do Mundo', 'O Hobbit', 'A Quinta Estação',
            'O Oceano no Fim do Caminho',
        ],
    },
    'science fiction': {
        pt: [
            'Duna', 'O Problema dos Três Corpos', 'Projeto Hail Mary', 'Fundação',
            '1984', 'Admirável Mundo Novo', 'Eu, Robô', 'O Guia do Mochileiro das Galáxias',
            'Neuromancer', 'A Mão Esquerda da Escuridão', 'O Conto da Aia', 'Klara e o Sol',
        ],
    },
    'romance': {
        pt: [
            'Como Eu Era Antes de Você', 'A Hipótese do Amor', 'É Assim que Acaba',
            'Os Sete Maridos de Evelyn Hugo', 'Orgulho e Preconceito',
            'Para Todos os Garotos que Já Amei', 'Beach Read', 'O Casamento Adormecido',
            'Me Chame Pelo Seu Nome', 'Uma Corte de Espinhos e Rosas', 'Talvez Em Outra Vida',
        ],
    },
    'mystery': {
        pt: [
            'O Clube do Crime das Quintas-feiras', 'Assassinato no Expresso do Oriente',
            'E Não Sobrou Nenhum', 'A Garota no Trem', 'Garota Exemplar',
            'Os Homens que Não Amavam as Mulheres', 'A Paciente Silenciosa',
            'O Código Da Vinci', 'Sherlock Holmes: Um Estudo em Vermelho', 'O Nome da Rosa',
        ],
    },
    'thriller': {
        pt: [
            'A Paciente Silenciosa', 'Garota Exemplar', 'O Silêncio dos Inocentes',
            'A Garota no Trem', 'Origem', 'Inferno', 'O Código Da Vinci',
            'Verity', 'O Instituto', 'A Última Coisa que Ele Me Disse',
        ],
    },
    'horror': {
        pt: [
            'It: A Coisa', 'O Iluminado', 'Drácula', 'Frankenstein', 'O Exorcista',
            'A Assombração da Casa na Colina', 'Cemitério', 'Carrie, a Estranha',
            'Mexican Gothic', 'A Volta do Parafuso',
        ],
    },
    'history': {
        pt: [
            'Sapiens: Uma Breve História da Humanidade', '1808', '1822', '1889',
            'Escravidão', 'Armas, Germes e Aço', 'O Diário de Anne Frank',
            'Sobre a Tirania', 'A Era dos Extremos', 'Nada de Novo no Front',
        ],
    },
    'philosophy': {
        pt: [
            'O Mundo de Sofia', 'Assim Falou Zaratustra', 'Meditações', 'A República',
            'O Existencialismo é um Humanismo', 'A Arte da Guerra', 'O Príncipe',
            'O Mito de Sísifo', 'Vigiar e Punir', 'A Coragem de Ser',
        ],
    },
    'poetry': {
        pt: [
            'Antologia Poética', 'A Rosa do Povo', 'Sentimento do Mundo', 'Claro Enigma',
            'Eu e Outras Poesias', 'Toda Poesia', 'Ou Isto ou Aquilo',
            'Poesia Completa', 'Vinte Poemas de Amor e Uma Canção Desesperada', 'O Livro dos Abraços',
        ],
    },
    'biography': {
        pt: [
            'Steve Jobs', 'Eu Sou Malala', 'Educada', 'Minha História',
            'O Diário de Anne Frank', 'Leonardo da Vinci', 'Einstein: Sua Vida, Seu Universo',
            'Quando Nietzsche Chorou', 'O Homem Mais Inteligente da História', 'Agatha Christie: Uma Autobiografia',
        ],
    },
    'self-help': {
        pt: [
            'Hábitos Atômicos', 'O Poder do Hábito', 'A Sutil Arte de Ligar o Foda-se',
            'Mindset: A Nova Psicologia do Sucesso', 'A Coragem de Ser Imperfeito',
            'O Milagre da Manhã', 'Essencialismo', 'Comece pelo Porquê',
            'As 5 Linguagens do Amor', 'Os Segredos da Mente Milionária',
        ],
    },
    'science': {
        pt: [
            'Uma Breve História do Tempo', 'Cosmos', 'Sapiens: Uma Breve História da Humanidade',
            'O Gene', 'O Gene Egoísta', 'Astrofísica para Apressados',
            'A Origem das Espécies', 'O Universo Numa Casca de Noz',
            'Por que Nós Dormimos', 'Breves Respostas para Grandes Questões',
        ],
    },
    'business': {
        pt: [
            'A Startup Enxuta', 'De Zero a Um', 'A Psicologia Financeira',
            'Pai Rico, Pai Pobre', 'Rápido e Devagar', 'O Investidor Inteligente',
            'Como Fazer Amigos e Influenciar Pessoas', 'Empresas Feitas para Vencer',
            'A Lógica do Cisne Negro', 'A Meta',
        ],
    },
    'comics': {
        pt: [
            'Watchmen', 'Batman: A Piada Mortal', 'Sandman', 'Maus', 'V de Vingança',
            'Persépolis', 'Demolidor: O Homem Sem Medo', 'Saga', 'Hellboy', 'Monica',
        ],
    },
    'design': {
        pt: [
            'O Design do Dia a Dia', 'Não Me Faça Pensar', 'Design para Quem Não é Designer',
            'Sprint', 'Isto é Design Thinking de Serviços', 'A Estética do Cotidiano',
            'Design Emocional', 'Storytelling com Dados', 'Hooked', 'Universos do Design',
        ],
    },
};
