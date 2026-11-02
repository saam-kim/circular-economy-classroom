(function (global) {
  "use strict";

  const SVG_NS = "http://www.w3.org/2000/svg";
  const SINGLE_PHASE_DURATION_MS = 2800; // 2.8s for Real Flow, 2.8s for Money Flow (5.6s total)
  const INTER_PHASE_PAUSE_MS = 450; // 0.45s classroom breathing pause between Real and Money flows

  class CircularDiagram {
    constructor(containerEl, data, icons) {
      this.container = containerEl;
      this.data = data;
      this.icons = icons;

      this.pathElements = new Map();
      this.labelElements = new Map();
      this.nodeElements = new Map();
      this.nodeActionTags = new Map();
      this.wrongTimerIds = new Map();

      this.currentScenario = null;
      this.rafId = null;
      this.cleanupTimeoutId = null;
      this.pauseTimeoutId = null;
      this.isAnimating = false;

      /**
       * Interactive classroom step state:
       * 'idle' | 'select_market' | 'select_real_from' | 'select_real_to' |
       * 'animating_real' | 'select_money_from' | 'select_money_to' |
       * 'animating_money' | 'completed'
       */
      this.interactiveStep = "idle";

      this.animationState = {
        phase: "idle",
        activeFlow: null,
        progress: 0,
        realTokenPos: null,
        moneyTokenPos: null
      };

      this.onStateChange = null;
      this.renderStaticStructure();
    }

    renderStaticStructure() {
      const { NODES, FLOW_SEGMENTS, CONCEPT_LABELS, FACTOR_STACK_BACKDROPS } = this.data;

      const svg = document.createElementNS(SVG_NS, "svg");
      svg.setAttribute("viewBox", "0 0 1080 810");
      svg.setAttribute("class", "diagram-svg");
      svg.setAttribute("aria-label", "경제 활동의 순환 모형 도식");

      // Defs: Gradients, Shadows, Arrowhead markers & token white halo filter
      const defs = document.createElementNS(SVG_NS, "defs");
      defs.innerHTML = `
        <linearGradient id="node-surface-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#F8FAFC"/>
          <stop offset="100%" stop-color="#EEF2F6"/>
        </linearGradient>
        <filter id="node-soft-shadow" x="-15%" y="-15%" width="130%" height="135%">
          <feDropShadow dx="0" dy="3" stdDeviation="4" flood-color="#0F172A" flood-opacity="0.06"/>
        </filter>
        <filter id="guide-card-shadow" x="-20%" y="-20%" width="140%" height="150%">
          <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#0F172A" flood-opacity="0.10"/>
        </filter>
        <marker id="arrow-inactive" markerUnits="userSpaceOnUse" markerWidth="22" markerHeight="22" refX="14" refY="11" orient="auto">
          <path d="M 2 3 L 18 11 L 2 19 z" fill="#CBD3DE" />
        </marker>
        <marker id="arrow-real" markerUnits="userSpaceOnUse" markerWidth="24" markerHeight="24" refX="15" refY="12" orient="auto">
          <path d="M 2 3 L 19 12 L 2 21 z" fill="#1D82F5" />
        </marker>
        <marker id="arrow-money" markerUnits="userSpaceOnUse" markerWidth="24" markerHeight="24" refX="15" refY="12" orient="auto">
          <path d="M 2 3 L 19 12 L 2 21 z" fill="#F54380" />
        </marker>
        <filter id="token-halo" x="-35%" y="-35%" width="170%" height="170%">
          <feDropShadow dx="0" dy="2" stdDeviation="2.5" flood-color="#0F172A" flood-opacity="0.18"/>
        </filter>
      `;
      svg.appendChild(defs);

      // Layer 1A: Inactive Base Flow Paths (always visible underneath progressive drawing paths)
      const basePathsLayer = document.createElementNS(SVG_NS, "g");
      basePathsLayer.setAttribute("id", "layer-flow-paths-base");

      // Layer 1B: Active / Animated Flow Paths (8 directed segments)
      const pathsLayer = document.createElementNS(SVG_NS, "g");
      pathsLayer.setAttribute("id", "layer-flow-paths");

      Object.values(FLOW_SEGMENTS).forEach((seg) => {
        const basePath = document.createElementNS(SVG_NS, "path");
        basePath.setAttribute("class", "flow-path-base");
        basePath.setAttribute("d", seg.d);
        basePath.setAttribute("marker-end", "url(#arrow-inactive)");
        basePathsLayer.appendChild(basePath);

        const path = document.createElementNS(SVG_NS, "path");
        path.setAttribute("id", `path-${seg.id}`);
        path.setAttribute("class", "flow-path");
        path.setAttribute("d", seg.d);
        path.setAttribute("data-segment-id", seg.id);
        path.setAttribute("data-market", seg.market);
        path.setAttribute("data-flow-type", seg.flowType);
        path.setAttribute("data-from-node", seg.fromNode);
        path.setAttribute("data-to-node", seg.toNode);
        path.setAttribute("data-active", "false");
        path.setAttribute("marker-end", "url(#arrow-inactive)");
        pathsLayer.appendChild(path);
        this.pathElements.set(seg.id, path);
      });
      svg.appendChild(basePathsLayer);
      svg.appendChild(pathsLayer);

      // Layer 2: Structural Nodes (기업, 가계, 생산물 시장, 생산 요소 시장)
      const nodesLayer = document.createElementNS(SVG_NS, "g");
      nodesLayer.setAttribute("id", "layer-nodes");

      Object.values(NODES).forEach((node) => {
        const g = document.createElementNS(SVG_NS, "g");
        g.setAttribute("id", `node-${node.id}`);
        g.setAttribute("class", "node-group");
        g.setAttribute("data-node-id", node.id);

        const rect = document.createElementNS(SVG_NS, "rect");
        rect.setAttribute("class", "node-rect");
        rect.setAttribute("x", String(node.x));
        rect.setAttribute("y", String(node.y));
        rect.setAttribute("width", String(node.width));
        rect.setAttribute("height", String(node.height));
        rect.setAttribute("rx", String(node.rx));
        rect.setAttribute("ry", String(node.rx));

        // Subtle inner highlight border for refined depth
        const innerRect = document.createElementNS(SVG_NS, "rect");
        innerRect.setAttribute("class", "node-inner-highlight");
        innerRect.setAttribute("x", String(node.x + 2));
        innerRect.setAttribute("y", String(node.y + 2));
        innerRect.setAttribute("width", String(node.width - 4));
        innerRect.setAttribute("height", String(node.height - 4));
        innerRect.setAttribute("rx", String(Math.max(2, node.rx - 2)));
        innerRect.setAttribute("ry", String(Math.max(2, node.rx - 2)));

        const text = document.createElementNS(SVG_NS, "text");
        text.setAttribute(
          "class",
          `node-text ${node.role === "market" ? "node-text-market" : "node-text-agent"}`
        );
        text.setAttribute("x", String(node.x + node.width / 2));
        text.setAttribute("y", String(node.y + node.height / 2));
        text.textContent = node.label;

        g.appendChild(rect);
        g.appendChild(innerRect);
        g.appendChild(text);

        g.addEventListener("click", () => this.handleNodeClick(node.id));

        nodesLayer.appendChild(g);
        this.nodeElements.set(node.id, g);
      });
      svg.appendChild(nodesLayer);

      // Layer 3: Concept Labels (Backdrops for 3-item factor stacks + 14 individual concept pills)
      const labelsLayer = document.createElementNS(SVG_NS, "g");
      labelsLayer.setAttribute("id", "layer-concept-labels");

      FACTOR_STACK_BACKDROPS.forEach((backdrop) => {
        const bg = document.createElementNS(SVG_NS, "rect");
        bg.setAttribute("class", "factor-stack-backdrop");
        bg.setAttribute("x", String(backdrop.x));
        bg.setAttribute("y", String(backdrop.y));
        bg.setAttribute("width", String(backdrop.width));
        bg.setAttribute("height", String(backdrop.height));
        labelsLayer.appendChild(bg);
      });

      CONCEPT_LABELS.forEach((lbl) => {
        const g = document.createElementNS(SVG_NS, "g");
        g.setAttribute("id", `label-${lbl.id}`);
        g.setAttribute("class", "concept-label-group");
        g.setAttribute("data-label-id", lbl.id);
        g.setAttribute("data-label-text", lbl.text);
        g.setAttribute("data-flow-type", lbl.flowType);
        g.setAttribute("data-market", lbl.market);
        g.setAttribute("data-segment-id", lbl.segmentId);
        g.setAttribute("data-active", "false");

        const rect = document.createElementNS(SVG_NS, "rect");
        rect.setAttribute("class", "concept-label-bg");
        rect.setAttribute("x", String(lbl.cx - lbl.width / 2));
        rect.setAttribute("y", String(lbl.cy - lbl.height / 2));
        rect.setAttribute("width", String(lbl.width));
        rect.setAttribute("height", String(lbl.height));

        const text = document.createElementNS(SVG_NS, "text");
        text.setAttribute("class", "concept-label-text");
        text.setAttribute("x", String(lbl.cx));

        if (lbl.lines && lbl.lines.length > 1) {
          const lineSpacing = 24;
          const startY = lbl.cy - ((lbl.lines.length - 1) * lineSpacing) / 2;
          lbl.lines.forEach((lineStr, idx) => {
            const tspan = document.createElementNS(SVG_NS, "tspan");
            tspan.setAttribute("x", String(lbl.cx));
            tspan.setAttribute("y", String(startY + idx * lineSpacing));
            tspan.textContent = lineStr;
            text.appendChild(tspan);
          });
        } else {
          text.setAttribute("y", String(lbl.cy));
          text.textContent = lbl.text;
        }

        g.appendChild(rect);
        g.appendChild(text);
        labelsLayer.appendChild(g);
        this.labelElements.set(lbl.id, g);
      });
      svg.appendChild(labelsLayer);

      // Layer 4: Center Interactive Step Guide Card (placed in open center of circular loop)
      this.centerGuideEl = this.createCenterStepGuide();
      svg.appendChild(this.centerGuideEl);

      // Layer 5: Legend at Bottom-Left (실물의 흐름 / 화폐의 흐름)
      const legendLayer = this.createLegendLayer();
      svg.appendChild(legendLayer);

      // Layer 6: Moving Tokens Layer (Real Token & Money Token)
      const tokensLayer = document.createElementNS(SVG_NS, "g");
      tokensLayer.setAttribute("id", "layer-moving-tokens");

      this.realTokenEl = document.createElementNS(SVG_NS, "g");
      this.realTokenEl.setAttribute("id", "token-real");
      this.realTokenEl.setAttribute("class", "moving-token");
      this.realTokenEl.setAttribute("data-visible", "false");
      this.realTokenEl.style.opacity = "0";
      this.realTokenEl.style.display = "none";

      this.moneyTokenEl = document.createElementNS(SVG_NS, "g");
      this.moneyTokenEl.setAttribute("id", "token-money");
      this.moneyTokenEl.setAttribute("class", "moving-token");
      this.moneyTokenEl.setAttribute("data-visible", "false");
      this.moneyTokenEl.style.opacity = "0";
      this.moneyTokenEl.style.display = "none";

      tokensLayer.appendChild(this.realTokenEl);
      tokensLayer.appendChild(this.moneyTokenEl);
      svg.appendChild(tokensLayer);

      this.svg = svg;
      this.container.innerHTML = "";
      this.container.appendChild(svg);
    }

    createCenterStepGuide() {
      const g = document.createElementNS(SVG_NS, "g");
      g.setAttribute("id", "center-step-guide");
      g.setAttribute("class", "center-step-guide");
      g.setAttribute("data-visible", "false");
      g.setAttribute("transform", "translate(540, 368)");

      g.innerHTML = `
        <g id="guide-spotlight-wrap" transform="translate(0, -18)"></g>
        <rect id="guide-pill-bg" x="-124" y="26" width="248" height="46" rx="15" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="2.2" filter="url(#guide-card-shadow)"/>
        <text id="guide-main-text" x="0" y="49" font-family="var(--font-sans)" font-size="18.5" font-weight="800" fill="#0F172A" text-anchor="middle" dominant-baseline="central"></text>
      `;
      return g;
    }

    updateCenterGuide(config) {
      if (!config || !config.visible) {
        this.centerGuideEl.setAttribute("data-visible", "false");
        return;
      }

      this.centerGuideEl.setAttribute("data-visible", "true");
      const spotlightWrap = this.centerGuideEl.querySelector("#guide-spotlight-wrap");
      const pillBg = this.centerGuideEl.querySelector("#guide-pill-bg");
      const mainText = this.centerGuideEl.querySelector("#guide-main-text");

      const accentColor = config.accentColor || "#2563EB";
      pillBg.setAttribute("stroke", accentColor);
      this.lastGuideTitle = config.title || "";

      const textLen = (config.title || "").length;
      const pillWidth = Math.max(248, Math.min(330, Math.round(textLen * 19 + 46)));
      pillBg.setAttribute("width", String(pillWidth));
      pillBg.setAttribute("x", String(-pillWidth / 2));

      if (config.iconType) {
        const ringBg = config.flowType === "money" ? "#FFF1F5" : "#EFF6FF";
        const glowColor = config.flowType === "money" ? "rgba(245, 67, 128, 0.35)" : "rgba(29, 130, 245, 0.35)";
        spotlightWrap.innerHTML = `
          <circle cx="0" cy="-6" r="36" fill="${ringBg}" stroke="${accentColor}" stroke-width="3" style="filter: drop-shadow(0 0 12px ${glowColor});"/>
          <g transform="translate(0, -6) scale(1.18)">${this.icons.getTokenSvgMarkup(config.iconType)}</g>
        `;
        pillBg.setAttribute("y", "26");
        mainText.setAttribute("y", "49");
      } else {
        spotlightWrap.innerHTML = "";
        pillBg.setAttribute("y", "-23");
        mainText.setAttribute("y", "0");
      }

      mainText.textContent = config.title || "";
      mainText.setAttribute("fill", config.isError ? "#DC2626" : "#0F172A");
    }

    createLegendLayer() {
      const g = document.createElementNS(SVG_NS, "g");
      g.setAttribute("id", "diagram-legend");
      g.setAttribute("transform", "translate(24, 732)");

      g.innerHTML = `
        <rect x="0" y="0" width="376" height="58" rx="13" ry="13" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="1.6"/>
        <!-- Real Flow Legend Item -->
        <line x1="22" y1="29" x2="60" y2="29" stroke="#1D82F5" stroke-width="5.5" stroke-linecap="round"/>
        <polygon points="56,20 71,29 56,38" fill="#1D82F5"/>
        <text x="81" y="30" font-family="var(--font-sans)" font-size="18.5" font-weight="700" fill="#1E293B" dominant-baseline="central">실물의 흐름</text>
        <!-- Money Flow Legend Item -->
        <line x1="202" y1="29" x2="240" y2="29" stroke="#F54380" stroke-width="5.5" stroke-linecap="round"/>
        <polygon points="236,20 251,29 236,38" fill="#F54380"/>
        <text x="261" y="30" font-family="var(--font-sans)" font-size="18.5" font-weight="700" fill="#1E293B" dominant-baseline="central">화폐의 흐름</text>
      `;
      return g;
    }

    /**
     * Selects a scenario (or null for all-grey reset).
     * When a card is clicked, the diagram resets to clean grey standby so the teacher
     * can press "거래 실행" and interactively guide students through Market -> Real Flow -> Money Flow.
     */
    applyScenario(scenario, options = {}) {
      this.stopAnimation();
      this.currentScenario = scenario || null;
      this.interactiveStep = "idle";

      if (options.highlightImmediately && this.currentScenario) {
        this.setAllScenarioHighlights(true);
      } else {
        this.clearAllHighlights();
      }

      if (this.currentScenario) {
        this.realTokenEl.innerHTML = this.icons.getTokenSvgMarkup(this.currentScenario.realFlow.iconType);
        this.moneyTokenEl.innerHTML = this.icons.getTokenSvgMarkup(this.currentScenario.moneyFlow.iconType);
      } else {
        this.realTokenEl.innerHTML = "";
        this.moneyTokenEl.innerHTML = "";
      }

      this.notifyStateChange();
    }

    clearAllHighlights() {
      this.pathElements.forEach((pathEl) => {
        pathEl.classList.remove("is-active");
        pathEl.setAttribute("data-active", "false");
        pathEl.setAttribute("marker-end", "url(#arrow-inactive)");
        pathEl.style.strokeDasharray = "";
        pathEl.style.strokeDashoffset = "";
      });

      this.labelElements.forEach((labelEl) => {
        labelEl.classList.remove("is-active", "just-activated");
        labelEl.setAttribute("data-active", "false");
      });

      this.clearNodeInteractiveStates();
      this.updateCenterGuide({ visible: false });
    }

    setAllScenarioHighlights(active) {
      if (!this.currentScenario || !active) {
        this.clearAllHighlights();
        return;
      }

      const activeSegmentSet = new Set([
        ...this.currentScenario.realFlow.segments,
        ...this.currentScenario.moneyFlow.segments
      ]);
      const activeLabelSet = new Set(this.currentScenario.activeLabelIds);

      this.pathElements.forEach((pathEl, segId) => {
        const isActive = activeSegmentSet.has(segId);
        const flowType = pathEl.getAttribute("data-flow-type");
        pathEl.classList.toggle("is-active", isActive);
        pathEl.setAttribute("data-active", isActive ? "true" : "false");
        pathEl.style.strokeDasharray = "";
        pathEl.style.strokeDashoffset = "";
        pathEl.setAttribute(
          "marker-end",
          isActive
            ? flowType === "real"
              ? "url(#arrow-real)"
              : "url(#arrow-money)"
            : "url(#arrow-inactive)"
        );
      });

      this.labelElements.forEach((labelEl, lblId) => {
        const isActive = activeLabelSet.has(lblId);
        labelEl.classList.toggle("is-active", isActive);
        labelEl.setAttribute("data-active", isActive ? "true" : "false");
      });
    }

    clearNodeInteractiveStates() {
      this.nodeElements.forEach((nodeEl) => {
        nodeEl.classList.remove(
          "is-selectable-market",
          "is-selectable-real",
          "is-selectable-money",
          "is-confirmed-market",
          "is-origin-real",
          "is-origin-money",
          "is-market-transiting",
          "is-wrong-choice"
        );
      });
    }

    setNodeActionTag(nodeId, text, color) {
      const tagGroup = this.nodeActionTags.get(nodeId);
      if (!tagGroup) return;
      const bg = tagGroup.querySelector(".node-action-tag-bg");
      const txt = tagGroup.querySelector(".node-action-tag-text");
      if (bg && color) bg.setAttribute("fill", color);
      if (txt && text) txt.textContent = text;
    }

    /**
     * Step 1 Entry: Called when the teacher clicks "거래 실행".
     * Lights up both markets ("생산물 시장" and "생산 요소 시장") so the teacher can choose one.
     */
    startInteractiveSession() {
      if (!this.currentScenario) return;

      this.stopAnimation();
      this.clearAllHighlights();
      this.interactiveStep = "select_market";

      const prodNode = this.nodeElements.get("productMarket");
      const factorNode = this.nodeElements.get("factorMarket");
      if (prodNode) prodNode.classList.add("is-selectable-market");
      if (factorNode) factorNode.classList.add("is-selectable-market");

      this.setNodeActionTag("productMarket", "시장 선택", "#2563EB");
      this.setNodeActionTag("factorMarket", "시장 선택", "#2563EB");

      this.updateCenterGuide({
        visible: true,
        accentColor: "#2563EB",
        title: "어느 시장에서 거래할까요?",
        subtitle: "위·아래 시장 중 하나를 선택하세요"
      });

      this.notifyStateChange();
    }

    /**
     * Handles clicks on any of the 4 diagram nodes (생산물 시장, 생산 요소 시장, 기업, 가계)
     * during the interactive steps.
     */
    handleNodeClick(nodeId) {
      if (!this.currentScenario || this.isAnimating) return;

      const sc = this.currentScenario;

      if (this.interactiveStep === "select_market") {
        if (nodeId !== "productMarket" && nodeId !== "factorMarket") return;

        if (nodeId === sc.realFlow.viaMarket) {
          this.enterSelectRealFromStep();
        } else {
          this.triggerWrongNodeFeedback(
            nodeId,
            "다시 선택해 보세요!"
          );
        }
        return;
      }

      if (this.interactiveStep === "select_real_from") {
        if (nodeId !== "firm" && nodeId !== "household") return;

        if (nodeId === sc.realFlow.fromNode) {
          this.runRealFlowPhaseAnimation(() => {
            this.pauseTimeoutId = setTimeout(() => {
              this.pauseTimeoutId = null;
              this.enterSelectMoneyFromStep();
            }, INTER_PHASE_PAUSE_MS);
          });
        } else {
          this.triggerWrongNodeFeedback(
            nodeId,
            "다시 선택해 보세요!"
          );
        }
        return;
      }

      if (this.interactiveStep === "select_money_from") {
        if (nodeId !== "firm" && nodeId !== "household") return;

        if (nodeId === sc.moneyFlow.fromNode) {
          this.runMoneyFlowPhaseAnimation(() => {
            this.interactiveStep = "completed";
            this.clearNodeInteractiveStates();
            this.updateCenterGuide({ visible: false });
            this.notifyStateChange();
          });
        } else {
          this.triggerWrongNodeFeedback(
            nodeId,
            "다시 선택해 보세요!"
          );
        }
        return;
      }
    }

    triggerWrongNodeFeedback(nodeId, errorMessage) {
      const nodeEl = this.nodeElements.get(nodeId);
      if (!nodeEl) return;

      nodeEl.classList.remove("is-wrong-choice");
      void nodeEl.getBoundingClientRect(); // trigger reflow
      nodeEl.classList.add("is-wrong-choice");

      const mainText = this.centerGuideEl.querySelector("#guide-main-text");
      if (mainText && errorMessage) {
        mainText.textContent = errorMessage;
        mainText.setAttribute("fill", "#DC2626");
      }

      if (this.wrongTimerIds.has(nodeId)) {
        clearTimeout(this.wrongTimerIds.get(nodeId));
      }
      const timerId = setTimeout(() => {
        nodeEl.classList.remove("is-wrong-choice");
        if (mainText && this.lastGuideTitle) {
          mainText.textContent = this.lastGuideTitle;
          mainText.setAttribute("fill", "#0F172A");
        }
        this.wrongTimerIds.delete(nodeId);
      }, 650);
      this.wrongTimerIds.set(nodeId, timerId);
    }

    /**
     * Step 2: Correct market chosen -> Light up Real Item illustration + Firm & Household boxes
     * Asks "빵은 누가 만드나요?" / "노동은 누가 제공하나요?" etc. Clicking the correct agent immediately animates the real flow.
     */
    enterSelectRealFromStep() {
      const sc = this.currentScenario;
      this.interactiveStep = "select_real_from";
      this.clearNodeInteractiveStates();

      const marketNode = this.nodeElements.get(sc.realFlow.viaMarket);
      if (marketNode) marketNode.classList.add("is-confirmed-market");

      const firmNode = this.nodeElements.get("firm");
      const householdNode = this.nodeElements.get("household");
      if (firmNode) firmNode.classList.add("is-selectable-real");
      if (householdNode) householdNode.classList.add("is-selectable-real");

      this.setNodeActionTag("firm", "주체 선택", "#1D82F5");
      this.setNodeActionTag("household", "주체 선택", "#1D82F5");

      this.updateCenterGuide({
        visible: true,
        accentColor: "#1D82F5",
        flowType: "real",
        iconType: sc.realFlow.iconType,
        title: sc.realFlow.prompt || `${sc.realFlow.iconLabel}은(는) 누가 제공하나요?`
      });

      this.notifyStateChange();
    }

    /**
     * Step 3: Real flow finished -> Light up Money (Coin) illustration + Firm & Household boxes
     * Asks "돈은 누가 지불하나요?". Clicking the correct agent immediately animates the money flow.
     */
    enterSelectMoneyFromStep() {
      const sc = this.currentScenario;
      if (!sc) return;

      this.interactiveStep = "select_money_from";
      this.clearNodeInteractiveStates();

      const marketNode = this.nodeElements.get(sc.moneyFlow.viaMarket);
      if (marketNode) marketNode.classList.add("is-confirmed-market");

      const firmNode = this.nodeElements.get("firm");
      const householdNode = this.nodeElements.get("household");
      if (firmNode) firmNode.classList.add("is-selectable-money");
      if (householdNode) householdNode.classList.add("is-selectable-money");

      this.setNodeActionTag("firm", "주체 선택", "#F54380");
      this.setNodeActionTag("household", "주체 선택", "#F54380");

      this.updateCenterGuide({
        visible: true,
        accentColor: "#F54380",
        flowType: "money",
        iconType: "coin",
        title: sc.moneyFlow.prompt || "돈은 누가 지불하나요?"
      });

      this.notifyStateChange();
    }

    /**
     * Activates a specific segment's concept label(s) belonging to the current scenario with a spring pop animation.
     */
    activateScenarioLabelForSegment(segmentId) {
      if (!this.currentScenario) return;
      const activeIds = new Set(this.currentScenario.activeLabelIds);

      this.labelElements.forEach((labelEl, lblId) => {
        if (activeIds.has(lblId) && labelEl.getAttribute("data-segment-id") === segmentId) {
          if (labelEl.getAttribute("data-active") !== "true") {
            labelEl.classList.add("is-active", "just-activated");
            labelEl.setAttribute("data-active", "true");
          }
        }
      });
    }

    /**
     * Progressive path drawing helper for a segment path element.
     */
    updateProgressiveSegmentStroke(pathEl, flowType, ratio) {
      if (!pathEl) return;
      const totalLen = pathEl.getTotalLength();
      pathEl.classList.add("is-active");
      pathEl.setAttribute("data-active", "true");

      if (ratio >= 0.98) {
        pathEl.style.strokeDasharray = "";
        pathEl.style.strokeDashoffset = "";
        pathEl.setAttribute(
          "marker-end",
          flowType === "real" ? "url(#arrow-real)" : "url(#arrow-money)"
        );
      } else {
        pathEl.style.strokeDasharray = `${totalLen}`;
        pathEl.style.strokeDashoffset = `${Math.max(0, totalLen * (1 - ratio))}`;
        pathEl.setAttribute(
          "marker-end",
          ratio > 0.85
            ? flowType === "real"
              ? "url(#arrow-real)"
              : "url(#arrow-money)"
            : "url(#arrow-inactive)"
        );
      }
    }

    /**
     * Plays Phase 1 (Real Flow: 출발 주체 -> 시장 경유 -> 도착 주체) with progressive path & label activation.
     */
    runRealFlowPhaseAnimation(onPhaseComplete) {
      if (!this.currentScenario) return;

      const sc = this.currentScenario;
      this.clearNodeInteractiveStates();
      const marketNode = this.nodeElements.get(sc.realFlow.viaMarket);
      if (marketNode) marketNode.classList.add("is-confirmed-market");

      this.updateCenterGuide({ visible: false });
      this.interactiveStep = "animating_real";
      this.isAnimating = true;

      this.realTokenEl.innerHTML = this.icons.getTokenSvgMarkup(sc.realFlow.iconType);
      const startTime = performance.now();

      const step = (now) => {
        if (!this.isAnimating) return;

        const elapsed = now - startTime;
        const u = Math.min(1, Math.max(0, elapsed / SINGLE_PHASE_DURATION_MS));

        this.renderRealPhaseAtSubProgress(u);

        if (u < 1) {
          this.rafId = requestAnimationFrame(step);
        } else {
          this.rafId = null;
          this.isAnimating = false;
          this.clearMarketTransitHighlight();
          this.realTokenEl.style.opacity = "0";

          this.cleanupTimeoutId = setTimeout(() => {
            this.cleanupTimeoutId = null;
            if (!this.isAnimating) {
              this.realTokenEl.style.display = "none";
              this.realTokenEl.setAttribute("data-visible", "false");
            }
            if (typeof onPhaseComplete === "function") {
              onPhaseComplete();
            }
          }, 160);
        }
      };

      this.renderRealPhaseAtSubProgress(0);
      this.notifyStateChange();
      this.rafId = requestAnimationFrame(step);
    }

    /**
     * Plays Phase 2 (Money Flow: 출발 주체 -> 시장 경유 -> 도착 주체) with progressive path & label activation.
     */
    runMoneyFlowPhaseAnimation(onPhaseComplete) {
      if (!this.currentScenario) return;

      const sc = this.currentScenario;
      this.clearNodeInteractiveStates();
      const marketNode = this.nodeElements.get(sc.moneyFlow.viaMarket);
      if (marketNode) marketNode.classList.add("is-confirmed-market");

      this.updateCenterGuide({ visible: false });
      this.interactiveStep = "animating_money";
      this.isAnimating = true;

      this.moneyTokenEl.innerHTML = this.icons.getTokenSvgMarkup("coin");
      const startTime = performance.now();

      const step = (now) => {
        if (!this.isAnimating) return;

        const elapsed = now - startTime;
        const u = Math.min(1, Math.max(0, elapsed / SINGLE_PHASE_DURATION_MS));

        this.renderMoneyPhaseAtSubProgress(u);

        if (u < 1) {
          this.rafId = requestAnimationFrame(step);
        } else {
          this.rafId = null;
          this.isAnimating = false;
          this.animationState.phase = "completed";
          this.animationState.activeFlow = null;
          this.clearMarketTransitHighlight();
          this.moneyTokenEl.style.opacity = "0";

          this.cleanupTimeoutId = setTimeout(() => {
            this.cleanupTimeoutId = null;
            if (!this.isAnimating) {
              this.moneyTokenEl.style.display = "none";
              this.moneyTokenEl.setAttribute("data-visible", "false");
            }
            if (typeof onPhaseComplete === "function") {
              onPhaseComplete();
            }
          }, 160);
        }
      };

      this.renderMoneyPhaseAtSubProgress(0);
      this.notifyStateChange();
      this.rafId = requestAnimationFrame(step);
    }

    /**
     * Full continuous sequential replay ("다시 보기"):
     * Plays Phase 1 (Real Flow, 2.8s) -> 0.45s Pause -> Phase 2 (Money Flow, 2.8s) automatically.
     */
    playAnimation(onComplete) {
      if (!this.currentScenario) return;

      this.stopAnimation();
      this.clearAllHighlights();

      this.runRealFlowPhaseAnimation(() => {
        this.pauseTimeoutId = setTimeout(() => {
          this.pauseTimeoutId = null;
          this.runMoneyFlowPhaseAnimation(() => {
            this.interactiveStep = "completed";
            this.clearNodeInteractiveStates();
            this.notifyStateChange();
            if (typeof onComplete === "function") {
              onComplete();
            }
          });
        }, INTER_PHASE_PAUSE_MS);
      });
    }

    /**
     * Stops any running animation or interactive timers immediately.
     */
    stopAnimation() {
      if (this.rafId !== null) {
        cancelAnimationFrame(this.rafId);
        this.rafId = null;
      }
      if (this.cleanupTimeoutId !== null) {
        clearTimeout(this.cleanupTimeoutId);
        this.cleanupTimeoutId = null;
      }
      if (this.pauseTimeoutId !== null) {
        clearTimeout(this.pauseTimeoutId);
        this.pauseTimeoutId = null;
      }
      this.wrongTimerIds.forEach((timerId) => clearTimeout(timerId));
      this.wrongTimerIds.clear();

      this.isAnimating = false;
      this.animationState = {
        phase: "idle",
        activeFlow: null,
        progress: 0,
        realTokenPos: null,
        moneyTokenPos: null
      };

      this.hideTokens();
      this.clearMarketTransitHighlight();
    }

    hideTokens() {
      if (this.realTokenEl) {
        this.realTokenEl.style.opacity = "0";
        this.realTokenEl.style.display = "none";
        this.realTokenEl.setAttribute("data-visible", "false");
      }
      if (this.moneyTokenEl) {
        this.moneyTokenEl.style.opacity = "0";
        this.moneyTokenEl.style.display = "none";
        this.moneyTokenEl.setAttribute("data-visible", "false");
      }
    }

    clearMarketTransitHighlight() {
      this.nodeElements.forEach((nodeEl) => {
        nodeEl.classList.remove("is-market-transiting");
      });
    }

    /**
     * Computes position and segment draw ratios along a 2-segment path (seg1 -> market -> seg2)
     * for normalized sub-progress `u` in [0, 1].
     */
    computeTwoStagePoint(seg1El, seg2El, u) {
      const STAGE1_END = 0.44;
      const STAGE2_START = 0.56;
      const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

      if (u <= STAGE1_END) {
        const localT = easeInOut(u / STAGE1_END);
        const pt = seg1El.getPointAtLength(localT * seg1El.getTotalLength());
        return {
          stage: "stage1",
          seg1Ratio: localT,
          seg2Ratio: 0,
          x: pt.x,
          y: pt.y,
          scale: 1,
          opacity: 1
        };
      } else if (u < STAGE2_START) {
        const transitT = (u - STAGE1_END) / (STAGE2_START - STAGE1_END);
        if (transitT < 0.5) {
          const fadeOut = 1 - transitT * 1.7;
          const end1 = seg1El.getPointAtLength(seg1El.getTotalLength());
          return {
            stage: "market",
            seg1Ratio: 1,
            seg2Ratio: 0,
            x: end1.x,
            y: end1.y,
            scale: 1 - transitT * 0.35,
            opacity: Math.max(0.15, fadeOut)
          };
        } else {
          const fadeIn = (transitT - 0.5) * 1.7 + 0.15;
          const start2 = seg2El.getPointAtLength(0);
          return {
            stage: "market",
            seg1Ratio: 1,
            seg2Ratio: 0.02,
            x: start2.x,
            y: start2.y,
            scale: 0.65 + (transitT - 0.5) * 0.7,
            opacity: Math.min(1, fadeIn)
          };
        }
      } else {
        const localT = easeInOut((u - STAGE2_START) / (1 - STAGE2_START));
        const pt = seg2El.getPointAtLength(localT * seg2El.getTotalLength());
        return {
          stage: "stage2",
          seg1Ratio: 1,
          seg2Ratio: localT,
          x: pt.x,
          y: pt.y,
          scale: 1,
          opacity: 1
        };
      }
    }

    renderRealPhaseAtSubProgress(u) {
      const sc = this.currentScenario;
      if (!sc) return;

      const seg1Id = sc.realFlow.segments[0];
      const seg2Id = sc.realFlow.segments[1];
      const realSeg1 = this.pathElements.get(seg1Id);
      const realSeg2 = this.pathElements.get(seg2Id);
      const marketNodeEl = this.nodeElements.get(sc.realFlow.viaMarket);

      const realPos = this.computeTwoStagePoint(realSeg1, realSeg2, u);

      // Progressive arrow drawing & label activation for Real Flow
      this.activateScenarioLabelForSegment(seg1Id);
      this.updateProgressiveSegmentStroke(realSeg1, "real", realPos.seg1Ratio);

      if (realPos.stage === "market" && marketNodeEl) {
        marketNodeEl.classList.add("is-market-transiting");
      } else {
        this.clearMarketTransitHighlight();
      }

      if (realPos.stage === "stage2" || realPos.seg2Ratio > 0) {
        this.activateScenarioLabelForSegment(seg2Id);
        this.updateProgressiveSegmentStroke(realSeg2, "real", realPos.seg2Ratio);
      }

      this.realTokenEl.style.display = "block";
      this.realTokenEl.setAttribute("data-visible", "true");
      this.realTokenEl.setAttribute(
        "transform",
        `translate(${realPos.x.toFixed(2)}, ${realPos.y.toFixed(2)}) scale(${realPos.scale.toFixed(3)})`
      );
      this.realTokenEl.style.opacity = String(realPos.opacity.toFixed(3));

      this.moneyTokenEl.style.opacity = "0";
      this.moneyTokenEl.style.display = "none";
      this.moneyTokenEl.setAttribute("data-visible", "false");

      this.animationState = {
        phase: `real_${realPos.stage}`,
        activeFlow: "real",
        progress: u * 0.5,
        realTokenPos: realPos,
        moneyTokenPos: null
      };
    }

    renderMoneyPhaseAtSubProgress(u) {
      const sc = this.currentScenario;
      if (!sc) return;

      // Ensure real flow segments & labels are fully active
      const realSeg1Id = sc.realFlow.segments[0];
      const realSeg2Id = sc.realFlow.segments[1];
      this.activateScenarioLabelForSegment(realSeg1Id);
      this.activateScenarioLabelForSegment(realSeg2Id);
      this.updateProgressiveSegmentStroke(this.pathElements.get(realSeg1Id), "real", 1);
      this.updateProgressiveSegmentStroke(this.pathElements.get(realSeg2Id), "real", 1);

      const seg1Id = sc.moneyFlow.segments[0];
      const seg2Id = sc.moneyFlow.segments[1];
      const moneySeg1 = this.pathElements.get(seg1Id);
      const moneySeg2 = this.pathElements.get(seg2Id);
      const marketNodeEl = this.nodeElements.get(sc.moneyFlow.viaMarket);

      const moneyPos = this.computeTwoStagePoint(moneySeg1, moneySeg2, u);

      this.activateScenarioLabelForSegment(seg1Id);
      this.updateProgressiveSegmentStroke(moneySeg1, "money", moneyPos.seg1Ratio);

      if (moneyPos.stage === "market" && marketNodeEl) {
        marketNodeEl.classList.add("is-market-transiting");
      } else {
        this.clearMarketTransitHighlight();
      }

      if (moneyPos.stage === "stage2" || moneyPos.seg2Ratio > 0) {
        this.activateScenarioLabelForSegment(seg2Id);
        this.updateProgressiveSegmentStroke(moneySeg2, "money", moneyPos.seg2Ratio);
      }

      this.realTokenEl.style.opacity = "0";
      this.realTokenEl.style.display = "none";
      this.realTokenEl.setAttribute("data-visible", "false");

      this.moneyTokenEl.style.display = "block";
      this.moneyTokenEl.setAttribute("data-visible", "true");
      this.moneyTokenEl.setAttribute(
        "transform",
        `translate(${moneyPos.x.toFixed(2)}, ${moneyPos.y.toFixed(2)}) scale(${moneyPos.scale.toFixed(3)})`
      );
      this.moneyTokenEl.style.opacity = String(moneyPos.opacity.toFixed(3));

      this.animationState = {
        phase: `money_${moneyPos.stage}`,
        activeFlow: "money",
        progress: 0.5 + u * 0.5,
        realTokenPos: null,
        moneyTokenPos: moneyPos
      };
    }

    /**
     * Deterministic seek across the overall sequential timeline [0.00 -> 1.00]:
     * - [0.00, 0.50]: Phase 1 (Real Flow)
     * - (0.50, 1.00]: Phase 2 (Money Flow)
     */
    renderTokensAtProgress(progress) {
      if (!this.currentScenario) return;
      this.updateCenterGuide({ visible: false });
      this.clearNodeInteractiveStates();

      if (progress <= 0.5) {
        this.clearAllHighlights();
        const u = Math.min(1, Math.max(0, progress / 0.5));
        this.renderRealPhaseAtSubProgress(u);
      } else {
        const u = Math.min(1, Math.max(0, (progress - 0.5) / 0.5));
        this.renderMoneyPhaseAtSubProgress(u);
      }
    }

    notifyStateChange() {
      if (typeof this.onStateChange === "function") {
        this.onStateChange();
      }
    }
  }

  global.CircularDiagram = CircularDiagram;
})(window);
