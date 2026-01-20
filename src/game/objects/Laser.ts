/**
 * Laser Game Object
 * A hazardous line segment that causes level failure when touched by balls
 */

import * as PIXI from 'pixi.js';
import RAPIER from '@dimforge/rapier2d-compat';
import { PhysicsWorld } from '../physics/PhysicsWorld';
import { SCALE, COLLISION_GROUP } from '../config';
import type { LaserConfig } from '../levels/LevelSchema';

// How often the laser flips (in seconds)
const FLIP_INTERVAL = 0.2;

export class Laser {
  public graphics: PIXI.Container;
  private sprite: PIXI.TilingSprite;
  public body: RAPIER.RigidBody;
  public collider: RAPIER.Collider;

  private flipTimer: number = 0;
  private isFlipped: boolean = false;
  private length: number;
  private laserHeight: number;

  constructor(physicsWorld: PhysicsWorld, config: LaserConfig, texture: PIXI.Texture) {
    const { x1, y1, x2, y2 } = config;

    // Calculate length
    const dx = x2 - x1;
    const dy = y2 - y1;
    this.length = Math.sqrt(dx * dx + dy * dy);
    // Angle handled by createVisual
    const angle = Math.atan2(dy, dx);
    this.laserHeight = texture.height;

    // Create visuals
    this.graphics = Laser.createVisual(config, texture);

    // We need to retrieve the sprite to animate it in update().
    // The createVisual returns a container with the sprite as a child.
    // Assumption: The sprite is the first or only child.
    // Let's verify: createVisual adds sprite as child.
    this.sprite = this.graphics.children[0] as PIXI.TilingSprite;

    // --- Physics Setup (Sensor) ---
    const world = physicsWorld.getWorld();
    const R = physicsWorld.getRAPIER();

    // Calculate center of the segment for physics body
    const centerX = (x1 + x2) / 2;
    const centerY = (y1 + y2) / 2;
    const physicsPos = physicsWorld.toPhysics(centerX, centerY);

    // Create a fixed (static) rigid body at the center
    const rigidBodyDesc = R.RigidBodyDesc.fixed()
      .setTranslation(physicsPos.x, physicsPos.y)
      .setRotation(-angle); // Invert for Rapier coordinate system

    this.body = world.createRigidBody(rigidBodyDesc);

    // Create a cuboid collider that matches the laser shape
    // Half-extents: length/2 for width, laserHeight/2 for height
    const colliderDesc = R.ColliderDesc.cuboid(
      (this.length / 2) / SCALE,
      (this.laserHeight / 2) / SCALE
    )
      .setSensor(true) // Sensor: detects contact but doesn't block
      .setCollisionGroups(COLLISION_GROUP.LASER)
      .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);

    this.collider = world.createCollider(colliderDesc, this.body);
  }

  /**
   * Update the laser state (handles flip animation and responsive alignment)
   * @param scaleFactor Current canvas scale factor
   * @param deltaTime Time since last update in seconds
   */
  update(scaleFactor: number = 1, deltaTime: number = 0): void {
    // 1. Handle responsive visual alignment
    // Lasers visual is relative to start point (x1, y1), but physics is at center.
    // However, if we follow the pattern:
    const pos = this.body.translation();
    const angle = this.body.rotation();

    this.graphics.position.x = pos.x * SCALE * scaleFactor;
    this.graphics.position.y = -pos.y * SCALE * scaleFactor;
    this.graphics.rotation = -angle;
    this.graphics.scale.set(scaleFactor);

    // 2. Handle flip animation
    this.flipTimer += deltaTime;

    if (this.flipTimer >= FLIP_INTERVAL) {
      this.flipTimer -= FLIP_INTERVAL;
      this.isFlipped = !this.isFlipped;

      if (this.sprite) {
        this.sprite.scale.y = this.isFlipped ? -1 : 1;
      }
    }
  }

  /**
   * Get the collider handle for collision detection
   */
  getColliderHandle(): number {
    return this.collider.handle;
  }

  /**
   * Clean up resources
   */
  destroy(physicsWorld: PhysicsWorld): void {
    physicsWorld.getWorld().removeRigidBody(this.body);
    this.graphics.destroy({ children: true });
  }

  static createVisual(config: LaserConfig, texture: PIXI.Texture): PIXI.Container {
    const { x1, y1, x2, y2 } = config;

    // Calculate length and angle of the laser segment
    const dx = x2 - x1;
    const dy = y2 - y1;
    const length = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);
    const laserHeight = texture.height;

    // Create container positioned at the start point
    const graphics = new PIXI.Container();
    // Position/rotation will be handled by update(), but initial setup is nice
    const centerX = (x1 + x2) / 2;
    const centerY = (y1 + y2) / 2;
    graphics.position.set(centerX, centerY);
    graphics.rotation = angle;

    // Create tiling sprite for the laser pattern
    // The sprite tiles horizontally along the length
    const sprite = new PIXI.TilingSprite({
      texture,
      width: length,
      height: laserHeight,
    });

    // Center the sprite horizontally on the physics body position (middle)
    sprite.anchor.set(0.5, 0.5);
    graphics.addChild(sprite);

    return graphics;
  }
}
