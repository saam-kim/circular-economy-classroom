(function (global) {
  "use strict";

  const NODES = {
    productMarket: {
      id: "productMarket",
      label: "생산물 시장",
      role: "market",
      x: 410,
      y: 38,
      width: 260,
      height: 152,
      rx: 15
    },
    factorMarket: {
      id: "factorMarket",
      label: "생산 요소 시장",
      role: "market",
      x: 392,
      y: 576,
      width: 296,
      height: 152,
      rx: 15
    },
    firm: {
      id: "firm",
      label: "기업",
      role: "agent",
      x: 24,
      y: 320,
      width: 204,
      height: 138,
      rx: 15
    },
    household: {
      id: "household",
      label: "가계",
      role: "agent",
      x: 852,
      y: 320,
      width: 204,
      height: 138,
      rx: 15
    }
  };

  /**
   * 8 directed flow segments.
   * Each segment has a single directional arrowhead at its end point (`toNode`).
   * - Product Market Real Flow: 기업 -> 생산물 시장 -> 가계
   * - Product Market Money Flow: 가계 -> 생산물 시장 -> 기업
   * - Factor Market Real Flow: 가계 -> 생산 요소 시장 -> 기업
   * - Factor Market Money Flow: 기업 -> 생산 요소 시장 -> 가계
   */
  const FLOW_SEGMENTS = {
    prod_money_1: {
      id: "prod_money_1",
      market: "product",
      flowType: "money",
      stage: 1,
      fromNode: "household",
      toNode: "productMarket",
      d: "M 984 306 C 942 174, 822 104, 686 88"
    },
    prod_money_2: {
      id: "prod_money_2",
      market: "product",
      flowType: "money",
      stage: 2,
      fromNode: "productMarket",
      toNode: "firm",
      d: "M 394 88 C 258 104, 138 174, 96 306"
    },
    prod_real_1: {
      id: "prod_real_1",
      market: "product",
      flowType: "real",
      stage: 1,
      fromNode: "firm",
      toNode: "productMarket",
      d: "M 142 306 C 184 206, 276 148, 394 134"
    },
    prod_real_2: {
      id: "prod_real_2",
      market: "product",
      flowType: "real",
      stage: 2,
      fromNode: "productMarket",
      toNode: "household",
      d: "M 686 134 C 804 148, 896 206, 938 306"
    },
    factor_real_1: {
      id: "factor_real_1",
      market: "factor",
      flowType: "real",
      stage: 1,
      fromNode: "household",
      toNode: "factorMarket",
      d: "M 922 472 C 878 552, 800 600, 704 624"
    },
    factor_real_2: {
      id: "factor_real_2",
      market: "factor",
      flowType: "real",
      stage: 2,
      fromNode: "factorMarket",
      toNode: "firm",
      d: "M 376 624 C 280 600, 202 552, 158 472"
    },
    factor_money_1: {
      id: "factor_money_1",
      market: "factor",
      flowType: "money",
      stage: 1,
      fromNode: "firm",
      toNode: "factorMarket",
      d: "M 112 472 C 162 578, 254 646, 376 670"
    },
    factor_money_2: {
      id: "factor_money_2",
      market: "factor",
      flowType: "money",
      stage: 2,
      fromNode: "factorMarket",
      toNode: "household",
      d: "M 704 670 C 826 646, 918 578, 968 472"
    }
  };

  /**
   * 14 Concept Labels positioned around the flow segments.
   * Each has a unique ID and exact text. No substring matching is ever used.
   */
  const CONCEPT_LABELS = [
    // Product Market - Money Flow (Pink)
    {
      id: "firm_revenue",
      text: "기업 수입",
      lines: ["기업 수입"],
      market: "product",
      flowType: "money",
      segmentId: "prod_money_2",
      side: "firm",
      cx: 148,
      cy: 95,
      width: 146,
      height: 48
    },
    {
      id: "household_expenditure",
      text: "가계 지출",
      lines: ["가계 지출"],
      market: "product",
      flowType: "money",
      segmentId: "prod_money_1",
      side: "household",
      cx: 932,
      cy: 95,
      width: 146,
      height: 48
    },

    // Product Market - Real Flow (Blue) - Firm side
    {
      id: "goods_sale",
      text: "재화 판매",
      lines: ["재화 판매"],
      market: "product",
      flowType: "real",
      segmentId: "prod_real_1",
      side: "firm",
      cx: 300,
      cy: 228,
      width: 144,
      height: 46
    },
    {
      id: "service_sale",
      text: "서비스 판매",
      lines: ["서비스 판매"],
      market: "product",
      flowType: "real",
      segmentId: "prod_real_1",
      side: "firm",
      cx: 300,
      cy: 282,
      width: 144,
      height: 46
    },

    // Product Market - Real Flow (Blue) - Household side
    {
      id: "goods_purchase",
      text: "재화 구매",
      lines: ["재화 구매"],
      market: "product",
      flowType: "real",
      segmentId: "prod_real_2",
      side: "household",
      cx: 780,
      cy: 228,
      width: 144,
      height: 46
    },
    {
      id: "service_purchase",
      text: "서비스 구매",
      lines: ["서비스 구매"],
      market: "product",
      flowType: "real",
      segmentId: "prod_real_2",
      side: "household",
      cx: 780,
      cy: 282,
      width: 144,
      height: 46
    },

    // Factor Market - Real Flow (Blue) - Firm side (3 separate pills with 8px gap)
    {
      id: "labor_purchase",
      text: "노동 구매",
      lines: ["노동 구매"],
      market: "factor",
      flowType: "real",
      segmentId: "factor_real_2",
      side: "firm",
      cx: 306,
      cy: 454,
      width: 138,
      height: 40
    },
    {
      id: "land_purchase",
      text: "토지 구매",
      lines: ["토지 구매"],
      market: "factor",
      flowType: "real",
      segmentId: "factor_real_2",
      side: "firm",
      cx: 306,
      cy: 502,
      width: 138,
      height: 40
    },
    {
      id: "capital_purchase",
      text: "자본 구매",
      lines: ["자본 구매"],
      market: "factor",
      flowType: "real",
      segmentId: "factor_real_2",
      side: "firm",
      cx: 306,
      cy: 550,
      width: 138,
      height: 40
    },

    // Factor Market - Real Flow (Blue) - Household side (3 separate pills with 8px gap)
    {
      id: "labor_supply",
      text: "노동 제공",
      lines: ["노동 제공"],
      market: "factor",
      flowType: "real",
      segmentId: "factor_real_1",
      side: "household",
      cx: 774,
      cy: 454,
      width: 138,
      height: 40
    },
    {
      id: "land_supply",
      text: "토지 제공",
      lines: ["토지 제공"],
      market: "factor",
      flowType: "real",
      segmentId: "factor_real_1",
      side: "household",
      cx: 774,
      cy: 502,
      width: 138,
      height: 40
    },
    {
      id: "capital_supply",
      text: "자본 제공",
      lines: ["자본 제공"],
      market: "factor",
      flowType: "real",
      segmentId: "factor_real_1",
      side: "household",
      cx: 774,
      cy: 550,
      width: 138,
      height: 40
    },

    // Factor Market - Money Flow (Pink)
    {
      id: "factor_payment",
      text: "생산 요소에 대한 대가",
      lines: ["생산 요소에", "대한 대가"],
      market: "factor",
      flowType: "money",
      segmentId: "factor_money_1",
      side: "firm",
      cx: 134,
      cy: 636,
      width: 162,
      height: 76
    },
    {
      id: "household_income",
      text: "가계 소득",
      lines: ["가계 소득"],
      market: "factor",
      flowType: "money",
      segmentId: "factor_money_2",
      side: "household",
      cx: 926,
      cy: 644,
      width: 146,
      height: 48
    }
  ];

  // Individual pill badges are used for all concept labels (no merged stack backdrop)
  const FACTOR_STACK_BACKDROPS = [];

  /**
   * 5 Scenarios (Strict mapping per Section 4 of 개발명세서.md)
   */
  const SCENARIOS = [
    {
      id: "bread",
      title: "빵 구매",
      market: "product",
      marketName: "생산물 시장",
      cardAlt: "빵집에서 빵을 구매하는 모습",
      activeLabelIds: [
        "goods_sale",
        "goods_purchase",
        "household_expenditure",
        "firm_revenue"
      ],
      activeLabels: [
        "재화 판매",
        "재화 구매",
        "가계 지출",
        "기업 수입"
      ],
      realFlow: {
        fromNode: "firm",
        viaMarket: "productMarket",
        toNode: "household",
        segments: ["prod_real_1", "prod_real_2"],
        iconType: "bread",
        iconLabel: "빵",
        prompt: "빵은 누가 만드나요?"
      },
      moneyFlow: {
        fromNode: "household",
        viaMarket: "productMarket",
        toNode: "firm",
        segments: ["prod_money_1", "prod_money_2"],
        iconType: "coin",
        iconLabel: "화폐",
        prompt: "돈은 누가 지불하나요?"
      }
    },
    {
      id: "salon",
      title: "미용실 이용",
      market: "product",
      marketName: "생산물 시장",
      cardAlt: "미용실에서 머리 손질 서비스를 받는 모습",
      activeLabelIds: [
        "service_sale",
        "service_purchase",
        "household_expenditure",
        "firm_revenue"
      ],
      activeLabels: [
        "서비스 판매",
        "서비스 구매",
        "가계 지출",
        "기업 수입"
      ],
      realFlow: {
        fromNode: "firm",
        viaMarket: "productMarket",
        toNode: "household",
        segments: ["prod_real_1", "prod_real_2"],
        iconType: "salon",
        iconLabel: "미용 서비스",
        prompt: "미용 서비스는 누가 제공하나요?"
      },
      moneyFlow: {
        fromNode: "household",
        viaMarket: "productMarket",
        toNode: "firm",
        segments: ["prod_money_1", "prod_money_2"],
        iconType: "coin",
        iconLabel: "화폐",
        prompt: "돈은 누가 지불하나요?"
      }
    },
    {
      id: "labor",
      title: "회사 근무",
      market: "factor",
      marketName: "생산 요소 시장",
      cardAlt: "회사에서 사무 노동을 제공하는 모습",
      activeLabelIds: [
        "labor_supply",
        "labor_purchase",
        "factor_payment",
        "household_income"
      ],
      activeLabels: [
        "노동 제공",
        "노동 구매",
        "생산 요소에 대한 대가",
        "가계 소득"
      ],
      realFlow: {
        fromNode: "household",
        viaMarket: "factorMarket",
        toNode: "firm",
        segments: ["factor_real_1", "factor_real_2"],
        iconType: "labor",
        iconLabel: "노동 활동",
        prompt: "노동력은 누가 제공하나요?"
      },
      moneyFlow: {
        fromNode: "firm",
        viaMarket: "factorMarket",
        toNode: "household",
        segments: ["factor_money_1", "factor_money_2"],
        iconType: "coin",
        iconLabel: "화폐",
        prompt: "돈은 누가 지불하나요?"
      }
    },
    {
      id: "land",
      title: "농지 임대",
      market: "factor",
      marketName: "생산 요소 시장",
      cardAlt: "토지 소유자가 기업에 농지를 임대하는 모습",
      activeLabelIds: [
        "land_supply",
        "land_purchase",
        "factor_payment",
        "household_income"
      ],
      activeLabels: [
        "토지 제공",
        "토지 구매",
        "생산 요소에 대한 대가",
        "가계 소득"
      ],
      realFlow: {
        fromNode: "household",
        viaMarket: "factorMarket",
        toNode: "firm",
        segments: ["factor_real_1", "factor_real_2"],
        iconType: "land",
        iconLabel: "토지 이용",
        prompt: "농지는 누가 빌려주나요?"
      },
      moneyFlow: {
        fromNode: "firm",
        viaMarket: "factorMarket",
        toNode: "household",
        segments: ["factor_money_1", "factor_money_2"],
        iconType: "coin",
        iconLabel: "화폐",
        prompt: "돈은 누가 지불하나요?"
      }
    },
    {
      id: "capital",
      title: "상가 임대",
      market: "factor",
      marketName: "생산 요소 시장",
      cardAlt: "상가 건물 소유자가 기업에 건물을 임대하여 자본을 제공하는 모습",
      activeLabelIds: [
        "capital_supply",
        "capital_purchase",
        "factor_payment",
        "household_income"
      ],
      activeLabels: [
        "자본 제공",
        "자본 구매",
        "생산 요소에 대한 대가",
        "가계 소득"
      ],
      realFlow: {
        fromNode: "household",
        viaMarket: "factorMarket",
        toNode: "firm",
        segments: ["factor_real_1", "factor_real_2"],
        iconType: "capital",
        iconLabel: "상가 건물",
        prompt: "상가 건물은 누가 빌려주나요?"
      },
      moneyFlow: {
        fromNode: "firm",
        viaMarket: "factorMarket",
        toNode: "household",
        segments: ["factor_money_1", "factor_money_2"],
        iconType: "coin",
        iconLabel: "화폐",
        prompt: "돈은 누가 지불하나요?"
      }
    }
  ];

  const DEFAULT_SCENARIO_ID = "bread";

  global.CircularEconomyData = {
    NODES,
    FLOW_SEGMENTS,
    CONCEPT_LABELS,
    FACTOR_STACK_BACKDROPS,
    SCENARIOS,
    DEFAULT_SCENARIO_ID,
    getScenarioById(id) {
      return SCENARIOS.find((s) => s.id === id) || null;
    }
  };
})(window);
