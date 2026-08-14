export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  maxLife: number;
  life: number;
  color: string;
  type: 'sparkle' | 'bubble' | 'water' | 'smoke' | 'star';
  scale?: number;
  rotation?: number;
  vRot?: number;
}

export class ParticleSystem {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private particles: Particle[] = [];
  private animId: number | null = null;
  private isDestroyed = false;
  private dpr = 1;

  constructor(container: HTMLElement) {
    this.canvas = document.createElement('canvas');
    this.canvas.style.position = 'absolute';
    this.canvas.style.inset = '0';
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.pointerEvents = 'none';
    this.canvas.style.zIndex = '30';

    container.appendChild(this.canvas);
    const ctx = this.canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas 2D context not available');
    }
    this.ctx = ctx;
    this.resize();

    window.addEventListener('resize', this.handleResize);
    this.loop();
  }

  private readonly handleResize = (): void => {
    this.resize();
  };

  private resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.max(1, Math.round(rect.width * this.dpr));
    this.canvas.height = Math.max(1, Math.round(rect.height * this.dpr));
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  public emitSparkles(x: number, y: number, count = 12, colorHex = '#ffd700'): void {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5);
      const speed = 2 + Math.random() * 4;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1,
        size: 6 + Math.random() * 8,
        alpha: 1,
        maxLife: 28 + Math.random() * 18,
        life: 0,
        color: colorHex,
        type: 'sparkle',
        rotation: Math.random() * Math.PI,
        vRot: (Math.random() - 0.5) * 0.2,
      });
    }
  }

  public emitBubbles(x: number, y: number, count = 5): void {
    const colors = ['rgba(255,255,255,0.85)', 'rgba(210,240,255,0.85)', 'rgba(255,220,245,0.85)'];
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 30,
        y: y + (Math.random() - 0.5) * 30,
        vx: (Math.random() - 0.5) * 1.5,
        vy: -1.2 - Math.random() * 1.8,
        size: 10 + Math.random() * 16,
        alpha: 0.85,
        maxLife: 40 + Math.random() * 30,
        life: 0,
        color: colors[Math.floor(Math.random() * colors.length)]!,
        type: 'bubble',
      });
    }
  }

  public emitWaterDrops(x: number, y: number, count = 8): void {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 20,
        y,
        vx: (Math.random() - 0.5) * 4,
        vy: 2 + Math.random() * 5,
        size: 4 + Math.random() * 5,
        alpha: 0.9,
        maxLife: 20 + Math.random() * 15,
        life: 0,
        color: '#4fc3f7',
        type: 'water',
      });
    }
  }

  public emitSmokePuffs(x: number, y: number, count = 2): void {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 10,
        y: y + (Math.random() - 0.5) * 10,
        vx: -1.5 - Math.random() * 1.5,
        vy: -0.5 - Math.random() * 1,
        size: 8 + Math.random() * 10,
        alpha: 0.7,
        maxLife: 30 + Math.random() * 20,
        life: 0,
        color: 'rgba(240, 240, 245, 0.8)',
        type: 'smoke',
      });
    }
  }

  public emitStars(x: number, y: number, count = 16, palette?: string[]): void {
    const defaultColors = ['#ff4081', '#ffd700', '#00e676', '#29b6f6', '#ab47bc'];
    const colors = palette && palette.length > 0 ? palette : defaultColors;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 3 + Math.random() * 6;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.5,
        size: 8 + Math.random() * 10,
        alpha: 1,
        maxLife: 35 + Math.random() * 25,
        life: 0,
        color: colors[Math.floor(Math.random() * colors.length)]!,
        type: 'star',
        rotation: Math.random() * Math.PI,
        vRot: (Math.random() - 0.5) * 0.3,
      });
    }
  }

  private loop = (): void => {
    if (this.isDestroyed) return;
    this.update();
    this.draw();
    this.animId = requestAnimationFrame(this.loop);
  };

  private update(): void {
    const width = this.canvas.width / this.dpr;
    const height = this.canvas.height / this.dpr;

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]!;
      p.life++;
      p.x += p.vx;
      p.y += p.vy;

      if (p.rotation !== undefined && p.vRot !== undefined) {
        p.rotation += p.vRot;
      }

      if (p.type === 'bubble') {
        p.vx += Math.sin(p.life * 0.1) * 0.1;
      } else if (p.type === 'water') {
        p.vy += 0.3; // gravity
      } else if (p.type === 'smoke') {
        p.size += 0.4;
        p.alpha = Math.max(0, 0.7 * (1 - p.life / p.maxLife));
      } else if (p.type === 'star' || p.type === 'sparkle') {
        p.vy += 0.15; // light gravity
        p.alpha = Math.max(0, 1 - p.life / p.maxLife);
      }

      if (p.life >= p.maxLife || p.x < -50 || p.x > width + 50 || p.y > height + 50) {
        this.particles.splice(i, 1);
      }
    }
  }

  private draw(): void {
    const width = this.canvas.width / this.dpr;
    const height = this.canvas.height / this.dpr;
    this.ctx.clearRect(0, 0, width, height);

    for (const p of this.particles) {
      this.ctx.save();
      this.ctx.globalAlpha = p.alpha;
      this.ctx.translate(p.x, p.y);

      if (p.rotation) {
        this.ctx.rotate(p.rotation);
      }

      if (p.type === 'sparkle') {
        this.ctx.fillStyle = p.color;
        const s = p.size;
        this.ctx.beginPath();
        this.ctx.moveTo(0, -s);
        this.ctx.quadraticCurveTo(0, 0, s, 0);
        this.ctx.quadraticCurveTo(0, 0, 0, s);
        this.ctx.quadraticCurveTo(0, 0, -s, 0);
        this.ctx.quadraticCurveTo(0, 0, 0, -s);
        this.ctx.fill();
      } else if (p.type === 'star') {
        this.ctx.fillStyle = p.color;
        const rOuter = p.size;
        const rInner = p.size * 0.4;
        this.ctx.beginPath();
        for (let i = 0; i < 5; i++) {
          const a1 = (Math.PI * 2 * i) / 5 - Math.PI / 2;
          const a2 = a1 + Math.PI / 5;
          const x1 = Math.cos(a1) * rOuter;
          const y1 = Math.sin(a1) * rOuter;
          const x2 = Math.cos(a2) * rInner;
          const y2 = Math.sin(a2) * rInner;
          if (i === 0) this.ctx.moveTo(x1, y1);
          else this.ctx.lineTo(x1, y1);
          this.ctx.lineTo(x2, y2);
        }
        this.ctx.closePath();
        this.ctx.fill();
      } else if (p.type === 'bubble') {
        this.ctx.beginPath();
        this.ctx.arc(0, 0, p.size, 0, Math.PI * 2);
        this.ctx.fillStyle = p.color;
        this.ctx.fill();
        this.ctx.lineWidth = 1.5;
        this.ctx.strokeStyle = 'rgba(255,255,255,0.9)';
        this.ctx.stroke();

        // Bubble highlight
        this.ctx.beginPath();
        this.ctx.arc(-p.size * 0.3, -p.size * 0.3, p.size * 0.25, 0, Math.PI * 2);
        this.ctx.fillStyle = 'rgba(255,255,255,0.8)';
        this.ctx.fill();
      } else if (p.type === 'water') {
        this.ctx.beginPath();
        this.ctx.arc(0, 0, p.size, 0, Math.PI * 2);
        this.ctx.fillStyle = p.color;
        this.ctx.fill();
      } else if (p.type === 'smoke') {
        this.ctx.beginPath();
        this.ctx.arc(0, 0, p.size, 0, Math.PI * 2);
        this.ctx.fillStyle = p.color;
        this.ctx.fill();
      }

      this.ctx.restore();
    }
  }

  public destroy(): void {
    this.isDestroyed = true;
    if (this.animId !== null) {
      cancelAnimationFrame(this.animId);
    }
    window.removeEventListener('resize', this.handleResize);
    this.canvas.remove();
    this.particles = [];
  }
}
