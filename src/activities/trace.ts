import bgGarage from '../assets/bg_garage.webp';
import carBlue from '../assets/car_blue.svg';
import carGreen from '../assets/car_green.svg';
import carRed from '../assets/car_red.svg';
import carYellow from '../assets/car_yellow.svg';
import garageBlue from '../assets/garage_blue.svg';
import garageGreen from '../assets/garage_green.svg';
import garageRed from '../assets/garage_red.svg';
import garageYellow from '../assets/garage_yellow.svg';
import menuIcon from '../assets/menu_trace.svg';
import type { Activity, ActivityContext } from '../core/activity';
import { getI18nText } from '../core/i18n';
import { ParticleSystem } from '../core/particles';

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
const VIEWBOX_WIDTH = 1_000;
const VIEWBOX_HEIGHT = 600;
const SAMPLE_COUNT = 520;
const FOLLOW_DISTANCE = 120;

interface Point {
  x: number;
  y: number;
}

interface PathSample extends Point {
  length: number;
}

interface Course {
  path: string;
  nameJa: string;
  starPositions: number[]; // 0.0 to 1.0
}

const COURSES: readonly Course[] = [
  {
    path: 'M 125 355 L 865 355',
    nameJa: 'まっすぐな みち',
    starPositions: [0.25, 0.5, 0.75],
  },
  {
    path: 'M 120 410 C 285 145 545 500 865 245',
    nameJa: 'おやまの なみなみ みち',
    starPositions: [0.2, 0.45, 0.7, 0.88],
  },
  {
    path: 'M 120 420 L 285 215 L 445 420 L 620 220 L 865 355',
    nameJa: 'じぐざぐ ドライブ',
    starPositions: [0.18, 0.4, 0.65, 0.85],
  },
  {
    path: 'M 120 280 C 250 480 400 120 600 480 C 750 200 820 320 865 320',
    nameJa: 'るーぷ コース',
    starPositions: [0.2, 0.4, 0.6, 0.8],
  },
];

const VEHICLES = [
  { car: carRed, garage: garageRed, nameJa: 'しょうぼうしゃ' },
  { car: carBlue, garage: garageBlue, nameJa: 'パトカー' },
  { car: carYellow, garage: garageYellow, nameJa: 'ダンプカー' },
  { car: carGreen, garage: garageGreen, nameJa: 'トラック' },
] as const;

function createSvgElement<K extends keyof SVGElementTagNameMap>(
  tagName: K,
): SVGElementTagNameMap[K] {
  return document.createElementNS(SVG_NAMESPACE, tagName);
}

function setAttributes(
  element: Element,
  attributes: Readonly<Record<string, string | number>>,
): void {
  for (const [name, value] of Object.entries(attributes)) {
    element.setAttribute(name, String(value));
  }
}

class TraceActivity implements Activity {
  readonly id = 'trace';
  readonly menuIcon = menuIcon;

  private context: ActivityContext | null = null;
  private wrapper: HTMLDivElement | null = null;
  private banner: HTMLDivElement | null = null;
  private svg: SVGSVGElement | null = null;
  private pathElement: SVGPathElement | null = null;
  private rainbowPath: SVGPathElement | null = null;
  private carGroup: SVGGElement | null = null;
  private abortController: AbortController | null = null;
  private particles: ParticleSystem | null = null;
  private samples: PathSample[] = [];
  private totalLength = 0;
  private progressLength = 0;
  private progressSampleIndex = 0;
  private courseIndex = 0;
  private vehicleIndex = 0;
  private activePointerId: number | null = null;
  private lastPointerPoint: Point | null = null;
  private collectedStars = new Set<number>();
  private starElements: SVGGElement[] = [];
  private completing = false;

  private readonly handlePointerDown = (event: PointerEvent): void => {
    if (!this.svg || this.completing || this.activePointerId !== null || event.button !== 0) {
      return;
    }

    const pointerPoint = this.toLocalPoint(event);
    const currentPoint = this.pointAtProgress();
    if (!pointerPoint || !currentPoint) return;

    const startDistance = Math.hypot(pointerPoint.x - currentPoint.x, pointerPoint.y - currentPoint.y);
    if (startDistance > FOLLOW_DISTANCE + 50) return;

    event.preventDefault();
    this.activePointerId = event.pointerId;
    this.lastPointerPoint = pointerPoint;
    this.svg.setPointerCapture(event.pointerId);
    this.context?.sfx.play('pop');
    this.advanceToward(pointerPoint, 100);
  };

  private readonly handlePointerMove = (event: PointerEvent): void => {
    if (event.pointerId !== this.activePointerId || this.completing) return;
    const pointerPoint = this.toLocalPoint(event);
    if (!pointerPoint) return;

    event.preventDefault();
    const previousPoint = this.lastPointerPoint ?? pointerPoint;
    const pointerTravel = Math.hypot(pointerPoint.x - previousPoint.x, pointerPoint.y - previousPoint.y);
    this.lastPointerPoint = pointerPoint;

    // なぞり軌跡に星や虹パーティクルを散らす
    if (this.particles && this.svg) {
      const svgRect = this.svg.getBoundingClientRect();
      const sX = svgRect.left + (pointerPoint.x / VIEWBOX_WIDTH) * svgRect.width;
      const sY = svgRect.top + (pointerPoint.y / VIEWBOX_HEIGHT) * svgRect.height;
      this.particles.emitSparkles(sX, sY, 3, '#ffd700');
      this.particles.emitRainbowTrail(sX, sY);
    }

    this.advanceToward(pointerPoint, Math.max(100, pointerTravel * 2.5 + 50));
  };

  private readonly handlePointerEnd = (event: PointerEvent): void => {
    if (event.pointerId !== this.activePointerId) return;
    this.releasePointer(event.pointerId);
  };

  mount(context: ActivityContext): void {
    this.unmount();
    this.context = context;
    this.abortController = new AbortController();

    const wrapper = document.createElement('div');
    wrapper.className = 'kl-trace';

    const style = document.createElement('style');
    style.textContent = `
      .kl-trace {
        position: absolute;
        inset: 0;
        overflow: hidden;
        background: #dff4ff url("${bgGarage}") center / cover no-repeat;
        touch-action: none;
      }

      .kl-trace__banner {
        position: absolute;
        top: max(16px, env(safe-area-inset-top));
        left: 50%;
        transform: translateX(-50%);
        z-index: 10;
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 8px 26px;
        border: 4px solid #ffffff;
        border-radius: 30px;
        background: rgb(255 255 255 / 94%);
        box-shadow: 0 8px 20px rgb(21 51 74 / 16%);
        font-size: clamp(15px, 2.2vw, 22px);
        font-weight: 800;
        color: #15334a;
        pointer-events: none;
      }

      .kl-trace__svg {
        display: block;
        width: 100%;
        height: 100%;
        touch-action: none;
      }

      .kl-trace__road-edge {
        fill: none;
        stroke: #37474f;
        stroke-linecap: round;
        stroke-linejoin: round;
        stroke-width: 102;
      }

      .kl-trace__road {
        fill: none;
        stroke: #78909c;
        stroke-linecap: round;
        stroke-linejoin: round;
        stroke-width: 86;
      }

      .kl-trace__rainbow {
        fill: none;
        stroke: #ffca28;
        stroke-linecap: round;
        stroke-linejoin: round;
        stroke-width: 80;
        opacity: 0.85;
      }

      .kl-trace__guide {
        fill: none;
        stroke: #ffffff;
        stroke-dasharray: 12 28;
        stroke-linecap: round;
        stroke-width: 10;
        opacity: 0.85;
      }

      .kl-trace__start-ring {
        fill: rgba(255, 235, 59, 0.45);
        stroke: #ffeb3b;
        stroke-width: 8;
        animation: snap-pulse 1.5s ease-in-out infinite;
      }

      .kl-trace__star-item {
        transform-origin: center;
        transition: transform 250ms ease, opacity 250ms ease;
      }

      .kl-trace__star-item.is-collected {
        transform: scale(1.6);
        opacity: 0;
      }

      .kl-trace__garage,
      .kl-trace__car {
        pointer-events: none;
      }
    `;

    const currentLang = context.speech.getLanguage();
    const banner = document.createElement('div');
    banner.className = 'kl-trace__banner';
    banner.textContent = `🌟 ${getI18nText('traceHint', currentLang)}`;
    this.banner = banner;

    const svg = createSvgElement('svg');
    svg.classList.add('kl-trace__svg');
    setAttributes(svg, {
      viewBox: `0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`,
      preserveAspectRatio: 'xMidYMid meet',
      role: 'img',
      'aria-label': 'みちを なぞろう',
    });

    wrapper.append(style, banner, svg);
    context.root.replaceChildren(wrapper);
    this.wrapper = wrapper;
    this.svg = svg;
    this.particles = new ParticleSystem(wrapper);

    const listenerOptions = { signal: this.abortController.signal };
    svg.addEventListener('pointerdown', this.handlePointerDown, listenerOptions);
    svg.addEventListener('pointermove', this.handlePointerMove, listenerOptions);
    svg.addEventListener('pointerup', this.handlePointerEnd, listenerOptions);
    svg.addEventListener('pointercancel', this.handlePointerEnd, listenerOptions);

    context.speech.speak('startTrace');
    this.renderCourse();
  }

  unmount(): void {
    this.abortController?.abort();
    this.abortController = null;
    this.particles?.destroy();
    this.particles = null;
    this.wrapper?.remove();
    this.context = null;
    this.banner = null;
    this.wrapper = null;
    this.svg = null;
    this.pathElement = null;
    this.rainbowPath = null;
    this.carGroup = null;
    this.samples = [];
    this.starElements = [];
    this.collectedStars.clear();
    this.totalLength = 0;
    this.progressLength = 0;
    this.progressSampleIndex = 0;
    this.activePointerId = null;
    this.lastPointerPoint = null;
    this.completing = false;
  }

  private renderCourse(): void {
    if (!this.svg) return;
    this.releaseActivePointer();
    this.completing = false;
    this.progressLength = 0;
    this.progressSampleIndex = 0;
    this.collectedStars.clear();
    this.starElements = [];

    const course = COURSES[this.courseIndex];
    const vehicle = VEHICLES[this.vehicleIndex];
    if (!course || !vehicle) return;

    if (this.banner && this.context) {
      const currentLang = this.context.speech.getLanguage();
      this.banner.textContent = `🌟 ${getI18nText('traceCollectStars', currentLang)}`;
    }

    this.svg.replaceChildren();

    const roadEdge = createSvgElement('path');
    roadEdge.classList.add('kl-trace__road-edge');
    roadEdge.setAttribute('d', course.path);

    const road = createSvgElement('path');
    road.classList.add('kl-trace__road');
    road.setAttribute('d', course.path);

    const rainbow = createSvgElement('path');
    rainbow.classList.add('kl-trace__rainbow');
    rainbow.setAttribute('d', course.path);
    rainbow.style.strokeDasharray = '0 10000';

    const guide = createSvgElement('path');
    guide.classList.add('kl-trace__guide');
    guide.setAttribute('d', course.path);

    this.svg.append(roadEdge, road, rainbow, guide);
    this.pathElement = road;
    this.rainbowPath = rainbow;
    this.totalLength = road.getTotalLength();
    this.samples = [];

    for (let index = 0; index <= SAMPLE_COUNT; index += 1) {
      const length = (this.totalLength * index) / SAMPLE_COUNT;
      const point = road.getPointAtLength(length);
      this.samples.push({ x: point.x, y: point.y, length });
    }

    // コース上の星を配置
    course.starPositions.forEach((posRatio, sIdx) => {
      const sPoint = road.getPointAtLength(this.totalLength * posRatio);
      const starG = createSvgElement('g');
      starG.classList.add('kl-trace__star-item');
      starG.setAttribute('transform', `translate(${sPoint.x}, ${sPoint.y})`);

      const starShape = createSvgElement('polygon');
      const rOut = 20;
      const rIn = 9;
      let pts = '';
      for (let i = 0; i < 5; i++) {
        const a1 = (Math.PI * 2 * i) / 5 - Math.PI / 2;
        const a2 = a1 + Math.PI / 5;
        pts += `${Math.cos(a1) * rOut},${Math.sin(a1) * rOut} ${Math.cos(a2) * rIn},${Math.sin(a2) * rIn} `;
      }
      setAttributes(starShape, {
        points: pts.trim(),
        fill: '#ffd700',
        stroke: '#ff6f00',
        'stroke-width': '2.5',
      });

      starG.append(starShape);
      this.svg?.append(starG);
      this.starElements[sIdx] = starG;
    });

    const start = road.getPointAtLength(0);
    const end = road.getPointAtLength(this.totalLength);

    const startRing = createSvgElement('circle');
    startRing.classList.add('kl-trace__start-ring');
    setAttributes(startRing, { cx: start.x, cy: start.y, r: 60 });

    const garage = createSvgElement('image');
    garage.classList.add('kl-trace__garage');
    setAttributes(garage, {
      href: vehicle.garage,
      x: end.x - 80,
      y: end.y - 130,
      width: 170,
      height: 155,
      preserveAspectRatio: 'xMidYMid meet',
    });

    const carGroup = createSvgElement('g');
    carGroup.classList.add('kl-trace__car');
    const car = createSvgElement('image');
    setAttributes(car, {
      href: vehicle.car,
      x: -70,
      y: -60,
      width: 140,
      height: 105,
      preserveAspectRatio: 'xMidYMid meet',
    });
    carGroup.append(car);

    this.svg.append(startRing, garage, carGroup);
    this.carGroup = carGroup;
    this.updateCarPosition();
  }

  private advanceToward(pointerPoint: Point, allowedAdvance: number): void {
    if (!this.pathElement || this.samples.length === 0) return;

    const maximumLength = Math.min(this.totalLength, this.progressLength + Math.min(220, allowedAdvance));
    let nearestIndex = this.progressSampleIndex;
    let nearestDistance = Number.POSITIVE_INFINITY;

    for (let index = this.progressSampleIndex; index < this.samples.length; index += 1) {
      const sample = this.samples[index];
      if (!sample || sample.length > maximumLength) break;

      const distance = Math.hypot(pointerPoint.x - sample.x, pointerPoint.y - sample.y);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    }

    const nearestSample = this.samples[nearestIndex];
    if (!nearestSample || nearestDistance > FOLLOW_DISTANCE || nearestSample.length <= this.progressLength) {
      return;
    }

    this.progressSampleIndex = nearestIndex;
    this.progressLength = nearestSample.length;
    this.updateCarPosition();
    this.checkStarCollection();

    if (this.progressLength >= this.totalLength * 0.94) {
      this.completeCourse();
    }
  }

  private checkStarCollection(): void {
    const course = COURSES[this.courseIndex];
    if (!course || !this.svg) return;

    const currentRatio = this.progressLength / this.totalLength;
    course.starPositions.forEach((posRatio, idx) => {
      if (currentRatio >= posRatio - 0.04 && !this.collectedStars.has(idx)) {
        this.collectedStars.add(idx);
        const starEl = this.starElements[idx];
        if (starEl) {
          starEl.classList.add('is-collected');
        }

        // 星ゲット音＆エフェクト
        this.context?.sfx.play('sparkle');
        this.context?.sfx.playScale(idx + 2); // 音階がステップアップ

        const sPoint = this.pathElement?.getPointAtLength(this.totalLength * posRatio);
        if (sPoint && this.particles && this.svg) {
          const svgRect = this.svg.getBoundingClientRect();
          const sX = svgRect.left + (sPoint.x / VIEWBOX_WIDTH) * svgRect.width;
          const sY = svgRect.top + (sPoint.y / VIEWBOX_HEIGHT) * svgRect.height;
          this.particles.emitStars(sX, sY, 14, ['#ffd700', '#ff9100', '#ffffff']);
          this.particles.emitMusicNotes(sX, sY - 15, 2);
        }
      }
    });
  }

  private updateCarPosition(): void {
    if (!this.pathElement || !this.carGroup) return;

    const length = Math.min(this.totalLength, this.progressLength);
    const point = this.pathElement.getPointAtLength(length);
    const before = this.pathElement.getPointAtLength(Math.max(0, length - 4));
    const after = this.pathElement.getPointAtLength(Math.min(this.totalLength, length + 4));
    const angle = (Math.atan2(after.y - before.y, after.x - before.x) * 180) / Math.PI;
    this.carGroup.setAttribute('transform', `translate(${point.x} ${point.y}) rotate(${angle})`);

    if (this.rainbowPath) {
      this.rainbowPath.style.strokeDasharray = `${length} ${this.totalLength}`;
    }
  }

  private completeCourse(): void {
    if (this.completing || !this.context || !this.carGroup) return;

    this.completing = true;
    this.progressLength = this.totalLength;
    this.updateCarPosition();
    this.releaseActivePointer();

    this.context.notifyTaskComplete();
    this.context.sfx.play('fanfare');
    this.context.speech.speak('goal');

    if (this.banner) {
      const currentLang = this.context.speech.getLanguage();
      this.banner.textContent = `🎉 ${getI18nText('traceAllStars', currentLang)}`;
    }

    if (this.particles && this.wrapper) {
      const rect = this.wrapper.getBoundingClientRect();
      this.particles.emitCelebration(rect.width / 2, rect.height * 0.45);
      this.particles.emitFlowers(rect.width / 2, rect.height * 0.45, 12);
    }

    window.setTimeout(() => {
      this.courseIndex = (this.courseIndex + 1) % COURSES.length;
      if (this.courseIndex === 0) {
        this.vehicleIndex = (this.vehicleIndex + 1) % VEHICLES.length;
      }
      this.renderCourse();
    }, 2400);
  }

  private pointAtProgress(): Point | null {
    if (!this.pathElement) return null;
    const point = this.pathElement.getPointAtLength(this.progressLength);
    return { x: point.x, y: point.y };
  }

  private toLocalPoint(event: PointerEvent): Point | null {
    if (!this.svg) return null;
    const matrix = this.svg.getScreenCTM();
    if (!matrix) return null;
    const point = this.svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const localPoint = point.matrixTransform(matrix.inverse());
    return { x: localPoint.x, y: localPoint.y };
  }

  private releaseActivePointer(): void {
    if (this.activePointerId !== null) {
      this.releasePointer(this.activePointerId);
    }
  }

  private releasePointer(pointerId: number): void {
    this.activePointerId = null;
    this.lastPointerPoint = null;
    if (this.svg?.hasPointerCapture(pointerId)) {
      this.svg.releasePointerCapture(pointerId);
    }
  }
}

export function createTraceActivity(): Activity {
  return new TraceActivity();
}
export const traceActivity: Activity = new TraceActivity();
