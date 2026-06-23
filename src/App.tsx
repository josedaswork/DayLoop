/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  AlertCircle, 
  CheckCircle 
} from 'lucide-react';

// Import child mobile views
import HobbyHome from './components/HobbyHome';
import HobbyDetail from './components/HobbyDetail';
import HobbyStats from './components/HobbyStats';
import HobbyForm from './components/HobbyForm';
import HobbyArchive from './components/HobbyArchive';
import HobbySettings from './components/HobbySettings';

// Import Types
import { Hobby, HobbyLog } from './types';

// Import Utilities
import { getLocalDateString } from './utils/hobbyUtils';
import { getInitialHobbies, generateInitialLogs } from './utils/dummyData';

export default function App() {
  const [platform, setPlatform] = useState<'web' | 'capacitor-ios' | 'capacitor-android'>('web');

  // Master local storage databases
  const [hobbies, setHobbies] = useState<Hobby[]>([]);
  const [logs, setLogs] = useState<HobbyLog[]>([]);

  // Remote sheets synchronization
  const [syncUrl, setSyncUrl] = useState<string>('');
  const [syncLoading, setSyncLoading] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<string>('Listo');

  // Emulator navigator state
  const [activeMobileView, setActiveMobileView] = useState<'home' | 'detail' | 'stats' | 'new' | 'edit' | 'archive' | 'settings'>('home');
  const [selectedHobbyDetailId, setSelectedHobbyDetailId] = useState<number | null>(null);

  // General notification banner
  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Direct Capacitor console log emulator internally
  const [capacitorLogs, setCapacitorLogs] = useState<string[]>([]);

  // 1. Initial State Seed Loading
  useEffect(() => {
    const cachedHobbies = localStorage.getItem('dayloop_hobbies');
    const cachedLogs = localStorage.getItem('dayloop_logs');
    const cachedSyncUrl = localStorage.getItem('dayloop_sync_url');

    if (cachedSyncUrl) {
      setSyncUrl(cachedSyncUrl);
    }

    if (cachedHobbies && cachedLogs) {
      try {
        setHobbies(JSON.parse(cachedHobbies));
        setLogs(JSON.parse(cachedLogs));
      } catch (e) {
        loadStarterSeed();
      }
    } else {
      loadStarterSeed();
    }
  }, []);

  const loadStarterSeed = () => {
    const defaultHobbies = getInitialHobbies();
    const defaultLogs = generateInitialLogs(defaultHobbies);
    
    setHobbies(defaultHobbies);
    setLogs(defaultLogs);
    
    localStorage.setItem('dayloop_hobbies', JSON.stringify(defaultHobbies));
    localStorage.setItem('dayloop_logs', JSON.stringify(defaultLogs));
    
    addCapacitorLog('Seed Loader: Cargados datos iniciales de demostración con rachas activas.');
  };

  // Helper for Capacitor bridge logs
  const addCapacitorLog = (msg: string) => {
    console.log(`[Capacitor Dayloop] ${msg}`);
    setCapacitorLogs((prev) => [`[${new Date().toLocaleTimeString('es')}] ${msg}`, ...prev.slice(0, 15)]);
  };

  // General notification trigger
  const triggerNotification = (text: string, type: 'success' | 'info' | 'error') => {
    setNotification({ text, type });
    setTimeout(() => {
      setNotification(null);
    }, 4500);
  };

  // Synchronize master changes to localStorage
  const handleSetHobbies = (updatedHobbies: Hobby[]) => {
    setHobbies(updatedHobbies);
    localStorage.setItem('dayloop_hobbies', JSON.stringify(updatedHobbies));
  };

  const handleSetLogs = (updatedLogs: HobbyLog[]) => {
    setLogs(updatedLogs);
    localStorage.setItem('dayloop_logs', JSON.stringify(updatedLogs));
  };

  // Trigger simulated haptic click using browser vibrations if possible
  const hapticVibratorBuzz = () => {
    try {
      if ('vibrate' in navigator) {
        navigator.vibrate(120);
      }
    } catch (e) {
      // Ignored
    }
  };

  // Navigation Swapper
  const handleNavigatorSwap = (view: 'home' | 'detail' | 'stats' | 'new' | 'edit' | 'archive' | 'settings', id?: number) => {
    if (id !== undefined) {
      setSelectedHobbyDetailId(id);
    }
    setActiveMobileView(view);
    addCapacitorLog(`Navegación: Pantalla cambiada a [${view.toUpperCase()}]`);
  };

  // CORE METRIC ENGINE ACTIONS:
  // Toggle recurring hobby completion status for Today
  const handleToggleTodayLog = (hobby: Hobby) => {
    const todayStr = getLocalDateString();
    const wasDone = logs.some(l => l.hobbyId === hobby.id && l.date === todayStr && l.done);
    let updatedLogs: HobbyLog[] = [];

    const existingLogIndex = logs.findIndex(l => l.hobbyId === hobby.id && l.date === todayStr);

    if (existingLogIndex !== -1) {
      updatedLogs = [...logs];
      updatedLogs[existingLogIndex] = {
        ...updatedLogs[existingLogIndex],
        done: !wasDone
      };
    } else {
      updatedLogs = [
        ...logs,
        {
          id: Date.now() + Math.floor(Math.random() * 1000),
          hobbyId: hobby.id,
          date: todayStr,
          done: true,
          progressSnapshot: 0
        }
      ];
    }

    handleSetLogs(updatedLogs);

    // Simulated Capacitor Plugins action response
    hapticVibratorBuzz();
    addCapacitorLog(`Capacitor Vibrate triggered successfully 📳`);
    
    triggerNotification(
      `Hábito "${hobby.name}" marcado como ${!wasDone ? 'completado para hoy' : 'de vuelta en progreso'}`, 
      'success'
    );
  };

  // Toggle log for detail heatmap date cells
  const handleToggleLogForDate = (hobbyId: number, dateStr: string) => {
    const wasDone = logs.some(l => l.hobbyId === hobbyId && l.date === dateStr && l.done);
    let updatedLogs: HobbyLog[] = [];
    
    const existingIndex = logs.findIndex(l => l.hobbyId === hobbyId && l.date === dateStr);

    if (existingIndex !== -1) {
      updatedLogs = [...logs];
      updatedLogs[existingIndex] = {
        ...updatedLogs[existingIndex],
        done: !wasDone
      };
    } else {
      updatedLogs = [
        ...logs,
        {
          id: Date.now() + Math.floor(Math.random() * 1000),
          hobbyId,
          date: dateStr,
          done: true,
          progressSnapshot: 0
        }
      ];
    }
    handleSetLogs(updatedLogs);
    hapticVibratorBuzz();
  };

  // Update slider percentage for temporary projects
  const handleUpdateProgressSnapshot = (hobbyId: number, progressVal: number) => {
    // 1. Update Hobby progress
    const updatedHobbies = hobbies.map(h => {
      if (h.id === hobbyId) {
        return {
          ...h,
          progress: progressVal,
          status: (progressVal >= 100 ? 'completed' : 'active') as Hobby['status']
        };
      }
      return h;
    });
    handleSetHobbies(updatedHobbies);

    // 2. Append log record snapshot for today
    const todayStr = getLocalDateString();
    let updatedLogs = [...logs];
    const logIndex = logs.findIndex(l => l.hobbyId === hobbyId && l.date === todayStr);

    if (logIndex !== -1) {
      updatedLogs[logIndex] = {
        ...updatedLogs[logIndex],
        done: true,
        progressSnapshot: progressVal
      };
    } else {
      updatedLogs.push({
        id: Date.now() + Math.floor(Math.random() * 1000),
        hobbyId,
        date: todayStr,
        done: true,
        progressSnapshot: progressVal
      });
    }
    handleSetLogs(updatedLogs);

    if (progressVal >= 100) {
      hapticVibratorBuzz();
      addCapacitorLog(`🎉 Meta alcanzada! El proyecto temporal #${hobbyId} se ha completado al 100%!`);
      triggerNotification('¡Enhorabuena! Has coronado el progreso al 100%', 'success');
    }
  };

  // Create new hobby card
  const handleCreateHobby = (name: string, type: 'recurring' | 'temporary', icon: string, color: string) => {
    const todayStr = getLocalDateString();
    const newHobby: Hobby = {
      id: hobbies.length > 0 ? Math.max(...hobbies.map(h => h.id)) + 1 : 1,
      name,
      type,
      icon,
      color,
      progress: 0,
      status: 'active',
      createdDate: todayStr
    };

    const nextHobbies = [...hobbies, newHobby];
    handleSetHobbies(nextHobbies);

    triggerNotification(`Hábito "${name}" registrado correctamente en la lista`, 'success');
  };

  // Save edits on a hobby card
  const handleUpdateHobbyDetails = (id: number, name: string, type: 'recurring' | 'temporary', icon: string, color: string) => {
    const updated = hobbies.map(h => {
      if (h.id === id) {
        return { ...h, name, type, icon, color };
      }
      return h;
    });
    handleSetHobbies(updated);
    triggerNotification('Se han guardado las modificaciones del hábito', 'success');
  };

  // Archive a hobby status
  const handleArchiveHobby = (id: number) => {
    const updated = hobbies.map(h => {
      if (h.id === id) {
        return { ...h, status: 'archived' as const };
      }
      return h;
    });
    handleSetHobbies(updated);
    triggerNotification('Hábito archivado con éxito en la papelera', 'info');
  };

  // Restore archived hobby
  const handleReactivateHobby = (id: number) => {
    const updated = hobbies.map(h => {
      if (h.id === id) {
        return { ...h, status: 'active' as const };
      }
      return h;
    });
    handleSetHobbies(updated);
    triggerNotification('Hábito restaurado e incorporado activo en inicio', 'success');
  };

  // Wipe hobby and cleans logs
  const handleDeleteHobby = (id: number) => {
    const filteredHobbies = hobbies.filter(h => h.id !== id);
    const filteredLogs = logs.filter(l => l.hobbyId !== id);
    handleSetHobbies(filteredHobbies);
    handleSetLogs(filteredLogs);
    triggerNotification('Hábito eliminado permanentemente', 'info');
  };

  // Remote sheets backend Apps Script Sync REST triggers
  const handleCloudSync = async (mode: 'upload' | 'download' = 'upload') => {
    if (!syncUrl) {
      triggerNotification('URL de Google Apps Script no configurada', 'error');
      return;
    }

    setSyncLoading(true);
    setSyncStatus(mode === 'upload' ? 'Subiendo...' : 'Bajando...');
    addCapacitorLog(`Cloud Sync: Conectando con servidor Apps Script REST para ${mode === 'upload' ? 'subir' : 'descargar'}...`);

    try {
      let response;
      if (mode === 'upload') {
        response = await fetch(syncUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'text/plain;charset=utf-8'
          },
          body: JSON.stringify({
            hobbies: hobbies.map(h => ({
              id: h.id,
              name: h.name,
              type: h.type,
              icon: h.icon,
              color: h.color,
              progress: h.progress,
              status: h.status,
              created_date: h.createdDate
            })),
            logs: logs.map(l => ({
              id: l.id,
              hobby_id: l.hobbyId,
              date: l.date,
              done: l.done ? 1 : 0,
              progress_snapshot: l.progressSnapshot
            }))
          })
        });
      } else {
        response = await fetch(syncUrl, {
          method: 'GET'
        });
      }

      if (!response.ok) {
        throw new Error(`Servidor retorno código HTTP ${response.status}`);
      }

      const responseObj = await response.json();
      
      if (responseObj.success) {
        const rawHobbies = responseObj.hobbies || [];
        const rawLogs = responseObj.logs || [];

        const backendHobbies: Hobby[] = rawHobbies.map((h: any) => ({
          id: Number(h.id),
          name: String(h.name),
          type: String(h.type) as Hobby['type'],
          icon: String(h.icon || '🎯'),
          color: String(h.color || '#4f46e5'),
          progress: Number(h.progress || 0),
          status: String(h.status || 'active') as Hobby['status'],
          createdDate: String(h.createdDate || h.created_date || getLocalDateString())
        }));

        const backendLogs: HobbyLog[] = rawLogs.map((l: any) => ({
          id: Number(l.id || (Math.random() * 100000)),
          hobbyId: Number(l.hobbyId || l.hobby_id),
          date: String(l.date),
          done: l.done === 1 || l.done === true,
          progressSnapshot: Number(l.progressSnapshot || l.progress_snapshot || 0)
        }));

        handleSetHobbies(backendHobbies);
        handleSetLogs(backendLogs);

        setSyncStatus('Sincronizado');
        if (mode === 'upload') {
          addCapacitorLog(`Cloud Sync: Se subieron y fusionaron los cambios correctamente con Google Sheets.`);
          triggerNotification('¡Datos locales subidos y respaldados con Google Sheets!', 'success');
        } else {
          addCapacitorLog(`Cloud Sync: Se descargaron los datos de Google Sheets de forma exitosa.`);
          triggerNotification('¡Datos de Google Sheets descargados con éxito!', 'success');
        }
      } else {
        throw new Error(responseObj.message || 'Error de procesamiento en Apps Script');
      }
    } catch (err: any) {
      console.error(err);
      setSyncStatus('Error');
      addCapacitorLog(`Cloud Sync [Error]: Fallo de conexión REST. ${err.message || ''}`);
      triggerNotification(`Error de Sync: ${err.message || 'Sin respuesta del script remotos y CORS.'}`, 'error');
    } finally {
      setSyncLoading(false);
    }
  };

  const handleSaveSyncUrl = (newUrl: string) => {
    setSyncUrl(newUrl);
    localStorage.setItem('dayloop_sync_url', newUrl);
  };

  return (
    <div className="min-h-screen bg-[#f3f3ee] flex items-center justify-center font-sans text-neutral-900 select-none antialiased sm:p-4" id="app-root-container">
      {/* Absolute top notification toast for high aesthetic weight inside/above the viewport */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -40, scale: 0.95 }}
            className={`fixed top-4 z-[999] max-w-[340px] w-full mx-auto p-3 border-2 border-black flex items-center justify-between shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] rounded-none ${
              notification.type === 'success' ? 'bg-[#ffffcc] text-black border-black' :
              notification.type === 'error' ? 'bg-red-50 border-red-500 text-red-950' :
              'bg-blue-50 border-blue-500 text-blue-950'
            }`}
            id="global-toast-banner"
          >
            <div className="flex items-center space-x-2.5 text-[11px] font-black uppercase tracking-wider">
              <AlertCircle className="h-4.5 w-4.5 shrink-0" />
              <span>{notification.text}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Visual Smartphone Emulator body frame, centered as a dedicated client on desktop, completely responsive full screen on true mobile */}
      <div 
        className="w-full h-screen sm:h-[780px] sm:max-w-[395px] sm:aspect-[9/19] bg-black sm:border-[10px] sm:border-black sm:rounded-[48px] sm:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden flex flex-col"
        id="phone-emulator-frame"
      >
        {/* Outer screen top notches, camera and speaker mockups only visible on desktop view */}
        <div className="hidden sm:flex absolute top-2 left-1/2 transform -translate-x-1/2 w-32 h-5 bg-black rounded-b-2xl z-50 items-center justify-center">
          {/* Speaker line */}
          <div className="w-12 h-1 bg-neutral-800 rounded-full" />
          {/* Camera dot */}
          <div className="w-2.5 h-2.5 bg-neutral-900 rounded-full ml-3 border border-neutral-800" />
        </div>
        
        {/* Physical Side button mockups only visible on screens matching desktop */}
        <div className="hidden sm:block absolute left-[-11px] top-24 w-1 h-14 bg-neutral-800 rounded-r-lg" />
        <div className="hidden sm:block absolute left-[-11px] top-44 w-1.5 h-12 bg-neutral-800 rounded-r-lg" />
        <div className="hidden sm:block absolute right-[-11px] top-32 w-1.5 h-16 bg-neutral-800 rounded-l-lg" />

        {/* ACTIVE MOBILE ROUTE INJECTED CONTAINER */}
        <div className="flex-1 bg-[#f9f9f7] overflow-hidden relative z-10" id="phone-screen-container">
          <AnimatePresence mode="wait">
            {activeMobileView === 'home' && (
              <motion.div 
                key="home" 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }}
                className="h-full"
              >
                <HobbyHome 
                  hobbies={hobbies}
                  logs={logs}
                  onToggleTodayLog={handleToggleTodayLog}
                  onUpdateProgress={handleUpdateProgressSnapshot}
                  onNavigate={handleNavigatorSwap}
                  syncUrl={syncUrl}
                  onSync={() => handleCloudSync('upload')}
                  syncLoading={syncLoading}
                  syncStatus={syncStatus}
                />
              </motion.div>
            )}

            {activeMobileView === 'detail' && selectedHobbyDetailId !== null && (
              <motion.div 
                key="detail" 
                initial={{ opacity: 0, x: 20 }} 
                animate={{ opacity: 1, x: 0 }} 
                exit={{ opacity: 0, x: -25 }}
                className="h-full"
              >
                <HobbyDetail 
                  hobbyId={selectedHobbyDetailId}
                  hobbies={hobbies}
                  logs={logs}
                  onToggleLogForDate={handleToggleLogForDate}
                  onNavigate={handleNavigatorSwap}
                  onArchive={handleArchiveHobby}
                  onDelete={handleDeleteHobby}
                  onAddLog={addCapacitorLog}
                />
              </motion.div>
            )}

            {activeMobileView === 'stats' && (
              <motion.div 
                key="stats" 
                initial={{ opacity: 0, y: 15 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0, y: -15 }}
                className="h-full"
              >
                <HobbyStats 
                  hobbies={hobbies}
                  logs={logs}
                  onNavigate={handleNavigatorSwap}
                />
              </motion.div>
            )}

            {activeMobileView === 'new' && (
              <motion.div 
                key="new" 
                initial={{ opacity: 0, y: 30 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0, y: -30 }}
                className="h-full"
              >
                <HobbyForm 
                  hobbies={hobbies}
                  onCreateHobby={handleCreateHobby}
                  onUpdateHobbyDetails={handleUpdateHobbyDetails}
                  onNavigate={handleNavigatorSwap}
                  onAddLog={addCapacitorLog}
                />
              </motion.div>
            )}

            {activeMobileView === 'edit' && selectedHobbyDetailId !== null && (
              <motion.div 
                key="edit" 
                initial={{ opacity: 0, y: 30 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0, y: -30 }}
                className="h-full"
              >
                <HobbyForm 
                  editHobbyId={selectedHobbyDetailId}
                  hobbies={hobbies}
                  onCreateHobby={handleCreateHobby}
                  onUpdateHobbyDetails={handleUpdateHobbyDetails}
                  onNavigate={handleNavigatorSwap}
                  onAddLog={addCapacitorLog}
                />
              </motion.div>
            )}

            {activeMobileView === 'archive' && (
              <motion.div 
                key="archive" 
                initial={{ opacity: 0, x: -20 }} 
                animate={{ opacity: 1, x: 0 }} 
                exit={{ opacity: 0, x: 20 }}
                className="h-full"
              >
                <HobbyArchive 
                  hobbies={hobbies}
                  onReactivate={handleReactivateHobby}
                  onDelete={handleDeleteHobby}
                  onNavigate={handleNavigatorSwap}
                  onAddLog={addCapacitorLog}
                />
              </motion.div>
            )}

            {activeMobileView === 'settings' && (
              <motion.div 
                key="settings" 
                initial={{ opacity: 0, scale: 0.95 }} 
                animate={{ opacity: 1, scale: 1 }} 
                exit={{ opacity: 0, scale: 0.95 }}
                className="h-full"
              >
                <HobbySettings 
                  hobbies={hobbies}
                  setHobbies={handleSetHobbies}
                  logs={logs}
                  setLogs={handleSetLogs}
                  syncUrl={syncUrl}
                  setSyncUrl={handleSaveSyncUrl}
                  onSyncTrigger={handleCloudSync}
                  syncLoading={syncLoading}
                  syncStatus={syncStatus}
                  onLoadStarterSeed={loadStarterSeed}
                  onNavigate={handleNavigatorSwap}
                  onAddLog={addCapacitorLog}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Bottom Phone bezel handle bar only visible on desktop viewports */}
        <div className="hidden sm:block absolute bottom-1.5 left-1/2 transform -translate-x-1/2 w-32 h-1 bg-neutral-900 rounded-full z-30" />
      </div>
    </div>
  );
}
