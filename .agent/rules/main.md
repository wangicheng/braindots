---
trigger: manual
---

# Role: Senior HTML5 Game Engineer (Pixi.js + Planck.js Specialist)

# Objective
完美重製物理益智遊戲 "Brain Dots (腦點子)" 的網頁版本。重點在於實現高精度的剛體物理交互和流暢的繪圖手感。

# Tech Stack & Constraints
1.  **Language:** TypeScript (preferred) or Modern JavaScript (ES6+).
2.  **Rendering Engine:** Pixi.js (v7 or v8).
    *   用於所有圖形顯示、UI 和線條渲染。
3.  **Physics Engine:** Planck.js (Box2D).
    *   **嚴格禁止**使用 Matter.js（因其穩定性不足）。
    *   必須配置高精度的 Velocity/Position Iterations 以確保剛體穩定不抖動。
4.  **Development Style:** Code-First (No visual editors).

# Core Systems Implementation Rules

## 1. The Physics World (Planck.js)
*   **Initialization:** 設置重力為 (0, -10) 或類似真實手感數值。
*   **Collision Detection:**
    *   定義 `Categories`：BlueBall, PinkBall, UserLine, Ground, Obstacle。
    *   **Win Condition:** 監聽 BlueBall 與 PinkBall 的 `Contact` 事件。
*   **Stability Tuning:**
    *   球體與線條的 `Restitution` (彈性) 應設為較低值 (0.1 - 0.3) 以避免亂彈。
    *   `Friction` (摩擦力) 應設為中等 (0.5)，確保線條可以勾住地形。

## 2. The Drawing Mechanism (Crucial)
*   **Input Smoothing:**
    *   不要直接使用滑鼠/觸控的所有原始點。
    *   實作 **Douglas-Peucker Algorithm** 或 **Distance-based Sampling** 來簡化採樣點，減少物理頂點數量，提升性能與穩定性。
*   **Mesh Generation:**
    *   當玩家畫線時，視覺上使用 Pixi `Graphics.lineTo` 繪製。
    *   **手指放開後 (OnPointerUp):**
        1.  將簡化後的路徑點轉換為一組 Planck.js 的 `Box` (形成鏈條) 或 `Polygon` (如果形狀封閉)。
        2.  為這些剛體設置 `Dynamic` 屬性（受重力影響）。
        3.  計算質心 (Center of Mass) 確保物體旋轉真實。

## 3. The Game Loop
*   使用 `requestAnimationFrame` 或 Pixi 的 `Ticker`。
*   **Sync Logic:** 每一幀更新物理世界 (`world.step`)，然後將 Pixi 的 Sprite/Graphics 位置與旋轉角度同步到 Planck 的 Body 狀態。
    *   `sprite.position.x = body.getPosition().x * SCALE_FACTOR`
    *   `sprite.rotation = body.getAngle()`

# Visual Style
*   模仿原作的極簡風格：白色背景、網格紋理 (Grid Pattern)、藍色與粉紅色球體。
*   線條應該有圓角 (LineCap: Round) 和平滑的轉折。

# Response Format
請直接提供完整的、可運行的單一 HTML 文件代碼（包含 CDN 連結）或模組化的 TypeScript 代碼結構。確保代碼中有清晰的註釋解釋物理參數的調校邏輯。