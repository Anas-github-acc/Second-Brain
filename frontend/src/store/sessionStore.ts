import { create } from 'zustand';
import {
  UnifiedSession,
  ChatMessage,
  DiscoveryQuestion,
  ScenarioGraph,
  ScenarioGraphNode,
} from '@/types';

/** x/y overrides written by manual node drags. Keyed by node id. */
export type NodePositionMap = Record<string, { x: number; y: number }>;

interface SessionStore {
  // Session state
  session: UnifiedSession | null;
  sessionId: string | null;
  chatMessages: ChatMessage[];
  isLoading: boolean;
  loadingMessage: string;

  // Discovery phase
  currentQuestionIndex: number;
  pendingResponses: Record<string, string>;

  // Graph canvas
  scenarioGraph: ScenarioGraph | null;
  selectedNode: ScenarioGraphNode | null;
  expandedNodeIds: Set<string>;
  /** Manual drag overrides — never reset by graph refreshes */
  nodePositions: NodePositionMap;

  // Actions
  setSession: (session: UnifiedSession) => void;
  setSessionId: (id: string) => void;
  addChatMessage: (msg: ChatMessage) => void;
  updateChatMessage: (id: string, updates: Partial<ChatMessage>) => void;
  setLoading: (loading: boolean, message?: string) => void;
  setCurrentQuestionIndex: (idx: number) => void;
  setPendingResponse: (key: string, value: string) => void;
  setScenarioGraph: (graph: ScenarioGraph) => void;
  setSelectedNode: (node: ScenarioGraphNode | null) => void;
  toggleNodeExpanded: (nodeId: string) => void;
  updateNodePosition: (nodeId: string, position: { x: number; y: number }) => void;
  reset: () => void;
}

const initialState = {
  session: null,
  sessionId: null,
  chatMessages: [],
  isLoading: false,
  loadingMessage: '',
  currentQuestionIndex: 0,
  pendingResponses: {},
  scenarioGraph: null,
  selectedNode: null,
  expandedNodeIds: new Set<string>(),
  nodePositions: {},
};

export const useSessionStore = create<SessionStore>((set) => ({
  ...initialState,

  setSession: (session) =>
    set({
      session,
      sessionId: session.session_id,
      scenarioGraph:
        session.scenario_graph?.node_count > 0 ? session.scenario_graph : null,
    }),

  setSessionId: (id) => set({ sessionId: id }),

  addChatMessage: (msg) =>
    set((state) => ({ chatMessages: [...state.chatMessages, msg] })),

  updateChatMessage: (id, updates) =>
    set((state) => ({
      chatMessages: state.chatMessages.map((m) =>
        m.id === id ? { ...m, ...updates } : m
      ),
    })),

  setLoading: (loading, message = '') =>
    set({ isLoading: loading, loadingMessage: message }),

  setCurrentQuestionIndex: (idx) => set({ currentQuestionIndex: idx }),

  setPendingResponse: (key, value) =>
    set((state) => ({
      pendingResponses: { ...state.pendingResponses, [key]: value },
    })),

  setScenarioGraph: (graph) => set({ scenarioGraph: graph }),

  setSelectedNode: (node) => set({ selectedNode: node }),

  toggleNodeExpanded: (nodeId) =>
    set((state) => {
      const next = new Set(state.expandedNodeIds);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return { expandedNodeIds: next };
    }),

  updateNodePosition: (nodeId, position) =>
    set((state) => ({
      nodePositions: { ...state.nodePositions, [nodeId]: position },
    })),

  reset: () => set({ ...initialState, expandedNodeIds: new Set<string>(), nodePositions: {} }),
}));
