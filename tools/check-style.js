#!/usr/bin/env node
/**
 * Project style guard.
 *
 * Two rules the linter cannot express:
 *   1. Source and documentation are written in English.
 *   2. Emoji are allowed only where a human reads them at runtime, i.e. inside
 *      a Discord message or a console log. They are banned from comments,
 *      identifiers, JSDoc and Markdown.
 *
 * Usage: node tools/check-style.js
 * Exits with code 1 and a list of offending lines when a rule is broken.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const IGNORED_DIRS = new Set(['node_modules', '.git', 'logs', 'configs', 'coverage']);

// Files exempted from both rules: the personal operations runbook, and the
// local audit notes, which are not tracked.
const EXEMPT_FILES = new Set(['DEMARRAGE.md', 'AUDIT.md']);

// Pictographs only. Typographic arrows and box-drawing characters are not
// emoji and stay allowed in documentation.
const EMOJI =
    /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{231A}-\u{23FF}]|\u{FE0F}|\u{20E3}/u;

// Accented characters are the cheapest reliable signal for French in this
// codebase; the word list catches the unaccented cases.
const ACCENTS = /[àâäçéèêëîïôöùûüÿœæÀÂÄÇÉÈÊËÎÏÔÖÙÛÜŸŒÆ]/;
const FRENCH_WORDS =
    /\b(les|une|des|dans|pour|avec|sont|cette|ces|donc|alors|fichier|dossier|erreur|aucune|salon|serveur|utilisateur|transfere)\b/i;

const errors = [];

function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.isDirectory()) {
            if (IGNORED_DIRS.has(entry.name)) continue;
            walk(path.join(dir, entry.name));
        } else if (/\.(js|md)$/.test(entry.name)) {
            check(path.join(dir, entry.name));
        }
    }
}

/**
 * Strip the parts of a JS line where emoji are legitimate: string literals and
 * template literals. What remains is code and comments.
 */
function codeOnly(line) {
    return line
        .replace(/`(?:\\.|\$\{[^}]*\}|[^`\\])*`/g, '``')
        .replace(/'(?:\\.|[^'\\])*'/g, "''")
        .replace(/"(?:\\.|[^"\\])*"/g, '""');
}

function isComment(line) {
    const trimmed = line.trim();
    return trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*');
}

function check(file) {
    const relative = path.relative(ROOT, file).split(path.sep).join('/');
    if (relative === 'tools/check-style.js') return;

    const isMarkdown = file.endsWith('.md');
    if (EXEMPT_FILES.has(relative)) return;
    const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);

    lines.forEach((line, index) => {
        const position = `${relative}:${index + 1}`;

        // Emoji: banned in Markdown entirely, and in JS outside string literals.
        const emojiScope = isMarkdown ? line : codeOnly(line);
        if (EMOJI.test(emojiScope)) {
            errors.push(`${position}  emoji outside a Discord message or a log`);
        }

        if (isMarkdown || isComment(line)) {
            if (ACCENTS.test(line) || FRENCH_WORDS.test(line)) {
                errors.push(`${position}  looks like French: ${line.trim().slice(0, 70)}`);
            }
        } else if (ACCENTS.test(line)) {
            errors.push(`${position}  non-English text: ${line.trim().slice(0, 70)}`);
        }
    });
}

walk(ROOT);

if (errors.length > 0) {
    console.error(`Style check failed (${errors.length} problem(s)):`);
    for (const error of errors) console.error(`  ${error}`);
    process.exit(1);
}

console.log('Style check passed.');
