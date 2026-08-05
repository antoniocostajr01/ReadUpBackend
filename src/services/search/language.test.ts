import { test } from 'node:test';
import assert from 'node:assert';
import { resolveLanguage, toMarcLanguage } from './language';

test('diacrítico exclusivo do português força pt', () => {
    assert.equal(resolveLanguage('o senhor dos anéis', 'en'), 'pt');
});

test('stopwords em inglês forçam en mesmo com aparelho em pt', () => {
    assert.equal(resolveLanguage('the lord of the rings', 'pt'), 'en');
});

test('stopwords em português forçam pt mesmo com aparelho em en', () => {
    assert.equal(resolveLanguage('a menina que roubava livros', 'en'), 'pt');
});

test('sem sinal de idioma mantém o idioma do aparelho', () => {
    assert.equal(resolveLanguage('sapiens', 'pt'), 'pt');
    assert.equal(resolveLanguage('sapiens', 'en'), 'en');
});

test('idioma não suportado cai para en', () => {
    assert.equal(resolveLanguage('sapiens', 'fr'), 'en');
    assert.equal(resolveLanguage('sapiens', undefined), 'en');
});

test('normaliza variante regional do aparelho', () => {
    assert.equal(resolveLanguage('sapiens', 'pt-BR'), 'pt');
});

test('converte para o código MARC de três letras usado pela Open Library', () => {
    assert.equal(toMarcLanguage('pt'), 'por');
    assert.equal(toMarcLanguage('en'), 'eng');
});
