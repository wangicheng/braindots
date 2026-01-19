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
   * @param deltaTime Time since last update in seconds
   * @returns true if the ice block has fully melted and should be removed
   */
  update(deltaTime: number): boolean {
    if (!this.isMelting) return false;

    // Update melt progress
    this.meltProgress += deltaTime / this.meltTime;

    if (this.meltProgress >= 1) {
      return true; // Fully melted
    }

    // Redraw with updated alpha (simplification: update alpha directly on graphics instead of redrawing)
    // The createVisual method returns a Graphics object with a filled rect.
    // We can just update alpha on the graphics object itself.
    this.graphics.alpha = 1 - this.meltProgress; // This affects the whole container/graphics

    // Original code redrew. But setting alpha on container/graphics is more efficient and equivalent if only alpha changes.
    // However, original code used: this.graphics.fill({ color: ICE_BLOCK_COLOR, alpha: this.initialAlpha * (1 - this.meltProgress) });
    // And this.graphics.rect...

    // If we use graphics.alpha, it multiplies with the fill alpha.
    // Initial alpha is 0.5 (ICE_BLOCK_ALPHA). 
    // If we set graphics.alpha, we need to ensure it matches logic.
    // Logic: alpha = initial * (1 - progress).
    // If we set graphics.alpha = 1 - progress, and fill was drawn with initial, result is initial * (1 - progress). Correct.

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
