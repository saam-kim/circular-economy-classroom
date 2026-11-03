(function (global) {
  "use strict";

  const STAGE_DURATION_MS = 3500;
  const STAGE_PAUSE_MS = 500;

  /**
   * 4 Synchronized Stages for the "빵 구매 (베이커리 이야기)" Full Circular Flow Story:
   * Connects Factor Market (Labor -> Wage) and Product Market (Bread -> Payment) into one complete loop.
   * Note: The 2D animation itself shows pure, natural story actions without diagram labels.
   */
  const BAKERY_STORY_STAGES = [
    {
      index: 0,
      id: "stage_labor",
      shortTitle: "① 빵집 출근·제빵",
      marketBadge: "1단계 · 빵집에서 일하기",
      flowType: "real",
      narration: "제빵사가 빵집에 출근해 반죽을 밀고 오븐에서 고소한 빵을 구워 냅니다.",
      speechBubble: "열심히 반죽해서 맛있는 빵을 구워요!",
      speechSide: "household",
      activeSegments: ["factor_real_1", "factor_real_2"],
      activeLabelIds: ["labor_supply", "labor_purchase"],
      completedSegments: [],
      completedLabelIds: [],
      viaMarket: "factorMarket",
      iconType: "labor"
    },
    {
      index: 1,
      id: "stage_wage",
      shortTitle: "② 월급 받기",
      marketBadge: "2단계 · 일한 대가로 월급 받기",
      flowType: "money",
      narration: "빵집 사장님이 열심히 일한 제빵사에게 이번 달 월급 봉투를 건네줍니다.",
      speechBubble: "정성껏 빵을 구워 주셔서 감사합니다. 월급입니다!",
      speechSide: "firm",
      activeSegments: ["factor_money_1", "factor_money_2"],
      activeLabelIds: ["factor_payment", "household_income"],
      completedSegments: ["factor_real_1", "factor_real_2"],
      completedLabelIds: ["labor_supply", "labor_purchase"],
      viaMarket: "factorMarket",
      iconType: "coin"
    },
    {
      index: 2,
      id: "stage_bread",
      shortTitle: "③ 갓 구운 빵 구매",
      marketBadge: "3단계 · 따뜻한 빵 사고팔기",
      flowType: "real",
      narration: "빵집 진열장에 갓 구운 빵이 가득 차고, 손님이 찾아와 고소한 빵을 건네받습니다.",
      speechBubble: "갓 구운 따끈한 식빵과 바게트 나왔습니다!",
      speechSide: "firm",
      activeSegments: ["prod_real_1", "prod_real_2"],
      activeLabelIds: ["goods_sale", "goods_purchase"],
      completedSegments: ["factor_real_1", "factor_real_2", "factor_money_1", "factor_money_2"],
      completedLabelIds: ["labor_supply", "labor_purchase", "factor_payment", "household_income"],
      viaMarket: "productMarket",
      iconType: "bread"
    },
    {
      index: 3,
      id: "stage_payment",
      shortTitle: "④ 빵값 계산하기",
      marketBadge: "4단계 · 빵값 지불하고 순환 완성",
      flowType: "money",
      narration: "손님이 일해서 번 돈으로 빵값을 계산하면, 빵집의 수입이 되어 다시 순환이 이어집니다.",
      speechBubble: "월급으로 받은 돈으로 맛있는 빵을 사 가요!",
      speechSide: "household",
      activeSegments: ["prod_money_1", "prod_money_2"],
      activeLabelIds: ["household_expenditure", "firm_revenue"],
      completedSegments: [
        "factor_real_1",
        "factor_real_2",
        "factor_money_1",
        "factor_money_2",
        "prod_real_1",
        "prod_real_2"
      ],
      completedLabelIds: [
        "labor_supply",
        "labor_purchase",
        "factor_payment",
        "household_income",
        "goods_sale",
        "goods_purchase"
      ],
      viaMarket: "productMarket",
      iconType: "coin"
    }
  ];

  class StoryAnimator {
    constructor(containerEl, diagram, callbacks) {
      this.container = containerEl;
      this.diagram = diagram;
      this.callbacks = callbacks || {};

      this.currentScenarioId = "bread";
      this.currentStageIndex = -1;
      this.stageSubProgress = 0;
      this.isPlaying = false;
      this.ttsEnabled = false;
      this.rafId = null;
      this.pauseTimerId = null;

      this.render();
    }

    render() {
      this.container.innerHTML = `
        <div class="story-stage-wrapper">
          <!-- Top Bar: Title + 4 Stage Pills + Optional TTS Toggle -->
          <div class="story-top-bar">
            <div class="story-title-row">
              <span class="story-mode-chip">스토리 애니메이션</span>
              <h3 class="story-scene-heading" id="story-scene-heading">동네 빵집의 하루와 경제 활동의 순환</h3>
              <button type="button" id="btn-story-tts" class="btn-story-tts" aria-pressed="false" title="음성 해설 켜기/끄기">
                <span class="tts-icon" id="tts-icon-label">🔇 음성 OFF</span>
              </button>
            </div>
            <div class="story-steps-nav" id="story-steps-nav" role="tablist" aria-label="스토리 단계 선택">
              ${BAKERY_STORY_STAGES.map(
                (st) => `
                <button type="button" class="story-step-pill" data-stage-index="${st.index}">
                  ${st.shortTitle}
                </button>
              `
              ).join("")}
            </div>
          </div>

          <!-- Center 2D Vector Illustration Stage (100% Original Custom SVG, Pure Story Scene) -->
          <div class="story-canvas-box" id="story-canvas-box">
            ${this.buildBakerySvgMarkup()}

            <!-- Overlay shown when a non-bakery card is selected during prototype review -->
            <div class="story-prototype-notice" id="story-prototype-notice" hidden>
              <div class="story-prototype-card">
                <span class="story-proto-badge">프로토타입 시안 안내</span>
                <h4 id="story-proto-title">현재 「빵 구매」 스토리 애니메이션이 우선 제작되어 있습니다</h4>
                <p>빵집 사례의 4단계 애니메이션과 우측 순환 모형 연동 방식을 먼저 확인해 보세요.</p>
                <button type="button" id="btn-switch-to-bread" class="btn btn-primary story-proto-btn">
                  🍞 빵 구매 스토리 애니메이션 보기
                </button>
              </div>
            </div>
          </div>

          <!-- Bottom Live Narration Caption Bar -->
          <div class="story-caption-bar" id="story-caption-bar" data-flow-type="idle">
            <div class="story-caption-header">
              <span class="story-caption-badge" id="story-caption-badge">준비 완료 · ▶ 거래 실행을 눌러보세요</span>
              <span class="story-caption-step-indicator" id="story-caption-step-indicator">총 4단계 연속 순환</span>
            </div>
            <p class="story-caption-text" id="story-caption-text">
              우측 하단 <b>▶ 거래 실행</b> 버튼(또는 상단 ①~④ 단계 버튼)을 누르면 <b>빵집 이야기 애니메이션</b>과 오른쪽 <b>경제 순환 모형</b>이 타이밍에 맞춰 함께 움직입니다.
            </p>
          </div>
        </div>
      `;

      this.stepPills = Array.from(this.container.querySelectorAll(".story-step-pill"));
      this.stepPills.forEach((btn) => {
        btn.addEventListener("click", () => {
          const idx = Number(btn.getAttribute("data-stage-index"));
          this.playSingleStageOrFrom(idx);
        });
      });

      this.btnTts = this.container.querySelector("#btn-story-tts");
      this.ttsIconLabel = this.container.querySelector("#tts-icon-label");
      if (this.btnTts) {
        this.btnTts.addEventListener("click", () => {
          this.ttsEnabled = !this.ttsEnabled;
          this.btnTts.setAttribute("aria-pressed", this.ttsEnabled ? "true" : "false");
          this.btnTts.classList.toggle("is-active", this.ttsEnabled);
          this.ttsIconLabel.textContent = this.ttsEnabled ? "🔊 음성 ON" : "🔇 음성 OFF";
          if (!this.ttsEnabled && "speechSynthesis" in global) {
            global.speechSynthesis.cancel();
          }
        });
      }

      const btnSwitchBread = this.container.querySelector("#btn-switch-to-bread");
      if (btnSwitchBread) {
        btnSwitchBread.addEventListener("click", () => {
          if (typeof this.callbacks.onRequestSelectBread === "function") {
            this.callbacks.onRequestSelectBread();
          }
        });
      }

      this.cacheSvgRefs();
      this.renderIdleScene();
    }

    buildBakerySvgMarkup() {
      return `
        <svg id="bakery-story-svg" class="bakery-story-svg" viewBox="0 0 640 500" preserveAspectRatio="xMidYMid slice">
          <defs>
            <linearGradient id="sky-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#BAE6FD"/>
              <stop offset="100%" stop-color="#E0F2FE"/>
            </linearGradient>
            <linearGradient id="wall-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#FFFDF7"/>
              <stop offset="100%" stop-color="#FEF3C7"/>
            </linearGradient>
            <linearGradient id="wainscot-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#FDE68A"/>
              <stop offset="100%" stop-color="#F59E0B" stop-opacity="0.35"/>
            </linearGradient>
            <linearGradient id="floor-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#F3E8D2"/>
              <stop offset="100%" stop-color="#E5D0B1"/>
            </linearGradient>
            <radialGradient id="oven-fire-grad" cx="50%" cy="65%" r="55%">
              <stop offset="0%" stop-color="#FEF08A"/>
              <stop offset="55%" stop-color="#F97316"/>
              <stop offset="100%" stop-color="#DC2626" stop-opacity="0"/>
            </radialGradient>
            <radialGradient id="lamp-glow-grad" cx="50%" cy="30%" r="60%">
              <stop offset="0%" stop-color="#FEF08A" stop-opacity="0.55"/>
              <stop offset="100%" stop-color="#FEF08A" stop-opacity="0"/>
            </radialGradient>
            <filter id="soft-shadow" x="-15%" y="-15%" width="130%" height="135%">
              <feDropShadow dx="0" dy="4" stdDeviation="5" flood-color="#0F172A" flood-opacity="0.12"/>
            </filter>
          </defs>

          <!-- Full-bleed Bakery Background Wall, Wainscoting & Tiled Floor -->
          <rect x="-20" y="-20" width="680" height="300" fill="url(#wall-grad)"/>
          <rect x="-20" y="275" width="680" height="75" fill="url(#wainscot-grad)"/>
          <line x1="-20" y1="275" x2="660" y2="275" stroke="#D97706" stroke-width="3" stroke-opacity="0.45"/>
          <g stroke="#D97706" stroke-width="1.5" stroke-opacity="0.22">
            <line x1="40" y1="275" x2="40" y2="350"/>
            <line x1="95" y1="275" x2="95" y2="350"/>
            <line x1="150" y1="275" x2="150" y2="350"/>
            <line x1="205" y1="275" x2="205" y2="350"/>
            <line x1="260" y1="275" x2="260" y2="350"/>
            <line x1="315" y1="275" x2="315" y2="350"/>
            <line x1="370" y1="275" x2="370" y2="350"/>
            <line x1="425" y1="275" x2="425" y2="350"/>
            <line x1="480" y1="275" x2="480" y2="350"/>
            <line x1="535" y1="275" x2="535" y2="350"/>
            <line x1="590" y1="275" x2="590" y2="350"/>
          </g>

          <!-- Bakery Floor -->
          <rect x="-20" y="350" width="680" height="170" fill="url(#floor-grad)"/>
          <line x1="-20" y1="350" x2="660" y2="350" stroke="#B45309" stroke-width="3" stroke-opacity="0.5"/>
          <g stroke="#C2A378" stroke-width="1.5" opacity="0.4">
            <line x1="-20" y1="395" x2="660" y2="395"/>
            <line x1="-20" y1="445" x2="660" y2="445"/>
            <line x1="-20" y1="495" x2="660" y2="495"/>
            <line x1="110" y1="350" x2="40" y2="520"/>
            <line x1="240" y1="350" x2="200" y2="520"/>
            <line x1="370" y1="350" x2="370" y2="520"/>
            <line x1="500" y1="350" x2="545" y2="520"/>
          </g>

          <!-- Ceiling Warm Pendant Lamps -->
          <g transform="translate(205, 0)">
            <ellipse cx="0" cy="74" rx="60" ry="42" fill="url(#lamp-glow-grad)"/>
            <line x1="0" y1="-10" x2="0" y2="42" stroke="#78350F" stroke-width="2.5"/>
            <path d="M -22 52 C -22 36, 22 36, 22 52 Z" fill="#D97706" stroke="#451A03" stroke-width="2.2"/>
            <circle cx="0" cy="54" r="6" fill="#FEF08A"/>
          </g>
          <g transform="translate(445, 0)">
            <ellipse cx="0" cy="74" rx="60" ry="42" fill="url(#lamp-glow-grad)"/>
            <line x1="0" y1="-10" x2="0" y2="42" stroke="#78350F" stroke-width="2.5"/>
            <path d="M -22 52 C -22 36, 22 36, 22 52 Z" fill="#D97706" stroke="#451A03" stroke-width="2.2"/>
            <circle cx="0" cy="54" r="6" fill="#FEF08A"/>
          </g>

          <!-- Bakery Street Window & Greenery (Center Wall) -->
          <g transform="translate(245, 58)">
            <rect x="0" y="0" width="152" height="120" rx="10" fill="url(#sky-grad)" stroke="#92400E" stroke-width="4.5"/>
            <circle cx="34" cy="98" r="24" fill="#86EFAC"/>
            <circle cx="68" cy="104" r="22" fill="#4ADE80"/>
            <circle cx="118" cy="100" r="25" fill="#86EFAC"/>
            <g id="bg-clouds" transform="translate(18, 26)">
              <circle cx="16" cy="14" r="10" fill="#FFFFFF" opacity="0.92"/>
              <circle cx="28" cy="11" r="13" fill="#FFFFFF" opacity="0.92"/>
              <circle cx="40" cy="15" r="9" fill="#FFFFFF" opacity="0.92"/>
              <circle cx="92" cy="24" r="9" fill="#FFFFFF" opacity="0.88"/>
              <circle cx="104" cy="21" r="12" fill="#FFFFFF" opacity="0.88"/>
            </g>
            <line x1="76" y1="0" x2="76" y2="120" stroke="#92400E" stroke-width="3.2"/>
            <line x1="0" y1="60" x2="152" y2="60" stroke="#92400E" stroke-width="3.2"/>
            <rect x="-8" y="116" width="168" height="10" rx="4" fill="#B45309" stroke="#451A03" stroke-width="2.2"/>
            <!-- Striped Bakery Awning -->
            <path d="M -10 -4 L 162 -4 L 170 24 L -18 24 Z" fill="#EA580C" stroke="#451A03" stroke-width="2.6" stroke-linejoin="round"/>
            <path d="M 18 -4 L 14 24 M 48 -4 L 46 24 M 76 -4 L 76 24 M 104 -4 L 106 24 M 134 -4 L 138 24" stroke="#FFFBEB" stroke-width="11" stroke-linecap="butt" opacity="0.88"/>
            <path d="M -10 -4 L 162 -4 L 170 24 L -18 24 Z" fill="none" stroke="#451A03" stroke-width="2.6" stroke-linejoin="round"/>
          </g>

          <!-- Wall Bread & Jam Shelf (Right Background) -->
          <g transform="translate(436, 84)">
            <!-- Upper Shelf -->
            <rect x="0" y="28" width="144" height="8" rx="3" fill="#92400E" stroke="#451A03" stroke-width="2"/>
            <ellipse cx="34" cy="20" rx="19" ry="9" fill="#F59E0B" stroke="#451A03" stroke-width="2"/>
            <path d="M 26 16 L 29 23 M 34 15 L 37 23 M 42 16 L 45 23" stroke="#78350F" stroke-width="1.6" stroke-linecap="round"/>
            <ellipse cx="82" cy="20" rx="19" ry="9" fill="#D97706" stroke="#451A03" stroke-width="2"/>
            <rect x="112" y="6" width="18" height="22" rx="4" fill="#F43F5E" stroke="#451A03" stroke-width="2"/>
            <rect x="110" y="2" width="22" height="6" rx="2" fill="#FEF08A" stroke="#451A03" stroke-width="1.8"/>
            <!-- Lower Shelf -->
            <rect x="0" y="76" width="144" height="8" rx="3" fill="#92400E" stroke="#451A03" stroke-width="2"/>
            <path d="M 20 52 L 34 74 M 30 50 L 44 74" stroke="#F59E0B" stroke-width="9" stroke-linecap="round"/>
            <path d="M 20 52 L 34 74 M 30 50 L 44 74" stroke="#451A03" stroke-width="2" stroke-linecap="round"/>
            <rect x="16" y="60" width="38" height="16" rx="4" fill="#B45309" stroke="#451A03" stroke-width="2"/>
            <!-- Wooden Wall Clock -->
            <circle cx="104" cy="56" r="16" fill="#FFFBEB" stroke="#92400E" stroke-width="3"/>
            <line x1="104" y1="56" x2="104" y2="46" stroke="#451A03" stroke-width="2" stroke-linecap="round"/>
            <line x1="104" y1="56" x2="112" y2="56" stroke="#451A03" stroke-width="2" stroke-linecap="round"/>
          </g>

          <!-- LEFT SIDE: Brick Oven -->
          <g id="bakery-oven-group" transform="translate(46, 110)">
            <!-- Chimney -->
            <rect x="38" y="-36" width="38" height="56" fill="#92400E" stroke="#451A03" stroke-width="2.8"/>
            <line x1="38" y1="-16" x2="76" y2="-16" stroke="#451A03" stroke-width="2" opacity="0.5"/>
            <!-- Brick Oven Dome & Body -->
            <path d="M 0 240 L 0 58 C 0 12, 114 12, 114 58 L 114 240 Z" fill="#B45309" stroke="#451A03" stroke-width="3"/>
            <g fill="#92400E" opacity="0.55">
              <rect x="12" y="64" width="22" height="9" rx="2"/>
              <rect x="80" y="64" width="22" height="9" rx="2"/>
              <rect x="8" y="156" width="24" height="9" rx="2"/>
              <rect x="44" y="166" width="26" height="9" rx="2"/>
              <rect x="82" y="156" width="24" height="9" rx="2"/>
            </g>
            <rect x="-6" y="234" width="126" height="14" rx="4" fill="#78350F" stroke="#451A03" stroke-width="2.6"/>
            <!-- Oven Arch Mouth -->
            <path d="M 18 148 L 18 94 C 18 66, 96 66, 96 94 L 96 148 Z" fill="#1E293B" stroke="#451A03" stroke-width="3"/>
            <!-- Animated Oven Fire Glow -->
            <g id="oven-fire-glow" opacity="0.35">
              <ellipse cx="57" cy="128" rx="34" ry="24" fill="url(#oven-fire-grad)"/>
              <path d="M 38 144 Q 47 110 57 134 Q 67 106 76 144 Z" fill="#F97316"/>
              <path d="M 46 144 Q 57 116 68 144 Z" fill="#FEF08A"/>
            </g>
            <!-- Baking Bread Inside Oven -->
            <g id="oven-bread-inside" transform="translate(57, 132)" opacity="0">
              <ellipse cx="0" cy="0" rx="22" ry="11" fill="#F59E0B" stroke="#451A03" stroke-width="2.2"/>
              <path d="M -9 -4 L -6 4 M 0 -5 L 2 4 M 9 -4 L 11 4" stroke="#78350F" stroke-width="1.8" stroke-linecap="round"/>
            </g>
          </g>

          <!-- FIRM CHARACTER: Bakery Owner / Chef -->
          <g id="char-firm" transform="translate(216, 256)">
            <ellipse cx="0" cy="148" rx="40" ry="10" fill="#78350F" opacity="0.18"/>
            <rect x="-18" y="88" width="13" height="52" rx="6" fill="#1E3A8A" stroke="#1E293B" stroke-width="2.4"/>
            <rect x="5" y="88" width="13" height="52" rx="6" fill="#1E3A8A" stroke="#1E293B" stroke-width="2.4"/>
            <ellipse cx="-12" cy="142" rx="11" ry="6" fill="#451A03" stroke="#1E293B" stroke-width="2.2"/>
            <ellipse cx="12" cy="142" rx="11" ry="6" fill="#451A03" stroke="#1E293B" stroke-width="2.2"/>
            <!-- Left Arm -->
            <path d="M -24 14 Q -38 36 -28 56" fill="none" stroke="#3B82F6" stroke-width="13" stroke-linecap="round"/>
            <path d="M -24 14 Q -38 36 -28 56" fill="none" stroke="#1E293B" stroke-width="2.4" stroke-linecap="round"/>
            <circle cx="-28" cy="58" r="7" fill="#FDE68A" stroke="#1E293B" stroke-width="2.2"/>
            <!-- Torso & Baker Jacket + Apron -->
            <rect x="-28" y="4" width="56" height="88" rx="16" fill="#3B82F6" stroke="#1E293B" stroke-width="2.6"/>
            <path d="M -20 8 L 20 8 L 24 92 L -24 92 Z" fill="#FFFFFF" stroke="#1E293B" stroke-width="2.4" stroke-linejoin="round"/>
            <path d="M -14 4 L 14 4 L 0 20 Z" fill="#EF4444" stroke="#1E293B" stroke-width="2"/>
            <rect x="-14" y="32" width="28" height="16" rx="4" fill="#DBEAFE" stroke="#1E293B" stroke-width="2"/>
            <!-- Neck & Head -->
            <rect x="-8" y="-8" width="16" height="16" rx="5" fill="#FCD34D" stroke="#1E293B" stroke-width="2.2"/>
            <circle cx="-27" cy="-24" r="6" fill="#FDE68A" stroke="#1E293B" stroke-width="2.2"/>
            <circle cx="27" cy="-24" r="6" fill="#FDE68A" stroke="#1E293B" stroke-width="2.2"/>
            <circle cx="0" cy="-26" r="26" fill="#FDE68A" stroke="#1E293B" stroke-width="2.6"/>
            <path d="M -25 -30 C -22 -52, 22 -52, 25 -30 C 16 -40, -16 -40, -25 -30 Z" fill="#78350F" stroke="#1E293B" stroke-width="2.2"/>
            <!-- Tall Baker Toque Hat -->
            <path d="M -24 -48 C -34 -72, -10 -86, 0 -80 C 10 -86, 34 -72, 24 -48 Z" fill="#FFFFFF" stroke="#1E293B" stroke-width="2.6"/>
            <rect x="-22" y="-52" width="44" height="11" rx="3.5" fill="#FFFFFF" stroke="#1E293B" stroke-width="2.4"/>
            <!-- Friendly Face -->
            <path d="M -13 -32 Q -9 -35 -5 -32 M 5 -32 Q 9 -35 13 -32" fill="none" stroke="#451A03" stroke-width="2.2" stroke-linecap="round"/>
            <circle cx="-9" cy="-25" r="3" fill="#1E293B"/>
            <circle cx="9" cy="-25" r="3" fill="#1E293B"/>
            <circle cx="-10" cy="-26" r="1" fill="#FFFFFF"/>
            <circle cx="8" cy="-26" r="1" fill="#FFFFFF"/>
            <ellipse cx="-15" cy="-18" rx="4.5" ry="3" fill="#FDA4AF" opacity="0.7"/>
            <ellipse cx="15" cy="-18" rx="4.5" ry="3" fill="#FDA4AF" opacity="0.7"/>
            <path d="M -7 -15 Q 0 -8 7 -15" fill="none" stroke="#1E293B" stroke-width="2.5" stroke-linecap="round"/>
            <!-- Animated Right Arm -->
            <g id="firm-arm-right" transform="translate(24, 18) rotate(0)">
              <path d="M 0 0 L 28 14" stroke="#3B82F6" stroke-width="13" stroke-linecap="round"/>
              <path d="M 0 0 L 28 14" stroke="#1E293B" stroke-width="2.5" stroke-linecap="round"/>
              <circle cx="30" cy="15" r="7" fill="#FDE68A" stroke="#1E293B" stroke-width="2.2"/>
            </g>
          </g>

          <!-- Bakery Counter & Glass Showcase -->
          <g id="bakery-counter" transform="translate(132, 326)">
            <ellipse cx="110" cy="108" rx="124" ry="12" fill="#78350F" opacity="0.18"/>
            <rect x="0" y="0" width="220" height="104" rx="10" fill="#D97706" stroke="#451A03" stroke-width="3"/>
            <rect x="10" y="12" width="200" height="80" rx="6" fill="#F59E0B" stroke="#78350F" stroke-width="2.2"/>
            <rect x="-8" y="-8" width="236" height="14" rx="6" fill="#FFFBEB" stroke="#451A03" stroke-width="2.8"/>

            <!-- Dough Kneading Station (Visible during Stage 1) -->
            <g id="prop-dough-station" transform="translate(152, -22)" opacity="0">
              <ellipse cx="0" cy="10" rx="34" ry="10" fill="#FDE68A" stroke="#78350F" stroke-width="2.4"/>
              <path id="dough-mound" d="M -24 8 C -24 -16, 24 -16, 24 8 Z" fill="#FEF9C3" stroke="#CA8A04" stroke-width="2.4"/>
              <g id="rolling-pin" transform="translate(0, -4)">
                <rect x="-32" y="-3" width="64" height="6" rx="3" fill="#92400E" stroke="#451A03" stroke-width="1.8"/>
                <rect x="-20" y="-6" width="40" height="12" rx="5" fill="#D97706" stroke="#451A03" stroke-width="2"/>
              </g>
              <circle id="flour-puff-1" cx="-28" cy="-12" r="4.5" fill="#FFFFFF" opacity="0.9"/>
              <circle id="flour-puff-2" cx="30" cy="-14" r="5.5" fill="#FFFFFF" opacity="0.9"/>
            </g>

            <!-- Fresh Baked Bread Glass Showcase -->
            <g id="fresh-bread-display" transform="translate(64, -32)" opacity="0.55">
              <rect x="-46" y="-14" width="92" height="38" rx="7" fill="#E0F2FE" fill-opacity="0.68" stroke="#0284C7" stroke-width="2.4"/>
              <line x1="-46" y1="6" x2="46" y2="6" stroke="#0284C7" stroke-width="1.6" stroke-opacity="0.5"/>
              <ellipse cx="-20" cy="14" rx="16" ry="8.5" fill="#F59E0B" stroke="#451A03" stroke-width="2"/>
              <path d="M -25 11 L -22 17 M -19 10 L -16 17" stroke="#78350F" stroke-width="1.6" stroke-linecap="round"/>
              <ellipse cx="20" cy="14" rx="16" ry="8.5" fill="#F59E0B" stroke="#451A03" stroke-width="2"/>
              <path d="M 15 11 L 18 17 M 21 10 L 24 17" stroke="#78350F" stroke-width="1.6" stroke-linecap="round"/>
              <!-- Rising Steam Waves -->
              <path id="bread-steam" d="M -20 -2 Q -24 -12 -17 -20 M 20 -2 Q 16 -12 23 -20" fill="none" stroke="#F97316" stroke-width="2.5" stroke-linecap="round" opacity="0"/>
            </g>

            <!-- Cash Register -->
            <g id="cash-register" transform="translate(172, -26)">
              <rect x="-26" y="0" width="52" height="20" rx="4" fill="#475569" stroke="#1E293B" stroke-width="2.4"/>
              <rect x="-20" y="-16" width="40" height="18" rx="3.5" fill="#64748B" stroke="#1E293B" stroke-width="2.2"/>
              <rect x="-14" y="-12" width="28" height="10" rx="2" fill="#DCFCE7"/>
              <!-- Warm Golden Sparkles on Payment (No text badges) -->
              <g id="register-sparkles" transform="translate(0, -28)" opacity="0">
                <path d="M -16 0 L -12 -4 L -8 0 L -12 4 Z" fill="#FBBF24" stroke="#B45309" stroke-width="1.2"/>
                <path d="M 0 -8 L 5 -14 L 10 -8 L 5 -2 Z" fill="#FEF08A" stroke="#B45309" stroke-width="1.4"/>
                <path d="M 16 2 L 19 -2 L 22 2 L 19 6 Z" fill="#FBBF24" stroke="#B45309" stroke-width="1.2"/>
              </g>
            </g>

            <!-- Counter Signboard -->
            <rect x="44" y="28" width="132" height="42" rx="10" fill="#FFFBEB" stroke="#78350F" stroke-width="2.4"/>
            <text x="110" y="49" font-family="var(--font-sans)" font-size="16" font-weight="800" fill="#78350F" text-anchor="middle" dominant-baseline="central">🍞 동아 베이커리</text>
          </g>

          <!-- HOUSEHOLD CHARACTER: Baker (Stages 1-2) / Customer (Stages 3-4) -->
          <g id="char-household" transform="translate(468, 260)">
            <ellipse cx="0" cy="148" rx="40" ry="10" fill="#78350F" opacity="0.18"/>
            <rect x="-17" y="88" width="13" height="52" rx="6" fill="#334155" stroke="#1E293B" stroke-width="2.4"/>
            <rect x="4" y="88" width="13" height="52" rx="6" fill="#334155" stroke="#1E293B" stroke-width="2.4"/>
            <ellipse cx="-11" cy="142" rx="11" ry="6" fill="#78350F" stroke="#1E293B" stroke-width="2.2"/>
            <ellipse cx="11" cy="142" rx="11" ry="6" fill="#78350F" stroke="#1E293B" stroke-width="2.2"/>

            <!-- Right Arm -->
            <path d="M 24 14 Q 36 36 28 56" fill="none" stroke="#10B981" stroke-width="13" stroke-linecap="round"/>
            <path d="M 24 14 Q 36 36 28 56" fill="none" stroke="#1E293B" stroke-width="2.4" stroke-linecap="round"/>
            <circle cx="28" cy="58" r="7" fill="#FDE68A" stroke="#1E293B" stroke-width="2.2"/>

            <!-- Body Outfit (Warm Emerald Cardigan + White Collar) -->
            <rect x="-27" y="4" width="54" height="88" rx="16" fill="#10B981" stroke="#1E293B" stroke-width="2.6"/>
            <path d="M -12 4 L 0 18 L 12 4 Z" fill="#FFFFFF" stroke="#1E293B" stroke-width="2"/>

            <!-- Baker Apron Overlay (Visible in Stages 1 & 2, clean pocket without text) -->
            <g id="household-baker-apron" opacity="1">
              <path d="M -19 8 L 19 8 L 23 90 L -23 90 Z" fill="#FEF3C7" stroke="#1E293B" stroke-width="2.4" stroke-linejoin="round"/>
              <rect x="-14" y="38" width="28" height="18" rx="5" fill="#FDE68A" stroke="#92400E" stroke-width="1.8"/>
            </g>

            <!-- Neck & Head -->
            <rect x="-8" y="-8" width="16" height="16" rx="5" fill="#FCD34D" stroke="#1E293B" stroke-width="2.2"/>
            <circle cx="-27" cy="-24" r="6" fill="#FDE68A" stroke="#1E293B" stroke-width="2.2"/>
            <circle cx="27" cy="-24" r="6" fill="#FDE68A" stroke="#1E293B" stroke-width="2.2"/>
            <circle cx="0" cy="-26" r="26" fill="#FDE68A" stroke="#1E293B" stroke-width="2.6"/>
            <path d="M -26 -26 C -26 -54, 26 -54, 26 -26 C 18 -40, -18 -40, -26 -26 Z" fill="#451A03" stroke="#1E293B" stroke-width="2.4"/>

            <!-- Baker Hat (Visible in Stages 1 & 2) -->
            <g id="household-baker-hat" opacity="1">
              <path d="M -22 -48 C -30 -68, -8 -80, 0 -74 C 8 -80, 30 -68, 22 -48 Z" fill="#FFFFFF" stroke="#1E293B" stroke-width="2.5"/>
              <rect x="-20" y="-51" width="40" height="10" rx="3" fill="#DBEAFE" stroke="#1E293B" stroke-width="2.2"/>
            </g>

            <!-- Eyes, Rosy Cheeks & Smile -->
            <path d="M -13 -32 Q -9 -35 -5 -32 M 5 -32 Q 9 -35 13 -32" fill="none" stroke="#451A03" stroke-width="2.2" stroke-linecap="round"/>
            <circle cx="-9" cy="-25" r="3" fill="#1E293B"/>
            <circle cx="9" cy="-25" r="3" fill="#1E293B"/>
            <circle cx="-10" cy="-26" r="1" fill="#FFFFFF"/>
            <circle cx="8" cy="-26" r="1" fill="#FFFFFF"/>
            <ellipse cx="-15" cy="-18" rx="4.5" ry="3" fill="#FDA4AF" opacity="0.7"/>
            <ellipse cx="15" cy="-18" rx="4.5" ry="3" fill="#FDA4AF" opacity="0.7"/>
            <path d="M -7 -15 Q 0 -8 7 -15" fill="none" stroke="#1E293B" stroke-width="2.5" stroke-linecap="round"/>

            <!-- Animated Left Arm -->
            <g id="household-arm-left" transform="translate(-24, 18) rotate(0)">
              <path d="M 0 0 L -28 14" stroke="#10B981" stroke-width="13" stroke-linecap="round"/>
              <path d="M 0 0 L -28 14" stroke="#1E293B" stroke-width="2.5" stroke-linecap="round"/>
              <circle cx="-30" cy="15" r="7" fill="#FDE68A" stroke="#1E293B" stroke-width="2.2"/>
            </g>
          </g>

          <!-- NATURAL HANDHELD STORY PROPS (Zero Diagram Labels or Dashed Arcs) -->
          <g id="scene-natural-props" filter="url(#soft-shadow)">
            <!-- Stage 2 Prop: Warm Pay Envelope with Gold Seal & Banknote Peeking Out -->
            <g id="prop-pay-envelope" transform="translate(330, 272)" opacity="0">
              <rect x="-24" y="-15" width="48" height="30" rx="5" fill="#FFFBEB" stroke="#78350F" stroke-width="2.4"/>
              <path d="M -23 -14 L 0 4 L 23 -14" fill="none" stroke="#B45309" stroke-width="2.2" stroke-linejoin="round"/>
              <circle cx="0" cy="3" r="6.5" fill="#FBBF24" stroke="#78350F" stroke-width="1.8"/>
            </g>

            <!-- Stage 3 Prop: Warm Paper Bakery Bag with Fresh Baguette & Loaf -->
            <g id="prop-bread-bag" transform="translate(330, 268)" opacity="0">
              <!-- Baguette & Loaf peeking out of top -->
              <ellipse cx="-7" cy="-14" rx="10" ry="15" transform="rotate(-15 -7 -14)" fill="#F59E0B" stroke="#451A03" stroke-width="2.2"/>
              <ellipse cx="8" cy="-12" rx="11" ry="13" transform="rotate(12 8 -12)" fill="#D97706" stroke="#451A03" stroke-width="2.2"/>
              <!-- Kraft Paper Bag -->
              <path d="M -20 -6 L 20 -6 L 17 24 L -17 24 Z" fill="#FDE68A" stroke="#78350F" stroke-width="2.4" stroke-linejoin="round"/>
              <path d="M -20 -6 L -15 -10 L -10 -6 L -5 -10 L 0 -6 L 5 -10 L 10 -6 L 15 -10 L 20 -6" fill="none" stroke="#78350F" stroke-width="2" stroke-linejoin="round"/>
            </g>

            <!-- Stage 4 Prop: Golden Coins & Banknote Handed for Bread Payment -->
            <g id="prop-payment-coins" transform="translate(330, 272)" opacity="0">
              <rect x="-22" y="-10" width="36" height="20" rx="4" transform="rotate(-10)" fill="#86EFAC" stroke="#14532D" stroke-width="2.2"/>
              <circle cx="10" cy="4" r="11" fill="#FBBF24" stroke="#78350F" stroke-width="2.2"/>
              <circle cx="-2" cy="8" r="11" fill="#FDE047" stroke="#78350F" stroke-width="2.2"/>
            </g>
          </g>

          <!-- Speech Bubble Overlay -->
          <g id="scene-speech-bubble" transform="translate(320, 118)" opacity="0" filter="url(#soft-shadow)">
            <rect id="speech-bubble-rect" x="-165" y="-23" width="330" height="42" rx="21" fill="#FFFFFF" stroke="#92400E" stroke-width="2.6"/>
            <polygon id="speech-bubble-tail" points="0,19 -10,33 10,19" fill="#FFFFFF" stroke="#92400E" stroke-width="2.6" stroke-linejoin="round"/>
            <text id="speech-bubble-text" x="0" y="-2" font-family="var(--font-sans)" font-size="14.5" font-weight="800" fill="#0F172A" text-anchor="middle" dominant-baseline="central"></text>
          </g>
        </svg>
      `;
    }

    cacheSvgRefs() {
      const svg = this.container.querySelector("#bakery-story-svg");
      if (!svg) return;

      this.svgRefs = {
        ovenFireGlow: svg.querySelector("#oven-fire-glow"),
        ovenBreadInside: svg.querySelector("#oven-bread-inside"),
        charFirm: svg.querySelector("#char-firm"),
        firmArmRight: svg.querySelector("#firm-arm-right"),
        propDoughStation: svg.querySelector("#prop-dough-station"),
        doughMound: svg.querySelector("#dough-mound"),
        rollingPin: svg.querySelector("#rolling-pin"),
        freshBreadDisplay: svg.querySelector("#fresh-bread-display"),
        breadSteam: svg.querySelector("#bread-steam"),
        registerSparkles: svg.querySelector("#register-sparkles"),
        charHousehold: svg.querySelector("#char-household"),
        householdBakerHat: svg.querySelector("#household-baker-hat"),
        householdBakerApron: svg.querySelector("#household-baker-apron"),
        householdArmLeft: svg.querySelector("#household-arm-left"),
        propPayEnvelope: svg.querySelector("#prop-pay-envelope"),
        propBreadBag: svg.querySelector("#prop-bread-bag"),
        propPaymentCoins: svg.querySelector("#prop-payment-coins"),
        speechBubble: svg.querySelector("#scene-speech-bubble"),
        speechBubbleRect: svg.querySelector("#speech-bubble-rect"),
        speechBubbleTail: svg.querySelector("#speech-bubble-tail"),
        speechBubbleText: svg.querySelector("#speech-bubble-text")
      };

      this.captionBar = this.container.querySelector("#story-caption-bar");
      this.captionBadge = this.container.querySelector("#story-caption-badge");
      this.captionStepIndicator = this.container.querySelector("#story-caption-step-indicator");
      this.captionText = this.container.querySelector("#story-caption-text");
      this.prototypeNotice = this.container.querySelector("#story-prototype-notice");
      this.protoTitle = this.container.querySelector("#story-proto-title");
    }

    setScenario(scenario) {
      this.stop();
      this.currentScenarioId = scenario ? scenario.id : null;

      if (this.prototypeNotice) {
        if (scenario && scenario.id !== "bread") {
          this.prototypeNotice.removeAttribute("hidden");
          if (this.protoTitle) {
            this.protoTitle.textContent = `「${scenario.title}」 카드를 선택하셨습니다 (현재 '빵 구매' 시안 우선 구현)`;
          }
        } else {
          this.prototypeNotice.setAttribute("hidden", "");
        }
      }

      this.renderIdleScene();
    }

    renderIdleScene() {
      const r = this.svgRefs;
      if (!r) return;

      this.stepPills.forEach((pill) => pill.classList.remove("is-active", "is-done"));

      r.ovenFireGlow.setAttribute("opacity", "0.35");
      r.ovenBreadInside.setAttribute("opacity", "0");
      r.propDoughStation.setAttribute("opacity", "0");
      r.freshBreadDisplay.setAttribute("opacity", "0.55");
      r.breadSteam.setAttribute("opacity", "0");
      r.registerSparkles.setAttribute("opacity", "0");
      r.charHousehold.setAttribute("transform", "translate(468, 260)");
      r.householdBakerHat.setAttribute("opacity", "1");
      r.householdBakerApron.setAttribute("opacity", "1");
      r.propPayEnvelope.setAttribute("opacity", "0");
      r.propBreadBag.setAttribute("opacity", "0");
      r.propPaymentCoins.setAttribute("opacity", "0");
      r.speechBubble.setAttribute("opacity", "0");

      if (this.captionBar) {
        this.captionBar.setAttribute("data-flow-type", "idle");
        this.captionBadge.textContent = "준비 완료 · ▶ 거래 실행을 눌러보세요";
        this.captionStepIndicator.textContent = "총 4단계 연속 순환";
        this.captionText.innerHTML =
          "우측 하단 <b>▶ 거래 실행</b> 버튼(또는 상단 ①~④ 단계 버튼)을 누르면 <b>빵집 이야기 애니메이션</b>과 오른쪽 <b>경제 순환 모형</b>이 타이밍에 맞춰 함께 움직입니다.";
      }
    }

    /**
     * Plays all 4 stages sequentially from Stage 0 to Stage 3.
     */
    playFullStory(onComplete) {
      this.stop();
      this.isPlaying = true;
      this.runStageSequence(0, true, onComplete);
    }

    /**
     * Plays from a clicked stage pill.
     */
    playSingleStageOrFrom(stageIndex) {
      this.stop();
      this.isPlaying = true;
      this.runStageSequence(stageIndex, true);
    }

    /**
     * Deterministically renders a specific stage at normalized progress u in [0, 1].
     */
    previewStageAt(stageIndex, u) {
      this.stop();
      const stage = BAKERY_STORY_STAGES[stageIndex];
      if (!stage) return;
      this.currentStageIndex = stageIndex;
      this.stageSubProgress = u;
      this.applyStageHeaderAndSpeech(stage);
      this.renderStageFrame(stage, u);
      if (this.diagram) {
        this.diagram.renderCustomFlowStep({
          completedSegments: stage.completedSegments,
          completedLabelIds: stage.completedLabelIds,
          activeSegments: stage.activeSegments,
          activeLabelIds: stage.activeLabelIds,
          flowType: stage.flowType,
          iconType: stage.iconType,
          viaMarket: stage.viaMarket,
          u
        });
      }
    }

    runStageSequence(stageIndex, continueToNext, onComplete) {
      if (stageIndex < 0 || stageIndex >= BAKERY_STORY_STAGES.length) {
        this.isPlaying = false;
        this.finishAllStages();
        if (typeof onComplete === "function") onComplete();
        return;
      }

      const stage = BAKERY_STORY_STAGES[stageIndex];
      this.currentStageIndex = stageIndex;
      this.applyStageHeaderAndSpeech(stage);

      const startTime = performance.now();

      const tick = (now) => {
        if (!this.isPlaying) return;

        const elapsed = now - startTime;
        const u = Math.min(1, Math.max(0, elapsed / STAGE_DURATION_MS));
        this.stageSubProgress = u;

        this.renderStageFrame(stage, u);

        // Drive synchronized Circular Flow Diagram on the right
        if (this.diagram) {
          this.diagram.renderCustomFlowStep({
            completedSegments: stage.completedSegments,
            completedLabelIds: stage.completedLabelIds,
            activeSegments: stage.activeSegments,
            activeLabelIds: stage.activeLabelIds,
            flowType: stage.flowType,
            iconType: stage.iconType,
            viaMarket: stage.viaMarket,
            u
          });
        }

        if (u < 1) {
          this.rafId = requestAnimationFrame(tick);
        } else {
          this.rafId = null;
          if (continueToNext && stageIndex + 1 < BAKERY_STORY_STAGES.length) {
            this.pauseTimerId = setTimeout(() => {
              this.pauseTimerId = null;
              this.runStageSequence(stageIndex + 1, true, onComplete);
            }, STAGE_PAUSE_MS);
          } else {
            this.isPlaying = false;
            this.finishAllStages();
            if (typeof onComplete === "function") onComplete();
          }
        }
      };

      this.rafId = requestAnimationFrame(tick);
    }

    applyStageHeaderAndSpeech(stage) {
      this.stepPills.forEach((pill, idx) => {
        pill.classList.toggle("is-active", idx === stage.index);
        pill.classList.toggle("is-done", idx < stage.index);
      });

      if (this.captionBar) {
        this.captionBar.setAttribute("data-flow-type", stage.flowType);
        this.captionBadge.textContent = stage.marketBadge;
        this.captionStepIndicator.textContent = `${stage.index + 1} / 4 단계`;
        this.captionText.textContent = stage.narration;
      }

      // Speak narration if TTS toggle is enabled
      if (this.ttsEnabled && "speechSynthesis" in global) {
        try {
          global.speechSynthesis.cancel();
          const utter = new SpeechSynthesisUtterance(stage.narration);
          utter.lang = "ko-KR";
          utter.rate = 1.05;
          global.speechSynthesis.speak(utter);
        } catch (e) {}
      }
    }

    renderStageFrame(stage, u) {
      const r = this.svgRefs;
      if (!r) return;

      // Update Speech Bubble (Warm storybook style)
      r.speechBubble.setAttribute("opacity", u < 0.92 ? "1" : "0");
      r.speechBubbleText.textContent = stage.speechBubble;

      if (stage.speechSide === "firm") {
        r.speechBubble.setAttribute("transform", "translate(238, 126)");
        r.speechBubbleTail.setAttribute("points", "-22,19 -34,34 -8,19");
      } else {
        r.speechBubble.setAttribute("transform", "translate(390, 126)");
        r.speechBubbleTail.setAttribute("points", "22,19 34,34 8,19");
      }

      // Reset all handheld props first
      r.propPayEnvelope.setAttribute("opacity", "0");
      r.propBreadBag.setAttribute("opacity", "0");
      r.propPaymentCoins.setAttribute("opacity", "0");
      r.registerSparkles.setAttribute("opacity", "0");

      const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
      const eu = ease(u);

      if (stage.id === "stage_labor") {
        // Stage 1: Baker walks to the counter kneading station, rolls dough, and bakes bread in the oven
        r.householdBakerHat.setAttribute("opacity", "1");
        r.householdBakerApron.setAttribute("opacity", "1");

        const walkX = 468 - Math.min(1, u * 2.2) * 92;
        const bobY = 260 + Math.sin(u * Math.PI * 10) * 3.5;
        r.charHousehold.setAttribute("transform", `translate(${walkX.toFixed(1)}, ${bobY.toFixed(1)})`);
        r.householdArmLeft.setAttribute(
          "transform",
          `translate(-24, 18) rotate(${(Math.sin(u * Math.PI * 12) * 24).toFixed(1)})`
        );

        r.propDoughStation.setAttribute("opacity", "1");
        const doughScaleY = 1 + Math.sin(u * Math.PI * 12) * 0.18;
        const pinShiftX = Math.sin(u * Math.PI * 12) * 8;
        r.doughMound.setAttribute("transform", `scale(1, ${doughScaleY.toFixed(2)})`);
        if (r.rollingPin) {
          r.rollingPin.setAttribute("transform", `translate(${pinShiftX.toFixed(1)}, -4)`);
        }

        r.ovenFireGlow.setAttribute("opacity", (0.45 + 0.45 * Math.sin(u * Math.PI * 8)).toFixed(2));
        r.ovenBreadInside.setAttribute("opacity", u > 0.35 ? "1" : "0");
      } else if (stage.id === "stage_wage") {
        // Stage 2: Bakery owner hands the paycheck envelope across the counter to the baker
        r.householdBakerHat.setAttribute("opacity", "1");
        r.householdBakerApron.setAttribute("opacity", "1");
        r.propDoughStation.setAttribute("opacity", "0");
        r.ovenFireGlow.setAttribute("opacity", "0.85");
        r.ovenBreadInside.setAttribute("opacity", "1");

        const standX = 376 + Math.min(1, u * 1.8) * 58;
        r.charHousehold.setAttribute("transform", `translate(${standX.toFixed(1)}, 260)`);
        r.firmArmRight.setAttribute(
          "transform",
          `translate(24, 18) rotate(${(-24 * Math.sin(u * Math.PI)).toFixed(1)})`
        );
        r.householdArmLeft.setAttribute(
          "transform",
          `translate(-24, 18) rotate(${(20 * Math.sin(u * Math.PI)).toFixed(1)})`
        );

        // Pay envelope moves smoothly from owner's hand (268, 282) to baker's hand (388, 282)
        const envX = 268 + eu * 120;
        const envY = 282 - Math.sin(eu * Math.PI) * 18;
        r.propPayEnvelope.setAttribute("transform", `translate(${envX.toFixed(1)}, ${envY.toFixed(1)})`);
        r.propPayEnvelope.setAttribute("opacity", "1");
      } else if (stage.id === "stage_bread") {
        // Stage 3: Bakery owner hands a warm paper bag of freshly baked bread to the customer
        r.householdBakerHat.setAttribute("opacity", "0");
        r.householdBakerApron.setAttribute("opacity", "0");
        r.propDoughStation.setAttribute("opacity", "0");
        r.ovenBreadInside.setAttribute("opacity", "0");
        r.freshBreadDisplay.setAttribute("opacity", "1");
        r.breadSteam.setAttribute("opacity", "0.95");

        const custX = 456 - Math.sin(u * Math.PI) * 32;
        r.charHousehold.setAttribute("transform", `translate(${custX.toFixed(1)}, 260)`);
        r.firmArmRight.setAttribute(
          "transform",
          `translate(24, 18) rotate(${(-22 * Math.sin(u * Math.PI)).toFixed(1)})`
        );
        r.householdArmLeft.setAttribute(
          "transform",
          `translate(-24, 18) rotate(${(22 * Math.sin(u * Math.PI)).toFixed(1)})`
        );

        // Paper bread bag moves smoothly from owner's hand (268, 278) to customer's hand (392, 278)
        const bagX = 268 + eu * 124;
        const bagY = 278 - Math.sin(eu * Math.PI) * 18;
        r.propBreadBag.setAttribute("transform", `translate(${bagX.toFixed(1)}, ${bagY.toFixed(1)})`);
        r.propBreadBag.setAttribute("opacity", "1");
      } else if (stage.id === "stage_payment") {
        // Stage 4: Customer holds bread bag and hands coins/banknote across the counter to the cash register
        r.householdBakerHat.setAttribute("opacity", "0");
        r.householdBakerApron.setAttribute("opacity", "0");
        r.freshBreadDisplay.setAttribute("opacity", "1");
        r.breadSteam.setAttribute("opacity", "0.95");
        r.charHousehold.setAttribute("transform", "translate(436, 260)");

        // Customer keeps the bread bag tucked in their right arm
        r.propBreadBag.setAttribute("transform", "translate(466, 296) scale(0.85)");
        r.propBreadBag.setAttribute("opacity", "1");

        // Coins/banknote move from customer's hand (392, 282) to cash register (304, 286)
        const payX = 392 - eu * 88;
        const payY = 282 - Math.sin(eu * Math.PI) * 18;
        r.propPaymentCoins.setAttribute("transform", `translate(${payX.toFixed(1)}, ${payY.toFixed(1)})`);
        r.propPaymentCoins.setAttribute("opacity", u < 0.92 ? "1" : "0");

        if (u > 0.55) {
          r.registerSparkles.setAttribute("opacity", "1");
        }
      }
    }

    finishAllStages() {
      const r = this.svgRefs;
      if (r) {
        r.propPayEnvelope.setAttribute("opacity", "0");
        r.propPaymentCoins.setAttribute("opacity", "0");
        r.propBreadBag.setAttribute("transform", "translate(466, 296) scale(0.85)");
        r.propBreadBag.setAttribute("opacity", "1");
        r.speechBubble.setAttribute("opacity", "0");
        r.registerSparkles.setAttribute("opacity", "1");
      }

      this.stepPills.forEach((pill) => {
        pill.classList.remove("is-active");
        pill.classList.add("is-done");
      });

      if (this.captionBar) {
        this.captionBar.setAttribute("data-flow-type", "completed");
        this.captionBadge.textContent = "순환 완성! · 생산 요소 시장 ↔ 생산물 시장";
        this.captionStepIndicator.textContent = "4단계 완료";
        this.captionText.innerHTML =
          "<b>순환 완성!</b> 제빵사로 일해 받은 <b>월급(가계 소득)</b>으로 빵을 사고(<b>가계 지출</b>), 빵집은 <b>기업 수입</b>으로 다시 월급을 주며 경제 활동이 끊임없이 순환합니다.";
      }

      // Keep all 8 segments and 8 bakery-related labels lit on the right circular diagram
      if (this.diagram) {
        this.diagram.renderCustomFlowStep({
          completedSegments: [
            "factor_real_1",
            "factor_real_2",
            "factor_money_1",
            "factor_money_2",
            "prod_real_1",
            "prod_real_2",
            "prod_money_1",
            "prod_money_2"
          ],
          completedLabelIds: [
            "labor_supply",
            "labor_purchase",
            "factor_payment",
            "household_income",
            "goods_sale",
            "goods_purchase",
            "household_expenditure",
            "firm_revenue"
          ]
        });
      }
    }

    stop() {
      this.isPlaying = false;
      if (this.rafId !== null) {
        cancelAnimationFrame(this.rafId);
        this.rafId = null;
      }
      if (this.pauseTimerId !== null) {
        clearTimeout(this.pauseTimerId);
        this.pauseTimerId = null;
      }
      if ("speechSynthesis" in global) {
        try {
          global.speechSynthesis.cancel();
        } catch (e) {}
      }
    }
  }

  global.StoryAnimator = StoryAnimator;
})(window);
