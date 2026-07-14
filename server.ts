/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { Household, Room, Box, Task, Member, Role } from './src/types.js';

const PORT = 3000;
const DB_FILE = path.join(process.cwd(), 'households_db.json');

// Memory cache loaded from DB file
let householdsDb: Record<string, Household> = {};

function loadDatabase() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf8');
      householdsDb = JSON.parse(data);
      console.log(`[DB] Base de datos cargada. ${Object.keys(householdsDb).length} unidades domésticas encontradas.`);
    } else {
      householdsDb = {};
      saveDatabase();
    }
  } catch (error) {
    console.error('[DB] Error al cargar la base de datos:', error);
    householdsDb = {};
  }
}

function saveDatabase() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(householdsDb, null, 2), 'utf8');
  } catch (error) {
    console.error('[DB] Error al guardar la base de datos:', error);
  }
}

async function startServer() {
  loadDatabase();

  const app = express();
  const server = http.createServer(app);

  // Parse JSON bodies
  app.use(express.json());

  // API endpoints
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', households: Object.keys(householdsDb).length });
  });

  // Get metadata of a box by scanning QR code (for quick view / sharing)
  app.get('/api/box/:householdCode/:boxId', (req, res) => {
    const { householdCode, boxId } = req.params;
    const household = householdsDb[householdCode];
    if (!household) {
      return res.status(404).json({ error: 'Unidad doméstica no encontrada' });
    }
    const box = household.boxes.find((b) => b.id === boxId);
    if (!box) {
      return res.status(404).json({ error: 'Caja no encontrada' });
    }
    const room = household.rooms.find((r) => r.id === box.assignedRoomId);
    res.json({
      box,
      roomName: room ? room.name : 'Sin asignar',
      householdName: household.name
    });
  });

  // Setup WebSockets
  const wss = new WebSocketServer({ noServer: true });

  // Map to track active connections: socket -> metadata
  interface ClientInfo {
    ws: WebSocket;
    householdCode: string;
    email: string;
    name: string;
  }
  const clients = new Map<WebSocket, ClientInfo>();

  function broadcastToHousehold(householdCode: string, sender: WebSocket | null, msg: any) {
    const payloadString = JSON.stringify(msg);
    clients.forEach((client, ws) => {
      if (client.householdCode === householdCode && ws !== sender && ws.readyState === WebSocket.OPEN) {
        ws.send(payloadString);
      }
    });
  }

  wss.on('connection', (ws: WebSocket) => {
    console.log('[WS] Nueva conexión entrante');

    ws.on('message', (message: string) => {
      try {
        const data = JSON.parse(message);
        const { type, householdCode, email, name, payload } = data;

        if (type === 'join') {
          if (!householdCode || !email || !name) {
            ws.send(JSON.stringify({ type: 'error', payload: 'Código de casa, email y nombre requeridos' }));
            return;
          }

          let household = householdsDb[householdCode];

          // If household doesn't exist, we create it dynamically if they sent the password
          if (!household) {
            // Create a new household
            household = {
              code: householdCode,
              name: payload?.name || `Mudanza ${householdCode}`,
              passwordHash: payload?.password || '',
              members: [
                {
                  email,
                  name,
                  avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${email}`,
                  role: 'Owner'
                }
              ],
              rooms: [
                { id: 'kitchen-id', name: 'Cocina', template: 'cocina', x: 2, y: 1 },
                { id: 'living-id', name: 'Salón', template: 'salon', x: 2, y: 2 },
                { id: 'bedroom-id', name: 'Dormitorio Principal', template: 'dormitorio', x: 1, y: 2 }
              ],
              boxes: [
                {
                  id: 'box-1',
                  name: 'Caja Utensilios Cocina',
                  status: 'embalado',
                  fragility: 'medio',
                  contents: ['Sartenes', 'Platos de cerámica', 'Cuchillos', 'Tazas'],
                  assignedRoomId: 'kitchen-id',
                  dimensions: { width: 40, height: 30, depth: 30, label: 'mediano' },
                  color: '#b45309',
                  tapeType: 'fragil'
                },
                {
                  id: 'box-2',
                  name: 'Libros y Documentos',
                  status: 'embalado',
                  fragility: 'bajo',
                  contents: ['Novelas', 'Enciclopedia', 'Contratos', 'Carpetas'],
                  assignedRoomId: 'living-id',
                  dimensions: { width: 50, height: 40, depth: 40, label: 'grande' },
                  color: '#7c2d12',
                  tapeType: 'regular'
                }
              ],
              tasks: [
                {
                  id: 'task-1',
                  title: 'Embalar vajilla frágil',
                  description: 'Usar plástico de burbujas para envolver copas y platos en la cocina',
                  status: 'por_hacer',
                  assignedEmail: email,
                  linkedBoxId: 'box-1',
                  linkedRoomId: 'kitchen-id',
                  dueDate: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0]
                },
                {
                  id: 'task-2',
                  title: 'Organizar estantería salón',
                  description: 'Guardar todos los libros en la caja de cartón reforzada',
                  status: 'completado',
                  assignedEmail: null,
                  linkedBoxId: 'box-2',
                  linkedRoomId: 'living-id',
                  dueDate: new Date().toISOString().split('T')[0]
                }
              ]
            };
            householdsDb[householdCode] = household;
            saveDatabase();
          } else {
            // Check password if it is set and the user is NOT already a member
            const isMember = household.members.some((m) => m.email === email);
            if (!isMember) {
              if (payload?.password && household.passwordHash && payload.password !== household.passwordHash) {
                ws.send(JSON.stringify({ type: 'error', payload: 'Contraseña incorrecta para esta casa' }));
                return;
              }

              // Add as a new member with Viewer role by default
              const newMember: Member = {
                email,
                name,
                avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${email}`,
                role: 'Viewer'
              };
              household.members.push(newMember);
              saveDatabase();
            }
          }

          // Register client info
          clients.set(ws, { ws, householdCode, email, name });

          // Notify household of new join
          broadcastToHousehold(householdCode, ws, {
            type: 'sync',
            payload: household
          });

          // Send current state to joined client
          ws.send(JSON.stringify({
            type: 'init',
            payload: household
          }));

          console.log(`[WS] ${name} (${email}) se unió a la casa ${householdCode}`);
          return;
        }

        // Get registered client
        const client = clients.get(ws);
        if (!client) {
          ws.send(JSON.stringify({ type: 'error', payload: 'Sesión no inicializada. Envía join primero.' }));
          return;
        }

        const activeHousehold = householdsDb[client.householdCode];
        if (!activeHousehold) {
          ws.send(JSON.stringify({ type: 'error', payload: 'Unidad doméstica no encontrada' }));
          return;
        }

        // Check user's role inside the household to validate permissions
        const userInDb = activeHousehold.members.find((m) => m.email === client.email);
        const userRole: Role = userInDb ? userInDb.role : 'Viewer';

        const isWriter = userRole === 'Owner' || userRole === 'Editor';
        const isOwner = userRole === 'Owner';

        // Process message types
        switch (type) {
          // --- ROOM ACTIONS ---
          case 'add_room': {
            if (!isWriter) {
              ws.send(JSON.stringify({ type: 'error', payload: 'No tienes permisos de edición (Editor u Owner requerido)' }));
              return;
            }
            const room: Room = payload;
            if (activeHousehold.rooms.some((r) => r.id === room.id)) return; // Avoid duplicates
            activeHousehold.rooms.push(room);
            saveDatabase();
            broadcastToHousehold(client.householdCode, null, { type: 'sync', payload: activeHousehold });
            break;
          }
          case 'update_room': {
            if (!isWriter) {
              ws.send(JSON.stringify({ type: 'error', payload: 'No tienes permisos de edición' }));
              return;
            }
            const updatedRoom: Room = payload;
            activeHousehold.rooms = activeHousehold.rooms.map((r) => r.id === updatedRoom.id ? updatedRoom : r);
            saveDatabase();
            broadcastToHousehold(client.householdCode, null, { type: 'sync', payload: activeHousehold });
            break;
          }
          case 'delete_room': {
            if (!isWriter) {
              ws.send(JSON.stringify({ type: 'error', payload: 'No tienes permisos de edición' }));
              return;
            }
            const roomIdToDelete: string = payload;
            activeHousehold.rooms = activeHousehold.rooms.filter((r) => r.id !== roomIdToDelete);
            // Orphaned boxes to null
            activeHousehold.boxes = activeHousehold.boxes.map((b) => b.assignedRoomId === roomIdToDelete ? { ...b, assignedRoomId: null } : b);
            saveDatabase();
            broadcastToHousehold(client.householdCode, null, { type: 'sync', payload: activeHousehold });
            break;
          }

          // --- BOX ACTIONS ---
          case 'add_box': {
            if (!isWriter) {
              ws.send(JSON.stringify({ type: 'error', payload: 'No tienes permisos de edición' }));
              return;
            }
            const box: Box = payload;
            if (activeHousehold.boxes.some((b) => b.id === box.id)) return; // Avoid duplicates
            activeHousehold.boxes.push(box);
            saveDatabase();
            broadcastToHousehold(client.householdCode, null, { type: 'sync', payload: activeHousehold });
            break;
          }
          case 'update_box': {
            if (!isWriter) {
              ws.send(JSON.stringify({ type: 'error', payload: 'No tienes permisos de edición' }));
              return;
            }
            const updatedBox: Box = payload;
            activeHousehold.boxes = activeHousehold.boxes.map((b) => b.id === updatedBox.id ? updatedBox : b);
            saveDatabase();
            broadcastToHousehold(client.householdCode, null, { type: 'sync', payload: activeHousehold });
            break;
          }
          case 'delete_box': {
            if (!isWriter) {
              ws.send(JSON.stringify({ type: 'error', payload: 'No tienes permisos de edición' }));
              return;
            }
            const boxIdToDelete: string = payload;
            activeHousehold.boxes = activeHousehold.boxes.filter((b) => b.id !== boxIdToDelete);
            // Remove connections in tasks
            activeHousehold.tasks = activeHousehold.tasks.map((t) => t.linkedBoxId === boxIdToDelete ? { ...t, linkedBoxId: null } : t);
            saveDatabase();
            broadcastToHousehold(client.householdCode, null, { type: 'sync', payload: activeHousehold });
            break;
          }

          // --- TASK ACTIONS ---
          case 'add_task': {
            if (!isWriter) {
              ws.send(JSON.stringify({ type: 'error', payload: 'No tienes permisos de edición' }));
              return;
            }
            const task: Task = payload;
            if (activeHousehold.tasks.some((t) => t.id === task.id)) return; // Avoid duplicates
            activeHousehold.tasks.push(task);
            saveDatabase();
            broadcastToHousehold(client.householdCode, null, { type: 'sync', payload: activeHousehold });
            break;
          }
          case 'update_task': {
            if (!isWriter) {
              ws.send(JSON.stringify({ type: 'error', payload: 'No tienes permisos de edición' }));
              return;
            }
            const updatedTask: Task = payload;
            activeHousehold.tasks = activeHousehold.tasks.map((t) => t.id === updatedTask.id ? updatedTask : t);
            saveDatabase();
            broadcastToHousehold(client.householdCode, null, { type: 'sync', payload: activeHousehold });
            break;
          }
          case 'delete_task': {
            if (!isWriter) {
              ws.send(JSON.stringify({ type: 'error', payload: 'No tienes permisos de edición' }));
              return;
            }
            const taskIdToDelete: string = payload;
            activeHousehold.tasks = activeHousehold.tasks.filter((t) => t.id !== taskIdToDelete);
            saveDatabase();
            broadcastToHousehold(client.householdCode, null, { type: 'sync', payload: activeHousehold });
            break;
          }

          // --- COLLABORATOR/RBAC ACTIONS ---
          case 'update_role': {
            if (!isOwner) {
              ws.send(JSON.stringify({ type: 'error', payload: 'Solo el Propietario (Owner) puede cambiar los roles de los miembros' }));
              return;
            }
            const { targetEmail, newRole } = payload;
            // Prevent changing own role if owner to viewer/editor directly without another owner
            if (targetEmail === client.email) {
              ws.send(JSON.stringify({ type: 'error', payload: 'No puedes cambiar tu propio rol de Propietario' }));
              return;
            }
            activeHousehold.members = activeHousehold.members.map((m) => {
              if (m.email === targetEmail) {
                return { ...m, role: newRole as Role };
              }
              return m;
            });
            saveDatabase();
            broadcastToHousehold(client.householdCode, null, { type: 'sync', payload: activeHousehold });
            break;
          }
          case 'kick_member': {
            if (!isOwner) {
              ws.send(JSON.stringify({ type: 'error', payload: 'Solo el Propietario puede expulsar miembros' }));
              return;
            }
            const targetEmailToKick: string = payload;
            if (targetEmailToKick === client.email) {
              ws.send(JSON.stringify({ type: 'error', payload: 'No puedes expulsarte a ti mismo' }));
              return;
            }
            activeHousehold.members = activeHousehold.members.filter((m) => m.email !== targetEmailToKick);
            saveDatabase();

            // Broadcast the sync to active remaining users
            broadcastToHousehold(client.householdCode, null, { type: 'sync', payload: activeHousehold });

            // Force kick the client if connected
            clients.forEach((info, activeWs) => {
              if (info.householdCode === client.householdCode && info.email === targetEmailToKick) {
                activeWs.send(JSON.stringify({ type: 'error', payload: 'Has sido expulsado de esta unidad doméstica por el propietario.' }));
                activeWs.close();
              }
            });
            break;
          }

          default:
            console.warn('[WS] Tipo de mensaje desconocido:', type);
            break;
        }

      } catch (err) {
        console.error('[WS] Error al procesar mensaje:', err);
        ws.send(JSON.stringify({ type: 'error', payload: 'Error interno en el servidor WebSocket' }));
      }
    });

    ws.on('close', () => {
      const info = clients.get(ws);
      if (info) {
        console.log(`[WS] Cliente desconectado: ${info.name} (${info.email})`);
        clients.delete(ws);
      }
    });
  });

  // Upgrade HTTP connections to WebSocket
  server.on('upgrade', (request, socket, head) => {
    const pathname = new URL(request.url || '', `http://${request.headers.host}`).pathname;

    if (pathname === '/ws') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  // Dev vs Prod Vite Static serving
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[SERVER] MoveSync 3D escuchando en http://localhost:${PORT}`);
  });
}

startServer();
