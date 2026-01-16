/**
 * Physics World Wrapper for Rapier.js
 * Manages the physics simulation using WebAssembly
 */

import RAPIER from '@dimforge/rapier2d-compat';
import {
  GRAVITY,
  SCALE,
} from '../config';

export class PhysicsWorld {
  public world!: RAPIER.World;
  public RAPIER!: typeof RAPIER;
  private eventQueue!: RAPIER.EventQueue;

  constructor() {
    console.log('PhysicsWorld instance created. Call init() to initialize.');
  }

  /**
   * Initialize the physics world (async due to WASM loading)
   */
  async init(): Promise<void> {
    console.log('Initializing Rapier.js WASM...');
    await RAPIER.init();
    this.RAPIER = RAPIER;

    // Create physics world with gravity
    // Note: Rapier uses Y-up coordinate system, so negative Y is down
    this.world = new RAPIER.World({ x: 0, y: GRAVITY });
    this.eventQueue = new RAPIER.EventQueue(false);

    console.log('Rapier.js initialized successfully');
  }

  /**
   * Step the physics simulation
   * @param _dt - Delta time (unused, Rapier uses fixed timestep)
   */
  step(_dt?: number): void {
    this.world.step(this.eventQueue);
  }

  /**
   * Get the event queue for collision detection
   */
  getEventQueue(): RAPIER.EventQueue {
    return this.eventQueue;
  }

  /**
   * Convert pixel coordinates to physics world coordinates
   */
  toPhysics(pixelX: number, pixelY: number): { x: number; y: number } {
    return {
      x: pixelX / SCALE,
      y: -pixelY / SCALE,
    };
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
   * Get the Rapier.js world instance
   */
  getWorld(): RAPIER.World {
    return this.world;
  }

  /**
   * Get the RAPIER module for accessing types and constructors
   */
  getRAPIER(): typeof RAPIER {
    return this.RAPIER;
  }

  /**
   * Destroy all bodies in the world
   */
  clear(): void {
    // Remove all rigid bodies
    this.world.forEachRigidBody((body) => {
      this.world.removeRigidBody(body);
    });
  }
}
