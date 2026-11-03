(function (global) {
  "use strict";

  const STAGE_DURATION_MS = 3500;
  const STAGE_PAUSE_MS = 500;

  /**
   * 4 Synchronized Stages for the "빵 구매 (베이커리 이야기)" Full Circular Flow Story:
   * Connects Factor Market (Labor -> Wage) and Product Market (Bread -> Payment) into one complete loop.
   */
  const BAKERY_STORY_STAGES = [
    {
      index: 0,
      id: "stage_labor",
      shortTitle: "① 출근·제빵 (노동)",
      marketBadge: "생산 요소 시장 · 실물의 흐름",
      flowType: "real",
      narration: "가계(제빵사)가 빵집(기업)에 출근해 반죽을 치대고 빵을 구우며 노동을 제공합니다.",
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
      shortTitle: "② 월급 지급 (소득)",
      marketBadge: "생산 요소 시장 · 화폐의 흐름",
      flowType: "money",
      narration: "빵집(기업)은 일한 대가로 제빵사(가계)에게 임금(월급)을 지급하고, 이는 가계 소득이 됩니다.",
      speechBubble: "일한 대가로 월급(임금)을 드립니다!",
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
      shortTitle: "③ 빵 판매·구매 (재화)",
      marketBadge: "생산물 시장 · 실물의 흐름",
      flowType: "real",
      narration: "빵집(기업)이 갓 구운 따뜻한 빵을 진열해 판매하고, 손님(가계)이 빵을 구매합니다.",
      speechBubble: "갓 구운 고소한 빵 나왔습니다!",
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
      shortTitle: "④ 빵값 결제 (지출·수입)",
      marketBadge: "생산물 시장 · 화폐의 흐름",
      flowType: "money",
      narration: "손님(가계)이 소득으로 빵값을 지불(가계 지출)하면, 빵집의 기업 수입이 되어 다시 순환합니다.",
      speechBubble: "월급으로 받은 돈으로 맛있는 빵을 사요!",
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
              <span class="story-mode-chip">실제 경제 활동</span>
              <h3 class="story-scene-heading" id="story-scene-heading">빵집으로 보는 경제 활동의 순환</h3>
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

          <!-- Center 2D Vector Illustration Stage (100% Original Custom SVG) -->
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
              <span class="story-caption-badge" id="story-caption-badge">대기 중 · ▶ 거래 실행을 눌러보세요</span>
              <span class="story-caption-step-indicator" id="story-caption-step-indicator">4단계 연동 애니메이션</span>
            </div>
            <p class="story-caption-text" id="story-caption-text">
              오른쪽에서 <b>▶ 거래 실행</b>을 누르면 제빵사의 출근·월급부터 빵 판매·구매까지 실제 경제 활동과 순환 모형이 함께 움직입니다.
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
        <svg id="bakery-story-svg" class="bakery-story-svg" viewBox="0 0 560 520" preserveAspectRatio="xMidYMid slice">
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
          <rect x="-20" y="-20" width="600" height="320" fill="url(#wall-grad)"/>
          <rect x="-20" y="285" width="600" height="75" fill="url(#wainscot-grad)"/>
          <line x1="-20" y1="285" x2="580" y2="285" stroke="#D97706" stroke-width="3" stroke-opacity="0.45"/>
          <!-- Wainscoting vertical wood lines -->
          <g stroke="#D97706" stroke-width="1.5" stroke-opacity="0.22">
            <line x1="40" y1="285" x2="40" y2="360"/>
            <line x1="90" y1="285" x2="90" y2="360"/>
            <line x1="140" y1="285" x2="140" y2="360"/>
            <line x1="190" y1="285" x2="190" y2="360"/>
            <line x1="240" y1="285" x2="240" y2="360"/>
            <line x1="290" y1="285" x2="290" y2="360"/>
            <line x1="340" y1="285" x2="340" y2="360"/>
            <line x1="390" y1="285" x2="390" y2="360"/>
            <line x1="440" y1="285" x2="440" y2="360"/>
            <line x1="490" y1="285" x2="490" y2="360"/>
            <line x1="540" y1="285" x2="540" y2="360"/>
          </g>

          <!-- Bakery Floor -->
          <rect x="-20" y="360" width="600" height="180" fill="url(#floor-grad)"/>
          <line x1="-20" y1="360" x2="580" y2="360" stroke="#B45309" stroke-width="3" stroke-opacity="0.5"/>
          <!-- Subtle Floor Tile Perspective Lines -->
          <g stroke="#C2A378" stroke-width="1.5" opacity="0.4">
            <line x1="-20" y1="405" x2="580" y2="405"/>
            <line x1="-20" y1="455" x2="580" y2="455"/>
            <line x1="-20" y1="505" x2="580" y2="505"/>
            <line x1="90" y1="360" x2="30" y2="540"/>
            <line x1="210" y1="360" x2="175" y2="540"/>
            <line x1="330" y1="360" x2="330" y2="540"/>
            <line x1="450" y1="360" x2="495" y2="540"/>
          </g>

          <!-- Ceiling Warm Pendant Lamps -->
          <g transform="translate(175, 0)">
            <ellipse cx="0" cy="80" rx="55" ry="42" fill="url(#lamp-glow-grad)"/>
            <line x1="0" y1="-10" x2="0" y2="48" stroke="#78350F" stroke-width="2.5"/>
            <path d="M -22 58 C -22 42, 22 42, 22 58 Z" fill="#D97706" stroke="#451A03" stroke-width="2.2"/>
            <circle cx="0" cy="60" r="6" fill="#FEF08A"/>
          </g>
          <g transform="translate(395, 0)">
            <ellipse cx="0" cy="80" rx="55" ry="42" fill="url(#lamp-glow-grad)"/>
            <line x1="0" y1="-10" x2="0" y2="48" stroke="#78350F" stroke-width="2.5"/>
            <path d="M -22 58 C -22 42, 22 42, 22 58 Z" fill="#D97706" stroke="#451A03" stroke-width="2.2"/>
            <circle cx="0" cy="60" r="6" fill="#FEF08A"/>
          </g>

          <!-- Bakery Street Window & Greenery (Center-Right Wall) -->
          <g transform="translate(216, 72)">
            <rect x="0" y="0" width="144" height="118" rx="10" fill="url(#sky-grad)" stroke="#92400E" stroke-width="4.5"/>
            <!-- Outdoor Bush & Sunlit Clouds -->
            <circle cx="32" cy="96" r="24" fill="#86EFAC"/>
            <circle cx="64" cy="102" r="22" fill="#4ADE80"/>
            <circle cx="112" cy="98" r="25" fill="#86EFAC"/>
            <g id="bg-clouds" transform="translate(16, 26)">
              <circle cx="16" cy="14" r="10" fill="#FFFFFF" opacity="0.92"/>
              <circle cx="28" cy="11" r="13" fill="#FFFFFF" opacity="0.92"/>
              <circle cx="40" cy="15" r="9" fill="#FFFFFF" opacity="0.92"/>
              <circle cx="88" cy="24" r="9" fill="#FFFFFF" opacity="0.88"/>
              <circle cx="100" cy="21" r="12" fill="#FFFFFF" opacity="0.88"/>
            </g>
            <!-- Window Mullions -->
            <line x1="72" y1="0" x2="72" y2="118" stroke="#92400E" stroke-width="3.2"/>
            <line x1="0" y1="59" x2="144" y2="59" stroke="#92400E" stroke-width="3.2"/>
            <!-- Window Sill -->
            <rect x="-8" y="114" width="160" height="10" rx="4" fill="#B45309" stroke="#451A03" stroke-width="2.2"/>
            <!-- Striped Bakery Awning -->
            <path d="M -10 -4 L 154 -4 L 162 24 L -18 24 Z" fill="#EA580C" stroke="#451A03" stroke-width="2.6" stroke-linejoin="round"/>
            <path d="M 16 -4 L 12 24 M 44 -4 L 42 24 M 72 -4 L 72 24 M 100 -4 L 102 24 M 128 -4 L 132 24" stroke="#FFFBEB" stroke-width="11" stroke-linecap="butt" opacity="0.88"/>
            <path d="M -10 -4 L 154 -4 L 162 24 L -18 24 Z" fill="none" stroke="#451A03" stroke-width="2.6" stroke-linejoin="round"/>
          </g>

          <!-- Wall Bread & Jam Shelf (Right Background) -->
          <g transform="translate(372, 96)">
            <!-- Upper Shelf -->
            <rect x="0" y="28" width="136" height="8" rx="3" fill="#92400E" stroke="#451A03" stroke-width="2"/>
            <ellipse cx="32" cy="20" rx="18" ry="9" fill="#F59E0B" stroke="#451A03" stroke-width="2"/>
            <path d="M 24 16 L 27 23 M 32 15 L 35 23 M 40 16 L 43 23" stroke="#78350F" stroke-width="1.6" stroke-linecap="round"/>
            <ellipse cx="76" cy="20" rx="18" ry="9" fill="#D97706" stroke="#451A03" stroke-width="2"/>
            <rect x="104" y="6" width="18" height="22" rx="4" fill="#F43F5E" stroke="#451A03" stroke-width="2"/>
            <rect x="102" y="2" width="22" height="6" rx="2" fill="#FEF08A" stroke="#451A03" stroke-width="1.8"/>
            <!-- Lower Shelf -->
            <rect x="0" y="76" width="136" height="8" rx="3" fill="#92400E" stroke="#451A03" stroke-width="2"/>
            <!-- Baguettes in Basket -->
            <path d="M 18 52 L 32 74 M 28 50 L 42 74" stroke="#F59E0B" stroke-width="9" stroke-linecap="round"/>
            <path d="M 18 52 L 32 74 M 28 50 L 42 74" stroke="#451A03" stroke-width="2" stroke-linecap="round"/>
            <rect x="14" y="60" width="38" height="16" rx="4" fill="#B45309" stroke="#451A03" stroke-width="2"/>
            <!-- Menu Board -->
            <rect x="68" y="42" width="56" height="34" rx="5" fill="#1E293B" stroke="#92400E" stroke-width="2.5"/>
            <text x="96" y="55" font-family="var(--font-sans)" font-size="9.5" font-weight="800" fill="#FEF08A" text-anchor="middle">TODAY BREAD</text>
            <text x="96" y="68" font-family="var(--font-sans)" font-size="8.5" font-weight="700" fill="#FFFFFF" text-anchor="middle">식빵 · 바게트</text>
          </g>

          <!-- Top Role Zone Headers: 기업 (동아 베이커리) vs 가계 (제빵사·손님) -->
          <g id="zone-badge-firm" transform="translate(142, 28)" filter="url(#soft-shadow)">
            <rect id="zone-rect-firm" x="-88" y="-17" width="176" height="34" rx="17" fill="#FFFFFF" stroke="#94A3B8" stroke-width="2.4"/>
            <circle cx="-66" cy="0" r="6" fill="#2563EB"/>
            <text x="6" y="1" font-family="var(--font-sans)" font-size="14.5" font-weight="800" fill="#0F172A" text-anchor="middle" dominant-baseline="central">기업 (동아 베이커리)</text>
          </g>

          <g id="zone-badge-household" transform="translate(418, 28)" filter="url(#soft-shadow)">
            <rect id="zone-rect-household" x="-88" y="-17" width="176" height="34" rx="17" fill="#FFFFFF" stroke="#94A3B8" stroke-width="2.4"/>
            <circle cx="-68" cy="0" r="6" fill="#10B981"/>
            <text id="zone-text-household" x="6" y="1" font-family="var(--font-sans)" font-size="14.5" font-weight="800" fill="#0F172A" text-anchor="middle" dominant-baseline="central">가계 (제빵사 · 손님)</text>
          </g>

          <!-- LEFT SIDE: Brick Oven (기업 생산 설비 - 자본재) -->
          <g id="bakery-oven-group" transform="translate(36, 122)">
            <!-- Chimney -->
            <rect x="38" y="-36" width="38" height="56" fill="#92400E" stroke="#451A03" stroke-width="2.8"/>
            <line x1="38" y1="-16" x2="76" y2="-16" stroke="#451A03" stroke-width="2" opacity="0.5"/>
            <!-- Brick Oven Dome & Body -->
            <path d="M 0 238 L 0 58 C 0 12, 114 12, 114 58 L 114 238 Z" fill="#B45309" stroke="#451A03" stroke-width="3"/>
            <!-- Brick Texture Accents -->
            <g fill="#92400E" opacity="0.55">
              <rect x="12" y="64" width="22" height="9" rx="2"/>
              <rect x="80" y="64" width="22" height="9" rx="2"/>
              <rect x="8" y="156" width="24" height="9" rx="2"/>
              <rect x="44" y="166" width="26" height="9" rx="2"/>
              <rect x="82" y="156" width="24" height="9" rx="2"/>
            </g>
            <rect x="-6" y="232" width="126" height="14" rx="4" fill="#78350F" stroke="#451A03" stroke-width="2.6"/>
            <!-- Oven Arch Mouth -->
            <path d="M 18 148 L 18 94 C 18 66, 96 66, 96 94 L 96 148 Z" fill="#1E293B" stroke="#451A03" stroke-width="3"/>
            <!-- Animated Oven Fire Glow -->
            <g id="oven-fire-glow" opacity="0.3">
              <ellipse cx="57" cy="128" rx="34" ry="24" fill="url(#oven-fire-grad)"/>
              <path d="M 38 144 Q 47 110 57 134 Q 67 106 76 144 Z" fill="#F97316"/>
              <path d="M 46 144 Q 57 116 68 144 Z" fill="#FEF08A"/>
            </g>
            <!-- Baking Bread Inside Oven -->
            <g id="oven-bread-inside" transform="translate(57, 132)" opacity="0">
              <ellipse cx="0" cy="0" rx="22" ry="11" fill="#F59E0B" stroke="#451A03" stroke-width="2.2"/>
              <path d="M -9 -4 L -6 4 M 0 -5 L 2 4 M 9 -4 L 11 4" stroke="#78350F" stroke-width="1.8" stroke-linecap="round"/>
            </g>
            <!-- Oven Status Sign -->
            <rect x="20" y="34" width="74" height="22" rx="7" fill="#FEF3C7" stroke="#451A03" stroke-width="2"/>
            <text id="oven-status-text" x="57" y="45" font-family="var(--font-sans)" font-size="11.5" font-weight="800" fill="#78350F" text-anchor="middle" dominant-baseline="central">제빵 오븐</text>
          </g>

          <!-- FIRM CHARACTER: Bakery Owner / Chef (기업 대표) -->
          <g id="char-firm" transform="translate(182, 268)">
            <!-- Ground Shadow -->
            <ellipse cx="0" cy="148" rx="40" ry="10" fill="#78350F" opacity="0.18"/>
            <!-- Legs & Shoes -->
            <rect x="-18" y="88" width="13" height="52" rx="6" fill="#1E3A8A" stroke="#1E293B" stroke-width="2.4"/>
            <rect x="5" y="88" width="13" height="52" rx="6" fill="#1E3A8A" stroke="#1E293B" stroke-width="2.4"/>
            <ellipse cx="-12" cy="142" rx="11" ry="6" fill="#451A03" stroke="#1E293B" stroke-width="2.2"/>
            <ellipse cx="12" cy="142" rx="11" ry="6" fill="#451A03" stroke="#1E293B" stroke-width="2.2"/>
            <!-- Left Arm (resting by counter) -->
            <path d="M -24 14 Q -38 36 -28 56" fill="none" stroke="#3B82F6" stroke-width="13" stroke-linecap="round"/>
            <path d="M -24 14 Q -38 36 -28 56" fill="none" stroke="#1E293B" stroke-width="2.4" stroke-linecap="round"/>
            <circle cx="-28" cy="58" r="7" fill="#FDE68A" stroke="#1E293B" stroke-width="2.2"/>
            <!-- Torso & Double-Breasted Baker Jacket + Apron -->
            <rect x="-28" y="4" width="56" height="88" rx="16" fill="#3B82F6" stroke="#1E293B" stroke-width="2.6"/>
            <path d="M -20 8 L 20 8 L 24 92 L -24 92 Z" fill="#FFFFFF" stroke="#1E293B" stroke-width="2.4" stroke-linejoin="round"/>
            <!-- Red Chef Neckerchief -->
            <path d="M -14 4 L 14 4 L 0 20 Z" fill="#EF4444" stroke="#1E293B" stroke-width="2"/>
            <rect x="-14" y="32" width="28" height="16" rx="4" fill="#DBEAFE" stroke="#1E293B" stroke-width="2"/>
            <!-- Neck & Ears -->
            <rect x="-8" y="-8" width="16" height="16" rx="5" fill="#FCD34D" stroke="#1E293B" stroke-width="2.2"/>
            <circle cx="-27" cy="-24" r="6" fill="#FDE68A" stroke="#1E293B" stroke-width="2.2"/>
            <circle cx="27" cy="-24" r="6" fill="#FDE68A" stroke="#1E293B" stroke-width="2.2"/>
            <!-- Head -->
            <circle cx="0" cy="-26" r="26" fill="#FDE68A" stroke="#1E293B" stroke-width="2.6"/>
            <!-- Warm Hair Bangs -->
            <path d="M -25 -30 C -22 -52, 22 -52, 25 -30 C 16 -40, -16 -40, -25 -30 Z" fill="#78350F" stroke="#1E293B" stroke-width="2.2"/>
            <!-- Tall Baker Toque Hat -->
            <path d="M -24 -48 C -34 -72, -10 -86, 0 -80 C 10 -86, 34 -72, 24 -48 Z" fill="#FFFFFF" stroke="#1E293B" stroke-width="2.6"/>
            <rect x="-22" y="-52" width="44" height="11" rx="3.5" fill="#FFFFFF" stroke="#1E293B" stroke-width="2.4"/>
            <!-- Friendly Face (Eyebrows, Eyes, Cheeks, Smile) -->
            <path d="M -13 -32 Q -9 -35 -5 -32 M 5 -32 Q 9 -35 13 -32" fill="none" stroke="#451A03" stroke-width="2.2" stroke-linecap="round"/>
            <circle cx="-9" cy="-25" r="3" fill="#1E293B"/>
            <circle cx="9" cy="-25" r="3" fill="#1E293B"/>
            <circle cx="-10" cy="-26" r="1" fill="#FFFFFF"/>
            <circle cx="8" cy="-26" r="1" fill="#FFFFFF"/>
            <ellipse cx="-15" cy="-18" rx="4.5" ry="3" fill="#FDA4AF" opacity="0.7"/>
            <ellipse cx="15" cy="-18" rx="4.5" ry="3" fill="#FDA4AF" opacity="0.7"/>
            <path d="M -7 -15 Q 0 -8 7 -15" fill="none" stroke="#1E293B" stroke-width="2.5" stroke-linecap="round"/>
            <!-- Animated Right Arm (handing wage or bread) -->
            <g id="firm-arm-right" transform="translate(24, 18) rotate(0)">
              <path d="M 0 0 L 28 14" stroke="#3B82F6" stroke-width="13" stroke-linecap="round"/>
              <path d="M 0 0 L 28 14" stroke="#1E293B" stroke-width="2.5" stroke-linecap="round"/>
              <circle cx="30" cy="15" r="7" fill="#FDE68A" stroke="#1E293B" stroke-width="2.2"/>
            </g>
          </g>

          <!-- Bakery Counter & Glass Showcase (Foreground Left-Center) -->
          <g id="bakery-counter" transform="translate(96, 336)">
            <ellipse cx="102" cy="106" rx="112" ry="12" fill="#78350F" opacity="0.18"/>
            <!-- Counter Wooden Body -->
            <rect x="0" y="0" width="204" height="102" rx="10" fill="#D97706" stroke="#451A03" stroke-width="3"/>
            <rect x="10" y="12" width="184" height="78" rx="6" fill="#F59E0B" stroke="#78350F" stroke-width="2.2"/>
            <!-- Marble Counter Top -->
            <rect x="-8" y="-8" width="220" height="14" rx="6" fill="#FFFBEB" stroke="#451A03" stroke-width="2.8"/>

            <!-- Dough Kneading Station (Visible during Stage 1) -->
            <g id="prop-dough-station" transform="translate(58, -20)" opacity="0">
              <ellipse cx="0" cy="8" rx="30" ry="10" fill="#FDE68A" stroke="#78350F" stroke-width="2.4"/>
              <path id="dough-mound" d="M -22 6 C -22 -16, 22 -16, 22 6 Z" fill="#FEF9C3" stroke="#CA8A04" stroke-width="2.4"/>
              <!-- Rolling Pin -->
              <rect x="-26" y="-8" width="52" height="8" rx="4" fill="#B45309" stroke="#451A03" stroke-width="2"/>
              <circle id="flour-puff-1" cx="-26" cy="-12" r="4.5" fill="#FFFFFF" opacity="0.9"/>
              <circle id="flour-puff-2" cx="28" cy="-14" r="5.5" fill="#FFFFFF" opacity="0.9"/>
            </g>

            <!-- Fresh Baked Bread Glass Showcase (Lights up in Stages 3 & 4) -->
            <g id="fresh-bread-display" transform="translate(60, -32)" opacity="0.45">
              <rect x="-42" y="-14" width="84" height="38" rx="7" fill="#E0F2FE" fill-opacity="0.65" stroke="#0284C7" stroke-width="2.4"/>
              <line x1="-42" y1="6" x2="42" y2="6" stroke="#0284C7" stroke-width="1.6" stroke-opacity="0.5"/>
              <!-- Golden Loaves & Croissants -->
              <ellipse cx="-18" cy="14" rx="15" ry="8.5" fill="#F59E0B" stroke="#451A03" stroke-width="2"/>
              <path d="M -23 11 L -20 17 M -17 10 L -14 17" stroke="#78350F" stroke-width="1.6" stroke-linecap="round"/>
              <ellipse cx="18" cy="14" rx="15" ry="8.5" fill="#F59E0B" stroke="#451A03" stroke-width="2"/>
              <path d="M 13 11 L 16 17 M 19 10 L 22 17" stroke="#78350F" stroke-width="1.6" stroke-linecap="round"/>
              <!-- Rising Steam Waves -->
              <path id="bread-steam" d="M -18 -2 Q -22 -12 -15 -20 M 18 -2 Q 14 -12 21 -20" fill="none" stroke="#F97316" stroke-width="2.5" stroke-linecap="round" opacity="0"/>
            </g>

            <!-- Cash Register (기업 수입 금고) -->
            <g id="cash-register" transform="translate(158, -26)">
              <rect x="-26" y="0" width="52" height="20" rx="4" fill="#475569" stroke="#1E293B" stroke-width="2.4"/>
              <rect x="-20" y="-16" width="40" height="18" rx="3.5" fill="#64748B" stroke="#1E293B" stroke-width="2.2"/>
              <rect x="-14" y="-12" width="28" height="10" rx="2" fill="#DCFCE7"/>
              <text x="0" y="-7" font-family="var(--font-sans)" font-size="8.5" font-weight="800" fill="#15803D" text-anchor="middle" dominant-baseline="central">POS</text>
              <!-- Pop-up Revenue Badge -->
              <g id="register-popup" transform="translate(0, -32)" opacity="0">
                <rect x="-38" y="-13" width="76" height="24" rx="12" fill="#F54380" stroke="#FFFFFF" stroke-width="2.2"/>
                <text x="0" y="-1" font-family="var(--font-sans)" font-size="12" font-weight="800" fill="#FFFFFF" text-anchor="middle" dominant-baseline="central">+기업 수입!</text>
              </g>
            </g>

            <!-- Counter Signboard -->
            <rect x="36" y="28" width="132" height="42" rx="10" fill="#FFFBEB" stroke="#78350F" stroke-width="2.4"/>
            <text x="102" y="49" font-family="var(--font-sans)" font-size="16" font-weight="800" fill="#78350F" text-anchor="middle" dominant-baseline="central">🍞 동아 베이커리</text>
          </g>

          <!-- HOUSEHOLD CHARACTER: Baker (Stages 1-2) / Customer (Stages 3-4) -->
          <g id="char-household" transform="translate(432, 272)">
            <!-- Ground Shadow -->
            <ellipse cx="0" cy="148" rx="40" ry="10" fill="#78350F" opacity="0.18"/>
            <!-- Legs & Shoes -->
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

            <!-- Baker Apron Overlay (Visible in Stages 1 & 2) -->
            <g id="household-baker-apron" opacity="1">
              <path d="M -19 8 L 19 8 L 23 90 L -23 90 Z" fill="#FEF3C7" stroke="#1E293B" stroke-width="2.4" stroke-linejoin="round"/>
              <rect x="-15" y="34" width="30" height="20" rx="5" fill="#FDE68A" stroke="#92400E" stroke-width="1.8"/>
              <text x="0" y="45" font-family="var(--font-sans)" font-size="11" font-weight="800" fill="#92400E" text-anchor="middle" dominant-baseline="central">제빵사</text>
            </g>

            <!-- Neck & Ears -->
            <rect x="-8" y="-8" width="16" height="16" rx="5" fill="#FCD34D" stroke="#1E293B" stroke-width="2.2"/>
            <circle cx="-27" cy="-24" r="6" fill="#FDE68A" stroke="#1E293B" stroke-width="2.2"/>
            <circle cx="27" cy="-24" r="6" fill="#FDE68A" stroke="#1E293B" stroke-width="2.2"/>

            <!-- Head & Hair -->
            <circle cx="0" cy="-26" r="26" fill="#FDE68A" stroke="#1E293B" stroke-width="2.6"/>
            <path d="M -26 -26 C -26 -54, 26 -54, 26 -26 C 18 -40, -18 -40, -26 -26 Z" fill="#451A03" stroke="#1E293B" stroke-width="2.4"/>

            <!-- Baker Hat (Visible in Stages 1 & 2 when working as baker) -->
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

            <!-- Household Wallet / Income Badge -->
            <g id="household-wallet-badge" transform="translate(36, 48)" opacity="0">
              <rect x="-38" y="-14" width="76" height="26" rx="13" fill="#F54380" stroke="#FFFFFF" stroke-width="2.2"/>
              <text id="wallet-badge-text" x="0" y="-1" font-family="var(--font-sans)" font-size="12" font-weight="800" fill="#FFFFFF" text-anchor="middle" dominant-baseline="central">+가계 소득!</text>
            </g>

            <!-- Animated Left Arm (reaching toward bakery) -->
            <g id="household-arm-left" transform="translate(-24, 18) rotate(0)">
              <path d="M 0 0 L -28 14" stroke="#10B981" stroke-width="13" stroke-linecap="round"/>
              <path d="M 0 0 L -28 14" stroke="#1E293B" stroke-width="2.5" stroke-linecap="round"/>
              <circle cx="-30" cy="15" r="7" fill="#FDE68A" stroke="#1E293B" stroke-width="2.2"/>
            </g>
          </g>

          <!-- Animated Exchange Trajectory Arc & Moving Prop Token in Center -->
          <g id="scene-transfer-layer">
            <path id="scene-transfer-arc" d="M 390 280 Q 300 205 215 280" fill="none" stroke="#1D82F5" stroke-width="4.5" stroke-dasharray="8 6" opacity="0"/>

            <!-- Moving Prop Group (Labor / Wage / Bread / Payment) -->
            <g id="scene-moving-prop" transform="translate(300, 240)" opacity="0" filter="url(#soft-shadow)">
              <circle id="scene-prop-halo" cx="0" cy="0" r="34" fill="#EFF6FF" stroke="#1D82F5" stroke-width="3.2"/>
              <g id="scene-prop-icon"></g>
              <rect id="scene-prop-tag-bg" x="-52" y="26" width="104" height="25" rx="12.5" fill="#1D82F5" stroke="#FFFFFF" stroke-width="1.8"/>
              <text id="scene-prop-tag-text" x="0" y="38.5" font-family="var(--font-sans)" font-size="13" font-weight="800" fill="#FFFFFF" text-anchor="middle" dominant-baseline="central">노동 제공</text>
            </g>
          </g>

          <!-- Speech Bubble Overlay -->
          <g id="scene-speech-bubble" transform="translate(280, 128)" opacity="0" filter="url(#soft-shadow)">
            <rect id="speech-bubble-rect" x="-136" y="-23" width="272" height="42" rx="21" fill="#FFFFFF" stroke="#2563EB" stroke-width="2.8"/>
            <polygon id="speech-bubble-tail" points="0,19 -10,33 10,19" fill="#FFFFFF" stroke="#2563EB" stroke-width="2.8" stroke-linejoin="round"/>
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
        ovenStatusText: svg.querySelector("#oven-status-text"),
        charFirm: svg.querySelector("#char-firm"),
        firmArmRight: svg.querySelector("#firm-arm-right"),
        propDoughStation: svg.querySelector("#prop-dough-station"),
        doughMound: svg.querySelector("#dough-mound"),
        freshBreadDisplay: svg.querySelector("#fresh-bread-display"),
        breadSteam: svg.querySelector("#bread-steam"),
        registerPopup: svg.querySelector("#register-popup"),
        charHousehold: svg.querySelector("#char-household"),
        householdBakerHat: svg.querySelector("#household-baker-hat"),
        householdBakerApron: svg.querySelector("#household-baker-apron"),
        householdWalletBadge: svg.querySelector("#household-wallet-badge"),
        walletBadgeText: svg.querySelector("#wallet-badge-text"),
        householdArmLeft: svg.querySelector("#household-arm-left"),
        transferArc: svg.querySelector("#scene-transfer-arc"),
        movingProp: svg.querySelector("#scene-moving-prop"),
        propHalo: svg.querySelector("#scene-prop-halo"),
        propIcon: svg.querySelector("#scene-prop-icon"),
        propTagBg: svg.querySelector("#scene-prop-tag-bg"),
        propTagText: svg.querySelector("#scene-prop-tag-text"),
        speechBubble: svg.querySelector("#scene-speech-bubble"),
        speechBubbleRect: svg.querySelector("#speech-bubble-rect"),
        speechBubbleTail: svg.querySelector("#speech-bubble-tail"),
        speechBubbleText: svg.querySelector("#speech-bubble-text"),
        zoneRectFirm: svg.querySelector("#zone-rect-firm"),
        zoneRectHousehold: svg.querySelector("#zone-rect-household"),
        zoneTextHousehold: svg.querySelector("#zone-text-household")
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

      r.ovenFireGlow.setAttribute("opacity", "0.25");
      r.ovenBreadInside.setAttribute("opacity", "0");
      r.ovenStatusText.textContent = "제빵 오븐";
      r.propDoughStation.setAttribute("opacity", "0");
      r.freshBreadDisplay.setAttribute("opacity", "0.45");
      r.breadSteam.setAttribute("opacity", "0");
      r.registerPopup.setAttribute("opacity", "0");
      r.charHousehold.setAttribute("transform", "translate(432, 272)");
      r.householdBakerHat.setAttribute("opacity", "1");
      r.householdBakerApron.setAttribute("opacity", "1");
      r.householdWalletBadge.setAttribute("opacity", "0");
      r.transferArc.setAttribute("opacity", "0");
      r.movingProp.setAttribute("opacity", "0");
      r.speechBubble.setAttribute("opacity", "0");
      r.zoneRectFirm.setAttribute("stroke", "#94A3B8");
      r.zoneRectHousehold.setAttribute("stroke", "#94A3B8");
      r.zoneTextHousehold.textContent = "가계 (제빵사 · 손님)";

      if (this.captionBar) {
        this.captionBar.setAttribute("data-flow-type", "idle");
        this.captionBadge.textContent = "준비 완료 · ▶ 거래 실행을 눌러보세요";
        this.captionStepIndicator.textContent = "총 4단계 연속 순환";
        this.captionText.innerHTML =
          "오른쪽 <b>▶ 거래 실행</b> 버튼(또는 상단 ①~④ 단계 버튼)을 누르면 <b>빵집 애니메이션</b>과 <b>경제 순환 모형</b>이 타이밍에 맞춰 함께 움직입니다.";
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

      const isReal = stage.flowType === "real";
      const accent = isReal ? "#1D82F5" : "#F54380";
      const haloBg = isReal ? "#EFF6FF" : "#FFF1F5";

      // Update Speech Bubble
      r.speechBubble.setAttribute("opacity", u < 0.92 ? "1" : "0");
      r.speechBubbleRect.setAttribute("stroke", accent);
      r.speechBubbleTail.setAttribute("stroke", accent);
      r.speechBubbleText.textContent = stage.speechBubble;

      if (stage.speechSide === "firm") {
        r.speechBubble.setAttribute("transform", "translate(212, 134)");
        r.speechBubbleTail.setAttribute("points", "-22,20 -34,36 -8,20");
      } else {
        r.speechBubble.setAttribute("transform", "translate(348, 134)");
        r.speechBubbleTail.setAttribute("points", "22,20 34,36 8,20");
      }

      // Highlight active agent badges
      r.zoneRectFirm.setAttribute("stroke", accent);
      r.zoneRectHousehold.setAttribute("stroke", accent);

      // Configure Moving Prop Icon & Tag
      if (global.CircularEconomyIcons) {
        r.propIcon.innerHTML = global.CircularEconomyIcons.getTokenSvgMarkup(stage.iconType);
      }
      r.propHalo.setAttribute("fill", haloBg);
      r.propHalo.setAttribute("stroke", accent);
      r.propTagBg.setAttribute("fill", accent);

      const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
      const eu = ease(u);

      if (stage.id === "stage_labor") {
        // Stage 1: Baker (Household) walks in & kneads dough -> Labor flows Household (Right) to Firm (Left)
        r.zoneTextHousehold.textContent = "가계 (제빵사로 출근)";
        r.householdBakerHat.setAttribute("opacity", "1");
        r.householdBakerApron.setAttribute("opacity", "1");
        r.householdWalletBadge.setAttribute("opacity", "0");
        r.registerPopup.setAttribute("opacity", "0");

        const walkX = 432 - Math.min(1, u * 2.2) * 86;
        const bobY = 272 + Math.sin(u * Math.PI * 10) * 4;
        r.charHousehold.setAttribute("transform", `translate(${walkX.toFixed(1)}, ${bobY.toFixed(1)})`);
        r.householdArmLeft.setAttribute(
          "transform",
          `translate(-24, 18) rotate(${(Math.sin(u * Math.PI * 12) * 22).toFixed(1)})`
        );

        r.propDoughStation.setAttribute("opacity", "1");
        const doughScaleY = 1 + Math.sin(u * Math.PI * 12) * 0.18;
        r.doughMound.setAttribute("transform", `scale(1, ${doughScaleY.toFixed(2)})`);

        r.ovenFireGlow.setAttribute("opacity", (0.45 + 0.45 * Math.sin(u * Math.PI * 8)).toFixed(2));
        r.ovenBreadInside.setAttribute("opacity", u > 0.45 ? "1" : "0");
        r.ovenStatusText.textContent = "🔥 빵 굽는 중!";

        // Prop trajectory: Right (392, 276) -> Left (212, 276)
        const px = 392 - eu * 180;
        const py = 276 - Math.sin(eu * Math.PI) * 58;
        r.transferArc.setAttribute("d", "M 392 276 Q 302 212 212 276");
        r.transferArc.setAttribute("stroke", accent);
        r.transferArc.setAttribute("opacity", "0.7");
        r.movingProp.setAttribute("transform", `translate(${px.toFixed(1)}, ${py.toFixed(1)})`);
        r.movingProp.setAttribute("opacity", u < 0.95 ? "1" : "0");
        r.propTagText.textContent = "노동 제공";
      } else if (stage.id === "stage_wage") {
        // Stage 2: Firm pays Wage (Coins) to Baker (Household): Left (212) -> Right (396)
        r.zoneTextHousehold.textContent = "가계 (임금·소득 수령)";
        r.householdBakerHat.setAttribute("opacity", "1");
        r.householdBakerApron.setAttribute("opacity", "1");
        r.propDoughStation.setAttribute("opacity", "0");
        r.ovenFireGlow.setAttribute("opacity", "0.85");
        r.ovenBreadInside.setAttribute("opacity", "1");
        r.ovenStatusText.textContent = "🍞 빵 완성!";

        const walkBackX = 346 + Math.min(1, u * 1.8) * 78;
        r.charHousehold.setAttribute("transform", `translate(${walkBackX.toFixed(1)}, 272)`);
        r.firmArmRight.setAttribute(
          "transform",
          `translate(24, 18) rotate(${(-25 * Math.sin(u * Math.PI)).toFixed(1)})`
        );

        const px = 212 + eu * 184;
        const py = 276 - Math.sin(eu * Math.PI) * 58;
        r.transferArc.setAttribute("d", "M 212 276 Q 304 212 396 276");
        r.transferArc.setAttribute("stroke", accent);
        r.transferArc.setAttribute("opacity", "0.7");
        r.movingProp.setAttribute("transform", `translate(${px.toFixed(1)}, ${py.toFixed(1)})`);
        r.movingProp.setAttribute("opacity", u < 0.95 ? "1" : "0");
        r.propTagText.textContent = "임금 지급";

        if (u > 0.65) {
          r.householdWalletBadge.setAttribute("opacity", "1");
          r.walletBadgeText.textContent = "+가계 소득!";
        } else {
          r.householdWalletBadge.setAttribute("opacity", "0");
        }
      } else if (stage.id === "stage_bread") {
        // Stage 3: Bakery sells Fresh Bread to Customer (Household): Left (212) -> Right (396)
        r.zoneTextHousehold.textContent = "가계 (빵 구매 손님)";
        r.householdBakerHat.setAttribute("opacity", "0");
        r.householdBakerApron.setAttribute("opacity", "0");
        r.householdWalletBadge.setAttribute("opacity", "0");
        r.propDoughStation.setAttribute("opacity", "0");
        r.ovenBreadInside.setAttribute("opacity", "0");
        r.freshBreadDisplay.setAttribute("opacity", "1");
        r.breadSteam.setAttribute("opacity", "0.95");
        r.ovenStatusText.textContent = "진열 완료";

        const custX = 428 - Math.sin(u * Math.PI) * 36;
        r.charHousehold.setAttribute("transform", `translate(${custX.toFixed(1)}, 272)`);

        const px = 212 + eu * 184;
        const py = 276 - Math.sin(eu * Math.PI) * 58;
        r.transferArc.setAttribute("d", "M 212 276 Q 304 212 396 276");
        r.transferArc.setAttribute("stroke", accent);
        r.transferArc.setAttribute("opacity", "0.7");
        r.movingProp.setAttribute("transform", `translate(${px.toFixed(1)}, ${py.toFixed(1)})`);
        r.movingProp.setAttribute("opacity", u < 0.95 ? "1" : "0");
        r.propTagText.textContent = "빵(재화) 판매";
      } else if (stage.id === "stage_payment") {
        // Stage 4: Customer (Household) pays Bread Price (Coins) to Bakery (Firm): Right (396) -> Left (212)
        r.zoneTextHousehold.textContent = "가계 (빵값 지출)";
        r.householdBakerHat.setAttribute("opacity", "0");
        r.householdBakerApron.setAttribute("opacity", "0");
        r.freshBreadDisplay.setAttribute("opacity", "1");

        const px = 396 - eu * 184;
        const py = 276 - Math.sin(eu * Math.PI) * 58;
        r.transferArc.setAttribute("d", "M 396 276 Q 304 212 212 276");
        r.transferArc.setAttribute("stroke", accent);
        r.transferArc.setAttribute("opacity", "0.7");
        r.movingProp.setAttribute("transform", `translate(${px.toFixed(1)}, ${py.toFixed(1)})`);
        r.movingProp.setAttribute("opacity", u < 0.95 ? "1" : "0");
        r.propTagText.textContent = "빵값 지불";

        if (u > 0.65) {
          r.registerPopup.setAttribute("opacity", "1");
        } else {
          r.registerPopup.setAttribute("opacity", "0");
        }
      }
    }

    finishAllStages() {
      const r = this.svgRefs;
      if (r) {
        r.movingProp.setAttribute("opacity", "0");
        r.transferArc.setAttribute("opacity", "0");
        r.speechBubble.setAttribute("opacity", "0");
        r.registerPopup.setAttribute("opacity", "1");
        r.householdWalletBadge.setAttribute("opacity", "1");
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
          "<b>순환 완성!</b> 가계가 일해서 번 <b>소득(임금)</b>으로 빵을 구매(<b>가계 지출</b>)하고, 빵집은 <b>기업 수입</b>으로 다시 임금을 지급하며 경제 활동이 끊임없이 순환합니다.";
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
