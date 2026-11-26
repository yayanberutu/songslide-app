import assert from "node:assert/strict";
import test from "node:test";
import {
  autoPair,
  backspaceJoin,
  insertAtCursor,
  skipOver
} from "./notation-input-helpers";

test("insertAtCursor inserts standalone tokens at cursor", () => {
  // Insert bar line
  const res1 = insertAtCursor("1 2 3", 5, 5, " |");
  assert.equal(res1.value, "1 2 3 |");
  assert.equal(res1.selectionStart, 7);
  assert.equal(res1.selectionEnd, 7);

  // Insert octave marker in the middle
  const res2 = insertAtCursor("1 2 3", 1, 1, "'");
  assert.equal(res2.value, "1' 2 3");
  assert.equal(res2.selectionStart, 2);
  assert.equal(res2.selectionEnd, 2);

  // Replaces selected range
  const res3 = insertAtCursor("1 2 3", 2, 3, "4");
  assert.equal(res3.value, "1 4 3");
  assert.equal(res3.selectionStart, 3);
});

test("insertAtCursor wraps selected text for beam and slur groups", () => {
  // Wrap selected text with beam [ ]
  const res1 = insertAtCursor("1 4 5 6", 2, 5, "[ ]");
  assert.equal(res1.value, "1 [4 5] 6");
  assert.equal(res1.selectionStart, 7);
  assert.equal(res1.selectionEnd, 7);

  // Wrap selected text with slur ( )
  const res2 = insertAtCursor("1 4 5 6", 2, 5, "( )");
  assert.equal(res2.value, "1 (4 5) 6");
  assert.equal(res2.selectionStart, 7);
  assert.equal(res2.selectionEnd, 7);
});

test("insertAtCursor inserts empty group and places cursor inside when no selection", () => {
  const res1 = insertAtCursor("1 ", 2, 2, "[ ]");
  assert.equal(res1.value, "1 [ ]");
  assert.equal(res1.selectionStart, 3); // right after '['
  assert.equal(res1.selectionEnd, 3);

  const res2 = insertAtCursor("1 ", 2, 2, "( )");
  assert.equal(res2.value, "1 ( )");
  assert.equal(res2.selectionStart, 3); // right after '('
  assert.equal(res2.selectionEnd, 3);
});

test("autoPair automatically inserts closing bracket and positions cursor inside", () => {
  // Typing '[' in empty string
  const res1 = autoPair("", 0, 0, "[");
  assert.deepEqual(res1, {
    value: "[]",
    selectionStart: 1,
    selectionEnd: 1
  });

  // Typing '(' in middle of string
  const res2 = autoPair("1  2", 2, 2, "(");
  assert.deepEqual(res2, {
    value: "1 () 2",
    selectionStart: 3,
    selectionEnd: 3
  });

  // Typing '[' with selected text wraps selection
  const res3 = autoPair("4 5", 0, 3, "[");
  assert.deepEqual(res3, {
    value: "[4 5]",
    selectionStart: 1,
    selectionEnd: 4
  });

  // Non-bracket char returns null
  assert.equal(autoPair("123", 1, 1, "a"), null);
});

test("skipOver moves cursor past closing bracket without duplicating", () => {
  // Cursor before ']'
  const res1 = skipOver("[4 5]", 4, 4, "]");
  assert.deepEqual(res1, {
    value: "[4 5]",
    selectionStart: 5,
    selectionEnd: 5
  });

  // Cursor before ')'
  const res2 = skipOver("(4 5)", 4, 4, ")");
  assert.deepEqual(res2, {
    value: "(4 5)",
    selectionStart: 5,
    selectionEnd: 5
  });

  // Cursor not before closing bracket returns null
  assert.equal(skipOver("[4 5]", 2, 2, "]"), null);
  // Different closing char returns null
  assert.equal(skipOver("[4 5]", 4, 4, ")"), null);
  // Range selection returns null
  assert.equal(skipOver("[4 5]", 4, 5, "]"), null);
});

test("backspaceJoin deletes both open and close brackets when cursor is between them", () => {
  // Between empty brackets '[]'
  const res1 = backspaceJoin("[]", 1, 1);
  assert.deepEqual(res1, {
    value: "",
    selectionStart: 0,
    selectionEnd: 0
  });

  // Between empty parentheses '()' inside other text
  const res2 = backspaceJoin("1 () 2", 3, 3);
  assert.deepEqual(res2, {
    value: "1  2",
    selectionStart: 2,
    selectionEnd: 2
  });

  // Not between empty pair returns null
  assert.equal(backspaceJoin("[4]", 2, 2), null);
  assert.equal(backspaceJoin(")", 0, 0), null);
  assert.equal(backspaceJoin("[]", 0, 0), null);
  assert.equal(backspaceJoin("[]", 1, 2), null);
});
