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
  type: 'sparkle' | 'bubble' | 'water' | 'smoke' | 'star' | 'music' | 'heart' | 'confetti' | 'flower' | 'rainbow';
  scale?: number;
  rotation?: number;
  vRot?: number;
  width?: number;
  height?: number;
  text?: string;
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

  public emitSparkles(x: number, y: number, count = 16, colorHex = '#ffd700'): void {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5);
      const speed = 3.0 + Math.random() * 5.0;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.5,
        size: 8 + Math.random() * 10,
        alpha: 1,
        maxLife: 35 + Math.random() * 20,
        life: 0,
        color: colorHex,
        type: 'sparkle',
        rotation: Math.random() * Math.PI,
        vRot: (Math.random() - 0.5) * 0.3,
      });
    }
  }

  public emitBubbles(x: number, y: number, count = 8): void {
    const colors = ['rgba(255,255,255,0.95)', 'rgba(186,230,253,0.92)', 'rgba(254,215,170,0.92)', 'rgba(244,114,182,0.9)'];
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 45,
        y: y + (Math.random() - 0.5) * 45,
        vx: (Math.random() - 0.5) * 2.2,
        vy: -2.0 - Math.random() * 2.5,
        size: 14 + Math.random() * 22,
        alpha: 0.95,
        maxLife: 50 + Math.random() * 40,
        life: 0,
        color: colors[Math.floor(Math.random() * colors.length)]!,
        type: 'bubble',
      });
    }
  }

  public emitWaterDrops(x: number, y: number, count = 14): void {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 30,
        y,
        vx: (Math.random() - 0.5) * 5.0,
        vy: 2.5 + Math.random() * 6.5,
        size: 6 + Math.random() * 8,
        alpha: 0.95,
        maxLife: 26 + Math.random() * 20,
        life: 0,
        color: '#38bdf8',
        type: 'water',
      });
    }
  }

  public emitSmokePuffs(x: number, y: number, count = 4): void {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 14,
        y: y + (Math.random() - 0.5) * 14,
        vx: -2.0 - Math.random() * 2.0,
        vy: -0.8 - Math.random() * 1.5,
        size: 12 + Math.random() * 15,
        alpha: 0.8,
        maxLife: 40 + Math.random() * 25,
        life: 0,
        color: 'rgba(240, 240, 248, 0.9)',
        type: 'smoke',
      });
    }
  }

  public emitStars(x: number, y: number, count = 24, palette?: string[]): void {
    const defaultColors = ['#ff4081', '#ffd700', '#00e676', '#38bdf8', '#a855f7', '#fb923c'];
    const colors = palette && palette.length > 0 ? palette : defaultColors;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 4.0 + Math.random() * 7.5;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2.5,
        size: 11 + Math.random() * 13,
        alpha: 1,
        maxLife: 45 + Math.random() * 30,
        life: 0,
        color: colors[Math.floor(Math.random() * colors.length)]!,
        type: 'star',
        rotation: Math.random() * Math.PI,
        vRot: (Math.random() - 0.5) * 0.4,
      });
    }
  }

  public emitMusicNotes(x: number, y: number, count = 4): void {
    const noteColors = ['#ff4081', '#7c4dff', '#00e5ff', '#ffd700', '#00e676'];
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 40,
        y: y + (Math.random() - 0.5) * 25,
        vx: (Math.random() - 0.5) * 2.5,
        vy: -2.2 - Math.random() * 3.0,
        size: 18 + Math.random() * 10,
        alpha: 1,
        maxLife: 50 + Math.random() * 30,
        life: 0,
        color: noteColors[Math.floor(Math.random() * noteColors.length)]!,
        type: 'music',
        rotation: (Math.random() - 0.5) * 0.5,
        vRot: (Math.random() - 0.5) * 0.06,
      });
    }
  }

  public emitConfetti(x: number, y: number, count = 35): void {
    const colors = ['#ff007f', '#ffcc00', '#00e676', '#00b0ff', '#aa00ff', '#ff3d00'];
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
      const speed = 4.5 + Math.random() * 8.0;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 4.5,
        size: 8 + Math.random() * 6,
        width: 12 + Math.random() * 10,
        height: 6 + Math.random() * 6,
        alpha: 1,
        maxLife: 60 + Math.random() * 35,
        life: 0,
        color: colors[Math.floor(Math.random() * colors.length)]!,
        type: 'confetti',
        rotation: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.35,
      });
    }
  }

  public emitHearts(x: number, y: number, count = 6): void {
    const colors = ['#ff4081', '#f50057', '#ff80ab', '#ff1744'];
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 30,
        y: y + (Math.random() - 0.5) * 20,
        vx: (Math.random() - 0.5) * 2.5,
        vy: -2.5 - Math.random() * 2.5,
        size: 14 + Math.random() * 12,
        alpha: 1,
        maxLife: 45 + Math.random() * 25,
        life: 0,
        color: colors[Math.floor(Math.random() * colors.length)]!,
        type: 'heart',
        rotation: (Math.random() - 0.5) * 0.4,
        vRot: (Math.random() - 0.5) * 0.05,
      });
    }
  }

  public emitFlowers(x: number, y: number, count = 8): void {
    const flowerColors = ['#ff69b4', '#ffd700', '#00e676', '#a855f7', '#38bdf8'];
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 40,
        y: y + (Math.random() - 0.5) * 30,
        vx: (Math.random() - 0.5) * 3.0,
        vy: -1.5 - Math.random() * 3.0,
        size: 12 + Math.random() * 10,
        alpha: 1,
        maxLife: 50 + Math.random() * 30,
        life: 0,
        color: flowerColors[Math.floor(Math.random() * flowerColors.length)]!,
        type: 'flower',
        rotation: Math.random() * Math.PI,
        vRot: (Math.random() - 0.5) * 0.2,
      });
    }
  }

  public emitRainbowTrail(x: number, y: number): void {
    const rainbow = ['#ff4d4d', '#ff9933', '#ffff33', '#33cc33', '#3399ff', '#9933ff'];
    rainbow.forEach((color, idx) => {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 8,
        y: y + (idx - 2.5) * 4,
        vx: -1.5 - Math.random() * 1.5,
        vy: (Math.random() - 0.5) * 0.8,
        size: 8 + Math.random() * 4,
        alpha: 0.9,
        maxLife: 28,
        life: 0,
        color,
        type: 'rainbow',
      });
    });
  }

  public emitCelebration(x: number, y: number): void {
    this.emitConfetti(x, y, 32);
    this.emitStars(x, y, 24);
    this.emitSparkles(x, y, 20, '#ffffff');
    this.emitHearts(x, y, 8);
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
        p.vx += Math.sin(p.life * 0.1) * 0.15;
      } else if (p.type === 'water') {
        p.vy += 0.4;
      } else if (p.type === 'smoke') {
        p.size += 0.5;
        p.alpha = Math.max(0, 0.8 * (1 - p.life / p.maxLife));
      } else if (p.type === 'star' || p.type === 'sparkle') {
        p.vy += 0.18;
        p.alpha = Math.max(0, 1 - p.life / p.maxLife);
      } else if (p.type === 'confetti') {
        p.vy += 0.22;
        p.vx *= 0.98;
        p.alpha = Math.max(0, 1 - p.life / p.maxLife);
      } else if (p.type === 'music') {
        p.vx += Math.sin(p.life * 0.12) * 0.18;
        p.alpha = Math.max(0, 1 - p.life / p.maxLife);
      }

      if (p.life >= p.maxLife || p.x < -60 || p.x > width + 60 || p.y > height + 60) {
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
        const rInner = p.size * 0.42;
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
      } else if (p.type === 'confetti') {
        this.ctx.fillStyle = p.color;
        const w = p.width || 12;
        const h = p.height || 6;
        this.ctx.fillRect(-w / 2, -h / 2, w, h);
      } else if (p.type === 'bubble') {
        this.ctx.beginPath();
        this.ctx.arc(0, 0, p.size, 0, Math.PI * 2);
        this.ctx.fillStyle = p.color;
        this.ctx.fill();
        this.ctx.lineWidth = 2;
        this.ctx.strokeStyle = 'rgba(255,255,255,0.95)';
        this.ctx.stroke();

        this.ctx.beginPath();
        this.ctx.arc(-p.size * 0.3, -p.size * 0.3, p.size * 0.25, 0, Math.PI * 2);
        this.ctx.fillStyle = 'rgba(255,255,255,0.9)';
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
      } else if (p.type === 'music') {
        this.ctx.fillStyle = p.color;
        this.ctx.font = `bold ${Math.round(p.size)}px sans-serif`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('♪', 0, 0);
      } else if (p.type === 'heart') {
        this.ctx.fillStyle = p.color;
        const s = p.size * 0.6;
        this.ctx.beginPath();
        this.ctx.moveTo(0, s * 0.3);
        this.ctx.bezierCurveTo(-s, -s * 0.6, -s * 1.2, s * 0.4, 0, s * 1.3);
        this.ctx.bezierCurveTo(s * 1.2, s * 0.4, s, -s * 0.6, 0, s * 0.3);
        this.ctx.fill();
      } else if (p.type === 'flower') {
        this.ctx.fillStyle = p.color;
        const petals = 5;
        const r = p.size * 0.5;
        for (let i = 0; i < petals; i++) {
          const angle = (i * 2 * Math.PI) / petals;
          const px = Math.cos(angle) * r;
          const py = Math.sin(angle) * r;
          this.ctx.beginPath();
          this.ctx.arc(px, py, r * 0.6, 0, Math.PI * 2);
          this.ctx.fill();
        }
        this.ctx.beginPath();
        this.ctx.arc(0, 0, r * 0.45, 0, Math.PI * 2);
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fill();
      } else if (p.type === 'rainbow') {
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
