/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Task, Box, Room, Member, Role } from '../types.js';
import { Calendar, Layers, Clock, Plus, Trash2, Edit2, CheckCircle2, User, Link, MapPin, Package, ChevronLeft, ChevronRight } from 'lucide-react';

interface KanbanCalendarProps {
  tasks: Task[];
  boxes: Box[];
  rooms: Room[];
  members: Member[];
  role: Role;
  onAddTask: (task: Task) => void;
  onUpdateTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
}

const STATUS_COLUMNS = [
  { id: 'por_hacer', title: 'Por Hacer', bg: 'bg-slate-50', border: 'border-slate-200/60', text: 'text-slate-700' },
  { id: 'en_proceso', title: 'En Proceso', bg: 'bg-blue-50/40', border: 'border-blue-100', text: 'text-blue-800' },
  { id: 'completado', title: 'Completado', bg: 'bg-emerald-50/40', border: 'border-emerald-100', text: 'text-emerald-800' },
];

export default function KanbanCalendar({
  tasks,
  boxes,
  rooms,
  members,
  role,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
}: KanbanCalendarProps) {
  const isWritable = role === 'Owner' || role === 'Editor';

  const [activeTab, setActiveTab] = useState<'kanban' | 'calendar'>('kanban');
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Form Task State
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskStatus, setTaskStatus] = useState<Task['status']>('por_hacer');
  const [taskAssignedEmail, setTaskAssignedEmail] = useState<string>('');
  const [taskBoxId, setTaskBoxId] = useState<string>('');
  const [taskRoomId, setTaskRoomId] = useState<string>('');
  const [taskDueDate, setTaskDueDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Calendar State
  const [currentDate, setCurrentDate] = useState(new Date(2026, 6, 14)); // July 14, 2026 (matching metadata time)

  const handleTaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isWritable) return;
    if (!taskTitle.trim()) return;

    if (editingTask) {
      onUpdateTask({
        ...editingTask,
        title: taskTitle,
        description: taskDesc,
        status: taskStatus,
        assignedEmail: taskAssignedEmail || null,
        linkedBoxId: taskBoxId || null,
        linkedRoomId: taskRoomId || null,
        dueDate: taskDueDate,
      });
      setEditingTask(null);
    } else {
      const newTask: Task = {
        id: `task-${Date.now()}`,
        title: taskTitle,
        description: taskDesc,
        status: taskStatus,
        assignedEmail: taskAssignedEmail || null,
        linkedBoxId: taskBoxId || null,
        linkedRoomId: taskRoomId || null,
        dueDate: taskDueDate,
      };
      onAddTask(newTask);
      setIsAddingTask(false);
    }

    // Reset Form
    setTaskTitle('');
    setTaskDesc('');
    setTaskStatus('por_hacer');
    setTaskAssignedEmail('');
    setTaskBoxId('');
    setTaskRoomId('');
    setTaskDueDate(new Date().toISOString().split('T')[0]);
  };

  const startEdit = (task: Task) => {
    if (!isWritable) return;
    setEditingTask(task);
    setTaskTitle(task.title);
    setTaskDesc(task.description);
    setTaskStatus(task.status);
    setTaskAssignedEmail(task.assignedEmail || '');
    setTaskBoxId(task.linkedBoxId || '');
    setTaskRoomId(task.linkedRoomId || '');
    setTaskDueDate(task.dueDate);
    setIsAddingTask(true);
  };

  const handleMoveStatus = (task: Task, newStatus: Task['status']) => {
    if (!isWritable) return;
    onUpdateTask({ ...task, status: newStatus });
  };

  // Calendar calculations
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Days in month
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  // Index of first day of the month (0 = Sun, 1 = Mon...)
  // Adjust to start with Monday (0 = Monday, ..., 6 = Sunday)
  let firstDayIndex = new Date(year, month, 1).getDay();
  firstDayIndex = firstDayIndex === 0 ? 6 : firstDayIndex - 1;

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  return (
    <div className="space-y-6">
      {/* Header section with view toggle */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Planificador y Tareas Colaborativas</h2>
          <p className="text-sm text-slate-500 mt-1">
            Gestiona las tareas de la mudanza organizadas por columnas de progreso y asócialas a cajas o estancias específicas.
          </p>
        </div>

        {/* View toggles */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl self-start md:self-auto">
          <button
            onClick={() => { setActiveTab('kanban'); setIsAddingTask(false); }}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition duration-150 ${
              activeTab === 'kanban'
                ? 'bg-white text-slate-800 shadow-2xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Layers size={14} />
            Tablero Kanban
          </button>
          <button
            onClick={() => { setActiveTab('calendar'); setIsAddingTask(false); }}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition duration-150 ${
              activeTab === 'calendar'
                ? 'bg-white text-slate-800 shadow-2xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Calendar size={14} />
            Calendario
          </button>
        </div>
      </div>

      {/* Trigger create task */}
      {isWritable && !isAddingTask && (
        <button
          onClick={() => {
            setEditingTask(null);
            setIsAddingTask(true);
          }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 py-3 rounded-xl transition shadow-sm text-sm"
        >
          <Plus size={18} />
          Nueva Tarea de Mudanza
        </button>
      )}

      {/* Create / Edit Task Form */}
      {isAddingTask && (
        <form onSubmit={handleTaskSubmit} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 animate-in fade-in slide-in-from-top-4 duration-200">
          <h3 className="font-bold text-slate-800 text-md">
            {editingTask ? `Editar Tarea: ${editingTask.title}` : 'Nueva Tarea de la Mudanza'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Título de la Tarea</label>
                <input
                  type="text"
                  placeholder="Ej. Comprar cinta adhesiva, Desarmar armario"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Descripción / Notas</label>
                <textarea
                  placeholder="Instrucciones específicas..."
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Fecha Límite</label>
                  <input
                    type="date"
                    value={taskDueDate}
                    onChange={(e) => setTaskDueDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Estado Inicial</label>
                  <select
                    value={taskStatus}
                    onChange={(e) => setTaskStatus(e.target.value as Task['status'])}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:bg-white"
                  >
                    <option value="por_hacer">Por Hacer</option>
                    <option value="en_proceso">En Proceso</option>
                    <option value="completado">Completado</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Asignar Colaborador</label>
                <select
                  value={taskAssignedEmail}
                  onChange={(e) => setTaskAssignedEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none"
                >
                  <option value="">Sin asignar (Global)</option>
                  {members.map((member) => (
                    <option key={member.email} value={member.email}>{member.name} ({member.email})</option>
                  ))}
                </select>
              </div>

              {/* Relational connections */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Vincular a Caja del Inventario</label>
                <select
                  value={taskBoxId}
                  onChange={(e) => setTaskBoxId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none"
                >
                  <option value="">Ninguna caja</option>
                  {boxes.map((box) => (
                    <option key={box.id} value={box.id}>📦 {box.name} ({box.dimensions.label})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Vincular a Estancia (Habitación)</label>
                <select
                  value={taskRoomId}
                  onChange={(e) => setTaskRoomId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none"
                >
                  <option value="">Ninguna estancia</option>
                  {rooms.map((room) => (
                    <option key={room.id} value={room.id}>📍 {room.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <button
              type="button"
              onClick={() => {
                setIsAddingTask(false);
                setEditingTask(null);
              }}
              className="bg-white hover:bg-slate-100 text-slate-700 font-medium px-4 py-2 rounded-xl border border-slate-200 text-sm transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 py-2 rounded-xl text-sm shadow-xs transition"
            >
              {editingTask ? 'Guardar Cambios' : 'Añadir Tarea'}
            </button>
          </div>
        </form>
      )}

      {/* Active Tab View */}
      {activeTab === 'kanban' ? (
        /* KANBAN BOARD */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {STATUS_COLUMNS.map((col) => {
            const colTasks = tasks.filter((t) => t.status === col.id);

            return (
              <div key={col.id} className={`p-4 rounded-2xl border ${col.border} ${col.bg} flex flex-col h-[520px]`}>
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100/60 shrink-0">
                  <h3 className={`font-bold text-sm ${col.text}`}>{col.title}</h3>
                  <span className="text-xs bg-white text-slate-600 py-0.5 px-2.5 rounded-full font-bold shadow-2xs border border-slate-100/30">
                    {colTasks.length}
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                  {colTasks.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 text-xs flex flex-col items-center gap-2">
                      <Layers size={20} className="text-slate-300" />
                      Sin tareas en este estado
                    </div>
                  ) : (
                    colTasks.map((task) => {
                      const assignedMember = members.find((m) => m.email === task.assignedEmail);
                      const linkedBox = boxes.find((b) => b.id === task.linkedBoxId);
                      const linkedRoom = rooms.find((r) => r.id === task.linkedRoomId);

                      return (
                        <div key={task.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:shadow-sm transition space-y-3 relative group">
                          {/* Title and Actions */}
                          <div>
                            <div className="flex items-start justify-between gap-1">
                              <h4 className="font-bold text-slate-800 text-sm group-hover:text-blue-600 transition leading-snug">
                                {task.title}
                              </h4>
                              {isWritable && (
                                <div className="opacity-0 group-hover:opacity-100 transition flex items-center gap-1 shrink-0">
                                  <button
                                    onClick={() => startEdit(task)}
                                    className="p-1 hover:bg-slate-100 rounded text-slate-600"
                                    title="Editar"
                                  >
                                    <Edit2 size={11} />
                                  </button>
                                  <button
                                    onClick={() => onDeleteTask(task.id)}
                                    className="p-1 hover:bg-red-50 rounded text-red-600"
                                    title="Eliminar"
                                  >
                                    <Trash2 size={11} />
                                  </button>
                                </div>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                              {task.description || 'Sin descripción.'}
                            </p>
                          </div>

                          {/* Linked Relations display */}
                          {(linkedBox || linkedRoom) && (
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {linkedBox && (
                                <span className="bg-amber-50 text-amber-800 border border-amber-100 text-[10px] py-0.5 px-2 rounded-md font-medium flex items-center gap-1">
                                  <Package size={10} className="text-amber-600" />
                                  {linkedBox.name.substring(0, 16)}
                                </span>
                              )}
                              {linkedRoom && (
                                <span className="bg-blue-50 text-blue-800 border border-blue-100 text-[10px] py-0.5 px-2 rounded-md font-medium flex items-center gap-1">
                                  <MapPin size={10} className="text-blue-600" />
                                  {linkedRoom.name}
                                </span>
                              )}
                            </div>
                          )}

                          {/* Footer with Collaborator, Due Date and Move Buttons */}
                          <div className="pt-2 border-t border-slate-50 flex items-center justify-between gap-2 text-[10px]">
                            {/* Collaborator */}
                            <div className="flex items-center gap-1.5 min-w-0">
                              {assignedMember ? (
                                <>
                                  <img src={assignedMember.avatar} alt="Avatar" className="w-4 h-4 rounded-full border border-slate-100 bg-slate-50 shrink-0" />
                                  <span className="text-slate-600 truncate font-medium">{assignedMember.name}</span>
                                </>
                              ) : (
                                <>
                                  <User size={12} className="text-slate-400 shrink-0" />
                                  <span className="text-slate-400 font-medium">Global</span>
                                </>
                              )}
                            </div>

                            {/* Due date */}
                            <div className="flex items-center gap-1 text-slate-500 font-medium shrink-0">
                              <Clock size={11} />
                              <span>{task.dueDate}</span>
                            </div>
                          </div>

                          {/* Quick movement buttons for UX */}
                          {isWritable && (
                            <div className="flex gap-1 justify-end pt-1">
                              {task.status !== 'por_hacer' && (
                                <button
                                  onClick={() => handleMoveStatus(task, task.status === 'completado' ? 'en_proceso' : 'por_hacer')}
                                  className="text-[9px] bg-slate-100 hover:bg-slate-200 font-medium px-2 py-0.5 rounded transition text-slate-600"
                                >
                                  ← Atrás
                                </button>
                              )}
                              {task.status !== 'completado' && (
                                <button
                                  onClick={() => handleMoveStatus(task, task.status === 'por_hacer' ? 'en_proceso' : 'completado')}
                                  className="text-[9px] bg-blue-600 hover:bg-blue-700 font-medium px-2 py-0.5 rounded text-white transition"
                                >
                                  Avanzar →
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* CALENDAR VIEW */
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <Calendar size={18} className="text-blue-600" />
              Calendario de Tareas ({monthNames[month]} {year})
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevMonth}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 border border-slate-200 transition"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={handleNextMonth}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 border border-slate-200 transition"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider pb-2 border-b border-slate-100">
            <div>Lun</div>
            <div>Mar</div>
            <div>Mié</div>
            <div>Jue</div>
            <div>Vie</div>
            <div>Sáb</div>
            <div>Dom</div>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {/* Pad with empty days */}
            {Array.from({ length: firstDayIndex }).map((_, i) => (
              <div key={`empty-cal-${i}`} className="h-24 bg-slate-50/50 rounded-lg border border-dashed border-slate-100" />
            ))}

            {/* Days of the month */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const formattedDateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const dayTasks = tasks.filter((t) => t.dueDate === formattedDateString);

              const isToday = day === 14 && month === 6 && year === 2026; // Highlighting July 14, 2026

              return (
                <div
                  key={`day-${day}`}
                  onClick={() => {
                    if (isWritable) {
                      setTaskDueDate(formattedDateString);
                      setEditingTask(null);
                      setIsAddingTask(true);
                    }
                  }}
                  className={`h-28 p-1.5 border rounded-xl flex flex-col justify-between text-left transition cursor-pointer hover:bg-blue-50/20 ${
                    isToday
                      ? 'bg-blue-50/50 border-blue-300 ring-2 ring-blue-100'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="flex justify-between items-center shrink-0">
                    <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full ${
                      isToday ? 'bg-blue-600 text-white' : 'text-slate-600'
                    }`}>
                      {day}
                    </span>
                    {dayTasks.length > 0 && (
                      <span className="text-[9px] bg-blue-100 text-blue-800 font-bold px-1 rounded-md">
                        {dayTasks.length}
                      </span>
                    )}
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-1 mt-1 pr-0.5 max-h-[72px]">
                    {dayTasks.map((task) => (
                      <div
                        key={task.id}
                        onClick={(e) => {
                          e.stopPropagation(); // Avoid triggering day addition
                          startEdit(task);
                        }}
                        className={`text-[8px] font-semibold px-1 py-0.5 rounded truncate ${
                          task.status === 'completado'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-100'
                            : task.status === 'en_proceso'
                            ? 'bg-blue-50 text-blue-800 border border-blue-100'
                            : 'bg-slate-100 text-slate-800 border border-slate-200'
                        }`}
                        title={task.title}
                      >
                        {task.title}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
