/**
 * Main algorithm
 */
function combineKeys(str) {
  return str.filter((s) => s.trim() !== "").join(".");
}

const BANG = "///";

function getLineIndentSize(line) {
  return line.split("").filter((c) => c === " ").length;
}

function extractParentKeys(content) {
  let candidate_parent_keys = content
    .split("\n")
    .filter((line) => line.trim().startsWith(BANG))
    .reverse();

  let first_key = candidate_parent_keys[0];
  let current_key = candidate_parent_keys[0];
  candidate_parent_keys = candidate_parent_keys.slice(1);

  let parent_keys = candidate_parent_keys.filter((key, i) => {
    const isRootKey = candidate_parent_keys.length - 1 === i;

    if (isRootKey) {
      return true;
    }

    if (getLineIndentSize(key) < getLineIndentSize(current_key)) {
      current_key = key;
      return true;
    }
  });

  parent_keys.unshift(first_key);

  parent_keys = parent_keys.map((key) => key.replace(BANG, "").trim());

  return combineKeys(parent_keys.reverse());
}

function removeTrailingDot(str) {
  return str.replace(/\.$/, "");
}

function replace(before, target, after, userKey) {
  const parent_keys = removeTrailingDot(prefix_input.value);
  const key = combineKeys([parent_keys, userKey]);

  return {
    content: before + 't("' + key + '")' + after,
    key,
    value: target,
  };
}

/**
 * User interface logic
 */
let backup_content = "";
let keys = [];
let new_key = null;
let selectionStart = null;
let selectionEnd = null;

// const editor = document.getElementById("editor");
const user_key = document.getElementById("user_key");
// const translate_btn = document.getElementById("translate");
const revert_btn = document.getElementById("revert");
const key_list = document.getElementById("key-list");
const prefix_input = document.getElementById("prefix-input");
const error_msg_el = document.getElementById("error-msg");

function getBefore() {
  const selection = editor.getSelection();
  const line = selection.startLineNumber;
  const col = selection.startColumn;
  return editor.getModel().getValueInRange({
    startLineNumber: 0,
    startColumn: 0,
    endLineNumber: line,
    endColumn: col,
    selectionStartLineNumber: 0,
    selectionStartColumn: 0,
    positionLineNumber: line,
    positionColumn: col,
  });
}

function getAfter() {
  const end_line = editor.getModel().getLineCount();
  const end_col = editor.getModel().getLineMaxColumn(end_line);

  const selection = editor.getSelection();
  const start_line = selection.endLineNumber;
  const start_col = selection.endColumn;

  return editor.getModel().getValueInRange({
    startLineNumber: start_line,
    startColumn: start_col,
    endLineNumber: end_line,
    endColumn: end_col,
    selectionStartLineNumber: start_line,
    selectionStartColumn: start_col,
    positionLineNumber: end_line,
    positionColumn: end_col,
  });
}

function getSelectedText() {
  return editor.getModel().getValueInRange(editor.getSelection());
}

function translate() {
  backup_content = editor.getValue();

  const after = getAfter();

  const { content, key, value, cursor } = replace(
    getBefore(),
    getSelectedText(),
    after,
    user_key.value
  );

  const { startLineNumber, startColumn, endColumn, endLineNumber } =
    editor.getSelection();

  editor.setValue(content);

  new_key = { key, value };
  keys.push({
    key,
    value,
    cursor: {
      startLineNumber,
      startColumn,
      endLineNumber,
      endColumn,
    },
  });

  const json = generateJSONByKeyList(
    keys.reduce((acc, item) => ({ ...acc, [item.key]: item.value }), {})
  );

  keyListEditor.setValue(JSON.stringify(json, null, 2));
  attachEventListener();
}

function revert() {
  editor.setValue(backup_content);
  keys = keys.filter((k) => k.key !== new_key.key);
  new_key = null;
}

function handleInputEnter(e) {
  if (
    e.keyCode === 13 &&
    prefix_input.value.trim() !== "" &&
    user_key.value.trim() !== ""
  ) {
    translate();
  }
}

user_key.addEventListener("keydown", (e) => {
  handleInputEnter(e);
});

prefix_input.addEventListener("keydown", (e) => {
  handleInputEnter(e);
});

revert_btn.addEventListener("click", revert);

/**
 * Copy editor
 */
function removeBang(content) {
  return content
    .split("\n")
    .filter((line) => !line.trim().startsWith(BANG))
    .join("\n");
}

function copyEditor() {
  navigator.clipboard.writeText(removeBang(editor.value));
}

document
  .getElementById("copy-editor")
  .addEventListener("click", () => copyEditor());

/**
 * Copy element
 */
function copyElementText(el) {
  navigator.clipboard.writeText(el.innerText);
}

function attachEventListener() {
  document.querySelectorAll(".copy").forEach((el) => {
    console.log(el);
    el.addEventListener("click", () => {
      copyElementText(el);
    });
  });
}

/**
 * Keep selection
 */
const replacer = document.getElementById("replacer");
const editorEl = document.getElementById("editor");

editor.onDidChangeCursorPosition((e) => {
  if (getSelectedText().trim() === "") {
    replacer.style.top = -1000 + "px";
    replacer.style.left = -1000 + "px";
    user_key.value = "";
    return;
  }

  const { top, left } = getReplacerPositionByCursor(e);
  replacer.style.top = top;
  replacer.style.left = left;

  setPrefixInputValue(extractParentKeys(getBefore()));
});

function setPrefixInputValue(value) {
  prefix_input.value = value;
  error_msg_el.innerText =
    getKeyTotalDepth(prefix_input.value) > 4 - 1 ? "Key depth is too deep" : "";
}

prefix_input.addEventListener("input", (e) => {
  setPrefixInputValue(e.target.value);
});

function getKeyTotalDepth(key) {
  return key.split(".").filter((k) => k.trim() !== "").length;
}

function getReplacerPositionByCursor(e) {
  const WIDTH_LINE_NUMBER = 70;
  const MINUS = 20;

  const left =
    WIDTH_LINE_NUMBER +
    editorEl.offsetLeft +
    -MINUS +
    editor.getOffsetForColumn(e.position.lineNumber, e.position.column) +
    "px";

  const top =
    25 +
    editorEl.offsetTop +
    editor.getTopForPosition(e.position.lineNumber, e.position.column) +
    "px";

  return {
    left,
    top,
  };
}

editor.onKeyDown((e) => {
  if (getSelectedText().trim() === "") {
    return;
  }

  if (e.code === "Tab") {
    e.preventDefault();
    e.stopPropagation();
    user_key.focus();
  }
});

/**
 * ----------------------------------------------------------------------
 * Generate JSON section
 * ----------------------------------------------------------------------
 */
function generateJSONByKeyList(keyList) {
  let r = {};

  Object.keys(keyList).forEach((key) => {
    const value = keyList[key];

    const parts = removeTrailingDot(key)
      .split(".")
      .map((key) => key.trim());

    const root = {};
    let current_node = root;

    // TODO: refactor
    parts.forEach((key, i) => {
      const isLast = i === parts.length - 1;
      if (isLast) {
        current_node[key] = value;
      } else {
        current_node[key] = {};
        current_node = current_node[key];
      }
    }, root);

    r = combineJSON(r, root);
  });

  return r;
}

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function combineJSON(json1, json2) {
  const r = clone(json1);

  Object.keys(json2).forEach((key) => {
    if (r[key] === undefined) {
      r[key] = json2[key];
      return;
    } else {
      if (typeof r[key] === "object" && typeof r[key] === "object") {
        r[key] = combineJSON(r[key], json2[key]);
      }
      if (typeof r[key] !== "object") {
        const value = r[key];
        r[key] = { label: value };
        r[key] = combineJSON(r[key], json2[key]);
      }
      if (typeof json2[key] !== "object") {
        const value = json2[key];
        json2[key] = { label: value };
        r[key] = combineJSON(r[key], json2[key]);
      }
    }
  });

  return r;
}

// editor.addEventListener("onDidChange", (e) => {
//   if (e.key === "Backspace") {
//     const currentCursor = getCursorPosition();

//     keys.forEach(({ cursor }) => {
//       if (
//         currentCursor.line >= cursor.startLineNumber &&
//         currentCursor.line <= cursor.endLineNumber &&
//         currentCursor.col >= cursor.startColumn &&
//         currentCursor.col <= cursor.endColumn
//       ) {
//       }
//     });
//   }
// });

function syncKeysBetweenEditorAndJSON(fromEditor, fromJson) {
  // must be deleted
  if (fromEditor.length < fromJson.length) {
    let deletedKey = "";
    let stop = false;
    fromJson.forEach((key, i) => {
      if (stop === true) return;

      if (key !== fromEditor[i]) {
        deletedKey = key;
        stop = true;
      }
    });

    return { oldKey: deletedKey, newKey: "" };
  }

  // update
  let oldKey = "";
  let newKey = "";
  let stop = false;
  fromJson.forEach((key, i) => {
    if (stop === true) return;

    if (key !== fromEditor[i]) {
      oldKey = key;
      newKey = fromEditor[i];
      stop = true;
    }
  });

  return { oldKey, newKey };
}
