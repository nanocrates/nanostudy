import type { MathNode } from "mathjs";

import { parseTex } from "tex-math-parser";
import { simplify } from "mathjs";

export function latexToAscii(latex: string): MathNode {                           
    const sanitisedLatex = latex
                    .replaceAll("\\cdot", "*")
                    .replaceAll("\\times", "*")
                    .replaceAll("pmatrix", "bmatrix");
    console.log(sanitisedLatex, "sanitisedLatex");
    return simplify(parseTex(sanitisedLatex));
}

export function simplifyAbnormalities(expression: string): string {
    if (!expression) return '';

    // Handle inline ($...$) or display ($$...$$) LaTeX blocks
    if (expression.includes('$')) {
        return expression.replace(/(\$\$[\s\S]*?\$\$|\$(?:\\\$|[^\$])+\$)/g, (match) => {
            if (match.startsWith('$$')) {
                return '$$' + simplifyMathString(match.slice(2, -2)) + '$$';
            }
            return '$' + simplifyMathString(match.slice(1, -1)) + '$';
        });
    }

    return simplifyMathString(expression);
}

function simplifyMathString(expr: string): string {
    let prev = '';
    let current = expr;
    let iterations = 0;

    // Run bounded passes until stable (max 5 passes)
    while (current !== prev && iterations < 5) {
        prev = current;
        iterations++;

        // 1. Unwrap redundant single-term scalar braces (e.g., {-3} -> -3, {+1} -> 1)
        // Preserves LaTeX command arguments (\sqrt{x}, \frac{a}{b}) and sub/superscripts (x_{-3})
        current = unwrapRedundantBraces(current);

        // 2. Resolve sign collisions with bracketed or parenthesized terms
        // e.g., -(-5) -> + 5, +(-5) -> - 5, -{-5} -> + 5
        current = current
            .replace(/-\s*[\(\{]\s*-\s*([a-zA-Z0-9_\^\.\{\}\\]+)\s*[\)\}]/g, ' + $1')
            .replace(/\+\s*[\(\{]\s*-\s*([a-zA-Z0-9_\^\.\{\}\\]+)\s*[\)\}]/g, ' - $1')
            .replace(/-\s*[\(\{]\s*\+\s*([a-zA-Z0-9_\^\.\{\}\\]+)\s*[\)\}]/g, ' - $1')
            .replace(/\+\s*[\(\{]\s*\+\s*([a-zA-Z0-9_\^\.\{\}\\]+)\s*[\)\}]/g, ' + $1');

        // 3. Collapse adjacent double signs without brackets
        // e.g., --5 -> + 5, +-5 -> - 5, -+5 -> - 5, ++5 -> + 5
        current = current
            .replace(/-\s*-\s*/g, ' + ')
            .replace(/\+\s*-\s*/g, ' - ')
            .replace(/-\s*\+\s*/g, ' - ')
            .replace(/\+\s*\+\s*/g, ' + ');

        // 4. Strip redundant unary plus signs across ALL contexts including matrices:
        // Matches after start of string, delimiters, operators, matrix column separators (&),
        // matrix row breaks (\\), and environment openers (\begin{pmatrix})
        current = current.replace(
            /(?<=^|[\(\=\{\[\<\>\+\-\*\/\&\,;\^_\~]|\\[\\a-zA-Z]+(?:\s*\{[^{}]*\})*)\s*\+\s*(?=[a-zA-Z0-9\(\[\{\\])/g,
            ''
        );

        // 5. Unwrap redundant single-term parens after operators or structural delimiters
        // e.g., (+5) -> 5, (-x) at start -> -x (preserves function calls like sin(x) and 2(x))
        current = current.replace(
            /(?<=^|[\(\=\{\[\<\>\+\-\*\/\&\,;\^_\~]|\\[\\a-zA-Z]+(?:\s*\{[^{}]*\})*)\s*\(\s*([\+\-]?\s*(?:\d+(?:\.\d+)?|[a-zA-Z]|\\(?:[a-zA-Z]+)))\s*\)/g,
            '$1'
        );

        // 6. Clean unit multipliers (* 1, 1 *, \cdot 1, \times 1) and division by 1
        current = current
            .replace(/\s*(?:\*|\\cdot|\\times)\s*1(?!\d|\.)/g, '')
            .replace(/(?<![\d\.[a-zA-Z\\])1\s*(?:\*|\\cdot|\\times)\s*/g, '')
            .replace(/\s*\/\s*1(?!\d|\.)/g, '');

        // 7. Remove explicit multiplication symbols before variables/parens/commands
        // e.g., 5 * x -> 5x, 5 \cdot x -> 5x, (a) * (b) -> (a)(b)
        current = current
            .replace(/(\d+(?:\.\d+)?)\s*(?:\*|\\cdot|\\times)\s*([a-zA-Z\(]|\\(?:[a-zA-Z]+))/g, '$1$2')
            .replace(/([a-zA-Z])\s*(?:\*|\\cdot|\\times)\s*([a-zA-Z\(]|\\(?:[a-zA-Z]+))/g, '$1$2')
            .replace(/(\))\s*(?:\*|\\cdot|\\times)\s*([a-zA-Z\(]|\\(?:[a-zA-Z]+))/g, '$1$2');

        // 8. Remove unit coefficients (e.g., 1x -> x, -1x -> -x, 1\alpha -> \alpha)
        current = current.replace(/(?<![\d\.[a-zA-Z\\])1([a-zA-Z]|\\(?:[a-zA-Z]+))/g, '$1');

        // 9. Clean zero terms in addition/subtraction (e.g., x + 0 -> x, x - 0 -> x, 0 + x -> x)
        current = current
            .replace(/(\+|\-)\s*0(?!\d|\.)/g, '')
            .replace(/(?<![\d\.[a-zA-Z\\])0\s*\+\s*/g, '');

        // 10. Normalize whitespace
        current = current.replace(/\s+/g, ' ').trim();
    }

    return current;
}

/**
 * Safely unwraps single-term scalar braces (e.g., {-3} -> -3, {+1} -> +1).
 * Preserves structural macro arguments (\sqrt{x}, \frac{1}{2}) and subscripts/superscripts (x_{-3}).
 */
function unwrapRedundantBraces(str: string): string {
    const braceRegex = /\{\s*([\+\-]?\s*(?:\d+(?:\.\d+)?|[a-zA-Z]|\\(?:[a-zA-Z]+)))\s*\}/g;

    return str.replace(braceRegex, (match, inner, offset, fullStr) => {
        const prefix = fullStr.slice(0, offset);

        if (isStructuralBrace(prefix)) {
            return match;
        }

        return inner.replace(/\s+/g, '');
    });
}

function isStructuralBrace(prefix: string): boolean {
    // 1. Subscript or superscript: x_{-3}, x^{-3}
    if (/[_\^]\s*$/.test(prefix)) return true;

    // 2. Direct argument to structural/formatting LaTeX macros (\sqrt, \frac, \begin, \vec, etc.)
    if (/\\(frac|dfrac|tfrac|binom|dbinom|tbinom|sqrt|vec|mathbf|mathrm|text|textbf|textit|overline|underline|hat|tilde|bar|dot|ddot|begin|end|operatorname|overset|underset)\s*$/.test(prefix)) {
        return true;
    }

    // 3. Second argument of 2-argument macros: \frac{a}{-3}, \binom{n}{-3}
    if (/\\(frac|dfrac|tfrac|binom|dbinom|tbinom|overset|underset)\s*\{[^{}]*\}\s*$/.test(prefix)) {
        return true;
    }

    return false;
}
