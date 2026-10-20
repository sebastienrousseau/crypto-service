// SPDX-License-Identifier: Apache-2.0 OR MIT
//
// Halstead difficulty per function, D = (n1 / 2) * (N2 / n2), from the
// TypeScript AST. ESLint has no maintained rule for it, so the complexity
// gate measures it here with the compiler the workspace already ships.
//
// Counting conventions (Halstead leaves them to the implementer):
// - operands are identifiers, literals, template parts, true/false/null,
//   this and super; every other token is an operator;
// - a bracket pair counts once, on its opening token;
// - types are erased first (transpiled to ESNext, nothing downlevelled),
//   so annotations, generics and `as` do not count; enum and parameter
//   property code TypeScript emits does;
// - a nested function is measured on its own and excluded from its parent.

import ts from "typescript";

const OPERAND_KINDS = new Set([
  ts.SyntaxKind.Identifier,
  ts.SyntaxKind.PrivateIdentifier,
  ts.SyntaxKind.NumericLiteral,
  ts.SyntaxKind.BigIntLiteral,
  ts.SyntaxKind.StringLiteral,
  ts.SyntaxKind.RegularExpressionLiteral,
  ts.SyntaxKind.NoSubstitutionTemplateLiteral,
  ts.SyntaxKind.TemplateHead,
  ts.SyntaxKind.TemplateMiddle,
  ts.SyntaxKind.TemplateTail,
  ts.SyntaxKind.TrueKeyword,
  ts.SyntaxKind.FalseKeyword,
  ts.SyntaxKind.NullKeyword,
  ts.SyntaxKind.ThisKeyword,
  ts.SyntaxKind.SuperKeyword,
]);

const SKIPPED_TOKENS = new Set([
  ts.SyntaxKind.CloseParenToken,
  ts.SyntaxKind.CloseBracketToken,
  ts.SyntaxKind.CloseBraceToken,
  ts.SyntaxKind.EndOfFileToken,
]);

/** Functions measured on their own. */
function isFunction(node) {
  return (
    ts.isFunctionDeclaration(node) ||
    ts.isFunctionExpression(node) ||
    ts.isArrowFunction(node) ||
    ts.isMethodDeclaration(node) ||
    ts.isConstructorDeclaration(node) ||
    ts.isGetAccessorDeclaration(node) ||
    ts.isSetAccessorDeclaration(node)
  );
}

/** Collect the tokens of `root`, excluding nested functions and types. */
function tokensOf(root, sourceFile) {
  const tokens = [];
  const visit = (node) => {
    if (node !== root && isFunction(node)) return;
    if (ts.isJSDoc(node)) return;
    const children = node.getChildren(sourceFile);
    if (children.length === 0) {
      // An empty list (no parameters) is a leaf too, but not a token.
      const isToken = node.kind < ts.SyntaxKind.FirstNode;
      if (isToken && !SKIPPED_TOKENS.has(node.kind)) tokens.push(node);
      return;
    }
    for (const child of children) visit(child);
  };
  visit(root);
  return tokens;
}

/** Halstead difficulty of a token list, rounded to one decimal. */
export function difficulty(tokens, sourceFile) {
  const operators = new Set();
  const operands = new Set();
  let operandCount = 0;
  for (const token of tokens) {
    if (OPERAND_KINDS.has(token.kind)) {
      operands.add(token.getText(sourceFile));
      operandCount += 1;
    } else {
      operators.add(ts.SyntaxKind[token.kind]);
    }
  }
  if (operands.size === 0) return 0;
  const d = (operators.size / 2) * (operandCount / operands.size);
  return Math.round(d * 10) / 10;
}

/** A stable name: the function's own, or the binding it is assigned to. */
function nameOf(node, sourceFile) {
  if (node.name) return node.name.getText(sourceFile);
  if (ts.isConstructorDeclaration(node)) return "constructor";
  const parent = node.parent;
  if (
    ts.isVariableDeclaration(parent) ||
    ts.isPropertyAssignment(parent) ||
    ts.isPropertyDeclaration(parent)
  ) {
    return parent.name.getText(sourceFile);
  }
  if (ts.isExportAssignment(parent)) return "default export";
  return undefined;
}

/** `text` with its types erased, as runtime JavaScript. */
function eraseTypes(text, fileName) {
  return ts.transpileModule(text, {
    fileName,
    compilerOptions: {
      target: ts.ScriptTarget.ESNext,
      module: ts.ModuleKind.ESNext,
      removeComments: true,
    },
  }).outputText;
}

/**
 * Measure every function in `text`; return [{ name, lineText, value }]
 * for those over `max`. `name` is undefined for an unnamed function,
 * which the caller names from `lineText`, its first line after type
 * erasure, as it does from source lines for ESLint's reports.
 */
export function measureHalstead(text, fileName, max) {
  const sourceFile = ts.createSourceFile(
    fileName.replace(/\.ts$/, ".js"),
    eraseTypes(text, fileName),
    ts.ScriptTarget.Latest,
    true,
  );
  const lines = sourceFile.text.split("\n");
  const results = [];
  const visit = (node) => {
    if (isFunction(node)) {
      const value = difficulty(tokensOf(node, sourceFile), sourceFile);
      if (value > max) {
        const start = node.getStart(sourceFile);
        const { line } = sourceFile.getLineAndCharacterOfPosition(start);
        results.push({
          name: nameOf(node, sourceFile),
          lineText: lines[line],
          value,
        });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return results;
}
