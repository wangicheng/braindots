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

    // Calculate length and angle of the laser segment
    const dx = x2 - x1;
    const dy = y2 - y1;
    this.length = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);

    // Get texture height for the laser beam
    this.laserHeight = texture.height;

    // Create container positioned at the start point
    this.graphics = new PIXI.Container();
    this.graphics.x = x1;
    this.graphics.y = y1;
    this.graphics.rotation = angle;

    // Create tiling sprite for the laser pattern
    // The sprite tiles horizontally along the length
    this.sprite = new PIXI.TilingSprite({
      texture,
      width: this.length,
      height: this.laserHeight,
    });

    // Center the sprite vertically on the line
    this.sprite.anchor.set(0, 0.5);
    this.graphics.addChild(this.sprite);

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
   * Update the laser state (handles flip animation)
   * @param deltaTime Time since last update in seconds
   */
  update(deltaTime: number): void {
    this.flipTimer += deltaTime;

    if (this.flipTimer >= FLIP_INTERVAL) {
      this.flipTimer -= FLIP_INTERVAL;
      this.isFlipped = !this.isFlipped;

      // Flip the sprite vertically (180 degrees)
      this.sprite.scale.y = this.isFlipped ? -1 : 1;
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
}
