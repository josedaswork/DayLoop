/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, 
  Flame, 
  Trash2, 
  Archive, 
  Edit, 
  Calendar, 
  Activity,
  CheckCircle,
  HelpCircle,
  FileDown
} from 'lucide-react';
import { Hobby, HobbyLog } from '../types';
import { 
  calculateConsistency, 
  calculateStreaks, 
  getCalendarWeeks, 
  parseLocalDate 
} from '../utils/hobbyUtils';

interface HobbyDetailProps {
  hobbyId: number;
  hobbies: Hobby[];
  logs: HobbyLog[];
  onToggleLogForDate: (hobbyId: number, dateStr: string) => void;
  onNavigate: (view: 'home' | 'detail' | 'stats' | 'new' | 'edit' | 'archive' | 'settings', id?: number) => void;
  onArchive: (id: number) => void;
  onDelete: (id: number) => void;
  onAddLog: (msg: string) => void;
}

export default function HobbyDetail({
  hobbyId,
  hobbies,
  logs,
  onToggleLogForDate,
  onNavigate,
  onArchive,
  onDelete,
  onAddLog
}: HobbyDetailProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);

  // Find the requested hobby
  const hobby = useMemo(() => hobbies.find(h => h.id === hobbyId), [hobbies, hobbyId]);

  // If loading or delete completed, fallback quickly
  if (!hobby) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center font-sans space-y-4 bg-[#f9f9f7]">
        <HelpCircle className="h-10 w-10 text-neutral-400 stroke-[1.5]" />
        <p className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-500">REGISTRO INEXISTENTE</p>
        <button 
          onClick={() => onNavigate('home')} 
          className="px-4 py-2 bg-black text-white text-xs font-extrabold uppercase tracking-widest rounded-none border-2 border-black"
        >
          Volver a Inicio
        </button>
      </div>
    );
  }

  // Calculate metrics
  const consistency = useMemo(() => calculateConsistency(hobby, logs), [hobby, logs]);
  const streaks = useMemo(() => calculateStreaks(hobby.id, logs), [hobby.id, logs]);
  const hobbyLogs = useMemo(() => logs.filter(l => l.hobbyId === hobby.id && l.done), [hobby.id, logs]);
  const totalSessions = hobbyLogs.length;

  // Retrieve calendar grid: 16 columns of weeks
  const calendarWeeks = useMemo(() => getCalendarWeeks(16), []);

  const handleToggleLogCell = (dateStr: string) => {
    onToggleLogForDate(hobby.id, dateStr);
    const wasDone = logs.some(l => l.hobbyId === hobby.id && l.date === dateStr && l.done);
    onAddLog(`Log manual: Se ha marcado [${hobby.name}] como ${wasDone ? 'INCOMPLETO' : 'REALIZADO'} el ${dateStr}.`);
  };

  const handleArchiveHobby = () => {
    onArchive(hobby.id);
    onNavigate('home');
    onAddLog(`Carpeta Archivo: Hábito [${hobby.name}] ha sido archivado con éxito 🗃️`);
  };

  const handleDeleteHobby = () => {
    onDelete(hobby.id);
    onNavigate('home');
    onAddLog(`Data purge: Hábito [${hobby.name}] y sus registros de racha han sido eliminados del sistema local 🗑️`);
  };

  // Humanize month indices for Spanish labels inside grid headers
  const monthLabels = useMemo(() => {
    const list = [];
    const today = new Date();
    // Retrieve past 4 calendar months
    for (let i = 3; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      list.push(d.toLocaleDateString('es-ES', { month: 'short' }).toUpperCase().replace('.', ''));
    }
    return list;
  }, []);

  return (
    <div className="flex flex-col h-full bg-[#f9f9f7] font-sans text-neutral-900 overflow-hidden relative" id="hobby-detail-pane">
      {/* Custom Confirmation Modals */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border-4 border-black p-5 max-w-[280px] w-full shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] space-y-4"
            >
              <h4 className="font-extrabold text-sm uppercase tracking-wider text-rose-600 block border-b border-neutral-100 pb-1 font-mono">
                ⚠️ ¿ELIMINAR HÁBITO?
              </h4>
              <p className="text-[11px] text-neutral-600 leading-normal font-sans">
                ¿Seguro que deseas ELIMINAR permanentemente &ldquo;{hobby.name}&rdquo; y todo su historial de progresos? Esta acción no se puede deshacer.
              </p>
              <div className="flex gap-2 font-mono">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-1.5 border-2 border-black text-[10px] font-black uppercase text-center bg-white text-black hover:bg-neutral-100 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    handleDeleteHobby();
                  }}
                  className="flex-1 py-1.5 border-2 border-black text-[10px] font-black uppercase text-center bg-red-600 hover:bg-neutral-900 text-white transition-colors"
                >
                  Eliminar
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {showArchiveConfirm && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border-4 border-black p-5 max-w-[280px] w-full shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] space-y-4"
            >
              <h4 className="font-extrabold text-sm uppercase tracking-wider text-neutral-700 block border-b border-neutral-100 pb-1 font-mono">
                🗃️ ¿ARCHIVAR?
              </h4>
              <p className="text-[11px] text-neutral-600 leading-normal font-sans">
                ¿Seguro que deseas archivar el hábito &ldquo;{hobby.name}&rdquo;? Se ocultará de la lista de inicio pero se mantendrá su historial.
              </p>
              <div className="flex gap-2 font-mono">
                <button
                  onClick={() => setShowArchiveConfirm(false)}
                  className="flex-1 py-1.5 border-2 border-black text-[10px] font-black uppercase text-center bg-white text-black hover:bg-neutral-100 transition-colors"
                >
                  Regresar
                </button>
                <button
                  onClick={() => {
                    setShowArchiveConfirm(false);
                    handleArchiveHobby();
                  }}
                  className="flex-1 py-1.5 border-2 border-black text-[10px] font-black uppercase text-center bg-black hover:bg-neutral-800 text-white transition-colors"
                >
                  Archivar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Top action header */}
      <div className="p-4 border-b-2 border-black bg-white flex items-center justify-between shrink-0" id="detail-phone-header">
        <button
          onClick={() => onNavigate('home')}
          className="p-1 px-2.5 border-2 border-black text-xs font-black uppercase tracking-wider bg-white text-black hover:bg-neutral-150 active:translate-y-0.5 transition-all flex items-center gap-1 cursor-pointer font-mono"
          id="detail-back-btn"
        >
          <ArrowLeft className="h-3.5 w-3.5 stroke-[3]" />
          <span>Inicio</span>
        </button>

        <h3 className="font-extrabold uppercase font-mono text-[11px] text-neutral-500 tracking-wider">
          {hobby.type === 'recurring' ? 'Hábito Diario' : 'Proyecto Temporal'}
        </h3>

        <button
          onClick={() => onNavigate('edit', hobby.id)}
          className="p-1 px-2 border-2 border-black text-xs font-black uppercase tracking-wider bg-white text-black hover:bg-neutral-150 active:translate-y-0.5 transition-all flex items-center gap-1 cursor-pointer font-mono"
          id={`detail-edit-arrow_${hobby.id}`}
        >
          <Edit className="h-3 w-3 stroke-[3]" />
          <span>Editar</span>
        </button>
      </div>

      {/* Main scrolling detail zone */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5" id="detail-phone-scrollarea">
        {/* Profile Card */}
        <div className="bg-white border-4 border-black p-4 flex items-center space-x-4 relative overflow-hidden shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
          <span className="text-4xl h-14 w-14 border-2 border-black rounded-none bg-neutral-50 flex items-center justify-center shrink-0" style={{ boxShadow: `4px 4px 0px 0px ${hobby.color}` }}>
            {hobby.icon}
          </span>
          <div className="min-w-0 flex-1">
            <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-neutral-400 block">ID #{hobby.id}</span>
            <h2 className="text-xl font-black text-black leading-tight uppercase font-display tracking-tight truncate">{hobby.name}</h2>
            <div className="flex items-center space-x-2 mt-1">
              <span 
                className="inline-block h-3.5 w-3.5 border border-black rounded-full" 
                style={{ backgroundColor: hobby.color }} 
              />
              <span className="text-[10px] font-bold font-mono text-neutral-500 uppercase">Tema: {hobby.color}</span>
            </div>
          </div>
        </div>

        {/* METRICS GRID ROW */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white border-2 border-black p-2.5 text-center flex flex-col justify-between">
            <span className="text-2xl font-black text-black block font-display">{totalSessions}</span>
            <span className="text-[9px] font-mono font-bold text-neutral-400 uppercase select-none leading-none">Total Hecho</span>
          </div>

          <div className="bg-white border-2 border-black p-2.5 text-center flex flex-col justify-between">
            <span className="text-2xl font-black text-black block flex items-center justify-center gap-0.5 font-display">
              <Flame className="h-5 w-5 text-orange-600 fill-current shrink-0" />
              {streaks.currentStreak}
            </span>
            <span className="text-[9px] font-mono font-bold text-neutral-400 uppercase select-none leading-none">Racha Activa</span>
          </div>

          <div className="bg-white border-2 border-black p-2.5 text-center flex flex-col justify-between">
            <span className="text-2xl font-black text-black block font-display">{consistency}%</span>
            <span className="text-[9px] font-mono font-bold text-neutral-400 uppercase select-none leading-none">Consistencia</span>
          </div>
        </div>

        {/* CALENDAR HEATMAP (Only for recurring, or as history log) */}
        {hobby.type === 'recurring' ? (
          <div className="bg-white border-2 border-black p-3.5 space-y-3 shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)]">
            <div className="flex items-center justify-between border-b border-neutral-150 pb-2.5">
              <div className="flex items-center space-x-2">
                <Calendar className="h-4.5 w-4.5 text-neutral-700" />
                <h4 className="font-extrabold text-xs uppercase tracking-wider text-black">Matriz de 4 meses (16S)</h4>
              </div>
              <span className="text-[9px] font-mono font-bold text-neutral-400 uppercase">Grid de Clic Activo</span>
            </div>

            {/* Heatmap Row representation starting Monday to Sunday */}
            <div className="flex flex-col space-y-1.5" id="heatmap-interactive-grid">
              {/* Day headers labels */}
              <div className="flex justify-between text-[9px] font-mono font-black text-neutral-400 px-1 border-b border-dashed border-neutral-200 pb-1">
                <span>LUN</span>
                <span>MIE</span>
                <span>VIE</span>
                <span>DOM</span>
              </div>

              {/* 16 columns map representing 16 weeks */}
              <div className="flex justify-between gap-1 overflow-x-auto py-1">
                {calendarWeeks.map((week, wIdx) => {
                  return (
                    <div key={wIdx} className="flex flex-col gap-1 shrink-0">
                      {week.map((dateStr, dIdx) => {
                        const done = logs.some(l => l.hobbyId === hobby.id && l.date === dateStr && l.done);
                        const todayStr = new Date().toISOString().split('T')[0];
                        const isFuture = dateStr > todayStr;
                        const startsBeforeCreation = dateStr < hobby.createdDate;
                        
                        return (
                          <div
                            key={dateStr}
                            onClick={() => !isFuture && !startsBeforeCreation && handleToggleLogCell(dateStr)}
                            className={`h-4.5 w-4.5 border transition-all cursor-pointer rounded-none relative flex items-center justify-center select-none ${
                              isFuture 
                                ? 'bg-neutral-100 opacity-20 cursor-not-allowed border-neutral-100' 
                                : startsBeforeCreation 
                                ? 'bg-neutral-100 opacity-50 cursor-pointer border-neutral-200'
                                : done 
                                ? 'border-black' 
                                : 'bg-white border-neutral-300 hover:border-black'
                            }`}
                            style={{
                              backgroundColor: done ? hobby.color : undefined
                            }}
                            title={`${dateStr}: ${done ? 'HECHO_LOGGED' : 'PENDIENTE_EMPTY'}`}
                          >
                            {/* Little indicator for today inside the heatmap */}
                            {dateStr === todayStr && (
                              <div className="h-1.5 w-1.5 bg-red-600 rounded-full" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>

              <div className="pt-2 text-[9px] font-mono font-medium text-neutral-500 leading-normal flex items-start gap-1">
                <Activity className="h-3 w-3 shrink-0 text-black mt-0.5" />
                <span>Haz clic en cualquier cuadrícula mensual para alternar el registro de finalización retroactivamente.</span>
              </div>
            </div>
          </div>
        ) : (
          /* TEMPORARY PROJECTS SPECIFIC DETAIL */
          <div className="bg-white border-2 border-black p-4 space-y-4 shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)]">
            <h4 className="font-extrabold text-xs uppercase tracking-wider text-black border-b border-neutral-150 pb-2">
              Historial de Progresos Reportados
            </h4>

            {/* Simple timeline display */}
            <div className="space-y-3 max-h-48 overflow-y-auto pr-1 font-mono text-[11px]">
              {logs.filter(l => l.hobbyId === hobby.id).length === 0 ? (
                <div className="py-6 text-center text-neutral-400">
                  <FileDown className="h-8 w-8 mx-auto opacity-30 stroke-[1.5] mb-2" />
                  <span>Sin progresos reportados aún. Ajuste el slider para marcar avances.</span>
                </div>
              ) : (
                logs
                  .filter(l => l.hobbyId === hobby.id)
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .map(log => (
                    <div key={log.id} className="flex justify-between items-center bg-neutral-50 border border-neutral-200 p-2">
                      <span className="font-bold text-neutral-700">{log.date}</span>
                      <span className="font-black text-black bg-neutral-200 border border-black px-1.5 py-0.5 text-[10px]">
                        AVANCE CORREGIDO: {log.progressSnapshot}%
                      </span>
                    </div>
                  ))
              )}
            </div>
          </div>
        )}

        {/* EXTRA METRICS STATS SUMMARY */}
        <div className="bg-white border-2 border-black p-3.5 text-xs font-mono font-bold text-neutral-850 space-y-2.5">
          <div className="flex justify-between border-b border-neutral-100 pb-1.5">
            <span className="uppercase text-neutral-400 font-bold">Racha Histórica Máxima:</span>
            <span className="text-black">{streaks.maxStreak} Días</span>
          </div>
          <div className="flex justify-between border-b border-neutral-100 pb-1.5">
            <span className="uppercase text-neutral-400 font-bold">Fecha de Registro Inicial:</span>
            <span className="text-black">{hobby.createdDate}</span>
          </div>
          <div className="flex justify-between align-middle">
            <span className="uppercase text-neutral-400 font-bold">Estado en Sistema Dayloop:</span>
            <span className={`px-1.5 border border-black text-[10px] uppercase select-none ${
              hobby.status === 'completed' ? 'bg-green-100 text-green-950' : 'bg-yellow-50 text-yellow-950'
            }`}>
              {hobby.status.toUpperCase()}
            </span>
          </div>
        </div>

        {/* PRIMARY ACTIONS PANEL: ARCHIVE / DELETE */}
        <div className="grid grid-cols-2 gap-3" id="hobby-action-purge">
          <button
            onClick={() => setShowArchiveConfirm(true)}
            className="flex items-center justify-center space-x-1.5 py-3 bg-white border-2 border-black text-black hover:bg-neutral-100 font-extrabold text-xs uppercase tracking-wider rounded-none transition-colors cursor-pointer active:translate-y-0.5"
            id={`archive-btn_${hobby.id}`}
            title="Mover habit a la papelera/archivo"
          >
            <Archive className="h-4 w-4" />
            <span>Archivar</span>
          </button>

          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center justify-center space-x-1.5 py-3 bg-red-500 hover:bg-neutral-900 overflow-hidden text-white border-2 border-black font-extrabold text-xs uppercase tracking-wider rounded-none transition-colors cursor-pointer active:translate-y-0.5"
            id={`delete-btn_${hobby.id}`}
            title="Eliminar permanentemente de la base datos"
          >
            <Trash2 className="h-4 w-4 text-white" />
            <span>Eliminar</span>
          </button>
        </div>
      </div>
    </div>
  );
}
