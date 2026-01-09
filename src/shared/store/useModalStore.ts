import { create } from "zustand";

type ModalType =
  | "addUser"
  | "addGroup"
  | "editUser"
  | "editGroup"
  | "addSchedule"
  | "auth"
  | null;

interface ModalStore {
  openModal: ModalType;
  selectedUserId: string | null;
  selectedGroupId: string | null;
  openAddUserModal: () => void;
  openAddGroupModal: () => void;
  openEditUserModal: (userId: string) => void;
  openEditGroupModal: (groupId: string) => void;
  openAddScheduleModal: () => void;
  openAuthModal: () => void;
  closeModal: () => void;
}

export const useModalStore = create<ModalStore>((set) => ({
  openModal: null,
  selectedUserId: null,
  selectedGroupId: null,
  openAddUserModal: () =>
    set({ openModal: "addUser", selectedUserId: null, selectedGroupId: null }),
  openAddGroupModal: () =>
    set({ openModal: "addGroup", selectedUserId: null, selectedGroupId: null }),
  openEditUserModal: (userId) =>
    set({ openModal: "editUser", selectedUserId: userId }),
  openEditGroupModal: (groupId) =>
    set({ openModal: "editGroup", selectedGroupId: groupId }),
  openAddScheduleModal: () => set({ openModal: "addSchedule" }),
  openAuthModal: () => set({ openModal: "auth" }),
  closeModal: () =>
    set({ openModal: null, selectedUserId: null, selectedGroupId: null }),
}));
