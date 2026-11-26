export type TextSelection = {
  value: string;
  selectionStart: number;
  selectionEnd: number;
};

/**
 * Inserts text at the current cursor position or replaces the selected range.
 * If textToInsert is a group like "[ ]" or "( )", wraps the selection if present,
 * or inserts the group and places the cursor inside.
 */
export function insertAtCursor(
  value: string,
  selectionStart: number,
  selectionEnd: number,
  textToInsert: string
): TextSelection {
  const start = Math.min(Math.max(0, selectionStart), value.length);
  const end = Math.min(Math.max(start, selectionEnd), value.length);

  if (textToInsert === "[ ]" || textToInsert === "[]") {
    if (start !== end) {
      const selected = value.slice(start, end);
      const nextValue = value.slice(0, start) + "[" + selected + "]" + value.slice(end);
      const nextCursor = start + selected.length + 2;
      return {
        value: nextValue,
        selectionStart: nextCursor,
        selectionEnd: nextCursor
      };
    }

    const inserted = textToInsert;
    const nextValue = value.slice(0, start) + inserted + value.slice(end);
    // Position cursor inside the brackets
    const nextCursor = start + 1;
    return {
      value: nextValue,
      selectionStart: nextCursor,
      selectionEnd: nextCursor
    };
  }

  if (textToInsert === "( )" || textToInsert === "()") {
    if (start !== end) {
      const selected = value.slice(start, end);
      const nextValue = value.slice(0, start) + "(" + selected + ")" + value.slice(end);
      const nextCursor = start + selected.length + 2;
      return {
        value: nextValue,
        selectionStart: nextCursor,
        selectionEnd: nextCursor
      };
    }

    const inserted = textToInsert;
    const nextValue = value.slice(0, start) + inserted + value.slice(end);
    // Position cursor inside the parentheses
    const nextCursor = start + 1;
    return {
      value: nextValue,
      selectionStart: nextCursor,
      selectionEnd: nextCursor
    };
  }

  const nextValue = value.slice(0, start) + textToInsert + value.slice(end);
  const nextCursor = start + textToInsert.length;

  return {
    value: nextValue,
    selectionStart: nextCursor,
    selectionEnd: nextCursor
  };
}

/**
 * When typing opening bracket '[' or '(', automatically inserts the closing pair.
 * If text is selected, wraps the selection with the pair.
 */
export function autoPair(
  value: string,
  selectionStart: number,
  selectionEnd: number,
  char: string
): TextSelection | null {
  if (char !== "[" && char !== "(") {
    return null;
  }

  const start = Math.min(Math.max(0, selectionStart), value.length);
  const end = Math.min(Math.max(start, selectionEnd), value.length);
  const closingChar = char === "[" ? "]" : ")";

  if (start !== end) {
    const selected = value.slice(start, end);
    const nextValue = value.slice(0, start) + char + selected + closingChar + value.slice(end);
    return {
      value: nextValue,
      selectionStart: start + 1,
      selectionEnd: end + 1
    };
  }

  const nextValue = value.slice(0, start) + char + closingChar + value.slice(end);
  return {
    value: nextValue,
    selectionStart: start + 1,
    selectionEnd: start + 1
  };
}

/**
 * When typing closing bracket ']' or ')' and the cursor is right before that same closing char,
 * skips over the character instead of duplicating it.
 */
export function skipOver(
  value: string,
  selectionStart: number,
  selectionEnd: number,
  char: string
): TextSelection | null {
  if (char !== "]" && char !== ")") {
    return null;
  }

  if (selectionStart !== selectionEnd) {
    return null;
  }

  const pos = selectionStart;
  if (pos < value.length && value[pos] === char) {
    return {
      value,
      selectionStart: pos + 1,
      selectionEnd: pos + 1
    };
  }

  return null;
}

/**
 * When pressing Backspace between an empty pair (e.g. "[]" or "()"),
 * deletes both characters at once.
 */
export function backspaceJoin(
  value: string,
  selectionStart: number,
  selectionEnd: number
): TextSelection | null {
  if (selectionStart !== selectionEnd || selectionStart <= 0 || selectionStart >= value.length) {
    return null;
  }

  const prevChar = value[selectionStart - 1];
  const nextChar = value[selectionStart];

  if ((prevChar === "[" && nextChar === "]") || (prevChar === "(" && nextChar === ")")) {
    const nextValue = value.slice(0, selectionStart - 1) + value.slice(selectionStart + 1);
    return {
      value: nextValue,
      selectionStart: selectionStart - 1,
      selectionEnd: selectionStart - 1
    };
  }

  return null;
}
