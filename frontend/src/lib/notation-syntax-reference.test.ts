import test from "node:test";
import assert from "node:assert/strict";
import { NOTATION_CHEAT_SHEET } from "./notation-syntax-reference.js";
import { parseNotationLine } from "./notation-parser.js";

test("NOTATION_CHEAT_SHEET includes all required tokens", () => {
  const expectedTokens = [
    "1 - 7",
    "0",
    "' / ,",
    "# / b",
    ".",
    "| / ||",
    "[ ]",
    "( )",
    "([ ])",
    "^"
  ];

  const presentTokens = NOTATION_CHEAT_SHEET.map((item) => item.token);
  for (const expected of expectedTokens) {
    assert.ok(
      presentTokens.includes(expected),
      `Missing expected token in cheat sheet: ${expected}`
    );
  }
  assert.strictEqual(NOTATION_CHEAT_SHEET.length, 10);
});

test("NOTATION_CHEAT_SHEET items have valid names, descriptions, and examples", () => {
  for (const item of NOTATION_CHEAT_SHEET) {
    assert.ok(item.token.trim().length > 0, "token must not be empty");
    assert.ok(item.name.trim().length > 0, "name must not be empty");
    assert.ok(item.description.trim().length > 0, "description must not be empty");
    assert.ok(item.example.trim().length > 0, "example must not be empty");
  }
});

test("syntax examples parse as valid notation constructs", () => {
  // Test individual notation snippets from examples
  const validSnippets = [
    "1 2 3",
    "0",
    "1' 5,",
    "#4 b7",
    "1 . .",
    "| 1 2 3 4 | ||",
    "[1 2]",
    "(1 2)",
    "([1 2 3])",
    "[(1 2) 3]",
    "1^ 3'^ 0^"
  ];

  for (const snippet of validSnippets) {
    const result = parseNotationLine(snippet);
    assert.strictEqual(
      result.issues.length,
      0,
      `Snippet should parse without issues: "${snippet}", got: ${JSON.stringify(result.issues)}`
    );
  }
});
