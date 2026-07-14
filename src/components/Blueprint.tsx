/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Room, Box, Role, Task, TaskStatus } from '../types.js';
import {
  Plus,
  Trash2,
  Edit2,
  Home,
  Sofa,
  Utensils,
  BedDouble,
  HelpCircle,
  Package,
  Trees,
  MapPin,
  Camera,
  ChevronLeft,
  CheckCircle,
  Calendar,
  Layers,
  Sparkles,
  Info
} from 'lucide-react';
import { resizeImage } from '../App.js';

interface BlueprintProps {
  rooms: Room[];
  boxes: Box[];
  tasks: Task[];
  role: Role;
  onAddRoom: (room: Room) => void;
  onUpdateRoom: (room: Room) => void;
  onDeleteRoom: (roomId: string) => void;
  onUpdateBoxRoom: (boxId: string, roomId: string | null) => void;
  onAddBox: (box: Box) => void;
  onUpdateBox: (box: Box) => void;
  onDeleteBox: (boxId: string) => void;
  onAddTask: (task: Task) => void;
  onUpdateTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
}

const ROOM_TEMPLATES = [
  { value: 'cocina', label: 'Cocina', icon: Utensils, bg: 'bg-amber-50 border-amber-200 text-amber-700', hover: 'hover:bg-amber-100/50' },
  { value: 'salon', label: 'Salón', icon: Sofa, bg: 'bg-blue-50 border-blue-200 text-blue-700', hover: 'hover:bg-blue-100/50' },
  { value: 'dormitorio', label: 'Dormitorio', icon: BedDouble, bg: 'bg-emerald-50 border-emerald-200 text-emerald-700', hover: 'hover:bg-emerald-100/50' },
  { value: 'baño', label: 'Baño', icon: Home, bg: 'bg-sky-50 border-sky-200 text-sky-700', hover: 'hover:bg-sky-100/50' },
  { value: 'jardin', label: 'Jardín / Patio', icon: Trees, bg: 'bg-teal-50 border-teal-200 text-teal-700', hover: 'hover:bg-teal-100/50' },
  { value: 'estudio', label: 'Estudio / Oficina', icon: Home, bg: 'bg-purple-50 border-purple-200 text-purple-700', hover: 'hover:bg-purple-100/50' },
  { value: 'otro', label: 'Otro', icon: HelpCircle, bg: 'bg-slate-50 border-slate-200 text-slate-700', hover: 'hover:bg-slate-100/50' },
];

export default function Blueprint({
  rooms,
  boxes,
  tasks,
  role,
  onAddRoom,
  onUpdateRoom,
  onDeleteRoom,
  onUpdateBoxRoom,
  onAddBox,
  onUpdateBox,
  onDeleteBox,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
}: BlueprintProps) {
  const isWritable = role === 'Owner' || role === 'Editor';

  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [isAddingRoom, setIsAddingRoom] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);

  // Room Form State
  const [roomName, setRoomName] = useState('');
  const [roomTemplate, setRoomTemplate] = useState<Room['template']>('salon');
  const [roomImageUrl, setRoomImageUrl] = useState('');

  // Inline Box Creation form inside room
  const [isAddingBox, setIsAddingBox] = useState(false);
  const [boxFormName, setBoxFormName] = useState('');
  const [boxFormStatus, setBoxFormStatus] = useState<Box['status']>('embalado');
  const [boxFormFragility, setBoxFormFragility] = useState<Box['fragility']>('medio');
  const [boxFormContents, setBoxFormContents] = useState<string[]>([]);
  const [boxFormNewContentItem, setBoxFormNewContentItem] = useState('');
  const [boxFormColor, setBoxFormColor] = useState('#d97706');
  const [boxFormImageUrl, setBoxFormImageUrl] = useState('');

  // Inline Task Creation form inside room
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [taskFormTitle, setTaskFormTitle] = useState('');
  const [taskFormDesc, setTaskFormDesc] = useState('');
  const [taskFormDueDate, setTaskFormDueDate] = useState('');

  // Find selected room
  const activeRoom = rooms.find((r) => r.id === selectedRoomId);

  // Filtered lists for active room
  const roomBoxes = boxes.filter((b) => b.assignedRoomId === selectedRoomId);
  const roomTasks = tasks.filter((t) => t.linkedRoomId === selectedRoomId);

  // Handlers for Room creation/editing
  const handleRoomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isWritable) return;
    if (!roomName.trim()) return;

    if (editingRoom) {
      onUpdateRoom({
        ...editingRoom,
        name: roomName,
        template: roomTemplate,
        imageUrl: roomImageUrl || undefined,
      });
      setEditingRoom(null);
    } else {
      const newRoom: Room = {
        id: `room-${Date.now()}`,
        name: roomName,
        template: roomTemplate,
        x: 0,
        y: 0,
        imageUrl: roomImageUrl || undefined,
      };
      onAddRoom(newRoom);
      setIsAddingRoom(false);
    }

    // Reset Room Form
    setRoomName('');
    setRoomTemplate('salon');
    setRoomImageUrl('');
  };

  const startEditRoom = (room: Room, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isWritable) return;
    setEditingRoom(room);
    setRoomName(room.name);
    setRoomTemplate(room.template);
    setRoomImageUrl(room.imageUrl || '');
    setIsAddingRoom(true);
  };

  const handleDeleteRoomClick = (room: Room, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isWritable) return;
    if (confirm(`¿Estás seguro de que quieres eliminar la estancia "${room.name}"? Las cajas vinculadas quedarán sin ubicación.`)) {
      onDeleteRoom(room.id);
      if (selectedRoomId === room.id) {
        setSelectedRoomId(null);
      }
    }
  };

  // Inline Add Box inside entered room
  const handleAddBoxSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoomId || !boxFormName.trim()) return;

    const newBox: Box = {
      id: `box-${Date.now()}`,
      name: boxFormName,
      status: boxFormStatus,
      fragility: boxFormFragility,
      contents: boxFormContents,
      assignedRoomId: selectedRoomId,
      dimensions: {
        width: 40,
        height: 30,
        depth: 30,
        label: 'mediano',
      },
      color: boxFormColor,
      tapeType: 'regular',
      imageUrl: boxFormImageUrl || undefined,
    };

    onAddBox(newBox);

    // Reset Box Form
    setBoxFormName('');
    setBoxFormStatus('embalado');
    setBoxFormFragility('medio');
    setBoxFormContents([]);
    setBoxFormNewContentItem('');
    setBoxFormColor('#d97706');
    setBoxFormImageUrl('');
    setIsAddingBox(false);
  };

  const handleAddBoxContentItem = () => {
    if (boxFormNewContentItem.trim() && !boxFormContents.includes(boxFormNewContentItem.trim())) {
      setBoxFormContents([...boxFormContents, boxFormNewContentItem.trim()]);
      setBoxFormNewContentItem('');
    }
  };

  const handleRemoveBoxContentItem = (index: number) => {
    setBoxFormContents(boxFormContents.filter((_, i) => i !== index));
  };

  // Inline Add Task inside entered room
  const handleAddTaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoomId || !taskFormTitle.trim()) return;

    const newTask: Task = {
      id: `task-${Date.now()}`,
      title: taskFormTitle,
      description: taskFormDesc,
      status: 'por_hacer',
      assignedEmail: null,
      linkedBoxId: null,
      linkedRoomId: selectedRoomId,
      dueDate: taskFormDueDate || new Date().toISOString().split('T')[0],
    };

    onAddTask(newTask);

    // Reset Task Form
    setTaskFormTitle('');
    setTaskFormDesc('');
    setTaskFormDueDate('');
    setIsAddingTask(false);
  };

  const handleToggleTaskStatus = (task: Task) => {
    const nextStatus: TaskStatus = task.status === 'completado' ? 'por_hacer' : 'completado';
    onUpdateTask({
      ...task,
      status: nextStatus,
    });
  };

  return (
    <div className="space-y-6">
      {/* -------------------- VIEW 1: HOME ROOMS DASHBOARD -------------------- */}
      {!selectedRoomId ? (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
            <div>
              <h2 className="text-xl font-bold text-slate-800">Estancias de la Vivienda</h2>
              <p className="text-sm text-slate-500 mt-1">
                Visualiza las habitaciones de tu casa, entra en ellas para gestionar sus cajas asignadas, añade nuevas cajas directamente o supervisa tareas pendientes.
              </p>
            </div>
            {isWritable && (
              <button
                type="button"
                onClick={() => {
                  setEditingRoom(null);
                  setIsAddingRoom(!isAddingRoom);
                }}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2.5 rounded-xl transition duration-150 text-xs shadow-xs self-start md:self-auto"
              >
                <Plus size={16} />
                {isAddingRoom ? 'Ocultar Formulario' : 'Nueva Estancia'}
              </button>
            )}
          </div>

          {/* Room Form Drawer (Collapsible) */}
          {isAddingRoom && isWritable && (
            <form onSubmit={handleRoomSubmit} className="bg-white p-6 rounded-2xl border border-blue-100 shadow-xs space-y-4 animate-in slide-in-from-top-4 duration-200">
              <h3 className="font-bold text-slate-800 text-sm">
                {editingRoom ? `Editar Estancia: ${editingRoom.name}` : 'Añadir Nueva Habitación / Estancia'}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Nombre de la Habitación</label>
                  <input
                    type="text"
                    placeholder="Ej. Salón Principal, Cocina Americana"
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Categoría / Tipo</label>
                  <select
                    value={roomTemplate}
                    onChange={(e) => setRoomTemplate(e.target.value as Room['template'])}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none"
                  >
                    {ROOM_TEMPLATES.map((tmpl) => (
                      <option key={tmpl.value} value={tmpl.value}>
                        {tmpl.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Imagen o Foto (URL Opcional)</label>
                  <input
                    type="url"
                    placeholder="https://ejemplo.com/cocina.jpg"
                    value={roomImageUrl}
                    onChange={(e) => setRoomImageUrl(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Compression File Selector */}
              <div className="pt-2 border-t border-slate-100 flex items-center gap-4">
                <span className="text-[10px] font-bold text-slate-400 uppercase">O sube una imagen desde tu dispositivo:</span>
                <label className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer transition flex items-center gap-1">
                  <Camera size={12} />
                  Seleccionar Archivo
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        try {
                          const base64 = await resizeImage(file);
                          setRoomImageUrl(base64);
                        } catch (err) {
                          alert('Error al procesar la imagen.');
                        }
                      }
                    }}
                  />
                </label>
                {roomImageUrl && (
                  <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1 animate-pulse">
                    ✓ Imagen cargada con éxito
                  </span>
                )}
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingRoom(false);
                    setEditingRoom(null);
                    setRoomName('');
                    setRoomImageUrl('');
                  }}
                  className="bg-white hover:bg-slate-100 text-slate-700 font-bold py-2 px-4 rounded-xl border border-slate-200 text-xs transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-5 rounded-xl text-xs transition"
                >
                  {editingRoom ? 'Sincronizar Estancia' : 'Guardar Estancia'}
                </button>
              </div>
            </form>
          )}

          {/* Rooms Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rooms.map((room) => {
              const template = ROOM_TEMPLATES.find((t) => t.value === room.template) || ROOM_TEMPLATES[6];
              const Icon = template.icon;
              const assignedBoxes = boxes.filter((b) => b.assignedRoomId === room.id);
              const pendingTasks = tasks.filter((t) => t.linkedRoomId === room.id && t.status !== 'completado');

              return (
                <div
                  key={room.id}
                  onClick={() => setSelectedRoomId(room.id)}
                  className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-2xs hover:shadow-md hover:border-blue-300 transition-all duration-200 flex flex-col justify-between cursor-pointer group"
                >
                  {/* Banner Header (Image or Custom background) */}
                  {room.imageUrl ? (
                    <div className="h-40 w-full relative overflow-hidden bg-slate-100">
                      <img
                        src={room.imageUrl}
                        alt={room.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover transition duration-300 group-hover:scale-102"
                      />
                      <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-xs py-1 px-2.5 rounded-xl border border-slate-200/50 flex items-center gap-1.5 text-xs font-bold text-slate-800 shadow-sm">
                        <Icon size={14} className="text-blue-600 animate-pulse" />
                        {template.label}
                      </div>
                    </div>
                  ) : (
                    <div className={`h-24 ${template.bg} border-b border-slate-100 flex items-center p-4 relative`}>
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center border border-slate-200/50 shadow-3xs">
                          <Icon size={18} className="text-slate-700" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">{template.label}</span>
                      </div>
                    </div>
                  )}

                  {/* Body Info */}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div>
                      <div className="flex items-start justify-between">
                        <h4 className="font-extrabold text-slate-800 text-base leading-tight group-hover:text-blue-600 transition">
                          {room.name}
                        </h4>
                        {isWritable && (
                          <div className="opacity-0 group-hover:opacity-100 transition flex items-center gap-1 shrink-0 ml-2">
                            <button
                              type="button"
                              onClick={(e) => startEditRoom(room, e)}
                              className="p-1 hover:bg-slate-100 rounded text-slate-600 transition"
                              title="Editar"
                            >
                              <Edit2 size={12} />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleDeleteRoomClick(room, e)}
                              className="p-1 hover:bg-red-50 rounded text-red-600 transition"
                              title="Borrar"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                      <div className="bg-slate-50/50 p-2 rounded-xl text-center border border-slate-100">
                        <span className="block text-slate-400 text-[9px] font-bold uppercase tracking-wider">Cajas</span>
                        <span className="font-extrabold text-slate-800 text-sm mt-0.5 block">{assignedBoxes.length}</span>
                      </div>
                      <div className={`p-2 rounded-xl text-center border ${pendingTasks.length > 0 ? 'bg-amber-50/30 border-amber-100' : 'bg-slate-50/50 border-slate-100'}`}>
                        <span className="block text-slate-400 text-[9px] font-bold uppercase tracking-wider">Pendientes</span>
                        <span className={`font-extrabold text-sm mt-0.5 block ${pendingTasks.length > 0 ? 'text-amber-600' : 'text-slate-800'}`}>
                          {pendingTasks.length}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="w-full bg-slate-50 hover:bg-blue-50 hover:text-blue-700 text-slate-600 font-bold py-2 rounded-xl text-xs border border-slate-200/60 transition flex items-center justify-center gap-1"
                    >
                      Entrar en la Estancia →
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Empty rooms state */}
            {rooms.length === 0 && (
              <div className="col-span-full bg-white p-16 text-center rounded-2xl border border-slate-200 flex flex-col items-center justify-center space-y-3">
                <div className="w-14 h-14 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 shadow-3xs">
                  <Home size={28} />
                </div>
                <h4 className="font-extrabold text-slate-800 text-base">No has creado estancias todavía</h4>
                <p className="text-xs text-slate-500 max-w-sm">
                  Añade estancias de tu casa (Salón, Cocina, Dormitorio...) para estructurar tu mudanza y empaquetar por habitaciones cómodamente.
                </p>
                {isWritable && (
                  <button
                    type="button"
                    onClick={() => setIsAddingRoom(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-5 rounded-xl text-xs transition shadow-xs"
                  >
                    Añadir Primera Estancia
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* -------------------- VIEW 2: SINGLE ROOM DETAIL VIEW ("ENTRAR") -------------------- */
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Detailed Room Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setSelectedRoomId(null)}
                className="bg-slate-50 hover:bg-slate-100 p-2.5 rounded-xl border border-slate-200 text-slate-600 transition"
                title="Volver"
              >
                <ChevronLeft size={16} />
              </button>

              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                    {ROOM_TEMPLATES.find((t) => t.value === activeRoom?.template)?.label || 'Estancia'}
                  </span>
                  <span className="text-xs text-slate-400 font-semibold">•</span>
                  <span className="text-xs text-slate-500 font-medium">{roomBoxes.length} cajas en total</span>
                </div>
                <h2 className="text-2xl font-black text-slate-800">{activeRoom?.name}</h2>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSelectedRoomId(null)}
                className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold text-xs px-4 py-2.5 rounded-xl transition"
              >
                Volver a Estancias
              </button>
            </div>
          </div>

          {/* Core side-by-side room management columns */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* LEFT COLUMN: BOXES ASSIGNED TO THIS ROOM */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                  <Package size={18} className="text-amber-600" />
                  Cajas en esta Habitación ({roomBoxes.length})
                </h3>
                {isWritable && (
                  <button
                    type="button"
                    onClick={() => setIsAddingBox(!isAddingBox)}
                    className="text-xs bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold px-3 py-1.5 rounded-lg border border-amber-200/50 transition flex items-center gap-1"
                  >
                    <Plus size={14} />
                    {isAddingBox ? 'Ocultar' : 'Crear Caja Aquí'}
                  </button>
                )}
              </div>

              {/* Collapsible inline form for creating a Box directly in this Room */}
              {isAddingBox && isWritable && (
                <form onSubmit={handleAddBoxSubmit} className="bg-slate-50 p-4 rounded-xl border border-amber-200/60 space-y-4 animate-in slide-in-from-top-2 duration-150">
                  <h4 className="font-bold text-amber-800 text-xs">Nueva Caja para {activeRoom?.name}</h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Nombre / Identificador</label>
                      <input
                        type="text"
                        placeholder="Ej. Vasos de cristal, Libros cocina"
                        value={boxFormName}
                        onChange={(e) => setBoxFormName(e.target.value)}
                        required
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Estado inicial</label>
                      <select
                        value={boxFormStatus}
                        onChange={(e) => setBoxFormStatus(e.target.value as Box['status'])}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
                      >
                        <option value="embalado">Embalado</option>
                        <option value="en_transito">En Tránsito</option>
                        <option value="desembalado">Desembalado</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Fragilidad</label>
                      <select
                        value={boxFormFragility}
                        onChange={(e) => setBoxFormFragility(e.target.value as Box['fragility'])}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
                      >
                        <option value="bajo">Bajo (Normal)</option>
                        <option value="medio">Medio</option>
                        <option value="alto">Alto (¡Frágil!)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Color de caja</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={boxFormColor}
                          onChange={(e) => setBoxFormColor(e.target.value)}
                          className="w-7 h-7 rounded border border-slate-200 cursor-pointer bg-transparent shrink-0"
                        />
                        <input
                          type="text"
                          value={boxFormColor}
                          onChange={(e) => setBoxFormColor(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-[10px] font-mono text-center"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Foto (URL Opcional)</label>
                      <input
                        type="url"
                        placeholder="https://ejemplo.com/caja.jpg"
                        value={boxFormImageUrl}
                        onChange={(e) => setBoxFormImageUrl(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Add Content tags inside inline form */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">Artículos de Contenido</label>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        placeholder="Ej. Taza, Plato, Cuchara"
                        value={boxFormNewContentItem}
                        onChange={(e) => setBoxFormNewContentItem(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddBoxContentItem(); } }}
                        className="flex-grow bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleAddBoxContentItem}
                        className="bg-amber-600 hover:bg-amber-700 text-white px-3 rounded-lg text-xs font-bold transition"
                      >
                        Añadir
                      </button>
                    </div>
                    {boxFormContents.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {boxFormContents.map((tag, i) => (
                          <span key={i} className="bg-white border border-slate-200 text-slate-600 text-[9px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                            {tag}
                            <button type="button" onClick={() => handleRemoveBoxContentItem(i)} className="text-slate-400 hover:text-red-500 font-mono text-xs">✕</button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => setIsAddingBox(false)}
                      className="bg-white hover:bg-slate-100 text-slate-700 text-xs py-1.5 px-3 rounded-lg border border-slate-200 transition"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs py-1.5 px-3.5 rounded-lg transition"
                    >
                      Crear Caja
                    </button>
                  </div>
                </form>
              )}

              {/* List of boxes inside room */}
              <div className="space-y-2 max-h-[450px] overflow-y-auto pr-1">
                {roomBoxes.length === 0 ? (
                  <div className="text-center py-12 bg-slate-50/50 rounded-xl border border-dashed border-slate-200 flex flex-col items-center gap-2 text-slate-400">
                    <Package size={24} className="text-slate-300" />
                    <p className="text-xs">No hay cajas asignadas a esta estancia.</p>
                    <p className="text-[10px] text-slate-500">Empieza creando una caja arriba o mueve alguna de tus cajas existentes a esta estancia.</p>
                  </div>
                ) : (
                  roomBoxes.map((box) => (
                    <div
                      key={box.id}
                      className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 hover:border-blue-200 transition"
                    >
                      <div className="flex items-center gap-3 truncate">
                        <div
                          className="w-10 h-10 rounded-xl border shrink-0 flex items-center justify-center relative overflow-hidden text-white"
                          style={{ backgroundColor: box.color }}
                        >
                          {box.imageUrl ? (
                            <img src={box.imageUrl} alt={box.name} className="w-full h-full object-cover" />
                          ) : (
                            <Package size={18} className="drop-shadow-xs" />
                          )}
                        </div>

                        <div className="truncate">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-xs text-slate-800 truncate block">{box.name}</span>
                            {box.fragility === 'alto' && (
                              <span className="bg-red-50 border border-red-100 text-red-600 text-[8px] font-black px-1.5 py-0.25 rounded-md uppercase tracking-wider">
                                Frágil
                              </span>
                            )}
                          </div>
                          {box.contents.length > 0 ? (
                            <p className="text-[10px] text-slate-500 truncate max-w-xs mt-0.5 font-medium">
                              {box.contents.join(', ')}
                            </p>
                          ) : (
                            <p className="text-[9px] text-slate-400 italic mt-0.5">Sin contenidos declarados</p>
                          )}
                        </div>
                      </div>

                      {/* Controls and Actions */}
                      <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto shrink-0 pt-2 sm:pt-0 border-t sm:border-0 border-slate-100 justify-end">
                        {/* Status dropdown */}
                        <select
                          value={box.status}
                          onChange={(e) => {
                            onUpdateBox({
                              ...box,
                              status: e.target.value as Box['status'],
                            });
                          }}
                          className="bg-white border border-slate-200 text-[10px] font-bold text-slate-700 rounded-lg px-1.5 py-1 focus:outline-none"
                        >
                          <option value="embalado">Embalado</option>
                          <option value="en_transito">En Tránsito</option>
                          <option value="desembalado">Desembalado</option>
                        </select>

                        {/* Quick move to another room dropdown */}
                        <select
                          value={box.assignedRoomId || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            onUpdateBoxRoom(box.id, val || null);
                          }}
                          className="bg-white border border-slate-200 text-[10px] font-bold text-slate-500 rounded-lg px-1.5 py-1 focus:outline-none max-w-[110px]"
                        >
                          <option value="">Desasignar</option>
                          {rooms.map((rm) => (
                            <option key={rm.id} value={rm.id}>
                              📍 {rm.name}
                            </option>
                          ))}
                        </select>

                        {isWritable && (
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm('¿Estás seguro de que deseas eliminar esta caja?')) {
                                onDeleteBox(box.id);
                              }
                            }}
                            className="p-1 text-slate-400 hover:text-red-500 transition"
                            title="Eliminar caja"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* RIGHT COLUMN: TASKS LINKED TO THIS ROOM */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                  <Layers size={18} className="text-blue-600" />
                  Tareas de la Estancia ({roomTasks.length})
                </h3>
                {isWritable && (
                  <button
                    type="button"
                    onClick={() => setIsAddingTask(!isAddingTask)}
                    className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold px-3 py-1.5 rounded-lg border border-blue-200/50 transition flex items-center gap-1"
                  >
                    <Plus size={14} />
                    {isAddingTask ? 'Ocultar' : 'Crear Tarea'}
                  </button>
                )}
              </div>

              {/* Collapsible inline form for creating a Task directly in this Room */}
              {isAddingTask && isWritable && (
                <form onSubmit={handleAddTaskSubmit} className="bg-slate-50 p-4 rounded-xl border border-blue-200/50 space-y-3.5 animate-in slide-in-from-top-2 duration-150">
                  <h4 className="font-bold text-blue-800 text-xs">Nueva Tarea para {activeRoom?.name}</h4>

                  <div className="space-y-2">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Título de la Tarea</label>
                      <input
                        type="text"
                        placeholder="Ej. Limpiar armarios, Instalar electrodomésticos"
                        value={taskFormTitle}
                        onChange={(e) => setTaskFormTitle(e.target.value)}
                        required
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Descripción</label>
                      <textarea
                        placeholder="Detalles sobre lo que se debe hacer..."
                        value={taskFormDesc}
                        onChange={(e) => setTaskFormDesc(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-blue-500 h-16"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Fecha de vencimiento</label>
                      <input
                        type="date"
                        value={taskFormDueDate}
                        onChange={(e) => setTaskFormDueDate(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => setIsAddingTask(false)}
                      className="bg-white hover:bg-slate-100 text-slate-700 text-xs py-1.5 px-3 rounded-lg border border-slate-200 transition"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-1.5 px-3.5 rounded-lg transition"
                    >
                      Añadir Tarea
                    </button>
                  </div>
                </form>
              )}

              {/* List of room tasks */}
              <div className="space-y-2 max-h-[450px] overflow-y-auto pr-1">
                {roomTasks.length === 0 ? (
                  <div className="text-center py-12 bg-slate-50/50 rounded-xl border border-dashed border-slate-200 flex flex-col items-center gap-2 text-slate-400">
                    <CheckCircle size={24} className="text-slate-300" />
                    <p className="text-xs">No hay tareas pendientes en esta estancia.</p>
                    <p className="text-[10px] text-slate-500">Crea una tarea para organizar la limpieza o el desembalaje de esta habitación.</p>
                  </div>
                ) : (
                  roomTasks.map((task) => (
                    <div
                      key={task.id}
                      onClick={() => handleToggleTaskStatus(task)}
                      className={`p-3.5 rounded-xl border transition flex items-start gap-3 cursor-pointer ${
                        task.status === 'completado'
                          ? 'bg-slate-50/60 border-slate-200/50 text-slate-400 line-through'
                          : 'bg-white border-slate-100 hover:border-blue-200 text-slate-800'
                      }`}
                    >
                      {/* Interactive checkbox */}
                      <div className="pt-0.5 shrink-0">
                        <div className={`w-4.5 h-4.5 rounded-md border flex items-center justify-center transition-colors ${
                          task.status === 'completado' ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 bg-white'
                        }`}>
                          {task.status === 'completado' && <span className="text-[9px] font-black">✓</span>}
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <span className="font-extrabold text-xs block truncate leading-tight">{task.title}</span>
                        {task.description && (
                          <p className={`text-[10px] mt-1 line-clamp-2 ${task.status === 'completado' ? 'text-slate-400' : 'text-slate-500'}`}>
                            {task.description}
                          </p>
                        )}
                        <div className="flex items-center gap-1.5 mt-2 text-[9px] font-bold text-slate-400">
                          <Calendar size={10} />
                          <span>Vence el {task.dueDate}</span>
                        </div>
                      </div>

                      {isWritable && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm('¿Estás seguro de que deseas eliminar esta tarea?')) {
                              onDeleteTask(task.id);
                            }
                          }}
                          className="text-slate-300 hover:text-red-500 p-1 rounded transition self-center shrink-0"
                          title="Eliminar tarea"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
