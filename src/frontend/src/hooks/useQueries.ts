import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ChecklistTemplate, Machine, PMPlan, PMRecord } from "../backend";
import { useActor } from "./useActor";

export function useGetAllMachines() {
  const { actor, isFetching } = useActor();
  return useQuery<Machine[]>({
    queryKey: ["machines"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllMachines();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetPMRecords() {
  const { actor, isFetching } = useActor();
  return useQuery<PMRecord[]>({
    queryKey: ["pmrecords"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllPMRecords();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetTodaysPlan(month: bigint) {
  const { actor, isFetching } = useActor();
  return useQuery<PMPlan[]>({
    queryKey: ["todaysplan", month.toString()],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getTodaysPlan(month);
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetChecklistTemplate(id: string) {
  const { actor, isFetching } = useActor();
  return useQuery<ChecklistTemplate>({
    queryKey: ["checklist-template", id],
    queryFn: async () => {
      if (!actor) throw new Error("No actor");
      return actor.getChecklistTemplate(id);
    },
    enabled: !!actor && !isFetching && !!id,
  });
}

export function useAddMachine() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (machine: Machine) => {
      if (!actor) throw new Error("No actor");
      return actor.addMachine(machine);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["machines"] }),
  });
}

export function useSubmitPMRecord() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (record: PMRecord) => {
      if (!actor) throw new Error("No actor");
      return actor.submitPMRecord(record);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pmrecords"] }),
  });
}

export function useAddChecklistTemplate() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (template: ChecklistTemplate) => {
      if (!actor) throw new Error("No actor");
      return actor.addChecklistTemplate(template);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["checklist-template"] }),
  });
}

export function useAddPMPlan() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (plan: PMPlan) => {
      if (!actor) throw new Error("No actor");
      return actor.addPMPlan(plan);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["todaysplan"] }),
  });
}
