(function () {
  "use strict";

  function ready(callback) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", callback, { once: true });
      return;
    }
    callback();
  }

  ready(function () {
    var modal = document.getElementById("search-modal");
    var input = document.getElementById("search-query");
    var output = document.getElementById("search-results");
    var status = document.getElementById("search-status");
    var triggers = [
      document.getElementById("search-button"),
      document.getElementById("search-button-mobile"),
    ].filter(Boolean);
    var indexPromise;
    var searchIndex;
    var queryVersion = 0;

    if (!modal || !input || !output || !status) {
      return;
    }

    customElements.whenDefined("cds-modal").then(function () {
      modal.open = false;
    });

    function setStatus(message) {
      status.textContent = message;
    }

    function getIndex() {
      if (searchIndex) {
        return Promise.resolve(searchIndex);
      }
      if (indexPromise) {
        return indexPromise;
      }

      setStatus("Loading the search index…");
      indexPromise = fetch(modal.dataset.searchIndex, {
        headers: { Accept: "application/json" },
      })
        .then(function (response) {
          if (!response.ok) {
            throw new Error("Search index request failed.");
          }
          return response.json();
        })
        .then(function (pages) {
          if (!window.Fuse) {
            throw new Error("Search library is unavailable.");
          }
          searchIndex = new window.Fuse(pages, {
            shouldSort: true,
            ignoreLocation: true,
            threshold: 0.36,
            keys: [
              { name: "title", weight: 0.8 },
              { name: "summary", weight: 0.6 },
              { name: "content", weight: 0.35 },
              { name: "section", weight: 0.2 },
            ],
          });
          setStatus("Search is ready. Start typing to find an article.");
          return searchIndex;
        })
        .catch(function () {
          indexPromise = null;
          setStatus("Search is temporarily unavailable. Please try again.");
          return null;
        });

      return indexPromise;
    }

    function appendMetadata(container, item) {
      var metadata = [item.section, item.date].filter(Boolean);
      if (!metadata.length) {
        return;
      }
      var line = document.createElement("p");
      line.className = "pa-search-result-meta";
      line.textContent = metadata.join(" · ");
      container.appendChild(line);
    }

    function renderResults(results, term) {
      output.replaceChildren();

      if (!term) {
        setStatus("Start typing to search all articles.");
        return;
      }

      if (!results.length) {
        setStatus('No results found for “' + term + '”.');
        return;
      }

      var displayedResults = results.slice(0, 12);
      displayedResults.forEach(function (result) {
        var item = result.item;
        var listItem = document.createElement("li");
        var link = document.createElement("a");
        var title = document.createElement("h3");
        var summary = document.createElement("p");

        link.className = "pa-search-result";
        link.href = item.externalUrl || item.permalink;
        if (item.externalUrl) {
          link.target = "_blank";
          link.rel = "noopener noreferrer";
        }

        title.textContent = item.title;
        link.appendChild(title);
        appendMetadata(link, item);
        if (item.summary) {
          summary.textContent = String(item.summary).trim();
          link.appendChild(summary);
        }
        if (item.externalUrl) {
          var newTabNote = document.createElement("span");
          newTabNote.className = "pa-visually-hidden";
          newTabNote.textContent = " (opens in a new tab)";
          link.appendChild(newTabNote);
        }
        listItem.appendChild(link);
        output.appendChild(listItem);
      });

      if (displayedResults.length < results.length) {
        setStatus(
          "Showing " + displayedResults.length + " of " + results.length +
            ' results for “' + term + '”.'
        );
      } else {
        setStatus(
          results.length + (results.length === 1 ? " result" : " results") +
            ' found for “' + term + '”.'
        );
      }
    }

    function runSearch() {
      var term = String(input.value || "").trim();
      var requestVersion = ++queryVersion;
      if (!term) {
        renderResults([], "");
        return;
      }

      getIndex().then(function (index) {
        var currentTerm = String(input.value || "").trim();
        if (index && requestVersion === queryVersion && term === currentTerm) {
          renderResults(index.search(term), term);
        }
      });
    }

    function openSearch(event) {
      if (event) {
        event.preventDefault();
      }
      getIndex();
      customElements.whenDefined("cds-modal").then(function () {
        modal.hidden = false;
        modal.open = true;
      });
    }

    triggers.forEach(function (trigger) {
      trigger.addEventListener("click", openSearch);
    });
    input.addEventListener("cds-search-input", runSearch);

    document.addEventListener("keydown", function (event) {
      var active = document.activeElement;
      var isField =
        active &&
        (active.tagName === "INPUT" ||
          active.tagName === "TEXTAREA" ||
          active.isContentEditable);
      if (event.key === "/" && !isField && !modal.open) {
        openSearch(event);
      }
    });
  });
})();
