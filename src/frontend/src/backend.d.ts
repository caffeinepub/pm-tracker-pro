import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface ChecklistTemplate {
    id: string;
    items: Array<ChecklistItem>;
    machineType: string;
}
export interface PMPlan {
    month: bigint;
    checklistTemplateId: string;
    frequency: string;
    machineId: string;
}
export interface PMRecord {
    id: string;
    completedDate: bigint;
    status: string;
    operatorName: string;
    operatorId: string;
    machineId: string;
    checklistResults: Array<ChecklistResult>;
}
export interface Machine {
    id: string;
    name: string;
    department: string;
    location: string;
    machineType: string;
}
export interface ChecklistItem {
    id: string;
    description: string;
    itemType: string;
}
export interface ChecklistResult {
    photoFilename: string;
    remark: string;
    itemId: string;
    value: string;
}
export interface UserProfile {
    name: string;
    role: string;
}
export enum Order {
    less = "less",
    equal = "equal",
    greater = "greater"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    addChecklistTemplate(template: ChecklistTemplate): Promise<void>;
    addMachine(machine: Machine): Promise<void>;
    addPMPlan(plan: PMPlan): Promise<void>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    compareText(a: string, b: string): Promise<Order>;
    deleteMachine(id: string): Promise<void>;
    getAllMachines(): Promise<Array<Machine>>;
    getAllPMRecords(): Promise<Array<PMRecord>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getChecklistTemplate(id: string): Promise<ChecklistTemplate>;
    getTodaysPlan(currentMonth: bigint): Promise<Array<PMPlan>>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    isCallerAdmin(): Promise<boolean>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    submitPMRecord(record: PMRecord): Promise<void>;
}
