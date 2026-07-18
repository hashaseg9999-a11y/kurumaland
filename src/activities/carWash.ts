import carClean from '../assets/car_red.webp';
import carDirty from '../assets/car_dirty.webp';
import menuIcon from '../assets/menu_car-wash.webp';
import washFoam from '../assets/wash_foam.webp';
import washSponge from '../assets/wash_sponge.webp';
import washTowel from '../assets/wash_towel.webp';
import type { Activity, ActivityContext } from '../core/activity';

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const REQUIRED_COVERAGE = 0.7;
const BRUSH_RADIUS = 70;

type WashStep = 0 | 1 | 2;

interface Point {
  x: number;
  y: number;
}

const TOOL_LABELS = ['スポンジ', 'ホース', 'タオル'] as const;

function makeCoveragePoints(): readonly Point[] {
  const points: Point[] = [];
  const columns = 14;
  const rows = 7;

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      points.push({
        x: 105 + (590 * column) / (columns - 1),
        y: 205 + (230 * row) / (rows - 1),
      });
    }
  }

  return points;
}

const COVERAGE_POINTS = makeCoveragePoints();

function createHoseIcon(): SVGSVGElement {
  const svg = document.createElementNS(SVG_NAMESPACE, 'svg');
  svg.setAttribute('viewBox', '0 0 100 100');
  svg.setAttribute('aria-hidden', 'true');
  svg.classList.add('kl-wash__hose-icon');

  const coil = document.createElementNS(SVG_NAMESPACE, 'path');
  coil.setAttribute('d', 'M28 67 C8 48 23 18 50 25 C79 32 77 67 54 72 C37 76 29 64 38 53');
  coil.setAttribute('fill', 'none');
  coil.setAttribute('stroke', '#3997c9');
  coil.setAttribute('stroke-width', '10');
  coil.setAttribute('stroke-linecap', 'round');

  const nozzle = document.createElementNS(SVG_NAMESPACE, 'path');
  nozzle.setAttribute('d', 'M55 47 L84 20 L92 30 L64 57 Z');
  nozzle.setAttribute('fill', '#ffd15c');
  nozzle.setAttribute('stroke', '#4c5960');
  nozzle.setAttribute('stroke-width', '5');
  nozzle.setAttribute('stroke-linejoin', 'round');

  const drop = document.createElementNS(SVG_NAMESPACE, 'path');
  drop.setAttribute('d', 'M83 47 C76 58 75 62 75 67 A9 9 0 0 0 93 67 C93 62 90 56 83 47Z');
  drop.setAttribute('fill', '#65cfff');

  svg.append(coil, nozzle, drop);
  return svg;
}

class CarWashActivity implements Activity {
  readonly id = 'car-wash';
  readonly menuIcon = menuIcon;

  private context: ActivityContext | null = null;
  private wrapper: HTMLDivElement | null = null;
  private carZone: HTMLDivElement | null = null;
  private carVisual: HTMLDivElement | null = null;
  private dirtyCar: HTMLImageElement | null = null;
  private foamCanvas: HTMLCanvasElement | null = null;
  private effectCanvas: HTMLCanvasElement | null = null;
  private floatingTool: HTMLDivElement | null = null;
  private stars: HTMLDivElement | null = null;
  private foamTexture: HTMLImageElement | null = null;
  private toolButtons: HTMLButtonElement[] = [];
  private abortController: AbortController | null = null;
  private readonly timers = new Set<number>();
  private readonly animations = new Set<Animation>();
  private step: WashStep = 0;
  private coverage = new Set<number>();
  private activePointerId: number | null = null;
  private activeToolButton: HTMLButtonElement | null = null;
  private lastStrokePoint: Point | null = null;
  private lastSoundAt = 0;
  private waterSpoken = false;
  private completing = false;

  private readonly handleToolPointerDown = (event: PointerEvent): void => {
    const button = event.currentTarget;
    if (!(button instanceof HTMLButtonElement) || event.button !== 0) {
      return;
    }

    const toolIndex = Number(button.dataset.toolIndex);
    if (!Number.isInteger(toolIndex) || toolIndex < 0 || toolIndex > 2) {
      return;
    }

    event.preventDefault();
    if (this.completing || toolIndex !== this.step) {
      this.shakeTool(button);
      return;
    }

    if (this.activePointerId !== null) {
      return;
    }

    this.activePointerId = event.pointerId;
    this.activeToolButton = button;
    this.lastStrokePoint = null;
    button.setPointerCapture(event.pointerId);
    this.showFloatingTool(button, event);
    this.applyPointer(event);
  };

  private readonly handlePointerMove = (event: PointerEvent): void => {
    if (event.pointerId !== this.activePointerId || this.completing) {
      return;
    }

    event.preventDefault();
    this.positionFloatingTool(event);
    this.applyPointer(event);
  };

  private readonly handlePointerEnd = (event: PointerEvent): void => {
    if (event.pointerId === this.activePointerId) {
      this.endDrag(event.pointerId);
    }
  };

  mount(context: ActivityContext): void {
    this.unmount();
    this.context = context;
    this.abortController = new AbortController();

    const wrapper = document.createElement('div');
    wrapper.className = 'kl-wash';

    const style = document.createElement('style');
    style.textContent = `
      .kl-wash {
        position: absolute;
        inset: 0;
        overflow: hidden;
        background:
          radial-gradient(circle at 50% 30%, rgb(255 255 255 / 88%), transparent 35%),
          linear-gradient(180deg, #d7f3ff 0 69%, #d7e5eb 69% 100%);
        touch-action: none;
      }

      .kl-wash__bay {
        position: absolute;
        top: clamp(90px, 12vh, 122px);
        left: 50%;
        width: min(62vw, 700px);
        aspect-ratio: 4 / 3;
        transform: translateX(-50%);
      }

      .kl-wash__visual,
      .kl-wash__car,
      .kl-wash__canvas,
      .kl-wash__stars {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
      }

      .kl-wash__visual {
        transform: translateX(0);
      }

      .kl-wash__car {
        object-fit: contain;
        pointer-events: none;
      }

      .kl-wash__dirty {
        opacity: 1;
      }

      .kl-wash__canvas {
        pointer-events: none;
      }

      .kl-wash__stars {
        pointer-events: none;
      }

      .kl-wash__star {
        position: absolute;
        width: clamp(24px, 3.4vw, 42px);
        aspect-ratio: 1;
        opacity: 0;
        transform: scale(0.65);
      }

      .kl-wash__star::before,
      .kl-wash__star::after {
        position: absolute;
        inset: 44% 0;
        border-radius: 999px;
        background: #fff4a6;
        box-shadow: 0 0 12px rgb(255 240 126 / 72%);
        content: '';
      }

      .kl-wash__star::after {
        transform: rotate(90deg);
      }

      .kl-wash__star:nth-child(1) { top: 27%; left: 17%; }
      .kl-wash__star:nth-child(2) { top: 18%; left: 48%; }
      .kl-wash__star:nth-child(3) { top: 31%; right: 13%; }

      .kl-wash__stars.is-visible .kl-wash__star {
        opacity: 0.86;
        transform: scale(1);
        transition: opacity 260ms ease, transform 260ms ease;
      }

      .kl-wash__tray {
        position: absolute;
        right: max(24px, env(safe-area-inset-right));
        bottom: max(18px, env(safe-area-inset-bottom));
        left: max(116px, calc(env(safe-area-inset-left) + 108px));
        display: flex;
        height: clamp(104px, 18vh, 148px);
        align-items: center;
        justify-content: center;
        gap: clamp(22px, 5vw, 70px);
        border: 4px solid rgb(57 89 107 / 10%);
        border-radius: 34px;
        background: rgb(255 255 255 / 78%);
        box-shadow: 0 12px 28px rgb(44 79 99 / 12%);
      }

      .kl-wash__tool {
        display: grid;
        width: clamp(86px, 11vh, 116px);
        height: clamp(86px, 11vh, 116px);
        min-width: 80px;
        min-height: 80px;
        padding: 8px;
        place-items: center;
        border: 4px solid transparent;
        border-radius: 28px;
        background: rgb(255 255 255 / 72%);
        cursor: grab;
        opacity: 0.28;
        transform: scale(0.92);
        transition: opacity 180ms ease, transform 180ms ease, box-shadow 180ms ease;
      }

      .kl-wash__tool.is-active {
        border-color: rgb(255 204 73 / 72%);
        box-shadow: 0 0 0 8px rgb(255 226 127 / 26%), 0 8px 18px rgb(45 82 102 / 14%);
        cursor: grab;
        opacity: 1;
        transform: scale(1);
      }

      .kl-wash__tool img,
      .kl-wash__tool svg {
        width: 100%;
        height: 100%;
        object-fit: contain;
      }

      .kl-wash__floating {
        position: absolute;
        z-index: 12;
        display: none;
        width: 104px;
        height: 104px;
        place-items: center;
        pointer-events: none;
        transform: translate(-50%, -50%);
      }

      .kl-wash__floating.is-visible {
        display: grid;
      }

      .kl-wash__floating img,
      .kl-wash__floating svg {
        width: 100%;
        height: 100%;
        object-fit: contain;
        filter: drop-shadow(0 8px 7px rgb(27 62 83 / 22%));
      }

      @media (max-height: 650px) and (orientation: landscape) {
        .kl-wash__bay {
          top: 70px;
          width: min(56vw, 590px);
        }

        .kl-wash__tray {
          height: 104px;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .kl-wash__tool,
        .kl-wash__star {
          transition: none;
        }
      }
    `;

    const bay = document.createElement('div');
    bay.className = 'kl-wash__bay';

    const visual = document.createElement('div');
    visual.className = 'kl-wash__visual';

    const cleanImage = document.createElement('img');
    cleanImage.className = 'kl-wash__car kl-wash__clean';
    cleanImage.src = carClean;
    cleanImage.alt = '';
    cleanImage.draggable = false;

    const dirtyImage = document.createElement('img');
    dirtyImage.className = 'kl-wash__car kl-wash__dirty';
    dirtyImage.src = carDirty;
    dirtyImage.alt = '';
    dirtyImage.draggable = false;

    const foamCanvas = this.createCanvas('kl-wash__canvas kl-wash__foam');
    const effectCanvas = this.createCanvas('kl-wash__canvas kl-wash__effect');

    const stars = document.createElement('div');
    stars.className = 'kl-wash__stars';
    stars.setAttribute('aria-hidden', 'true');
    for (let index = 0; index < 3; index += 1) {
      const star = document.createElement('span');
      star.className = 'kl-wash__star';
      stars.append(star);
    }

    visual.append(cleanImage, dirtyImage, foamCanvas, effectCanvas, stars);
    bay.append(visual);

    const tray = document.createElement('div');
    tray.className = 'kl-wash__tray';
    tray.setAttribute('aria-label', '洗車の道具');

    const spongeButton = this.createToolButton(0, washSponge);
    const hoseButton = this.createToolButton(1);
    const towelButton = this.createToolButton(2, washTowel);
    tray.append(spongeButton, hoseButton, towelButton);

    const floatingTool = document.createElement('div');
    floatingTool.className = 'kl-wash__floating';
    floatingTool.setAttribute('aria-hidden', 'true');

    wrapper.append(style, bay, tray, floatingTool);
    context.root.replaceChildren(wrapper);

    this.wrapper = wrapper;
    this.carZone = bay;
    this.carVisual = visual;
    this.dirtyCar = dirtyImage;
    this.foamCanvas = foamCanvas;
    this.effectCanvas = effectCanvas;
    this.floatingTool = floatingTool;
    this.stars = stars;
    this.toolButtons = [spongeButton, hoseButton, towelButton];

    const foamTexture = new Image();
    foamTexture.src = washFoam;
    this.foamTexture = foamTexture;

    const listenerOptions = { signal: this.abortController.signal };
    for (const button of this.toolButtons) {
      button.addEventListener('pointerdown', this.handleToolPointerDown, listenerOptions);
    }
    wrapper.addEventListener('pointermove', this.handlePointerMove, listenerOptions);
    wrapper.addEventListener('pointerup', this.handlePointerEnd, listenerOptions);
    wrapper.addEventListener('pointercancel', this.handlePointerEnd, listenerOptions);
    wrapper.addEventListener('lostpointercapture', this.handlePointerEnd, listenerOptions);

    this.resetRound(false);
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

    if (this.activePointerId !== null) {
      this.endDrag(this.activePointerId);
    }

    this.wrapper?.remove();
    this.context = null;
    this.wrapper = null;
    this.carZone = null;
    this.carVisual = null;
    this.dirtyCar = null;
    this.foamCanvas = null;
    this.effectCanvas = null;
    this.floatingTool = null;
    this.stars = null;
    this.foamTexture = null;
    this.toolButtons = [];
    this.coverage.clear();
    this.activePointerId = null;
    this.activeToolButton = null;
    this.lastStrokePoint = null;
    this.completing = false;
  }

  private createCanvas(className: string): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.className = className;
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    canvas.setAttribute('aria-hidden', 'true');
    return canvas;
  }

  private createToolButton(
    index: WashStep,
    imageSource?: string,
  ): HTMLButtonElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'kl-wash__tool';
    button.dataset.toolIndex = String(index);
    button.setAttribute('aria-label', TOOL_LABELS[index]);

    if (imageSource) {
      const image = document.createElement('img');
      image.src = imageSource;
      image.alt = '';
      image.draggable = false;
      button.append(image);
    } else {
      button.append(createHoseIcon());
    }

    return button;
  }

  private showFloatingTool(
    button: HTMLButtonElement,
    event: PointerEvent,
  ): void {
    if (!this.floatingTool) {
      return;
    }

    const icon = button.firstElementChild?.cloneNode(true);
    this.floatingTool.replaceChildren();
    if (icon) {
      this.floatingTool.append(icon);
    }
    this.floatingTool.classList.add('is-visible');
    this.positionFloatingTool(event);
  }

  private positionFloatingTool(event: PointerEvent): void {
    if (!this.wrapper || !this.floatingTool) {
      return;
    }

    const bounds = this.wrapper.getBoundingClientRect();
    this.floatingTool.style.left = `${event.clientX - bounds.left}px`;
    this.floatingTool.style.top = `${event.clientY - bounds.top}px`;
  }

  private applyPointer(event: PointerEvent): void {
    const point = this.toCanvasPoint(event);
    if (!point) {
      this.lastStrokePoint = null;
      return;
    }

    const previous = this.lastStrokePoint ?? point;
    const distance = Math.hypot(point.x - previous.x, point.y - previous.y);
    const stampCount = Math.max(1, Math.ceil(distance / 34));
    const stamps: Point[] = [];

    for (let index = 1; index <= stampCount; index += 1) {
      const ratio = index / stampCount;
      stamps.push({
        x: previous.x + (point.x - previous.x) * ratio,
        y: previous.y + (point.y - previous.y) * ratio,
      });
    }

    if (this.step === 1) {
      this.effectCanvas
        ?.getContext('2d')
        ?.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }

    for (const stamp of stamps) {
      this.markCoverage(stamp);
      if (this.step === 0) {
        this.drawFoam(stamp);
      } else if (this.step === 1) {
        this.drawRinse(stamp);
      } else {
        this.drawWipe(stamp);
      }
    }

    this.lastStrokePoint = point;
    const progress = this.coverage.size / COVERAGE_POINTS.length;
    this.playStrokeFeedback();

    if (this.step === 1 && this.dirtyCar) {
      this.dirtyCar.style.opacity = String(Math.max(0, 1 - progress / REQUIRED_COVERAGE));
    }

    if (progress >= REQUIRED_COVERAGE) {
      this.advanceStep();
    }
  }

  private toCanvasPoint(event: PointerEvent): Point | null {
    if (!this.carZone) {
      return null;
    }

    const bounds = this.carZone.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width) * CANVAS_WIDTH;
    const y = ((event.clientY - bounds.top) / bounds.height) * CANVAS_HEIGHT;
    if (x < 45 || x > 755 || y < 120 || y > 505) {
      return null;
    }

    return { x, y };
  }

  private markCoverage(point: Point): void {
    for (let index = 0; index < COVERAGE_POINTS.length; index += 1) {
      const target = COVERAGE_POINTS[index];
      if (!target) {
        continue;
      }

      if (Math.hypot(point.x - target.x, point.y - target.y) <= BRUSH_RADIUS) {
        this.coverage.add(index);
      }
    }
  }

  private drawFoam(point: Point): void {
    const context = this.foamCanvas?.getContext('2d');
    if (!context) {
      return;
    }

    context.globalCompositeOperation = 'source-over';
    const size = 104;
    if (this.foamTexture?.complete && this.foamTexture.naturalWidth > 0) {
      context.drawImage(
        this.foamTexture,
        point.x - size / 2,
        point.y - size / 2,
        size,
        size,
      );
      return;
    }

    context.fillStyle = 'rgb(255 255 255 / 82%)';
    context.beginPath();
    context.arc(point.x - 22, point.y + 4, 26, 0, Math.PI * 2);
    context.arc(point.x + 12, point.y - 10, 34, 0, Math.PI * 2);
    context.arc(point.x + 34, point.y + 18, 23, 0, Math.PI * 2);
    context.fill();
  }

  private drawRinse(point: Point): void {
    const foamContext = this.foamCanvas?.getContext('2d');
    if (foamContext) {
      foamContext.save();
      foamContext.globalCompositeOperation = 'destination-out';
      foamContext.beginPath();
      foamContext.arc(point.x, point.y, 82, 0, Math.PI * 2);
      foamContext.fill();
      foamContext.restore();
    }

    const effectContext = this.effectCanvas?.getContext('2d');
    if (!effectContext) {
      return;
    }

    effectContext.fillStyle = 'rgb(80 190 244 / 48%)';
    for (let index = 0; index < 3; index += 1) {
      effectContext.beginPath();
      effectContext.ellipse(
        point.x - 38 + index * 36,
        point.y + index * 14,
        8,
        24,
        -0.35,
        0,
        Math.PI * 2,
      );
      effectContext.fill();
    }
  }

  private drawWipe(point: Point): void {
    const context = this.effectCanvas?.getContext('2d');
    if (!context) {
      return;
    }

    context.save();
    context.globalCompositeOperation = 'destination-out';
    context.beginPath();
    context.arc(point.x, point.y, 92, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }

  private playStrokeFeedback(): void {
    if (!this.context) {
      return;
    }

    const now = performance.now();
    if (this.step === 0 && now - this.lastSoundAt >= 280) {
      this.context.sfx.play('pop');
      this.lastSoundAt = now;
    } else if (this.step === 1 && now - this.lastSoundAt >= 520) {
      this.context.sfx.play('water');
      this.lastSoundAt = now;
    }

    if (this.step === 1 && !this.waterSpoken) {
      this.waterSpoken = true;
      this.context.speech.speak('water');
    }
  }

  private advanceStep(): void {
    if (!this.context || this.completing) {
      return;
    }

    if (this.activePointerId !== null) {
      this.endDrag(this.activePointerId);
    }
    this.coverage.clear();
    this.lastStrokePoint = null;
    this.lastSoundAt = 0;

    if (this.step === 0) {
      this.step = 1;
      this.context.speech.speak('foam');
      this.updateToolState();
      return;
    }

    if (this.step === 1) {
      this.step = 2;
      if (this.dirtyCar) {
        this.dirtyCar.style.opacity = '0';
      }
      this.foamCanvas
        ?.getContext('2d')
        ?.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      this.prepareWetLayer();
      this.context.speech.speak('wipe');
      this.updateToolState();
      return;
    }

    this.completeWash();
  }

  private prepareWetLayer(): void {
    const context = this.effectCanvas?.getContext('2d');
    if (!context) {
      return;
    }

    context.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    context.fillStyle = 'rgb(110 205 245 / 26%)';
    context.beginPath();
    context.ellipse(400, 335, 342, 174, 0, 0, Math.PI * 2);
    context.fill();
  }

  private completeWash(): void {
    if (!this.context || this.completing) {
      return;
    }

    this.completing = true;
    this.updateToolState();
    this.effectCanvas
      ?.getContext('2d')
      ?.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    this.foamCanvas
      ?.getContext('2d')
      ?.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    this.stars?.classList.add('is-visible');
    this.context.sfx.play('chime');
    this.context.speech.speak('clean');
    this.context.notifyTaskComplete();

    this.schedule(() => {
      this.context?.speech.speak('wellDone');
    }, 680);

    this.schedule(() => {
      if (!this.carVisual) {
        return;
      }
      const driveAnimation = this.carVisual.animate(
        [
          { transform: 'translateX(0)' },
          { transform: 'translateX(82vw)' },
        ],
        {
          duration: 920,
          easing: 'ease-in-out',
          fill: 'forwards',
        },
      );
      this.trackAnimation(driveAnimation);
    }, 820);

    this.schedule(() => this.resetRound(true), 1_900);
  }

  private resetRound(animateEntrance: boolean): void {
    for (const animation of this.animations) {
      animation.cancel();
    }
    this.animations.clear();

    this.step = 0;
    this.coverage.clear();
    this.lastStrokePoint = null;
    this.lastSoundAt = 0;
    this.waterSpoken = false;
    this.completing = false;
    this.dirtyCar?.style.removeProperty('opacity');
    this.stars?.classList.remove('is-visible');
    this.foamCanvas
      ?.getContext('2d')
      ?.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    this.effectCanvas
      ?.getContext('2d')
      ?.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    this.updateToolState();

    if (animateEntrance && this.carVisual) {
      const entranceAnimation = this.carVisual.animate(
        [
          { transform: 'translateX(-76vw)' },
          { transform: 'translateX(0)' },
        ],
        {
          duration: 720,
          easing: 'ease-out',
        },
      );
      this.trackAnimation(entranceAnimation);
    }
  }

  private updateToolState(): void {
    for (let index = 0; index < this.toolButtons.length; index += 1) {
      this.toolButtons[index]?.classList.toggle(
        'is-active',
        !this.completing && index === this.step,
      );
    }
  }

  private shakeTool(button: HTMLButtonElement): void {
    const animation = button.animate(
      [
        { transform: 'translateX(0) scale(0.92)' },
        { transform: 'translateX(-8px) scale(0.92)' },
        { transform: 'translateX(8px) scale(0.92)' },
        { transform: 'translateX(-5px) scale(0.92)' },
        { transform: 'translateX(0) scale(0.92)' },
      ],
      { duration: 280, easing: 'ease-out' },
    );
    this.trackAnimation(animation);
  }

  private endDrag(pointerId: number): void {
    const activeButton = this.activeToolButton;
    this.activePointerId = null;
    this.activeToolButton = null;
    this.lastStrokePoint = null;
    if (activeButton?.hasPointerCapture(pointerId)) {
      activeButton.releasePointerCapture(pointerId);
    }
    this.floatingTool?.classList.remove('is-visible');
    this.floatingTool?.replaceChildren();
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

export const carWashActivity: Activity = new CarWashActivity();
