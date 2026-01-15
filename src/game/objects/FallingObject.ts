import * as PIXI from 'pixi.js';
import { Body, Box, Circle, Polygon, Vec2 } from 'planck';
import {
  SCALE,
  FALLING_OBJECT_COLOR,
  FALLING_OBJECT_FRICTION,
  FALLING_OBJECT_RESTITUTION,
  FALLING_OBJECT_DENSITY,
  CATEGORY,
} from '../config';
import { PhysicsWorld } from '../physics/PhysicsWorld';
import type { FallingObjectConfig } from '../levels/LevelSchema';

export class FallingObject {
  public graphics: PIXI.Graphics;
  public body: Body;

  constructor(
    physicsWorld: PhysicsWorld,
    config: FallingObjectConfig,
    startActive: boolean = false
  ) {
    const {
      type = 'rectangle',
      x,
      y,
      width = 0,
      height = 0,
      angle = 0,
      radius
    } = config;

    // Create Pixi.js graphics
    this.graphics = new PIXI.Graphics();

    // Set initial position and rotation
    this.graphics.position.set(x, y);
    this.graphics.rotation = (angle * Math.PI) / 180;

    // Create Planck.js physics body
    const physicsPos = physicsWorld.toPhysics(x, y);

    this.body = physicsWorld.getWorld().createBody({
      type: startActive ? 'dynamic' : 'static', // Start static if not active, then switch to dynamic
      position: physicsPos,
      angle: - (angle * Math.PI) / 180,
    });

    // this.graphics.fill({ color: FALLING_OBJECT_COLOR }); // Removed: Fix rendering order

    let shape;

    switch (type) {
      case 'circle': {
        const r = radius || width / 2;
        this.graphics.circle(0, 0, r);
        this.graphics.fill({ color: FALLING_OBJECT_COLOR });
        shape = Circle(r / SCALE);
        break;
      }
      case 'triangle': {
        // Isosceles triangle pointing up (relative to body)
        const w = width;
        const h = height;
        // Vertices relative to (0,0)
        const v1 = { x: 0, y: -h / 2 };
        const v2 = { x: w / 2, y: h / 2 };
        const v3 = { x: -w / 2, y: h / 2 };

        this.graphics.poly([v1.x, v1.y, v2.x, v2.y, v3.x, v3.y]);
        this.graphics.fill({ color: FALLING_OBJECT_COLOR });

        const p1 = Vec2(v1.x / SCALE, -v1.y / SCALE);
        const p2 = Vec2(v2.x / SCALE, -v2.y / SCALE);
        const p3 = Vec2(v3.x / SCALE, -v3.y / SCALE);

        shape = Polygon([p3, p2, p1]);
        break;
      }
      case 'square':
      case 'rectangle':
      default: {
        const w = (type === 'square' && width) ? width : (width || 0);
        const h = (type === 'square' && width) ? width : (height || 0);

        this.graphics.rect(-w / 2, -h / 2, w, h);
        this.graphics.fill({ color: FALLING_OBJECT_COLOR });

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
        density: FALLING_OBJECT_DENSITY,
        friction: FALLING_OBJECT_FRICTION,
        restitution: FALLING_OBJECT_RESTITUTION,
        filterCategoryBits: CATEGORY.FALLING_OBJECT,
      });
    }
  }

  update(): void {
    const pos = this.body.getPosition();
    const angle = this.body.getAngle();

    // Convert physics coordinates to pixel coordinates
    this.graphics.position.x = pos.x * SCALE;
    this.graphics.position.y = -pos.y * SCALE;
    this.graphics.rotation = -angle;
  }

  activate(): void {
    if (this.body.getType() !== 'dynamic') {
      this.body.setType('dynamic');
      this.body.setAwake(true);
    }
  }

  destroy(physicsWorld: PhysicsWorld): void {
    physicsWorld.getWorld().destroyBody(this.body);
    this.graphics.destroy();
  }
}
