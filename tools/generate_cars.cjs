const fs = require('fs');
const path = require('path');

/**
 * Super Cute & Realistic Toy Vehicle SVG Generator
 * Features:
 * - Large, expressive friendly cartoon eyes with double sparkle highlights
 * - Sculpted curved vehicle bodies (hood, roof, fenders, bumpers)
 * - 3D thick tires with detailed silver rims
 * - Distinctive vehicle features (Fire ladder, Police siren, Dump bed, etc.)
 */

function generateFireEngine(isBig, isDirty) {
  const scale = isBig ? 1.4 : 1.0;
  const w = 200 * scale;
  const h = 135 * scale;

  let mudLayer = '';
  if (isDirty) {
    mudLayer = `
      <!-- Mud Splats -->
      <path d="M 22 75 Q 35 55 50 78 T 80 65 T 110 80 T 140 68 T 170 82 T 185 92 L 185 102 L 22 102 Z" fill="#6B4226" opacity="0.88"/>
      <circle cx="50" cy="92" r="15" fill="#4A2E1A" opacity="0.85"/>
      <circle cx="145" cy="92" r="15" fill="#4A2E1A" opacity="0.85"/>
      <path d="M 40 48 Q 52 38 62 54 Q 68 60 55 70 Z" fill="#6B4226" opacity="0.8"/>
      <circle cx="120" cy="45" r="10" fill="#6B4226" opacity="0.8"/>
      <circle cx="150" cy="32" r="8" fill="#6B4226" opacity="0.8"/>
    `;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 135" width="${w}" height="${h}">
  <!-- Drop Shadow -->
  <ellipse cx="100" cy="118" rx="82" ry="10" fill="rgba(21, 51, 74, 0.2)" />

  <g transform="translate(0, 0)">
    <!-- Red Emergency Siren Light Glow -->
    <circle cx="130" cy="14" r="12" fill="#FF3B30" opacity="0.35"/>
    <path d="M 124 20 L 124 13 Q 130 7 136 13 L 136 20 Z" fill="#FF0000" stroke="#15334A" stroke-width="2.5"/>
    <rect x="122" y="20" width="16" height="5" rx="1.5" fill="#FFCC00" stroke="#15334A" stroke-width="2"/>

    <!-- Ladder on Roof -->
    <rect x="35" y="14" width="78" height="8" rx="3" fill="#FFD166" stroke="#15334A" stroke-width="2.5"/>
    <line x1="48" y1="14" x2="48" y2="22" stroke="#15334A" stroke-width="2"/>
    <line x1="61" y1="14" x2="61" y2="22" stroke="#15334A" stroke-width="2"/>
    <line x1="74" y1="14" x2="74" y2="22" stroke="#15334A" stroke-width="2"/>
    <line x1="87" y1="14" x2="87" y2="22" stroke="#15334A" stroke-width="2"/>
    <line x1="100" y1="14" x2="100" y2="22" stroke="#15334A" stroke-width="2"/>

    <!-- Fire Engine Sculpted Main Body -->
    <!-- Rear Cabin & Cargo Body -->
    <path d="M 22 36 C 22 28 28 22 36 22 L 115 22 L 115 92 L 22 92 Z" fill="#E63946" stroke="#15334A" stroke-width="4.5" stroke-linejoin="round"/>
    
    <!-- Front Cabin Hood & Sloped Windshield -->
    <path d="M 112 22 L 140 22 C 152 22 165 30 172 45 L 178 60 C 182 68 182 92 172 92 L 112 92 Z" fill="#EE2B3B" stroke="#15334A" stroke-width="4.5" stroke-linejoin="round"/>

    <!-- White Side Stripe -->
    <path d="M 22 56 L 178 56 L 178 66 L 22 66 Z" fill="#FFFFFF"/>
    <line x1="22" y1="56" x2="178" y2="56" stroke="#15334A" stroke-width="2"/>
    <line x1="22" y1="66" x2="178" y2="66" stroke="#15334A" stroke-width="2"/>

    <!-- Silver Shutter Equipment Door -->
    <rect x="32" y="30" width="50" height="23" rx="3" fill="#D8E2DC" stroke="#15334A" stroke-width="2.5"/>
    <line x1="32" y1="36" x2="82" y2="36" stroke="#9A9EAB" stroke-width="1.5"/>
    <line x1="32" y1="41" x2="82" y2="41" stroke="#9A9EAB" stroke-width="1.5"/>
    <line x1="32" y1="47" x2="82" y2="47" stroke="#9A9EAB" stroke-width="1.5"/>

    <!-- Hose Reel Indicator -->
    <circle cx="68" cy="78" r="8" fill="#FFD166" stroke="#15334A" stroke-width="2"/>
    <circle cx="68" cy="78" r="3" fill="#E63946"/>

    <!-- Large Front Cabin Windshield Window -->
    <path d="M 115 28 L 138 28 C 145 28 152 34 156 42 L 158 50 L 115 50 Z" fill="#EAF8FF" stroke="#15334A" stroke-width="3"/>
    
    <!-- BIG CUTE EXPRESSIVE CARTOON EYES -->
    <!-- Eye Outer White -->
    <ellipse cx="140" cy="39" rx="9" ry="11" fill="#FFFFFF" stroke="#15334A" stroke-width="2.5"/>
    <!-- Eye Pupil (Dark Navy Blue) -->
    <ellipse cx="142" cy="39" rx="5.5" ry="7" fill="#152B3C"/>
    <!-- Large White Sparkle 1 -->
    <circle cx="140" cy="35" r="2.8" fill="#FFFFFF"/>
    <!-- Small White Sparkle 2 -->
    <circle cx="144" cy="42" r="1.3" fill="#FFFFFF"/>
    <!-- Friendly Brow -->
    <path d="M 130 25 Q 140 21 150 26" fill="none" stroke="#15334A" stroke-width="2.5" stroke-linecap="round"/>

    <!-- Window Glare Highlight -->
    <path d="M 118 31 L 130 31" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round"/>

    ${mudLayer}

    <!-- Front Bumper & Friendly Smile -->
    <path d="M 175 70 Q 183 70 183 80 Q 183 88 172 88" fill="#CED4DA" stroke="#15334A" stroke-width="3.5" stroke-linejoin="round"/>
    <path d="M 158 76 Q 164 83 170 76" fill="none" stroke="#15334A" stroke-width="3" stroke-linecap="round"/>

    <!-- Cute Big Headlight -->
    <circle cx="174" cy="58" r="7" fill="#FFEA00" stroke="#15334A" stroke-width="3"/>
    <circle cx="176" cy="56" r="2.5" fill="#FFFFFF"/>

    <!-- Rear Taillight -->
    <rect x="17" y="62" width="7" height="16" rx="3" fill="#FF0000" stroke="#15334A" stroke-width="2.5"/>

    <!-- Wheels (Back) -->
    <circle cx="50" cy="94" r="20" fill="#2B2D42" stroke="#15334A" stroke-width="4.5"/>
    <circle cx="50" cy="94" r="9" fill="#E9ECEF" stroke="#15334A" stroke-width="2"/>
    <circle cx="50" cy="94" r="3.5" fill="#15334A"/>

    <!-- Wheels (Front) -->
    <circle cx="145" cy="94" r="20" fill="#2B2D42" stroke="#15334A" stroke-width="4.5"/>
    <circle cx="145" cy="94" r="9" fill="#E9ECEF" stroke="#15334A" stroke-width="2"/>
    <circle cx="145" cy="94" r="3.5" fill="#15334A"/>
  </g>
</svg>`;
}

function generatePoliceCar(isBig) {
  const scale = isBig ? 1.4 : 1.0;
  const w = 200 * scale;
  const h = 135 * scale;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 135" width="${w}" height="${h}">
  <!-- Drop Shadow -->
  <ellipse cx="100" cy="118" rx="82" ry="10" fill="rgba(21, 51, 74, 0.2)" />

  <g transform="translate(0, 0)">
    <!-- Red V-Siren Bar Glow -->
    <circle cx="105" cy="12" r="14" fill="#FF2D55" opacity="0.3"/>
    <!-- V-Siren Bar Body -->
    <path d="M 90 16 L 118 16 L 123 23 L 85 23 Z" fill="#FF2D55" stroke="#15334A" stroke-width="2.5"/>
    <rect x="98" y="23" width="12" height="5" fill="#CED4DA" stroke="#15334A" stroke-width="2"/>

    <!-- Police Car Roof Curve (White) -->
    <path d="M 48 42 L 65 24 L 135 24 C 150 24 160 33 166 42 Z" fill="#FFFFFF" stroke="#15334A" stroke-width="4.5" stroke-linejoin="round"/>

    <!-- Lower Body Base (Black) -->
    <path d="M 22 42 C 22 42 22 92 36 92 L 180 92 C 188 92 188 72 186 60 C 184 50 174 42 166 42 Z" fill="#1A1A1E" stroke="#15334A" stroke-width="4.5" stroke-linejoin="round"/>
    
    <!-- White Top Body Wrap -->
    <path d="M 22 44 L 182 44 L 182 60 Q 100 62 22 60 Z" fill="#FFFFFF"/>
    <line x1="22" y1="60" x2="182" y2="60" stroke="#15334A" stroke-width="3"/>

    <!-- Rear Window & Front Windshield -->
    <rect x="62" y="28" width="32" height="16" rx="3" fill="#EAF8FF" stroke="#15334A" stroke-width="3"/>
    <path d="M 98 28 L 132 28 C 140 28 146 32 150 40 L 152 44 L 98 44 Z" fill="#EAF8FF" stroke="#15334A" stroke-width="3"/>

    <!-- BIG CUTE EXPRESSIVE CARTOON EYES -->
    <ellipse cx="128" cy="36" rx="8.5" ry="10.5" fill="#FFFFFF" stroke="#15334A" stroke-width="2.5"/>
    <ellipse cx="130" cy="36" rx="5" ry="6.5" fill="#152B3C"/>
    <circle cx="128" cy="32" r="2.6" fill="#FFFFFF"/>
    <circle cx="132" cy="39" r="1.2" fill="#FFFFFF"/>
    <path d="M 118 22 Q 128 18 138 23" fill="none" stroke="#15334A" stroke-width="2.5" stroke-linecap="round"/>

    <!-- Gold Police Star Badge Emblem on Side Door -->
    <polygon points="98,66 100,72 106,72 101,76 103,82 98,78 93,82 95,76 90,72 96,72" fill="#FFD166" stroke="#15334A" stroke-width="2"/>

    <!-- Front Bumper & Friendly Smile -->
    <path d="M 162 76 Q 168 82 174 76" fill="none" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round"/>

    <!-- Cute Big Headlight -->
    <circle cx="178" cy="55" r="6.5" fill="#FFEA00" stroke="#15334A" stroke-width="3"/>
    <circle cx="179" cy="53" r="2.2" fill="#FFFFFF"/>

    <!-- Rear Taillight -->
    <rect x="17" y="52" width="7" height="14" rx="3" fill="#FF3B30" stroke="#15334A" stroke-width="2.5"/>

    <!-- Wheels (Back) -->
    <circle cx="50" cy="94" r="20" fill="#2B2D42" stroke="#15334A" stroke-width="4.5"/>
    <circle cx="50" cy="94" r="9" fill="#E2E8F0" stroke="#15334A" stroke-width="2"/>
    <circle cx="50" cy="94" r="3.5" fill="#15334A"/>

    <!-- Wheels (Front) -->
    <circle cx="145" cy="94" r="20" fill="#2B2D42" stroke="#15334A" stroke-width="4.5"/>
    <circle cx="145" cy="94" r="9" fill="#E2E8F0" stroke="#15334A" stroke-width="2"/>
    <circle cx="145" cy="94" r="3.5" fill="#15334A"/>
  </g>
</svg>`;
}

function generateDumpTruck(isBig) {
  const scale = isBig ? 1.4 : 1.0;
  const w = 200 * scale;
  const h = 135 * scale;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 135" width="${w}" height="${h}">
  <!-- Drop Shadow -->
  <ellipse cx="100" cy="118" rx="82" ry="10" fill="rgba(21, 51, 74, 0.2)" />

  <g transform="translate(0, 0)">
    <!-- Yellow Beacon Light -->
    <rect x="135" y="16" width="12" height="9" rx="2.5" fill="#FF9F1C" stroke="#15334A" stroke-width="2.5"/>

    <!-- Large Tilted Dump Cargo Bed -->
    <path d="M 22 28 L 110 28 L 110 74 L 22 74 Z" fill="#FB8500" stroke="#15334A" stroke-width="4.5" stroke-linejoin="round"/>
    <line x1="50" y1="28" x2="50" y2="74" stroke="#15334A" stroke-width="2.5"/>
    <line x1="80" y1="28" x2="80" y2="74" stroke="#15334A" stroke-width="2.5"/>

    <!-- Front Heavy Duty Yellow Cabin -->
    <path d="M 112 25 L 155 25 C 166 25 174 33 177 46 L 180 74 L 112 74 Z" fill="#FFB703" stroke="#15334A" stroke-width="4.5" stroke-linejoin="round"/>
    
    <!-- Cabin Window -->
    <path d="M 120 31 L 152 31 C 158 31 162 36 164 45 L 165 52 L 120 52 Z" fill="#EAF8FF" stroke="#15334A" stroke-width="3"/>

    <!-- BIG CUTE EXPRESSIVE CARTOON EYES -->
    <ellipse cx="142" cy="41" rx="8.5" ry="10.5" fill="#FFFFFF" stroke="#15334A" stroke-width="2.5"/>
    <ellipse cx="144" cy="41" rx="5" ry="6.5" fill="#152B3C"/>
    <circle cx="142" cy="37" r="2.6" fill="#FFFFFF"/>
    <circle cx="146" cy="44" r="1.2" fill="#FFFFFF"/>
    <path d="M 132 26 Q 142 22 152 27" fill="none" stroke="#15334A" stroke-width="2.5" stroke-linecap="round"/>

    <!-- Hazard Safety Bumper Stripes -->
    <rect x="22" y="74" width="158" height="16" fill="#333333" stroke="#15334A" stroke-width="3"/>
    <path d="M 32 74 L 44 90 M 56 74 L 68 90 M 80 74 L 92 90 M 104 74 L 116 90 M 128 74 L 140 90 M 152 74 L 164 90" stroke="#FFB703" stroke-width="4.5"/>

    <!-- Headlight -->
    <circle cx="178" cy="60" r="6.5" fill="#FFFFFF" stroke="#15334A" stroke-width="3"/>

    <!-- Dual Heavy Wheels (Back) -->
    <circle cx="48" cy="94" r="21" fill="#2B2D42" stroke="#15334A" stroke-width="4.5"/>
    <circle cx="48" cy="94" r="9" fill="#FFB703" stroke="#15334A" stroke-width="2"/>
    <circle cx="48" cy="94" r="3.5" fill="#15334A"/>

    <circle cx="90" cy="94" r="21" fill="#2B2D42" stroke="#15334A" stroke-width="4.5"/>
    <circle cx="90" cy="94" r="9" fill="#FFB703" stroke="#15334A" stroke-width="2"/>
    <circle cx="90" cy="94" r="3.5" fill="#15334A"/>

    <!-- Heavy Wheel (Front) -->
    <circle cx="152" cy="94" r="21" fill="#2B2D42" stroke="#15334A" stroke-width="4.5"/>
    <circle cx="152" cy="94" r="9" fill="#FFB703" stroke="#15334A" stroke-width="2"/>
    <circle cx="152" cy="94" r="3.5" fill="#15334A"/>
  </g>
</svg>`;
}

function generateGreenTruck(isBig) {
  const scale = isBig ? 1.4 : 1.0;
  const w = 200 * scale;
  const h = 135 * scale;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 135" width="${w}" height="${h}">
  <!-- Drop Shadow -->
  <ellipse cx="100" cy="118" rx="82" ry="10" fill="rgba(21, 51, 74, 0.2)" />

  <g transform="translate(0, 0)">
    <!-- Roof Beacon Light -->
    <rect x="130" y="16" width="12" height="9" rx="2.5" fill="#52B788" stroke="#15334A" stroke-width="2.5"/>

    <!-- Rear Green Container -->
    <rect x="22" y="26" width="85" height="66" rx="10" fill="#2A9D8F" stroke="#15334A" stroke-width="4.5"/>
    <circle cx="64" cy="56" r="16" fill="#E9C46A" opacity="0.95" stroke="#15334A" stroke-width="2"/>
    <!-- Leaf Icon Motif -->
    <path d="M 64 45 Q 75 51 70 65 Q 55 67 64 45 Z" fill="#2A9D8F"/>

    <!-- Green Cabin Front -->
    <path d="M 108 24 L 152 24 C 162 24 170 32 174 44 L 176 92 L 108 92 Z" fill="#52B788" stroke="#15334A" stroke-width="4.5" stroke-linejoin="round"/>

    <!-- Cabin Window -->
    <path d="M 116 30 L 148 30 C 154 30 158 35 160 44 L 161 52 L 116 52 Z" fill="#EAF8FF" stroke="#15334A" stroke-width="3"/>

    <!-- BIG CUTE EXPRESSIVE CARTOON EYES -->
    <ellipse cx="138" cy="41" rx="8.5" ry="10.5" fill="#FFFFFF" stroke="#15334A" stroke-width="2.5"/>
    <ellipse cx="140" cy="41" rx="5" ry="6.5" fill="#152B3C"/>
    <circle cx="138" cy="37" r="2.6" fill="#FFFFFF"/>
    <circle cx="142" cy="44" r="1.2" fill="#FFFFFF"/>
    <path d="M 128 25 Q 138 21 148 26" fill="none" stroke="#15334A" stroke-width="2.5" stroke-linecap="round"/>

    <!-- Headlight -->
    <circle cx="174" cy="62" r="6.5" fill="#FFEA00" stroke="#15334A" stroke-width="3"/>

    <!-- Wheels (Back) -->
    <circle cx="52" cy="94" r="20" fill="#2B2D42" stroke="#15334A" stroke-width="4.5"/>
    <circle cx="52" cy="94" r="9" fill="#E9C46A" stroke="#15334A" stroke-width="2"/>
    <circle cx="52" cy="94" r="3.5" fill="#15334A"/>

    <!-- Wheels (Front) -->
    <circle cx="145" cy="94" r="20" fill="#2B2D42" stroke="#15334A" stroke-width="4.5"/>
    <circle cx="145" cy="94" r="9" fill="#E9C46A" stroke="#15334A" stroke-width="2"/>
    <circle cx="145" cy="94" r="3.5" fill="#15334A"/>
  </g>
</svg>`;
}

// ---------------- MENU CARD ICON COMPOSITES ---------------- //

function generateMenuSignalSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 140" width="220" height="140">
  <g transform="translate(5, 5)">
    <!-- Traffic Light Structure -->
    <rect x="160" y="10" width="36" height="90" rx="10" fill="#2B2D42" stroke="#15334A" stroke-width="4"/>
    <rect x="174" y="100" width="8" height="30" fill="#555" stroke="#15334A" stroke-width="3"/>
    <!-- Red Light -->
    <circle cx="178" cy="28" r="10" fill="#FF3B30" stroke="#15334A" stroke-width="2.5"/>
    <!-- Yellow Light -->
    <circle cx="178" cy="55" r="10" fill="#FFCC00" stroke="#15334A" stroke-width="2.5"/>
    <!-- Green Light (Glowing) -->
    <circle cx="178" cy="82" r="10" fill="#30D158" stroke="#15334A" stroke-width="2.5"/>
    <circle cx="178" cy="82" r="15" fill="#30D158" opacity="0.35"/>

    <!-- Fire Engine -->
    <g transform="translate(0, 10) scale(0.82)">
      ${generateFireEngine(false, false).replace(/<svg[^>]*>|<\/svg>/g, '')}
    </g>
  </g>
</svg>`;
}

function generateMenuColorGarageSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 140" width="220" height="140">
  <g transform="translate(5, 5)">
    <!-- Blue Garage Arch -->
    <path d="M 15 115 L 15 40 Q 105 12 195 40 L 195 115 Z" fill="#74C0FC" stroke="#15334A" stroke-width="4"/>
    <path d="M 28 115 L 28 48 Q 105 25 182 48 L 182 115 Z" fill="#1971C2" stroke="#15334A" stroke-width="3"/>

    <!-- Police Car Emerging -->
    <g transform="translate(10, 24) scale(0.82)">
      ${generatePoliceCar(false).replace(/<svg[^>]*>|<\/svg>/g, '')}
    </g>
  </g>
</svg>`;
}

function generateMenuBigSmallSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 140" width="220" height="140">
  <g transform="translate(5, 5)">
    <!-- Dashed Box -->
    <rect x="12" y="8" width="196" height="120" rx="16" fill="none" stroke="#0CA678" stroke-width="3.5" stroke-dasharray="8 6"/>
    <!-- Big Dump Truck -->
    <g transform="translate(15, 10) scale(0.65)">
      ${generateDumpTruck(true).replace(/<svg[^>]*>|<\/svg>/g, '')}
    </g>
    <!-- Small Fire Engine -->
    <g transform="translate(108, 60) scale(0.46)">
      ${generateFireEngine(false, false).replace(/<svg[^>]*>|<\/svg>/g, '')}
    </g>
  </g>
</svg>`;
}

function generateMenuTraceSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 140" width="220" height="140">
  <g transform="translate(5, 5)">
    <!-- Curved Winding Road -->
    <path d="M 10 110 Q 60 10 100 60 T 190 10" fill="none" stroke="#5C677D" stroke-width="32" stroke-linecap="round"/>
    <path d="M 10 110 Q 60 10 100 60 T 190 10" fill="none" stroke="#FFD166" stroke-width="4" stroke-dasharray="10 8" stroke-linecap="round"/>

    <!-- Green Utility Truck Riding Road -->
    <g transform="translate(42, 5) scale(0.72)">
      ${generateGreenTruck(false).replace(/<svg[^>]*>|<\/svg>/g, '')}
    </g>
  </g>
</svg>`;
}

function generateMenuCarWashSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 140" width="220" height="140">
  <g transform="translate(5, 5)">
    <!-- Dirty Fire Engine with Foam & Sponge -->
    <g transform="translate(8, 12) scale(0.82)">
      ${generateFireEngine(false, true).replace(/<svg[^>]*>|<\/svg>/g, '')}
    </g>
    <!-- Fluffy Bubbles -->
    <circle cx="95" cy="35" r="14" fill="#FFFFFF" stroke="#0097A7" stroke-width="2.5"/>
    <circle cx="115" cy="26" r="18" fill="#FFFFFF" stroke="#0097A7" stroke-width="2.5"/>
    <circle cx="135" cy="36" r="12" fill="#FFFFFF" stroke="#0097A7" stroke-width="2.5"/>
    <!-- Sponge -->
    <rect x="120" y="10" width="36" height="22" rx="6" fill="#FFD166" stroke="#15334A" stroke-width="3" transform="rotate(-15 130 20)"/>
  </g>
</svg>`;
}

function generateMenuPuzzleSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 140" width="220" height="140">
  <g transform="translate(5, 5)">
    <!-- Fire Engine -->
    <g transform="translate(8, 10) scale(0.85)">
      ${generateFireEngine(false, false).replace(/<svg[^>]*>|<\/svg>/g, '')}
    </g>
    <!-- Puzzle Split Line Overlay -->
    <path d="M 105 10 L 105 50 C 115 50 115 70 105 70 L 105 115" fill="none" stroke="#7048E8" stroke-width="4.5" stroke-linecap="round"/>
  </g>
</svg>`;
}

function generateMenuLightsSoundSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 140" width="220" height="140">
  <g transform="translate(5, 5)">
    <!-- Dark Night Background -->
    <rect x="5" y="5" width="210" height="130" rx="22" fill="#2B2D42"/>
    <!-- Light Beam -->
    <polygon points="120,92 60,40 70,32 120,74" fill="#FFF3B0" opacity="0.5"/>
    <!-- Moon & Stars -->
    <circle cx="186" cy="28" r="10" fill="#FFE082"/>
    <circle cx="172" cy="46" r="2.5" fill="#FFFFFF" opacity="0.8"/>
    <circle cx="34" cy="24" r="2.5" fill="#FFFFFF" opacity="0.8"/>
    <circle cx="52" cy="46" r="2" fill="#FFFFFF" opacity="0.7"/>
    <!-- Siren Flash -->
    <circle cx="102" cy="20" r="8" fill="#FF3B30" opacity="0.9"/>
    <!-- Fire Engine -->
    <g transform="translate(18, 30) scale(0.92)">
      ${generateFireEngine(false, false).replace(/<svg[^>]*>|<\/svg>/g, '')}
    </g>
  </g>
</svg>`;
}

function generateMenuLineUpSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 140" width="220" height="140">
  <g transform="translate(5, 5)">
    <!-- Ground -->
    <rect x="10" y="96" width="200" height="26" rx="8" fill="#8BC34A" stroke="#15334A" stroke-width="3"/>
    <!-- Track Line -->
    <line x1="24" y1="112" x2="196" y2="112" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round"/>
    <!-- Linked Train of Vehicles -->
    <g transform="translate(8, 30) scale(0.42)">
      ${generateFireEngine(false, false).replace(/<svg[^>]*>|<\/svg>/g, '')}
    </g>
    <g transform="translate(58, 30) scale(0.42)">
      ${generatePoliceCar(false).replace(/<svg[^>]*>|<\/svg>/g, '')}
    </g>
    <g transform="translate(108, 30) scale(0.42)">
      ${generateDumpTruck(false).replace(/<svg[^>]*>|<\/svg>/g, '')}
    </g>
    <g transform="translate(158, 30) scale(0.42)">
      ${generateGreenTruck(false).replace(/<svg[^>]*>|<\/svg>/g, '')}
    </g>
  </g>
</svg>`;
}

// ---------------- GARAGE / SIGNAL / WASH TOOL / PARKING SVGS ---------------- //

function generateGarage(mainColor, doorColor) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 180" width="200" height="180">
  <!-- Ground Shadow -->
  <ellipse cx="100" cy="176" rx="88" ry="6" fill="rgba(21, 51, 74, 0.18)" />

  <!-- Arched Garage Body -->
  <path d="M 16 176 L 16 64 Q 100 10 184 64 L 184 176 Z" fill="${mainColor}" stroke="#15334A" stroke-width="5" stroke-linejoin="round"/>

  <!-- Door Opening -->
  <path d="M 50 176 L 50 86 Q 100 46 150 86 L 150 176 Z" fill="${doorColor}" stroke="#15334A" stroke-width="4" stroke-linejoin="round"/>

  <!-- Interior Floor -->
  <rect x="54" y="148" width="92" height="28" fill="#FFFFFF" opacity="0.35"/>

  <!-- Roof Highlight -->
  <path d="M 30 58 Q 100 14 170 58" fill="none" stroke="#FFFFFF" stroke-width="5" stroke-linecap="round" opacity="0.55"/>

  <!-- Side Trim -->
  <rect x="16" y="118" width="7" height="58" rx="3.5" fill="#FFFFFF" opacity="0.35"/>
  <rect x="177" y="118" width="7" height="58" rx="3.5" fill="#FFFFFF" opacity="0.35"/>
</svg>`;
}

function generateSignal() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 380" width="200" height="380">
  <!-- Pole -->
  <rect x="94" y="332" width="12" height="44" fill="#5C677D" stroke="#15334A" stroke-width="3"/>

  <!-- Housing -->
  <rect x="40" y="14" width="120" height="330" rx="26" fill="#2B2D42" stroke="#15334A" stroke-width="5"/>

  <!-- Neutral Grey Lenses (CSS overlays the lit colors) -->
  <circle cx="100" cy="76" r="36" fill="#B0B7BD" stroke="#15334A" stroke-width="4"/>
  <circle cx="100" cy="173" r="36" fill="#B0B7BD" stroke="#15334A" stroke-width="4"/>
  <circle cx="100" cy="270" r="36" fill="#B0B7BD" stroke="#15334A" stroke-width="4"/>

  <!-- Visor Hoods -->
  <path d="M 60 60 A 40 40 0 0 1 140 60 L 140 82 A 40 40 0 0 0 60 82 Z" fill="#333D51"/>
  <path d="M 60 157 A 40 40 0 0 1 140 157 L 140 179 A 40 40 0 0 0 60 179 Z" fill="#333D51"/>
  <path d="M 60 254 A 40 40 0 0 1 140 254 L 140 276 A 40 40 0 0 0 60 276 Z" fill="#333D51"/>
</svg>`;
}

function generateWashSponge() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300" width="300" height="300">
  <!-- Ground Shadow -->
  <ellipse cx="150" cy="238" rx="105" ry="10" fill="rgba(21, 51, 74, 0.16)" />

  <!-- Sponge Body -->
  <rect x="50" y="96" width="200" height="116" rx="32" fill="#FFD166" stroke="#15334A" stroke-width="7"/>

  <!-- Pink Top Band -->
  <rect x="50" y="96" width="200" height="48" rx="24" fill="#FF8FA3" stroke="#15334A" stroke-width="6"/>

  <!-- Texture Dots -->
  <circle cx="96" cy="182" r="8" fill="#F6C453" opacity="0.75"/>
  <circle cx="142" cy="194" r="8" fill="#F6C453" opacity="0.75"/>
  <circle cx="188" cy="180" r="8" fill="#F6C453" opacity="0.75"/>

  <!-- Foam Bubbles -->
  <circle cx="90" cy="62" r="14" fill="#FFFFFF" stroke="#15334A" stroke-width="4"/>
  <circle cx="150" cy="44" r="18" fill="#FFFFFF" stroke="#15334A" stroke-width="4"/>
  <circle cx="212" cy="62" r="12" fill="#FFFFFF" stroke="#15334A" stroke-width="4"/>
</svg>`;
}

function generateWashFoam() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300" width="300" height="300">
  <circle cx="108" cy="138" r="55" fill="#FFFFFF" stroke="#15334A" stroke-width="6"/>
  <circle cx="184" cy="118" r="66" fill="#FFFFFF" stroke="#15334A" stroke-width="6"/>
  <circle cx="152" cy="196" r="50" fill="#FFFFFF" stroke="#15334A" stroke-width="6"/>
  <circle cx="88" cy="204" r="40" fill="#FFFFFF" stroke="#15334A" stroke-width="6"/>
  <circle cx="214" cy="186" r="44" fill="#FFFFFF" stroke="#15334A" stroke-width="6"/>

  <!-- Soft Highlights -->
  <circle cx="100" cy="122" r="12" fill="#E3F2FD"/>
  <circle cx="176" cy="100" r="14" fill="#E3F2FD"/>
  <circle cx="146" cy="184" r="10" fill="#E3F2FD"/>
  <circle cx="206" cy="170" r="9" fill="#E3F2FD"/>
  <circle cx="84" cy="192" r="8" fill="#E3F2FD"/>
</svg>`;
}

function generateWashHose() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300" width="300" height="300">
  <!-- Ground Shadow -->
  <ellipse cx="150" cy="252" rx="100" ry="9" fill="rgba(21, 51, 74, 0.16)" />

  <!-- Hose Coil (thick ring with dark outline) -->
  <circle cx="120" cy="168" r="80" fill="none" stroke="#15334A" stroke-width="38"/>
  <circle cx="120" cy="168" r="80" fill="none" stroke="#3997C9" stroke-width="26"/>
  <circle cx="120" cy="168" r="54" fill="#BFE3F5"/>

  <!-- Coil Highlight -->
  <path d="M 64 148 A 80 80 0 0 1 152 90" fill="none" stroke="#FFFFFF" stroke-width="10" stroke-linecap="round" opacity="0.55"/>

  <!-- Nozzle -->
  <path d="M 190 128 L 226 114 L 240 140 L 204 154 Z" fill="#FFD740" stroke="#15334A" stroke-width="6" stroke-linejoin="round"/>
  <path d="M 226 114 L 240 140" stroke="#F9A825" stroke-width="3" stroke-linecap="round"/>

  <!-- Water Drops -->
  <circle cx="258" cy="126" r="7" fill="#65CFFF" stroke="#15334A" stroke-width="3"/>
  <circle cx="272" cy="142" r="5" fill="#65CFFF" stroke="#15334A" stroke-width="2.5"/>
</svg>`;
}

function generateWashTowel() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300" width="300" height="300">
  <!-- Ground Shadow -->
  <ellipse cx="150" cy="242" rx="100" ry="9" fill="rgba(21, 51, 74, 0.16)" />

  <!-- Towel Body -->
  <rect x="50" y="66" width="200" height="164" rx="28" fill="#B3E5FC" stroke="#15334A" stroke-width="7"/>

  <!-- Fold Lines -->
  <path d="M 50 128 Q 150 110 250 128" fill="none" stroke="#FFFFFF" stroke-width="6" opacity="0.8"/>
  <path d="M 50 152 Q 150 134 250 152" fill="none" stroke="#FFFFFF" stroke-width="5" opacity="0.6"/>

  <!-- Corner Stitching -->
  <path d="M 76 92 L 96 92 M 76 92 L 76 112" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round" opacity="0.8"/>
  <path d="M 204 92 L 224 92 M 224 92 L 224 112" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round" opacity="0.8"/>

  <!-- Edge Hem -->
  <rect x="50" y="198" width="200" height="32" rx="16" fill="#4FC3F7" stroke="#15334A" stroke-width="5"/>
</svg>`;
}

function generateParking(isBig) {
  const w = isBig ? 420 : 320;
  const h = isBig ? 260 : 220;
  const lw = isBig ? 356 : 268;
  const lh = isBig ? 196 : 150;
  const lx = isBig ? 32 : 26;
  const ly = isBig ? 32 : 26;
  const stopW = isBig ? 280 : 210;
  const stopX = isBig ? 70 : 55;
  const stopY = isBig ? 56 : 46;
  const chevY = isBig ? 232 : 196;
  const chevW = isBig ? 16 : 12;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
  <!-- Ground -->
  <rect x="10" y="10" width="${w - 20}" height="${h - 20}" rx="18" fill="#DEE6EA" stroke="#15334A" stroke-width="6"/>

  <!-- White Parking Line -->
  <rect x="${lx}" y="${ly}" width="${lw}" height="${lh}" rx="10" fill="none" stroke="#FFFFFF" stroke-width="16"/>

  <!-- Wheel Stop Bar -->
  <rect x="${stopX}" y="${stopY}" width="${stopW}" height="20" rx="10" fill="#90A4AE" stroke="#15334A" stroke-width="4"/>
  <rect x="${stopX}" y="${stopY}" width="${stopW}" height="8" rx="4" fill="#B0BEC5"/>

  <!-- Entry Chevrons -->
  <path d="M ${w / 2} ${chevY} L ${w / 2 - chevW} ${chevY - 22} L ${w / 2 + chevW} ${chevY - 22} Z" fill="#8BC34A" stroke="#15334A" stroke-width="3"/>
  <path d="M ${w / 2} ${chevY - 26} L ${w / 2 - chevW} ${chevY - 48} L ${w / 2 + chevW} ${chevY - 48} Z" fill="#8BC34A" stroke="#15334A" stroke-width="3"/>
</svg>`;
}

const outDir = path.join(__dirname, '..', 'src', 'assets');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

// Generate All Vehicle SVGs
fs.writeFileSync(path.join(outDir, 'car_red.svg'), generateFireEngine(false, false));
fs.writeFileSync(path.join(outDir, 'car_red_big.svg'), generateFireEngine(true, false));

fs.writeFileSync(path.join(outDir, 'car_blue.svg'), generatePoliceCar(false));
fs.writeFileSync(path.join(outDir, 'car_blue_big.svg'), generatePoliceCar(true));

fs.writeFileSync(path.join(outDir, 'car_yellow.svg'), generateDumpTruck(false));
fs.writeFileSync(path.join(outDir, 'car_yellow_big.svg'), generateDumpTruck(true));

fs.writeFileSync(path.join(outDir, 'car_green.svg'), generateGreenTruck(false));
fs.writeFileSync(path.join(outDir, 'car_green_big.svg'), generateGreenTruck(true));

fs.writeFileSync(path.join(outDir, 'car_dirty.svg'), generateFireEngine(false, true));

// Generate Menu Activity Card Icon SVGs
fs.writeFileSync(path.join(outDir, 'menu_signal.svg'), generateMenuSignalSvg());
fs.writeFileSync(path.join(outDir, 'menu_color-garage.svg'), generateMenuColorGarageSvg());
fs.writeFileSync(path.join(outDir, 'menu_big-small.svg'), generateMenuBigSmallSvg());
fs.writeFileSync(path.join(outDir, 'menu_trace.svg'), generateMenuTraceSvg());
fs.writeFileSync(path.join(outDir, 'menu_car-wash.svg'), generateMenuCarWashSvg());
fs.writeFileSync(path.join(outDir, 'menu_puzzle.svg'), generateMenuPuzzleSvg());
fs.writeFileSync(path.join(outDir, 'menu_lights-sound.svg'), generateMenuLightsSoundSvg());
fs.writeFileSync(path.join(outDir, 'menu_line-up.svg'), generateMenuLineUpSvg());

// Generate Garages (color matched to the SVG cars)
fs.writeFileSync(path.join(outDir, 'garage_red.svg'), generateGarage('#FF5252', '#C62828'));
fs.writeFileSync(path.join(outDir, 'garage_blue.svg'), generateGarage('#448AFF', '#1565C0'));
fs.writeFileSync(path.join(outDir, 'garage_yellow.svg'), generateGarage('#FFD740', '#F9A825'));
fs.writeFileSync(path.join(outDir, 'garage_green.svg'), generateGarage('#69F0AE', '#2E7D32'));

// Generate Traffic Signal
fs.writeFileSync(path.join(outDir, 'signal.svg'), generateSignal());

// Generate Wash Tools
fs.writeFileSync(path.join(outDir, 'wash_sponge.svg'), generateWashSponge());
fs.writeFileSync(path.join(outDir, 'wash_foam.svg'), generateWashFoam());
fs.writeFileSync(path.join(outDir, 'wash_hose.svg'), generateWashHose());
fs.writeFileSync(path.join(outDir, 'wash_towel.svg'), generateWashTowel());

// Generate Parking Spaces
fs.writeFileSync(path.join(outDir, 'parking_big.svg'), generateParking(true));
fs.writeFileSync(path.join(outDir, 'parking_small.svg'), generateParking(false));

console.log('Super Cute & Realistic Toy Vehicles generated successfully!');
