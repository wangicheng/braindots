import * as PIXI from 'pixi.js';
import RAPIER from '@dimforge/rapier2d-compat';
import { PhysicsWorld } from '../physics/PhysicsWorld';
import { SCALE, COLLISION_GROUP } from '../config';
import type { NetConfig } from '../levels/LevelSchema';

export class Net {
  public graphics: PIXI.Container;
  public body: RAPIER.RigidBody;
  public collider: RAPIER.Collider;

  constructor(physicsWorld: PhysicsWorld, config: NetConfig) {
    this.graphics = Net.createVisual(config);

    // --- Physics Setup (Sensor) ---
    const world = physicsWorld.getWorld();
    const R = physicsWorld.getRAPIER();

    // Calculate center relative to top-left anchor for physics body
    const rad = (config.angle || 0) * (Math.PI / 180);
    const w2 = config.width / 2;
    const h2 = config.height / 2;

    // Local center relative to pivot (0,0)
    const cx = w2;
    const cy = h2;

    // Rotate (cx, cy)
    const rotatedCx = cx * Math.cos(rad) - cy * Math.sin(rad);
    const rotatedCy = cx * Math.sin(rad) + cy * Math.cos(rad);

    const worldCenterX = config.x + rotatedCx;
    const worldCenterY = config.y + rotatedCy;

    const physicsPos = physicsWorld.toPhysics(worldCenterX, worldCenterY);

    const rigidBodyDesc = R.RigidBodyDesc.fixed()
      .setTranslation(physicsPos.x, physicsPos.y)
      .setRotation(-rad);

    this.body = world.createRigidBody(rigidBodyDesc);

    const colliderDesc = R.ColliderDesc.cuboid(
      (config.width / 2) / SCALE,
      (config.height / 2) / SCALE
    )
      .setSensor(true) // Crucial: It's a sensor!
      .setCollisionGroups(COLLISION_GROUP.NET);

    this.collider = world.createCollider(colliderDesc, this.body);
  }

  /**
   * Update graphics position from physics body to ensure responsive alignment
   */
  update(scaleFactor: number = 1): void {
    const pos = this.body.translation();
    const angle = this.body.rotation();

    // The visual anchor for Net is top-left, but physics body is at center.
    // However, if we follow the same pattern as others:
    // Actually, for Net, the creator set it up with top-left anchor.
    // Let's fix that to use center anchor for easier scaling/positioning in update.

    // Instead of complex math, just scale and reposition the container
    this.graphics.position.x = pos.x * SCALE * scaleFactor;
    this.graphics.position.y = -pos.y * SCALE * scaleFactor;
    this.graphics.rotation = -angle;
    this.graphics.scale.set(scaleFactor);
  }

  /**
   * Clean up resources
   */
  destroy(physicsWorld: PhysicsWorld): void {
    physicsWorld.getWorld().removeRigidBody(this.body);
    this.graphics.destroy({ children: true });
  }

  static createVisual(config: NetConfig): PIXI.Container {
    const graphics = new PIXI.Container();

    // Calculate center position to match physics body
    const rad = (config.angle || 0) * (Math.PI / 180);
    const w2 = config.width / 2;
    const h2 = config.height / 2;

    // Rotate center offset vector (w/2, h/2)
    const rotatedCx = w2 * Math.cos(rad) - h2 * Math.sin(rad);
    const rotatedCy = w2 * Math.sin(rad) + h2 * Math.cos(rad);

    graphics.x = config.x + rotatedCx;
    graphics.y = config.y + rotatedCy;
    // We will set pos/rotation in update, but initial setup helps
    if (config.angle) {
      graphics.rotation = config.angle * (Math.PI / 180);
    }

    // Create tiling sprite for the net pattern
    const texture = PIXI.Texture.from('/object_ami.png');
    const sprite = new PIXI.TilingSprite({
      texture,
      width: config.width,
      height: config.height
    });

    // Create mask for rounded corners
    const radius = 5;
    const mask = new PIXI.Graphics();
    mask.roundRect(0, 0, config.width, config.height, radius);
    mask.fill(0xffffff);
    sprite.mask = mask;

    // Center the content relative to the container for easier rotation/scaling
    sprite.position.set(-config.width / 2, -config.height / 2);
    mask.position.set(-config.width / 2, -config.height / 2);

    graphics.addChild(sprite);
    graphics.addChild(mask);

    // Create border
    const border = new PIXI.Graphics();
    border.roundRect(-config.width / 2, -config.height / 2, config.width, config.height, radius);
    border.stroke({ width: 2, color: 0x808080 }); // #808080 border
    graphics.addChild(border);

    return graphics;
  }
}
