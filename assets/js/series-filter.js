(function () {
  'use strict';

  function initSeriesFilter() {
    var browser = document.querySelector('[data-series-filter]');
    if (!browser) return;

    var buttons = Array.from(browser.querySelectorAll('[data-series-filter-button]'));
    var cards = Array.from(browser.querySelectorAll('[data-series-card]'));
    var sections = Array.from(browser.querySelectorAll('[data-series-section]'));
    var status = browser.querySelector('#pa-series-filter-status');

    if (!buttons.length || !cards.length) return;

    function pluralize(count, singular, plural) {
      return count === 1 ? singular : plural;
    }

    function applyFilter(button) {
      var tag = button.dataset.tag || '';
      var label = button.dataset.tagLabel || button.textContent.trim();
      var visibleCount = 0;

      buttons.forEach(function (candidate) {
        candidate.setAttribute('aria-pressed', String(candidate === button));
      });

      cards.forEach(function (card) {
        var tags = (card.dataset.tags || '').split(/\s+/).filter(Boolean);
        var matches = !tag || tags.includes(tag);
        card.hidden = !matches;
        if (matches) visibleCount += 1;
      });

      var visibleSectionCount = 0;
      sections.forEach(function (section) {
        var hasVisibleCards = Array.from(section.querySelectorAll('[data-series-card]'))
          .some(function (card) { return !card.hidden; });
        section.hidden = !hasVisibleCards;
        if (hasVisibleCards) visibleSectionCount += 1;
      });

      if (!status) return;

      if (!visibleCount) {
        status.textContent = 'No articles match “' + label + '”.';
      } else if (tag) {
        status.textContent = visibleCount + ' ' +
          pluralize(visibleCount, 'article', 'articles') +
          ' tagged “' + label + '”.';
      } else {
        status.textContent = visibleCount + ' ' +
          pluralize(visibleCount, 'article', 'articles') +
          ' across ' + visibleSectionCount + ' ' +
          pluralize(visibleSectionCount, 'series', 'series') + '.';
      }
    }

    buttons.forEach(function (button) {
      button.addEventListener('click', function () {
        applyFilter(button);
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSeriesFilter);
  } else {
    initSeriesFilter();
  }
}());
