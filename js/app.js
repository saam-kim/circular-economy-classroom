(function (global) {
  "use strict";

  class CircularEconomySimulator {
    constructor() {
      this.data = global.CircularEconomyData;
      this.icons = global.CircularEconomyIcons;

      this.stageEl = document.getElementById("simulator-stage");
      this.storyPane = document.getElementById("story-stage-pane");
      this.diagramContainer =
        document.getElementById("diagram-canvas-pane") ||
        document.getElementById("diagram-panel");
      this.controlContainer = document.getElementById("control-panel");

      this.currentPage = 1;
      this.selectedScenarioId = null;
      this.executionCount = 0;

      this.diagram = new global.CircularDiagram(
        this.diagramContainer,
        this.data,
        this.icons
      );

      if (global.StoryAnimator && this.storyPane) {
        this.storyAnimator = new global.StoryAnimator(
          this.storyPane,
          this.diagram,
          {
            onRequestSelectBread: () => this.selectScenario("bread")
          }
        );
      }

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

      // Initialize Courseware Page Switcher (1P: 모형만 보기 / 2P: 스토리 애니메이션과 함께 보기)
      this.initPageSwitcher();

      // Initialize first screen with default scenario ("빵 구매" card selected, diagram ready for "거래 실행")
      this.selectScenario(this.data.DEFAULT_SCENARIO_ID);

      // Initialize Activity Guide modal interactions
      this.initGuideModal();

      // Handle visibility change cleanly so tab switching never leaves stale animation state
      document.addEventListener("visibilitychange", () => {
        if (document.hidden) {
          if (this.diagram.isAnimating) this.diagram.stopAnimation();
          if (this.storyAnimator && this.storyAnimator.isPlaying) {
            this.storyAnimator.stop();
          }
        }
      });
    }

    initPageSwitcher() {
      this.btnPage1 = document.getElementById("btn-page-1");
      this.btnPage2 = document.getElementById("btn-page-2");

      if (this.btnPage1) {
        this.btnPage1.addEventListener("click", () => this.setPage(1));
      }
      if (this.btnPage2) {
        this.btnPage2.addEventListener("click", () => this.setPage(2));
      }
    }

    setPage(pageNum) {
      this.currentPage = pageNum === 2 ? 2 : 1;

      if (this.stageEl) {
        this.stageEl.setAttribute("data-page", String(this.currentPage));
      }
      if (this.btnPage1) {
        const isP1 = this.currentPage === 1;
        this.btnPage1.classList.toggle("is-active", isP1);
        if (isP1) this.btnPage1.setAttribute("aria-current", "page");
        else this.btnPage1.removeAttribute("aria-current");
      }
      if (this.btnPage2) {
        const isP2 = this.currentPage === 2;
        this.btnPage2.classList.toggle("is-active", isP2);
        if (isP2) this.btnPage2.setAttribute("aria-current", "page");
        else this.btnPage2.removeAttribute("aria-current");
      }

      this.diagram.stopAnimation();
      if (this.storyAnimator) {
        this.storyAnimator.stop();
      }

      if (this.currentPage === 2) {
        if (this.storyPane) this.storyPane.removeAttribute("hidden");
        if (!this.selectedScenarioId) {
          this.selectedScenarioId = this.data.DEFAULT_SCENARIO_ID;
          this.controls.updateSelection(this.selectedScenarioId);
        }
        const scenario = this.data.getScenarioById(this.selectedScenarioId);
        this.diagram.applyScenario(scenario);
        this.controls.setMarketTitlesRevealed("both");
        if (this.storyAnimator) {
          this.storyAnimator.setScenario(scenario);
        }
      } else {
        if (this.storyPane) this.storyPane.setAttribute("hidden", "");
        const scenario = this.selectedScenarioId
          ? this.data.getScenarioById(this.selectedScenarioId)
          : null;
        this.diagram.applyScenario(scenario);
        this.controls.setMarketTitlesRevealed(null);
      }
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

      if (this.currentPage === 2) {
        this.controls.setMarketTitlesRevealed("both");
        this.diagram.applyScenario(scenario);
        if (this.storyAnimator) {
          this.storyAnimator.setScenario(scenario);
        }
      } else {
        this.controls.setMarketTitlesRevealed(null);
        this.diagram.applyScenario(scenario);
      }
    }

    syncMarketTitleReveal() {
      if (!this.controls) return;
      if (this.currentPage === 2) {
        this.controls.setMarketTitlesRevealed("both");
        return;
      }

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
     * "거래 실행":
     * - On 1P: Starts the teacher-led interactive step-by-step quiz mode.
     * - On 2P: Plays the synchronized 2D Story Animation + Circular Flow Diagram.
     */
    executeTransaction() {
      if (!this.selectedScenarioId) return;
      this.executionCount += 1;

      if (this.currentPage === 2 && this.storyAnimator) {
        if (this.selectedScenarioId === "bread") {
          this.storyAnimator.playFullStory();
        } else {
          this.diagram.playAnimation();
        }
        return;
      }

      this.diagram.startInteractiveSession();
    }

    /**
     * "다시 보기": Replays the full sequential animation continuously.
     */
    replayTransaction() {
      if (!this.selectedScenarioId) return;
      this.executionCount += 1;

      if (this.currentPage === 2 && this.storyAnimator && this.selectedScenarioId === "bread") {
        this.storyAnimator.playFullStory();
        return;
      }

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
      if (this.storyAnimator) {
        this.storyAnimator.stop();
        this.storyAnimator.renderIdleScene();
      }
      this.controls.updateSelection(null);
      this.controls.setMarketTitlesRevealed(this.currentPage === 2 ? "both" : null);
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
