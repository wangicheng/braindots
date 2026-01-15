/**
 * Drawing Manager
 * Handles user input for drawing lines
 */

import * as PIXI from 'pixi.js';
import { distanceSampling } from '../utils/douglasPeucker';
import type { Point } from '../utils/douglasPeucker';
import { LINE_COLOR, LINE_WIDTH, LINE_MIN_DISTANCE } from '../config';

export class DrawingManager {
  private container: PIXI.Container;
  private currentGraphics: PIXI.Graphics | null = null;
  private previewGraphics: PIXI.Graphics;
  private currentPoints: Point[] = [];
  private isDrawing = false;
  private isValidStart = false;
  private onLineComplete: ((points: Point[]) => void) | null = null;

  constructor(stage: PIXI.Container) {
    this.container = new PIXI.Container();
    stage.addChild(this.container);

    // Create preview graphics once and keep it
    this.previewGraphics = new PIXI.Graphics();
    this.container.addChild(this.previewGraphics);
  }

  /**
   * Enable drawing on the specified container
   */
  enable(interactionArea: PIXI.Container, callback: (points: Point[]) => void): void {
    this.onLineComplete = callback;

    interactionArea.eventMode = 'static';
    interactionArea.cursor = 'crosshair';

    interactionArea.on('pointerdown', this.onPointerDown.bind(this));
    interactionArea.on('pointermove', this.onPointerMove.bind(this));
    interactionArea.on('pointerup', this.onPointerUp.bind(this));
    interactionArea.on('pointerupoutside', this.onPointerUp.bind(this));
  }

  /**
   * Handle pointer down event
   */
  private onPointerDown(event: PIXI.FederatedPointerEvent): void {
    const startPoint = { x: event.globalX, y: event.globalY };

    // Check if starting point is in restricted area
    this.isValidStart = !this.isPointInRestrictedArea(startPoint);

    this.isDrawing = true;
    this.currentPoints = [];

    // Create new graphics for drawing
    this.currentGraphics = new PIXI.Graphics();
    this.container.addChild(this.currentGraphics);

    // Ensure preview graphics is always on top
    this.container.addChild(this.previewGraphics);

    // Add first point
    this.currentPoints.push(startPoint);
  }

  /**
   * Handle pointer move event
   */
  private restrictedAreasProvider: (() => PIXI.Rectangle[]) | null = null;

  /**
   * Set restricted areas provider
   */
  setRestrictedAreasProvider(provider: () => PIXI.Rectangle[]): void {
    this.restrictedAreasProvider = provider;
  }

  /**
   * Check if a point is in a restricted area
   */
  private isPointInRestrictedArea(point: Point): boolean {
    if (!this.restrictedAreasProvider) return false;

    const areas = this.restrictedAreasProvider();
    for (const area of areas) {
      if (area.contains(point.x, point.y)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if a line segment intersects with any restricted area
   */
  private intersectsRestrictedArea(p1: Point, p2: Point): boolean {
    if (!this.restrictedAreasProvider) return false;

    const areas = this.restrictedAreasProvider();
    for (const area of areas) {
      // Check if either point is inside (simple check)
      if (area.contains(p1.x, p1.y) || area.contains(p2.x, p2.y)) {
        return true;
      }

      // Check line intersection with rectangle edges
      // Cohen-Sutherland or simple line-line intersection for 4 edges
      // Simpler approach: check intersection with each of the 4 lines of the rect
      const left = area.x;
      const right = area.x + area.width;
      const top = area.y;
      const bottom = area.y + area.height;

      const lines = [
        [{ x: left, y: top }, { x: right, y: top }],       // Top
        [{ x: right, y: top }, { x: right, y: bottom }],   // Right
        [{ x: right, y: bottom }, { x: left, y: bottom }], // Bottom
        [{ x: left, y: bottom }, { x: left, y: top }]      // Left
      ];

      for (const edge of lines) {
        if (this.lineIntersectsLine(p1, p2, edge[0], edge[1])) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Line-line intersection helper
   */
  private lineIntersectsLine(p1: Point, p2: Point, p3: Point, p4: Point): boolean {
    const ccw = (a: Point, b: Point, c: Point) => {
      return (c.y - a.y) * (b.x - a.x) > (b.y - a.y) * (c.x - a.x);
    };
    return (ccw(p1, p3, p4) != ccw(p2, p3, p4)) && (ccw(p1, p2, p3) != ccw(p1, p2, p4));
  }

  /**
   * Get the closest intersection point with restricted areas
   */
  private getClosestIntersection(p1: Point, p2: Point): Point | null {
    if (!this.restrictedAreasProvider) return null;

    let closestIntersection: Point | null = null;
    let minDistance = Infinity;

    const areas = this.restrictedAreasProvider();
    for (const area of areas) {
      // If we are strictly inside, we are already invalid.
      // But we might want to find the exit if p1 was inside?
      // Assuming p1 is always outside or on edge.

      const left = area.x;
      const right = area.x + area.width;
      const top = area.y;
      const bottom = area.y + area.height;

      const lines = [
        [{ x: left, y: top }, { x: right, y: top }],       // Top
        [{ x: right, y: top }, { x: right, y: bottom }],   // Right
        [{ x: right, y: bottom }, { x: left, y: bottom }], // Bottom
        [{ x: left, y: bottom }, { x: left, y: top }]      // Left
      ];

      for (const edge of lines) {
        const p3 = edge[0];
        const p4 = edge[1];

        // Denominator for line intersection
        const den = (p1.x - p2.x) * (p3.y - p4.y) - (p1.y - p2.y) * (p3.x - p4.x);
        if (den === 0) continue; // Parallel

        const t = ((p1.x - p3.x) * (p3.y - p4.y) - (p1.y - p3.y) * (p3.x - p4.x)) / den;
        const u = -((p1.x - p2.x) * (p1.y - p3.y) - (p1.y - p2.y) * (p1.x - p3.x)) / den;

        if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
          const intersectX = p1.x + t * (p2.x - p1.x);
          const intersectY = p1.y + t * (p2.y - p1.y);
          const dist = Math.sqrt((intersectX - p1.x) ** 2 + (intersectY - p1.y) ** 2);

          if (dist < minDistance) {
            minDistance = dist;
            closestIntersection = { x: intersectX, y: intersectY };
          }
        }
      }
    }

    return closestIntersection;
  }

  /**
   * Handle pointer move event
   */
  private onPointerMove(event: PIXI.FederatedPointerEvent): void {
    if (!this.isDrawing || !this.currentGraphics) return;

    const point = { x: event.globalX, y: event.globalY };

    // Only add point if it's far enough from the last point
    const lastPoint = this.currentPoints[this.currentPoints.length - 1];

    // If invalid start, we just want to show the specific visual (ghost line + start point)
    // We do NOT add points to the line.
    if (!this.isValidStart) {
      this.redrawCurrentLine(point);
      return;
    }

    // Check if we hit a restricted area
    if (this.intersectsRestrictedArea(lastPoint, point)) {
      const intersection = this.getClosestIntersection(lastPoint, point);

      if (intersection) {
        const dx = intersection.x - lastPoint.x;
        const dy = intersection.y - lastPoint.y;
        const distToIntersect = Math.sqrt(dx * dx + dy * dy);

        // If the segment to the wall is long enough, add it
        if (distToIntersect >= LINE_MIN_DISTANCE) {
          // Offset slightly back to avoid sticking to the object
          const offset = 3.0;
          if (distToIntersect > offset) {
            const t = (distToIntersect - offset) / distToIntersect;
            const newX = lastPoint.x + dx * t;
            const newY = lastPoint.y + dy * t;
            this.currentPoints.push({ x: newX, y: newY });
          }
        }
      }

      // We hit a wall, so we stop here. 
      // We redraw the confirmed line AND the ghost line to the cursor so the user sees where they are pointing
      this.redrawCurrentLine(point);
      return;
    }

    const dx = point.x - lastPoint.x;
    const dy = point.y - lastPoint.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance >= LINE_MIN_DISTANCE) {
      this.currentPoints.push(point);
    }

    // Always redraw to show the ghost line to current cursor
    this.redrawCurrentLine(point);
  }

  /**
   * Handle pointer up event
   */
  private onPointerUp(): void {
    if (!this.isDrawing) return;
    this.isDrawing = false;

    // Clear preview graphics
    this.previewGraphics.clear();

    if (this.currentGraphics) {
      // Don't destroy immediately if we want to keep the line
      // But Game.ts creates a DrawnLine which creates NEW graphics.
      // So we can destroy these temporary graphics.
      this.container.removeChild(this.currentGraphics);
      this.currentGraphics.destroy();
      this.currentGraphics = null;
    }

    // Need at least 1 point to create a line (or dot), AND must be a valid start
    if (this.currentPoints.length >= 1 && this.isValidStart) {
      // Simplify the line using only distance sampling, NO Douglas-Peucker
      // This ensures the physics shape matches the visual preview (which was distance thresholded)
      const simplifiedPoints = distanceSampling(this.currentPoints, LINE_MIN_DISTANCE);

      // Need at least 1 point after simplification (single point = dot)
      if (simplifiedPoints.length >= 1 && this.onLineComplete) {
        this.onLineComplete(simplifiedPoints);
      }
    }

    this.currentPoints = [];
  }

  /**
   * Redraw the current line preview
   */
  private redrawCurrentLine(cursorPoint?: Point): void {
    if (!this.currentGraphics || this.currentPoints.length < 1) return;

    this.currentGraphics.clear();

    // Draw main committed line
    if (this.currentPoints.length >= 2) {
      this.currentGraphics.setStrokeStyle({
        width: LINE_WIDTH,
        color: LINE_COLOR,
        cap: 'round',
        join: 'round',
        alpha: 1.0, // Fully opaque to match final line
      });

      const startPoint = this.currentPoints[0];
      this.currentGraphics.moveTo(startPoint.x, startPoint.y);

      for (let i = 1; i < this.currentPoints.length; i++) {
        const point = this.currentPoints[i];
        this.currentGraphics.lineTo(point.x, point.y);
      }
      this.currentGraphics.stroke();
    } else if (this.currentPoints.length === 1 && this.isValidStart) {
      // Draw single point only if start is valid
      const p = this.currentPoints[0];
      this.currentGraphics.circle(p.x, p.y, LINE_WIDTH / 2);
      this.currentGraphics.fill(LINE_COLOR);
    }

    // Draw ghost line to cursor using the separate preview graphics
    if (cursorPoint) {
      this.previewGraphics.clear();

      const lastPoint = this.currentPoints[this.currentPoints.length - 1];
      const dx = cursorPoint.x - lastPoint.x;
      const dy = cursorPoint.y - lastPoint.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance >= LINE_MIN_DISTANCE) {
        this.previewGraphics.setStrokeStyle({
          width: LINE_WIDTH,
          color: LINE_COLOR,
          cap: 'round',
          join: 'round',
          alpha: 0.4, // Semi-transparent for ghost segment
        });

        this.previewGraphics.moveTo(lastPoint.x, lastPoint.y);
        this.previewGraphics.lineTo(cursorPoint.x, cursorPoint.y);
        this.previewGraphics.stroke();
      }
    }
  }

  /**
   * Get the drawing container
   */
  getContainer(): PIXI.Container {
    return this.container;
  }
}
