"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "./api";

export function useProjects() {
  return useQuery({
    queryKey: ["projects"],
    queryFn: () => api.listProjects(),
  });
}

export function useProject(id: string) {
  return useQuery({
    queryKey: ["projects", id],
    queryFn: () => api.getProject(id),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "created" || status === "parsing" ? 2000 : false;
    },
  });
}

export function useJob(id: string | null) {
  return useQuery({
    queryKey: ["jobs", id],
    queryFn: () => api.getJob(id!),
    enabled: Boolean(id),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "queued" || status === "processing" ? 2000 : false;
    },
  });
}

export function useNotes(id: string, enabled: boolean, difficulty = "original") {
  return useQuery({
    queryKey: ["projects", id, "notes", difficulty],
    queryFn: () => api.getNotes(id, difficulty),
    enabled,
    staleTime: Infinity, // notes are immutable per parse version
  });
}

export function useSettings(id: string) {
  return useQuery({
    queryKey: ["projects", id, "settings"],
    queryFn: () => api.getSettings(id),
  });
}

export function usePatchSettings(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: Parameters<typeof api.patchSettings>[1]) =>
      api.patchSettings(id, patch),
    onSuccess: (settings) =>
      queryClient.setQueryData(["projects", id, "settings"], settings),
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteProject(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["projects"] }),
  });
}
