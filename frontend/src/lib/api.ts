import axios from 'axios';
import { UnifiedSession, DiscoveryState, ScenarioGraph } from '@/types';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Job Queue Types & Helpers ───────────────────────────────────────────────

export interface JobAcceptedResponse {
  job_id: string;
  status: string;
}

export interface JobStatusResponse {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  session_id?: string;
  result?: any;
  error?: string;
}

export const getJobStatus = async (jobId: string): Promise<JobStatusResponse> => {
  const { data } = await api.get(`/api/jobs/${jobId}`);
  return data;
};

export const pollJob = async (jobId: string, intervalMs = 2000): Promise<JobStatusResponse> => {
  while (true) {
    const job = await getJobStatus(jobId);
    if (job.status === 'completed' || job.status === 'failed') {
      return job;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
};

// ─── Pass 1: Discovery Engine ─────────────────────────────────────────────────

export interface CreateSessionResponse {
  session_id: string;
  discovery: DiscoveryState;
}

export const createSession = async (
  rawPrompt: string,
  userName: string = 'anonymous'
): Promise<CreateSessionResponse> => {
  const { data } = await api.post<JobAcceptedResponse>('/api/sessions/create', {
    user_name: userName,
    raw_prompt: rawPrompt,
  });
  
  const completedJob = await pollJob(data.job_id);
  if (completedJob.status === 'failed') {
    throw new Error(completedJob.error || 'Discovery task failed');
  }
  return completedJob.result;
};

// ─── Submit answers + Pass 2 Graph Generation ─────────────────────────────────

export interface GraphGenerationResponse {
  session_id: string;
  scenario_graph: ScenarioGraph;
}

export const submitAnswersAndGenerate = async (
  sessionId: string,
  responses: Record<string, string>
): Promise<GraphGenerationResponse> => {
  const { data } = await api.post<JobAcceptedResponse>(`/api/sessions/${sessionId}/answers`, {
    responses,
  });
  
  const completedJob = await pollJob(data.job_id);
  if (completedJob.status === 'failed') {
    throw new Error(completedJob.error || 'Graph generation failed');
  }
  return completedJob.result;
};

// ─── Get full session state ───────────────────────────────────────────────────

export const getSession = async (sessionId: string): Promise<UnifiedSession> => {
  const { data } = await api.get(`/api/sessions/${sessionId}`);
  return data;
};

// ─── What-if Graph Expansion ──────────────────────────────────────────────────

export interface WhatIfResponse {
  session_id: string;
  target_node_id: string;
  scenario_graph: ScenarioGraph;
}

export const expandWhatIf = async (
  sessionId: string,
  targetNodeId: string,
  whatIfQuery: string
): Promise<WhatIfResponse> => {
  const { data } = await api.post<JobAcceptedResponse>(`/api/sessions/${sessionId}/whatif`, {
    target_node_id: targetNodeId,
    what_if_query: whatIfQuery,
  });
  
  const completedJob = await pollJob(data.job_id);
  if (completedJob.status === 'failed') {
    throw new Error(completedJob.error || 'What-if expansion failed');
  }
  return completedJob.result;
};

