/**
 * IceBlock Game Object
 * A semi-transparent ice block that melts when touched by other objects
 */

import * as PIXI from 'pixi.js';
import RAPIER from '@dimforge/rapier2d-compat';
import {
  SCALE,
  ICE_BLOCK_COLOR,
  ICE_BLOCK_ALPHA,
  COLLISION_GROUP,
} from '../config';
import { PhysicsWorld } from '../physics/PhysicsWorld';
import type { IceBlockConfig } from '../levels/LevelSchema';

export class IceBlock {
  public graphics: PIXI.Graphics;
  public body: RAPIER.RigidBody;
  public collider: RAPIER.Collider;

  private meltTime: number; // Duration in seconds (1, 2, or 3)
  private isMelting: boolean = false;
  private meltProgress: number = 0; // 0 to 1

  constructor(physicsWorld: PhysicsWorld, config: IceBlockConfig) {
    this.meltTime = config.meltTime || 1;

    const { x, y, width, height, angle = 0 } = config;

    // Create Pixi.js graphics
    this.graphics = IceBlock.createVisual(config);

    // Create physics body
    const world = physicsWorld.getWorld();
    const R = physicsWorld.getRAPIER();

    const physicsPos = physicsWorld.toPhysics(x, y);
    const rigidBodyDesc = R.RigidBodyDesc.fixed()
      .setTranslation(physicsPos.x, physicsPos.y)
      .setRotation(-(angle * Math.PI) / 180);

    this.body = world.createRigidBody(rigidBodyDesc);

    // Create collider
    const colliderDesc = R.ColliderDesc.cuboid(
      (width / 2) / SCALE,
      (height / 2) / SCALE
    )
      .setCollisionGroups(COLLISION_GROUP.ICE_BLOCK)
      .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);

    this.collider = world.createCollider(colliderDesc, this.body);
  }

  /**
   * Start the melting process
   */
  startMelting(): void {
    if (!this.isMelting) {
      this.isMelting = true;
      this.meltProgress = 0;
    }
  }

  /**
   * Check if this ice block is currently melting
   */
  getIsMelting(): boolean {
    return this.isMelting;
  }

  /**
   * Update the ice block state
   * @param scaleFactor Current canvas scale factor
   * @param deltaTime Time since last update in seconds
   * @returns true if the ice block has fully melted and should be removed
   */
  update(scaleFactor: number = 1, deltaTime: number = 0): boolean {
    // 1. Handle responsive visual alignment
    const pos = this.body.translation();
    const angle = this.body.rotation();

    this.graphics.position.x = pos.x * SCALE * scaleFactor;
    this.graphics.position.y = -pos.y * SCALE * scaleFactor;
    this.graphics.rotation = -angle;
    this.graphics.scale.set(scaleFactor);

    // 2. Handle melting logic
    if (!this.isMelting) return false;

    // Update melt progress
    this.meltProgress += deltaTime / this.meltTime;

    if (this.meltProgress >= 1) {
      return true; // Fully melted
    }

    this.graphics.alpha = 1 - this.meltProgress;

    return false;
  }

  /**
   * Get the bounds of the ice block for drawing restriction
   */
  getBounds(): PIXI.Rectangle {
    const bounds = this.graphics.getBounds();
    return new PIXI.Rectangle(bounds.x, bounds.y, bounds.width, bounds.height);
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
    this.graphics.destroy();
  }

  static createVisual(config: IceBlockConfig): PIXI.Graphics {
    const { x, y, width, height, angle = 0 } = config;
    const initialAlpha = ICE_BLOCK_ALPHA;

    const graphics = new PIXI.Graphics();

    // Draw filled rectangle with transparency
    graphics.rect(-width / 2, -height / 2, width, height);
    graphics.fill({ color: ICE_BLOCK_COLOR, alpha: initialAlpha });

    // Set position and rotation
    graphics.position.set(x, y);
    graphics.rotation = (angle * Math.PI) / 180;

    return graphics;
  }
}
