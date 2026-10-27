export function simplifyAbnormalities(expression: string): string {
  if (!expression) return '';

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

  // Run bounded passes until stable
  while (current !== prev && iterations < 5) {
    prev = current;
    iterations++;

    // Unwrap redundant single-term scalar braces/brackets: e.g. {-2} -> -2, -{-9} -> -(-9)
    current = unwrapScalarBrackets(current);

    // Resolve adjacent and nested sign collisions: e.g. -(-9) -> 9, +(-1) -> -1, --9 -> +9
    current = simplifySigns(current);

    // Clean identity operations (unit multipliers, zero terms, leading pluses)
    current = current
      .replace(/(\+|\-)\s*0(?!\d|\.)/g, '')
      .replace(/(?<=^|[\+\-\*\/\(\=\{\[\s])0\s*\+\s*/g, '')
      .replace(/\*\s*1(?!\d|\.)/g, '')
      .replace(/\/\s*1(?!\d|\.)/g, '')
      .replace(/(\d+(?:\.\d+)?)\s*\*\s*([a-zA-Z\(]|\\(?:[a-zA-Z]+))/g, '$1$2')
      .replace(/\b1([a-zA-Z]|\\(?:[a-zA-Z]+))\b/g, '$1')
      .replace(/(?<=^|[\(\=\{\[\s])\+\s*/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  return current;
}

function unwrapScalarBrackets(str: string): string {
  const result: string[] = [];
  let i = 0;

  while (i < str.length) {
    // Check for LaTeX commands starting with \ (like \begin{pmatrix}, \end{pmatrix}, \frac{1}{2}, etc.)
    if (str[i] === '\\') {
      let cmd = '\\';
      i++;
      while (i < str.length && /[a-zA-Z]/.test(str[i])) {
        cmd += str[i];
        i++;
      }
      result.push(cmd);
      
      // Preserve critical arguments for structural LaTeX macros (e.g., \begin{pmatrix}, \end{matrix})
      if (
        cmd === '\\begin' || cmd === '\\end' || 
        cmd === '\\frac' || cmd === '\\pmatrix' ||
        cmd === '\\left' || cmd === '\\right'
      ) {
        // Find trailing brackets after the command and preserve them intact
        while (i < str.length && (str[i] === '{' || str[i] === '[' || str[i] === ' ' || str[i] === '(')) {
          if (str[i] === '{') {
            const end = findMatchingBracket(str, i, '{', '}');
            if (end !== -1) {
              result.push(str.slice(i, end + 1));
              i = end + 1;
              continue;
            }
          } else if (str[i] === '[') {
            const end = findMatchingBracket(str, i, '[', ']');
            if (end !== -1) {
              result.push(str.slice(i, end + 1));
              i = end + 1;
              continue;
            }
          }
          result.push(str[i]);
          i++;
        }
      }
      continue;
    }

    // Check for redundant scalar wrapper braces/brackets (e.g., {-2}, (15), [-7])
    if (str[i] === '{' || str[i] === '(' || str[i] === '[') {
      const openChar = str[i];
      const closeChar = openChar === '{' ? '}' : openChar === '(' ? ')' : ']';
      const end = findMatchingBracket(str, i, openChar, closeChar);

      if (end !== -1) {
        const inner = str.slice(i + 1, end).trim();

        // ONLY strip wrappers that surround purely a single signed scalar value/variable
        // I don't think it matches complex environments, matrix rows, or nested lists
        const isSingleScalar = /^[\+\-]?\s*(?:\d+(?:\.\d+)?|[a-zA-Z]|\\(?:[a-zA-Z]+))$/.test(inner);

        // Don't strip braces if they are preceded by subscript _, superscript ^, or LaTeX identifiers
        const isSubOrSuper = i > 0 && (str[i - 1] === '^' || str[i - 1] === '_');

        if (isSingleScalar && !isSubOrSuper) {
          result.push(inner);
          i = end + 1;
          continue;
        }
      }
    }

    result.push(str[i]);
    i++;
  }

  return result.join('');
}

function findMatchingBracket(str: string, start: number, open: string, close: string): number {
  let depth = 0;
  for (let i = start; i < str.length; i++) {
    if (str[i] === open) depth++;
    else if (str[i] === close) depth--;
    if (depth === 0) return i;
  }
  return -1;
}

function simplifySigns(str: string): string {
  return str
    // Sign interactions with bracketed negative numbers (e.g., -(-5) -> +5, +(-5) -> -5)
    .replace(/-\s*\(\s*-\s*([^\)]+)\s*\)/g, '+$1')
    .replace(/\+\s*\(\s*-\s*([^\)]+)\s*\)/g, '-$1')
    .replace(/-\s*\(\s*\+\s*([^\)]+)\s*\)/g, '-$1')
    .replace(/\+\s*\(\s*\+\s*([^\)]+)\s*\)/g, '+$1')
    // Adjacent double signs
    .replace(/\+\s*-\s*/g, '-')
    .replace(/-\s*\+\s*/g, '-')
    .replace(/-\s*-\s*/g, '+')
    .replace(/\+\s*\+\s*/g, '+');
}
