import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { PointerLockControls } from 'https://unpkg.com/three@0.160.0/examples/jsm/controls/PointerLockControls.js';

// ===== UI 元素引用 =====
// 透過常量保存界面元素的引用，方便在互動時更新文字或樣式。
const overlay = document.getElementById('overlay');
const hud = document.getElementById('hud');
const startButton = document.getElementById('startButton');
const connectionStatus = document.getElementById('connectionStatus');
const playerCountEl = document.getElementById('playerCount');
const infoEl = document.getElementById('info');

let socket;

infoEl.textContent = 'WASD to move • Space to jump • Esc to free cursor / 使用 WASD 移動、Space 跳躍、Esc 釋放滑鼠';

// ===== three.js 場景與渲染器初始化 =====
// 建立場景並加入霧化效果，營造霓虹場景氛圍。
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05060a);
scene.fog = new THREE.Fog(0x05060a, 20, 80);

// 建立第一人稱視角相機。
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);

// WebGLRenderer 負責在畫面上繪製場景。
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// 指針鎖定控制器讓玩家可以使用滑鼠控制視角。
const controls = new PointerLockControls(camera, document.body);
controls.getObject().position.set(0, 1.6, 5);
scene.add(controls.getObject());

startButton.addEventListener('click', () => {
  controls.lock();
});

controls.addEventListener('lock', () => {
  overlay.classList.add('hidden');
  hud.classList.remove('hidden');
});

controls.addEventListener('unlock', () => {
  overlay.classList.remove('hidden');
  hud.classList.add('hidden');
  const isConnected = socket && socket.readyState === WebSocket.OPEN;
  connectionStatus.textContent = isConnected ? 'Click to re-enter' : 'Disconnected';
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ===== 場景燈光 =====
const ambientLight = new THREE.AmbientLight(0x6b7280, 0.6);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0x38bdf8, 0.8);
dirLight.position.set(10, 25, 10);
dirLight.castShadow = true;
dirLight.shadow.mapSize.set(1024, 1024);
scene.add(dirLight);

// ===== 地板與場景幾何 =====
// 建立地板，讓玩家有行走的平面。
const floorGeometry = new THREE.PlaneGeometry(160, 160, 1, 1);
const floorMaterial = new THREE.MeshStandardMaterial({
  color: 0x0f172a,
  metalness: 0.2,
  roughness: 0.9
});
const floor = new THREE.Mesh(floorGeometry, floorMaterial);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

// 建立自訂的競技場元素（柱子、平台、霓虹裝飾）。
createArena(scene);

// Elevated platforms and pillars for minimal collision interaction
function createArena(scene) {
  const pillarGeometry = new THREE.CylinderGeometry(0.6, 0.6, 6, 12);
  const pillarMaterial = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, emissive: 0x0ea5e9, emissiveIntensity: 0.35 });

  const positions = [
    [-20, 3, -20],
    [20, 3, -20],
    [-20, 3, 20],
    [20, 3, 20],
    [0, 3, 0]
  ];

  positions.forEach(([x, y, z]) => {
    const pillar = new THREE.Mesh(pillarGeometry, pillarMaterial.clone());
    pillar.position.set(x, y, z);
    pillar.castShadow = true;
    pillar.receiveShadow = true;
    scene.add(pillar);
  });

  const platformGeometry = new THREE.BoxGeometry(8, 1, 8);
  const platformMaterial = new THREE.MeshStandardMaterial({
    color: 0x1e3a8a,
    emissive: 0x1f2937,
    metalness: 0.4,
    roughness: 0.6
  });

  const platformPositions = [
    [0, 2.5, -12],
    [-12, 2.5, 12],
    [12, 2.5, 12]
  ];

  platformPositions.forEach(([x, y, z]) => {
    const platform = new THREE.Mesh(platformGeometry, platformMaterial.clone());
    platform.position.set(x, y, z);
    platform.castShadow = true;
    platform.receiveShadow = true;
    scene.add(platform);
  });

  const neonMaterial = new THREE.MeshStandardMaterial({ color: 0x22d3ee, emissive: 0x22d3ee, emissiveIntensity: 1.2 });
  const neonGeometry = new THREE.BoxGeometry(1, 6, 1);

  for (let i = 0; i < 20; i++) {
    const neon = new THREE.Mesh(neonGeometry, neonMaterial.clone());
    const angle = (i / 20) * Math.PI * 2;
    const radius = 45 + Math.sin(i) * 6;
    neon.position.set(Math.cos(angle) * radius, 3, Math.sin(angle) * radius);
    neon.castShadow = true;
    neon.receiveShadow = true;
    scene.add(neon);
  }
}

// ===== 網路連線邏輯 =====
const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
socket = new WebSocket(`${protocol}://${window.location.host}`);
let playerId = null;
const remotePlayers = new Map();
let lastUpdateSent = 0;

socket.addEventListener('open', () => {
  connectionStatus.textContent = 'Connected. Click Enter Arena to play. / 已連線，點擊 Enter Arena 進入遊戲';
});

socket.addEventListener('close', () => {
  connectionStatus.textContent = 'Connection closed. Refresh to retry. / 連線已中斷，請重新整理重試';
});

socket.addEventListener('error', () => {
  connectionStatus.textContent = 'Connection error. / 連線發生錯誤';
});

socket.addEventListener('message', (event) => {
  let data;
  try {
    data = JSON.parse(event.data);
  } catch (err) {
    console.error('Failed to parse message', err);
    return;
  }

  switch (data.type) {
    case 'init':
      playerId = data.id;
      data.players.forEach((player) => {
        if (player.id !== playerId) {
          ensureRemotePlayer(player);
        }
      });
      updatePlayerCount();
      break;
    case 'player-joined':
      if (data.player.id !== playerId) {
        ensureRemotePlayer(data.player);
        updatePlayerCount();
      }
      break;
    case 'player-update':
      if (data.player.id !== playerId) {
        ensureRemotePlayer(data.player);
      }
      break;
    case 'player-left':
      removeRemotePlayer(data.id);
      updatePlayerCount();
      break;
    default:
      break;
  }
});

function ensureRemotePlayer(player) {
  let mesh = remotePlayers.get(player.id);
  if (!mesh) {
    // 若不存在對應的遠端玩家模型，建立後加入場景。
    mesh = buildRemoteAvatar(player.id);
    remotePlayers.set(player.id, mesh);
    scene.add(mesh);
  }

  mesh.position.set(player.position.x, player.position.y - 0.9, player.position.z);
  mesh.rotation.y = player.rotation.y;
}

function removeRemotePlayer(id) {
  const mesh = remotePlayers.get(id);
  if (mesh) {
    scene.remove(mesh);
    remotePlayers.delete(id);
  }
}

function buildRemoteAvatar(id) {
  // 為遠端玩家建立簡單方塊人模型，並使用 id 派生顏色避免重複。
  const body = new THREE.Group();
  const baseColor = colorFromId(id);

  const torsoGeometry = new THREE.BoxGeometry(0.8, 1.4, 0.4);
  const headGeometry = new THREE.BoxGeometry(0.6, 0.6, 0.6);
  const material = new THREE.MeshStandardMaterial({ color: baseColor, emissive: baseColor, emissiveIntensity: 0.3 });

  const torso = new THREE.Mesh(torsoGeometry, material);
  torso.position.y = 0.7;
  torso.castShadow = true;
  torso.receiveShadow = true;
  body.add(torso);

  const head = new THREE.Mesh(headGeometry, material.clone());
  head.position.y = 1.4;
  head.castShadow = true;
  head.receiveShadow = true;
  body.add(head);

  return body;
}

function colorFromId(id) {
  // 將玩家 ID 轉換成哈希值，再映射成色相，讓不同玩家顯示不同顏色。
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  const hue = Math.abs(hash) % 360;
  const color = new THREE.Color().setHSL(hue / 360, 0.6, 0.5);
  return color;
}

function updatePlayerCount() {
  // 本機玩家加上遠端玩家數量，用於 HUD 顯示。
  const count = (playerId ? 1 : 0) + remotePlayers.size;
  playerCountEl.textContent = `Players: ${count}`;
}

// ===== 玩家移動邏輯 =====
let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let canJump = false;

const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
const clock = new THREE.Clock();

// 鍵盤事件對照表，便於維護。
const keys = {
  KeyW: () => (moveForward = true),
  KeyA: () => (moveLeft = true),
  KeyS: () => (moveBackward = true),
  KeyD: () => (moveRight = true)
};

const keyUps = {
  KeyW: () => (moveForward = false),
  KeyA: () => (moveLeft = false),
  KeyS: () => (moveBackward = false),
  KeyD: () => (moveRight = false)
};

document.addEventListener('keydown', (event) => {
  if (event.code === 'Space' && canJump) {
    // 只有在角色貼地時才允許跳躍。
    velocity.y += 8;
    canJump = false;
  }
  const handler = keys[event.code];
  if (handler) {
    handler();
  }
});

document.addEventListener('keyup', (event) => {
  const handler = keyUps[event.code];
  if (handler) {
    handler();
  }
});

function animate() {
  requestAnimationFrame(animate);

  const delta = Math.min(clock.getDelta(), 0.1);

  if (controls.isLocked === true) {
    // 利用阻尼模擬慣性與摩擦力。
    velocity.x -= velocity.x * 10.0 * delta;
    velocity.z -= velocity.z * 10.0 * delta;
    velocity.y -= 9.8 * 6.0 * delta;

    direction.z = Number(moveForward) - Number(moveBackward);
    direction.x = Number(moveRight) - Number(moveLeft);
    direction.normalize();

    if (moveForward || moveBackward) velocity.z -= direction.z * 40.0 * delta;
    if (moveLeft || moveRight) velocity.x -= direction.x * 40.0 * delta;

    controls.moveRight(-velocity.x * delta);
    controls.moveForward(-velocity.z * delta);

    const position = controls.getObject().position;
    position.y += velocity.y * delta;

    if (position.y < 1.6) {
      // 避免穿透地板，同時重置跳躍狀態。
      velocity.y = 0;
      position.y = 1.6;
      canJump = true;
    }

    const now = performance.now();
    if (socket.readyState === WebSocket.OPEN && playerId && now - lastUpdateSent > 80) {
      // 節流玩家狀態同步，減少網路流量。
      socket.send(
        JSON.stringify({
          type: 'update',
          position: { x: position.x, y: position.y, z: position.z },
          rotation: { x: camera.rotation.x, y: controls.getObject().rotation.y, z: camera.rotation.z }
        })
      );
      lastUpdateSent = now;
    }
  }

  renderer.render(scene, camera);
}

animate();
