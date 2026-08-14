import backgroundCarWash from '../assets/bg_car_wash.webp';
import carClean from '../assets/car_red.svg';
import carDirty from '../assets/car_dirty.svg';
import menuIcon from '../assets/menu_car-wash.svg';
import washFoam from '../assets/wash_foam.svg';
import washSponge from '../assets/wash_sponge.svg';
import washHose from '../assets/wash_hose.svg';
import washTowel from '../assets/wash_towel.svg';
import type { Activity, ActivityContext } from '../core/activity';
import { ParticleSystem } from '../core/particles';


const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const REQUIRED_COVERAGE = 0.68;
const BRUSH_RADIUS = 82;
const MAX_PIXEL_RATIO = 2;
const TOOL_POINTER_OFFSET = 46;

type WashStep = 0 | 1 | 2;

interface Point {
  x: number;
  y: number;
}

const TOOL_LABELS = ['スポンジ', 'ホース', 'タオル'] as const;
const TOOL_VOCAB = ['sponge', 'water', 'towel'] as const;

const WASH_STYLES = `
  .kl-wash {
    position: absolute;
    inset: 0;
    overflow: hidden;
    background: #dff4ff;
    touch-action: none;
  }

  .kl-wash__background {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    pointer-events: none;
  }

  .kl-wash__bay {
    position: absolute;
    z-index: 2;
    top: clamp(46px, 7vh, 82px);
    left: 50%;
    width: min(62vw, 660px);
    aspect-ratio: 4 / 3;
    transform: translateX(-50%);
    touch-action: none;
  }

  .kl-wash__visual,
  .kl-wash__car,
  .kl-wash__canvas {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
  }

  .kl-wash__visual {
    filter: drop-shadow(0 15px 12px rgb(43 68 81 / 18%));
    transform: translateX(0);
  }

  .kl-wash__car {
    object-fit: contain;
    pointer-events: none;
  }

  .kl-wash__dirt-fallback {
    opacity: 1;
    transition: opacity 120ms ease-out;
  }

  .kl-wash__canvas {
    pointer-events: none;
  }

  .kl-wash__tray {
    position: absolute;
    z-index: 4;
    right: max(24px, env(safe-area-inset-right));
    bottom: max(14px, env(safe-area-inset-bottom));
    left: max(116px, calc(env(safe-area-inset-left) + 108px));
    display: flex;
    height: clamp(126px, 21vh, 168px);
    align-items: center;
    justify-content: center;
    gap: clamp(32px, 7vw, 86px);
    border: 4px solid rgb(57 89 107 / 10%);
    border-radius: 38px;
    background: rgb(255 255 255 / 91%);
    box-shadow: 0 16px 32px rgb(44 79 99 / 16%);
  }

  .kl-wash__tool {
    display: grid;
    width: clamp(102px, 14vh, 134px);
    height: clamp(102px, 14vh, 134px);
    min-width: 88px;
    min-height: 88px;
    padding: 10px;
    place-items: center;
    border: 4px solid transparent;
    border-radius: 30px;
    background: rgb(255 255 255 / 92%);
    cursor: pointer;
    opacity: 0.52;
    transform: scale(0.94);
    transition:
      border-color 180ms ease,
      box-shadow 180ms ease,
      opacity 180ms ease,
      transform 180ms ease;
  }

  .kl-wash__tool.is-active {
    border-color: #ffd15c;
    box-shadow:
      0 0 0 9px rgb(255 221 105 / 28%),
      0 10px 22px rgb(45 82 102 / 17%);
    cursor: grab;
    opacity: 1;
    transform: scale(1.06);
    animation: kl-wash-tool-pulse 2.4s ease-in-out infinite;
  }

  .kl-wash__tool img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }

  .kl-wash__floating {
    position: absolute;
    z-index: 8;
    display: none;
    width: 112px;
    height: 112px;
    place-items: center;
    pointer-events: none;
    transform: translate(-50%, -50%);
  }

  .kl-wash__floating.is-visible {
    display: grid;
  }

  .kl-wash__floating img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    filter: drop-shadow(0 9px 8px rgb(27 62 83 / 24%));
  }

  @keyframes kl-wash-tool-pulse {
    0%,
    100% {
      transform: scale(1.04);
    }

    50% {
      transform: scale(1.09);
    }
  }

  @media (max-height: 650px) and (orientation: landscape) {
    .kl-wash__bay {
      top: 38px;
      width: min(55vw, 560px);
    }

    .kl-wash__tray {
      height: 114px;
      gap: clamp(22px, 5vw, 56px);
    }

    .kl-wash__tool {
      width: 94px;
      height: 94px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .kl-wash__dirt-fallback,
    .kl-wash__tool {
      transition: none;
    }

    .kl-wash__tool.is-active {
      animation: none;
    }
  }
`;



class CarWashActivity implements Activity {
  readonly id = 'car-wash';
  readonly menuIcon = menuIcon;

  private context: ActivityContext | null = null;
  private wrapper: HTMLDivElement | null = null;
  private carZone: HTMLDivElement | null = null;
  private carVisual: HTMLDivElement | null = null;
  private dirtyFallback: HTMLImageElement | null = null;
  private dirtCanvas: HTMLCanvasElement | null = null;
  private foamCanvas: HTMLCanvasElement | null = null;
  private effectCanvas: HTMLCanvasElement | null = null;
  private maskCanvas: HTMLCanvasElement | null = null;
  private maskData: ImageData | null = null;
  private floatingTool: HTMLDivElement | null = null;
  private cleanTexture: HTMLImageElement | null = null;
  private dirtyTexture: HTMLImageElement | null = null;
  private foamTexture: HTMLImageElement | null = null;
  private toolButtons: HTMLButtonElement[] = [];
  private coveragePoints: Point[] = [];
  private abortController: AbortController | null = null;
  private readonly timers = new Set<number>();
  private readonly animations = new Set<Animation>();
  private particles: ParticleSystem | null = null;
  private step: WashStep = 0;
  private coverage = new Set<number>();
  private activePointerId: number | null = null;
  private pointerCaptureOwner: HTMLElement | null = null;
  private lastStrokePoint: Point | null = null;
  private lastFoamStampPoint: Point | null = null;
  private lastSoundAt = 0;
  private completing = false;
  private layersReady = false;
  private pixelRatio = 1;

  private readonly handleBayPointerDown = (event: PointerEvent): void => {
    if (
      event.button !== 0 ||
      this.completing ||
      this.activePointerId !== null
    ) {
      return;
    }

    const button = this.toolButtons[this.step];
    if (!button || !this.carZone) {
      return;
    }

    event.preventDefault();
    this.beginPointer(event, this.carZone, button);
  };

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
    if (this.completing) {
      return;
    }

    if (toolIndex !== this.step) {
      this.guideActiveTool();
      return;
    }

    if (this.activePointerId !== null) {
      return;
    }

    this.beginPointer(event, button, button);
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

  private readonly tryInitializeLayers = (): void => {
    if (
      !this.wrapper ||
      !this.cleanTexture?.complete ||
      !this.dirtyTexture?.complete ||
      this.cleanTexture.naturalWidth === 0 ||
      this.dirtyTexture.naturalWidth === 0
    ) {
      return;
    }

    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = CANVAS_WIDTH;
    maskCanvas.height = CANVAS_HEIGHT;
    const maskContext = maskCanvas.getContext('2d', {
      willReadFrequently: true,
    });
    if (!maskContext) {
      return;
    }

    maskContext.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    maskContext.drawImage(
      this.cleanTexture,
      0,
      0,
      CANVAS_WIDTH,
      CANVAS_HEIGHT,
    );

    this.maskCanvas = maskCanvas;
    this.maskData = maskContext.getImageData(
      0,
      0,
      CANVAS_WIDTH,
      CANVAS_HEIGHT,
    );
    this.coveragePoints = this.createCoveragePoints();
    this.layersReady = true;
    this.drawDirtyLayer();
    if (this.dirtyFallback) {
      this.dirtyFallback.style.opacity = '0';
    }
  };

  mount(context: ActivityContext): void {
    this.unmount();
    this.context = context;
    this.abortController = new AbortController();
    this.pixelRatio = Math.min(
      MAX_PIXEL_RATIO,
      Math.max(1, window.devicePixelRatio || 1),
    );

    const wrapper = document.createElement('div');
    wrapper.className = 'kl-wash';

    const style = document.createElement('style');
    style.textContent = WASH_STYLES;

    const background = document.createElement('img');
    background.className = 'kl-wash__background';
    background.src = backgroundCarWash;
    background.alt = '';
    background.draggable = false;

    const bay = document.createElement('div');
    bay.className = 'kl-wash__bay';
    bay.setAttribute('aria-label', 'くるまをこすって洗う');

    const visual = document.createElement('div');
    visual.className = 'kl-wash__visual';

    const cleanImage = document.createElement('img');
    cleanImage.className = 'kl-wash__car kl-wash__clean';
    cleanImage.src = carClean;
    cleanImage.alt = '';
    cleanImage.draggable = false;

    const dirtyImage = document.createElement('img');
    dirtyImage.className = 'kl-wash__car kl-wash__dirt-fallback';
    dirtyImage.src = carDirty;
    dirtyImage.alt = '';
    dirtyImage.draggable = false;

    const dirtCanvas = this.createCanvas('kl-wash__canvas kl-wash__dirt');
    const foamCanvas = this.createCanvas('kl-wash__canvas kl-wash__foam');
    const effectCanvas = this.createCanvas('kl-wash__canvas kl-wash__effect');

    visual.append(
      cleanImage,
      dirtyImage,
      dirtCanvas,
      foamCanvas,
      effectCanvas,
    );
    bay.append(visual);

    const tray = document.createElement('div');
    tray.className = 'kl-wash__tray';
    tray.setAttribute('role', 'group');
    tray.setAttribute('aria-label', '洗車の道具');

    const spongeButton = this.createToolButton(0, washSponge);
    const hoseButton = this.createToolButton(1, washHose);
    const towelButton = this.createToolButton(2, washTowel);
    tray.append(spongeButton, hoseButton, towelButton);

    const floatingTool = document.createElement('div');
    floatingTool.className = 'kl-wash__floating';
    floatingTool.setAttribute('aria-hidden', 'true');

    wrapper.append(style, background, bay, tray, floatingTool);
    context.root.replaceChildren(wrapper);

    this.wrapper = wrapper;
    this.carZone = bay;
    this.carVisual = visual;
    this.dirtyFallback = dirtyImage;
    this.dirtCanvas = dirtCanvas;
    this.foamCanvas = foamCanvas;
    this.effectCanvas = effectCanvas;
    this.floatingTool = floatingTool;
    this.toolButtons = [spongeButton, hoseButton, towelButton];
    this.particles = new ParticleSystem(wrapper);

    const cleanTexture = new Image();
    cleanTexture.src = carClean;
    const dirtyTexture = new Image();
    dirtyTexture.src = carDirty;
    const foamTexture = new Image();
    foamTexture.src = washFoam;
    this.cleanTexture = cleanTexture;
    this.dirtyTexture = dirtyTexture;
    this.foamTexture = foamTexture;

    const listenerOptions: AddEventListenerOptions = {
      signal: this.abortController.signal,
    };
    cleanTexture.addEventListener('load', this.tryInitializeLayers, listenerOptions);
    dirtyTexture.addEventListener('load', this.tryInitializeLayers, listenerOptions);
    for (const button of this.toolButtons) {
      button.addEventListener(
        'pointerdown',
        this.handleToolPointerDown,
        listenerOptions,
      );
    }
    bay.addEventListener(
      'pointerdown',
      this.handleBayPointerDown,
      listenerOptions,
    );
    wrapper.addEventListener(
      'pointermove',
      this.handlePointerMove,
      listenerOptions,
    );
    wrapper.addEventListener(
      'pointerup',
      this.handlePointerEnd,
      listenerOptions,
    );
    wrapper.addEventListener(
      'pointercancel',
      this.handlePointerEnd,
      listenerOptions,
    );
    wrapper.addEventListener(
      'lostpointercapture',
      this.handlePointerEnd,
      listenerOptions,
    );

    this.resetRound(false);
    this.tryInitializeLayers();
  }

  unmount(): void {
    if (this.activePointerId !== null) {
      this.endDrag(this.activePointerId);
    }

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

    this.particles?.destroy();
    this.particles = null;

    this.wrapper?.remove();
    this.context = null;
    this.wrapper = null;
    this.carZone = null;
    this.carVisual = null;
    this.dirtyFallback = null;
    this.dirtCanvas = null;
    this.foamCanvas = null;
    this.effectCanvas = null;
    this.maskCanvas = null;
    this.maskData = null;
    this.floatingTool = null;
    this.cleanTexture = null;
    this.dirtyTexture = null;
    this.foamTexture = null;
    this.toolButtons = [];
    this.coveragePoints = [];
    this.coverage.clear();
    this.activePointerId = null;
    this.pointerCaptureOwner = null;
    this.lastStrokePoint = null;
    this.lastFoamStampPoint = null;
    this.completing = false;
    this.layersReady = false;
  }

  private createCanvas(className: string): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.className = className;
    canvas.width = Math.round(CANVAS_WIDTH * this.pixelRatio);
    canvas.height = Math.round(CANVAS_HEIGHT * this.pixelRatio);
    canvas.setAttribute('aria-hidden', 'true');
    return canvas;
  }

  private getContext(
    canvas: HTMLCanvasElement | null,
  ): CanvasRenderingContext2D | null {
    const context = canvas?.getContext('2d') ?? null;
    context?.setTransform(
      this.pixelRatio,
      0,
      0,
      this.pixelRatio,
      0,
      0,
    );
    return context;
  }

  private clearCanvas(canvas: HTMLCanvasElement | null): void {
    const context = this.getContext(canvas);
    if (!context) {
      return;
    }

    context.globalAlpha = 1;
    context.globalCompositeOperation = 'source-over';
    context.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }

  private createToolButton(
    index: WashStep,
    imageSource: string,
  ): HTMLButtonElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'kl-wash__tool';
    button.dataset.toolIndex = String(index);
    button.setAttribute('aria-label', TOOL_LABELS[index]);

    const image = document.createElement('img');
    image.src = imageSource;
    image.alt = '';
    image.draggable = false;
    button.append(image);

    return button;
  }

  private beginPointer(
    event: PointerEvent,
    captureOwner: HTMLElement,
    button: HTMLButtonElement,
  ): void {
    this.activePointerId = event.pointerId;
    this.pointerCaptureOwner = captureOwner;
    this.lastStrokePoint = null;
    try {
      captureOwner.setPointerCapture(event.pointerId);
    } catch {
      this.pointerCaptureOwner = null;
    }
    this.showFloatingTool(button, event);
    this.applyPointer(event);
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
    this.floatingTool.style.left =
      String(event.clientX - bounds.left) + 'px';
    this.floatingTool.style.top =
      String(event.clientY - bounds.top - TOOL_POINTER_OFFSET) + 'px';
  }

  private applyPointer(event: PointerEvent): void {
    if (!this.layersReady) {
      return;
    }

    const point = this.toCanvasPoint(event);
    if (!point || !this.isPointOnCar(point)) {
      this.lastStrokePoint = null;
      return;
    }

    const previous = this.lastStrokePoint ?? point;
    const distance = Math.hypot(point.x - previous.x, point.y - previous.y);
    const stampSpacing = this.step === 0 ? 56 : 30;
    const stampCount = Math.max(1, Math.ceil(distance / stampSpacing));
    let touched = false;

    if (this.step === 1) {
      this.clearCanvas(this.effectCanvas);
    }

    for (let index = 1; index <= stampCount; index += 1) {
      const ratio = index / stampCount;
      const stamp = {
        x: previous.x + (point.x - previous.x) * ratio,
        y: previous.y + (point.y - previous.y) * ratio,
      };
      if (!this.isPointOnCar(stamp)) {
        continue;
      }

      touched = true;
      this.markCoverage(stamp);
      if (this.step === 0) {
        this.drawFoam(stamp);
      } else if (this.step === 1) {
        this.drawRinse(stamp);
      } else {
        this.drawWipe(stamp);
      }
    }

    if (!touched) {
      this.lastStrokePoint = null;
      return;
    }

    if (this.step === 0) {
      this.clipCanvasToMask(this.foamCanvas);
    }

    this.lastStrokePoint = point;
    this.playStrokeFeedback();

    if (
      this.coveragePoints.length > 0 &&
      this.coverage.size / this.coveragePoints.length >= REQUIRED_COVERAGE
    ) {
      this.advanceStep();
    }
  }

  private toCanvasPoint(event: PointerEvent): Point | null {
    if (!this.carZone) {
      return null;
    }

    const bounds = this.carZone.getBoundingClientRect();
    if (bounds.width <= 0 || bounds.height <= 0) {
      return null;
    }

    const x = ((event.clientX - bounds.left) / bounds.width) * CANVAS_WIDTH;
    const y = ((event.clientY - bounds.top) / bounds.height) * CANVAS_HEIGHT;
    if (x < 0 || x > CANVAS_WIDTH || y < 0 || y > CANVAS_HEIGHT) {
      return null;
    }

    return { x, y };
  }

  private isPointOnCar(point: Point): boolean {
    if (!this.maskData) {
      return false;
    }

    const x = Math.min(
      CANVAS_WIDTH - 1,
      Math.max(0, Math.round(point.x)),
    );
    const y = Math.min(
      CANVAS_HEIGHT - 1,
      Math.max(0, Math.round(point.y)),
    );
    const alphaIndex = (y * CANVAS_WIDTH + x) * 4 + 3;
    return (this.maskData.data[alphaIndex] ?? 0) > 18;
  }

  private createCoveragePoints(): Point[] {
    const points: Point[] = [];
    const columns = 12;
    const rows = 7;

    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        const point = {
          x: 78 + (644 * column) / (columns - 1),
          y: 112 + (388 * row) / (rows - 1),
        };
        if (this.isPointOnCar(point)) {
          points.push(point);
        }
      }
    }

    return points;
  }

  private markCoverage(point: Point): void {
    for (let index = 0; index < this.coveragePoints.length; index += 1) {
      const target = this.coveragePoints[index];
      if (
        target &&
        Math.hypot(point.x - target.x, point.y - target.y) <= BRUSH_RADIUS
      ) {
        this.coverage.add(index);
      }
    }
  }

  private drawFoam(point: Point): void {
    if (
      this.lastFoamStampPoint &&
      Math.hypot(
        point.x - this.lastFoamStampPoint.x,
        point.y - this.lastFoamStampPoint.y,
      ) < 104
    ) {
      return;
    }

    const context = this.getContext(this.foamCanvas);
    if (!context) {
      return;
    }

    context.globalCompositeOperation = 'source-over';
    context.globalAlpha = 0.82;
    const size = 96;
    if (this.foamTexture?.complete && this.foamTexture.naturalWidth > 0) {
      context.drawImage(
        this.foamTexture,
        point.x - size / 2,
        point.y - size / 2,
        size,
        size,
      );
      context.globalAlpha = 1;
      this.lastFoamStampPoint = point;
      return;
    }

    context.fillStyle = 'rgb(255 255 255 / 84%)';
    context.beginPath();
    context.arc(point.x - 22, point.y + 4, 26, 0, Math.PI * 2);
    context.arc(point.x + 12, point.y - 10, 34, 0, Math.PI * 2);
    context.arc(point.x + 34, point.y + 18, 23, 0, Math.PI * 2);
    context.fill();
    context.globalAlpha = 1;
    this.lastFoamStampPoint = point;
  }

  private drawRinse(point: Point): void {
    this.eraseAt(this.foamCanvas, point, 92);
    this.eraseAt(this.dirtCanvas, point, 86);

    const context = this.getContext(this.effectCanvas);
    if (!context) {
      return;
    }

    context.globalCompositeOperation = 'source-over';
    context.strokeStyle = 'rgb(70 184 239 / 62%)';
    context.lineWidth = 10;
    context.lineCap = 'round';
    for (let index = 0; index < 4; index += 1) {
      const offsetX = -34 + index * 23;
      context.beginPath();
      context.moveTo(point.x + offsetX, point.y - 72 + index * 5);
      context.lineTo(point.x + offsetX + 10, point.y + 34 + index * 4);
      context.stroke();
    }
  }

  private drawWipe(point: Point): void {
    this.eraseAt(this.effectCanvas, point, 104);
  }

  private eraseAt(
    canvas: HTMLCanvasElement | null,
    point: Point,
    radius: number,
  ): void {
    const context = this.getContext(canvas);
    if (!context) {
      return;
    }

    context.save();
    context.globalCompositeOperation = 'destination-out';
    context.fillStyle = '#000';
    context.beginPath();
    context.arc(point.x, point.y, radius, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }

  private clipCanvasToMask(canvas: HTMLCanvasElement | null): void {
    const context = this.getContext(canvas);
    if (!context || !this.maskCanvas) {
      return;
    }

    context.save();
    context.globalCompositeOperation = 'destination-in';
    context.drawImage(
      this.maskCanvas,
      0,
      0,
      CANVAS_WIDTH,
      CANVAS_HEIGHT,
    );
    context.restore();
  }

  private playStrokeFeedback(): void {
    if (!this.context) {
      return;
    }

    const now = performance.now();
    if (this.step === 0 && now - this.lastSoundAt >= 320) {
      this.context.sfx.play('pop');
      this.lastSoundAt = now;
    } else if (this.step === 1 && now - this.lastSoundAt >= 520) {
      this.context.sfx.play('water');
      this.lastSoundAt = now;
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
    this.lastFoamStampPoint = null;
    this.lastSoundAt = 0;

    if (this.step === 0) {
      this.step = 1;
      this.context.speech.speak('water');
      this.updateToolState();
      return;
    }

    if (this.step === 1) {
      this.step = 2;
      this.clearCanvas(this.dirtCanvas);
      this.clearCanvas(this.foamCanvas);
      this.prepareWetLayer();
      this.context.speech.speak('towel');
      this.updateToolState();
      return;
    }

    this.completeWash();
  }

  private prepareWetLayer(): void {
    const context = this.getContext(this.effectCanvas);
    if (!context || !this.cleanTexture) {
      return;
    }

    this.clearCanvas(this.effectCanvas);
    context.globalCompositeOperation = 'source-over';
    context.globalAlpha = 1;
    context.drawImage(
      this.cleanTexture,
      0,
      0,
      CANVAS_WIDTH,
      CANVAS_HEIGHT,
    );
    context.globalCompositeOperation = 'source-in';
    context.fillStyle = 'rgb(76 188 239 / 24%)';
    context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    context.globalCompositeOperation = 'source-over';
  }

  private completeWash(): void {
    if (!this.context || !this.carVisual) {
      return;
    }

    this.completing = true;
    this.clearCanvas(this.dirtCanvas);
    this.clearCanvas(this.foamCanvas);
    this.clearCanvas(this.effectCanvas);
    this.context.sfx.play('chime');
    this.context.speech.speak('clean');
    this.context.notifyTaskComplete();

    this.sparkleAtCar();

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.setTimer(() => this.resetRound(true), 900);
      return;
    }

    const bounce = this.carVisual.animate(
      [
        { transform: 'translateY(0) scale(1)' },
        { transform: 'translateY(-10px) scale(1.035)' },
        { transform: 'translateY(0) scale(1)' },
      ],
      { duration: 520, easing: 'ease-out' },
    );
    this.trackAnimation(bounce);

    this.setTimer(() => {
      this.context?.sfx.play('applause');
      this.context?.speech.speak('wellDone');
    }, 560);

    this.setTimer(() => {
      if (!this.carVisual) {
        return;
      }

      const leaving = this.carVisual.animate(
        [
          { transform: 'translateX(0)' },
          { transform: 'translateX(118vw)' },
        ],
        { duration: 1050, easing: 'ease-in', fill: 'forwards' },
      );
      this.trackAnimation(leaving);
      leaving.addEventListener(
        'finish',
        () => {
          if (!this.carVisual || !this.context) {
            return;
          }

          leaving.cancel();
          this.resetRound(false);
          this.completing = true;
          const entering = this.carVisual.animate(
            [
              { transform: 'translateX(-118vw)' },
              { transform: 'translateX(0)' },
            ],
            { duration: 1050, easing: 'ease-out' },
          );
          this.trackAnimation(entering);
          entering.addEventListener(
            'finish',
            () => {
              if (!this.context) {
                return;
              }
              this.completing = false;
              this.context.speech.speak('sponge');
            },
            { once: true },
          );
        },
        { once: true },
      );
    }, 1100);
  }

  private sparkleAtCar(): void {
    if (!this.particles || !this.carZone || !this.wrapper) {
      return;
    }

    const wrapperRect = this.wrapper.getBoundingClientRect();
    const bayRect = this.carZone.getBoundingClientRect();
    this.particles.emitBubbles(
      bayRect.left - wrapperRect.left + bayRect.width / 2,
      bayRect.top - wrapperRect.top + bayRect.height / 2,
      14,
    );
    this.particles.emitSparkles(
      bayRect.left - wrapperRect.left + bayRect.width / 2,
      bayRect.top - wrapperRect.top + bayRect.height / 2,
      10,
      '#4fc3f7',
    );
  }

  private resetRound(announce: boolean): void {
    this.step = 0;
    this.coverage.clear();
    this.lastStrokePoint = null;
    this.lastFoamStampPoint = null;
    this.lastSoundAt = 0;
    this.completing = false;
    this.clearCanvas(this.dirtCanvas);
    this.clearCanvas(this.foamCanvas);
    this.clearCanvas(this.effectCanvas);

    if (this.layersReady) {
      this.drawDirtyLayer();
      if (this.dirtyFallback) {
        this.dirtyFallback.style.opacity = '0';
      }
    } else if (this.dirtyFallback) {
      this.dirtyFallback.style.opacity = '1';
    }

    this.updateToolState();
    if (announce) {
      this.context?.speech.speak('sponge');
    }
  }

  private drawDirtyLayer(): void {
    const context = this.getContext(this.dirtCanvas);
    if (!context || !this.dirtyTexture) {
      return;
    }

    this.clearCanvas(this.dirtCanvas);
    context.globalCompositeOperation = 'source-over';
    context.globalAlpha = 1;
    context.drawImage(
      this.dirtyTexture,
      0,
      0,
      CANVAS_WIDTH,
      CANVAS_HEIGHT,
    );
  }

  private updateToolState(): void {
    this.toolButtons.forEach((button, index) => {
      const active = index === this.step;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
      button.setAttribute('aria-disabled', String(!active));
    });
  }

  private guideActiveTool(): void {
    const button = this.toolButtons[this.step];
    if (!button) {
      return;
    }

    const animation = button.animate(
      [
        { transform: 'scale(1.04)' },
        { transform: 'scale(1.12)' },
        { transform: 'scale(1.04)' },
      ],
      { duration: 360, easing: 'ease-out' },
    );
    this.trackAnimation(animation);
    this.context?.speech.speak(TOOL_VOCAB[this.step]);
  }

  private endDrag(pointerId: number): void {
    if (
      this.pointerCaptureOwner &&
      this.pointerCaptureOwner.hasPointerCapture(pointerId)
    ) {
      try {
        this.pointerCaptureOwner.releasePointerCapture(pointerId);
      } catch {
        // Safari may release capture before pointercancel reaches the wrapper.
      }
    }

    this.activePointerId = null;
    this.pointerCaptureOwner = null;
    this.lastStrokePoint = null;
    this.floatingTool?.classList.remove('is-visible');
    this.floatingTool?.replaceChildren();

    if (this.step === 1) {
      this.setTimer(() => {
        if (this.step === 1) {
          this.clearCanvas(this.effectCanvas);
        }
      }, 140);
    }
  }

  private setTimer(callback: () => void, delay: number): void {
    const timer = window.setTimeout(() => {
      this.timers.delete(timer);
      callback();
    }, delay);
    this.timers.add(timer);
  }

  private trackAnimation(animation: Animation): void {
    this.animations.add(animation);
    const remove = (): void => {
      this.animations.delete(animation);
    };
    animation.addEventListener('finish', remove, { once: true });
    animation.addEventListener('cancel', remove, { once: true });
  }
}

export const carWashActivity: Activity = new CarWashActivity();
