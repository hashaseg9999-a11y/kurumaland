import carBlue from '../assets/car_blue.webp';
import carGreen from '../assets/car_green.webp';
import carRed from '../assets/car_red.webp';
import carYellow from '../assets/car_yellow.webp';
import menuIcon from '../assets/menu_puzzle.webp';
import type { Activity, ActivityContext } from '../core/activity';

type Difficulty = 2 | 3 | 4;
type CarVocabKey = 'redCar' | 'blueCar' | 'yellowCar' | 'greenCar';

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

const VEHICLES: readonly { image: string; vocab: CarVocabKey }[] = [
  { image: carRed, vocab: 'redCar' },
  { image: carBlue, vocab: 'blueCar' },
  { image: carYellow, vocab: 'yellowCar' },
  { image: carGreen, vocab: 'greenCar' },
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
    if (current === undefined || swap === undefined) {
      continue;
    }
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
  private targetFrame: HTMLDivElement | null = null;
  private completionLayer: HTMLDivElement | null = null;
  private eyelid: HTMLSpanElement | null = null;
  private abortController: AbortController | null = null;
  private loadingImage: HTMLImageElement | null = null;
  private readonly timers = new Set<number>();
  private readonly animations = new Set<Animation>();
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
    if (!Number.isInteger(pieceIndex) || !piece || piece.placed) {
      return;
    }

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
    piece.element.style.transform = 'scale(1.035)';
    piece.element.setPointerCapture(event.pointerId);
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
    if (!piece) {
      return;
    }

    event.preventDefault();
    const boardBounds = this.board.getBoundingClientRect();
    const nextX = event.clientX - boardBounds.left - this.dragOffset.x;
    const nextY = event.clientY - boardBounds.top - this.dragOffset.y;
    piece.element.style.left = `${clamp(nextX, -piece.width * 0.12, boardBounds.width - piece.width * 0.88)}px`;
    piece.element.style.top = `${clamp(nextY, -piece.height * 0.12, boardBounds.height - piece.height * 0.88)}px`;
  };

  private readonly handlePointerEnd = (event: PointerEvent): void => {
    if (event.pointerId !== this.activePointerId) {
      return;
    }

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
        background:
          radial-gradient(circle at 50% 45%, rgb(255 255 255 / 90%), transparent 34%),
          linear-gradient(150deg, #dff5ff 0%, #eefbdc 100%);
        touch-action: none;
      }

      .kl-puzzle__board {
        position: absolute;
        inset: 0;
        overflow: hidden;
      }

      .kl-puzzle__target,
      .kl-puzzle__completion {
        position: absolute;
        border-radius: 24px;
      }

      .kl-puzzle__target {
        border: 5px dashed rgb(55 105 130 / 28%);
        background: rgb(255 255 255 / 52%);
        box-shadow: inset 0 0 0 8px rgb(255 255 255 / 25%);
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
        opacity: 0.16;
      }

      .kl-puzzle__piece {
        position: absolute;
        z-index: 3;
        min-width: 80px;
        min-height: 80px;
        border: 3px solid rgb(53 85 103 / 24%);
        border-radius: 16px;
        background: rgb(255 255 255 / 34%);
        box-shadow: 0 8px 18px rgb(33 72 93 / 16%);
        cursor: grab;
        touch-action: none;
        transform-origin: center;
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

      .kl-puzzle__eyelid {
        position: absolute;
        top: 49%;
        left: 70.5%;
        width: 7.5%;
        height: 5%;
        border-bottom: clamp(3px, 0.55vw, 7px) solid #49413d;
        border-radius: 50%;
        opacity: 0;
        transform: rotate(-5deg);
      }

      @media (prefers-reduced-motion: reduce) {
        .kl-puzzle__target {
          transition: none;
        }
      }
    `;

    const board = document.createElement('div');
    board.className = 'kl-puzzle__board';
    board.setAttribute('aria-label', '車の絵を組み立てるパズル');

    wrapper.append(style, board);
    context.root.replaceChildren(wrapper);
    this.wrapper = wrapper;
    this.board = board;

    const listenerOptions = { signal: this.abortController.signal };
    board.addEventListener('pointerdown', this.handlePointerDown, listenerOptions);
    board.addEventListener('pointermove', this.handlePointerMove, listenerOptions);
    board.addEventListener('pointerup', this.handlePointerEnd, listenerOptions);
    board.addEventListener('pointercancel', this.handlePointerEnd, listenerOptions);
    board.addEventListener('lostpointercapture', this.handlePointerEnd, listenerOptions);

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

    if (this.activePointerId !== null) {
      this.releaseActivePointer(this.activePointerId);
    }

    if (this.loadingImage) {
      this.loadingImage.onload = null;
      this.loadingImage.onerror = null;
    }

    this.wrapper?.remove();
    this.context = null;
    this.wrapper = null;
    this.board = null;
    this.targetFrame = null;
    this.completionLayer = null;
    this.eyelid = null;
    this.loadingImage = null;
    this.pieces = [];
    this.targetRect = null;
    this.activePointerId = null;
    this.activePieceIndex = null;
    this.completing = false;
  }

  private startRound(): void {
    if (!this.board || !this.context) {
      return;
    }

    for (const animation of this.animations) {
      animation.cancel();
    }
    this.animations.clear();
    this.releaseCurrentPointer();
    this.pieces = [];
    this.targetRect = null;
    this.targetFrame = null;
    this.completionLayer = null;
    this.eyelid = null;
    this.completing = false;
    this.board.replaceChildren();

    if (this.loadingImage) {
      this.loadingImage.onload = null;
      this.loadingImage.onerror = null;
    }

    const vehicle = VEHICLES[this.vehicleIndex];
    if (!vehicle) {
      return;
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
    if (!this.board) {
      return;
    }

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

    const eyelid = document.createElement('span');
    eyelid.className = 'kl-puzzle__eyelid';
    completion.append(completeCar, eyelid);

    this.board.append(target, completion);
    this.targetFrame = target;
    this.completionLayer = completion;
    this.eyelid = eyelid;

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
    const clampedY = (value: number): number =>
      clamp(value, minimumTop, maximumTop);

    if (difficulty === 2) {
      return [
        {
          x: clamp(leftCenter + jitter(14), margin, target.x - pieceWidth - 8),
          y: clampedY(target.y + jitter(22)),
        },
        {
          x: clamp(
            rightCenter + jitter(14),
            targetRight + 8,
            boardWidth - pieceWidth - margin,
          ),
          y: clampedY(target.y + jitter(22)),
        },
      ];
    }

    if (difficulty === 3) {
      const gap = 12;
      const pairWidth = pieceWidth * 2 + gap;
      const leftPairStart = clamp(
        (target.x - pairWidth) / 2,
        margin,
        target.x - pairWidth - 6,
      );
      const rightPairStart = clamp(
        targetRight + (boardWidth - targetRight - pairWidth) / 2,
        targetRight + 6,
        boardWidth - pairWidth - margin,
      );
      const singleLeft = clamp(
        leftCenter,
        margin,
        target.x - pieceWidth - 6,
      );
      const singleRight = clamp(
        rightCenter,
        targetRight + 6,
        boardWidth - pieceWidth - margin,
      );
      const pairOnLeft = this.roundNumber % 2 === 0;

      if (pairOnLeft) {
        return [
          { x: leftPairStart, y: clampedY(target.y + jitter(16)) },
          {
            x: leftPairStart + pieceWidth + gap,
            y: clampedY(target.y + jitter(16)),
          },
          { x: singleRight, y: clampedY(target.y + jitter(20)) },
        ];
      }

      return [
        { x: singleLeft, y: clampedY(target.y + jitter(20)) },
        { x: rightPairStart, y: clampedY(target.y + jitter(16)) },
        {
          x: rightPairStart + pieceWidth + gap,
          y: clampedY(target.y + jitter(16)),
        },
      ];
    }

    const leftX = clamp(
      leftCenter + jitter(10),
      margin,
      target.x - pieceWidth - 8,
    );
    const rightX = clamp(
      rightCenter + jitter(10),
      targetRight + 8,
      boardWidth - pieceWidth - margin,
    );
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
    if (!piece) {
      return;
    }

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

  private snapPiece(
    piece: PuzzlePiece,
    currentX: number,
    currentY: number,
  ): void {
    piece.placed = true;
    piece.element.classList.add('is-placed');
    piece.element.style.left = `${piece.targetX}px`;
    piece.element.style.top = `${piece.targetY}px`;
    piece.element.style.zIndex = '5';
    piece.element.style.transform = '';
    const animation = piece.element.animate(
      [
        {
          transform: `translate(${currentX - piece.targetX}px, ${currentY - piece.targetY}px) scale(1.035)`,
        },
        { transform: 'translate(0, 0) scale(1)' },
      ],
      { duration: 250, easing: 'ease-out' },
    );
    piece.motion = animation;
    this.trackPieceAnimation(piece, animation);
    this.context?.sfx.play('pop');

    if (this.pieces.every((candidate) => candidate.placed)) {
      this.schedule(() => this.completePuzzle(), 270);
    }
  }

  private returnPiece(
    piece: PuzzlePiece,
    currentX: number,
    currentY: number,
  ): void {
    piece.element.style.left = `${piece.startX}px`;
    piece.element.style.top = `${piece.startY}px`;
    piece.element.style.zIndex = '3';
    piece.element.style.transform = '';
    const animation = piece.element.animate(
      [
        {
          transform: `translate(${currentX - piece.startX}px, ${currentY - piece.startY}px) scale(1.035)`,
        },
        { transform: 'translate(0, 0) scale(1)' },
      ],
      { duration: 300, easing: 'ease-out' },
    );
    piece.motion = animation;
    this.trackPieceAnimation(piece, animation);
  }

  private completePuzzle(): void {
    if (this.completing || !this.context || !this.completionLayer) {
      return;
    }

    const vehicle = VEHICLES[this.vehicleIndex];
    if (!vehicle) {
      return;
    }

    this.completing = true;
    this.targetFrame?.classList.add('is-complete');
    for (const piece of this.pieces) {
      piece.element.classList.add('is-hidden');
    }
    this.completionLayer.classList.add('is-visible');
    this.context.sfx.play('chime');
    this.context.speech.speak(vehicle.vocab);
    this.context.notifyTaskComplete();

    this.completionsAtDifficulty += 1;
    if (this.difficulty === 2 && this.completionsAtDifficulty >= 3) {
      this.difficulty = 3;
      this.completionsAtDifficulty = 0;
    } else if (this.difficulty === 3 && this.completionsAtDifficulty >= 3) {
      this.difficulty = 4;
      this.completionsAtDifficulty = 0;
    }

    if (this.eyelid) {
      const blinkAnimation = this.eyelid.animate(
        [
          { opacity: 0 },
          { opacity: 1, offset: 0.18 },
          { opacity: 0, offset: 0.34 },
          { opacity: 0, offset: 0.58 },
          { opacity: 1, offset: 0.72 },
          { opacity: 0 },
        ],
        { duration: 760, easing: 'ease-in-out' },
      );
      this.trackAnimation(blinkAnimation);
    }

    const gentleBounce = this.completionLayer.animate(
      [
        { transform: 'translateY(0) scale(1)' },
        { transform: 'translateY(-7px) scale(1.015)' },
        { transform: 'translateY(0) scale(1)' },
      ],
      { duration: 520, easing: 'ease-out' },
    );
    this.trackAnimation(gentleBounce);

    this.schedule(() => {
      this.context?.speech.speak('wellDone');
    }, 920);

    this.schedule(() => {
      if (!this.completionLayer || !this.board || !this.targetRect) {
        return;
      }
      const travel = this.board.clientWidth - this.targetRect.x + 60;
      const driveAnimation = this.completionLayer.animate(
        [
          { transform: 'translateX(0)' },
          { transform: `translateX(${travel}px)` },
        ],
        {
          duration: 940,
          easing: 'ease-in-out',
          fill: 'forwards',
        },
      );
      this.trackAnimation(driveAnimation);
    }, 960);

    this.schedule(() => {
      this.vehicleIndex = (this.vehicleIndex + 1) % VEHICLES.length;
      this.roundNumber += 1;
      this.startRound();
    }, 2_020);
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
    const pieceIndex = this.activePieceIndex;
    const piece = pieceIndex === null ? undefined : this.pieces[pieceIndex];
    this.activePointerId = null;
    this.activePieceIndex = null;
    if (piece?.element.hasPointerCapture(pointerId)) {
      piece.element.releasePointerCapture(pointerId);
    }
    if (piece) {
      piece.element.style.transform = '';
      piece.element.style.zIndex = piece.placed ? '5' : '3';
    }
  }

  private schedule(callback: () => void, delay: number): void {
    const timer = window.setTimeout(() => {
      this.timers.delete(timer);
      callback();
    }, delay);
    this.timers.add(timer);
  }

  private trackPieceAnimation(
    piece: PuzzlePiece,
    animation: Animation,
  ): void {
    this.trackAnimation(animation);
    void animation.finished
      .catch(() => undefined)
      .finally(() => {
        if (piece.motion === animation) {
          piece.motion = null;
        }
      });
  }

  private trackAnimation(animation: Animation): void {
    this.animations.add(animation);
    void animation.finished
      .catch(() => undefined)
      .finally(() => this.animations.delete(animation));
  }
}

export const puzzleActivity: Activity = new PuzzleActivity();
