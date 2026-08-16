import bgPuzzle from '../assets/bg_puzzle.webp';
import carBlue from '../assets/car_blue.svg';
import carGreen from '../assets/car_green.svg';
import carRed from '../assets/car_red.svg';
import carYellow from '../assets/car_yellow.svg';
import menuIcon from '../assets/menu_puzzle.svg';
import type { Activity, ActivityContext } from '../core/activity';
import { getI18nText } from '../core/i18n';
import { ParticleSystem } from '../core/particles';
import type { VocabKey } from '../core/vocab';

type Difficulty = 2 | 3 | 4;

interface Point {
  x: number;
  y: number;
}

interface TargetRect extends Point {
  width: number;
  height: number;
}

interface PuzzlePiece {
  element: HTMLCanvasElement;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  width: number;
  height: number;
  placed: boolean;
  motion: Animation | null;
}

interface VehicleInfo {
  image: string;
  nameJa: string;
  vocab: VocabKey;
}

const VEHICLES: readonly VehicleInfo[] = [
  { image: carRed, nameJa: 'しょうぼうしゃ', vocab: 'fireTruck' },
  { image: carBlue, nameJa: 'パトカー', vocab: 'policeCar' },
  { image: carYellow, nameJa: 'ダンプカー', vocab: 'dumpTruck' },
  { image: carGreen, nameJa: 'トラック', vocab: 'cargoTruck' },
];

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function jitter(amount: number): number {
  return (Math.random() * 2 - 1) * amount;
}

function shuffled<T>(items: readonly T[]): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    const current = result[index];
    const swap = result[swapIndex];
    if (current === undefined || swap === undefined) continue;
    result[index] = swap;
    result[swapIndex] = current;
  }
  return result;
}

class PuzzleActivity implements Activity {
  readonly id = 'puzzle';
  readonly menuIcon = menuIcon;

  private context: ActivityContext | null = null;
  private wrapper: HTMLDivElement | null = null;
  private board: HTMLDivElement | null = null;
  private banner: HTMLDivElement | null = null;
  private targetFrame: HTMLDivElement | null = null;
  private completionLayer: HTMLDivElement | null = null;
  private abortController: AbortController | null = null;
  private loadingImage: HTMLImageElement | null = null;
  private readonly timers = new Set<number>();
  private readonly animations = new Set<Animation>();
  private particles: ParticleSystem | null = null;
  private pieces: PuzzlePiece[] = [];
  private targetRect: TargetRect | null = null;
  private activePointerId: number | null = null;
  private activePieceIndex: number | null = null;
  private dragOffset: Point = { x: 0, y: 0 };
  private difficulty: Difficulty = 2;
  private completionsAtDifficulty = 0;
  private vehicleIndex = 0;
  private roundNumber = 0;
  private roundGeneration = 0;
  private completing = false;

  private readonly handlePointerDown = (event: PointerEvent): void => {
    if (
      this.completing ||
      this.activePointerId !== null ||
      event.button !== 0 ||
      !(event.target instanceof HTMLCanvasElement)
    ) {
      return;
    }

    const pieceIndex = Number(event.target.dataset.pieceIndex);
    const piece = this.pieces[pieceIndex];
    if (!Number.isInteger(pieceIndex) || !piece || piece.placed) return;

    event.preventDefault();
    piece.motion?.cancel();
    piece.motion = null;
    const bounds = piece.element.getBoundingClientRect();
    this.dragOffset = {
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
    };
    this.activePointerId = event.pointerId;
    this.activePieceIndex = pieceIndex;
    piece.element.style.zIndex = '12';
    piece.element.style.transform = 'scale(1.08)';
    piece.element.setPointerCapture(event.pointerId);

    this.context?.sfx.play('pop');
  };

  private readonly handlePointerMove = (event: PointerEvent): void => {
    if (
      event.pointerId !== this.activePointerId ||
      this.activePieceIndex === null ||
      !this.board
    ) {
      return;
    }

    const piece = this.pieces[this.activePieceIndex];
    if (!piece) return;

    event.preventDefault();
    const boardBounds = this.board.getBoundingClientRect();
    const nextX = event.clientX - boardBounds.left - this.dragOffset.x;
    const nextY = event.clientY - boardBounds.top - this.dragOffset.y;
    piece.element.style.left = `${clamp(nextX, -piece.width * 0.12, boardBounds.width - piece.width * 0.88)}px`;
    piece.element.style.top = `${clamp(nextY, -piece.height * 0.12, boardBounds.height - piece.height * 0.88)}px`;
  };

  private readonly handlePointerEnd = (event: PointerEvent): void => {
    if (event.pointerId !== this.activePointerId) return;
    this.finishDrag(event.pointerId);
  };

  mount(context: ActivityContext): void {
    this.unmount();
    this.context = context;
    this.abortController = new AbortController();
    this.difficulty = 2;
    this.completionsAtDifficulty = 0;
    this.vehicleIndex = 0;
    this.roundNumber = 0;

    const wrapper = document.createElement('div');
    wrapper.className = 'kl-puzzle';

    const style = document.createElement('style');
    style.textContent = `
      .kl-puzzle {
        position: absolute;
        inset: 0;
        overflow: hidden;
        background: #dff4ff url("${bgPuzzle}") center / cover no-repeat;
        touch-action: none;
      }

      .kl-puzzle__banner {
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
        white-space: nowrap;
      }

      .kl-puzzle__board {
        position: absolute;
        inset: 0;
        overflow: hidden;
      }

      .kl-puzzle__target,
      .kl-puzzle__completion {
        position: absolute;
        border-radius: 28px;
      }

      .kl-puzzle__target {
        border: 5px dashed rgb(55 105 130 / 35%);
        background: rgb(255 255 255 / 58%);
        box-shadow: inset 0 0 0 10px rgb(255 255 255 / 35%);
        transition: opacity 240ms ease;
      }

      .kl-puzzle__target.is-complete {
        opacity: 0;
      }

      .kl-puzzle__guide,
      .kl-puzzle__complete-car {
        display: block;
        width: 100%;
        height: 100%;
      }

      .kl-puzzle__guide {
        opacity: 0.22;
      }

      .kl-puzzle__piece {
        position: absolute;
        z-index: 3;
        min-width: 80px;
        min-height: 80px;
        border: 4px solid #ffffff;
        border-radius: 22px;
        background: rgb(255 255 255 / 75%);
        box-shadow: 0 10px 22px rgb(33 72 93 / 22%);
        cursor: grab;
        touch-action: none;
        transform-origin: center;
        transition: transform 180ms ease, box-shadow 180ms ease;
      }

      .kl-puzzle__piece.is-placed {
        z-index: 5;
        border-color: transparent;
        border-radius: 0;
        background: transparent;
        box-shadow: none;
        cursor: default;
      }

      .kl-puzzle__piece.is-hidden {
        opacity: 0;
      }

      .kl-puzzle__completion {
        z-index: 7;
        display: none;
        pointer-events: none;
        transform: translateX(0);
      }

      .kl-puzzle__completion.is-visible {
        display: block;
      }
    `;

    const currentLang = context.speech.getLanguage();
    const banner = document.createElement('div');
    banner.className = 'kl-puzzle__banner';
    banner.textContent = `🧩 ${getI18nText('puzzleHint', currentLang)}`;
    this.banner = banner;

    const board = document.createElement('div');
    board.className = 'kl-puzzle__board';
    board.setAttribute('aria-label', '車の絵を組み立てるパズル');

    wrapper.append(style, banner, board);
    context.root.replaceChildren(wrapper);
    this.wrapper = wrapper;
    this.board = board;
    this.particles = new ParticleSystem(wrapper);

    const listenerOptions = { signal: this.abortController.signal };
    board.addEventListener('pointerdown', this.handlePointerDown, listenerOptions);
    board.addEventListener('pointermove', this.handlePointerMove, listenerOptions);
    board.addEventListener('pointerup', this.handlePointerEnd, listenerOptions);
    board.addEventListener('pointercancel', this.handlePointerEnd, listenerOptions);

    this.startRound();
  }

  unmount(): void {
    this.abortController?.abort();
    this.abortController = null;
    this.roundGeneration += 1;

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

    if (this.activePointerId !== null) {
      this.releaseActivePointer(this.activePointerId);
    }

    if (this.loadingImage) {
      this.loadingImage.onload = null;
      this.loadingImage.onerror = null;
    }

    this.wrapper?.remove();
    this.context = null;
    this.banner = null;
    this.wrapper = null;
    this.board = null;
    this.targetFrame = null;
    this.completionLayer = null;
    this.loadingImage = null;
    this.pieces = [];
    this.targetRect = null;
    this.activePointerId = null;
    this.activePieceIndex = null;
    this.completing = false;
  }

  private startRound(): void {
    if (!this.board || !this.context) return;

    for (const animation of this.animations) {
      animation.cancel();
    }
    this.animations.clear();
    this.releaseCurrentPointer();
    this.pieces = [];
    this.targetRect = null;
    this.targetFrame = null;
    this.completionLayer = null;
    this.completing = false;
    this.board.replaceChildren();

    if (this.loadingImage) {
      this.loadingImage.onload = null;
      this.loadingImage.onerror = null;
    }

    const vehicle = VEHICLES[this.vehicleIndex % VEHICLES.length]!;

    if (this.banner && this.context) {
      const currentLang = this.context.speech.getLanguage();
      this.banner.textContent = `🧩 ${getI18nText('puzzleBuild', currentLang)}`;
    }

    const generation = ++this.roundGeneration;
    const image = new Image();
    let handled = false;
    const renderWhenReady = (): void => {
      if (
        handled ||
        generation !== this.roundGeneration ||
        !this.context ||
        image.naturalWidth === 0
      ) {
        return;
      }
      handled = true;
      this.buildPuzzle(image);
    };
    image.onload = renderWhenReady;
    image.onerror = () => {
      handled = true;
    };
    image.src = vehicle.image;
    this.loadingImage = image;
    if (image.complete) {
      renderWhenReady();
    }
  }

  private buildPuzzle(image: HTMLImageElement): void {
    if (!this.board) return;

    const boardWidth = this.board.clientWidth;
    const boardHeight = this.board.clientHeight;
    const imageRatio = image.naturalHeight / image.naturalWidth;
    const widthFromHeight = (boardHeight - 185) / imageRatio;
    const targetWidth = Math.max(
      320,
      Math.min(boardWidth * 0.38, 520, widthFromHeight),
    );
    const targetHeight = targetWidth * imageRatio;
    const targetLeft = (boardWidth - targetWidth) / 2;
    const targetTop = clamp(
      (boardHeight - targetHeight) / 2 + 22,
      124,
      boardHeight - targetHeight - 24,
    );
    const targetRect: TargetRect = {
      x: targetLeft,
      y: targetTop,
      width: targetWidth,
      height: targetHeight,
    };
    this.targetRect = targetRect;

    const target = document.createElement('div');
    target.className = 'kl-puzzle__target';
    this.setRect(target, targetRect);

    const guide = document.createElement('canvas');
    guide.className = 'kl-puzzle__guide';
    guide.width = image.naturalWidth;
    guide.height = image.naturalHeight;
    guide.setAttribute('aria-hidden', 'true');
    guide.getContext('2d')?.drawImage(image, 0, 0);
    target.append(guide);

    const completion = document.createElement('div');
    completion.className = 'kl-puzzle__completion';
    this.setRect(completion, targetRect);

    const completeCar = document.createElement('canvas');
    completeCar.className = 'kl-puzzle__complete-car';
    completeCar.width = image.naturalWidth;
    completeCar.height = image.naturalHeight;
    completeCar.setAttribute('aria-hidden', 'true');
    completeCar.getContext('2d')?.drawImage(image, 0, 0);

    completion.append(completeCar);
    this.board.append(target, completion);
    this.targetFrame = target;
    this.completionLayer = completion;

    const columns = this.difficulty === 4 ? 2 : this.difficulty;
    const rows = this.difficulty === 4 ? 2 : 1;
    const pieceWidth = targetWidth / columns;
    const pieceHeight = targetHeight / rows;
    const slots = shuffled(
      this.makeStartingSlots(
        this.difficulty,
        boardWidth,
        boardHeight,
        targetRect,
        pieceWidth,
        pieceHeight,
      ),
    );

    let pieceIndex = 0;
    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        const sourceLeft = Math.round((image.naturalWidth * column) / columns);
        const sourceRight = Math.round(
          (image.naturalWidth * (column + 1)) / columns,
        );
        const sourceTop = Math.round((image.naturalHeight * row) / rows);
        const sourceBottom = Math.round(
          (image.naturalHeight * (row + 1)) / rows,
        );
        const sourceWidth = sourceRight - sourceLeft;
        const sourceHeight = sourceBottom - sourceTop;
        const slot = slots[pieceIndex] ?? { x: 20, y: 140 };

        const canvas = document.createElement('canvas');
        canvas.className = 'kl-puzzle__piece';
        canvas.width = sourceWidth;
        canvas.height = sourceHeight;
        canvas.dataset.pieceIndex = String(pieceIndex);
        canvas.setAttribute('role', 'img');
        canvas.setAttribute('aria-label', `車のパズルのピース ${pieceIndex + 1}`);
        canvas.style.left = `${slot.x}px`;
        canvas.style.top = `${slot.y}px`;
        canvas.style.width = `${pieceWidth}px`;
        canvas.style.height = `${pieceHeight}px`;
        canvas.getContext('2d')?.drawImage(
          image,
          sourceLeft,
          sourceTop,
          sourceWidth,
          sourceHeight,
          0,
          0,
          sourceWidth,
          sourceHeight,
        );

        this.pieces.push({
          element: canvas,
          startX: slot.x,
          startY: slot.y,
          targetX: targetLeft + column * pieceWidth,
          targetY: targetTop + row * pieceHeight,
          width: pieceWidth,
          height: pieceHeight,
          placed: false,
          motion: null,
        });
        this.board.append(canvas);
        pieceIndex += 1;
      }
    }
  }

  private makeStartingSlots(
    difficulty: Difficulty,
    boardWidth: number,
    boardHeight: number,
    target: TargetRect,
    pieceWidth: number,
    pieceHeight: number,
  ): Point[] {
    const margin = 18;
    const minimumTop = 118;
    const maximumTop = boardHeight - pieceHeight - margin;
    const targetRight = target.x + target.width;
    const leftCenter = (target.x - pieceWidth) / 2;
    const rightCenter = targetRight + (boardWidth - targetRight - pieceWidth) / 2;
    const clampedY = (value: number): number => clamp(value, minimumTop, maximumTop);

    if (difficulty === 2) {
      return [
        {
          x: clamp(leftCenter + jitter(14), margin, target.x - pieceWidth - 8),
          y: clampedY(target.y + jitter(22)),
        },
        {
          x: clamp(rightCenter + jitter(14), targetRight + 8, boardWidth - pieceWidth - margin),
          y: clampedY(target.y + jitter(22)),
        },
      ];
    }

    if (difficulty === 3) {
      const gap = 12;
      const pairWidth = pieceWidth * 2 + gap;
      const leftPairStart = clamp((target.x - pairWidth) / 2, margin, target.x - pairWidth - 6);
      const rightPairStart = clamp(targetRight + (boardWidth - targetRight - pairWidth) / 2, targetRight + 6, boardWidth - pairWidth - margin);
      const singleLeft = clamp(leftCenter, margin, target.x - pieceWidth - 6);
      const singleRight = clamp(rightCenter, targetRight + 6, boardWidth - pieceWidth - margin);
      const pairOnLeft = this.roundNumber % 2 === 0;

      if (pairOnLeft) {
        return [
          { x: leftPairStart, y: clampedY(target.y + jitter(16)) },
          { x: leftPairStart + pieceWidth + gap, y: clampedY(target.y + jitter(16)) },
          { x: singleRight, y: clampedY(target.y + jitter(20)) },
        ];
      }

      return [
        { x: singleLeft, y: clampedY(target.y + jitter(20)) },
        { x: rightPairStart, y: clampedY(target.y + jitter(16)) },
        { x: rightPairStart + pieceWidth + gap, y: clampedY(target.y + jitter(16)) },
      ];
    }

    const leftX = clamp(leftCenter + jitter(10), margin, target.x - pieceWidth - 8);
    const rightX = clamp(rightCenter + jitter(10), targetRight + 8, boardWidth - pieceWidth - margin);
    const upperY = clampedY(target.y - 16 + jitter(10));
    const lowerY = clampedY(target.y + pieceHeight + 16 + jitter(10));
    return [
      { x: leftX, y: upperY },
      { x: leftX, y: lowerY },
      { x: rightX, y: upperY },
      { x: rightX, y: lowerY },
    ];
  }

  private finishDrag(pointerId: number): void {
    const pieceIndex = this.activePieceIndex;
    const piece = pieceIndex === null ? undefined : this.pieces[pieceIndex];
    this.releaseActivePointer(pointerId);
    if (!piece) return;

    const currentX = Number.parseFloat(piece.element.style.left);
    const currentY = Number.parseFloat(piece.element.style.top);
    const pieceCenterX = currentX + piece.width / 2;
    const pieceCenterY = currentY + piece.height / 2;
    const targetCenterX = piece.targetX + piece.width / 2;
    const targetCenterY = piece.targetY + piece.height / 2;
    const inSnapArea =
      Math.abs(pieceCenterX - targetCenterX) <= piece.width * 0.75 &&
      Math.abs(pieceCenterY - targetCenterY) <= piece.height * 0.75;

    if (inSnapArea) {
      this.snapPiece(piece, currentX, currentY);
    } else {
      this.returnPiece(piece, currentX, currentY);
    }
  }

  private snapPiece(piece: PuzzlePiece, currentX: number, currentY: number): void {
    piece.placed = true;
    piece.element.classList.add('is-placed');
    piece.element.style.left = `${piece.targetX}px`;
    piece.element.style.top = `${piece.targetY}px`;
    piece.element.style.zIndex = '5';
    piece.element.style.transform = '';
    const animation = piece.element.animate(
      [
        { transform: `translate(${currentX - piece.targetX}px, ${currentY - piece.targetY}px) scale(1.08)` },
        { transform: 'translate(0, 0) scale(1)' },
      ],
      { duration: 250, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' },
    );
    piece.motion = animation;
    this.trackPieceAnimation(piece, animation);

    this.context?.sfx.play('snap');

    if (this.pieces.every((candidate) => candidate.placed)) {
      this.schedule(() => this.completePuzzle(), 270);
    }
  }

  private returnPiece(piece: PuzzlePiece, currentX: number, currentY: number): void {
    piece.element.style.left = `${piece.startX}px`;
    piece.element.style.top = `${piece.startY}px`;
    piece.element.style.zIndex = '3';
    piece.element.style.transform = '';
    const animation = piece.element.animate(
      [
        { transform: `translate(${currentX - piece.startX}px, ${currentY - piece.startY}px) scale(1.08)` },
        { transform: 'translate(0, 0) scale(1)' },
      ],
      { duration: 320, easing: 'ease-out' },
    );
    piece.motion = animation;
    this.trackPieceAnimation(piece, animation);
  }

  private completePuzzle(): void {
    if (this.completing || !this.context || !this.completionLayer) return;

    this.completing = true;
    this.targetFrame?.classList.add('is-complete');
    for (const piece of this.pieces) {
      piece.element.classList.add('is-hidden');
    }
    this.completionLayer.classList.add('is-visible');

    this.context.sfx.play('fanfare');
    this.context.speech.speak('completePuzzle');
    this.context.notifyTaskComplete();

    if (this.banner) {
      const currentLang = this.context.speech.getLanguage();
      this.banner.textContent = `🎉 ${getI18nText('puzzleComplete', currentLang)}`;
    }

    this.starsAtTarget();
    if (this.particles && this.wrapper) {
      const rect = this.wrapper.getBoundingClientRect();
      this.particles.emitCelebration(rect.width / 2, rect.height / 2);
      this.particles.emitFlowers(rect.width / 2, rect.height / 2, 12);
    }

    this.completionsAtDifficulty += 1;
    if (this.difficulty === 2 && this.completionsAtDifficulty >= 3) {
      this.difficulty = 3;
      this.completionsAtDifficulty = 0;
    } else if (this.difficulty === 3 && this.completionsAtDifficulty >= 3) {
      this.difficulty = 4;
      this.completionsAtDifficulty = 0;
    }

    const joyJump = this.completionLayer.animate(
      [
        { transform: 'translateY(0) scale(1)' },
        { transform: 'translateY(-28px) scale(1.08)', offset: 0.45 },
        { transform: 'translateY(0) scale(1)' },
      ],
      { duration: 600, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' },
    );
    this.trackAnimation(joyJump);

    this.schedule(() => {
      this.context?.sfx.play('engine');
      this.context?.speech.speak('wellDone');
    }, 750);

    this.schedule(() => {
      if (!this.completionLayer || !this.board || !this.targetRect) return;
      const travel = this.board.clientWidth - this.targetRect.x + 120;
      const driveAnimation = this.completionLayer.animate(
        [
          { transform: 'translateX(0)' },
          { transform: `translateX(${travel}px)` },
        ],
        {
          duration: 980,
          easing: 'cubic-bezier(0.45, 0, 0.55, 1)',
          fill: 'forwards',
        },
      );
      this.trackAnimation(driveAnimation);
    }, 1100);

    this.schedule(() => {
      this.vehicleIndex = (this.vehicleIndex + 1) % VEHICLES.length;
      this.roundNumber += 1;
      this.startRound();
    }, 2200);
  }

  private starsAtTarget(): void {
    if (!this.particles || !this.targetRect || !this.wrapper || !this.board) return;

    const wrapperRect = this.wrapper.getBoundingClientRect();
    const boardRect = this.board.getBoundingClientRect();
    const offsetLeft = boardRect.left - wrapperRect.left + this.targetRect.x;
    const offsetTop = boardRect.top - wrapperRect.top + this.targetRect.y;
    this.particles.emitStars(
      offsetLeft + this.targetRect.width / 2,
      offsetTop + this.targetRect.height / 2,
      18,
      ['#ffd740', '#ff5252', '#448aff', '#69f0ae', '#ab47bc'],
    );
  }

  private setRect(element: HTMLElement, rect: TargetRect): void {
    element.style.left = `${rect.x}px`;
    element.style.top = `${rect.y}px`;
    element.style.width = `${rect.width}px`;
    element.style.height = `${rect.height}px`;
  }

  private releaseCurrentPointer(): void {
    if (this.activePointerId !== null) {
      this.releaseActivePointer(this.activePointerId);
    }
  }

  private releaseActivePointer(pointerId: number): void {
    const piece = this.activePieceIndex === null ? undefined : this.pieces[this.activePieceIndex];
    if (piece?.element.hasPointerCapture(pointerId)) {
      try {
        piece.element.releasePointerCapture(pointerId);
      } catch {}
    }
    this.activePointerId = null;
    this.activePieceIndex = null;
  }

  private schedule(callback: () => void, delay: number): void {
    const timer = window.setTimeout(() => {
      this.timers.delete(timer);
      callback();
    }, delay);
    this.timers.add(timer);
  }

  private trackPieceAnimation(piece: PuzzlePiece, animation: Animation): void {
    this.animations.add(animation);
    const remove = (): void => {
      this.animations.delete(animation);
      if (piece.motion === animation) {
        piece.motion = null;
      }
    };
    animation.addEventListener('finish', remove, { once: true });
    animation.addEventListener('cancel', remove, { once: true });
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

export function createPuzzleActivity(): Activity {
  return new PuzzleActivity();
}
export const puzzleActivity: Activity = new PuzzleActivity();
