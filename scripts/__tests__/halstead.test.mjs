// SPDX-License-Identifier: Apache-2.0 OR MIT
// SPDX-FileCopyrightText: 2026 Sebastien Rousseau

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import ts from "typescript";
import { difficulty, measureHalstead } from "../halstead.mjs";

/** Every function in `text` with its difficulty (max -1 reports all). */
const all = (text) => measureHalstead(text, "f.ts", -1);

describe("difficulty", () => {
  it("is (n1 / 2) * (N2 / n2), rounded to one decimal", () => {
    const sf = ts.createSourceFile("f.js", "a + a - b", ts.ScriptTarget.Latest);
    const tokens = [];
    const visit = (node) => {
      if (node.kind < ts.SyntaxKind.FirstNode) tokens.push(node);
      node.getChildren(sf).forEach(visit);
    };
    visit(sf);
    // Operators {+, -, EndOfFile}: 3; operands a, a, b: N2 3, n2 2.
    assert.equal(difficulty(tokens, sf), 2.3);
  });
  it("is 0 for a function with no operands", () => {
    assert.deepEqual(all("const f = () => {};"), [
      { name: "f", lineText: "const f = () => { };", value: 0 },
    ]);
  });
});

describe("measureHalstead", () => {
  it("names declarations, methods, constructors and bindings", () => {
    const text = [
      "/** doc */",
      "function decl(a: number): number { return a + 1; }",
      "class C {",
      "  constructor(private x: number) { this.x = x; }",
      "  method() { return this.x; }",
      "  get value() { return 1; }",
      "  set value(v) { this.x = v; }",
      "  prop = () => 2;",
      "}",
      "const obj = { key: function () { return 3; } };",
      "export default () => 4;",
      "[1].map((n) => n * 2);",
    ].join("\n");
    const names = all(text).map((r) => r.name);
    assert.deepEqual(names, [
      "decl",
      "constructor",
      "method",
      "value",
      "value",
      "prop",
      "key",
      "default export",
      undefined,
    ]);
  });
  it("measures a nested function on its own", () => {
    const [outer, inner] = all(
      "function outer(a) { const g = (b) => b * b * b; return a; }",
    );
    assert.equal(outer.name, "outer");
    assert.equal(inner.name, "g");
    assert.equal(inner.lineText, outer.lineText);
  });
  it("reports only functions over the maximum", () => {
    const text = "function small() { return 1; }";
    assert.deepEqual(measureHalstead(text, "f.ts", 30), []);
  });
});
