import { create } from "zustand";

type ModalType = "addUser" | "addGroup" | "addSchedule" | "auth" | null;

interface ModalStore {
  openModal: ModalType;
  openAddUserModal: () => void;
  openAddGroupModal: () => void;
  openAddScheduleModal: () => void;
  openAuthModal: () => void;
  closeModal: () => void;
}

export const useModalStore = create<ModalStore>((set) => ({
  openModal: null,
  openAddUserModal: () => set({ openModal: "addUser" }),
  openAddGroupModal: () => set({ openModal: "addGroup" }),
  openAddScheduleModal: () => set({ openModal: "addSchedule" }),
  openAuthModal: () => set({ openModal: "auth" }),
  closeModal: () => set({ openModal: null }),
}));
