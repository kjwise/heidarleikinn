(function () {
  const script = document.currentScript;
  const assetBase = (script && script.dataset && script.dataset.assetBase) || "";
  const searchRoot = document.querySelector("[data-search-root]");
  const input = document.querySelector("[data-search-input]");
  const results = document.querySelector("[data-search-results]");

  if (!searchRoot || !input || !results) {
    return;
  }

  let searchIndex = null;
  let loadingPromise = null;

  function formatDate(value) {
    if (!value) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString("is-IS");
  }


  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  async function loadIndex() {
    if (searchIndex) return searchIndex;
    if (loadingPromise) return loadingPromise;
    loadingPromise = fetch(`${assetBase}search.json`)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Search index request failed with ${res.status}`);
        }
        return res.json();
      })
      .then((payload) => {
        searchIndex = Array.isArray(payload.articles) ? payload.articles : [];
        return searchIndex;
      })
      .catch((err) => {
        console.error(err);
        searchIndex = [];
        return searchIndex;
      });
    return loadingPromise;
  }

  function render(items) {
    if (!items.length) {
      results.innerHTML = '<p class="site-search-empty">Engar niðurstöður fundust.</p>';
      results.hidden = false;
      return;
    }

    results.innerHTML = items
      .map((item) => {
        const metaParts = [item.section || "", formatDate(item.date)].filter(Boolean);
        return [
          `<a class="site-search-result" href="${assetBase}${escapeHtml(item.url)}">`,
          `  <p class="site-search-result-title">${escapeHtml(item.title)}</p>`,
          `  <p class="site-search-result-meta">${escapeHtml(metaParts.join(" · "))}</p>`,
          "</a>",
        ].join("\n");
      })
      .join("\n");
    results.hidden = false;
  }

  function hideResults() {
    results.hidden = true;
    results.innerHTML = "";
  }

  input.addEventListener("input", async () => {
    const raw = input.value.trim().toLocaleLowerCase("is-IS");
    if (raw.length < 2) {
      hideResults();
      return;
    }

    const terms = raw.split(/\s+/).filter(Boolean);
    const items = await loadIndex();
    const matched = items
      .filter((item) => {
        const haystack = String(item.search_text || "").toLocaleLowerCase("is-IS");
        return terms.every((term) => haystack.includes(term));
      })
      .slice(0, 8);

    render(matched);
  });

  document.addEventListener("click", (event) => {
    if (!searchRoot.contains(event.target)) {
      hideResults();
    }
  });

  input.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      hideResults();
      input.blur();
    }
  });
})();
