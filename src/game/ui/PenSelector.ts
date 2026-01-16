/**
 * Pen Selector UI Component
 * A carousel-style overlay for selecting pens
 */

import type { Pen } from '../pens/PenConfig';
import { PENS, getDefaultPen } from '../pens/PenConfig';

export type PenSelectedCallback = (pen: Pen) => void;

export class PenSelector {
  private container: HTMLDivElement;
  private overlay: HTMLDivElement;
  private carousel: HTMLDivElement;
  private penItems: HTMLDivElement[] = [];
  private selectedPen: Pen;
  private onSelect: PenSelectedCallback | null = null;

  // Physics state
  private isDragging = false;
  private currentScrollX = 0; // Current scroll position (pixels)
  private targetScrollX = 0;  // Target snap position
  private velocity = 0;
  private lastDragX = 0;
  private lastDragTime = 0;
  private rafId: number | null = null; // RequestAnimationFrame ID

  // Constants
  private readonly ITEM_WIDTH = 120;
  private readonly ITEM_GAP = 20;
  private readonly CENTER_SCALE = 1.6; // Slightly larger for emphasis
  private readonly MIN_SCALE = 0.7;
  private readonly FRICTION = 0.95; // Inertia decay
  private readonly SPRING_STRENGTH = 0.1; // Snapping strength

  constructor(parentContainer: HTMLElement) {
    this.selectedPen = getDefaultPen();

    // Create main overlay container
    this.overlay = document.createElement('div');
    this.overlay.className = 'pen-selector-overlay';
    this.overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.6);
      display: none;
      justify-content: center;
      align-items: center;
      z-index: 1000;
      backdrop-filter: blur(4px);
    `;

    // Create modal container
    this.container = document.createElement('div');
    this.container.className = 'pen-selector-modal';
    this.container.style.cssText = `
      background: white;
      border-radius: 16px;
      padding: 24px 32px 32px;
      min-width: 500px;
      max-width: 90vw;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      position: relative;
    `;

    // Create header
    const header = document.createElement('div');
    header.style.cssText = `
      display: flex;
      justify-content: center;
      align-items: center;
      margin-bottom: 32px;
      position: relative;
    `;

    // Title
    const title = document.createElement('h2');
    title.textContent = 'Choose a pen';
    title.style.cssText = `
      font-size: 24px;
      font-weight: 500;
      color: #333;
      margin: 0;
      text-align: center;
      letter-spacing: -0.5px;
    `;

    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '×';
    closeBtn.style.cssText = `
      position: absolute;
      right: -16px;
      top: -12px;
      width: 40px;
      height: 40px;
      border: none;
      background: #f5f5f5;
      border-radius: 50%;
      font-size: 28px;
      line-height: 1;
      color: #666;
      cursor: pointer;
      display: flex;
      justify-content: center;
      align-items: center;
      transition: all 0.2s ease;
    `;
    closeBtn.addEventListener('mouseenter', () => {
      closeBtn.style.background = '#e0e0e0';
      closeBtn.style.color = '#333';
    });
    closeBtn.addEventListener('mouseleave', () => {
      closeBtn.style.background = '#f5f5f5';
      closeBtn.style.color = '#666';
    });
    closeBtn.addEventListener('click', () => this.hide());

    header.appendChild(title);
    header.appendChild(closeBtn);

    // Create carousel container
    const carouselWrapper = document.createElement('div');
    carouselWrapper.style.cssText = `
      overflow: hidden;
      margin: 0 -32px; /* Pull into padding area */
      padding: 40px 0;
      height: 200px;
      position: relative;
      /* Mask edges for fade effect */
      mask-image: linear-gradient(to right, transparent, black 15%, black 85%, transparent);
      -webkit-mask-image: linear-gradient(to right, transparent, black 15%, black 85%, transparent);
    `;

    // Create carousel track
    this.carousel = document.createElement('div');
    this.carousel.style.cssText = `
      position: absolute;
      left: 0;
      top: 0;
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      /* No transition - we control via JS */
      cursor: grab;
      user-select: none;
      touch-action: none; /* Prevent browser scrolling */
    `;

    // Create pen items
    this.createPenItems();

    // Create "Use" button
    const useBtn = document.createElement('button');
    useBtn.textContent = 'Use';
    useBtn.style.cssText = `
      display: block;
      margin: 24px auto 0;
      padding: 14px 64px;
      font-size: 18px;
      font-weight: 600;
      color: white;
      background-color: #37A4E9;
      border: none;
      border-radius: 30px;
      cursor: pointer;
      transition: background-color 0.2s ease;
      letter-spacing: 0.5px;
      position: relative; /* Ensure z-index works */
      z-index: 20;
    `;
    useBtn.addEventListener('mouseenter', () => {
      useBtn.style.backgroundColor = '#2995D9';
    });
    useBtn.addEventListener('mouseleave', () => {
      useBtn.style.backgroundColor = '#37A4E9';
    });
    useBtn.addEventListener('click', () => this.confirmSelection());

    // Setup drag events
    this.setupDragEvents();

    // Assemble the DOM
    carouselWrapper.appendChild(this.carousel);
    this.container.appendChild(header);
    this.container.appendChild(carouselWrapper);
    this.container.appendChild(useBtn);
    this.overlay.appendChild(this.container);
    parentContainer.appendChild(this.overlay);

    // Close on overlay click
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) {
        this.hide();
      }
    });

    // Start render loop
    this.startRenderLoop();
  }

  private createPenItems(): void {
    this.penItems = [];
    this.carousel.innerHTML = '';

    for (let i = 0; i < PENS.length; i++) {
      const pen = PENS[i];
      const item = document.createElement('div');
      item.className = 'pen-item';

      // Absolute positioning relative to carousel center
      // Logic handled in render loop
      item.style.cssText = `
        position: absolute;
        left: 50%;
        top: 50%;
        width: ${this.ITEM_WIDTH}px;
        height: 140px;
        margin-left: -${this.ITEM_WIDTH / 2}px; /* Center origin */
        margin-top: -70px; /* Center origin */
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        cursor: pointer;
        /* Will-change for performance */
        will-change: transform, opacity;
      `;

      // Pen name
      const name = document.createElement('div');
      name.textContent = pen.name;
      name.style.cssText = `
        font-size: 14px;
        font-weight: 500;
        color: #333;
        text-align: center;
        margin-bottom: 12px;
        white-space: nowrap;
      `;

      // Color indicator (uniform height)
      const colorSwatch = document.createElement('div');
      colorSwatch.style.cssText = `
        width: 40px;
        height: 20px; /* Fixed height for alignment */
        background: #${pen.color.toString(16).padStart(6, '0')};
        border-radius: 4px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      `;

      item.appendChild(name);
      item.appendChild(colorSwatch);

      // Click to select
      item.addEventListener('click', () => {
        // Snap to this item
        this.snapToItem(i);
      });

      this.carousel.appendChild(item);
      this.penItems.push(item);
    }
  }

  private setupDragEvents(): void {
    // Mouse events - bind to carousel wrapper for consistent events
    this.carousel.addEventListener('mousedown', (e) => this.onDragStart(e.clientX));
    window.addEventListener('mousemove', (e) => this.onDragMove(e.clientX));
    window.addEventListener('mouseup', () => this.onDragEnd());

    // Touch events
    this.carousel.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        this.onDragStart(e.touches[0].clientX);
      }
    });
    window.addEventListener('touchmove', (e) => {
      if (e.touches.length === 1) {
        this.onDragMove(e.touches[0].clientX);
      }
    });
    window.addEventListener('touchend', () => this.onDragEnd());
  }

  private onDragStart(x: number): void {
    this.isDragging = true;
    this.lastDragX = x;
    this.lastDragTime = performance.now();
    this.velocity = 0;
    this.carousel.style.cursor = 'grabbing';
  }

  private onDragMove(x: number): void {
    if (!this.isDragging) return;

    const delta = x - this.lastDragX;

    // Bounds resistance (rubber banding)
    const maxScroll = 0;
    const minScroll = -(PENS.length - 1) * (this.ITEM_WIDTH + this.ITEM_GAP);

    if (this.currentScrollX > maxScroll || this.currentScrollX < minScroll) {
      this.currentScrollX += delta * 0.3;
    } else {
      this.currentScrollX += delta;
    }

    // Calculate velocity
    const now = performance.now();
    const dt = now - this.lastDragTime;
    if (dt > 0) {
      // Exponential moving average for smoother velocity
      const instantaneousVelocity = delta / dt; // pixels per ms
      this.velocity = this.velocity * 0.5 + instantaneousVelocity * 0.5;
    }

    this.lastDragX = x;
    this.lastDragTime = now;
  }

  private onDragEnd(): void {
    if (!this.isDragging) return;

    this.isDragging = false;
    this.carousel.style.cursor = 'grab';

    // Calculate target snap position based on inertia
    const itemTotalWidth = this.ITEM_WIDTH + this.ITEM_GAP;

    // Project where we'd land with current velocity
    // Simple projection: position + velocity * constant
    const projection = this.currentScrollX + this.velocity * 300;

    // Find nearest item index to projected position
    const nearestIndex = Math.round(-projection / itemTotalWidth);
    const clampedIndex = Math.max(0, Math.min(nearestIndex, PENS.length - 1));

    this.targetScrollX = -clampedIndex * itemTotalWidth;
  }

  private snapToItem(index: number): void {
    const itemTotalWidth = this.ITEM_WIDTH + this.ITEM_GAP;
    this.targetScrollX = -index * itemTotalWidth;
  }

  private startRenderLoop(): void {
    const render = () => {
      this.updatePhysics();
      this.render();
      this.rafId = requestAnimationFrame(render);
    };
    this.rafId = requestAnimationFrame(render);
  }

  private updatePhysics(): void {
    if (this.isDragging) return; // Physics handled by drag move
    if (this.overlay.style.display === 'none') return; // Don't update if hidden

    // Apply inertia / spring to snap to target
    const diff = this.targetScrollX - this.currentScrollX;

    // Spring physics: acceleration proportional to distance
    // v += diff * strength
    // v *= friction
    // p += v

    this.velocity += diff * this.SPRING_STRENGTH;
    this.velocity *= this.FRICTION;
    this.currentScrollX += this.velocity;

    // Stop animation if settled
    if (Math.abs(diff) < 0.5 && Math.abs(this.velocity) < 0.1) {
      this.currentScrollX = this.targetScrollX;
      this.velocity = 0;
    }

    // Update selected pen based on current scroll position
    const itemTotalWidth = this.ITEM_WIDTH + this.ITEM_GAP;
    const centerIndex = Math.round(-this.currentScrollX / itemTotalWidth);
    const clampedIndex = Math.max(0, Math.min(centerIndex, PENS.length - 1));

    // Optimization: only update if changed to avoid unnecessary re-assignments
    if (PENS[clampedIndex] !== this.selectedPen) {
      this.selectedPen = PENS[clampedIndex];
    }
  }

  private render(): void {
    if (this.overlay.style.display === 'none') return;

    const itemTotalWidth = this.ITEM_WIDTH + this.ITEM_GAP;

    for (let i = 0; i < this.penItems.length; i++) {
      const item = this.penItems[i];

      // Item's base position in the carousel
      const itemBaseX = i * itemTotalWidth;

      // Final position including scroll
      const finalX = itemBaseX + this.currentScrollX;

      // Calculate distance from center (0)
      const distance = Math.abs(finalX);

      // Continuous Scaling Logic
      // Scale decreases as distance increases
      // Max scale at distance 0, Min scale at distance >= itemTotalWidth
      let scale = this.MIN_SCALE;
      let opacity = 0.5;
      let zIndex = 0;

      if (distance < itemTotalWidth) {
        const t = 1 - (distance / itemTotalWidth); // 1 at center, 0 at adjacent
        // Exponential ease for "pop" effect
        const easedT = t * t * (3 - 2 * t);

        scale = this.MIN_SCALE + (this.CENTER_SCALE - this.MIN_SCALE) * easedT;
        opacity = 0.5 + 0.5 * easedT;
        zIndex = Math.floor(100 * easedT);
      }

      item.style.transform = `translateX(${finalX}px) scale(${scale})`;
      item.style.opacity = opacity.toFixed(2);
      item.style.zIndex = zIndex.toString();
    }
  }

  private confirmSelection(): void {
    if (this.onSelect) {
      this.onSelect(this.selectedPen);
    }
    this.hide();
  }

  /**
   * Show the pen selector
   */
  show(onSelect: PenSelectedCallback, currentPenId?: string): void {
    this.onSelect = onSelect;

    // Set current start position immediately
    if (currentPenId) {
      const index = PENS.findIndex(p => p.id === currentPenId);
      if (index !== -1) {
        const itemTotalWidth = this.ITEM_WIDTH + this.ITEM_GAP;
        this.targetScrollX = -index * itemTotalWidth;
        this.currentScrollX = this.targetScrollX;
        this.velocity = 0;
        this.selectedPen = PENS[index];
      }
    }

    this.overlay.style.display = 'flex';

    // Force immediate render to prevent visual glitch
    this.updatePhysics();
    this.render();
  }

  /**
   * Hide the pen selector
   */
  hide(): void {
    this.overlay.style.display = 'none';
    this.onSelect = null;
  }

  /**
   * Get the currently selected pen
   */
  getSelectedPen(): Pen {
    return this.selectedPen;
  }

  /**
   * Destroy the component
   */
  destroy(): void {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
    }
    this.overlay.remove();
  }
}
