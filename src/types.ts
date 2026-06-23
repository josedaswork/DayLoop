/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Hobby {
  id: number;
  name: string;
  type: 'recurring' | 'temporary';
  icon: string; // Emoji
  color: string; // Hex color
  progress: number; // 0-100 (for temporary)
  status: 'active' | 'archived' | 'completed';
  createdDate: string; // YYYY-MM-DD
}

export interface HobbyLog {
  id: number;
  hobbyId: number;
  date: string; // YYYY-MM-DD
  done: boolean;
  progressSnapshot: number; // 0-100
}

export interface DemoItem {
  id: string;
  fecha: string;
  categoria: string;
  titulo: string;
  valor: number;
  estado: "Pendiente" | "Completado" | "En Progreso";
}

export interface BuildStep {
  name: string;
  status: "idle" | "running" | "success" | "failed";
  duration: string;
  logs: string[];
}

export interface WorkflowConfig {
  filename: string;
  yamlContent: string;
}
