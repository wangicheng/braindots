/**
 * DrawnLine Game Object
 * A user-drawn line that becomes a physics object
 */

import * as PIXI from 'pixi.js';
import { Body, Box, Circle, Vec2 } from 'planck';
import {
  SCALE,
  LINE_COLOR,
  LINE_WIDTH,
  LINE_DENSITY,
  LINE_FRICTION,
  LINE_RESTITUTION,
  CATEGORY,
} from '../config';
import { PhysicsWorld } from '../physics/PhysicsWorld';
import type { Point } from '../utils/douglasPeucker';

export class DrawnLine {
  public graphics: PIXI.Graphics;
  public body: Body;
  private points: Point[];

  constructor(physicsWorld: PhysicsWorld, points: Point[]) {
    this.points = points;

    // Calculate centroid for body position
    const centroid = this.calculateCentroid(points);

    // Create Pixi.js graphics
    this.graphics = new PIXI.Graphics();
    this.drawLine(centroid);
    this.graphics.position.set(centroid.x, centroid.y);

    // Create Planck.js dynamic body
    const physicsPos = physicsWorld.toPhysics(centroid.x, centroid.y);

    this.body = physicsWorld.getWorld().createBody({
      type: 'dynamic',
      position: physicsPos,
    });

    // Create physics fixtures for each segment
    this.createPhysicsSegments(centroid);
  }

  /**
   * Calculate the centroid of all points
   */
  private calculateCentroid(points: Point[]): Point {
    let sumX = 0;
    let sumY = 0;
    for (const point of points) {
      sumX += point.x;
      sumY += point.y;
    }
    return {
      x: sumX / points.length,
      y: sumY / points.length,
    };
  }

  /**
   * Draw the line with rounded caps
   */
  private drawLine(centroid: Point): void {
    if (this.points.length < 1) return;

    this.graphics.setStrokeStyle({
      width: LINE_WIDTH,
      color: LINE_COLOR,
      cap: 'round',
      join: 'round',
    });

    // Special case for single point
    if (this.points.length === 1) {
      const p = this.points[0];
      this.graphics.circle(p.x - centroid.x, p.y - centroid.y, LINE_WIDTH / 2);
      this.graphics.fill(LINE_COLOR);
      return;
    }

    // Draw relative to centroid
    const startPoint = this.points[0];
    this.graphics.moveTo(startPoint.x - centroid.x, startPoint.y - centroid.y);

    for (let i = 1; i < this.points.length; i++) {
      const point = this.points[i];
      this.graphics.lineTo(point.x - centroid.x, point.y - centroid.y);
    }

    this.graphics.stroke();
  }

  /**
   * Create physics box fixtures for each line segment
   */
  private createPhysicsSegments(centroid: Point): void {
    const halfWidth = (LINE_WIDTH / 2) / SCALE;

    for (let i = 0; i < this.points.length - 1; i++) {
      const p1 = this.points[i];
      const p2 = this.points[i + 1];

      // Convert to physics coordinates relative to centroid
      const x1 = (p1.x - centroid.x) / SCALE;
      const y1 = -(p1.y - centroid.y) / SCALE;
      const x2 = (p2.x - centroid.x) / SCALE;
      const y2 = -(p2.y - centroid.y) / SCALE;

      // Calculate segment properties
      const dx = x2 - x1;
      const dy = y2 - y1;
      const length = Math.sqrt(dx * dx + dy * dy);

      if (length < 0.001) continue; // Skip very short segments

      const angle = Math.atan2(dy, dx);
      const centerX = (x1 + x2) / 2;
      const centerY = (y1 + y2) / 2;

      // Create a box shape for this segment
      const boxShape = Box(
        length / 2,
        halfWidth,
        Vec2(centerX, centerY),
        angle
      );

      this.body.createFixture({
        shape: boxShape,
        density: LINE_DENSITY,
        friction: LINE_FRICTION,
        restitution: LINE_RESTITUTION,
        filterCategoryBits: CATEGORY.USER_LINE,
      });
    }

    // Add circles at each point for smooth joints
    for (const point of this.points) {
      const x = (point.x - centroid.x) / SCALE;
      const y = -(point.y - centroid.y) / SCALE;

      const circleShape = Circle(Vec2(x, y), halfWidth);

      this.body.createFixture({
        shape: circleShape,
        density: LINE_DENSITY,
        friction: LINE_FRICTION,
        restitution: LINE_RESTITUTION,
        filterCategoryBits: CATEGORY.USER_LINE,
      });
    }
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
   * Destroy the line
   */
  destroy(physicsWorld: PhysicsWorld): void {
    physicsWorld.getWorld().destroyBody(this.body);
    this.graphics.destroy();
  }
}
