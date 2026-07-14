/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Member, Role } from '../types.js';
import { Users, Shield, Award, Eye, UserMinus, Key, Mail, Check } from 'lucide-react';

interface MembersListProps {
  members: Member[];
  currentUserEmail: string;
  role: Role;
  householdCode: string;
  onUpdateRole: (targetEmail: string, newRole: Role) => void;
  onKickMember: (targetEmail: string) => void;
}

export default function MembersList({
  members,
  currentUserEmail,
  role,
  householdCode,
  onUpdateRole,
  onKickMember,
}: MembersListProps) {
  const isOwner = role === 'Owner';

  const getRoleIcon = (memberRole: Role) => {
    switch (memberRole) {
      case 'Owner': return <Award size={14} className="text-amber-500" />;
      case 'Editor': return <Shield size={14} className="text-indigo-500" />;
      case 'Viewer': return <Eye size={14} className="text-slate-400" />;
    }
  };

  const getRoleLabel = (memberRole: Role) => {
    switch (memberRole) {
      case 'Owner': return 'Propietario';
      case 'Editor': return 'Editor';
      case 'Viewer': return 'Lector (Solo Ver)';
    }
  };

  const getRoleBg = (memberRole: Role) => {
    switch (memberRole) {
      case 'Owner': return 'bg-amber-50 text-amber-800 border-amber-100';
      case 'Editor': return 'bg-blue-50 text-blue-800 border-blue-100';
      case 'Viewer': return 'bg-slate-50 text-slate-800 border-slate-200';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header card with house credentials */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Users size={22} className="text-blue-600 animate-pulse" />
            Colaboradores de la Unidad Doméstica
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Gestiona los miembros que tienen acceso a esta mudanza y sus permisos en tiempo real.
          </p>
        </div>

        {/* Credentials badge */}
        <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl flex flex-col gap-1">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Código de Invitación</div>
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-lg text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded border border-blue-100 select-all">
              {householdCode}
            </span>
            <button
              onClick={() => {
                navigator.clipboard.writeText(householdCode);
                alert('¡Código de casa copiado al portapapeles!');
              }}
              className="text-xs bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 py-1 px-2.5 rounded-lg font-medium transition"
            >
              Copiar
            </button>
          </div>
        </div>
      </div>

      {/* Grid of members */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {members.map((member) => {
          const isSelf = member.email === currentUserEmail;

          return (
            <div
              key={member.email}
              className={`bg-white p-5 rounded-2xl border transition flex flex-col justify-between gap-4 relative overflow-hidden ${
                isSelf ? 'border-blue-200 shadow-sm ring-2 ring-blue-50' : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              {/* Top info row */}
              <div className="flex items-start gap-4">
                <img
                  src={member.avatar}
                  alt={member.name}
                  className="w-12 h-12 rounded-xl border border-slate-100 bg-slate-50 object-cover"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800 truncate block">{member.name}</span>
                    {isSelf && (
                      <span className="bg-blue-600 text-white text-[9px] font-bold px-1.5 py-0.25 rounded-sm uppercase tracking-wider">
                        Tú
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                    <Mail size={12} />
                    {member.email}
                  </span>
                </div>
              </div>

              {/* Middle row: Role Badge & selector */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-50">
                <div className="flex items-center gap-1.5">
                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1 ${getRoleBg(member.role)}`}>
                    {getRoleIcon(member.role)}
                    {getRoleLabel(member.role)}
                  </span>
                </div>

                {/* Role Changer for owner */}
                {isOwner && !isSelf && (
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">Permiso:</span>
                    <select
                      value={member.role}
                      onChange={(e) => onUpdateRole(member.email, e.target.value as Role)}
                      className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:border-blue-500 font-medium text-slate-700 cursor-pointer"
                    >
                      <option value="Viewer">Lector</option>
                      <option value="Editor">Editor</option>
                      <option value="Owner">Propietario</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Kick button */}
              {isOwner && !isSelf && (
                <button
                  onClick={() => {
                    if (confirm(`¿Estás seguro de que quieres expulsar a ${member.name}?`)) {
                      onKickMember(member.email);
                    }
                  }}
                  className="absolute top-4 right-4 p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg transition"
                  title="Expulsar de la casa"
                >
                  <UserMinus size={16} />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Role explanation helper card */}
      <div className="bg-blue-50/40 p-5 rounded-2xl border border-blue-100/50 space-y-2">
        <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
          <Key size={14} className="text-blue-600" />
          Niveles de Permisos (RBAC)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
          <div className="text-xs space-y-1">
            <span className="font-bold text-amber-700">🏆 Propietario (Owner):</span>
            <p className="text-slate-600">Acceso total. Puede invitar, cambiar roles, expulsar miembros, configurar habitaciones y borrar cajas.</p>
          </div>
          <div className="text-xs space-y-1">
            <span className="font-bold text-blue-700">🛡️ Editor (Editor):</span>
            <p className="text-slate-600">Puede agregar y editar cajas, habitaciones, tareas y mover elementos en el plano. No gestiona miembros.</p>
          </div>
          <div className="text-xs space-y-1">
            <span className="font-bold text-slate-700">👁️ Lector (Viewer):</span>
            <p className="text-slate-600">Acceso de solo lectura. Puede visualizar cajas en 3D, plano interactivo, calendario y Kanban sin realizar cambios.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
