/**
 * Ball Game Object
 * A circular physics object with Pixi.js rendering
 */

import * as PIXI from 'pixi.js';
import { Body, Circle } from 'planck';
import {
  SCALE,
  BALL_RADIUS,
  BALL_DENSITY,
  BALL_FRICTION,
  BALL_RESTITUTION,
  BALL_COLORS,
  CATEGORY,
} from '../config';
import { PhysicsWorld } from '../physics/PhysicsWorld';

export type BallType = 'blue' | 'pink';

export class Ball {
  public graphics: PIXI.Graphics;
  public body: Body;
  private readonly radius: number;

  constructor(
    physicsWorld: PhysicsWorld,
    x: number, // pixel coordinates
    y: number,
    type: BallType = 'blue',
    startActive: boolean = false
  ) {
    this.radius = BALL_RADIUS;

    // Create Pixi.js graphics
    this.graphics = new PIXI.Graphics();
    this.drawBall(type);
    this.graphics.position.set(x, y);

    // Create Planck.js physics body
    const physicsPos = physicsWorld.toPhysics(x, y);

    this.body = physicsWorld.getWorld().createBody({
      type: startActive ? 'dynamic' : 'static',
      position: physicsPos,
      bullet: true, // Better collision detection for fast-moving objects
    });

    // Create circular fixture
    const circleShape = Circle(this.radius / SCALE);
    this.body.createFixture({
      shape: circleShape,
      density: BALL_DENSITY,
      friction: BALL_FRICTION,
      restitution: BALL_RESTITUTION,
      filterCategoryBits: type === 'blue' ? CATEGORY.BLUE_BALL : CATEGORY.PINK_BALL,
    });
  }

  /**
   * Draw the ball graphics
   */
  private drawBall(type: BallType): void {
    const color = BALL_COLORS[type];

    this.graphics.circle(0, 0, this.radius);
    this.graphics.fill({ color });
  }

  /**
   * Update graphics position from physics body
   */
  update(): void {
    const pos = this.body.getPosition();
    const angle = this.body.getAngle();

    // Convert physics coordinates to pixel coordinates
    this.graphics.position.x = pos.x * SCALE;
    this.graphics.position.y = -pos.y * SCALE;
    this.graphics.rotation = -angle;
  }

  /**
   * Activate physics for the ball (make it dynamic)
   */
  activate(): void {
    if (this.body.getType() !== 'dynamic') {
      this.body.setType('dynamic');
      this.body.setAwake(true);
    }
  }

  /**
   * Get the global bounds of the ball
   */
  getBounds(): PIXI.Rectangle {
    const bounds = this.graphics.getBounds();
    return new PIXI.Rectangle(bounds.x, bounds.y, bounds.width, bounds.height);
  }

  /**
   * Destroy the ball
   */
  destroy(physicsWorld: PhysicsWorld): void {
    physicsWorld.getWorld().destroyBody(this.body);
    this.graphics.destroy();
  }
}
