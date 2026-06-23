/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, 
  Settings, 
  Database, 
  Upload, 
  Download, 
  RefreshCw, 
  Zap, 
  AlertTriangle, 
  HelpCircle,
  Clock,
  Info
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Hobby, HobbyLog } from '../types';

interface HobbySettingsProps {
  hobbies: Hobby[];
  setHobbies: (h: Hobby[]) => void;
  logs: HobbyLog[];
  setLogs: (l: HobbyLog[]) => void;
  syncUrl: string;
  setSyncUrl: (url: string) => void;
  onSyncTrigger: (mode: 'upload' | 'download') => void;
  syncLoading: boolean;
  syncStatus: string;
  onLoadStarterSeed: () => void;
  onNavigate: (view: 'home' | 'detail' | 'stats' | 'new' | 'edit' | 'archive' | 'settings', id?: number) => void;
  onAddLog: (msg: string) => void;
}

export default function HobbySettings({
  hobbies,
  setHobbies,
  logs,
  setLogs,
  syncUrl,
  setSyncUrl,
  onSyncTrigger,
  syncLoading,
  syncStatus,
  onLoadStarterSeed,
  onNavigate,
  onAddLog
}: HobbySettingsProps) {
  const [importMode, setImportMode] = useState<'merge' | 'overwrite'>('merge');
  const [showCodeHelp, setShowCodeHelp] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // DOWNLOAD TEMPLATE
  const handleDownloadTemplate = () => {
    try {
      const templateHobbies = [
        { ID: 1, Nombre: "Aprender Guitarra", Tipo: "recurring", Icono: "🎸", Color: "#2563eb", Progreso: 0, Estado: "active", FechaCreacion: new Date().toISOString().split('T')[0] },
        { ID: 2, Nombre: "Correr 5K", Tipo: "recurring", Icono: "🏃", Color: "#ea580c", Progreso: 0, Estado: "active", FechaCreacion: new Date().toISOString().split('T')[0] },
        { ID: 3, Nombre: "Proyecto App Dayloop", Tipo: "temporary", Icono: "📱", Color: "#16a34a", Progreso: 45, Estado: "active", FechaCreacion: new Date().toISOString().split('T')[0] }
      ];

      const templateLogs = [
        { ID: 101, HobbyID: 1, Fecha: new Date().toISOString().split('T')[0], Completado: 1, SnapshotProgreso: 0 },
        { ID: 102, HobbyID: 2, Fecha: new Date().toISOString().split('T')[0], Completado: 0, SnapshotProgreso: 0 }
      ];

      const wsHobbies = XLSX.utils.json_to_sheet(templateHobbies);
      const wsLogs = XLSX.utils.json_to_sheet(templateLogs);

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, wsHobbies, 'Hobbies');
      XLSX.utils.book_append_sheet(wb, wsLogs, 'Logs');

      XLSX.writeFile(wb, `plantilla_dayloop_hobby_tracker.xlsx`);
      onAddLog('Excel: Plantilla de importación vacía generada y descargada.');
    } catch (e) {
      console.error(e);
    }
  };

  // EXPORT TO EXCEL
  const handleExportToExcel = () => {
    if (hobbies.length === 0) {
      alert('No tienes hábitos registrados para exportar.');
      return;
    }

    try {
      const wsHobbies = XLSX.utils.json_to_sheet(hobbies.map(h => ({
        ID: h.id,
        Nombre: h.name,
        Tipo: h.type,
        Icono: h.icon,
        Color: h.color,
        Progreso: h.progress,
        Estado: h.status,
        FechaCreacion: h.createdDate
      })));

      const wsLogs = XLSX.utils.json_to_sheet(logs.map(l => ({
        ID: l.id,
        HobbyID: l.hobbyId,
        Fecha: l.date,
        Completado: l.done ? 1 : 0,
        SnapshotProgreso: l.progressSnapshot
      })));

      wsHobbies['!cols'] = [
        { wch: 10 }, { wch: 25 }, { wch: 15 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 16 }
      ];
      wsLogs['!cols'] = [
        { wch: 10 }, { wch: 12 }, { wch: 16 }, { wch: 12 }, { wch: 20 }
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, wsHobbies, 'Hobbies');
      XLSX.utils.book_append_sheet(wb, wsLogs, 'Logs');

      const dateStr = new Date().toISOString().split('T')[0];
      XLSX.writeFile(wb, `dayloop_tracker_backup_${dateStr}.xlsx`);
      onAddLog('Excel: Backup descargado con éxito.');
    } catch (e) {
      console.error(e);
      alert('Error al exportar a Excel.');
    }
  };

  // IMPORT FROM EXCEL
  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = event.target?.result;
        if (!data) return;

        const workbook = XLSX.read(data, { type: 'binary' });
        
        const hobbiesSheetName = workbook.SheetNames.find(name => name.toLowerCase() === 'hobbies');
        const logsSheetName = workbook.SheetNames.find(name => name.toLowerCase() === 'logs');

        if (!hobbiesSheetName) {
          alert('El archivo Excel debe poseer la pestaña "Hobbies".');
          return;
        }

        const rawHobbies: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[hobbiesSheetName]);
        const rawLogs: any[] = logsSheetName 
          ? XLSX.utils.sheet_to_json(workbook.Sheets[logsSheetName]) 
          : [];

        const parsedHobbies: Hobby[] = rawHobbies.map((row, idx) => {
          const typeVal = row.Tipo || row.type || 'recurring';
          const statusVal = row.Estado || row.status || 'active';
          
          return {
            id: Number(row.ID || row.id || (Date.now() + idx)),
            name: String(row.Nombre || row.name || 'Hobby Sin Nombre'),
            type: (typeVal === 'temporary' || typeVal === 'temp' ? 'temporary' : 'recurring') as Hobby['type'],
            icon: String(row.Icono || row.icon || '🎯'),
            color: String(row.Color || row.color || '#4f46e5'),
            progress: Number(row.Progreso || row.progress || 0),
            status: (statusVal === 'archived' ? 'archived' : statusVal === 'completed' ? 'completed' : 'active') as Hobby['status'],
            createdDate: String(row.FechaCreacion || row.createdDate || new Date().toISOString().split('T')[0])
          };
        });

        const parsedLogs: HobbyLog[] = rawLogs.map((row, idx) => {
          const doneVal = row.Completado !== undefined ? (Number(row.Completado) === 1 || !!row.Completado) : (!!row.done);
          return {
            id: Number(row.ID || row.id || (Date.now() + 1000 + idx)),
            hobbyId: Number(row.HobbyID || row.hobbyId || row.hobby_id || 0),
            date: String(row.Fecha || row.date || new Date().toISOString().split('T')[0]),
            done: doneVal,
            progressSnapshot: Number(row.SnapshotProgreso || row.progressSnapshot || row.progress_snapshot || 0)
          };
        });

        if (importMode === 'overwrite') {
          setHobbies(parsedHobbies);
          setLogs(parsedLogs);
          onAddLog(`Import: Sobrescritas ${parsedHobbies.length} tareas desde Excel.`);
          alert(`Sobrescritura exitosa: ${parsedHobbies.length} hábitos cargados.`);
        } else {
          const mergedHobbiesMap = new Map<number, Hobby>();
          hobbies.forEach(h => mergedHobbiesMap.set(h.id, h));
          parsedHobbies.forEach(h => mergedHobbiesMap.set(h.id, h));

          const mergedLogsMap = new Map<string, HobbyLog>();
          logs.forEach(l => mergedLogsMap.set(`${l.hobbyId}_${l.date}`, l));
          parsedLogs.forEach(l => mergedLogsMap.set(`${l.hobbyId}_${l.date}`, l));

          setHobbies(Array.from(mergedHobbiesMap.values()));
          setLogs(Array.from(mergedLogsMap.values()));
          onAddLog(`Import: Fusión exitosa con base de datos de Excel.`);
          alert(`Fusión exitosa con total de de ${mergedHobbiesMap.size} hábitos.`);
        }

        if (fileInputRef.current) fileInputRef.current.value = '';
      } catch (err) {
        console.error(err);
        alert('No se pudo leer el archivo Excel.');
      }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="flex flex-col h-full bg-[#f9f9f7] font-sans text-neutral-900 overflow-hidden relative" id="hobby-settings-pane">
      {/* Custom Seed Reset Confirmation Modal */}
      <AnimatePresence>
        {showResetConfirm && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border-4 border-black p-5 max-w-[280px] w-full shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] space-y-4"
            >
              <h4 className="font-extrabold text-sm uppercase tracking-wider text-rose-600 block border-b border-neutral-100 pb-1 font-mono">
                ⚠️ ¿RECOLECTAR SEMILLA?
              </h4>
              <p className="text-[11px] text-neutral-600 leading-normal font-sans">
                ¿Seguro que deseas purgar la base actual y cargar la semilla predeterminada para demostración? Perderás tus datos locales inmediatos.
              </p>
              <div className="flex gap-2 font-mono">
                <button
                  onClick={() => setShowResetConfirm(false)}
                  className="flex-1 py-1.5 border-2 border-black text-[10px] font-black uppercase text-center bg-white text-black hover:bg-neutral-100 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    setShowResetConfirm(false);
                    onLoadStarterSeed();
                    onNavigate('home');
                  }}
                  className="flex-1 py-1.5 border-2 border-black text-[10px] font-black uppercase text-center bg-red-600 hover:bg-neutral-900 text-white transition-colors"
                >
                  Confirmar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Top action header */}
      <div className="p-4 border-b-2 border-black bg-white flex items-center justify-between shrink-0" id="settings-phone-header">
        <button
          onClick={() => onNavigate('home')}
          className="p-1 px-2.5 border-2 border-black text-xs font-black uppercase tracking-wider bg-white text-black hover:bg-neutral-150 active:translate-y-0.5 transition-all flex items-center gap-1 cursor-pointer font-mono"
          id="settings-back-btn"
        >
          <ArrowLeft className="h-3.5 w-3.5 stroke-[3]" />
          <span>Volver</span>
        </button>

        <h3 className="font-extrabold uppercase font-mono text-[11px] text-neutral-500 tracking-wider">
          Ajustes / Datos
        </h3>

        <div className="w-10 h-2" />
      </div>

      {/* Scrolling settings form container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5" id="settings-phone-scrollarea">
        <div className="space-y-1">
          <span className="text-[9px] font-mono font-black uppercase tracking-widest text-neutral-400 block select-none">INTEROP &amp; ARCHIVOS</span>
          <h2 className="text-xl font-black text-black leading-none font-display uppercase tracking-tight">Base de Datos &amp; Excel</h2>
          <p className="text-[11px] text-neutral-500 font-medium leading-relaxed">
            Administra tus registros locales con compatibilidad para arrastrar, importar o exportar planillas de cálculo reales.
          </p>
        </div>

        {/* SECTION 1: MANUAL BACKUPS IN XLSX */}
        <div className="bg-white border-2 border-black p-3.5 space-y-4" id="excel-group-settings">
          <h3 className="text-xs font-mono font-black uppercase tracking-widest text-neutral-500 border-b border-neutral-100 pb-1.5 flex items-center justify-between">
            <span>Interoperabilidad XLSX</span>
            <span className="text-[9px] bg-neutral-100 px-1 border border-black transform translate-y-[-2px]">OFFLINE OK</span>
          </h3>

          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportToExcel}
                className="flex-1 py-2 px-3 bg-black text-white hover:bg-neutral-900 border-2 border-black font-extrabold text-[10.5px] uppercase tracking-wider rounded-none active:translate-y-0.5 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                id="phone-export-excel-btn"
              >
                <Download className="h-4 w-4 stroke-[2.5]" />
                <span>Exportar base</span>
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 py-2 px-3 bg-white text-black hover:bg-neutral-50 border-2 border-black font-extrabold text-[10.5px] uppercase tracking-wider rounded-none active:translate-y-0.5 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                id="phone-import-excel-btn"
              >
                <Upload className="h-4 w-4 stroke-[2.5]" />
                <span>Importar</span>
              </button>
            </div>

            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImportExcel} 
              accept=".xlsx,.xls" 
              className="hidden" 
            />

            <div className="bg-[#f9f9f7] p-3 border border-black space-y-2">
              <span className="block text-[9px] font-mono font-extrabold text-neutral-500 uppercase">MODO AL REEMPLAZAR RECHAS</span>
              <div className="flex gap-4">
                <label className="flex items-center gap-1.5 text-[10px] text-black font-extrabold cursor-pointer uppercase font-mono">
                  <input 
                    type="radio" 
                    name="phone_import_opt" 
                    checked={importMode === 'merge'} 
                    onChange={() => setImportMode('merge')} 
                    className="accent-black h-3.5 w-3.5"
                  />
                  FUSIONAR
                </label>
                <label className="flex items-center gap-1.5 text-[10px] text-black font-extrabold cursor-pointer uppercase font-mono">
                  <input 
                    type="radio" 
                    name="phone_import_opt" 
                    checked={importMode === 'overwrite'} 
                    onChange={() => setImportMode('overwrite')} 
                    className="accent-black h-3.5 w-3.5"
                  />
                  REEMPLAZAR
                </label>
              </div>
            </div>

            <button
              onClick={handleDownloadTemplate}
              className="w-full py-1.5 border border-black text-[9.5px] font-black uppercase text-center hover:bg-neutral-50"
            >
              Descargar plantilla vacía de Excel
            </button>
          </div>
        </div>

        {/* SECTION 2: GOOGLE SHEETS SERVER CONTROLS */}
        <div className="bg-white border-2 border-black p-3.5 space-y-4" id="sync-group-settings">
          <h3 className="text-xs font-mono font-black uppercase tracking-widest text-neutral-500 border-b border-neutral-100 pb-1.5 flex items-center justify-between">
            <span>Sincronización de Nube</span>
            <span className="text-[9px] bg-red-50 text-red-900 px-1 border border-red-200 transform translate-y-[-2px] tracking-wide font-bold">API REST</span>
          </h3>

          <div className="space-y-3">
            <div>
              <label className="block text-[9.5px] font-extrabold text-neutral-500 uppercase tracking-wider mb-1">
                ENDPOINT URL (Apps Script Deploy)
              </label>
              <input
                type="text"
                value={syncUrl}
                onChange={(e) => setSyncUrl(e.target.value)}
                placeholder="https://script.google.com/macros/s/..."
                className="w-full px-3 py-2 border-2 border-black text-xs font-mono bg-white focus:outline-none placeholder:text-neutral-400"
              />
              {syncUrl && syncUrl.includes('docs.google.com/spreadsheets') && (
                <div className="mt-2 text-[9.5px] bg-red-50 border border-red-300 text-red-950 p-2 leading-relaxed font-sans">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-red-600 inline mr-1" />
                  <span className="font-extrabold uppercase text-rose-700 block mb-0.5">⚠️ ENLACE INCORRECTO DETECTADO</span>
                  <span>Has ingresado la URL de edición de la hoja de cálculo de Google. Debes pegar la <b>"URL de la aplicación web"</b> generada al implementar el Código Apps Script (empieza por <code className="font-mono text-rose-800">https://script.google.com/...</code>). Abre la guía abajo para más info.</span>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={() => onSyncTrigger('upload')}
                disabled={syncLoading || !syncUrl}
                className="w-full py-2.5 bg-[#ffff00] border-2 border-black text-black font-extrabold text-[11px] uppercase tracking-wider rounded-none hover:bg-yellow-350 active:translate-y-0.5 transition-all text-center flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                {syncLoading && syncStatus.includes('Subiendo') ? (
                  <RefreshCw className="h-4 w-4 animate-spin stroke-[2.5]" />
                ) : (
                  <Upload className="h-4 w-4 stroke-[2.5]" />
                )}
                <span>{syncLoading && syncStatus.includes('Subiendo') ? 'Subiendo cambios...' : 'Subir todos los cambios'}</span>
              </button>

              <button
                onClick={() => onSyncTrigger('download')}
                disabled={syncLoading || !syncUrl}
                className="w-full py-2.5 bg-white border-2 border-black text-black font-extrabold text-[11px] uppercase tracking-wider rounded-none hover:bg-neutral-50 active:translate-y-0.5 transition-all text-center flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                {syncLoading && syncStatus.includes('Bajando') ? (
                  <RefreshCw className="h-4 w-4 animate-spin stroke-[2.5]" />
                ) : (
                  <Download className="h-4 w-4 stroke-[2.5]" />
                )}
                <span>{syncLoading && syncStatus.includes('Bajando') ? 'Descargando datos...' : 'Bajar todo de la Nube'}</span>
              </button>
            </div>

            {syncStatus && (
              <div className="text-center font-mono text-[9px] uppercase tracking-wider text-neutral-500 font-extrabold">
                Estado: <span className="text-black bg-neutral-200 px-1.5 py-0.5 border border-black/20">{syncStatus}</span>
              </div>
            )}

            {!syncUrl && (
              <div className="flex gap-2 text-[9.5px] bg-amber-50 border border-amber-300 text-amber-950 p-2.5 leading-relaxed">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                <span>Sync desactivada. Introduce un endpoint válido de Google Script para sincronizar con Sheets.</span>
              </div>
            )}

            <div>
              <button
                type="button"
                onClick={() => setShowCodeHelp(!showCodeHelp)}
                className="text-[10px] font-bold text-neutral-700 border-b border-black border-dashed hover:opacity-80 flex items-center gap-1 select-none"
              >
                <span>{showCodeHelp ? 'Ocultar Guía & Código' : 'Guía de instalación & Código Apps Script'}</span>
                <HelpCircle className="h-3 w-3" />
              </button>

              {showCodeHelp && (
                <div className="mt-2 bg-[#121212] text-neutral-300 p-3.5 text-[9px] font-mono leading-normal max-h-96 overflow-y-auto space-y-3 border-2 border-black">
                  <p className="font-sans font-black text-rose-400 uppercase text-[10px] tracking-wide">
                    ⚠️ CRÍTICO: CÓMO EVITAR "FAILED TO FETCH" / ERROR CORS
                  </p>
                  <ol className="font-sans text-[10px] text-neutral-300 space-y-1.5 list-decimal pl-4">
                    <li>En tu Google Sheet, haz clic en <b>Extensiones</b> &gt; <b>Apps Script</b>.</li>
                    <li>Pega el código de abajo reemplazando todo.</li>
                    <li>Guarda el proyecto, haz clic en el botón <b>Implementar</b> (Deploy) &gt; <b>Nueva implementación</b>.</li>
                    <li>Selecciona tipo: <b>Aplicación web</b>.</li>
                    <li><b>Ejecutar como:</b> seleccionar <b>"Yo"</b> (tu correo).</li>
                    <li><b>Quién tiene acceso:</b> cambiar a <b>"Cualquiera" (Anyone)</b>. ¡Esto es vital para no recibir fallos CORS!</li>
                    <li>Copia la <u>URL de la aplicación web</u> resultante (comienza por <code className="text-yellow-400">https://script.google.com/macros/s/...</code>) y pégala arriba. ¡No uses la URL de edición de la hoja de cálculo!</li>
                  </ol>

                  <p className="font-sans font-bold text-white uppercase text-[9.5px] border-t border-neutral-700 pt-2">CÓDIGO APPS SCRIPT OFICIAL:</p>
                  <pre className="p-1.5 bg-neutral-900 text-green-400 rounded-none overflow-x-auto text-[8.5px]">
{`function doPost(e) {
  try {
    var rawData = e.postData.contents;
    var data = JSON.parse(rawData);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    var hobbiesSheet = ss.getSheetByName("Hobbies") || ss.insertSheet("Hobbies");
    if (hobbiesSheet.getLastRow() === 0) {
      hobbiesSheet.appendRow(["id", "name", "type", "icon", "color", "progress", "status", "created_date"]);
    }
    
    var logsSheet = ss.getSheetByName("Logs") || ss.insertSheet("Logs");
    if (logsSheet.getLastRow() === 0) {
      logsSheet.appendRow(["hobby_id", "date", "done", "progress_snapshot"]);
    }
    
    var existingHobbies = readSheetData(hobbiesSheet);
    var existingLogs = readSheetData(logsSheet);
    
    var localHobbies = data.hobbies || [];
    var localLogs = data.logs || [];
    
    var mergedHobbies = mergeObjects(existingHobbies, localHobbies, "id");
    var mergedLogs = mergeLogs(existingLogs, localLogs);
    
    writeToSheet(hobbiesSheet, ["id", "name", "type", "icon", "color", "progress", "status", "created_date"], mergedHobbies);
    writeToSheet(logsSheet, ["hobby_id", "date", "done", "progress_snapshot"], mergedLogs);
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      hobbies: mergedHobbies,
      logs: mergedLogs
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var hobbiesSheet = ss.getSheetByName("Hobbies") || ss.insertSheet("Hobbies");
    var logsSheet = ss.getSheetByName("Logs") || ss.insertSheet("Logs");
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      hobbies: readSheetData(hobbiesSheet),
      logs: readSheetData(logsSheet)
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function readSheetData(sheet) {
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var values = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
  var list = [];
  for (var i = 0; i < values.length; i++) {
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      var val = values[i][j];
      if (headers[j] === "id" || headers[j] === "hobby_id" || headers[j] === "progress" || headers[j] === "progress_snapshot") {
        val = Number(val);
      } else if (headers[j] === "done") {
        val = (val === true || val === "true");
      }
      obj[headers[j]] = val;
    }
    list.push(obj);
  }
  return list;
}

function writeToSheet(sheet, headers, list) {
  sheet.clear();
  sheet.appendRow(headers);
  if (list.length === 0) return;
  var rows = list.map(item => {
    return headers.map(h => {
      var val = item[h];
      return (val === undefined || val === null) ? "" : val;
    });
  });
  sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
}

function mergeObjects(list1, list2, key) {
  var map = {};
  list1.forEach(item => { map[item[key]] = item; });
  list2.forEach(item => { map[item[key]] = item; });
  return Object.keys(map).map(k => map[k]);
}

function mergeLogs(list1, list2) {
  var map = {};
  list1.forEach(l => { map[l.hobby_id + "_" + l.date] = l; });
  list2.forEach(l => { map[l.hobby_id + "_" + l.date] = l; });
  return Object.keys(map).map(k => map[k]);
}`}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* SECTION 3: SYSTEM RESTORE & RESET */}
        <div className="bg-white border-2 border-black p-3.5 space-y-3" id="reset-group-settings">
          <h3 className="text-xs font-mono font-black uppercase tracking-widest text-neutral-500 border-b border-neutral-100 pb-1.5 flex items-center justify-between">
            <span>Restablecer Semilla</span>
            <Clock className="h-4 w-4" />
          </h3>
          <p className="text-[10px] text-neutral-500 font-medium leading-normal">
            Elimina por completo la base actual y carga el set de demostración de Hábitos recurrentes y Proyectos temporales con rachas preestablecidas.
          </p>
          <button
            onClick={() => setShowResetConfirm(true)}
            className="w-full py-2 bg-red-100 border border-red-500 text-red-950 font-black uppercase tracking-wider text-[10px] cursor-pointer hover:bg-red-200 transition-colors"
          >
            Sustituir por Datos Semilla
          </button>
        </div>

        {/* Live database stats */}
        <div className="bg-neutral-100 border-2 border-black p-3 text-[10px] font-mono leading-relaxed space-y-1 block">
          <div className="flex justify-between">
            <span>HÁBITOS LOGRADOS:</span>
            <span>{hobbies.length}</span>
          </div>
          <div className="flex justify-between">
            <span>REGISTROS HISTÓRICOS:</span>
            <span>{logs.length}</span>
          </div>
          <div className="flex justify-between border-t border-neutral-200 pt-1 mt-1 text-black font-extrabold">
            <span>ESTADO DE MOTOR:</span>
            <span>OFFLINE_LCL_SYNC</span>
          </div>
        </div>
      </div>
    </div>
  );
}
