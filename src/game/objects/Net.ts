import * as PIXI from 'pixi.js';
import RAPIER from '@dimforge/rapier2d-compat';
import { PhysicsWorld } from '../physics/PhysicsWorld';
import {
  SCALE,
  COLLISION_GROUP,
  NET_BORDER_COLOR,
  NET_BORDER_WIDTH,
  NET_BORDER_ALPHA,
  Z_INDEX
} from '../config';
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

    const rad = (config.angle || 0) * (Math.PI / 180);
    const physicsPos = physicsWorld.toPhysics(config.x, config.y);

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
    graphics.zIndex = Z_INDEX.NET;

    graphics.x = config.x;
    graphics.y = config.y;
    if (config.angle) {
      graphics.rotation = config.angle * (Math.PI / 180);
    }

    // Create tiling sprite for the net pattern
    const texture = PIXI.Texture.from('/net.svg');
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
    border.stroke({
      width: NET_BORDER_WIDTH,
      color: NET_BORDER_COLOR,
      alpha: NET_BORDER_ALPHA
    });
    graphics.addChild(border);

    return graphics;
  }
}
