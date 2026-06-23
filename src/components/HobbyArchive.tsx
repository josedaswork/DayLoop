/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, 
  Archive, 
  Trash2, 
  RefreshCw,
  FolderOpen,
  Info
} from 'lucide-react';
import { Hobby } from '../types';

interface HobbyArchiveProps {
  hobbies: Hobby[];
  onReactivate: (id: number) => void;
  onDelete: (id: number) => void;
  onNavigate: (view: 'home' | 'detail' | 'stats' | 'new' | 'edit' | 'archive' | 'settings', id?: number) => void;
  onAddLog: (msg: string) => void;
}

export default function HobbyArchive({
  hobbies,
  onReactivate,
  onDelete,
  onNavigate,
  onAddLog
}: HobbyArchiveProps) {
  const [hobbyToDelete, setHobbyToDelete] = useState<Hobby | null>(null);
  const archivedHobbies = hobbies.filter(h => h.status === 'archived');

  const handleReactivate = (hobby: Hobby) => {
    onReactivate(hobby.id);
    onAddLog(`Carpeta Archivo: Hábito [${hobby.name}] ha sido desarchivado y restaurado en inicio 📦`);
  };

  const handleDelete = (hobby: Hobby) => {
    setHobbyToDelete(hobby);
  };

  const confirmDelete = () => {
    if (hobbyToDelete) {
      onDelete(hobbyToDelete.id);
      onAddLog(`Base purge: Hábito [${hobbyToDelete.name}] borrado permanentemente de la papelera.`);
      setHobbyToDelete(null);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#f9f9f7] font-sans text-neutral-900 overflow-hidden relative" id="hobby-archive-pane">
      {/* In-app confirmation modal */}
      <AnimatePresence>
        {hobbyToDelete && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border-4 border-black p-5 max-w-[280px] w-full shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] space-y-4"
            >
              <h4 className="font-extrabold text-sm uppercase tracking-wider text-rose-600 block border-b border-neutral-100 pb-1 font-mono">
                ⚠️ ¿ELIMINAR DEFINITIVO?
              </h4>
              <p className="text-[11px] text-neutral-600 leading-normal font-sans">
                ¿Seguro que deseas ELIMINAR permanentemente &ldquo;{hobbyToDelete.name}&rdquo;? Esta acción removerá todos sus logs históricos de racha.
              </p>
              <div className="flex gap-2 font-mono">
                <button
                  onClick={() => setHobbyToDelete(null)}
                  className="flex-1 py-1.5 border-2 border-black text-[10px] font-black uppercase text-center bg-white text-black hover:bg-neutral-100 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 py-1.5 border-2 border-black text-[10px] font-black uppercase text-center bg-red-600 hover:bg-neutral-900 text-white transition-colors"
                >
                  Eliminar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Top action header */}
      <div className="p-4 border-b-2 border-black bg-white flex items-center justify-between shrink-0" id="archive-phone-header">
        <button
          onClick={() => onNavigate('home')}
          className="p-1 px-2.5 border-2 border-black text-xs font-black uppercase tracking-wider bg-white text-black hover:bg-neutral-150 active:translate-y-0.5 transition-all flex items-center gap-1 cursor-pointer font-mono"
          id="archive-back-btn"
        >
          <ArrowLeft className="h-3.5 w-3.5 stroke-[3]" />
          <span>Volver</span>
        </button>

        <h3 className="font-extrabold uppercase font-mono text-[11px] text-neutral-500 tracking-wider">
          Hábitos Archivados
        </h3>

        <div className="w-10 h-2" /> {/* alignment empty spacer */}
      </div>

      {/* Scrolling body lists */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4" id="archive-phone-scrollarea">
        <div className="space-y-1">
          <span className="text-[9px] font-mono font-black uppercase tracking-widest text-neutral-400 block select-none">PAPELERA SEGURA</span>
          <h2 className="text-xl font-black text-black leading-none font-display uppercase tracking-tight">Archivo de Hábitos</h2>
          <p className="text-[11px] text-neutral-500 font-medium">
            Los hábitos archivados suspenden su registro de rachas diarias pero preservan su bitácora de datos anterior.
          </p>
        </div>

        {archivedHobbies.length === 0 ? (
          <div className="py-12 border-2 border-dashed border-black bg-white text-center rounded-none space-y-3" id="archive-empty">
            <Archive className="h-10 w-10 text-neutral-400 mx-auto opacity-40 stroke-[1.5]" />
            <p className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-400">ARCHIVO VACÍO</p>
            <p className="text-xs text-neutral-500 max-w-[200px] mx-auto leading-relaxed">
              No dejas rastros archivados. Los hábitos que canse registrar pueden ser archivados temporalmente aquí.
            </p>
          </div>
        ) : (
          <div className="space-y-3.5">
            {archivedHobbies.map(hobby => (
              <motion.div
                key={hobby.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white border-2 border-black p-3 flex items-center justify-between gap-3 shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-shadow"
                style={{ borderLeftWidth: '5px', borderLeftColor: hobby.color }}
              >
                <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                  <span className="text-xl h-9 w-9 border border-black bg-neutral-50 flex items-center justify-center shrink-0">
                    {hobby.icon}
                  </span>
                  <div className="min-w-0">
                    <h4 className="font-extrabold text-xs text-black uppercase font-mono truncate leading-tight">
                      {hobby.name}
                    </h4>
                    <span className="text-[9px] font-mono text-neutral-400 uppercase">
                      {hobby.type === 'recurring' ? 'Rachas' : `Completo ${hobby.progress}%`}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-1.5 shrink-0 select-none">
                  <button
                    onClick={() => handleReactivate(hobby)}
                    className="p-1 px-2 border border-black text-[9.5px] font-black uppercase bg-emerald-50 text-emerald-950 hover:bg-emerald-100 transition-colors cursor-pointer flex items-center gap-0.5"
                    title="Restaurar hábito activo"
                  >
                    <RefreshCw className="h-3 w-3 stroke-[2.5]" />
                    <span>Restablecer</span>
                  </button>

                  <button
                    onClick={() => handleDelete(hobby)}
                    className="p-1 px-2 border border-black text-[9.5px] font-black uppercase bg-neutral-900 text-white hover:bg-neutral-800 transition-colors cursor-pointer flex items-center gap-0.5"
                    title="Eliminar permanentemente"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        <div className="bg-[#fcfbf9] border border-black p-3 text-[10px] leading-relaxed flex gap-2 text-neutral-700 font-medium select-none">
          <Info className="h-4.5 w-4.5 text-black shrink-0" />
          <span>Restablecer un hábito reactivará sus métricas de rachas consecutivas hoy de inmediato.</span>
        </div>
      </div>
    </div>
  );
}
