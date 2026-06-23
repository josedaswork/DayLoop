/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { 
  Flame, 
  ChevronRight, 
  Plus, 
  BarChart2, 
  Archive, 
  RefreshCw, 
  CheckSquare, 
  Square,
  Sparkles,
  Zap,
  Settings
} from 'lucide-react';
import { Hobby, HobbyLog } from '../types';
import { getLocalDateString, calculateStreaks } from '../utils/hobbyUtils';

interface HobbyHomeProps {
  hobbies: Hobby[];
  logs: HobbyLog[];
  onToggleTodayLog: (hobby: Hobby) => void;
  onUpdateProgress: (hobbyId: number, progress: number) => void;
  onNavigate: (view: 'home' | 'detail' | 'stats' | 'new' | 'edit' | 'archive' | 'settings', hobbyId?: number) => void;
  syncUrl: string;
  onSync: () => void;
  syncLoading: boolean;
  syncStatus: string;
}

export default function HobbyHome({
  hobbies,
  logs,
  onToggleTodayLog,
  onUpdateProgress,
  onNavigate,
  syncUrl,
  onSync,
  syncLoading,
  syncStatus
}: HobbyHomeProps) {
  const activeHobbies = hobbies.filter(h => h.status === 'active');
  const recurringHobbies = activeHobbies.filter(h => h.type === 'recurring');
  const temporaryHobbies = activeHobbies.filter(h => h.type === 'temporary');

  // Format today's human-readable date in Spanish
  const today = new Date();
  const options: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long' };
  const todayHuman = today.toLocaleDateString('es-ES', options);

  // Helper to get past 14 dates for dots timeline
  const getPast14Days = () => {
    const dates = [];
    const runDate = new Date();
    runDate.setDate(runDate.getDate() - 13); // 13 days ago
    for (let i = 0; i < 14; i++) {
      const year = runDate.getFullYear();
      const month = String(runDate.getMonth() + 1).padStart(2, '0');
      const day = String(runDate.getDate()).padStart(2, '0');
      dates.push(`${year}-${month}-${day}`);
      runDate.setDate(runDate.getDate() + 1);
    }
    return dates;
  };

  const timelineDates = getPast14Days();
  const todayStr = getLocalDateString();

  return (
    <div className="flex flex-col h-full bg-[#f9f9f7] font-sans text-neutral-900 overflow-hidden" id="hobby-home-pane">
      {/* Phone Header status banner */}
      <div className="p-5 pb-3 border-b-2 border-black flex items-center justify-between bg-white bg-opacity-90 backdrop-blur" id="home-phone-header">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-400 block font-bold">HOY EN DAYLOOP</span>
          <h2 className="text-sm font-black uppercase tracking-tight text-black first-letter:uppercase">{todayHuman}</h2>
        </div>
        
        <div className="flex items-center space-x-2">
          {/* Sync Indicator pill */}
          <button
            onClick={onSync}
            disabled={syncLoading || !syncUrl}
            className={`flex items-center space-x-1.5 px-2 py-1 text-[9px] font-black uppercase tracking-wider rounded-none border border-black cursor-pointer bg-white group active:translate-y-0.5 transition-all ${
              !syncUrl ? 'opacity-40 cursor-not-allowed' : 'hover:bg-neutral-50'
            }`}
            title={syncUrl ? 'Refrescar nube' : 'La nube no está configurada'}
          >
            {syncLoading ? (
              <RefreshCw className="h-3 w-3 animate-spin text-black" />
            ) : (
              <Zap className="h-3 w-3 text-yellow-500 fill-current group-hover:scale-110 transition-transform" />
            )}
            <span>{syncLoading ? 'SYNCING' : syncStatus === 'Sincronizado' ? 'CLOUD READY' : 'OFFLINE'}</span>
          </button>

          {/* New Settings Shortcut */}
          <button
            onClick={() => onNavigate('settings')}
            className="p-1 px-1.5 border border-black hover:bg-neutral-50 text-black active:translate-y-0.5 transition-all cursor-pointer rounded-none"
            title="Ajustes de Excel y datos"
            id="home-settings-shortcut-btn"
          >
            <Settings className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* List content wrapper */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5" id="home-phone-scrollarea">
        {/* Header Greeting / Motivational Card */}
        <div className="bg-[#121212] text-white p-4 border-2 border-black relative overflow-hidden" id="greeting-banner">
          <div className="absolute right-[-10px] bottom-[-10px] opacity-10 font-bold select-none text-7xl font-display uppercase italic tracking-tighter col-span-1">
            DAYLOOP
          </div>
          <div className="relative z-10 space-y-1">
            <div className="flex items-center gap-1.5 text-[9px] font-mono tracking-widest uppercase text-yellow-400">
              <Sparkles className="h-3 w-3" />
              <span>LOGS COMPLETADOS</span>
            </div>
            <h3 className="text-lg font-black leading-tight uppercase font-display">
              {activeHobbies.length === 0 
                ? '¿Listo para empezar?' 
                : 'Tu bitácora diaria'}
            </h3>
            <p className="text-[11px] text-neutral-300 font-medium">
              {activeHobbies.length === 0 
                ? 'Comienza creando tu primer hábito recurrente o proyecto temporal abajo.' 
                : `${logs.filter(l => l.date === todayStr && l.done).length} de ${recurringHobbies.length} tareas recurrentes realizadas hoy.`}
            </p>
          </div>
        </div>

        {activeHobbies.length === 0 ? (
          <div className="py-12 px-4 text-center border-2 border-black border-dashed bg-white space-y-3" id="fallback-welcome">
            <p className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-400">NO HAY HÁBITOS ACTIVOS</p>
            <p className="text-xs text-neutral-600 max-w-[200px] mx-auto leading-relaxed">
              Registra aquello en lo que desees enfocarte esta semana para empezar tu racha diaria.
            </p>
            <button
              onClick={() => onNavigate('new')}
              className="px-4 py-2 text-xs bg-[#ffff00] border border-black font-black uppercase tracking-wider rounded-none hover:bg-yellow-350 cursor-pointer text-center inline-flex items-center gap-1.5"
            >
              <Plus className="h-4 w-4" />
              <span>Añadir Hábito</span>
            </button>
          </div>
        ) : (
          <>
            {/* SECTION 1: RECURRING HOBBIES */}
            {recurringHobbies.length > 0 && (
              <div className="space-y-3" id="recurring-group">
                <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400 block font-mono">
                  HABITOS RECURRENTES ({recurringHobbies.length})
                </span>

                <div className="space-y-3.5">
                  {recurringHobbies.map(hobby => {
                    // Check if done today
                    const isDoneToday = logs.some(l => l.hobbyId === hobby.id && l.date === todayStr && l.done);
                    // Calculate streak
                    const { currentStreak } = calculateStreaks(hobby.id, logs);
                    
                    return (
                      <motion.div
                        key={hobby.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white border-2 border-black rounded-none p-3.5 flex flex-col gap-3 transition-shadow hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] relative"
                        style={{ borderLeftWidth: '6px', borderLeftColor: hobby.color }}
                      >
                        <div className="flex items-center justify-between gap-2.5">
                          {/* Left: Emoji details */}
                          <div 
                            className="flex items-center space-x-2.5 cursor-pointer flex-1"
                            onClick={() => onNavigate('detail', hobby.id)}
                            title="Ver detalles"
                          >
                            <span className="text-2xl h-10 w-10 border border-black bg-neutral-50 flex items-center justify-center shrink-0">
                              {hobby.icon}
                            </span>
                            <div className="min-w-0">
                              <h4 className="font-extrabold text-sm text-black truncate leading-tight uppercase font-sans tracking-tight">
                                {hobby.name}
                              </h4>
                              {currentStreak > 0 && (
                                <span className="inline-flex items-center space-x-1 text-orange-700 font-black text-[10px] uppercase font-mono mt-0.5 px-1.5 py-0.5 bg-orange-50 border border-orange-200">
                                  <Flame className="h-3.5 w-3.5 text-orange-600 fill-current animate-pulse" />
                                  <span>{currentStreak} Días</span>
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Right: Logging Checkbox */}
                          <button
                            onClick={() => onToggleTodayLog(hobby)}
                            className="h-9 w-9 border-2 border-black flex items-center justify-center cursor-pointer hover:bg-neutral-50 active:translate-y-0.5 transition-all text-neutral-800 shrink-0 select-none"
                            id={`log-checkbox-${hobby.id}`}
                            title={isDoneToday ? 'Marcar incompleto' : 'Marcar completado'}
                          >
                            {isDoneToday ? (
                              <CheckSquare className="h-5.5 w-5.5 text-black stroke-[3]" />
                            ) : (
                              <Square className="h-5.5 w-5.5 text-neutral-300 stroke-[1.5]" />
                            )}
                          </button>
                        </div>

                        {/* Staggered mini timeline dots representing past 14 days */}
                        <div className="border-t border-neutral-100 pt-2.5 flex items-center justify-between">
                          <span className="text-[9px] font-mono font-bold text-neutral-400 select-none">HACE 14 DÍAS</span>
                          <div className="flex items-center space-x-1">
                            {timelineDates.map(dateStr => {
                              const doneInDay = logs.some(l => l.hobbyId === hobby.id && l.date === dateStr && l.done);
                              const isTodayCircle = dateStr === todayStr;
                              
                              return (
                                <div
                                  key={dateStr}
                                  className={`rounded-full transition-all ${
                                    isTodayCircle 
                                      ? 'h-3.5 w-3.5 border-2 border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]' 
                                      : 'h-2.5 w-2.5 border border-black border-opacity-25'
                                  }`}
                                  style={{
                                    backgroundColor: doneInDay 
                                      ? hobby.color 
                                      : isTodayCircle 
                                      ? 'rgba(255,255,255,1)' 
                                      : '#eaeaea'
                                  }}
                                  title={`${dateStr}: ${doneInDay ? 'HECHO' : 'PENDIENTE'}${isTodayCircle ? ' (Hoy)' : ''}`}
                                />
                              );
                            })}
                          </div>
                          <span className="text-[9px] font-mono font-bold text-neutral-400 select-none">HOY</span>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* SECTION 2: TEMPORARY PROJECTS */}
            {temporaryHobbies.length > 0 && (
              <div className="space-y-3 pt-2" id="temp-group">
                <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400 block font-mono">
                  PROYECTOS TEMPORALES ({temporaryHobbies.length})
                </span>

                <div className="space-y-3.5">
                  {temporaryHobbies.map(hobby => {
                    const progressVal = hobby.progress;
                    return (
                      <motion.div
                        key={hobby.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white border-2 border-black rounded-none p-3.5 space-y-3 transition-shadow hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] relative"
                        style={{ borderLeftWidth: '6px', borderLeftColor: hobby.color }}
                      >
                        <div className="flex items-center justify-between gap-2.5 cursor-pointer" onClick={() => onNavigate('detail', hobby.id)}>
                          <div className="flex items-center space-x-2.5">
                            <span className="text-2xl h-10 w-10 border border-black bg-neutral-50 flex items-center justify-center shrink-0">
                              {hobby.icon}
                            </span>
                            <div>
                              <h4 className="font-extrabold text-sm text-black uppercase font-sans tracking-tight leading-tight">
                                {hobby.name}
                              </h4>
                              <span className="text-[9px] font-mono font-medium text-neutral-400">Creado {hobby.createdDate}</span>
                            </div>
                          </div>
                          <span className="font-mono text-xs font-black text-black bg-neutral-100 border border-black px-1.5 py-0.5">
                            {progressVal}%
                          </span>
                        </div>

                        {/* Slider Progress Bar Integration */}
                        <div className="space-y-1.5">
                          <label className="block text-[9px] font-mono font-bold text-neutral-500 uppercase select-none flex items-center justify-between">
                            <span>REPORTE DE LOGRO PARCIAL</span>
                            <span>ARRASTRAR PARA REGISTRAR</span>
                          </label>
                          <div className="flex items-center gap-2.5">
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={progressVal}
                              onChange={(e) => onUpdateProgress(hobby.id, Number(e.target.value))}
                              className="flex-1 accent-black h-2 bg-neutral-100 border border-black rounded-none cursor-pointer"
                              id={`progress-slider-${hobby.id}`}
                            />
                          </div>
                          
                          {/* Visual progress bar fill */}
                          <div className="w-full h-3 border border-black bg-neutral-100 overflow-hidden relative select-none">
                            <div 
                              className="h-full border-r border-black" 
                              style={{ width: `${progressVal}%`, backgroundColor: hobby.color }}
                            />
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Floating Bottom Navigation bar */}
      <div className="border-t-2 border-black bg-white p-2.5 flex items-center justify-around shrink-0 select-none" id="home-phone-footer">
        <button
          onClick={() => onNavigate('stats')}
          className="flex flex-col items-center gap-0.5 text-neutral-500 hover:text-black font-extrabold uppercase text-[10px] font-mono p-1.5 cursor-pointer active:scale-95 transition-transform"
          id="stats-button"
          title="Ver estadísticas globales"
        >
          <BarChart2 className="h-5 w-5" />
          <span>Métricas</span>
        </button>

        {/* Floating Add button */}
        <button
          onClick={() => onNavigate('new')}
          className="h-12 w-12 bg-[#ffff00] hover:bg-yellow-350 border-2 border-black text-black flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all cursor-pointer rounded-none transform hover:scale-105"
          id="add-hobby-button"
          title="Crear nuevo hábito"
        >
          <Plus className="h-6 w-6 stroke-[3]" />
        </button>

        <button
          onClick={() => onNavigate('archive')}
          className="flex flex-col items-center gap-0.5 text-neutral-500 hover:text-black font-extrabold uppercase text-[10px] font-mono p-1.5 cursor-pointer active:scale-95 transition-transform"
          id="archive-button"
          title="Ver hábitos archivados"
        >
          <Archive className="h-5 w-5" />
          <span>Papelera</span>
        </button>
      </div>
    </div>
  );
}
