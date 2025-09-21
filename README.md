# Neon Arena 霓虹競技場

A minimal first-person shooter sandbox built with [three.js](https://threejs.org/) and a lightweight Node.js backend. The scene features a neon-lit arena you can explore using classic FPS controls. Open the page in multiple browser tabs to see other players' avatars move around in real time thanks to a WebSocket relay server.

一個基於 [three.js](https://threejs.org/) 與 Node.js 後端的極簡第一人稱射擊體驗。玩家可以在霓虹燈點綴的競技場中自由移動，並透過 WebSocket 伺服器即時同步位置，只要在多個瀏覽器分頁開啟就能看到彼此的分身移動。

## Features

- **Pointer lock FPS controls** with smooth acceleration, jumping, and collision with the arena floor.
- **Stylized 3D arena** rendered with three.js, including fog, lighting, and neon props.
- **Online multiplayer** basics via WebSocket updates that sync player position and orientation.
- **HUD overlays** with crosshair, player counter, and quick instructions for newcomers.

## 功能特色

- **指針鎖定第一人稱控制**：支援加速、減速、跳躍與地面碰撞判斷。
- **霓虹風格 3D 場景**：使用 three.js 加入霧效、燈光與裝飾物件。
- **基礎連線功能**：透過 WebSocket 同步玩家位置與朝向，輕鬆擴充更多玩法。
- **戰鬥資訊介面**：畫面中央準心、玩家數量提示與快速操作說明。

## Getting started

1. Install dependencies (requires Node.js 18+):
   ```bash
   npm install
   ```
2. Start the server:
   ```bash
   npm start
   ```
3. Visit `http://localhost:3000` in your browser and click **Enter Arena** to begin.

> **Tip:** Open the site in another window or share the URL for a lightweight multiplayer playground.

## 快速開始

1. 安裝相依套件（需 Node.js 18 以上）：
   ```bash
   npm install
   ```
2. 啟動伺服器：
   ```bash
   npm start
   ```
3. 在瀏覽器開啟 `http://localhost:3000`，點擊 **Enter Arena** 進入場景後即可開始遊玩。

> **小提示：** 建議再開一個瀏覽器分頁測試多人同步，或分享網址給朋友一起遊玩。

## Controls

| Action | Keys |
| ------ | ---- |
| Move   | `W` `A` `S` `D` |
| Jump   | `Space` |
| Look   | Mouse (after locking pointer) |
| Release pointer | `Esc` |

## 操作方式

| 動作 | 鍵位 |
| ---- | ---- |
| 移動 | `W` `A` `S` `D` |
| 跳躍 | `Space` |
| 轉向 | 滑鼠（鎖定指針後） |
| 解除指針鎖定 | `Esc` |

## Project structure

```
public/
  index.html      # Main web page
  main.js         # Three.js scene & networking logic
  style.css       # HUD and overlay styling
server.js         # Express + WebSocket backend
package.json      # Project metadata & scripts
```

Feel free to extend the arena, add shooting mechanics, or integrate a proper game loop on top of this foundation.

你可以在此基礎上擴充地圖、加入射擊判定或武器系統，也可以整合更完整的遊戲流程，打造專屬的線上多人遊戲體驗。
