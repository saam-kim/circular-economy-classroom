(function (global) {
  "use strict";

  /**
   * Returns SVG markup centered at (0, 0) for moving tokens on flow paths.
   * No circular badges or decorative backgrounds are added per specification.
   */
  function getTokenSvgMarkup(iconType) {
    switch (iconType) {
      case "bread":
        return `
          <g transform="rotate(-24)" filter="url(#token-halo)">
            <ellipse cx="0" cy="0" rx="28" ry="15" fill="#F59E3F" stroke="#1E293B" stroke-width="2.6"/>
            <path d="M -22 -3 Q 0 -14 22 -3" fill="none" stroke="#FDBA63" stroke-width="4" stroke-linecap="round"/>
            <path d="M -12 -8 C -9 -3, -7 3, -10 8" fill="none" stroke="#5C2D0C" stroke-width="2.4" stroke-linecap="round"/>
            <path d="M 0 -9 C 3 -3, 5 3, 2 9" fill="none" stroke="#5C2D0C" stroke-width="2.4" stroke-linecap="round"/>
            <path d="M 12 -8 C 15 -3, 17 3, 14 8" fill="none" stroke="#5C2D0C" stroke-width="2.4" stroke-linecap="round"/>
          </g>
        `;

      case "salon":
        // Scissors symbolizing hairdressing service
        return `
          <g transform="rotate(-18)" filter="url(#token-halo)">
            <line x1="-6" y1="2" x2="22" y2="-14" stroke="#94A3B8" stroke-width="5" stroke-linecap="round"/>
            <line x1="-6" y1="2" x2="22" y2="-14" stroke="#1E293B" stroke-width="2.2" stroke-linecap="round"/>
            <line x1="-6" y1="-2" x2="22" y2="14" stroke="#CBD5E1" stroke-width="5" stroke-linecap="round"/>
            <line x1="-6" y1="-2" x2="22" y2="14" stroke="#1E293B" stroke-width="2.2" stroke-linecap="round"/>
            <circle cx="-3" cy="0" r="2.8" fill="#1E293B"/>
            <circle cx="-15" cy="-9" r="8.5" fill="none" stroke="#1E293B" stroke-width="5.5"/>
            <circle cx="-15" cy="-9" r="8.5" fill="none" stroke="#3B82F6" stroke-width="3"/>
            <circle cx="-15" cy="9" r="8.5" fill="none" stroke="#1E293B" stroke-width="5.5"/>
            <circle cx="-15" cy="9" r="8.5" fill="none" stroke="#3B82F6" stroke-width="3"/>
          </g>
        `;

      case "labor":
        // Briefcase / work symbol representing labor provision (not shipping a human)
        return `
          <g filter="url(#token-halo)">
            <path d="M -8 -14 L -8 -19 C -8 -21, -6 -22, -4 -22 L 4 -22 C 6 -22, 8 -21, 8 -19 L 8 -14" fill="none" stroke="#1E293B" stroke-width="3" stroke-linecap="round"/>
            <rect x="-22" y="-14" width="44" height="30" rx="5" fill="#3B82F6" stroke="#1E293B" stroke-width="2.6"/>
            <path d="M -22 -2 L 22 -2" stroke="#1E293B" stroke-width="2.4"/>
            <rect x="-5" y="-6" width="10" height="8" rx="2" fill="#FBBF24" stroke="#1E293B" stroke-width="2.2"/>
          </g>
        `;

      case "land":
        // Land plot with sprout symbolizing land use/provision
        return `
          <g filter="url(#token-halo)">
            <polygon points="0,-10 26,2 0,14 -26,2" fill="#86EFAC" stroke="#1E293B" stroke-width="2.5" stroke-linejoin="round"/>
            <polygon points="-26,2 0,14 0,21 -26,9" fill="#B45309" stroke="#1E293B" stroke-width="2.4" stroke-linejoin="round"/>
            <polygon points="26,2 0,14 0,21 26,9" fill="#92400E" stroke="#1E293B" stroke-width="2.4" stroke-linejoin="round"/>
            <path d="M 0 2 L 0 -15" stroke="#15803D" stroke-width="2.8" stroke-linecap="round"/>
            <path d="M 0 -10 C -9 -12, -12 -20, -2 -18 C 0 -17, 0 -13, 0 -10 Z" fill="#22C55E" stroke="#1E293B" stroke-width="2"/>
            <path d="M 0 -12 C 9 -14, 12 -22, 2 -20 C 0 -19, 0 -15, 0 -12 Z" fill="#4ADE80" stroke="#1E293B" stroke-width="2"/>
          </g>
        `;

      case "capital":
        // 2-story commercial storefront building symbolizing physical capital (상가 건물)
        return `
          <g filter="url(#token-halo)">
            <!-- Building main body -->
            <rect x="-19" y="-18" width="38" height="35" rx="3" fill="#F8FAFC" stroke="#1E293B" stroke-width="2.5"/>
            <!-- Roof cornice -->
            <rect x="-22" y="-21" width="44" height="5" rx="2" fill="#3B82F6" stroke="#1E293B" stroke-width="2.3"/>
            <!-- 2nd floor windows -->
            <rect x="-13" y="-12" width="10" height="8" rx="1.5" fill="#BAE6FD" stroke="#1E293B" stroke-width="2"/>
            <rect x="3" y="-12" width="10" height="8" rx="1.5" fill="#BAE6FD" stroke="#1E293B" stroke-width="2"/>
            <!-- Storefront awning -->
            <path d="M -21 0 L 21 0 L 23 6 L -23 6 Z" fill="#FB923C" stroke="#1E293B" stroke-width="2.2" stroke-linejoin="round"/>
            <line x1="-10" y1="0" x2="-11" y2="6" stroke="#1E293B" stroke-width="1.8"/>
            <line x1="0" y1="0" x2="0" y2="6" stroke="#1E293B" stroke-width="1.8"/>
            <line x1="10" y1="0" x2="11" y2="6" stroke="#1E293B" stroke-width="1.8"/>
            <!-- Ground floor door & shop window -->
            <rect x="-13" y="6" width="10" height="11" fill="#FDE68A" stroke="#1E293B" stroke-width="2"/>
            <rect x="1" y="6" width="12" height="7" rx="1" fill="#BAE6FD" stroke="#1E293B" stroke-width="2"/>
            <!-- Base sidewalk -->
            <line x1="-23" y1="17" x2="23" y2="17" stroke="#1E293B" stroke-width="2.8" stroke-linecap="round"/>
          </g>
        `;

      case "coin":
      default:
        // Gold coins matching reference mockup
        return `
          <g filter="url(#token-halo)">
            <!-- Back/Stacked Coin -->
            <g transform="translate(-8, -4) rotate(-15)">
              <ellipse cx="0" cy="3" rx="13" ry="9" fill="#D97706" stroke="#1E293B" stroke-width="2.4"/>
              <ellipse cx="0" cy="0" rx="13" ry="9" fill="#FBBF24" stroke="#1E293B" stroke-width="2.4"/>
              <ellipse cx="0" cy="0" rx="9" ry="5.5" fill="none" stroke="#FEF08A" stroke-width="1.5"/>
            </g>
            <!-- Front Coin -->
            <g transform="translate(8, 4) rotate(12)">
              <ellipse cx="0" cy="3" rx="13" ry="9" fill="#B45309" stroke="#1E293B" stroke-width="2.4"/>
              <ellipse cx="0" cy="0" rx="13" ry="9" fill="#F59E0B" stroke="#1E293B" stroke-width="2.4"/>
              <ellipse cx="0" cy="0" rx="9" ry="5.5" fill="none" stroke="#FEF08A" stroke-width="1.5"/>
            </g>
          </g>
        `;
    }
  }

  global.CircularEconomyIcons = {
    getTokenSvgMarkup
  };
})(window);
