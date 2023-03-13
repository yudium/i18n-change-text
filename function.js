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

  if (candidate_parent_keys.length === 0) {
    throw new Error("no rootkey");
  }

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
let key_dict = {};
let global_keys = [];

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

// function generateJSON() {
//   const json = generateJSONByKeyList(
//     keys.reduce((acc, item) => ({ ...acc, [item.key]: item.value }), {})
//   );
//   return JSON.stringify(json, null, 2);
// }
function generateJSON() {
  // const keys = getKeysInEditor();
  const json = generateJSONByKeyList(
    // keys.reduce((acc, key) => ({ ...acc, [key]: key_dict[key] }), {})
    global_keys.reduce((acc, { key, value }) => ({ ...acc, [key]: value }), {})
  );
  return JSON.stringify(json, null, 2);
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

  const { content, key, value } = replace(
    getBefore(),
    getSelectedText(),
    after,
    user_key.value
  );

  editor.setValue(content);

  new_key = { key, value };
  // keys.push({ key, value });

  console.log("START");
  console.log("getKeysInEditor");
  console.log(getKeysInEditor());
  console.log("global_keys");
  console.log(global_keys);
  console.log("value");
  console.log(value);
  global_keys = syncKeysBetweenEditorAndJSONv2(
    getKeysInEditor(),
    global_keys,
    value
  );

  console.log("global_keys");
  console.log(global_keys);

  key_dict[key] = value;

  keyListEditor.setValue(generateJSON());
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

function removeArrayItemByReference(theArray, ref) {
  let index = theArray.indexOf(ref);
  if (index !== -1) {
    theArray.splice(index, 1);
  }
}

let last_keys = [];

editor.onDidChangeCursorPosition((e) => {
  /**
   * sync keys between editor and json
   */

  const keys = getKeysInEditor();

  if (keys.length <= global_keys.length) {
    global_keys = syncKeysBetweenEditorAndJSONv2(keys, global_keys);
    keyListEditor.setValue(generateJSON());
    // if (change !== undefined) {
    //   // we change keys becuase keys contains original string
    //   // const changedKey = keys.find((k) => k.key === change.oldKey);
    //   if (change.newKey) {
    //     key_dict[change.newKey] = key_dict[change.oldKey];
    //     delete key_dict[change.oldKey];
    //     // changedKey.key = change.newKey;
    //   } else {
    //     removeArrayItemByReference(keys, changedKey);
    //   }
    //   keyListEditor.setValue(generateJSON());
    // }
  }

  // end
  last_keys = keys;

  /**
   * show replacer
   */
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

  // editor.getTopForPosition(e.position.lineNumber, e.position.column)
  const topRelativeToEditorContainer = editor.getScrolledVisiblePosition({
    lineNumber: e.position.lineNumber,
    column: e.position.column,
  });

  const top = 25 + editorEl.offsetTop + topRelativeToEditorContainer.top + "px";

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

function syncKeysBetweenEditorAndJSON(fromEditor, fromJson) {
  // added key
  if (fromEditor.length > fromJson.length) {
    return;
  }

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

function getKeysInEditor() {
  // this is horrible regex, refactor
  // it matches anything with t("anything here"), t("") and t("<separated by new line>")
  const keys = editor.getValue().match(/t\(\"((?!\"\))(.|\s))*\"\)/g);

  if (!Array.isArray(keys) || keys.length === 0) {
    return [];
  }

  return keys.map((k) => k.replace('t("', "").replace('")', ""));
}

/**
 * Notification
 */
const notif = document.getElementById("notif");
editor.onDidPaste((e) => {
  notif.style.display = "none";

  // in case multiple notif at the same time
  setTimeout(() => {
    notif.style.display = "block";
    notif.innerText = "Do not forget Root Key at the top";
    setTimeout(() => {
      notif.style.display = "none";
    }, 2000);
  }, 10);
});

/***
 * syncKeysBetweenEditorAndJSON v2
 */
function syncKeysBetweenEditorAndJSONv2(fromEditor, fromJson, new_value) {
  // added
  if (
    fromEditor.length > fromJson.length ||
    (typeof new_value === "string" && new_value !== "")
  ) {
    let index = -1;

    let stop = false;
    fromEditor.forEach((key, i) => {
      if (stop) return;
      const addedAtLast = fromJson[i] === undefined;
      const addedAtBeginningOrMiddle =
        fromJson[i] !== undefined && key !== fromJson[i].key;
      if (addedAtLast || addedAtBeginningOrMiddle) {
        index = i;
        stop = true;
      }
    });

    const copy = fromJson.slice();
    copy.splice(index, 0, {
      key: fromEditor[index],
      value: new_value,
    });
    return copy;
  }

  // must be deleted
  if (fromEditor.length < fromJson.length) {
    // let deletedKey = "";
    let stop = false;

    let copy = fromJson.slice();
    fromJson.forEach(({ key }, i) => {
      if (stop === true) return;

      if (key !== fromEditor[i]) {
        // deletedKey = key;

        copy.splice(i, 1);

        stop = true;
      }
    });

    return copy;
  }

  // update
  let stop = false;

  let copy = fromJson.slice();

  fromJson.forEach(({ key }, i) => {
    if (stop === true) return;

    if (key !== fromEditor[i]) {
      if (fromEditor[i].trim() === "") {
        copy[i].key = "_empty_key_" + uniqueNumber();
        stop = true;
      } else {
        copy[i].key = fromEditor[i];
        stop = true;
      }
    }
  });

  return copy;
}

function uniqueNumber() {
  return Date.now() + Math.random().toString(10).substr(2, 9);
}
