/**
 * Douglas-Peucker Line Simplification Algorithm
 * Reduces the number of points in a polyline while preserving shape
 */

export interface Point {
  x: number;
  y: number;
}

/**
 * Calculate perpendicular distance from a point to a line segment
 */
function perpendicularDistance(point: Point, lineStart: Point, lineEnd: Point): number {
  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;

  // Line length squared
  const lengthSq = dx * dx + dy * dy;

  if (lengthSq === 0) {
    // Line start and end are the same point
    return Math.sqrt(
      (point.x - lineStart.x) ** 2 + (point.y - lineStart.y) ** 2
    );
  }

  // Calculate perpendicular distance using cross product
  const crossProduct = Math.abs(
    (lineEnd.y - lineStart.y) * point.x -
    (lineEnd.x - lineStart.x) * point.y +
    lineEnd.x * lineStart.y -
    lineEnd.y * lineStart.x
  );

  return crossProduct / Math.sqrt(lengthSq);
}

/**
 * Douglas-Peucker algorithm implementation
 * @param points - Array of points to simplify
 * @param tolerance - Maximum distance threshold for point elimination
 * @returns Simplified array of points
 */
export function douglasPeucker(points: Point[], tolerance: number): Point[] {
  if (points.length <= 2) {
    return points;
  }

  // Find the point with maximum distance from line between first and last points
  let maxDistance = 0;
  let maxIndex = 0;

  const firstPoint = points[0];
  const lastPoint = points[points.length - 1];

  for (let i = 1; i < points.length - 1; i++) {
    const distance = perpendicularDistance(points[i], firstPoint, lastPoint);
    if (distance > maxDistance) {
      maxDistance = distance;
      maxIndex = i;
    }
  }

  // If max distance is greater than tolerance, recursively simplify
  if (maxDistance > tolerance) {
    // Recursive call for the two segments
    const leftSegment = douglasPeucker(points.slice(0, maxIndex + 1), tolerance);
    const rightSegment = douglasPeucker(points.slice(maxIndex), tolerance);

    // Combine results (remove duplicate point at junction)
    return [...leftSegment.slice(0, -1), ...rightSegment];
  }

  // All points are within tolerance, return only endpoints
  return [firstPoint, lastPoint];
}

/**
 * Distance-based sampling: ensures minimum distance between consecutive points
 * @param points - Array of points to sample
 * @param minDistance - Minimum distance between points
 * @returns Sampled array of points
 */
export function distanceSampling(points: Point[], minDistance: number): Point[] {
  if (points.length <= 1) {
    return points;
  }

  const result: Point[] = [points[0]];
  let lastPoint = points[0];

  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - lastPoint.x;
    const dy = points[i].y - lastPoint.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance >= minDistance) {
      result.push(points[i]);
      lastPoint = points[i];
    }
  }

  // Always include the last point if it's not already included
  const finalPoint = points[points.length - 1];
  if (result[result.length - 1] !== finalPoint) {
    result.push(finalPoint);
  }

  return result;
}
