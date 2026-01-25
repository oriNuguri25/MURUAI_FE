import { create } from "zustand";
import type { Schedule } from "../model/schedule.model";

interface ScheduleStore {
  editingSchedule: Schedule | null;
  setEditingSchedule: (schedule: Schedule | null) => void;
}

export const useScheduleStore = create<ScheduleStore>((set) => ({
  editingSchedule: null,
  setEditingSchedule: (schedule) => { set({ editingSchedule: schedule }); },
}));
