/**
 * Main Game Class
 * Orchestrates the game loop, physics, and rendering
 */

import * as PIXI from 'pixi.js';
import { PhysicsWorld } from './physics/PhysicsWorld';
import { Ball } from './objects/Ball';
import { Obstacle } from './objects/Obstacle';
import { FallingObject } from './objects/FallingObject';
import { DrawnLine } from './objects/DrawnLine';
import { Net } from './objects/Net';
import { DrawingManager } from './input/DrawingManager';
import { LevelManager } from './levels/LevelManager';
import type { Point } from './utils/douglasPeucker';
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  BACKGROUND_COLOR,
  GRID_SIZE,
  GRID_COLOR,
  CATEGORY,
  BALL_COLORS,
  BALL_RADIUS,
} from './config';
import { EffectManager } from './effects/EffectManager';

export const GameState = {
  READY: 0,
  PLAYING: 1,
  WON: 2,
  LOST: 3,
} as const;
export type GameState = typeof GameState[keyof typeof GameState];

export class Game {
  private app: PIXI.Application;
  private physicsWorld: PhysicsWorld;
  private levelManager: LevelManager;
  private balls: Ball[] = [];
  private obstacles: Obstacle[] = [];
  private fallingObjects: FallingObject[] = [];
  private nets: Net[] = [];
  private drawnLines: DrawnLine[] = [];
  private drawingManager: DrawingManager | null = null;
  private gameContainer: PIXI.Container;
  private interactionArea: PIXI.Graphics;
  private hasStarted: boolean = false;
  private currentLevelIndex: number = 0;
  private effectManager: EffectManager;
  private gameState: GameState = GameState.READY;

  constructor() {
    this.app = new PIXI.Application();
    this.physicsWorld = new PhysicsWorld();
    this.levelManager = new LevelManager();
    this.gameContainer = new PIXI.Container();
    this.interactionArea = new PIXI.Graphics();
    this.effectManager = new EffectManager(this.gameContainer);
  }

  /**
   * Initialize the game
   */
  async init(): Promise<void> {
    // Initialize Pixi.js application
    await this.app.init({
      width: GAME_WIDTH,
      height: GAME_HEIGHT,
      backgroundColor: BACKGROUND_COLOR,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });

    // Load assets
    await PIXI.Assets.load('/object_ami.png');

    console.log('Pixi initialized, adding canvas...');
    // Add canvas to DOM
    const container = document.getElementById('app');
    if (container) {
      container.appendChild(this.app.canvas);
    } else {
      document.body.appendChild(this.app.canvas);
    }

    // Setup game container
    this.app.stage.addChild(this.gameContainer);

    // Create background grid
    this.createBackground();

    // Create interaction area (invisible rectangle covering the canvas)
    this.interactionArea.rect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    this.interactionArea.fill({ color: 0xFFFFFF, alpha: 0 });
    this.interactionArea.zIndex = 0;
    this.gameContainer.addChild(this.interactionArea);
    this.gameContainer.sortableChildren = true;

    // Setup drawing
    this.setupDrawing();
    if (this.drawingManager) {
      this.drawingManager.getContainer().zIndex = 100;
    }

    // Create game objects
    await this.createGameObjects();

    // Create UI
    this.createUI();



    // Load assets
    await PIXI.Assets.load('/object_ami.png');


    // Setup collision detection
    this.setupCollisionDetection();

    // Start game loop
    this.app.ticker.add(this.update.bind(this));
  }

  /**
   * Create initial game objects
   */
  /**
   * Load the first level
   */
  private async createGameObjects(): Promise<void> {
    await this.loadLevel(3);
  }

  /**
   * Load level by index
   */
  async loadLevel(index: number): Promise<void> {
    const levelData = await this.levelManager.loadLevel(index);
    if (!levelData) {
      console.error('Failed to load level', index);
      return;
    }

    this.currentLevelIndex = index;

    // Clear existing dynamic objects (except lines? maybe keep lines or clear them?)
    // Typically reloading a level clears lines.
    this.clearLevel();

    // Spawn Balls
    const { blue, pink } = levelData.balls;
    // Balls start inactive (static) until first line is drawn
    const blueBall = new Ball(this.physicsWorld, blue.x, blue.y, 'blue', false);
    const pinkBall = new Ball(this.physicsWorld, pink.x, pink.y, 'pink', false);

    this.balls.push(blueBall, pinkBall);
    this.gameContainer.addChild(blueBall.graphics, pinkBall.graphics);

    // Spawn Obstacles
    // Spawn Obstacles
    for (const obs of levelData.obstacles) {
      const obstacle = new Obstacle(
        this.physicsWorld,
        obs
      );
      this.obstacles.push(obstacle);
      this.gameContainer.addChild(obstacle.graphics);
    }

    // Spawn Falling Objects
    if (levelData.fallingObjects) {
      for (const obj of levelData.fallingObjects) {
        const fallingObj = new FallingObject(
          this.physicsWorld,
          obj,
          false // start inactive
        );
        this.fallingObjects.push(fallingObj);
        this.gameContainer.addChild(fallingObj.graphics);
        this.gameContainer.addChild(fallingObj.graphics);
      }
    }

    // Spawn Nets
    if (levelData.nets) {
      for (const netConfig of levelData.nets) {
        const net = new Net(netConfig);
        this.nets.push(net);
        this.gameContainer.addChild(net.graphics);
      }
    }

    // Update DrawingManager with restricted bounds provider
    if (this.drawingManager) {
      this.drawingManager.setRestrictedAreasProvider(() => {
        const restrictedBounds: PIXI.Rectangle[] = [];

        // Nets (Static)
        this.nets.forEach(net => restrictedBounds.push(net.getBounds()));

        // Balls (Dynamic)
        this.balls.forEach(ball => restrictedBounds.push(ball.getBounds()));

        // Obstacles (Static)
        this.obstacles.forEach(obs => restrictedBounds.push(obs.getBounds()));

        return restrictedBounds;
      });
    }
  }

  /**
   * Clear current level objects
   */
  private clearLevel(): void {
    // Clear balls
    for (const ball of this.balls) {
      ball.destroy(this.physicsWorld);
    }
    this.balls = [];

    // Clear obstacles
    for (const obs of this.obstacles) {
      obs.destroy(this.physicsWorld);
    }
    this.obstacles = [];

    // Clear falling objects
    for (const obj of this.fallingObjects) {
      obj.destroy(this.physicsWorld);
    }
    this.fallingObjects = [];

    // Reset game state
    // Reset game state
    this.hasStarted = false;
    this.gameState = GameState.READY;
    this.effectManager.clear();

    // Clear nets
    for (const net of this.nets) {
      net.destroy();
    }
    this.nets = [];
    this.nets = [];
    if (this.drawingManager) {
      this.drawingManager.setRestrictedAreasProvider(() => []);
    }

    // Clear drawn lines
    for (const line of this.drawnLines) {
      line.destroy(this.physicsWorld);
    }
    this.drawnLines = [];
  }

  /**
   * Setup drawing functionality
   */
  private setupDrawing(): void {
    this.drawingManager = new DrawingManager(this.gameContainer);
    this.drawingManager.enable(this.interactionArea, this.onLineDrawn.bind(this));
  }

  /**
   * Handle when a line is drawn
   */
  private onLineDrawn(points: Point[]): void {
    const line = new DrawnLine(this.physicsWorld, points);
    this.drawnLines.push(line);
    this.gameContainer.addChild(line.graphics);

    // Start game if not started
    if (!this.hasStarted) {
      this.hasStarted = true;
      this.gameState = GameState.PLAYING;
      this.balls.forEach(ball => ball.activate());
      this.fallingObjects.forEach(obj => obj.activate());
    }
  }

  /**
   * Create UI overlay
   */
  private createUI(): void {
    const container = document.getElementById('app');
    if (!container) return;

    // Ensure container is relative for absolute positioning of overlay
    container.style.position = 'relative';

    // UI Overlay Container
    const uiOverlay = document.createElement('div');
    uiOverlay.style.position = 'absolute';
    uiOverlay.style.top = '0';
    uiOverlay.style.left = '0';
    uiOverlay.style.width = '100%';
    uiOverlay.style.height = '100%';
    uiOverlay.style.pointerEvents = 'none'; // Click-through
    uiOverlay.style.zIndex = '10'; // Above canvas

    // Restart Button
    const restartBtn = document.createElement('button');
    restartBtn.textContent = '🔄 Restart';
    restartBtn.style.pointerEvents = 'auto'; // Clickable
    restartBtn.style.position = 'absolute';
    restartBtn.style.top = '20px';
    restartBtn.style.right = '20px';
    restartBtn.style.padding = '8px 16px';
    restartBtn.style.fontSize = '16px';
    restartBtn.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
    restartBtn.style.color = 'white';
    restartBtn.style.border = '1px solid rgba(255, 255, 255, 0.4)';
    restartBtn.style.borderRadius = '20px';
    restartBtn.style.cursor = 'pointer';
    restartBtn.style.backdropFilter = 'blur(4px)';
    restartBtn.style.transition = 'all 0.2s ease';

    // Hover effect
    restartBtn.addEventListener('mouseenter', () => {
      restartBtn.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
    });
    restartBtn.addEventListener('mouseleave', () => {
      restartBtn.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
    });

    restartBtn.addEventListener('click', () => {
      this.restartLevel();
    });

    uiOverlay.appendChild(restartBtn);
    container.appendChild(uiOverlay);
  }

  /**
   * Restart the current level
   */
  private async restartLevel(): Promise<void> {
    await this.loadLevel(this.currentLevelIndex);
  }

  /**
   * Main game loop update
   */
  private setupCollisionDetection(): void {
    this.physicsWorld.getWorld().on('begin-contact', (contact) => {
      if (this.gameState !== GameState.PLAYING) return;

      const fixtureA = contact.getFixtureA();
      const fixtureB = contact.getFixtureB();
      const categoryA = fixtureA.getFilterCategoryBits();
      const categoryB = fixtureB.getFilterCategoryBits();

      // Check collision between Blue Ball and Pink Ball
      const isBlueBall = categoryA === CATEGORY.BLUE_BALL || categoryB === CATEGORY.BLUE_BALL;
      const isPinkBall = categoryA === CATEGORY.PINK_BALL || categoryB === CATEGORY.PINK_BALL;

      if (isBlueBall && isPinkBall) {
        const bodyA = fixtureA.getBody();
        const bodyB = fixtureB.getBody();
        const posA = bodyA.getPosition();
        const posB = bodyB.getPosition();
        const midX = (posA.x + posB.x) / 2;
        const midY = (posA.y + posB.y) / 2;

        const pixelPos = this.physicsWorld.toPixels(midX, midY);
        this.handleWin(pixelPos.x, pixelPos.y);
      }
    });
  }

  private checkBoundaries(): void {
    const margin = BALL_RADIUS * 2;
    const bounds = {
      minX: -margin,
      maxX: GAME_WIDTH + margin,
      maxY: GAME_HEIGHT + margin
    };

    for (const ball of this.balls) {
      const x = ball.graphics.position.x;
      const y = ball.graphics.position.y;

      if (x < bounds.minX || x > bounds.maxX || y > bounds.maxY) {
        let color = BALL_COLORS.blue;
        // Assuming balls[0] is blue, balls[1] is pink as per loadLevel
        if (this.balls.indexOf(ball) === 1) color = BALL_COLORS.pink;

        this.handleLoss(x, y, color);
        return;
      }
    }
  }

  private handleWin(x: number, y: number): void {
    console.log('Game Won!');
    this.gameState = GameState.WON;

    // Clamp position to screen bounds
    const clampedX = Math.max(0, Math.min(x, GAME_WIDTH));
    const clampedY = Math.max(0, Math.min(y, GAME_HEIGHT));

    this.effectManager.createRingExplosion(clampedX, clampedY, 0xFFD700, 1); // Gold

    setTimeout(() => {
      this.restartLevel();
    }, 2000);
  }

  private handleLoss(x: number, y: number, color: number): void {
    console.log('Game Lost!');
    this.gameState = GameState.LOST;

    // Clamp position to screen bounds
    const clampedX = Math.max(0, Math.min(x, GAME_WIDTH));
    const clampedY = Math.max(0, Math.min(y, GAME_HEIGHT));

    this.effectManager.createRingExplosion(clampedX, clampedY, color, 1);

    setTimeout(() => {
      this.restartLevel();
    }, 2000);
  }

  /**
   * Main game loop update
   */
  private update(ticker: PIXI.Ticker): void {
    // Only update physics and game state if playing
    if (this.gameState !== GameState.PLAYING) return;

    // Step physics world
    const dt = ticker.deltaMS / 1000; // Convert to seconds
    this.physicsWorld.step(Math.min(dt, 1 / 30)); // Cap at 30 FPS physics

    this.checkBoundaries();

    // Update ball graphics from physics
    for (const ball of this.balls) {
      ball.update();
    }

    // Update falling objects graphics from physics
    for (const obj of this.fallingObjects) {
      obj.update();
    }

    // Update drawn lines graphics from physics
    for (const line of this.drawnLines) {
      line.update();
    }
  }

  /**
   * Create the background grid
   */
  private createBackground(): void {
    const gridGraphics = new PIXI.Graphics();

    // Calculate offsets to center the grid
    const startX = (GAME_WIDTH / 2) % GRID_SIZE;
    const startY = (GAME_HEIGHT / 2) % GRID_SIZE;

    // Draw vertical lines
    for (let x = startX; x <= GAME_WIDTH; x += GRID_SIZE) {
      gridGraphics.moveTo(x, 0);
      gridGraphics.lineTo(x, GAME_HEIGHT);
    }

    // Draw horizontal lines
    for (let y = startY; y <= GAME_HEIGHT; y += GRID_SIZE) {
      gridGraphics.moveTo(0, y);
      gridGraphics.lineTo(GAME_WIDTH, y);
    }

    gridGraphics.stroke({ width: 1, color: GRID_COLOR });

    // Add to container at the bottom
    this.gameContainer.addChildAt(gridGraphics, 0);
  }

  /**
   * Get the Pixi.js application
   */
  getApp(): PIXI.Application {
    return this.app;
  }
}
