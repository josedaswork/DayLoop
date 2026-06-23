/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Hobby, HobbyLog } from '../types';

// Helper to get formatted string for today (YYYY-MM-DD) in local time
export function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Convert string back to local Date object (safely avoiding timezone shifts)
export function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

// Generates lists of weeks, each week is an array of 7 string dates (YYYY-MM-DD), starting on Monday
// This is used for the 4-month (16 weeks) detail heatmap
export function getCalendarWeeks(numWeeks: number = 16): string[][] {
  const weeks: string[][] = [];
  const today = new Date();
  
  // Find current day of week (0: Sunday, 1: Monday, ... 6: Saturday)
  // Shift so 0 is Monday, 1 is Tuesday ... 6 is Sunday
  let currentDayOfWeek = today.getDay();
  currentDayOfWeek = currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1; // 0 index is Monday now
  
  // Start date of the grid: Monday of 'numWeeks - 1' ago
  const startOffset = (numWeeks - 1) * 7 + currentDayOfWeek;
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - startOffset);
  
  // Generate date strings
  let runDate = new Date(startDate);
  for (let w = 0; w < numWeeks; w++) {
    const week: string[] = [];
    for (let d = 0; d < 7; d++) {
      week.push(getLocalDateString(runDate));
      runDate.setDate(runDate.getDate() + 1);
    }
    weeks.push(week);
  }
  
  return weeks;
}

// Generates a list of last 90 dates in chronological order (for the intensity grid)
export function getLast90Days(): string[] {
  const dates: string[] = [];
  const runDate = new Date();
  runDate.setDate(runDate.getDate() - 89); // Go back 89 days
  
  for (let i = 0; i < 90; i++) {
    dates.push(getLocalDateString(runDate));
    runDate.setDate(runDate.getDate() + 1);
  }
  
  return dates;
}

// Calculate consistency percentage: (logged days) / (possible days from createdDate to today) * 100
export function calculateConsistency(hobby: Hobby, logs: HobbyLog[]): number {
  if (hobby.type === 'temporary') {
    return hobby.progress;
  }
  
  const todayStr = getLocalDateString();
  const createdStr = hobby.createdDate;
  
  if (createdStr > todayStr) return 0;
  
  const createdDate = parseLocalDate(createdStr);
  const todayDate = parseLocalDate(todayStr);
  
  // Calculate day difference (inclusive)
  const diffTime = todayDate.getTime() - createdDate.getTime();
  const possibleDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
  
  if (possibleDays <= 0) return 0;
  
  // Count how many of these days were completed
  const hobbyLogsObj = logs.filter(l => l.hobbyId === hobby.id && l.done);
  const loggedDoneCount = hobbyLogsObj.filter(l => l.date >= createdStr && l.date <= todayStr).length;
  
  return Math.min(100, Math.round((loggedDoneCount / possibleDays) * 100));
}

// Calculate current streak and longest streak of active logged completions
export function calculateStreaks(hobbyId: number, logs: HobbyLog[]): { currentStreak: number; maxStreak: number } {
  const doneDates = Array.from(
    new Set(
      logs
        .filter(l => l.hobbyId === hobbyId && l.done)
        .map(l => l.date)
    )
  ).sort(); // chronological order ascending
  
  if (doneDates.length === 0) {
    return { currentStreak: 0, maxStreak: 0 };
  }
  
  let maxStreak = 0;
  let currentStreak = 0;
  
  // Calculate longest streak
  let activeStreakSeq = 0;
  let lastDate: Date | null = null;
  
  for (let i = 0; i < doneDates.length; i++) {
    const curDate = parseLocalDate(doneDates[i]);
    
    if (lastDate === null) {
      activeStreakSeq = 1;
    } else {
      const diffMs = curDate.getTime() - lastDate.getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        // Continuous day
        activeStreakSeq += 1;
      } else if (diffDays > 1) {
        // Broken streak
        if (activeStreakSeq > maxStreak) {
          maxStreak = activeStreakSeq;
        }
        activeStreakSeq = 1;
      }
    }
    lastDate = curDate;
  }
  
  if (activeStreakSeq > maxStreak) {
    maxStreak = activeStreakSeq;
  }
  
  // Calculate current streak (ending at today or yesterday)
  const todayStr = getLocalDateString();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = getLocalDateString(yesterday);
  
  const hasLoggedToday = doneDates.includes(todayStr);
  const hasLoggedYesterday = doneDates.includes(yesterdayStr);
  
  if (!hasLoggedToday && !hasLoggedYesterday) {
    currentStreak = 0;
  } else {
    // Traverse backwards starting from today (or yesterday if today isn't logged yet)
    let checkDateObj = hasLoggedToday ? new Date() : yesterday;
    let checkStr = getLocalDateString(checkDateObj);
    
    while (doneDates.includes(checkStr)) {
      currentStreak += 1;
      checkDateObj.setDate(checkDateObj.getDate() - 1);
      checkStr = getLocalDateString(checkDateObj);
    }
  }
  
  return {
    currentStreak,
    maxStreak: Math.max(maxStreak, currentStreak)
  };
}
