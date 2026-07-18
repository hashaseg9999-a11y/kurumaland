import menuIcon from '../assets/placeholder/menu-dummy.svg';
import type { Activity, ActivityContext } from '../core/activity';

class DummyActivity implements Activity {
  readonly id = 'demo-pop';
  readonly menuIcon = menuIcon;

  private context: ActivityContext | null = null;
  private target: HTMLButtonElement | null = null;
  private feedbackAnimation: Animation | null = null;

  private readonly handleActivate = (event: MouseEvent): void => {
    if (!this.context || !this.target) {
      return;
    }

    event.preventDefault();
    this.context.sfx.play('pop');
    this.feedbackAnimation?.cancel();
    this.feedbackAnimation = this.target.animate(
      [
        { transform: 'scale(1)' },
        { transform: 'scale(1.035)' },
        { transform: 'scale(1)' },
      ],
      {
        duration: 240,
        easing: 'ease-out',
      },
    );
  };

  mount(context: ActivityContext): void {
    this.unmount();
    this.context = context;

    const target = document.createElement('button');
    target.type = 'button';
    target.className = 'dummy-tap';
    target.setAttribute('aria-label', '効果音を鳴らす');

    const image = document.createElement('img');
    image.src = this.menuIcon;
    image.alt = '';
    image.draggable = false;
    target.append(image);
    target.addEventListener('click', this.handleActivate);

    context.root.replaceChildren(target);
    this.target = target;
  }

  unmount(): void {
    this.feedbackAnimation?.cancel();
    this.feedbackAnimation = null;
    this.target?.removeEventListener('click', this.handleActivate);
    this.target?.remove();
    this.target = null;
    this.context = null;
  }
}

export const dummyActivity: Activity = new DummyActivity();
