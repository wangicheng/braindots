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
   * Clean up resources
   */
  destroy(physicsWorld: PhysicsWorld): void {
    physicsWorld.getWorld().removeRigidBody(this.body);
    this.graphics.destroy({ children: true });
  }

  static createVisual(config: NetConfig): PIXI.Container {
    const graphics = new PIXI.Container();
    graphics.x = config.x;
    graphics.y = config.y;
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
    graphics.addChild(sprite);
    graphics.addChild(mask); // Add mask to container

    // Create border
    const border = new PIXI.Graphics();
    border.roundRect(0, 0, config.width, config.height, radius);
    border.stroke({ width: 2, color: 0x808080 }); // #808080 border
    graphics.addChild(border);

    return graphics;
  }
}
