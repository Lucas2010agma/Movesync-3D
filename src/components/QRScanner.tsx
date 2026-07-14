/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Box, Room } from '../types.js';
import { Scan, Camera, Package, AlertTriangle, ArrowRight, CornerDownRight, CheckCircle } from 'lucide-react';

interface QRScannerProps {
  boxes: Box[];
  rooms: Room[];
  householdCode: string;
  onOpenBoxModal: (boxId: string) => void;
}

export default function QRScanner({
  boxes,
  rooms,
  householdCode,
  onOpenBoxModal,
}: QRScannerProps) {
  const [selectedBoxId, setSelectedBoxId] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<Box | null>(null);

  const handleSimulateScan = () => {
    if (!selectedBoxId) return;
    setIsScanning(true);
    setScanResult(null);

    // Simulate scanning delay
    setTimeout(() => {
      const box = boxes.find((b) => b.id === selectedBoxId);
      if (box) {
        setScanResult(box);
        setIsScanning(false);
        // Trigger parent modal opening after 1s or immediately
        setTimeout(() => {
          onOpenBoxModal(box.id);
          setScanResult(null);
          setSelectedBoxId('');
        }, 1200);
      } else {
        setIsScanning(false);
      }
    }, 1000);
  };

  return (
    <div className="space-y-6 max-w-xl mx-auto animate-in fade-in duration-200">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm text-center space-y-4">
        <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto border border-blue-100">
          <Scan size={32} className="animate-pulse" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800">Lector Inteligente de Códigos QR</h2>
          <p className="text-sm text-slate-500 mt-1">
            Escanea las pegatinas QR de tus cajas impresas para conocer su contenido al instante.
          </p>
        </div>
      </div>

      {/* Camera Simulator viewport */}
      <div className="relative bg-slate-900 aspect-video rounded-3xl overflow-hidden border border-slate-800 shadow-lg flex flex-col items-center justify-center text-white">
        {/* Holographic scanner box overlay */}
        <div className="absolute inset-0 border-2 border-blue-500/10 pointer-events-none flex items-center justify-center">
          <div className="w-48 h-48 border-4 border-blue-400 rounded-2xl relative flex items-center justify-center bg-blue-500/5 backdrop-blur-xs">
            {/* Corners */}
            <div className="absolute -top-1.5 -left-1.5 w-6 h-6 border-t-4 border-l-4 border-blue-500 rounded-tl-md" />
            <div className="absolute -top-1.5 -right-1.5 w-6 h-6 border-t-4 border-r-4 border-blue-500 rounded-tr-md" />
            <div className="absolute -bottom-1.5 -left-1.5 w-6 h-6 border-b-4 border-l-4 border-blue-500 rounded-bl-md" />
            <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 border-b-4 border-r-4 border-blue-500 rounded-br-md" />

            {/* Red scan line */}
            <div className="absolute left-0 right-0 h-0.5 bg-red-500 shadow-red-500/80 shadow-md animate-bounce top-[10%]" />
          </div>
        </div>

        {/* Scanner state rendering */}
        {isScanning ? (
          <div className="text-center space-y-2 z-10 bg-slate-950/80 py-4 px-6 rounded-xl border border-slate-800 backdrop-blur-md">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm font-semibold tracking-wider text-blue-400 animate-pulse">ANALIZANDO CÓDIGO QR...</p>
          </div>
        ) : scanResult ? (
          <div className="text-center space-y-3 z-10 bg-emerald-950/90 py-5 px-6 rounded-xl border border-emerald-500/40 backdrop-blur-md max-w-xs animate-in zoom-in-95">
            <div className="w-10 h-10 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle size={24} />
            </div>
            <div>
              <p className="text-xs text-emerald-300 font-bold uppercase tracking-wider">¡Código Escaneado!</p>
              <h4 className="font-bold text-md text-white mt-1">{scanResult.name}</h4>
              <p className="text-[10px] text-emerald-300/80 mt-1">Abriendo modal de detalles de la caja...</p>
            </div>
          </div>
        ) : (
          <div className="text-center space-y-2 z-10 px-8 text-slate-400">
            <Camera size={32} className="mx-auto text-slate-500 mb-2" />
            <p className="text-xs font-semibold">Simulador de cámara activo en el preview</p>
            <p className="text-[10px] text-slate-500 max-w-xs mx-auto">
              Las restricciones de sandbox del iframe impiden el acceso a la webcam directa. Utiliza el simulador inferior para probar la lectura instantánea.
            </p>
          </div>
        )}
      </div>

      {/* Simulator Control Panel */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div>
          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
            <Scan size={16} className="text-blue-600" />
            Panel de Simulación de Escaneo
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Selecciona cualquiera de las cajas existentes en tu mudanza para emular la lectura de su etiqueta adhesiva.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={selectedBoxId}
            onChange={(e) => setSelectedBoxId(e.target.value)}
            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500"
          >
            <option value="">-- Elige una caja para escanear --</option>
            {boxes.map((box) => {
              const r = rooms.find((room) => room.id === box.assignedRoomId);
              return (
                <option key={box.id} value={box.id}>
                  📦 {box.name} ({r ? r.name : 'Sin estancia'})
                </option>
              );
            })}
          </select>

          <button
            onClick={handleSimulateScan}
            disabled={!selectedBoxId || isScanning || !!scanResult}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-100 disabled:text-slate-400 text-white font-medium px-5 py-2.5 rounded-xl transition text-sm flex items-center justify-center gap-2 shadow-xs shrink-0"
          >
            Simular Escaneo
            <ArrowRight size={14} />
          </button>
        </div>

        {/* Tip */}
        <div className="bg-amber-50/50 border border-amber-100/50 p-3 rounded-xl flex items-start gap-3">
          <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
          <div className="text-[11px] text-amber-800 space-y-1">
            <span className="font-bold block">Funcionamiento en la realidad:</span>
            <p className="text-amber-800/80 leading-relaxed">
              Cada caja genera un código QR que incluye su URL única de consulta (<span className="font-mono">/api/box/{householdCode}/[id]</span>). Al escanear con cualquier móvil, abre una página web pública con toda la metadata del inventario, facilitando la identificación durante la mudanza real.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
