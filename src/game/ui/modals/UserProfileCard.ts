import * as PIXI from 'pixi.js';
import { getCanvasWidth, getCanvasHeight, scale } from '../../config';

export class UserProfileCard extends PIXI.Container {
  private onCloseCallback: () => void;
  private onViewLevelsCallback: (userId: string) => void;
  private userName: string;
  private userId: string;
  private color: number;

  constructor(userName: string, userId: string, color: number, onClose: () => void, onViewLevels: (userId: string) => void) {
    super();
    this.userName = userName;
    this.userId = userId;
    this.color = color;
    this.onCloseCallback = onClose;
    this.onViewLevelsCallback = onViewLevels;

    this.refreshUI();

    // Listen for resize
    window.addEventListener('resize', this.handleResize);
  }

  private handleResize = (): void => {
    this.refreshUI();
  };

  private refreshUI(): void {
    this.removeChildren();

    const canvasWidth = getCanvasWidth();
    const canvasHeight = getCanvasHeight();

    this.zIndex = 2000;

    // 1. Dimmed Background (Click to close)
    const overlay = new PIXI.Graphics();
    overlay.rect(0, 0, canvasWidth, canvasHeight);
    overlay.fill({ color: 0x000000, alpha: 0.5 });
    overlay.eventMode = 'static';
    overlay.cursor = 'pointer';
    overlay.on('pointertap', () => this.onCloseCallback());
    this.addChild(overlay);

    // 2. Card Container
    const cardWidth = scale(400);
    const cardHeight = scale(300);
    const card = new PIXI.Container();
    card.position.set((canvasWidth - cardWidth) / 2, (canvasHeight - cardHeight) / 2);
    this.addChild(card);

    // Shadow
    const shadow = new PIXI.Graphics();
    shadow.rect(0, 0, cardWidth, cardHeight);
    shadow.fill({ color: 0x000000, alpha: 0.3 });
    shadow.filters = [new PIXI.BlurFilter({ strength: scale(8), quality: 3 })];
    shadow.position.set(0, scale(4));
    card.addChild(shadow);

    // Card Body
    const bg = new PIXI.Graphics();
    bg.rect(0, 0, cardWidth, cardHeight);
    bg.fill({ color: 0xFFFFFF });
    card.addChild(bg);

    card.eventMode = 'static';
    card.on('pointertap', (e) => e.stopPropagation());

    // 3. User Avatar (Large)
    const avatarRadius = scale(50);
    const avatar = new PIXI.Graphics();
    avatar.circle(0, 0, avatarRadius);
    avatar.fill(this.color);
    avatar.stroke({ width: scale(4), color: 0xE0E0E0 });
    avatar.position.set(cardWidth / 2, scale(80));
    card.addChild(avatar);

    // 4. User Name
    const nameText = new PIXI.Text({
      text: this.userName,
      style: {
        fontFamily: 'Arial',
        fontSize: scale(32),
        fontWeight: 'bold',
        fill: '#555555'
      }
    });
    nameText.anchor.set(0.5);
    nameText.position.set(cardWidth / 2, scale(160));
    card.addChild(nameText);

    // 5. User Stats
    const statsStyle = {
      fontFamily: 'Arial',
      fontSize: scale(18),
      fill: '#A0A0A0'
    };

    // Fake stats (using a deterministic random based on userId)
    const hash = this.userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const createdCount = (hash % 50) + 1;
    const likesCount = (hash * 13) % 1000;

    const statsText = new PIXI.Text({
      text: `Levels Created: ${createdCount}    Likes: ${likesCount}`,
      style: statsStyle
    });
    statsText.anchor.set(0.5);
    statsText.position.set(cardWidth / 2, scale(210));
    card.addChild(statsText);

    // 6. View Levels Button
    const btnWidth = scale(200);
    const btnHeight = scale(40);
    const btn = new PIXI.Container();
    btn.position.set((cardWidth - btnWidth) / 2, scale(250));

    const btnBg = new PIXI.Graphics();
    btnBg.roundRect(0, 0, btnWidth, btnHeight, scale(4));
    btnBg.stroke({ width: 1, color: 0x4ECDC4 });
    btnBg.fill({ color: 0xFFFFFF, alpha: 1 });
    btn.addChild(btnBg);

    const btnText = new PIXI.Text({
      text: 'View Levels',
      style: {
        fontFamily: 'Arial',
        fontSize: scale(16),
        fill: 0x4ECDC4,
        fontWeight: 'bold'
      }
    });
    btnText.anchor.set(0.5);
    btnText.position.set(btnWidth / 2, btnHeight / 2);
    btn.addChild(btnText);

    btn.eventMode = 'static';
    btn.cursor = 'pointer';
    btn.on('pointertap', () => {
      this.onViewLevelsCallback(this.userId);
    });

    card.addChild(btn);

    // Close Button (Top Right)
    const closeBtn = new PIXI.Container();
    const closeSize = scale(40);
    const closeHit = new PIXI.Graphics();
    closeHit.rect(0, 0, closeSize, closeSize);
    closeHit.fill({ color: 0x000000, alpha: 0.001 });
    closeBtn.addChild(closeHit);

    const closeX = new PIXI.Text({
      text: '×',
      style: {
        fontFamily: 'Arial',
        fontSize: scale(32),
        fill: '#AAAAAA'
      }
    });

    closeX.anchor.set(0.5);
    closeX.position.set(closeSize / 2, closeSize / 2);
    closeBtn.addChild(closeX);

    closeBtn.position.set(cardWidth - scale(40), 0);
    closeBtn.eventMode = 'static';
    closeBtn.cursor = 'pointer';
    closeBtn.on('pointertap', () => this.onCloseCallback());

    card.addChild(closeBtn);
  }

  destroy(options?: any): void {
    window.removeEventListener('resize', this.handleResize);
    super.destroy(options);
  }
}
