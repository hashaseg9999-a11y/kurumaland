import carBlue from '../assets/car_blue.webp';
import carGreen from '../assets/car_green.webp';
import carRed from '../assets/car_red.webp';
import carYellow from '../assets/car_yellow.webp';
import garageBlue from '../assets/garage_blue.webp';
import garageGreen from '../assets/garage_green.webp';
import garageRed from '../assets/garage_red.webp';
import garageYellow from '../assets/garage_yellow.webp';
import menuIcon from '../assets/menu_trace.webp';
import type { Activity, ActivityContext } from '../core/activity';

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
const VIEWBOX_WIDTH = 1_000;
const VIEWBOX_HEIGHT = 600;
const SAMPLE_COUNT = 520;
const FOLLOW_DISTANCE = 104;

interface Point {
  x: number;
  y: number;
}

interface PathSample extends Point {
  length: number;
}

interface Course {
  path: string;
}

const COURSES: readonly Course[] = [
  { path: 'M 125 355 L 865 355' },
  { path: 'M 120 410 C 285 145 545 500 865 245' },
  { path: 'M 120 420 L 285 215 L 445 420 L 620 220 L 865 355' },
];

const VEHICLES = [
  { car: carRed, garage: garageRed },
  { car: carBlue, garage: garageBlue },
  { car: carYellow, garage: garageYellow },
  { car: carGreen, garage: garageGreen },
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
  private svg: SVGSVGElement | null = null;
  private pathElement: SVGPathElement | null = null;
  private carGroup: SVGGElement | null = null;
  private abortController: AbortController | null = null;
  private readonly timers = new Set<number>();
  private readonly animations = new Set<Animation>();
  private samples: PathSample[] = [];
  private totalLength = 0;
  private progressLength = 0;
  private progressSampleIndex = 0;
  private courseIndex = 0;
  private vehicleIndex = 0;
  private activePointerId: number | null = null;
  private lastPointerPoint: Point | null = null;
  private completing = false;

  private readonly handlePointerDown = (event: PointerEvent): void => {
    if (
      !this.svg ||
      this.completing ||
      this.activePointerId !== null ||
      event.button !== 0
    ) {
      return;
    }

    const pointerPoint = this.toLocalPoint(event);
    const currentPoint = this.pointAtProgress();
    if (!pointerPoint || !currentPoint) {
      return;
    }

    const startDistance = Math.hypot(
      pointerPoint.x - currentPoint.x,
      pointerPoint.y - currentPoint.y,
    );
    if (startDistance > FOLLOW_DISTANCE + 34) {
      return;
    }

    event.preventDefault();
    this.activePointerId = event.pointerId;
    this.lastPointerPoint = pointerPoint;
    this.svg.setPointerCapture(event.pointerId);
    this.advanceToward(pointerPoint, 84);
  };

  private readonly handlePointerMove = (event: PointerEvent): void => {
    if (event.pointerId !== this.activePointerId || this.completing) {
      return;
    }

    const pointerPoint = this.toLocalPoint(event);
    if (!pointerPoint) {
      return;
    }

    event.preventDefault();
    const previousPoint = this.lastPointerPoint ?? pointerPoint;
    const pointerTravel = Math.hypot(
      pointerPoint.x - previousPoint.x,
      pointerPoint.y - previousPoint.y,
    );
    this.lastPointerPoint = pointerPoint;
    this.advanceToward(pointerPoint, Math.max(84, pointerTravel * 2.4 + 42));
  };

  private readonly handlePointerEnd = (event: PointerEvent): void => {
    if (event.pointerId !== this.activePointerId) {
      return;
    }

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
        background:
          radial-gradient(circle at 76% 18%, rgb(255 255 255 / 78%), transparent 24%),
          linear-gradient(#cceeff 0 42%, #bde7a5 42% 100%);
      }

      .kl-trace__svg {
        display: block;
        width: 100%;
        height: 100%;
        touch-action: none;
      }

      .kl-trace__road-edge {
        fill: none;
        stroke: #6d7880;
        stroke-linecap: round;
        stroke-linejoin: round;
        stroke-width: 94;
      }

      .kl-trace__road {
        fill: none;
        stroke: #aab5bc;
        stroke-linecap: round;
        stroke-linejoin: round;
        stroke-width: 78;
      }

      .kl-trace__guide {
        fill: none;
        stroke: rgb(255 255 255 / 50%);
        stroke-dasharray: 9 30;
        stroke-linecap: round;
        stroke-width: 8;
      }

      .kl-trace__start-ring {
        fill: rgb(255 255 255 / 35%);
        stroke: rgb(255 255 255 / 78%);
        stroke-width: 7;
      }

      .kl-trace__garage,
      .kl-trace__car {
        pointer-events: none;
      }

      @media (prefers-reduced-motion: reduce) {
        .kl-trace * {
          animation-duration: 1ms !important;
        }
      }
    `;

    const svg = createSvgElement('svg');
    svg.classList.add('kl-trace__svg');
    setAttributes(svg, {
      viewBox: `0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`,
      preserveAspectRatio: 'xMidYMid meet',
      role: 'img',
      'aria-label': '太い道を車でなぞる遊び',
    });

    wrapper.append(style, svg);
    context.root.replaceChildren(wrapper);
    this.wrapper = wrapper;
    this.svg = svg;

    const listenerOptions = { signal: this.abortController.signal };
    svg.addEventListener('pointerdown', this.handlePointerDown, listenerOptions);
    svg.addEventListener('pointermove', this.handlePointerMove, listenerOptions);
    svg.addEventListener('pointerup', this.handlePointerEnd, listenerOptions);
    svg.addEventListener('pointercancel', this.handlePointerEnd, listenerOptions);
    svg.addEventListener('lostpointercapture', this.handlePointerEnd, listenerOptions);

    this.renderCourse();
  }

  unmount(): void {
    this.abortController?.abort();
    this.abortController = null;

    for (const timer of this.timers) {
      window.clearTimeout(timer);
    }
    this.timers.clear();

    for (const animation of this.animations) {
      animation.cancel();
    }
    this.animations.clear();

    if (this.svg && this.activePointerId !== null) {
      this.releasePointer(this.activePointerId);
    }

    this.wrapper?.remove();
    this.context = null;
    this.wrapper = null;
    this.svg = null;
    this.pathElement = null;
    this.carGroup = null;
    this.samples = [];
    this.totalLength = 0;
    this.progressLength = 0;
    this.progressSampleIndex = 0;
    this.activePointerId = null;
    this.lastPointerPoint = null;
    this.completing = false;
  }

  private renderCourse(): void {
    if (!this.svg) {
      return;
    }

    for (const animation of this.animations) {
      animation.cancel();
    }
    this.animations.clear();
    this.releaseActivePointer();
    this.completing = false;
    this.progressLength = 0;
    this.progressSampleIndex = 0;

    const course = COURSES[this.courseIndex];
    const vehicle = VEHICLES[this.vehicleIndex];
    if (!course || !vehicle) {
      return;
    }

    this.svg.replaceChildren();

    const roadEdge = createSvgElement('path');
    roadEdge.classList.add('kl-trace__road-edge');
    roadEdge.setAttribute('d', course.path);

    const road = createSvgElement('path');
    road.classList.add('kl-trace__road');
    road.setAttribute('d', course.path);

    const guide = createSvgElement('path');
    guide.classList.add('kl-trace__guide');
    guide.setAttribute('d', course.path);

    this.svg.append(roadEdge, road, guide);
    this.pathElement = road;
    this.totalLength = road.getTotalLength();
    this.samples = [];

    for (let index = 0; index <= SAMPLE_COUNT; index += 1) {
      const length = (this.totalLength * index) / SAMPLE_COUNT;
      const point = road.getPointAtLength(length);
      this.samples.push({ x: point.x, y: point.y, length });
    }

    const start = road.getPointAtLength(0);
    const end = road.getPointAtLength(this.totalLength);

    const startRing = createSvgElement('circle');
    startRing.classList.add('kl-trace__start-ring');
    setAttributes(startRing, { cx: start.x, cy: start.y, r: 62 });

    const garage = createSvgElement('image');
    garage.classList.add('kl-trace__garage');
    setAttributes(garage, {
      href: vehicle.garage,
      x: end.x - 72,
      y: end.y - 118,
      width: 156,
      height: 142,
      preserveAspectRatio: 'xMidYMid meet',
    });

    const carGroup = createSvgElement('g');
    carGroup.classList.add('kl-trace__car');
    const car = createSvgElement('image');
    setAttributes(car, {
      href: vehicle.car,
      x: -62,
      y: -55,
      width: 124,
      height: 93,
      preserveAspectRatio: 'xMidYMid meet',
    });
    carGroup.append(car);

    this.svg.append(startRing, garage, carGroup);
    this.carGroup = carGroup;
    this.updateCarPosition();
  }

  private advanceToward(pointerPoint: Point, allowedAdvance: number): void {
    if (!this.pathElement || this.samples.length === 0) {
      return;
    }

    const maximumLength = Math.min(
      this.totalLength,
      this.progressLength + Math.min(190, allowedAdvance),
    );
    let nearestIndex = this.progressSampleIndex;
    let nearestDistance = Number.POSITIVE_INFINITY;

    for (
      let index = this.progressSampleIndex;
      index < this.samples.length;
      index += 1
    ) {
      const sample = this.samples[index];
      if (!sample || sample.length > maximumLength) {
        break;
      }

      const distance = Math.hypot(
        pointerPoint.x - sample.x,
        pointerPoint.y - sample.y,
      );
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    }

    const nearestSample = this.samples[nearestIndex];
    if (
      !nearestSample ||
      nearestDistance > FOLLOW_DISTANCE ||
      nearestSample.length <= this.progressLength
    ) {
      return;
    }

    this.progressSampleIndex = nearestIndex;
    this.progressLength = nearestSample.length;
    this.updateCarPosition();

    if (this.progressLength >= this.totalLength * 0.94) {
      this.completeCourse();
    }
  }

  private updateCarPosition(): void {
    if (!this.pathElement || !this.carGroup) {
      return;
    }

    const length = Math.min(this.totalLength, this.progressLength);
    const point = this.pathElement.getPointAtLength(length);
    const before = this.pathElement.getPointAtLength(Math.max(0, length - 3));
    const after = this.pathElement.getPointAtLength(
      Math.min(this.totalLength, length + 3),
    );
    const angle = (Math.atan2(after.y - before.y, after.x - before.x) * 180) /
      Math.PI;
    this.carGroup.setAttribute(
      'transform',
      `translate(${point.x} ${point.y}) rotate(${angle})`,
    );
  }

  private completeCourse(): void {
    if (this.completing || !this.context || !this.carGroup) {
      return;
    }

    this.completing = true;
    this.progressLength = this.totalLength;
    this.updateCarPosition();
    this.releaseActivePointer();
    this.context.sfx.play('chime');
    this.context.speech.speak('arrived');
    this.context.notifyTaskComplete();

    const garageAnimation = this.carGroup.animate(
      [
        { opacity: 1 },
        { opacity: 0.18 },
      ],
      {
        duration: 620,
        easing: 'ease-in',
        fill: 'forwards',
      },
    );
    this.trackAnimation(garageAnimation);

    const completedSet = this.courseIndex === COURSES.length - 1;
    if (completedSet) {
      this.schedule(() => {
        this.context?.sfx.play('applause');
        this.context?.speech.speak('wellDone');
      }, 720);
    }

    this.schedule(() => {
      if (completedSet) {
        this.courseIndex = 0;
        this.vehicleIndex = (this.vehicleIndex + 1) % VEHICLES.length;
      } else {
        this.courseIndex += 1;
      }
      this.renderCourse();
    }, completedSet ? 1_720 : 1_220);
  }

  private pointAtProgress(): Point | null {
    if (!this.pathElement) {
      return null;
    }

    const point = this.pathElement.getPointAtLength(this.progressLength);
    return { x: point.x, y: point.y };
  }

  private toLocalPoint(event: PointerEvent): Point | null {
    if (!this.svg) {
      return null;
    }

    const matrix = this.svg.getScreenCTM();
    if (!matrix) {
      return null;
    }

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

  private schedule(callback: () => void, delay: number): void {
    const timer = window.setTimeout(() => {
      this.timers.delete(timer);
      callback();
    }, delay);
    this.timers.add(timer);
  }

  private trackAnimation(animation: Animation): void {
    this.animations.add(animation);
    void animation.finished
      .catch(() => undefined)
      .finally(() => this.animations.delete(animation));
  }
}

export const traceActivity: Activity = new TraceActivity();
