"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AiJobResult, AiOperationState } from "@crwsync/types";
import { getAiJob, getAiStatus } from "@/services/ai.service";

const POLL_MS = 1500;
const MAX_WAIT_MS = 120_000;

export const aiKeys = {
  all: ["ai"] as const,
  status: () => [...aiKeys.all, "status"] as const,
  job: (workspaceId: string, jobId: string) => [...aiKeys.all, "job", workspaceId, jobId] as const,
};

export type AiPhase = "idle" | "loading" | "done" | "empty" | "failed" | "limited";

class AiRunError extends Error {
  constructor(
    message: string,
    readonly rateLimited: boolean,
  ) {
    super(message);
  }
}

export function useAiStatus() {
  return useQuery({
    queryKey: aiKeys.status(),
    queryFn: async () => {
      const { success, data } = await getAiStatus();
      if (!success || !data) throw new Error("Failed to load AI status");
      return data;
    },
    staleTime: 1000 * 60 * 5,
    retry: false,
  });
}

export function useAiRun(workspaceId: string) {
  const queryClient = useQueryClient();
  const [jobId, setJobId] = useState<string | null>(null);
  const [timedOut, setTimedOut] = useState(false);

  const start = useMutation({
    mutationFn: async (starter: () => Promise<AiOperationState<{ jobId: string }>>) => {
      const res = await starter();
      if (!res.success || !res.data) throw new AiRunError(res.message || "The AI request could not be started", !!res.rateLimited);
      return res.data.jobId;
    },
    onSuccess: (id) => {
      setTimedOut(false);
      setJobId(id);
      queryClient.invalidateQueries({ queryKey: aiKeys.status() });
    },
  });

  const job = useQuery({
    queryKey: aiKeys.job(workspaceId, jobId ?? ""),
    queryFn: async () => {
      const { success, data, message } = await getAiJob(workspaceId, jobId!);
      if (!success || !data) throw new Error(message);
      return data;
    },
    enabled: !!jobId && !timedOut,
    refetchInterval: (query) => (query.state.data && query.state.data.status !== "pending" ? false : POLL_MS),
    gcTime: 0,
  });

  useEffect(() => {
    if (!jobId) return;
    const timer = setTimeout(() => setTimedOut(true), MAX_WAIT_MS);
    return () => clearTimeout(timer);
  }, [jobId]);

  const reset = () => {
    setJobId(null);
    setTimedOut(false);
    start.reset();
  };

  let phase: AiPhase = "idle";
  let message: string | undefined;
  let result: AiJobResult | undefined;

  if (start.isError) {
    phase = start.error instanceof AiRunError && start.error.rateLimited ? "limited" : "failed";
    message = start.error.message;
  } else if (job.data?.status === "done") {
    result = job.data.result;
    phase = result.empty ? "empty" : "done";
  } else if (job.data?.status === "failed") {
    phase = "failed";
    message = job.data.error;
  } else if (job.isError) {
    phase = "failed";
    message = job.error.message;
  } else if (timedOut) {
    phase = "failed";
    message = "This is taking too long. Try again in a moment.";
  } else if (start.isPending || jobId) {
    phase = "loading";
  }

  return { phase, message, result, run: start.mutate, reset };
}

export type AiRun = ReturnType<typeof useAiRun>;
