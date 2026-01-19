/**
 * Conveyor Belt Game Object
 * A conveyor belt that accelerates objects touching it
 * - Top half: accelerates rightward (relative to belt angle)
 * - Bottom half: accelerates leftward (relative to belt angle)
 */

import * as PIXI from 'pixi.js';
import RAPIER from '@dimforge/rapier2d-compat';
import { PhysicsWorld } from '../physics/PhysicsWorld';
import {
  SCALE,
  CONVEYOR_BELT_COLOR,
  CONVEYOR_BELT_HEIGHT,
  CONVEYOR_BELT_ACCELERATION,
  CONVEYOR_BELT_VELOCITY_FACTOR,
  CONVEYOR_BELT_GEAR_SPEED_FACTOR,
  CONVEYOR_BELT_FRICTION,
  COLLISION_GROUP,
} from '../config';
import type { ConveyorBeltConfig } from '../levels/LevelSchema';

// Gear settings
const BORDER_WIDTH = 9;

export class ConveyorBelt {
  public graphics: PIXI.Container;
  private leftGear: PIXI.Graphics;
  private rightGear: PIXI.Graphics;
  public body: RAPIER.RigidBody;
  public topCollider: RAPIER.Collider;

  private gearRotation: number = 0;
  private gearSpeed: number;
  public readonly acceleration: number;  // Acceleration in physics units (m/s²)
  public readonly maxVelocity: number;   // Max velocity cap in physics units
  private readonly height: number;
  private readonly radius: number;

  constructor(physicsWorld: PhysicsWorld, config: ConveyorBeltConfig) {
    const {
      x, y, width, angle = 0,
      acceleration = CONVEYOR_BELT_ACCELERATION,
    } = config;

    this.acceleration = acceleration;
    this.maxVelocity = config.maxVelocity ?? (Math.abs(acceleration) * CONVEYOR_BELT_VELOCITY_FACTOR);

    this.height = CONVEYOR_BELT_HEIGHT;
    this.radius = this.height / 2;
    this.gearSpeed = Math.abs(acceleration) * CONVEYOR_BELT_GEAR_SPEED_FACTOR;

    const angleRad = (angle * Math.PI) / 180;

    // Create visuals
    this.graphics = ConveyorBelt.createVisual(config);
    // Retrieve gears
    // Children order: outline (0), leftGear (1), rightGear (2)
    this.leftGear = this.graphics.children[1] as PIXI.Graphics;
    this.rightGear = this.graphics.children[2] as PIXI.Graphics;

    // --- Physics Setup ---
    const world = physicsWorld.getWorld();
    const R = physicsWorld.getRAPIER();

    const physicsPos = physicsWorld.toPhysics(x, y);

    // Create Fixed Body (Immobile)
    const rigidBodyDesc = R.RigidBodyDesc.fixed()
      .setTranslation(physicsPos.x, physicsPos.y)
      .setRotation(-angleRad);

    this.body = world.createRigidBody(rigidBodyDesc);

    // Create Capsule collider
    const halfSegmentLen = (width / 2) / SCALE;
    const capsuleRadius = this.radius / SCALE;

    const colliderDesc = R.ColliderDesc.capsule(halfSegmentLen, capsuleRadius)
      .setCollisionGroups(COLLISION_GROUP.CONVEYOR_BELT)
      .setFriction(CONVEYOR_BELT_FRICTION)
      .setRestitution(0)
      .setRotation(Math.PI / 2) // Rotate 90 deg to align with X axis
      .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);

    this.topCollider = world.createCollider(colliderDesc, this.body);
  }

  /**
   * Update gear rotation animation
   * @param deltaTime Time since last update in seconds
   */
  update(deltaTime: number): void {
    // 1. No need to sync graphics position/rotation as it is Fixed

    // 2. Rotate gears
    const direction = this.acceleration >= 0 ? 1 : -1;
    this.gearRotation += this.gearSpeed * direction * deltaTime;

    this.leftGear.rotation = this.gearRotation;
    this.rightGear.rotation = this.gearRotation;
  }

  /**
   * Get the angle of the conveyor in radians (world space)
   */
  getAngle(): number {
    return -this.body.rotation(); // Invert because of Rapier coordinate system
  }

  /**
   * Get collider handle for collision detection
   */
  getColliderHandle(): number {
    return this.topCollider.handle;
  }

  /**
   * Clean up resources
   */
  destroy(physicsWorld: PhysicsWorld): void {
    physicsWorld.getWorld().removeRigidBody(this.body);
    this.graphics.destroy({ children: true });
  }

  static createVisual(config: ConveyorBeltConfig): PIXI.Container {
    const {
      x, y, width, angle = 0,
    } = config;
    const height = CONVEYOR_BELT_HEIGHT;
    const radius = height / 2;
    const angleRad = (angle * Math.PI) / 180;

    // Create main container
    const graphics = new PIXI.Container();
    graphics.position.set(x, y);
    graphics.rotation = angleRad;

    // Helper functions for drawing
    const drawOutline = (g: PIXI.Graphics) => {
      const w = width;
      const r = radius;
      // Path: start from top-left of rectangle, go clockwise
      g.moveTo(-w / 2, -r);
      // Top edge
      g.lineTo(w / 2, -r);
      // Right semicircle
      g.arc(w / 2, 0, r, -Math.PI / 2, Math.PI / 2);
      // Bottom edge
      g.lineTo(-w / 2, r);
      // Left semicircle
      g.arc(-w / 2, 0, r, Math.PI / 2, -Math.PI / 2);
      // Close path and stroke (no fill - transparent)
      g.closePath();
      g.stroke({ width: BORDER_WIDTH, color: CONVEYOR_BELT_COLOR });
    };

    const drawGear = (g: PIXI.Graphics) => {
      const teeth = 6;
      const outerRadius = radius * 0.65; // Adjust overall size
      const rootRadius = outerRadius * 0.8; // Ratio for "short" teeth
      const toothWidth = rootRadius * 0.5;  // Width for "thick" teeth
      const holeRadius = rootRadius * 0.45;   // Hole size

      const hw = toothWidth / 2;
      const rootX = Math.sqrt(rootRadius * rootRadius - hw * hw);
      const beta = Math.atan2(hw, rootX);

      g.clear();
      g.moveTo(rootX, -hw);

      for (let i = 0; i < teeth; i++) {
        const theta = (i * Math.PI * 2) / teeth;
        const cos = Math.cos(theta);
        const sin = Math.sin(theta);

        const p2 = { x: cos * outerRadius - sin * -hw, y: sin * outerRadius + cos * -hw };
        const p3 = { x: cos * outerRadius - sin * hw, y: sin * outerRadius + cos * hw };
        const p4 = { x: cos * rootX - sin * hw, y: sin * rootX + cos * hw };

        g.lineTo(p2.x, p2.y);
        g.lineTo(p3.x, p3.y);
        g.lineTo(p4.x, p4.y);

        const startAngle = theta + beta;
        const endAngle = theta + (Math.PI * 2 / teeth) - beta;

        g.arc(0, 0, rootRadius, startAngle, endAngle);
      }

      g.fill({ color: CONVEYOR_BELT_COLOR });
      g.circle(0, 0, holeRadius);
      g.cut();
    };


    // Create shape outline (rectangle + semicircles)
    const outline = new PIXI.Graphics();
    drawOutline(outline);
    graphics.addChild(outline);

    // Create gears
    const leftGear = new PIXI.Graphics();
    const rightGear = new PIXI.Graphics();
    drawGear(leftGear);
    drawGear(rightGear);

    // Position gears at semicircle centers
    leftGear.position.set(-width / 2, 0);
    rightGear.position.set(width / 2, 0);

    graphics.addChild(leftGear);
    graphics.addChild(rightGear);

    return graphics;
  }
}
