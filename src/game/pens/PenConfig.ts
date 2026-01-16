/**
 * Pen Configuration
 * Defines different pen types with their visual and physics properties
 */

export interface Pen {
  id: string;
  name: string;
  color: number;        // Line color (hex)
  width: number;        // Line width in pixels
  minDistance: number;  // Minimum distance between points
  density: number;      // Physics density
  friction: number;     // Physics friction
  restitution: number;  // Physics restitution (bounciness)
}

/**
 * Available pens in the game
 */
export const PENS: Pen[] = [
  {
    id: 'ballpoint',
    name: 'Ballpoint Pen',
    color: 0x1a237e,      // Dark blue
    width: 5,
    minDistance: 8,
    density: 1.0,
    friction: 0.02,
    restitution: 0.0,
  },
  {
    id: 'marker',
    name: 'Marker',
    color: 0x212121,      // Black
    width: 12,
    minDistance: 12,
    density: 1.2,
    friction: 0.05,
    restitution: 0.0,
  },
  {
    id: 'fountain',
    name: 'Fountain Pen',
    color: 0x37474f,      // Dark gray-blue
    width: 7,
    minDistance: 10,
    density: 2.0,
    friction: 0.02,
    restitution: 0.0,
  },
  {
    id: 'brush',
    name: 'Paint Brush',
    color: 0x5d4037,      // Brown
    width: 20,
    minDistance: 15,
    density: 0.8,
    friction: 0.1,
    restitution: 0.1,
  },
  {
    id: 'pencil',
    name: 'Pencil',
    color: 0x616161,      // Gray
    width: 4,
    minDistance: 6,
    density: 0.7,
    friction: 0.15,
    restitution: 0.0,
  },
];

/**
 * Get the default pen
 */
export function getDefaultPen(): Pen {
  return PENS[0];
}

/**
 * Find a pen by its ID
 */
export function getPenById(id: string): Pen | undefined {
  return PENS.find(pen => pen.id === id);
}
