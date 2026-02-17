(() => {
  function initDeck(deck) {
    const slides = Array.from(deck.querySelectorAll('.infographic-deck-slide'));
    if (!slides.length) return;

    let active = 0;
    const counter = deck.querySelector('[data-infographic-deck-counter]');
    const prevBtn = deck.querySelector('[data-infographic-deck-prev]');
    const nextBtn = deck.querySelector('[data-infographic-deck-next]');

    function render() {
      slides.forEach((slide, idx) => {
        slide.classList.toggle('is-active', idx === active);
      });
      if (counter) counter.textContent = `${active + 1} / ${slides.length}`;
    }

    prevBtn?.addEventListener('click', () => {
      active = (active - 1 + slides.length) % slides.length;
      render();
    });

    nextBtn?.addEventListener('click', () => {
      active = (active + 1) % slides.length;
      render();
    });

    deck.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowLeft' || event.key === 'PageUp') {
        event.preventDefault();
        active = (active - 1 + slides.length) % slides.length;
        render();
      }
      if (event.key === 'ArrowRight' || event.key === 'PageDown' || event.key === ' ') {
        event.preventDefault();
        active = (active + 1) % slides.length;
        render();
      }
    });

    render();
  }

  document.querySelectorAll('[data-infographic-deck]').forEach(initDeck);
})();
