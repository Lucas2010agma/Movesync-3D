/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Package,
  MapPin,
  Layers,
  Users,
  Scan,
  Plus,
  Trash2,
  Edit2,
  Check,
  Search,
  Filter,
  Copy,
  Printer,
  ChevronRight,
  LogOut,
  User,
  Shield,
  Eye,
  Key,
  Database,
  Lock,
  Globe,
  Wifi,
  WifiOff,
  CornerDownRight,
  Sparkles,
  Info,
  Camera,
  LayoutGrid
} from 'lucide-react';
import { Household, Room, Box, Task, Member, Role, WSMessage } from './types.js';
import Blueprint from './components/Blueprint.js';
import KanbanCalendar from './components/KanbanCalendar.js';
import MembersList from './components/MembersList.js';
import QRScanner from './components/QRScanner.js';

// Helper function to compress and resize images on upload to save storage and prevent heavy WS loads
export function resizeImage(file: File, maxWidth = 500, maxHeight = 500): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(event.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        resolve(dataUrl);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
}

export default function App() {
  // Authentication / Connection State
  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [householdCode, setHouseholdCode] = useState('');
  const [householdPassword, setHouseholdPassword] = useState('');
  const [joinAction, setJoinAction] = useState<'create' | 'join' | null>(null);
  const [newHouseholdName, setNewHouseholdName] = useState('');

  // App Core State (synchronized via WebSocket)
  const [household, setHousehold] = useState<Household | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Active View
  const [activeTab, setActiveTab] = useState<'boxes' | 'blueprint' | 'tasks' | 'members' | 'scanner'>('boxes');

  // Modals / Details State
  const [selectedBox, setSelectedBox] = useState<Box | null>(null);
  const [showPrintSheet, setShowPrintSheet] = useState(false);

  // Box Customizer Local Form State
  const [editingBox, setEditingBox] = useState<Box | null>(null);
  const [boxName, setBoxName] = useState('');
  const [boxStatus, setBoxStatus] = useState<Box['status']>('embalado');
  const [boxFragility, setBoxFragility] = useState<Box['fragility']>('medio');
  const [boxContents, setBoxContents] = useState<string[]>([]);
  const [newContentItem, setNewContentItem] = useState('');
  const [boxRoomId, setBoxRoomId] = useState<string>('');
  const [boxColor, setBoxColor] = useState('#d97706'); // default cardboard color
  const [boxTapeType, setBoxTapeType] = useState<Box['tapeType']>('regular');
  const [boxDimLabel, setBoxDimLabel] = useState<'pequeño' | 'mediano' | 'grande' | 'personalizado'>('mediano');
  const [boxWidth, setBoxWidth] = useState(40);
  const [boxHeight, setBoxHeight] = useState(30);
  const [boxDepth, setBoxDepth] = useState(30);
  const [boxImageUrl, setBoxImageUrl] = useState('');

  // Search and Filter State for inventory
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | Box['status']>('all');
  const [roomFilter, setRoomFilter] = useState<string>('all');
  const [fragilityFilter, setFragilityFilter] = useState<string>('all');

  // WebSocket Reference
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectInterval = useRef<any>(null);

  // Derived user details inside current Household
  const currentMember = household?.members.find((m) => m.email === userEmail);
  const userRole: Role = currentMember ? currentMember.role : 'Viewer';

  const isWritable = userRole === 'Owner' || userRole === 'Editor';

  // Initialize Box Dimension Presets
  const applyPresetDimensions = (label: typeof boxDimLabel) => {
    switch (label) {
      case 'pequeño':
        setBoxWidth(30); setBoxHeight(20); setBoxDepth(20);
        break;
      case 'mediano':
        setBoxWidth(40); setBoxHeight(30); setBoxDepth(30);
        break;
      case 'grande':
        setBoxWidth(50); setBoxHeight(40); setBoxDepth(40);
        break;
      default:
        break;
    }
  };

  useEffect(() => {
    applyPresetDimensions(boxDimLabel);
  }, [boxDimLabel]);

  // Connect to Collaborative WebSocket Server
  const connectToWebSocket = (code: string, email: string, name: string, passwordHash?: string, customHhName?: string) => {
    if (wsRef.current) {
      wsRef.current.close();
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws`;

    console.log(`[WS] Conectando a ${wsUrl}...`);
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      setErrorMsg(null);
      // Join room
      const joinMsg: WSMessage = {
        type: 'join',
        householdCode: code,
        email,
        name,
        payload: {
          password: passwordHash || '',
          name: customHhName || `Mudanza ${code}`
        }
      };
      ws.send(JSON.stringify(joinMsg));
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        const { type, payload } = msg;

        if (type === 'init' || type === 'sync') {
          setHousehold(payload);
          setIsLoggedIn(true);
          setErrorMsg(null);
        } else if (type === 'error') {
          setErrorMsg(payload);
          // If password was wrong, disconnect
          if (payload.includes('Contraseña incorrecta') || payload.includes('expulsado')) {
            setIsLoggedIn(false);
            setHousehold(null);
            ws.close();
          }
        }
      } catch (err) {
        console.error('[WS] Error parsing message:', err);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      console.log('[WS] Conexión cerrada. Intentando reconectar...');
    };

    ws.onerror = (err) => {
      console.error('[WS] Error:', err);
      setIsConnected(false);
    };
  };

  // Reconnection hook
  useEffect(() => {
    if (isLoggedIn && !isConnected && householdCode && userEmail && userName) {
      reconnectInterval.current = setInterval(() => {
        console.log('[WS] Intentando reconexión automática...');
        connectToWebSocket(householdCode, userEmail, userName, householdPassword);
      }, 4000);
    } else {
      clearInterval(reconnectInterval.current);
    }
    return () => clearInterval(reconnectInterval.current);
  }, [isLoggedIn, isConnected, householdCode, userEmail, userName]);

  // Clean disconnect on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  // Send WS message helper
  const sendWSMsg = (type: WSMessage['type'], payload: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const msg: WSMessage = {
        type,
        householdCode,
        email: userEmail,
        name: userName,
        payload
      };
      wsRef.current.send(JSON.stringify(msg));
    } else {
      alert('Sin conexión activa con el servidor. Los cambios no se sincronizarán.');
    }
  };

  // Onboarding actions
  const handleOnboardingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userEmail || !userName) {
      alert('Email y Nombre de usuario son obligatorios.');
      return;
    }

    if (joinAction === 'create') {
      if (!newHouseholdName.trim()) {
        alert('Escribe el nombre de tu hogar/estancia para la mudanza.');
        return;
      }
      const code = `MS-${Math.floor(100000 + Math.random() * 900000)}`;
      setHouseholdCode(code);
      connectToWebSocket(code, userEmail, userName, householdPassword, newHouseholdName);
    } else if (joinAction === 'join') {
      if (!householdCode.trim()) {
        alert('Escribe el código de invitación de la casa.');
        return;
      }
      connectToWebSocket(householdCode.trim().toUpperCase(), userEmail, userName, householdPassword);
    }
  };

  const handleQuickDemo = () => {
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const demoEmail = `usuario.${randomSuffix}@movesync.com`;
    const demoName = `Colaborador Demo ${randomSuffix}`;
    const code = 'MS-DEMO77';

    setUserEmail(demoEmail);
    setUserName(demoName);
    setHouseholdCode(code);
    setHouseholdPassword('demo123');

    connectToWebSocket(code, demoEmail, demoName, 'demo123', 'Mudanza Residencial Demo');
  };

  const handleLogout = () => {
    if (wsRef.current) {
      wsRef.current.close();
    }
    setIsLoggedIn(false);
    setHousehold(null);
    setHouseholdCode('');
    setHouseholdPassword('');
    setJoinAction(null);
  };

  // MUTATIONS HANDLERS
  const handleAddRoom = (room: Room) => sendWSMsg('add_room', room);
  const handleUpdateRoom = (room: Room) => sendWSMsg('update_room', room);
  const handleDeleteRoom = (roomId: string) => sendWSMsg('delete_room', roomId);

  const handleUpdateBoxRoom = (boxId: string, roomId: string | null) => {
    const box = household?.boxes.find((b) => b.id === boxId);
    if (box) {
      const updated = { ...box, assignedRoomId: roomId };
      sendWSMsg('update_box', updated);
    }
  };

  const handleBoxFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isWritable) return;
    if (!boxName.trim()) return;

    const boxPayload: Box = {
      id: editingBox ? editingBox.id : `box-${Date.now()}`,
      name: boxName,
      status: boxStatus,
      fragility: boxFragility,
      contents: boxContents,
      assignedRoomId: boxRoomId || null,
      dimensions: {
        width: boxWidth,
        height: boxHeight,
        depth: boxDepth,
        label: boxDimLabel,
      },
      color: boxColor,
      tapeType: boxTapeType,
      imageUrl: boxImageUrl || undefined,
    };

    if (editingBox) {
      sendWSMsg('update_box', boxPayload);
      setEditingBox(null);
    } else {
      sendWSMsg('add_box', boxPayload);
    }

    // Reset box form
    setBoxName('');
    setBoxStatus('embalado');
    setBoxFragility('medio');
    setBoxContents([]);
    setBoxRoomId('');
    setBoxColor('#d97706');
    setBoxTapeType('regular');
    setBoxDimLabel('mediano');
    setBoxImageUrl('');
  };

  const startEditBox = (box: Box) => {
    if (!isWritable) return;
    setEditingBox(box);
    setBoxName(box.name);
    setBoxStatus(box.status);
    setBoxFragility(box.fragility);
    setBoxContents(box.contents);
    setBoxRoomId(box.assignedRoomId || '');
    setBoxColor(box.color);
    setBoxTapeType(box.tapeType);
    setBoxDimLabel(box.dimensions.label);
    setBoxWidth(box.dimensions.width);
    setBoxHeight(box.dimensions.height);
    setBoxDepth(box.dimensions.depth);
    setBoxImageUrl(box.imageUrl || '');
  };

  const handleDeleteBox = (boxId: string) => {
    if (!isWritable) return;
    if (confirm('¿Estás seguro de que quieres eliminar esta caja del inventario?')) {
      sendWSMsg('delete_box', boxId);
    }
  };

  const handleAddContentItem = () => {
    if (newContentItem.trim() && !boxContents.includes(newContentItem.trim())) {
      setBoxContents([...boxContents, newContentItem.trim()]);
      setNewContentItem('');
    }
  };

  const handleRemoveContentItem = (index: number) => {
    setBoxContents(boxContents.filter((_, i) => i !== index));
  };

  const handleAddTask = (task: Task) => sendWSMsg('add_task', task);
  const handleUpdateTask = (task: Task) => sendWSMsg('update_task', task);
  const handleDeleteTask = (taskId: string) => sendWSMsg('delete_task', taskId);

  const handleUpdateMemberRole = (targetEmail: string, newRole: Role) => {
    sendWSMsg('update_role', { targetEmail, newRole });
  };

  const handleKickMember = (targetEmail: string) => {
    sendWSMsg('kick_member', targetEmail);
  };

  // Filtered Boxes
  const filteredBoxes = household?.boxes.filter((box) => {
    const matchesSearch = box.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      box.contents.some((c) => c.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || box.status === statusFilter;
    const matchesRoom = roomFilter === 'all' || box.assignedRoomId === roomFilter;
    const matchesFragility = fragilityFilter === 'all' || box.fragility === fragilityFilter;
    return matchesSearch && matchesStatus && matchesRoom && matchesFragility;
  }) || [];

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-slate-800 flex flex-col selection:bg-blue-100">
      {/* ERROR MSG BANNER */}
      <AnimatePresence>
        {errorMsg && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-red-600 text-white text-xs py-2.5 px-4 text-center font-semibold flex items-center justify-center gap-2 shrink-0 select-none"
          >
            <Info size={14} />
            <span>Error: {errorMsg}</span>
            <button onClick={() => setErrorMsg(null)} className="ml-4 font-mono hover:underline">✕</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* OFFLINE/ONLINE BANNER */}
      {isLoggedIn && (
        <div className={`text-[11px] py-1.5 px-4 text-center font-bold text-white tracking-wide shrink-0 transition flex items-center justify-center gap-2 select-none ${
          isConnected ? 'bg-emerald-600' : 'bg-amber-600 animate-pulse'
        }`}>
          {isConnected ? (
            <>
              <Wifi size={12} />
              CONECTADO EN TIEMPO REAL CON LA MUDANZA
            </>
          ) : (
            <>
              <WifiOff size={12} />
              SIN CONEXIÓN • INTENTANDO CONECTAR CON EL SERVIDOR COLABORATIVO...
            </>
          )}
        </div>
      )}

      {/* ----------------- AUTHENTICATION ONBOARDING SHIELD ----------------- */}
      {!isLoggedIn ? (
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-8 space-y-6 animate-in fade-in zoom-in-95 duration-200">
            {/* App branding */}
            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-blue-600 text-white rounded-2xl flex items-center justify-center mx-auto shadow-blue-200 shadow-md">
                <Package size={34} className="animate-bounce" />
              </div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">MoveSync 3D</h1>
              <p className="text-xs text-slate-500 max-w-xs mx-auto font-medium">
                Mudanzas Inteligentes y Organización 3D Colaborativa en tiempo real.
              </p>
            </div>

            {joinAction === null ? (
              /* Step 1: Select or enter identity + Join/Create decision */
              <div className="space-y-4">
                {/* Simulated Google SSO Button */}
                <button
                  type="button"
                  onClick={() => {
                    // Pre-fill user with metadata email if available
                    setUserEmail('lucas.agma.22@gmail.com');
                    setUserName('Lucas Agma');
                    alert('¡Iniciado sesión automáticamente con Google! Elige crear o unirte a un hogar.');
                  }}
                  className="w-full bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 font-bold py-3 px-4 rounded-xl transition text-xs flex items-center justify-center gap-3 shadow-2xs"
                >
                  <Globe size={16} className="text-blue-600" />
                  Iniciar Sesión con Google
                </button>

                <div className="relative flex py-2 items-center">
                  <div className="flex-grow border-t border-slate-200"></div>
                  <span className="flex-shrink mx-4 text-[10px] text-slate-400 font-bold uppercase tracking-wider">o escribe tus datos</span>
                  <div className="flex-grow border-t border-slate-200"></div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Nombre de usuario</label>
                    <input
                      type="text"
                      placeholder="Ej. Lucas Agma"
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-blue-500 focus:bg-white transition"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Email corporativo o personal</label>
                    <input
                      type="email"
                      placeholder="Ej. lucas.agma.22@gmail.com"
                      value={userEmail}
                      onChange={(e) => setUserEmail(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-blue-500 focus:bg-white transition"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-3">
                  <button
                    onClick={() => {
                      if (!userEmail || !userName) {
                        alert('Por favor escribe primero tu nombre e email.');
                        return;
                      }
                      setJoinAction('create');
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl text-xs transition text-center shadow-xs"
                  >
                    Crear Hogar
                  </button>
                  <button
                    onClick={() => {
                      if (!userEmail || !userName) {
                        alert('Por favor escribe primero tu nombre e email.');
                        return;
                      }
                      setJoinAction('join');
                    }}
                    className="bg-slate-900 hover:bg-slate-850 text-white font-bold py-3 px-4 rounded-xl text-xs transition text-center shadow-xs"
                  >
                    Unirse a Hogar
                  </button>
                </div>

                <div className="border-t border-slate-200 pt-3 text-center">
                  <button
                    onClick={handleQuickDemo}
                    className="text-xs text-blue-600 hover:text-blue-800 hover:underline font-bold"
                  >
                    ✨ Probar con una Demo de Entrada Rápida
                  </button>
                </div>
              </div>
            ) : (
              /* Step 2: Form details depending on join vs create */
              <form onSubmit={handleOnboardingSubmit} className="space-y-4">
                {joinAction === 'create' ? (
                  <>
                    <h3 className="font-extrabold text-slate-900 text-sm">Nueva Unidad Doméstica</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Nombre del Hogar / Mudanza</label>
                        <input
                          type="text"
                          placeholder="Ej. Apartamento Barcelona 2026"
                          value={newHouseholdName}
                          onChange={(e) => setNewHouseholdName(e.target.value)}
                          required
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-blue-500 focus:bg-white transition"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Clave de Seguridad (para invitados)</label>
                        <input
                          type="password"
                          placeholder="Mínimo 4 caracteres"
                          value={householdPassword}
                          onChange={(e) => setHouseholdPassword(e.target.value)}
                          required
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-blue-500 focus:bg-white transition"
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <h3 className="font-extrabold text-slate-900 text-sm">Unirse a Unidad Doméstica Existente</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Código de Invitación (ej. MS-123456)</label>
                        <input
                          type="text"
                          placeholder="Ingresa el código de 9 dígitos"
                          value={householdCode}
                          onChange={(e) => setHouseholdCode(e.target.value)}
                          required
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-blue-500 focus:bg-white uppercase tracking-wider font-mono transition"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Clave de Seguridad</label>
                        <input
                          type="password"
                          placeholder="Escribe la clave del hogar"
                          value={householdPassword}
                          onChange={(e) => setHouseholdPassword(e.target.value)}
                          required
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-blue-500 focus:bg-white transition"
                        />
                      </div>
                    </div>
                  </>
                )}

                <div className="flex gap-2 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setJoinAction(null)}
                    className="bg-white hover:bg-slate-100 text-slate-700 font-bold py-2.5 px-4 rounded-xl border border-slate-200 text-xs transition"
                  >
                    Atrás
                  </button>
                  <button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-5 rounded-xl text-xs transition shadow-xs"
                  >
                    {joinAction === 'create' ? 'Crear e Ingresar' : 'Unirse a la Mudanza'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      ) : (
        /* ----------------- CORE LOGGED IN DESKTOP/MOBILE SHELL ----------------- */
        <div className="flex-grow flex flex-col lg:flex-row h-full">
          {/* Navigation Sidebar */}
          <aside className="bg-white text-slate-600 lg:w-64 flex flex-col shrink-0 border-r border-slate-200 justify-between select-none">
            <div className="flex flex-col">
              {/* Header Branding */}
              <div className="p-6 border-b border-slate-200 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center">
                    <Package size={18} />
                  </div>
                  <span className="font-extrabold text-slate-900 text-md tracking-tight">MoveSync 3D</span>
                </div>
                <span className="text-[9px] bg-blue-50 text-blue-600 border border-blue-100 px-1.5 py-0.25 rounded font-bold font-mono">
                  v1.2
                </span>
              </div>

              {/* Household and User profile summary info */}
              <div className="p-4 bg-slate-50 border-b border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 text-xs truncate max-w-[130px]" title={household?.name}>
                    🏠 {household?.name}
                  </h4>
                  <span className="text-[9px] font-mono font-bold text-blue-600 select-all">
                    {householdCode}
                  </span>
                </div>

                <div className="flex items-center gap-2 pt-1 border-t border-slate-200/60">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center">
                    <User size={14} className="text-blue-500" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-slate-800 text-[11px] font-bold block truncate leading-tight">{userName}</span>
                    <span className="text-slate-500 text-[9px] flex items-center gap-1">
                      {userRole === 'Owner' && <Shield size={9} className="text-amber-500 shrink-0" />}
                      {userRole === 'Editor' && <Shield size={9} className="text-blue-500 shrink-0" />}
                      {userRole === 'Viewer' && <Eye size={9} className="text-slate-400 shrink-0" />}
                      {userRole === 'Owner' ? 'Propietario' : userRole === 'Editor' ? 'Editor' : 'Lector'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Navigation Rail Tabs */}
              <nav className="p-4 space-y-1.5">
                <button
                  onClick={() => setActiveTab('boxes')}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition duration-150 ${
                    activeTab === 'boxes'
                      ? 'bg-blue-50 text-blue-700 border border-blue-100/60 shadow-xs'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <Package size={16} />
                  Gestión de Inventario
                </button>

                <button
                  onClick={() => setActiveTab('blueprint')}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition duration-150 ${
                    activeTab === 'blueprint'
                      ? 'bg-blue-50 text-blue-700 border border-blue-100/60 shadow-xs'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <MapPin size={16} />
                  Estancias de la Vivienda
                </button>

                <button
                  onClick={() => setActiveTab('tasks')}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition duration-150 ${
                    activeTab === 'tasks'
                      ? 'bg-blue-50 text-blue-700 border border-blue-100/60 shadow-xs'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <Layers size={16} />
                  Tareas y Kanban
                </button>

                <button
                  onClick={() => setActiveTab('members')}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition duration-150 ${
                    activeTab === 'members'
                      ? 'bg-blue-50 text-blue-700 border border-blue-100/60 shadow-xs'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <Users size={16} />
                  Colaboradores
                  <span className={`ml-auto px-1.5 py-0.5 rounded-full text-[9px] font-bold ${
                    activeTab === 'members' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {household?.members.length}
                  </span>
                </button>

                <button
                  onClick={() => setActiveTab('scanner')}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition duration-150 ${
                    activeTab === 'scanner'
                      ? 'bg-blue-50 text-blue-700 border border-blue-100/60 shadow-xs'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <Scan size={16} />
                  Escáner QR
                </button>
              </nav>
            </div>

            {/* Logout bottom */}
            <div className="p-4 border-t border-slate-200">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-red-50 hover:text-red-600 transition"
              >
                <LogOut size={16} />
                Cerrar Sesión
              </button>
            </div>
          </aside>

          {/* Main Workspace Frame */}
          <main className="flex-grow p-4 lg:p-8 overflow-y-auto space-y-6">
            <AnimatePresence mode="wait">
              {/* ------------ VIEW: BOXES / INVENTORY ------------ */}
              {activeTab === 'boxes' && (
                <motion.div
                  key="boxes-tab"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-6"
                >
                  {/* Inventory Header */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
                    <div>
                      <h2 className="text-xl font-bold text-slate-800">Control de Inventario de Mudanza</h2>
                      <p className="text-sm text-slate-500 mt-1">
                        Crea, etiqueta y organiza tus cajas de mudanza. Sube una fotografía y genera códigos QR para pegar en tus cajas reales.
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowPrintSheet(true)}
                        className="flex items-center gap-2 bg-slate-900 hover:bg-slate-850 text-white font-semibold text-xs px-4 py-2.5 rounded-xl transition shadow-2xs self-start md:self-auto"
                      >
                        <Printer size={14} />
                        Imprimir Hojas QR
                      </button>
                    </div>
                  </div>

                  {/* Clean Box Creation and Editing Form */}
                  {isWritable && (
                    <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
                      <form onSubmit={handleBoxFormSubmit} className="space-y-6">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                          <h3 className="font-extrabold text-slate-850 text-sm flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
                            {editingBox ? `Editando Caja: ${editingBox.name}` : 'Registrar Nueva Caja de Mudanza'}
                          </h3>
                          {editingBox && (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingBox(null);
                                setBoxName('');
                                setBoxStatus('embalado');
                                setBoxFragility('medio');
                                setBoxContents([]);
                                setBoxRoomId('');
                                setBoxColor('#d97706');
                                setBoxImageUrl('');
                              }}
                              className="text-xs text-blue-600 hover:underline font-bold"
                            >
                              Volver a Crear Nueva
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                          {/* Left Inputs */}
                          <div className="md:col-span-7 space-y-4">
                            <div>
                              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Nombre Identificador</label>
                              <input
                                type="text"
                                placeholder="Ej. Vajilla Frágil Cocina, Libros de Estudio, Ropa de Invierno"
                                value={boxName}
                                onChange={(e) => setBoxName(e.target.value)}
                                required
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-blue-500 focus:bg-white transition"
                              />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Estado</label>
                                <select
                                  value={boxStatus}
                                  onChange={(e) => setBoxStatus(e.target.value as Box['status'])}
                                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:bg-white transition"
                                >
                                  <option value="embalado">📦 Embalado</option>
                                  <option value="en_transito">🚚 En Tránsito</option>
                                  <option value="desembalado">🏡 Desembalado</option>
                                </select>
                              </div>

                              <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Fragilidad</label>
                                <select
                                  value={boxFragility}
                                  onChange={(e) => setBoxFragility(e.target.value as Box['fragility'])}
                                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:bg-white transition"
                                >
                                  <option value="bajo">🟢 Bajo (Robusto / Común)</option>
                                  <option value="medio">🟡 Medio (Cuidado normal)</option>
                                  <option value="alto">🔴 Alto (¡Frágil / Delicado!)</option>
                                </select>
                              </div>

                              <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Estancia (Ubicación)</label>
                                <select
                                  value={boxRoomId}
                                  onChange={(e) => setBoxRoomId(e.target.value)}
                                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:bg-white transition"
                                >
                                  <option value="">Sin estancia asignada</option>
                                  {household?.rooms.map((room) => (
                                    <option key={room.id} value={room.id}>
                                      📍 {room.name}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Color de Caja (Identificador Visual)</label>
                                <div className="flex items-center gap-2">
                                  <input
                                    type="color"
                                    value={boxColor}
                                    onChange={(e) => setBoxColor(e.target.value)}
                                    className="w-9 h-9 rounded-xl border border-slate-200 cursor-pointer bg-transparent shrink-0"
                                  />
                                  <input
                                    type="text"
                                    value={boxColor}
                                    onChange={(e) => setBoxColor(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-center font-mono"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Right Contents tags & photo upload */}
                          <div className="md:col-span-5 space-y-4">
                            {/* Contents List */}
                            <div className="space-y-1.5">
                              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Lista de Contenidos (Artículos)</label>
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  placeholder="Ej. Vasos de cristal, Platos, Sartén..."
                                  value={newContentItem}
                                  onChange={(e) => setNewContentItem(e.target.value)}
                                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddContentItem(); } }}
                                  className="flex-grow bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-blue-500 focus:bg-white transition"
                                />
                                <button
                                  type="button"
                                  onClick={handleAddContentItem}
                                  className="bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition shadow-xs"
                                >
                                  Añadir
                                </button>
                              </div>
                              {boxContents.length > 0 ? (
                                <div className="flex flex-wrap gap-1.5 pt-1.5 max-h-24 overflow-y-auto pr-1">
                                  {boxContents.map((item, idx) => (
                                    <span key={idx} className="bg-slate-100 text-slate-700 text-[10px] py-0.5 px-2.5 rounded-lg font-bold border border-slate-200/60 flex items-center gap-1 select-none">
                                      {item}
                                      <button type="button" onClick={() => handleRemoveContentItem(idx)} className="text-slate-400 hover:text-red-600 ml-1 font-mono">✕</button>
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-[10px] text-slate-400 italic pt-1">La lista de artículos está vacía.</p>
                              )}
                            </div>

                            {/* Optional Photograph preview / uploader */}
                            <div className="space-y-1.5 pt-1">
                              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Fotografía de la Caja (Opcional)</label>
                              
                              {boxImageUrl ? (
                                <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 h-28 flex items-center justify-center group/img">
                                  <img
                                    src={boxImageUrl}
                                    alt="Vista previa de caja"
                                    className="h-full w-full object-contain"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setBoxImageUrl('')}
                                    className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white p-1.5 rounded-full shadow-md transition z-10"
                                    title="Eliminar Imagen"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              ) : (
                                <div className="grid grid-cols-2 gap-2">
                                  <label className="border border-dashed border-slate-200 hover:border-blue-400 bg-slate-50 hover:bg-blue-50/10 transition rounded-xl p-3 flex flex-col items-center justify-center cursor-pointer text-center h-20 select-none">
                                    <Camera size={16} className="text-slate-400 mb-1" />
                                    <span className="text-[10px] font-bold text-slate-600">Subir foto</span>
                                    <input
                                      type="file"
                                      accept="image/*"
                                      className="hidden"
                                      onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                          try {
                                            const base64 = await resizeImage(file);
                                            setBoxImageUrl(base64);
                                          } catch (err) {
                                            alert("No se pudo procesar la imagen.");
                                          }
                                        }
                                      }}
                                    />
                                  </label>

                                  <div className="border border-slate-200 bg-slate-50 rounded-xl p-3.5 flex flex-col justify-center h-20">
                                    <span className="text-[9px] font-bold text-slate-500 uppercase mb-1">O pegar enlace web</span>
                                    <input
                                      type="url"
                                      placeholder="https://..."
                                      value={boxImageUrl}
                                      onChange={(e) => setBoxImageUrl(e.target.value)}
                                      className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-[10px] focus:outline-none focus:border-blue-500"
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex justify-end pt-3 border-t border-slate-100">
                          <button
                            type="submit"
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-xl text-xs transition shadow-xs flex items-center gap-1.5"
                          >
                            <Plus size={14} />
                            {editingBox ? 'Guardar Cambios de Caja' : 'Guardar y Añadir Caja al Inventario'}
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  {/* INVENTORY LISTINGS WITH ADVANCED SEARCH/FILTERS */}
                  <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-5">
                    <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 border-b border-slate-100 pb-4">
                      <div>
                        <h3 className="font-extrabold text-slate-800 text-sm">Inventario Registrado ({filteredBoxes.length} cajas)</h3>
                        <p className="text-xs text-slate-400 mt-0.5">Filtra y busca tus cajas cómodamente por nombre, artículos, estancia o su nivel de fragilidad.</p>
                      </div>

                      {/* Advanced Search & Filters */}
                      <div className="flex flex-wrap items-center gap-2.5 w-full xl:w-auto">
                        <div className="relative flex-1 min-w-[200px]">
                          <Search size={14} className="absolute left-3.5 top-3 text-slate-400" />
                          <input
                            type="text"
                            placeholder="Buscar cajas por nombre o contenidos..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none focus:bg-white transition"
                          />
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as any)}
                            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-600 focus:outline-none"
                          >
                            <option value="all">📦 Todos los estados</option>
                            <option value="embalado">Embaladas</option>
                            <option value="en_transito">En Tránsito</option>
                            <option value="desembalado">Desembaladas</option>
                          </select>

                          <select
                            value={roomFilter}
                            onChange={(e) => setRoomFilter(e.target.value)}
                            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-600 focus:outline-none"
                          >
                            <option value="all">📍 Todas las estancias</option>
                            {household?.rooms.map((room) => (
                              <option key={room.id} value={room.id}>
                                {room.name}
                              </option>
                            ))}
                          </select>

                          <select
                            value={fragilityFilter}
                            onChange={(e) => setFragilityFilter(e.target.value)}
                            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-600 focus:outline-none"
                          >
                            <option value="all">⚠️ Toda fragilidad</option>
                            <option value="bajo">Fragilidad: Bajo</option>
                            <option value="medio">Fragilidad: Medio</option>
                            <option value="alto">Fragilidad: Alto</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {filteredBoxes.length === 0 ? (
                      <div className="text-center py-16 text-slate-400 text-sm flex flex-col items-center gap-2">
                        <Package size={36} className="text-slate-300" />
                        No se encontraron cajas con los criterios de búsqueda especificados.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                        {filteredBoxes.map((box) => {
                          const assignedRoom = household?.rooms.find((r) => r.id === box.assignedRoomId);

                          return (
                            <div
                              key={box.id}
                              onClick={() => setSelectedBox(box)}
                              className="bg-slate-50 hover:bg-slate-100/50 hover:border-slate-300 border border-slate-200/50 p-5 rounded-2xl transition cursor-pointer flex flex-col justify-between gap-4 group"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex items-start gap-3">
                                  {/* Custom color Box icon */}
                                  <div
                                    className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border border-slate-200/60 relative overflow-hidden"
                                    style={{ backgroundColor: box.color }}
                                  >
                                    {box.imageUrl ? (
                                      <img
                                        src={box.imageUrl}
                                        alt={box.name}
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <Package size={20} className="text-white drop-shadow-xs" />
                                    )}
                                  </div>

                                  <div>
                                    <h4 className="font-extrabold text-slate-800 text-sm leading-snug truncate max-w-[150px] group-hover:text-blue-600 transition">
                                      {box.name}
                                    </h4>
                                    <p className="text-[10px] text-slate-400 mt-1">
                                      {box.contents.length} artículos guardados
                                    </p>
                                  </div>
                                </div>

                                {/* Status badge */}
                                <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                  box.status === 'desembalado'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : box.status === 'en_transito'
                                    ? 'bg-sky-100 text-sky-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}>
                                  {box.status}
                                </span>
                              </div>

                              {/* Contents previews */}
                              {box.contents.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {box.contents.slice(0, 3).map((c, i) => (
                                    <span key={i} className="bg-white/90 border border-slate-200/50 text-slate-600 text-[9px] px-2 py-0.5 rounded-md font-bold">
                                      {c}
                                    </span>
                                  ))}
                                  {box.contents.length > 3 && (
                                    <span className="text-[9px] text-slate-400 self-center font-bold pl-1">
                                      +{box.contents.length - 3}
                                    </span>
                                  )}
                                </div>
                              )}

                              {/* Footer details (assigned Room & interactive QR logo) */}
                              <div className="pt-3 border-t border-slate-200/40 flex items-center justify-between text-xs">
                                <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                                  <MapPin size={12} className="text-slate-400 shrink-0" />
                                  {assignedRoom ? assignedRoom.name : 'Sin Ubicación'}
                                </span>

                                <div className="flex items-center gap-2 shrink-0">
                                  {box.fragility === 'alto' && (
                                    <span className="bg-red-50 text-red-700 text-[9px] font-black px-1.5 py-0.25 rounded border border-red-100">
                                      FRÁGIL
                                    </span>
                                  )}
                                  {isWritable && (
                                    <div className="opacity-0 group-hover:opacity-100 transition flex items-center gap-1">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          startEditBox(box);
                                        }}
                                        className="p-1 hover:bg-slate-200 rounded text-slate-600"
                                        title="Editar Caja"
                                      >
                                        <Edit2 size={11} />
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDeleteBox(box.id);
                                        }}
                                        className="p-1 hover:bg-red-50 rounded text-red-600"
                                        title="Eliminar Caja"
                                      >
                                        <Trash2 size={11} />
                                      </button>
                                    </div>
                                  )}
                                  <Scan size={14} className="text-slate-400 group-hover:text-blue-600 transition" />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* ------------ VIEW: BLUEPRINT / HOUSE MAP ------------ */}
              {activeTab === 'blueprint' && (
                <Blueprint
                  rooms={household?.rooms || []}
                  boxes={household?.boxes || []}
                  tasks={household?.tasks || []}
                  role={userRole}
                  onAddRoom={handleAddRoom}
                  onUpdateRoom={handleUpdateRoom}
                  onDeleteRoom={handleDeleteRoom}
                  onUpdateBoxRoom={handleUpdateBoxRoom}
                  onAddBox={(box) => sendWSMsg('add_box', box)}
                  onUpdateBox={(box) => sendWSMsg('update_box', box)}
                  onDeleteBox={(boxId) => sendWSMsg('delete_box', boxId)}
                  onAddTask={handleAddTask}
                  onUpdateTask={handleUpdateTask}
                  onDeleteTask={handleDeleteTask}
                />
              )}

              {/* ------------ VIEW: TASKS / KANBAN / CALENDAR ------------ */}
              {activeTab === 'tasks' && (
                <KanbanCalendar
                  tasks={household?.tasks || []}
                  boxes={household?.boxes || []}
                  rooms={household?.rooms || []}
                  members={household?.members || []}
                  role={userRole}
                  onAddTask={handleAddTask}
                  onUpdateTask={handleUpdateTask}
                  onDeleteTask={handleDeleteTask}
                />
              )}

              {/* ------------ VIEW: COLLABORATORS ------------ */}
              {activeTab === 'members' && (
                <MembersList
                  members={household?.members || []}
                  currentUserEmail={userEmail}
                  role={userRole}
                  householdCode={householdCode}
                  onUpdateRole={handleUpdateMemberRole}
                  onKickMember={handleKickMember}
                />
              )}

              {/* ------------ VIEW: SCANNER QR ------------ */}
              {activeTab === 'scanner' && (
                <QRScanner
                  boxes={household?.boxes || []}
                  rooms={household?.rooms || []}
                  householdCode={householdCode}
                  onOpenBoxModal={(boxId) => {
                    const box = household?.boxes.find((b) => b.id === boxId);
                    if (box) setSelectedBox(box);
                  }}
                />
              )}
            </AnimatePresence>
          </main>
        </div>
      )}

      {/* ----------------- MODAL: BOX DETAIL VIEW ----------------- */}
      <AnimatePresence>
        {selectedBox && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col md:flex-row relative"
            >
              {/* Box Preview (Left side on desktop) */}
              <div className="md:w-1/2 bg-slate-50 p-6 flex flex-col justify-between border-r border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: selectedBox.color }} />
                    <h3 className="font-extrabold text-slate-800 text-md truncate">{selectedBox.name}</h3>
                  </div>
                  <p className="text-[10px] text-slate-400 capitalize mt-1 mb-4">
                    Código ID: <span className="font-mono font-bold">{selectedBox.id.substring(0, 8).toUpperCase()}</span>
                  </p>

                  {/* Photograph or Visual Indicator */}
                  <div className="h-44 my-2 flex items-center justify-center overflow-hidden rounded-2xl bg-white border border-slate-200/60 p-2 shadow-2xs">
                    {selectedBox.imageUrl ? (
                      <img
                        src={selectedBox.imageUrl}
                        alt={selectedBox.name}
                        className="max-h-full max-w-full object-contain rounded-xl"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-400">
                        <Package size={48} style={{ color: selectedBox.color }} className="drop-shadow-xs mb-2" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Caja sin foto real</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Live Info Toggles directly inside the scanner/info view */}
                <div className="space-y-3.5 pt-4 border-t border-slate-200/60">
                  {/* Quick Change Status */}
                  <div>
                    <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Cambiar Estado (Rápido)</span>
                    <div className="grid grid-cols-3 gap-1 bg-slate-200/50 p-1 rounded-xl">
                      {(['embalado', 'en_transito', 'desembalado'] as Box['status'][]).map((st) => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => {
                            if (!isWritable) return;
                            const updated = { ...selectedBox, status: st };
                            sendWSMsg('update_box', updated);
                            setSelectedBox(updated);
                          }}
                          disabled={!isWritable}
                          className={`py-1 px-1.5 rounded-lg text-center text-[10px] font-bold transition select-none ${
                            selectedBox.status === st
                              ? st === 'desembalado'
                                ? 'bg-emerald-600 text-white shadow-2xs'
                                : st === 'en_transito'
                                ? 'bg-sky-600 text-white shadow-2xs'
                                : 'bg-amber-600 text-white shadow-2xs'
                              : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          {st === 'embalado' ? 'Embalado' : st === 'en_transito' ? 'Tránsito' : 'Desembalado'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Relocate room selection */}
                  <div>
                    <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Mover a Estancia (Rápido)</span>
                    <select
                      value={selectedBox.assignedRoomId || ''}
                      disabled={!isWritable}
                      onChange={(e) => {
                        const rId = e.target.value;
                        const updated = { ...selectedBox, assignedRoomId: rId || null };
                        sendWSMsg('update_box', updated);
                        setSelectedBox(updated);
                      }}
                      className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs focus:outline-none text-slate-700 font-semibold"
                    >
                      <option value="">Sin Estancia</option>
                      {household?.rooms.map((room) => (
                        <option key={room.id} value={room.id}>
                          📍 {room.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* QR and Metadata Info (Right side) */}
              <div className="md:w-1/2 p-6 flex flex-col justify-between gap-6">
                <button
                  onClick={() => setSelectedBox(null)}
                  className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-800 rounded-full transition hover:bg-slate-50 font-mono text-sm font-bold z-10"
                >
                  ✕
                </button>

                <div className="space-y-4">
                  {/* Fragilidad Quick Toggle */}
                  <div>
                    <h4 className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Fragilidad de la Caja</h4>
                    <div className="flex gap-2">
                      {(['bajo', 'medio', 'alto'] as Box['fragility'][]).map((f) => (
                        <button
                          key={f}
                          type="button"
                          disabled={!isWritable}
                          onClick={() => {
                            const updated = { ...selectedBox, fragility: f };
                            sendWSMsg('update_box', updated);
                            setSelectedBox(updated);
                          }}
                          className={`flex-1 py-1 px-2 rounded-lg text-[10px] font-extrabold border transition text-center capitalize ${
                            selectedBox.fragility === f
                              ? f === 'alto'
                                ? 'bg-red-50 border-red-200 text-red-700'
                                : f === 'medio'
                                ? 'bg-amber-50 border-amber-200 text-amber-700'
                                : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                              : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                          }`}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Inline list editor inside the scanner popup */}
                  <div>
                    <h4 className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Artículos Almacenados ({selectedBox.contents.length})</h4>
                    
                    {/* Add quick item */}
                    {isWritable && (
                      <div className="flex gap-1.5 mb-2">
                        <input
                          id="quick-item-input"
                          type="text"
                          placeholder="Añadir artículo rápido..."
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const inputEl = e.currentTarget;
                              const val = inputEl.value.trim();
                              if (val && !selectedBox.contents.includes(val)) {
                                const updated = { ...selectedBox, contents: [...selectedBox.contents, val] };
                                sendWSMsg('update_box', updated);
                                setSelectedBox(updated);
                                inputEl.value = '';
                              }
                            }
                          }}
                          className="flex-grow bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-[11px] focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const inputEl = document.getElementById('quick-item-input') as HTMLInputElement;
                            if (inputEl) {
                              const val = inputEl.value.trim();
                              if (val && !selectedBox.contents.includes(val)) {
                                const updated = { ...selectedBox, contents: [...selectedBox.contents, val] };
                                sendWSMsg('update_box', updated);
                                setSelectedBox(updated);
                                inputEl.value = '';
                              }
                            }
                          }}
                          className="bg-blue-600 text-white px-2.5 py-1 rounded-lg text-[11px] font-bold hover:bg-blue-700 transition"
                        >
                          +
                        </button>
                      </div>
                    )}

                    {selectedBox.contents.length === 0 ? (
                      <p className="text-xs text-slate-400 italic bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">No se agregaron artículos a esta caja.</p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
                        {selectedBox.contents.map((item, idx) => (
                          <span key={idx} className="bg-slate-50 text-slate-600 text-[10px] py-0.5 px-2 rounded-lg font-bold border border-slate-200/50 flex items-center gap-1 select-none">
                            {item}
                            {isWritable && (
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = {
                                    ...selectedBox,
                                    contents: selectedBox.contents.filter((_, i) => i !== idx)
                                  };
                                  sendWSMsg('update_box', updated);
                                  setSelectedBox(updated);
                                }}
                                className="text-slate-400 hover:text-red-600 font-mono text-[9px] pl-0.5"
                              >
                                ✕
                              </button>
                            )}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* QR Code generator */}
                  <div className="border-t border-slate-100 pt-4 flex items-center gap-4">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=https://movesync3d.com/box/${householdCode}/${selectedBox.id}`}
                      alt="Código QR de la Caja"
                      className="w-16 h-16 border border-slate-200 rounded-lg p-1 shrinkage-0"
                    />
                    <div className="space-y-1">
                      <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Código QR de la Caja</h5>
                      <p className="text-[9px] text-slate-400 max-w-[180px] leading-tight">
                        Escanea para ver e interactuar en tiempo real desde el móvil o tablet.
                      </p>
                      <button
                        onClick={() => {
                          const w = window.open();
                          if (w) {
                            w.document.write(`
                              <html>
                                <head><title>Imprimir QR - MoveSync 3D</title></head>
                                <body style="display:flex; flex-direction:column; align-items:center; justify-center:center; height:100vh; font-family:sans-serif; text-align:center;">
                                  <h2>MoveSync 3D - Etiqueta de Caja</h2>
                                  <h3>${selectedBox.name}</h3>
                                  <img src="https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=https://movesync3d.com/box/${householdCode}/${selectedBox.id}" style="border:1px solid #ccc; padding:10px; border-radius:10px;" />
                                  <p style="font-mono; font-size:14px; margin-top:20px;">Código de Casa: ${householdCode}</p>
                                  <p style="font-size:12px; color:#555;">Contenidos: ${selectedBox.contents.join(', ')}</p>
                                  <script>window.onload = function() { window.print(); }</script>
                                </body>
                              </html>
                            `);
                          }
                        }}
                        className="text-[9px] bg-slate-900 hover:bg-slate-800 text-white font-bold py-1 px-2.5 rounded-lg flex items-center gap-1"
                      >
                        <Printer size={9} />
                        Imprimir Etiqueta
                      </button>
                    </div>
                  </div>
                </div>

                {/* Edit & Delete Actions */}
                {isWritable && (
                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      onClick={() => {
                        startEditBox(selectedBox);
                        setSelectedBox(null);
                        setActiveTab('boxes'); // Switch tab to boxes
                      }}
                      className="text-xs text-blue-600 hover:text-blue-800 bg-blue-50 border border-blue-100 hover:bg-blue-100/50 py-2 px-3.5 rounded-xl font-bold transition flex items-center gap-1.5"
                    >
                      <Edit2 size={12} />
                      Editar Parámetros Completos
                    </button>
                    <button
                      onClick={() => {
                        handleDeleteBox(selectedBox.id);
                        setSelectedBox(null);
                      }}
                      className="text-xs text-red-600 hover:text-red-800 hover:bg-red-50/50 py-2 px-3.5 rounded-xl font-bold transition flex items-center gap-1.5"
                    >
                      <Trash2 size={12} />
                      Eliminar Caja
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ----------------- MODAL: PRINT SHEET VIEW ----------------- */}
      <AnimatePresence>
        {showPrintSheet && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl border border-slate-100 shadow-2xl max-w-4xl w-full max-h-[85vh] flex flex-col overflow-hidden relative"
            >
              {/* Modal header */}
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 select-none">
                <div>
                  <h3 className="font-black text-slate-800 text-md flex items-center gap-2">
                    <Printer size={18} className="text-indigo-600" />
                    Plancha de Etiquetas QR de Mudanza ({household?.boxes.length || 0})
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Previsualiza y manda a imprimir la hoja completa con códigos QR individuales para pegar en cada caja de cartón.
                  </p>
                </div>
                <div className="flex gap-2 items-center">
                  <button
                    onClick={() => {
                      const printWindow = window.open();
                      if (printWindow && household) {
                        const boxHtml = household.boxes.map((box) => `
                          <div style="border: 2px dashed #999; padding: 15px; border-radius: 12px; page-break-inside: avoid; display: flex; flex-direction: column; align-items: center; justify-content: center; width: 180px; height: 220px; box-sizing: border-box; background: white; text-align: center;">
                            <h4 style="font-family: sans-serif; margin: 0 0 5px 0; font-size: 13px; truncate; max-width: 170px;">${box.name}</h4>
                            <img src="https://api.qrserver.com/v1/create-qr-code/?size=110x110&data=https://movesync3d.com/box/${householdCode}/${box.id}" style="width:110px; height:110px;" />
                            <p style="font-family: monospace; font-size: 10px; margin: 5px 0 0 0; font-weight: bold; color: #444;">CASA: ${householdCode}</p>
                            <span style="font-family: sans-serif; font-size: 8px; color: #888; display: block; margin-top: 5px; truncate; width:160px;">${box.contents.slice(0, 3).join(', ')}</span>
                          </div>
                        `).join('');

                        printWindow.document.write(`
                          <html>
                            <head>
                              <title>Etiquetas QR - MoveSync 3D</title>
                              <style>
                                body { background: #f0f0f0; margin: 20px; font-family: sans-serif; }
                                .grid { display: grid; grid-template-columns: repeat(auto-fill, 180px); gap: 20px; justify-content: center; }
                                @media print {
                                  body { background: white; margin: 0; }
                                  .grid { display: grid; grid-template-columns: repeat(3, 180px); gap: 15px; }
                                }
                              </style>
                            </head>
                            <body>
                              <h2 style="text-align: center; margin-bottom: 25px;">Plancha de Etiquetas de Mudanza - MoveSync 3D</h2>
                              <div class="grid">
                                ${boxHtml}
                              </div>
                              <script>window.onload = function() { window.print(); }</script>
                            </body>
                          </html>
                        `);
                      }
                    }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2 px-4 rounded-xl transition flex items-center gap-1.5"
                  >
                    <Printer size={12} />
                    Imprimir Plancha
                  </button>
                  <button
                    onClick={() => setShowPrintSheet(false)}
                    className="p-1.5 text-slate-400 hover:text-slate-800 rounded-full transition hover:bg-slate-100 font-mono font-bold text-sm"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Grid content */}
              <div className="p-6 overflow-y-auto bg-slate-50 flex-1">
                {household?.boxes.length === 0 ? (
                  <div className="text-center py-20 text-slate-400">
                    No hay cajas creadas en el inventario para poder imprimir sus etiquetas.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 justify-items-center">
                    {household?.boxes.map((box) => (
                      <div
                        key={box.id}
                        className="bg-white border-2 border-dashed border-slate-200 hover:border-slate-300 p-4 rounded-2xl flex flex-col items-center justify-center text-center gap-2 w-44 aspect-[4/5] shadow-3xs"
                      >
                        <h4 className="font-extrabold text-slate-800 text-xs truncate max-w-[150px]">{box.name}</h4>
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=110x110&data=https://movesync3d.com/box/${householdCode}/${box.id}`}
                          alt="QR"
                          className="w-24 h-24 p-1 border border-slate-100 rounded-lg bg-slate-50"
                        />
                        <div>
                          <p className="text-[9px] font-mono font-bold text-indigo-600">CASA: {householdCode}</p>
                          <p className="text-[8px] text-slate-400 truncate max-w-[130px] mt-0.5">
                            {box.contents.slice(0, 2).join(', ')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
