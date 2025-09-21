import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { randomUUID } from 'crypto';

// 建立 Express 應用並設定伺服器監聽的埠號，Heroku/Render 等平台會透過環境變數提供埠號。
const app = express();
const port = process.env.PORT || 3000;

// 提供 public 資料夾內的靜態檔案（HTML、JS、CSS），讓前端可以直接載入。
app.use(express.static('public'));

const server = createServer(app);
const wss = new WebSocketServer({ server });

// players 以 Map 儲存玩家連線與狀態，key 為玩家 UUID。
const players = new Map();

function broadcast(message, exceptId) {
  const data = JSON.stringify(message);
  for (const [id, client] of players) {
    if (client.socket.readyState === WebSocket.OPEN && id !== exceptId) {
      client.socket.send(data);
    }
  }
}

wss.on('connection', (socket) => {
  // 新連線一律分派一個隨機 UUID 作為玩家識別。
  const playerId = randomUUID();
  const defaultState = {
    position: { x: 0, y: 1.6, z: 0 },
    rotation: { x: 0, y: 0, z: 0 }
  };

  players.set(playerId, { socket, state: defaultState });

  // 傳送初始化資訊給新玩家，包含自身 ID 與現有玩家狀態。
  socket.send(
    JSON.stringify({
      type: 'init',
      id: playerId,
      players: Array.from(players.entries()).map(([id, { state }]) => ({ id, ...state }))
    })
  );

  // 通知其他玩家有人加入，避免回傳給自己。
  broadcast(
    {
      type: 'player-joined',
      player: { id: playerId, ...defaultState }
    },
    playerId
  );

  socket.on('message', (message) => {
    let payload;
    try {
      payload = JSON.parse(message.toString());
    } catch (err) {
      console.error('Failed to parse incoming message', err);
      return;
    }

    if (payload.type === 'update' && players.has(playerId)) {
      // 更新伺服器上的玩家狀態，並立即廣播給其他玩家。
      const { position, rotation } = payload;
      const player = players.get(playerId);
      player.state = {
        position: {
          x: Number(position?.x ?? player.state.position.x),
          y: Number(position?.y ?? player.state.position.y),
          z: Number(position?.z ?? player.state.position.z)
        },
        rotation: {
          x: Number(rotation?.x ?? player.state.rotation.x),
          y: Number(rotation?.y ?? player.state.rotation.y),
          z: Number(rotation?.z ?? player.state.rotation.z)
        }
      };

      broadcast(
        {
          type: 'player-update',
          player: { id: playerId, ...player.state }
        },
        playerId
      );
    }
  });

  socket.on('close', () => {
    // 移除連線並廣播離線事件給其他玩家。
    players.delete(playerId);
    broadcast({ type: 'player-left', id: playerId });
  });
});

server.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
