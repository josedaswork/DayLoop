/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  ArrowLeft, 
  Sparkles, 
  HelpCircle,
  PlusCircle,
  Save,
  Clock,
  Calendar,
  AlertTriangle
} from 'lucide-react';
import { Hobby } from '../types';
import { getLocalDateString } from '../utils/hobbyUtils';

interface HobbyFormProps {
  editHobbyId?: number | null;
  hobbies: Hobby[];
  onCreateHobby: (name: string, type: 'recurring' | 'temporary', icon: string, color: string) => void;
  onUpdateHobbyDetails: (id: number, name: string, type: 'recurring' | 'temporary', icon: string, color: string) => void;
  onNavigate: (view: 'home' | 'detail' | 'stats' | 'new' | 'edit' | 'archive', id?: number) => void;
  onAddLog: (msg: string) => void;
}

export default function HobbyForm({
  editHobbyId,
  hobbies,
  onCreateHobby,
  onUpdateHobbyDetails,
  onNavigate,
  onAddLog
}: HobbyFormProps) {
  // Check if we are in Edit Mode
  const isEditMode = editHobbyId !== undefined && editHobbyId !== null;
  const targetHobby = useMemo(() => {
    if (isEditMode) {
      return hobbies.find(h => h.id === editHobbyId);
    }
    return undefined;
  }, [hobbies, editHobbyId, isEditMode]);

  // Form states initialize standardly
  const [name, setName] = useState('');
  const [type, setType] = useState<'recurring' | 'temporary'>('recurring');
  const [selectedIcon, setSelectedIcon] = useState('🎸');
  const [selectedColor, setSelectedColor] = useState('#2563eb'); // blue

  // Preset pools for picker UI grids
  const emojiPool = ['🎸', '🏃', '🧘', '💻', '📚', '💧', '🍎', '😴', '🎨', '⏱️', '🎒', '🏋️', '🚴', '🌱', '🦷', '🍵'];
  
  const colorPool = [
    { name: 'Brutal Blue', hex: '#2563eb' },
    { name: 'Power Orange', hex: '#ea580c' },
    { name: 'Zen Green', hex: '#16a34a' },
    { name: 'Aqua Cyan', hex: '#0891b2' },
    { name: 'Posh Pink', hex: '#ec4899' },
    { name: 'Deep Violet', hex: '#8b5cf6' },
    { name: 'Stark Red', hex: '#ef4444' },
    { name: 'Retro Indigo', hex: '#6366f1' }
  ];

  // Preload values on edit mode
  useEffect(() => {
    if (isEditMode && targetHobby) {
      setName(targetHobby.name);
      setType(targetHobby.type);
      setSelectedIcon(targetHobby.icon);
      setSelectedColor(targetHobby.color);
    } else {
      // resets
      setName('');
      setType('recurring');
      setSelectedIcon('🎸');
      setSelectedColor('#2563eb');
    }
  }, [isEditMode, targetHobby]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      alert('Sustituto de alerta: Por favor, ingrese un título descriptivo.');
      return;
    }

    if (isEditMode && targetHobby) {
      onUpdateHobbyDetails(targetHobby.id, name.trim(), type, selectedIcon, selectedColor);
      onAddLog(`System Write: Hábito [${name.trim()}] editado correctamente.`);
      onNavigate('detail', targetHobby.id);
    } else {
      onCreateHobby(name.trim(), type, selectedIcon, selectedColor);
      onAddLog(`System Write: Nuevo Hábito [${name.trim()}] inicializado.`);
      onNavigate('home');
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#f9f9f7] font-sans text-neutral-900 overflow-hidden" id="hobby-form-pane">
      {/* Detail header action bar */}
      <div className="p-4 border-b-2 border-black bg-white flex items-center justify-between shrink-0" id="form-phone-header">
        <button
          onClick={() => isEditMode && targetHobby ? onNavigate('detail', targetHobby.id) : onNavigate('home')}
          className="p-1 px-2.5 border-2 border-black text-xs font-black uppercase tracking-wider bg-white text-black hover:bg-neutral-150 active:translate-y-0.5 transition-all flex items-center gap-1 cursor-pointer font-mono"
          id="form-back-btn"
        >
          <ArrowLeft className="h-3.5 w-3.5 stroke-[3]" />
          <span>Volver</span>
        </button>

        <h3 className="font-extrabold uppercase font-mono text-[11px] text-neutral-500 tracking-wider">
          {isEditMode ? 'Editar Registro' : 'Nuevo Registro'}
        </h3>

        <div className="w-10 h-2" /> {/* alignment empty spacer */}
      </div>

      {/* Primary scrolling Form body */}
      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4" id="form-phone-scrollarea">
        
        {/* Descriptive Form Greetings header */}
        <div className="space-y-1">
          <span className="text-[9px] font-mono font-black uppercase tracking-widest text-neutral-400 block select-none">
            {isEditMode ? 'EDIT_HOBBY_FLOW' : 'CREATE_HOBBY_FLOW'}
          </span>
          <h2 className="text-xl font-black text-black leading-none font-display uppercase tracking-tight">
            {isEditMode ? 'Ajustar Parámetros' : 'Nueva Invocación'}
          </h2>
          <p className="text-[11px] text-neutral-500 font-medium">
            Configure sus objetivos recurrentes de corto o largo plazo en el sistema.
          </p>
        </div>

        {/* FIELD 1: NAME INPUT */}
        <div className="space-y-1.5">
          <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-500 font-mono select-none">
            Nombre / Título Descriptivo
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Yoga por la mañana, Aprender Rust..."
            className="w-full px-3 py-2.5 border-2 border-black rounded-none text-xs text-black font-semibold bg-white focus:outline-none focus:bg-yellow-50/10 placeholder:text-neutral-400 uppercase font-mono"
            id="new_hobby_name_input"
          />
        </div>

        {/* FIELD 2: TYPE PICKER */}
        <div className="space-y-1.5" id="type-selector-group">
          <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-500 font-mono select-none">
            Forma de Control (Tipo)
          </label>
          
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setType('recurring')}
              className={`p-3 border-2 border-black rounded-none text-left flex flex-col justify-between transition-all select-none cursor-pointer ${
                type === 'recurring' ? 'bg-[#ffff00] text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'bg-white text-neutral-700 hover:bg-neutral-50'
              }`}
            >
              <Calendar className="h-4.5 w-4.5 text-black stroke-[2.5] mb-1" />
              <div>
                <span className="font-extrabold text-[11px] uppercase block font-display leading-none">Rachas Diarias</span>
                <span className="text-[9px] font-medium text-neutral-500 leading-tight block mt-0.5 font-sans lowercase">Para hábitos que repites a diario (checklist).</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setType('temporary')}
              className={`p-3 border-2 border-black rounded-none text-left flex flex-col justify-between transition-all select-none cursor-pointer ${
                type === 'temporary' ? 'bg-[#ffff00] text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'bg-white text-neutral-700 hover:bg-neutral-50'
              }`}
            >
              <Clock className="h-4.5 w-4.5 text-black stroke-[2.5] mb-1" />
              <div>
                <span className="font-extrabold text-[11px] uppercase block font-display leading-none">Proyecto Temporal</span>
                <span className="text-[9px] font-medium text-neutral-500 leading-tight block mt-0.5 font-sans lowercase">Para metas con % de avance progresivo (slider).</span>
              </div>
            </button>
          </div>
        </div>

        {/* FIELD 3: EMOJI ICON GRID */}
        <div className="space-y-1.5">
          <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-500 font-mono select-none flex items-center justify-between">
            <span>Seleccionar Glifo (Icono)</span>
            <span className="text-black bg-neutral-100 border border-black font-mono px-1.5 py-0.5 text-[10px]">{selectedIcon}</span>
          </label>
          
          <div className="grid grid-cols-8 gap-1.5 bg-white p-2.5 border-2 border-black select-none">
            {emojiPool.map(emoji => (
              <button
                key={emoji}
                type="button"
                onClick={() => setSelectedIcon(emoji)}
                className={`h-9 w-9 text-lg border-2 flex items-center justify-center transition-colors hover:bg-neutral-50 rounded-none cursor-pointer ${
                  selectedIcon === emoji ? 'bg-neutral-100 border-black ring-1 ring-black' : 'border-transparent'
                }`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        {/* FIELD 4: HIGH-CONTRAST HEX COLOR GRID */}
        <div className="space-y-1.5">
          <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-500 font-mono select-none flex items-center justify-between">
            <span>Esquema Cromático (Color)</span>
            <span 
              className="px-1.5 border border-black font-mono py-0.5 text-[9.5px] text-white flex items-center gap-1"
              style={{ backgroundColor: selectedColor }}
            >
              {selectedColor.toUpperCase()}
            </span>
          </label>

          <div className="grid grid-cols-4 gap-2 bg-white p-2.5 border-2 border-black select-none">
            {colorPool.map(col => (
              <button
                key={col.hex}
                type="button"
                onClick={() => setSelectedColor(col.hex)}
                className="h-10 text-left p-1 border-2 border-black rounded-none cursor-pointer hover:brightness-95 flex items-center justify-center relative transition-transform"
                style={{ backgroundColor: col.hex }}
              >
                {selectedColor === col.hex && (
                  <div className="absolute inset-1 border border-white flex items-center justify-center">
                    <span className="h-2 w-2 bg-white rounded-full" />
                  </div>
                )}
                <span className="text-[8px] leading-none text-white font-mono uppercase bg-black bg-opacity-20 px-1 py-0.5 tracking-tight hidden sm:block">
                  {col.name}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* NOTIFICATION CRITICAL ADVICE */}
        <div className="bg-neutral-100 border border-black p-2.5 flex items-start gap-2.5 text-[10.5px] leading-tight select-none">
          <AlertTriangle className="h-3.5 w-3.5 text-neutral-600 shrink-0 mt-0.5" />
          <p className="text-neutral-500 font-medium">
            Los cambios se guardarán automáticamente en la persistencia local de Capacitor. Los campos guardados se sincronizarán con sus planillas de Excel físicas al exportar.
          </p>
        </div>

        {/* FORM MAIN ACTION SUBMIT CONTROLS */}
        <div className="pt-3" id="form-submit-row">
          <button
            type="submit"
            className="w-full flex items-center justify-center space-x-2 py-3.5 bg-black hover:bg-neutral-900 text-white font-black text-xs uppercase tracking-widest border-2 border-black rounded-none cursor-pointer transition-all active:translate-y-0.5 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
            id="create_hobby_btn"
          >
            {isEditMode ? (
              <>
                <Save className="h-4 w-4" />
                <span>Guardar Cambios</span>
              </>
            ) : (
              <>
                <PlusCircle className="h-4 w-4" />
                <span>Generar Hábito</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
