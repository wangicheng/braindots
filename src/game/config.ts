/**
 * Game Configuration
 * Contains all game constants and physics parameters
 */

// Physics scale factor (pixels to physics world units)
export const SCALE = 60; // 60 pixels = 1 meter in physics world

// Canvas dimensions
export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

// Physics world settings
export const GRAVITY = -10; // Gravity pointing downward (in physics coordinates)
export const VELOCITY_ITERATIONS = 2; // Higher = more accurate velocity solving
export const POSITION_ITERATIONS = 3; // Higher = more accurate position solving

// Ball settings
export const BALL_RADIUS = 25; // pixels
export const BALL_COLORS = {
  blue: 0x3DBEEF,
  pink: 0xED86B4,
};

// Ball physics
export const BALL_DENSITY = 1.0;
export const BALL_FRICTION = 0.01;
export const BALL_RESTITUTION = 0.0;

// Obstacle settings (Static)
export const OBSTACLE_COLOR = 0x959595;
export const OBSTACLE_DENSITY = 50.0;
export const OBSTACLE_FRICTION = 0.5;
export const OBSTACLE_RESTITUTION = 0.0;

// Falling Object settings (Dynamic)
export const FALLING_OBJECT_COLOR = 0xC8C8C8;
export const FALLING_OBJECT_DENSITY = 1.0;
export const FALLING_OBJECT_FRICTION = 0.1;
export const FALLING_OBJECT_RESTITUTION = 0.0;

// Line drawing settings
export const LINE_COLOR = 0x333333;
export const LINE_WIDTH = 16; // pixels
export const LINE_MIN_DISTANCE = 20; // Minimum distance between points

// Line physics
export const LINE_DENSITY = 50.0;
export const LINE_FRICTION = 1.5;
export const LINE_RESTITUTION = 0.0;

// Background
export const BACKGROUND_COLOR = 0xF5F5F5;
export const GRID_SIZE = 36;
export const GRID_COLOR = 0xE0EFFF; // Light blue grid color

// Collision categories
export const CATEGORY = {
  DEFAULT: 0x0001,
  BLUE_BALL: 0x0002,
  PINK_BALL: 0x0004,
  USER_LINE: 0x0008,
  GROUND: 0x0010,
  OBSTACLE: 0x0020,
  FALLING_OBJECT: 0x0040,
  NET: 0x0080,
};
