import axios from 'axios';
import { UnifiedSession, DiscoveryState, ScenarioGraph } from '@/types';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Pass 1: Discovery Engine ─────────────────────────────────────────────────

export interface CreateSessionResponse {
  session_id: string;
  discovery: DiscoveryState;
}

export const createSession = async (
  rawPrompt: string,
  userName: string = 'anonymous'
): Promise<CreateSessionResponse> => {
  const { data } = await api.post('/api/sessions/create', {
    user_name: userName,
    raw_prompt: rawPrompt,
  });
  return data;
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
  const { data } = await api.post(`/api/sessions/${sessionId}/answers`, {
    responses,
  });
  return data;
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
  const { data } = await api.post(`/api/sessions/${sessionId}/whatif`, {
    target_node_id: targetNodeId,
    what_if_query: whatIfQuery,
  });
  return data;
};
