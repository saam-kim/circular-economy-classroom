(function (global) {
  "use strict";

  class ControlPanel {
    constructor(containerEl, data, callbacks) {
      this.container = containerEl;
      this.data = data;
      this.callbacks = callbacks || {};
      this.cardElements = new Map();

      this.render();
    }

    render() {
      const productScenarios = this.data.SCENARIOS.filter((s) => s.market === "product");
      const factorScenarios = this.data.SCENARIOS.filter((s) => s.market === "factor");

      this.container.innerHTML = `
        <div class="control-top">
          <h2 class="control-heading">상황 선택</h2>

          <section class="market-group" aria-labelledby="group-product-title">
            <h3 id="group-product-title" class="market-group-title">생산물 시장</h3>
            <div class="cards-grid-2" id="grid-product-cards"></div>
          </section>

          <div class="group-divider" role="separator"></div>

          <section class="market-group" aria-labelledby="group-factor-title">
            <h3 id="group-factor-title" class="market-group-title">생산 요소 시장</h3>
            <div class="cards-grid-3" id="grid-factor-cards"></div>
          </section>
        </div>

        <div class="control-actions">
          <button type="button" id="btn-execute" class="btn btn-primary">
            <svg class="btn-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M7.5 5.65c0-1.12 1.22-1.81 2.18-1.23l10.05 6.08c.92.56.92 1.9 0 2.46L9.68 19.04c-.96.58-2.18-.11-2.18-1.23V5.65z"/>
            </svg>
            <span>거래 실행</span>
          </button>

          <div class="secondary-actions-row">
            <button type="button" id="btn-replay" class="btn btn-secondary">
              <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M21 12a9 9 0 1 1-2.64-6.36"/>
                <polyline points="21 3 21 9 15 9"/>
              </svg>
              <span>다시 보기</span>
            </button>

            <button type="button" id="btn-reset" class="btn btn-secondary">
              <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M3 12a9 9 0 0 1 15-6.7L21 8"/>
                <polyline points="21 3 21 8 16 8"/>
                <path d="M21 12a9 9 0 0 1-15 6.7L3 16"/>
                <polyline points="3 21 3 16 8 16"/>
              </svg>
              <span>초기화</span>
            </button>
          </div>
        </div>
      `;

      const productGrid = this.container.querySelector("#grid-product-cards");
      const factorGrid = this.container.querySelector("#grid-factor-cards");

      productScenarios.forEach((sc) => {
        const cardBtn = this.createCardElement(sc);
        productGrid.appendChild(cardBtn);
        this.cardElements.set(sc.id, cardBtn);
      });

      factorScenarios.forEach((sc) => {
        const cardBtn = this.createCardElement(sc);
        factorGrid.appendChild(cardBtn);
        this.cardElements.set(sc.id, cardBtn);
      });

      this.btnExecute = this.container.querySelector("#btn-execute");
      this.btnReplay = this.container.querySelector("#btn-replay");
      this.btnReset = this.container.querySelector("#btn-reset");
      this.groupProductTitle = this.container.querySelector("#group-product-title");
      this.groupFactorTitle = this.container.querySelector("#group-factor-title");

      // Initially hide market group titles until Step 1 answer is selected
      this.setMarketTitlesRevealed(null);

      this.btnExecute.addEventListener("click", () => {
        if (typeof this.callbacks.onExecute === "function") {
          this.callbacks.onExecute();
        }
      });

      this.btnReplay.addEventListener("click", () => {
        if (typeof this.callbacks.onReplay === "function") {
          this.callbacks.onReplay();
        }
      });

      this.btnReset.addEventListener("click", () => {
        if (typeof this.callbacks.onReset === "function") {
          this.callbacks.onReset();
        }
      });
    }

    createCardElement(scenario) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.id = `card-${scenario.id}`;
      btn.className = "scenario-card";
      btn.setAttribute("data-scenario-id", scenario.id);
      btn.setAttribute("data-market", scenario.market);
      btn.setAttribute("aria-pressed", "false");

      const illustrationMarkup = global.CircularEconomyCardIllustrations
        ? global.CircularEconomyCardIllustrations.getCardIllustrationMarkup(scenario.id, scenario.cardAlt)
        : "";

      btn.innerHTML = `
        <div class="card-illustration-wrap">
          ${illustrationMarkup}
        </div>
        <span class="card-title">${scenario.title}</span>
      `;

      btn.addEventListener("click", () => {
        if (typeof this.callbacks.onSelectScenario === "function") {
          this.callbacks.onSelectScenario(scenario.id);
        }
      });

      return btn;
    }

    updateSelection(selectedScenarioId) {
      this.cardElements.forEach((cardEl, id) => {
        const isSelected = id === selectedScenarioId;
        cardEl.classList.toggle("is-selected", isSelected);
        cardEl.setAttribute("aria-pressed", isSelected ? "true" : "false");
      });

      const hasSelection = Boolean(selectedScenarioId);
      this.btnExecute.disabled = !hasSelection;
      this.btnReplay.disabled = !hasSelection;
    }

    /**
     * Controls visibility of "생산물 시장" / "생산 요소 시장" group headings in the right panel
     * so they do not spoil Step 1 (Market Selection) before the teacher/students choose the market.
     * @param {'product'|'factor'|'both'|null} revealedMarket
     */
    setMarketTitlesRevealed(revealedMarket) {
      const showProduct = revealedMarket === "product" || revealedMarket === "both";
      const showFactor = revealedMarket === "factor" || revealedMarket === "both";

      if (this.groupProductTitle) {
        this.groupProductTitle.classList.toggle("is-revealed", showProduct);
        this.groupProductTitle.setAttribute("data-revealed", showProduct ? "true" : "false");
      }
      if (this.groupFactorTitle) {
        this.groupFactorTitle.classList.toggle("is-revealed", showFactor);
        this.groupFactorTitle.setAttribute("data-revealed", showFactor ? "true" : "false");
      }
    }
  }

  global.ControlPanel = ControlPanel;
})(window);
