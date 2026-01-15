import * as PIXI from 'pixi.js';
import { Body, Box, Circle, Polygon, Vec2 } from 'planck';
import {
  SCALE,
  OBSTACLE_COLOR,
  OBSTACLE_FRICTION,
  OBSTACLE_RESTITUTION,
  OBSTACLE_DENSITY,
  CATEGORY,
} from '../config';
import { PhysicsWorld } from '../physics/PhysicsWorld';
import type { ObstacleConfig } from '../levels/LevelSchema';

export class Obstacle {
  public graphics: PIXI.Graphics;
  public body: Body;

  constructor(
    physicsWorld: PhysicsWorld,
    config: ObstacleConfig
  ) {
    const {
      type = 'rectangle',
      x,
      y,
      width = 0,
      height = 0,
      angle = 0,
      radius,
      points,
      thickness
    } = config;

    // Create Pixi.js graphics
    this.graphics = new PIXI.Graphics();
    // Set position and rotation (Pixi)
    this.graphics.position.set(x, y);
    this.graphics.rotation = (angle * Math.PI) / 180;

    // Create Planck.js static body
    const physicsPos = physicsWorld.toPhysics(x, y);
    this.body = physicsWorld.getWorld().createBody({
      type: 'static',
      position: physicsPos,
      angle: - (angle * Math.PI) / 180,
    });

    // this.graphics.fill({ color: OBSTACLE_COLOR }); // Removed: Fix rendering order

    let shape; // planck.Shape

    switch (type) {
      case 'circle': {
        const r = radius || width / 2;
        this.graphics.circle(0, 0, r);
        this.graphics.fill({ color: OBSTACLE_COLOR });
        shape = Circle(r / SCALE);
        break;
      }
      case 'triangle': {
        // Isosceles triangle pointing up (relative to body)
        // Vertices relative to (0,0)
        const w = width;
        const h = height;
        // Top, Bottom-Right, Bottom-Left
        const v1 = { x: 0, y: -h / 2 };
        const v2 = { x: w / 2, y: h / 2 };
        const v3 = { x: -w / 2, y: h / 2 };

        this.graphics.poly([v1.x, v1.y, v2.x, v2.y, v3.x, v3.y]);
        this.graphics.fill({ color: OBSTACLE_COLOR });

        // Planck Polygon vertices (CCW order)
        // Physics Y is flipped
        const p1 = Vec2(v1.x / SCALE, -v1.y / SCALE); // (0, h)
        const p2 = Vec2(v2.x / SCALE, -v2.y / SCALE); // (w, -h)
        const p3 = Vec2(v3.x / SCALE, -v3.y / SCALE); // (-w, -h)

        shape = Polygon([p3, p2, p1]);
        break;
      }
      case 'c_shape': {
        // Defined by 3 coordinates (points) determining an arc.
        if (points && points.length === 3 && thickness) {
          const { cap = 'round' } = config;

          const p1 = points[0];
          const p2 = points[1];
          const p3 = points[2];

          // Calculate center and radius of circle passing through p1, p2, p3
          // Algorithm: intersection of perpendicular bisectors of p1p2 and p2p3

          const x1 = p1.x, y1 = p1.y;
          const x2 = p2.x, y2 = p2.y;
          const x3 = p3.x, y3 = p3.y;

          const D = 2 * (x1 * (y2 - y3) + x2 * (y3 - y1) + x3 * (y1 - y2));

          if (Math.abs(D) < 0.001) {
            // Collinear points, treat as straight line p1-p3
            this.graphics.moveTo(p1.x, p1.y);
            this.graphics.lineTo(p2.x, p2.y);
            this.graphics.lineTo(p3.x, p3.y);
            this.graphics.stroke({ width: thickness, color: OBSTACLE_COLOR, cap: cap === 'round' ? 'round' : 'butt', join: 'round' });
            return;
          }

          const centerX = ((x1 * x1 + y1 * y1) * (y2 - y3) + (x2 * x2 + y2 * y2) * (y3 - y1) + (x3 * x3 + y3 * y3) * (y1 - y2)) / D;
          const centerY = ((x1 * x1 + y1 * y1) * (x3 - x2) + (x2 * x2 + y2 * y2) * (x1 - x3) + (x3 * x3 + y3 * y3) * (x2 - x1)) / D;

          const radius = Math.sqrt(Math.pow(x1 - centerX, 2) + Math.pow(y1 - centerY, 2));

          // Calculate angles
          let angle1 = Math.atan2(y1 - centerY, x1 - centerX);
          let angle2 = Math.atan2(y2 - centerY, x2 - centerX);
          let angle3 = Math.atan2(y3 - centerY, x3 - centerX);

          // Normalize angles to 0-2PI relative to angle1 for direction check
          function normalize(a: number) { return (a + 2 * Math.PI) % (2 * Math.PI); }
          // Relative angles from A1
          const relA2 = normalize(angle2 - angle1);
          const relA3 = normalize(angle3 - angle1);

          // If relA2 < relA3, then A2 is between A1 and A3 going CCW (increasing angle in standard math, decreasing in Pixi visually if Y down? No.)
          // Let's trust the previous logic which seemed to work or at least was intended.
          // Wait, the user said "except c_shape", so c_shape WAS working/rendering.
          // So I will preserve c_shape logic exactly as is, just ensuring I don't break it.
          // The previous logic used stroke, so removing the global 'fill' is fine.

          const isCCW = relA2 < relA3;

          this.graphics.clear();
          // Drawing the arc:
          // anticlockwise: "If true, draws arc in the counter-clockwise direction."
          // If isCCW is true, we want CCW draw? 
          // In Step 44 I used `!isCCW`. Let's stick to what was there if it worked (User said c_shape worked).
          this.graphics.arc(centerX, centerY, radius, angle1, angle3, !isCCW);
          this.graphics.stroke({ width: thickness, color: OBSTACLE_COLOR, cap: cap === 'round' ? 'round' : 'butt', join: 'round' });


          // Physics approximation with segments
          const segments = 10;

          let sweep = 0;
          if (relA2 < relA3) {
            sweep = relA3;
          } else {
            sweep = -(2 * Math.PI - relA3);
          }

          const angleStep = sweep / segments;

          for (let i = 0; i < segments; i++) {
            const thetaStart = angle1 + i * angleStep;
            // Midpoint
            const thetaMid = thetaStart + angleStep / 2;

            const segX = centerX + radius * Math.cos(thetaMid);
            const segY = centerY + radius * Math.sin(thetaMid);

            const segLen = 2 * radius * Math.sin(Math.abs(angleStep) / 2);
            const segAngle = thetaMid + Math.PI / 2;

            const pCenter = Vec2(segX / SCALE, -segY / SCALE);

            const segmentShape = Box(
              (segLen / 2) / SCALE,
              (thickness / 2) / SCALE,
              pCenter,
              -segAngle
            );

            this.body.createFixture({
              shape: segmentShape,
              friction: OBSTACLE_FRICTION,
              restitution: OBSTACLE_RESTITUTION,
              density: OBSTACLE_DENSITY,
            });
          }

          // Add Round Caps if requested
          if (cap === 'round') {
            const capRadius = thickness / 2;

            // Start Point
            const startX = centerX + radius * Math.cos(angle1);
            const startY = centerY + radius * Math.sin(angle1);

            // End Point
            const endX = centerX + radius * Math.cos(angle3);
            const endY = centerY + radius * Math.sin(angle3);

            const startCircle = Circle(
              Vec2(startX / SCALE, -startY / SCALE),
              capRadius / SCALE
            );

            this.body.createFixture({
              shape: startCircle,
              friction: OBSTACLE_FRICTION,
              restitution: OBSTACLE_RESTITUTION,
              density: OBSTACLE_DENSITY,
            });

            const endCircle = Circle(
              Vec2(endX / SCALE, -endY / SCALE),
              capRadius / SCALE
            );

            this.body.createFixture({
              shape: endCircle,
              friction: OBSTACLE_FRICTION,
              restitution: OBSTACLE_RESTITUTION,
              density: OBSTACLE_DENSITY,
            });
          }

          return;
        }
        break;
      }
      case 'square':
      case 'rectangle':
      default: {
        const w = (type === 'square' && width) ? width : (width || 0);
        const h = (type === 'square' && width) ? width : (height || 0);

        this.graphics.rect(-w / 2, -h / 2, w, h);
        this.graphics.fill({ color: OBSTACLE_COLOR });

        shape = Box(
          (w / 2) / SCALE,
          (h / 2) / SCALE
        );
        break;
      }
    }

    if (shape) {
      this.body.createFixture({
        shape: shape,
        friction: OBSTACLE_FRICTION,
        restitution: OBSTACLE_RESTITUTION,
        density: OBSTACLE_DENSITY,
        filterCategoryBits: CATEGORY.OBSTACLE,
      });
    }
  }

  update(): void {
    // Static
  }

  /**
   * Get the global bounds of the obstacle
   */
  getBounds(): PIXI.Rectangle {
    const bounds = this.graphics.getBounds();
    return new PIXI.Rectangle(bounds.x, bounds.y, bounds.width, bounds.height);
  }

  destroy(physicsWorld: PhysicsWorld): void {
    physicsWorld.getWorld().destroyBody(this.body);
    this.graphics.destroy();
  }
}
