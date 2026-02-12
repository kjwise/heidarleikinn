async function mountCalcdowns() {
  const containers = Array.from(document.querySelectorAll("[data-calcdown]"));
  if (containers.length === 0) return;

  let mountCalcdownDocument;
  try {
    ({ mountCalcdownDocument } = await import("./vendor/calcdown/web/index.js"));
  } catch (err) {
    // If CalcDown fails to load, leave the fallback in place.
    console.error("CalcDown: failed to load", err);
    return;
  }

  for (const container of containers) {
    const sourceEl = container.querySelector("script.calcdown-source");
    const markdown = (sourceEl?.textContent ?? "").trim();
    if (!markdown) continue;

    container.innerHTML = "";
    try {
      mountCalcdownDocument(container, markdown, { showMessages: false });
    } catch (err) {
      console.error("CalcDown: failed to mount", err);
      const msg = document.createElement("div");
      msg.className = "calcdown-error";
      msg.textContent = "Mistókst að birta gagnvirka reiknivél.";
      container.appendChild(msg);
    }
  }
}

mountCalcdowns();

