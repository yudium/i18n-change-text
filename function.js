/**
 * Main algorithm
 */
function combineKeys(str) {
  return str.filter((s) => s.trim() !== "").join(".");
}

const BANG = "///";

function extractCommentKey(content) {
  const keys = [];
  content.split("\n").forEach((line) => {
    if (line.trim().startsWith(BANG)) {
      keys.push(line.replace(BANG, "").trim());
    }
  });
  return combineKeys(keys);
}

function replace(content, start, end, userKey) {
  const before = content.substring(0, start);
  const after = content.substring(end);
  const target = content.substring(start, end);

  const key = combineKeys([extractCommentKey(before), userKey]);

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

const editor = document.getElementById("editor");
const user_key = document.getElementById("user_key");
const translate_btn = document.getElementById("translate");
const revert_btn = document.getElementById("revert");
const key_list = document.getElementById("key-list");
const selectionEl = document.getElementById("selection");

function translate() {
  backup_content = editor.value;

  const { content, key, value } = replace(
    editor.value,
    editor.selectionStart,
    editor.selectionEnd,
    user_key.value
  );

  // set editor value with formatted content
  // editor.value = prettier.format(content, {
  //   parser: "babel",
  //   plugins: prettierPlugins,
  // });
  editor.value = content

  new_key = { key, value };
  keys.push({ key, value });

  key_list.innerHTML = keys
    .map(
      (k) =>
        `<div>
            <span class="copy">${k.key}</span> :
            <span class="copy">${k.value}</span>
        </div>`
    )
    .join("");
  attachEventListener();
}

function revert() {
  editor.value = backup_content;
  keys = keys.filter((k) => k.key !== new_key.key);
  new_key = null;
}

translate_btn.addEventListener("click", translate);
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
editor.addEventListener("mouseup", () => {
  if (editor.selectionStart === editor.selectionEnd) {
    return;
  }

  selectionStart = editor.selectionStart;
  selectionEnd = editor.selectionEnd;
  selectionEl.innerText = editor.value.substring(selectionStart, selectionEnd);
});
