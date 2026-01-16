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
  private readonly width: number;
  private readonly height: number;
  private readonly radius: number;


  constructor(physicsWorld: PhysicsWorld, config: ConveyorBeltConfig) {
    const {
      x, y, width, angle = 0,
      acceleration = CONVEYOR_BELT_ACCELERATION,
    } = config;

    this.acceleration = acceleration;
    // Default maxVelocity to 1x acceleration if not provided
    this.maxVelocity = config.maxVelocity ?? (Math.abs(acceleration) * CONVEYOR_BELT_VELOCITY_FACTOR);

    this.width = width;
    this.height = CONVEYOR_BELT_HEIGHT;
    this.radius = this.height / 2;
    this.gearSpeed = Math.abs(acceleration) * CONVEYOR_BELT_GEAR_SPEED_FACTOR;

    const angleRad = (angle * Math.PI) / 180;

    // Create main container
    this.graphics = new PIXI.Container();
    this.graphics.position.set(x, y);
    this.graphics.rotation = angleRad;

    // Create shape outline (rectangle + semicircles)
    const outline = new PIXI.Graphics();
    this.drawOutline(outline);
    this.graphics.addChild(outline);

    // Create gears
    this.leftGear = new PIXI.Graphics();
    this.rightGear = new PIXI.Graphics();
    this.drawGear(this.leftGear);
    this.drawGear(this.rightGear);

    // Position gears at semicircle centers
    this.leftGear.position.set(-width / 2, 0);
    this.rightGear.position.set(width / 2, 0);

    this.graphics.addChild(this.leftGear);
    this.graphics.addChild(this.rightGear);

    // --- Physics Setup ---
    const world = physicsWorld.getWorld();
    const R = physicsWorld.getRAPIER();

    const physicsPos = physicsWorld.toPhysics(x, y);

    // Create static rigid body
    const rigidBodyDesc = R.RigidBodyDesc.fixed()
      .setTranslation(physicsPos.x, physicsPos.y)
      .setRotation(-angleRad); // Invert for Rapier coordinate system

    this.body = world.createRigidBody(rigidBodyDesc);

    // Create Capsule collider (replaces top/bottom sensors)
    // Capsule: a segment of length 2*halfHeight aligned with Y axis (by default)
    // We want it aligned with X axis (local).
    // Width (straight part) = width
    // Radius = height / 2 = radius
    // Segment Length = width
    // Half Segment Length = width / 2

    // In Rapier JS, capsule(halfHeight, radius) creates a vertical capsule.
    // To make it horizontal (X-axis aligned), we need to rotate it locally by 90 degrees.
    const halfSegmentLen = (width / 2) / SCALE;
    const capsuleRadius = this.radius / SCALE;

    const colliderDesc = R.ColliderDesc.capsule(halfSegmentLen, capsuleRadius)
      .setCollisionGroups(COLLISION_GROUP.CONVEYOR_BELT)
      .setFriction(CONVEYOR_BELT_FRICTION)
      .setRestitution(0)
      .setRotation(Math.PI / 2) // Rotate 90 deg to align with X axis
      .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);

    // Note: We use one collider now. We can store it as 'topCollider' property for compatibility 
    // or just 'collider'. Let's rename properties to 'collider' but keep public access for handle retrieval.
    this.topCollider = world.createCollider(colliderDesc, this.body);
  }

  /**
   * Draw the outline shape: rectangle + semicircles, transparent fill
   */
  private drawOutline(g: PIXI.Graphics): void {
    const w = this.width;
    const r = this.radius;

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
  }

  /**
   * Draw a 6-tooth sprocket/gear
   * - 6 Teeth, evenly distributed
   * - Short, thick, flat-topped rectangular teeth
   * - Root width = Tip width
   * - Transparent central hole
   */
  private drawGear(g: PIXI.Graphics): void {
    const teeth = 6;
    const outerRadius = this.radius * 0.65; // Adjust overall size
    const rootRadius = outerRadius * 0.8; // Ratio for "short" teeth
    const toothWidth = rootRadius * 0.5;  // Width for "thick" teeth
    const holeRadius = rootRadius * 0.45;   // Hole size

    const hw = toothWidth / 2;
    // Calculate depth at root (distance from center to chord)
    const rootX = Math.sqrt(rootRadius * rootRadius - hw * hw);
    // Angle offset for the half-width at the root circle
    const beta = Math.atan2(hw, rootX);

    g.clear();

    // 1. Draw solid gear shape (Outer Contour)
    // Start at the first tooth's leading edge on the root circle
    g.moveTo(rootX, -hw);

    for (let i = 0; i < teeth; i++) {
      const theta = (i * Math.PI * 2) / teeth;
      const cos = Math.cos(theta);
      const sin = Math.sin(theta);

      // Local coordinates of the rectangular tooth points
      // P2: Tip Start, P3: Tip End, P4: Root End
      const p2 = { x: cos * outerRadius - sin * -hw, y: sin * outerRadius + cos * -hw };
      const p3 = { x: cos * outerRadius - sin * hw, y: sin * outerRadius + cos * hw };
      const p4 = { x: cos * rootX - sin * hw, y: sin * rootX + cos * hw };

      // Draw the tooth
      g.lineTo(p2.x, p2.y);
      g.lineTo(p3.x, p3.y);
      g.lineTo(p4.x, p4.y);

      // Draw the gap (arc to the next tooth start)
      // Current angle at P4 is (theta + beta)
      // Next tooth P1 is at (theta + step - beta)
      const startAngle = theta + beta;
      const endAngle = theta + (Math.PI * 2 / teeth) - beta;

      g.arc(0, 0, rootRadius, startAngle, endAngle);
    }

    g.fill({ color: CONVEYOR_BELT_COLOR });

    // 2. Cut the central hole
    g.circle(0, 0, holeRadius);
    g.cut();
  }

  /**
   * Update gear rotation animation
   * @param deltaTime Time since last update in seconds
   */
  update(deltaTime: number): void {
    // Rotate based on acceleration direction
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
}
