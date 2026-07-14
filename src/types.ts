/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Role = 'Owner' | 'Editor' | 'Viewer';

export interface Member {
  email: string;
  name: string;
  avatar: string;
  role: Role;
}

export interface Room {
  id: string;
  name: string;
  template: 'cocina' | 'dormitorio' | 'baño' | 'salon' | 'jardin' | 'estudio' | 'otro';
  x: number; // grid position x
  y: number; // grid position y
  imageUrl?: string; // Optional room image
}

export type BoxStatus = 'embalado' | 'en_transito' | 'desembalado';
export type FragilityLevel = 'bajo' | 'medio' | 'alto';
export type TapeType = 'regular' | 'fragil' | 'eco';

export interface BoxDimensions {
  width: number;  // cm
  height: number; // cm
  depth: number;  // cm
  label: 'pequeño' | 'mediano' | 'grande' | 'personalizado';
}

export interface Box {
  id: string;
  name: string;
  status: BoxStatus;
  fragility: FragilityLevel;
  contents: string[];
  assignedRoomId: string | null;
  dimensions: BoxDimensions;
  color: string;
  tapeType: TapeType;
  imageUrl?: string; // Optional box image
}

export type TaskStatus = 'por_hacer' | 'en_proceso' | 'completado';

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  assignedEmail: string | null;
  linkedBoxId: string | null;
  linkedRoomId: string | null;
  dueDate: string;
}

export interface Household {
  code: string;
  name: string;
  passwordHash: string; // Basic password verification
  members: Member[];
  rooms: Room[];
  boxes: Box[];
  tasks: Task[];
}

// WS messages protocol
export type WSMessageType =
  | 'join'
  | 'init'
  | 'error'
  | 'sync'
  | 'add_room' | 'update_room' | 'delete_room'
  | 'add_box' | 'update_box' | 'delete_box'
  | 'add_task' | 'update_task' | 'delete_task'
  | 'update_role' | 'kick_member';

export interface WSMessage {
  type: WSMessageType;
  householdCode?: string;
  email?: string;
  name?: string;
  payload?: any;
}
