/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  ArrowLeft, 
  BarChart2, 
  Calendar, 
  Sparkles,
  Award,
  Activity
} from 'lucide-react';
import { Hobby, HobbyLog } from '../types';
import { getCalendarWeeks, getLast90Days, parseLocalDate } from '../utils/hobbyUtils';

interface HobbyStatsProps {
  hobbies: Hobby[];
  logs: HobbyLog[];
  onNavigate: (view: 'home' | 'detail' | 'stats' | 'new' | 'edit' | 'archive', id?: number) => void;
}

export default function HobbyStats({
  hobbies,
  logs,
  onNavigate
}: HobbyStatsProps) {
  const [selectedHobbyId, setSelectedHobbyId] = useState<string>('all');
  const recurringHobbies = useMemo(() => hobbies.filter(h => h.status === 'active' && h.type === 'recurring'), [hobbies]);

  // Compute filtered logs based on filter pill
  const filteredLogs = useMemo(() => {
    if (selectedHobbyId === 'all') {
      return logs.filter(l => l.done);
    } else {
      const hId = Number(selectedHobbyId);
      return logs.filter(l => l.hobbyId === hId && l.done);
    }
  }, [logs, selectedHobbyId]);

  const totalSessions = filteredLogs.length;

  const weeks = useMemo(() => getCalendarWeeks(16), []);
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Compute 16 weekly consistency rates
  const chartData = useMemo(() => {
    const activeHobbiesFiltered = selectedHobbyId === 'all' 
      ? recurringHobbies 
      : recurringHobbies.filter(h => h.id.toString() === selectedHobbyId);

    return weeks.map(weekDays => {
      // Filter out days which are in the future
      const validPastDays = weekDays.filter(day => day <= todayStr);
      let possibleSlots = 0;
      let completedSlots = 0;

      validPastDays.forEach(dateStr => {
        activeHobbiesFiltered.forEach(h => {
          // If the day is on or after the hobby's starting date
          if (dateStr >= h.createdDate) {
            possibleSlots++;
            if (logs.some(l => l.hobbyId === h.id && l.date === dateStr && l.done)) {
              completedSlots++;
            }
          }
        });
      });

      // Get label formatting for first day of week e.g. "8 Jun"
      let label = '-';
      if (weekDays.length > 0) {
        const firstDay = parseLocalDate(weekDays[0]);
        label = firstDay.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }).replace('.', '');
      }

      const rateNum = possibleSlots > 0 ? Math.round((completedSlots / possibleSlots) * 100) : 0;
      return {
        weekLabel: label,
        rate: rateNum
      };
    });
  }, [weeks, logs, selectedHobbyId, recurringHobbies, todayStr]);

  // General weekly metrics
  const validWeeks = chartData.filter(d => d.rate > 0 || totalSessions > 0);
  const avgRate = validWeeks.length > 0 ? Math.round(validWeeks.map(d => d.rate).reduce((a, b) => a + b, 0) / validWeeks.length) : 0;
  const bestWeekRate = chartData.length > 0 ? Math.max(...chartData.map(d => d.rate)) : 0;

  // Last 90 day activity intensity grid calculations
  const intensityData = useMemo(() => {
    const datesList = getLast90Days(); // 90 sorted dates (YYYY-MM-DD)
    const activeHobbiesFiltered = selectedHobbyId === 'all' 
      ? recurringHobbies 
      : recurringHobbies.filter(h => h.id.toString() === selectedHobbyId);

    return datesList.map(dateStr => {
      if (activeHobbiesFiltered.length === 0 || dateStr > todayStr) {
        return { date: dateStr, intensity: 0, count: 0 };
      }

      const completedInDay = activeHobbiesFiltered.filter(h => 
        logs.some(l => l.hobbyId === h.id && l.date === dateStr && l.done)
      ).length;

      const density = completedInDay / activeHobbiesFiltered.size;
      return {
        date: dateStr,
        intensity: density, // fraction 0 to 1
        count: completedInDay
      };
    });
  }, [logs, selectedHobbyId, recurringHobbies, todayStr]);

  // Determine specific display colors based on selected hobby colors
  const activeColorTheme = useMemo(() => {
    if (selectedHobbyId === 'all') {
      return '#22c55e'; // default green-500
    }
    const matching = recurringHobbies.find(h => h.id.toString() === selectedHobbyId);
    return matching ? matching.color : '#22c55e';
  }, [selectedHobbyId, recurringHobbies]);

  return (
    <div className="flex flex-col h-full bg-[#f9f9f7] font-sans text-neutral-900 overflow-hidden" id="hobby-stats-pane">
      {/* Detail header status */}
      <div className="p-4 border-b-2 border-black bg-white flex items-center justify-between shrink-0" id="stats-phone-header">
        <button
          onClick={() => onNavigate('home')}
          className="p-1 px-2.5 border-2 border-black text-xs font-black uppercase tracking-wider bg-white text-black hover:bg-neutral-150 active:translate-y-0.5 transition-all flex items-center gap-1 cursor-pointer font-mono"
          id="stats-back-btn"
        >
          <ArrowLeft className="h-3.5 w-3.5 stroke-[3]" />
          <span>Volver</span>
        </button>

        <h3 className="font-extrabold uppercase font-mono text-[11px] text-neutral-500 tracking-wider">
          Panel de Logros
        </h3>

        <div className="w-10 h-2" /> {/* alignment spacing */}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5" id="stats-phone-scrollarea">
        {/* Title display */}
        <div className="space-y-1">
          <span className="text-[9px] font-mono font-black uppercase tracking-widest text-neutral-400 block select-none">ESTADÍSTICAS GLOBALES</span>
          <h2 className="text-2xl font-black text-black leading-none font-display uppercase tracking-tight">Relleno Métrico</h2>
        </div>

        {/* Horizontal filtering pills */}
        {recurringHobbies.length > 0 && (
          <div className="flex items-center space-x-2 overflow-x-auto pb-1.5 select-none scrollbar-thin" id="stats-filters">
            <button
              onClick={() => setSelectedHobbyId('all')}
              className={`p-1.5 px-3 border-2 border-black text-[10px] font-black uppercase tracking-wider shrink-0 cursor-pointer ${
                selectedHobbyId === 'all' ? 'bg-[#ffff00] text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'bg-white text-neutral-600 hover:bg-neutral-50'
              }`}
              id="stats-filter-all"
            >
              Todos
            </button>
            {recurringHobbies.map(h => (
              <button
                key={h.id}
                onClick={() => setSelectedHobbyId(h.id.toString())}
                className={`p-1.5 px-3 border-2 border-black text-[10px] font-black uppercase tracking-wider shrink-0 flex items-center gap-1 cursor-pointer ${
                  selectedHobbyId === h.id.toString() ? 'bg-black text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'bg-white text-neutral-600 hover:bg-neutral-50'
                }`}
                id={`stats-filter-pill-${h.id}`}
              >
                <span>{h.icon}</span>
                <span>{h.name}</span>
              </button>
            ))}
          </div>
        )}

        {/* METRICAL REPORT DATA */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white border-2 border-black p-3 text-center rounded-none shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)]">
            <span className="text-3xl font-black text-black block font-display leading-none mb-1">{totalSessions}</span>
            <span className="text-[9px] font-mono leading-none tracking-tight font-bold text-neutral-400 uppercase select-none">Logros</span>
          </div>
          <div className="bg-white border-2 border-black p-3 text-center rounded-none shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)]">
            <span className="text-3xl font-black text-black block font-display leading-none mb-1">{avgRate}%</span>
            <span className="text-[9px] font-mono leading-none tracking-tight font-bold text-neutral-400 uppercase select-none">Media</span>
          </div>
          <div className="bg-white border-2 border-black p-3 text-center rounded-none shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)]">
            <span className="text-3xl font-black text-black block font-display leading-none mb-1">{bestWeekRate}%</span>
            <span className="text-[9px] font-mono leading-none tracking-tight font-bold text-neutral-400 uppercase select-none">Mejor</span>
          </div>
        </div>

        {/* WEEKLY COMPILATION BAR CHART */}
        <div className="bg-white border-2 border-black p-3.5 space-y-3.5 shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
            <h4 className="font-extrabold text-xs uppercase tracking-wider text-black flex items-center gap-1">
              <BarChart2 className="h-4 w-4" />
              <span>Consistencia Semanal % (16 Semanas)</span>
            </h4>
            <span className="text-[8.5px] font-mono text-neutral-400 uppercase">Progresos Históricos</span>
          </div>

          {/* SVG Customized chart */}
          <div className="w-full h-32 select-none flex items-end justify-between gap-1.5 pt-4">
            {chartData.map((data, idx) => {
              const barHeightPercent = Math.max(4, data.rate); // min 4% heights just for visibility
              return (
                <div key={idx} className="flex-1 flex flex-col items-center group h-full justify-end relative">
                  {/* Tooltip on hover */}
                  <div className="absolute top-[-26px] hidden group-hover:flex flex-col items-center z-20">
                    <div className="bg-black text-white text-[9px] font-mono p-1 px-1.5 border border-black rounded-none uppercase leading-none font-bold whitespace-nowrap">
                      {data.rate}% Realizado
                    </div>
                    <div className="w-1.5 h-1.5 bg-black rotate-45 mt-[-3px]" />
                  </div>

                  {/* SVG Bar rectangle fill */}
                  <div 
                    className="w-full border border-black rounded-none shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] cursor-crosshair hover:brightness-95 transition-all"
                    style={{ 
                      height: `${barHeightPercent}%`, 
                      backgroundColor: data.rate > 0 ? activeColorTheme : '#eaeaea',
                      opacity: idx === chartData.length - 1 ? 1 : 0.82
                    }}
                  />

                  {/* Tick Label */}
                  {idx % 4 === 0 && (
                    <span className="text-[7.5px] font-mono font-bold text-neutral-400 mt-2 rotate-[-30deg] origin-center whitespace-nowrap pb-1">
                      {data.weekLabel}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 90-DAY INTENSITY HEATMAP (GitHub Commits Grid Mock) */}
        <div className="bg-white border-2 border-black p-3.5 space-y-3.5 shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
            <h4 className="font-extrabold text-xs uppercase tracking-wider text-black flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>Intensidad de Frecuencia (90 Días)</span>
            </h4>
            <span className="text-[8.5px] font-mono text-neutral-400 uppercase">Últimos 3 Meses</span>
          </div>

          <div className="space-y-2">
            {/* Grid display layout */}
            <div className="flex flex-wrap gap-1 items-center justify-start max-h-[140px] overflow-y-auto pt-1">
              {intensityData.map((d, idx) => {
                let colorClass = 'rgba(234, 234, 234, 0.45)'; // default very light gray
                
                if (d.count > 0) {
                  // Determine color transparency matching density count
                  if (d.intensity <= 0.3) {
                    colorClass = `${activeColorTheme}2b`; // 17% transparent
                  } else if (d.intensity <= 0.6) {
                    colorClass = `${activeColorTheme}66`; // 40% transparent
                  } else if (d.intensity <= 0.8) {
                    colorClass = `${activeColorTheme}b3`; // 70% transparent
                  } else {
                    colorClass = activeColorTheme; // solid
                  }
                }

                // If date represents today
                const isTodayStr = d.date === todayStr;

                return (
                  <div
                    key={idx}
                    className={`h-3.5 w-3.5 border transition-colors cursor-pointer rounded-none relative ${
                      isTodayStr ? 'border-red-600 ring-1 ring-red-500' : 'border-neutral-200'
                    }`}
                    style={{ backgroundColor: colorClass }}
                    title={`${d.date}: ${d.count} terminados hoy`}
                  />
                );
              })}
            </div>

            <div className="pt-2 border-t border-neutral-100 flex items-center justify-between text-[8px] font-mono text-neutral-500 uppercase">
              <div className="flex items-center space-x-1">
                <span>RANGO:</span>
                <span className="px-1 bg-neutral-100 text-neutral-700 font-bold border border-neutral-200 select-all font-mono">
                  {intensityData.length > 0 ? intensityData[0].date : ''}
                </span>
                <span>a</span>
                <span className="px-1 bg-neutral-100 text-neutral-700 font-bold border border-neutral-200 select-all font-mono">
                  {todayStr}
                </span>
              </div>

              <div className="flex items-center space-x-1.5 font-bold text-neutral-600">
                <span>MENOS</span>
                <div className="h-2.5 w-2.5 bg-neutral-100 border border-neutral-200" />
                <div className="h-2.5 w-2.5" style={{ backgroundColor: `${activeColorTheme}2b` }} />
                <div className="h-2.5 w-2.5" style={{ backgroundColor: `${activeColorTheme}66` }} />
                <div className="h-2.5 w-2.5" style={{ backgroundColor: `${activeColorTheme}b3` }} />
                <div className="h-2.5 w-2.5" style={{ backgroundColor: activeColorTheme }} />
                <span>MAS</span>
              </div>
            </div>
          </div>
        </div>

        {/* MOTIVATIONAL BADGE COMPONENT */}
        <div className="bg-emerald-50 border-2 border-emerald-500 p-3.5 flex items-start gap-3 select-none">
          <Award className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5 animate-bounce" />
          <div className="text-[11px] text-emerald-950 font-sans leading-relaxed">
            <span className="font-extrabold block text-emerald-900 uppercase tracking-wide">INSIGNIA REGISTRADA:</span>
            ¡Gran esfuerzo! Continúa registrando tus rachas diarias en la applet <b>Dayloop</b> para acumular días perfectos en tu calendario interactivo.
          </div>
        </div>
      </div>
    </div>
  );
}
