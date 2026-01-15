/**
 * Physics World Wrapper for Planck.js
 * Manages the physics simulation
 */

import { World, Vec2 } from 'planck';
import {
  GRAVITY,
  VELOCITY_ITERATIONS,
  POSITION_ITERATIONS,
  SCALE,
} from '../config';

export class PhysicsWorld {
  public world: World;
  private readonly velocityIterations: number;
  private readonly positionIterations: number;

  constructor() {
    console.log('Initializing PhysicsWorld...');
    // Create physics world with gravity
    // Note: Planck uses Y-up coordinate system, so positive Y is up
    this.world = World({
      gravity: Vec2(0, GRAVITY),
    });

    this.velocityIterations = VELOCITY_ITERATIONS;
    this.positionIterations = POSITION_ITERATIONS;
  }

  /**
   * Step the physics simulation
   * @param dt - Delta time in seconds
   */
  step(dt: number): void {
    this.world.step(dt, this.velocityIterations, this.positionIterations);
  }

  /**
   * Convert pixel coordinates to physics world coordinates
   */
  toPhysics(pixelX: number, pixelY: number): Vec2 {
    return Vec2(pixelX / SCALE, -pixelY / SCALE);
  }

  /**
   * Convert physics world coordinates to pixel coordinates
   */
  toPixels(physicsX: number, physicsY: number): { x: number; y: number } {
    return {
      x: physicsX * SCALE,
      y: -physicsY * SCALE,
    };
  }

  /**
   * Get the Planck.js world instance
   */
  getWorld(): World {
    return this.world;
  }

  /**
   * Destroy all bodies in the world
   */
  clear(): void {
    let body = this.world.getBodyList();
    while (body) {
      const next = body.getNext();
      this.world.destroyBody(body);
      body = next;
    }
  }
}
