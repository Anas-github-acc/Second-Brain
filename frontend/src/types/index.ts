// types/index.ts – Unified type definitions matching new backend state schema

// ─── Discovery (Pass 1) ───────────────────────────────────────────────────────

export interface DiscoveryQuestion {
  id: number;
  text: string;
  context_tradeoff: string;
  options: string[];
  allow_custom: boolean;
  can_skip: boolean;
  is_open: boolean;
  is_user_goal: boolean;
}

export interface DiscoveryState {
  target_identified: boolean;
  user_goal: string | null;
  paths: string[];
  metadata: Record<string, any>;
  questions: DiscoveryQuestion[];
  user_responses: Record<string, string>;
}

// ─── Scenario Graph (Pass 2) ──────────────────────────────────────────────────

export interface RedditLink {
  title: string;
  url: string;
}

export interface ScenarioNodeData {
  label: string;
  about: string;
  how_this_helps_reach_goal: string;
  reddit_links: RedditLink[];
  is_expanded: boolean;
  time_estimate?: string | null;
}

export interface ChildEdge {
  target_id: string;
  label: string;
  animation: boolean;
}

export interface ScenarioGraphNode {
  id: string;
  type: string; // "root" | "comparisonRoot" | "unionPath" | "outcome" | "failureFork" | "riskMitigation"
  position: { x: number; y: number };
  data: ScenarioNodeData;
  children: ChildEdge[];
}

export interface ScenarioGraph {
  node_count: number;
  nodes: ScenarioGraphNode[];
}

// ─── Unified Session ──────────────────────────────────────────────────────────

export type SessionStatus = 'discovery' | 'questioning' | 'generating' | 'complete';

export interface UnifiedSession {
  session_id: string;
  user_name: string;
  raw_prompt: string;
  status: SessionStatus;
  discovery: DiscoveryState;
  scenario_graph: ScenarioGraph;
  created_at: string;
  updated_at: string;
}

// ─── Chat messages ────────────────────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  role: 'ai' | 'user' | 'system';
  content: string;
  type?: 'text' | 'loading';
  metadata?: Record<string, any>;
  timestamp: string;
}
