import * as PIXI from 'pixi.js';
import type { NetConfig } from '../levels/LevelSchema';

export class Net {
  public graphics: PIXI.Container;
  private sprite: PIXI.TilingSprite;
  private border: PIXI.Graphics;

  constructor(config: NetConfig) {
    this.graphics = new PIXI.Container();
    this.graphics.x = config.x;
    this.graphics.y = config.y;
    if (config.rotation) {
      this.graphics.rotation = config.rotation * (Math.PI / 180);
    }

    // Create tiling sprite for the net pattern
    // Assuming object_ami.png is loaded and available as a texture
    const texture = PIXI.Texture.from('/object_ami.png');
    this.sprite = new PIXI.TilingSprite({
      texture,
      width: config.width,
      height: config.height
    });

    // Create mask for rounded corners
    const radius = 5;
    const mask = new PIXI.Graphics();
    mask.roundRect(0, 0, config.width, config.height, radius);
    mask.fill(0xffffff);
    this.sprite.mask = mask;
    this.graphics.addChild(this.sprite);
    this.graphics.addChild(mask); // Add mask to container

    // Create border
    this.border = new PIXI.Graphics();
    this.border.roundRect(0, 0, config.width, config.height, radius);
    this.border.stroke({ width: 2, color: 0x808080 }); // #808080 border
    this.graphics.addChild(this.border);
  }

  /**
   * Get the global bounds of the net for intersection testing
   */
  getBounds(): PIXI.Rectangle {
    const bounds = this.graphics.getBounds();
    return new PIXI.Rectangle(bounds.x, bounds.y, bounds.width, bounds.height);
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.graphics.destroy({ children: true });
  }
}
