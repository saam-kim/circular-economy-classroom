(function (global) {
  "use strict";

  class CircularEconomySimulator {
    constructor() {
      this.data = global.CircularEconomyData;
      this.icons = global.CircularEconomyIcons;

      this.diagramContainer = document.getElementById("diagram-panel");
      this.controlContainer = document.getElementById("control-panel");

      this.selectedScenarioId = null;
      this.executionCount = 0;

      this.diagram = new global.CircularDiagram(
        this.diagramContainer,
        this.data,
        this.icons
      );

      this.controls = new global.ControlPanel(
        this.controlContainer,
        this.data,
        {
          onSelectScenario: (id) => this.selectScenario(id),
          onExecute: () => this.executeTransaction(),
          onReplay: () => this.replayTransaction(),
          onReset: () => this.resetSimulator()
        }
      );

      // Sync right-panel market heading reveal with diagram interactive state
      this.diagram.onStateChange = () => {
        this.syncMarketTitleReveal();
      };

      // Initialize first screen with default scenario ("빵 구매" card selected, diagram ready for "거래 실행")
      this.selectScenario(this.data.DEFAULT_SCENARIO_ID);

      // Initialize Activity Guide modal interactions
      this.initGuideModal();

      // Handle visibility change cleanly so tab switching never leaves stale animation state
      document.addEventListener("visibilitychange", () => {
        if (document.hidden && this.diagram.isAnimating) {
          this.diagram.stopAnimation();
        }
      });
    }

    initGuideModal() {
      const btnGuide = document.getElementById("btn-guide");
      const modal = document.getElementById("guide-modal");
      const btnClose = document.getElementById("btn-guide-close");
      const btnConfirm = document.getElementById("btn-guide-confirm");

      if (!btnGuide || !modal) return;

      const openModal = () => {
        modal.removeAttribute("hidden");
      };

      const closeModal = () => {
        modal.setAttribute("hidden", "");
      };

      btnGuide.addEventListener("click", openModal);
      if (btnClose) btnClose.addEventListener("click", closeModal);
      if (btnConfirm) btnConfirm.addEventListener("click", closeModal);

      modal.addEventListener("click", (e) => {
        if (e.target === modal) {
          closeModal();
        }
      });

      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && !modal.hasAttribute("hidden")) {
          closeModal();
        }
      });
    }

    selectScenario(scenarioId) {
      const scenario = this.data.getScenarioById(scenarioId);
      if (!scenario) return;

      this.selectedScenarioId = scenario.id;
      this.controls.updateSelection(this.selectedScenarioId);
      this.controls.setMarketTitlesRevealed(null);
      this.diagram.applyScenario(scenario);
    }

    syncMarketTitleReveal() {
      if (!this.controls) return;
      const step = this.diagram.interactiveStep;
      const sc = this.diagram.currentScenario;

      // Hide market titles before/during Step 1 (select_market); reveal once correct market is chosen
      if (!sc || step === "idle" || step === "select_market") {
        this.controls.setMarketTitlesRevealed(null);
      } else {
        this.controls.setMarketTitlesRevealed(sc.market);
      }
    }

    /**
     * "거래 실행": Starts the teacher-led interactive step-by-step mode:
     * 1. Select Market (생산물 시장 vs 생산 요소 시장)
     * 2. Select Real Flow Order (출발 주체 -> 도착 주체) & animate Real Flow
     * 3. Select Money Flow Order (출발 주체 -> 도착 주체) & animate Money Flow
     */
    executeTransaction() {
      if (!this.selectedScenarioId) return;
      this.executionCount += 1;
      this.diagram.startInteractiveSession();
    }

    /**
     * "다시 보기": Replays the full sequential animation (Real Flow -> Money Flow) continuously.
     */
    replayTransaction() {
      if (!this.selectedScenarioId) return;
      this.executionCount += 1;
      this.diagram.playAnimation();
    }

    /**
     * "초기화": Resets to unselected all-grey state:
     * no card selected, all paths and labels grey, moving tokens hidden.
     */
    resetSimulator() {
      this.executionCount = 0;
      this.selectedScenarioId = null;
      this.diagram.stopAnimation();
      this.controls.updateSelection(null);
      this.controls.setMarketTitlesRevealed(null);
      this.diagram.applyScenario(null);
    }

    /**
     * Diagnostic snapshot used for automated testing and verification
     */
    getInspectionSnapshot() {
      const activeLabels = [];
      const inactiveLabels = [];

      this.diagram.labelElements.forEach((el) => {
        const text = el.getAttribute("data-label-text");
        const isActive = el.getAttribute("data-active") === "true";
        if (isActive) {
          activeLabels.push(text);
        } else {
          inactiveLabels.push(text);
        }
      });

      const activeSegments = [];
      this.diagram.pathElements.forEach((el, segId) => {
        if (el.getAttribute("data-active") === "true") {
          activeSegments.push({
            id: segId,
            flowType: el.getAttribute("data-flow-type"),
            fromNode: el.getAttribute("data-from-node"),
            toNode: el.getAttribute("data-to-node")
          });
        }
      });

      return {
        selectedScenarioId: this.selectedScenarioId,
        interactiveStep: this.diagram.interactiveStep,
        isAnimating: this.diagram.isAnimating,
        animationState: this.diagram.animationState,
        executionCount: this.executionCount,
        activeLabelCount: activeLabels.length,
        activeLabels,
        inactiveLabelCount: inactiveLabels.length,
        inactiveLabels,
        activeSegments
      };
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    global.__SIMULATOR__ = new CircularEconomySimulator();
  });
})(window);
