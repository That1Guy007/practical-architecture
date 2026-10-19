(function (root) {
  "use strict";

  const THEMES = ["auto", "light", "dark"];

  function normalizeText(value) {
    return String(value || "")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase()
      .replace(/\s+/g, " ")
      .trim();
  }

  function normalizeList(value) {
    if (Array.isArray(value)) {
      return value.map(normalizeText).filter(Boolean);
    }

    return String(value || "")
      .split("|")
      .map(normalizeText)
      .filter(Boolean);
  }

  function matchesDocument(documentRecord, filters) {
    const record = documentRecord || {};
    const activeFilters = filters || {};
    const query = normalizeText(activeFilters.query);
    const documentType = normalizeText(activeFilters.type);
    const discovery = normalizeText(activeFilters.discovery);
    const searchable = normalizeText(record.searchable);
    const recordType = normalizeText(record.type);
    const technologies = normalizeList(record.technologies);
    const topics = normalizeList(record.topics);

    if (query && !searchable.includes(query)) {
      return false;
    }

    if (documentType && documentType !== recordType) {
      return false;
    }

    if (discovery) {
      const separator = discovery.indexOf(":");
      const group = separator === -1 ? "" : discovery.slice(0, separator);
      const value = separator === -1 ? discovery : discovery.slice(separator + 1);

      if (group === "technology" && !technologies.includes(value)) {
        return false;
      }

      if (group === "topic" && !topics.includes(value)) {
        return false;
      }

      if (!group && !technologies.includes(value) && !topics.includes(value)) {
        return false;
      }
    }

    return true;
  }

  function safeStorageGet(key) {
    try {
      return root.localStorage ? root.localStorage.getItem(key) : null;
    } catch (_error) {
      return null;
    }
  }

  function safeStorageSet(key, value) {
    try {
      if (root.localStorage) {
        root.localStorage.setItem(key, value);
      }
    } catch (_error) {
      // The theme still works when storage is blocked.
    }
  }

  function applyTheme(theme) {
    const selectedTheme = THEMES.includes(theme) ? theme : "auto";
    const element = document.documentElement;

    if (selectedTheme === "auto") {
      delete element.dataset.theme;
    } else {
      element.dataset.theme = selectedTheme;
    }

    return selectedTheme;
  }

  function initializeTheme() {
    const button = document.querySelector("[data-theme-toggle]");
    const storedTheme = safeStorageGet("technical-library-theme");
    let theme = applyTheme(THEMES.includes(storedTheme) ? storedTheme : "auto");

    if (!button) {
      return;
    }

    function updateButton() {
      const label = theme === "auto" ? "System" : theme.charAt(0).toUpperCase() + theme.slice(1);
      button.textContent = `Theme: ${label}`;
      button.setAttribute("aria-label", `Color theme is ${label}. Activate to change it.`);
    }

    updateButton();
    button.addEventListener("click", function () {
      const nextIndex = (THEMES.indexOf(theme) + 1) % THEMES.length;
      theme = applyTheme(THEMES[nextIndex]);
      safeStorageSet("technical-library-theme", theme);
      updateButton();
    });
  }

  function initializeCatalog(catalog) {
    const form = catalog.querySelector("[data-library-filters]");
    const search = catalog.querySelector("[data-filter-search]");
    const type = catalog.querySelector("[data-filter-type]");
    const discovery = catalog.querySelector("[data-filter-discovery]");
    const reset = catalog.querySelector("[data-filter-reset]");
    const status = catalog.querySelector("[data-results-count]");
    const cards = Array.from(catalog.querySelectorAll("[data-library-card]"));

    if (!form || !search || !type || !discovery || !status) {
      return;
    }

    const documents = cards.map(function (card) {
      return {
        element: card,
        searchable: `${card.dataset.search || ""} ${card.textContent}`,
        type: card.dataset.type,
        technologies: card.dataset.technologies,
        topics: card.dataset.topics,
      };
    });

    function applyFilters() {
      const filters = {
        query: search.value,
        type: type.value,
        discovery: discovery.value,
      };
      let visibleCount = 0;

      documents.forEach(function (documentRecord) {
        const visible = matchesDocument(documentRecord, filters);
        documentRecord.element.hidden = !visible;
        if (visible) {
          visibleCount += 1;
        }
      });

      const noun = visibleCount === 1 ? "document" : "documents";
      status.textContent = `${visibleCount} ${noun} shown`;
      catalog.toggleAttribute("data-no-results", visibleCount === 0);
    }

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      applyFilters();
    });
    search.addEventListener("input", applyFilters);
    type.addEventListener("change", applyFilters);
    discovery.addEventListener("change", applyFilters);

    if (reset) {
      reset.addEventListener("click", function () {
        form.reset();
        applyFilters();
        search.focus();
      });
    }

    applyFilters();
  }

  async function copyText(value) {
    if (root.navigator && root.navigator.clipboard && typeof root.navigator.clipboard.writeText === "function") {
      await root.navigator.clipboard.writeText(value);
      return;
    }

    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand("copy");
    textarea.remove();
    if (!copied) {
      throw new Error("Copy command was unavailable");
    }
  }

  function initializeCodeCopy() {

    document.querySelectorAll(".tl-prose pre").forEach(function (pre) {
      if (pre.closest("[data-code-copy-ready]")) {
        return;
      }

      let container = pre.closest(".highlight");
      if (!container) {
        container = document.createElement("div");
        pre.parentNode.insertBefore(container, pre);
        container.appendChild(pre);
      }

      container.classList.add("tl-code-block");
      container.dataset.codeCopyReady = "true";

      const source = pre.closest("[data-code-language]");
      const languageName = source && source.dataset.codeLanguage ? source.dataset.codeLanguage : "";
      if (source && source.dataset.codeLanguage) {
        const language = document.createElement("span");
        language.className = "tl-code-language";
        language.textContent = languageName;
        container.insertBefore(language, container.firstChild);
      }

      const button = document.createElement("button");
      button.type = "button";
      button.className = "tl-code-copy";
      button.textContent = "Copy";
      button.setAttribute("aria-label", languageName ? `Copy ${languageName} code` : "Copy code");
      button.setAttribute("aria-live", "polite");
      container.insertBefore(button, container.firstChild);

      button.addEventListener("click", async function () {
        try {
          await copyText(pre.textContent);
          button.textContent = "Copied";
          button.setAttribute("aria-label", languageName ? `Copied ${languageName} code` : "Copied code");
          root.setTimeout(function () {
            button.textContent = "Copy";
            button.setAttribute("aria-label", languageName ? `Copy ${languageName} code` : "Copy code");
          }, 1600);
        } catch (_error) {
          button.textContent = "Copy failed";
          button.setAttribute("aria-label", languageName ? `Copy failed for ${languageName} code` : "Copy failed for code");
          root.setTimeout(function () {
            button.textContent = "Copy";
            button.setAttribute("aria-label", languageName ? `Copy ${languageName} code` : "Copy code");
          }, 2400);
        }
      });
    });
  }

  function initialize() {
    initializeTheme();
    document.querySelectorAll("[data-library-catalog]").forEach(initializeCatalog);
    initializeCodeCopy();
  }

  const api = { normalizeText, matchesDocument };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", initialize, { once: true });
    } else {
      initialize();
    }
  }
})(typeof window !== "undefined" ? window : globalThis);
