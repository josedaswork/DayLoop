/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Hobby, HobbyLog } from '../types';
import { getLocalDateString } from './hobbyUtils';

export function getInitialHobbies(): Hobby[] {
  const todayStr = getLocalDateString();
  
  // Go back 90 days to set creation dates
  const dateGoBack = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return getLocalDateString(d);
  };

  return [
    {
      id: 1,
      name: "Tocar la Guitarra",
      type: "recurring",
      icon: "🎸",
      color: "#2563eb", // blue-600
      progress: 0,
      status: "active",
      createdDate: dateGoBack(60) // 60 days ago
    },
    {
      id: 2,
      name: "Correr Matutino",
      type: "recurring",
      icon: "🏃",
      color: "#ea580c", // orange-600
      progress: 0,
      status: "active",
      createdDate: dateGoBack(45) // 45 days ago
    },
    {
      id: 3,
      name: "Aprender TypeScript",
      type: "temporary",
      icon: "💻",
      color: "#0891b2", // cyan-600
      progress: 75,
      status: "active",
      createdDate: dateGoBack(15) // 15 days ago
    },
    {
      id: 4,
      name: "Meditar 10 min",
      type: "recurring",
      icon: "🧘",
      color: "#16a34a", // green-600
      progress: 0,
      status: "active",
      createdDate: dateGoBack(30) // 30 days ago
    }
  ];
}

export function generateInitialLogs(hobbies: Hobby[]): HobbyLog[] {
  const logs: HobbyLog[] = [];
  const today = new Date();
  let logId = 1;

  hobbies.forEach(hobby => {
    const createdDate = new Date(hobby.createdDate);
    const runDate = new Date(createdDate);

    // Loop from creation date to today
    while (runDate <= today) {
      const dateStr = getLocalDateString(runDate);
      
      if (hobby.type === 'recurring') {
        // Recurring hobby log creation with specific mock completion rates
        let done = false;
        
        if (hobby.id === 1) {
          // Guitar: completed 65% of the time, higher on weekends
          const isWeekend = runDate.getDay() === 0 || runDate.getDay() === 6;
          done = Math.random() < (isWeekend ? 0.85 : 0.55);
        } else if (hobby.id === 2) {
          // Running: completed 50% of the time, alternating days mostly
          done = runDate.getDate() % 2 === 0 && Math.random() < 0.85;
        } else if (hobby.id === 4) {
          // Meditating: completed 75% of the time (very steady)
          done = Math.random() < 0.75;
        }

        // Leave today uncompleted initially to let user toggle it
        if (dateStr === getLocalDateString()) {
          done = false;
        }

        logs.push({
          id: logId++,
          hobbyId: hobby.id,
          date: dateStr,
          done: done,
          progressSnapshot: 0
        });
      } else {
        // For temporary project: log a snapshot on some days
        const skipLog = Math.random() < 0.6;
        if (!skipLog && dateStr !== getLocalDateString()) {
          // Calculate linear scaling progress snapshot
          const diffDays = Math.floor((runDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
          const mockProg = Math.min(hobby.progress, Math.floor((diffDays / 15) * 75) + Math.floor(Math.random() * 10));
          logs.push({
            id: logId++,
            hobbyId: hobby.id,
            date: dateStr,
            done: true,
            progressSnapshot: mockProg
          });
        }
      }

      runDate.setDate(runDate.getDate() + 1);
    }
  });

  return logs;
}
