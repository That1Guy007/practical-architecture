(function () {
  "use strict";

  function getCodeText(wrapper) {
    var highlight = wrapper.querySelector(".highlight") || wrapper;
    var codeBlock = highlight.querySelector("code");
    var tableCode = highlight.querySelector(".lntable .lntd:last-child code");
    var inlineLines;

    if (!codeBlock) {
      return "";
    }
    inlineLines = codeBlock.querySelectorAll(".cl");
    if (inlineLines.length) {
      return Array.from(inlineLines)
        .map(function (line) {
          return line.textContent.replace(/\n$/, "");
        })
        .join("\n");
    }
    if (tableCode) {
      return tableCode.textContent.trimEnd();
    }
    return codeBlock.textContent.trimEnd();
  }

  function fallbackCopy(text, wrapper) {
    var textarea = document.createElement("textarea");
    var activeElement = document.activeElement;
    var copied;
    textarea.className = "pa-copy-textarea";
    textarea.value = text;
    textarea.tabIndex = -1;
    textarea.setAttribute("readonly", "");
    wrapper.appendChild(textarea);
    try {
      textarea.select();
      copied = document.execCommand("copy");
    } finally {
      textarea.remove();
      if (activeElement && typeof activeElement.focus === "function") {
        activeElement.focus({ preventScroll: true });
      }
    }
    if (!copied) {
      throw new Error("Copy command failed.");
    }
  }

  function copyText(text, wrapper) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    }
    return Promise.resolve().then(function () {
      fallbackCopy(text, wrapper);
    });
  }

  function showButtonState(button, text, label) {
    button.textContent = text;
    button.setAttribute("aria-label", label);
    window.setTimeout(function () {
      button.textContent = "Copy";
      button.setAttribute("aria-label", "Copy code");
    }, 1800);
  }

  function enhanceCodeBlocks() {
    document.querySelectorAll(".highlight-wrapper").forEach(function (wrapper) {
      var button;
      if (wrapper.querySelector(".pa-code-copy")) {
        return;
      }

      button = document.createElement("button");
      button.type = "button";
      button.className = "pa-code-copy";
      button.textContent = "Copy";
      button.setAttribute("aria-label", "Copy code");
      button.setAttribute("aria-live", "polite");
      button.addEventListener("click", function () {
        var code = getCodeText(wrapper);
        copyText(code, wrapper)
          .then(function () {
            showButtonState(button, "Copied", "Code copied");
          })
          .catch(function () {
            showButtonState(button, "Copy failed", "Code copy failed");
          });
      });
      wrapper.appendChild(button);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", enhanceCodeBlocks, { once: true });
  } else {
    enhanceCodeBlocks();
  }
})();
