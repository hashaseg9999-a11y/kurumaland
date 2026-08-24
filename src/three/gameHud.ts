import type { GameContext } from './contracts';

export interface GameHud {
  setProgress(done: number, total: number): void;
  celebrate(message: string): void;
  dispose(): void;
}

export function createGameHud(context: GameContext, label: string): GameHud {
  const root = document.createElement('div');
  root.className = 'three-game-hud';
  root.setAttribute('data-three-game-ui', '');

  const title = document.createElement('span');
  title.className = 'three-game-hud__title';
  title.textContent = label;

  const progress = document.createElement('span');
  progress.className = 'three-game-hud__progress';
  progress.textContent = '';
  progress.setAttribute('role', 'img');

  const celebrateEl = document.createElement('div');
  celebrateEl.className = 'three-game-hud__celebrate';
  celebrateEl.textContent = '';

  root.append(progress, title, celebrateEl);
  context.overlay.append(root);

  let celebrateTimer = 0;

  return {
    setProgress(done, total) {
      if (total <= 0) {
        progress.replaceChildren();
        progress.hidden = true;
        progress.removeAttribute('aria-label');
        progress.classList.remove('is-done');
        return;
      }
      const safeTotal = Math.max(0, Math.floor(total));
      const safeDone = Math.min(safeTotal, Math.max(0, Math.floor(done)));
      progress.hidden = false;
      const dots: HTMLSpanElement[] = [];
      for (let index = 0; index < safeTotal; index += 1) {
        const dot = document.createElement('span');
        dot.className = 'three-game-hud__dot';
        if (index < safeDone) dot.classList.add('is-done');
        dots.push(dot);
      }
      progress.setAttribute('aria-label', 'しんこう ' + safeDone + ' / ' + safeTotal);
      progress.classList.toggle('is-done', safeDone >= safeTotal);
      progress.replaceChildren(...dots);
    },
    celebrate(message) {
      celebrateEl.textContent = message;
      celebrateEl.classList.add('is-visible');
      if (celebrateTimer) window.clearTimeout(celebrateTimer);
      celebrateTimer = window.setTimeout(() => {
        celebrateEl.classList.remove('is-visible');
      }, 1800);
    },
    dispose() {
      if (celebrateTimer) window.clearTimeout(celebrateTimer);
      root.remove();
    },
  };
}

