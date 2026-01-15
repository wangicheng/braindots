import * as PIXI from 'pixi.js';

export class EffectManager {
  private container: PIXI.Container;
  private activeEffects: PIXI.Container[] = [];

  constructor(container: PIXI.Container) {
    this.container = container;
  }

  /**
   * Create an expanding ring explosion effect
   * @param x Center X
   * @param y Center Y
   * @param color Color of the rings
   * @param count Number of rings (default 3)
   */
  createRingExplosion(x: number, y: number, color: number, count: number = 3): void {
    const explosion = new PIXI.Container();
    explosion.position.set(x, y);
    this.container.addChild(explosion);
    this.activeEffects.push(explosion);

    for (let i = 0; i < count; i++) {
      // Stagger the rings
      setTimeout(() => {
        if (explosion.destroyed) return;
        this.createSingleRing(explosion, color);
      }, i * 200);
    }

    // Auto cleanup after some time (approximate duration of effect)
    setTimeout(() => {
      if (!explosion.destroyed) {
        explosion.destroy({ children: true });
        const index = this.activeEffects.indexOf(explosion);
        if (index !== -1) {
          this.activeEffects.splice(index, 1);
        }
      }
    }, 2000); // 1s visual + delay
  }

  private createSingleRing(parent: PIXI.Container, color: number): void {
    const ring = new PIXI.Graphics();
    ring.circle(0, 0, 10); // Start small
    ring.stroke({ width: 20, color: color });
    ring.alpha = 1;

    // Add misty/blur effect
    const blurFilter = new PIXI.BlurFilter();
    blurFilter.strength = 10; // Very strong blur for misty edge
    blurFilter.quality = 2; // Better quality
    ring.filters = [blurFilter];

    parent.addChild(ring);

    // Animate
    let scale = 1;
    let alpha = 1;

    const animate = () => {
      if (ring.destroyed) return;

      scale += 2; // Expand speed (much faster to cover screen)
      alpha -= 0.02; // Fade speed (slower to last longer)

      ring.clear();
      ring.circle(0, 0, 10 * scale);
      ring.stroke({ width: 20, color: color, alpha: alpha }); // Very thick stroke for strong blur

      // Actually, stroke width scaling might look weird if we don't adjust. 
      // Simplest is to just scale the graphics object if we didn't clear/redraw, 
      // but clearing allows better quality.
      // Let's rely on scaling the graphics object for performance if possible, 
      // but stroke width scales then.
      // Let's just redraw for now, simple circles are cheap.

      if (alpha <= 0) {
        ring.destroy();
        ticker.remove(animate);
      }
    };

    // Need access to a ticker. 
    // Ideally EffectManager should update every frame, or we use a temporary ticker listener.
    // For simplicity, let's attach to the shared ticker or just use requestAnimationFrame loop if we don't have safe access to app.ticker here.
    // Actually PIXI.Ticker.shared is usually available.

    const ticker = PIXI.Ticker.shared;
    ticker.add(animate);
  }

  /**
   * Update all active effects
   * (If we needed manual update logic, but here we used shared ticker)
   */
  update(): void {
    // 
  }

  clear(): void {
    for (const effect of this.activeEffects) {
      if (!effect.destroyed) {
        effect.destroy({ children: true });
      }
    }
    this.activeEffects = [];
  }
}
