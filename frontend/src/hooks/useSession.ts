'use client';
import { useCallback } from 'react';
import { useSessionStore } from '@/store/sessionStore';
import {
  createSession,
  getSession,
  submitAnswersAndGenerate,
  expandWhatIf,
} from '@/lib/api';
import { cacheSession, getCachedSession } from '@/lib/idb';
import { ChatMessage, UnifiedSession } from '@/types';

export const useSession = () => {
  const store = useSessionStore();

  const mkMsg = (
    role: ChatMessage['role'],
    content: string,
    type?: ChatMessage['type'],
    metadata?: Record<string, any>
  ): ChatMessage => ({
    id: Math.random().toString(36).slice(2),
    role,
    content,
    type: type || 'text',
    metadata,
    timestamp: new Date().toISOString(),
  });

  // ── Pass 1: Create session + get discovery questions ─────────────────────────
  const initSession = useCallback(async (rawPrompt: string): Promise<string | null> => {
    store.setLoading(true, 'Analyzing your request...');
    try {
      const resp = await createSession(rawPrompt);
      const sessionId = resp.session_id;
      store.setSessionId(sessionId);

      const session: UnifiedSession = {
        session_id: sessionId,
        user_name: 'anonymous',
        raw_prompt: rawPrompt,
        status: 'questioning',
        discovery: resp.discovery,
        scenario_graph: { node_count: 0, nodes: [] },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      store.setSession(session);
      await cacheSession(session);

      store.addChatMessage(
        mkMsg(
          'ai',
          `I've analyzed your comparison request. I need to ask you **${resp.discovery.questions.length} key questions** to build your personalized scenario graph.`
        )
      );
      store.setCurrentQuestionIndex(0);
      return sessionId;
    } catch (err) {
      console.error(err);
      store.addChatMessage(mkMsg('ai', '⚠️ Failed to analyze your request. Please try again.'));
      return null;
    } finally {
      store.setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Load session from cache or backend ────────────────────────────────────────
  const loadSession = useCallback(async (id: string): Promise<UnifiedSession | null> => {
    const cached = await getCachedSession(id);
    if (cached) {
      store.setSession(cached);
      if (cached.scenario_graph?.node_count > 0) {
        store.setScenarioGraph(cached.scenario_graph);
      }
      return cached;
    }
    try {
      const session = await getSession(id);
      store.setSession(session);
      if (session.scenario_graph?.node_count > 0) {
        store.setScenarioGraph(session.scenario_graph);
      }
      await cacheSession(session);
      return session;
    } catch {
      return null;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Submit answers + trigger Pass 2 graph generation ─────────────────────────
  const submitAllAnswers = useCallback(async () => {
    const sessionId = store.sessionId;
    if (!sessionId) return;

    const responses = store.pendingResponses;
    store.setLoading(true, 'Building your scenario graph...');

    const placeholderId = Math.random().toString(36).slice(2);
    store.addChatMessage({
      id: placeholderId,
      role: 'ai',
      content: '✦ Generating your comprehensive career path scenario graph...',
      type: 'loading',
      timestamp: new Date().toISOString(),
    });

    try {
      const result = await submitAnswersAndGenerate(sessionId, responses);
      store.setScenarioGraph(result.scenario_graph);

      // Update session with graph + complete status
      const current = store.session;
      if (current) {
        const updated: UnifiedSession = {
          ...current,
          status: 'complete',
          discovery: { ...current.discovery, user_responses: responses },
          scenario_graph: result.scenario_graph,
        };
        store.setSession(updated);
        await cacheSession(updated);
      }

      store.updateChatMessage(placeholderId, {
        content: `✅ Scenario graph generated! **${result.scenario_graph.node_count} nodes** mapped across all career paths. Click any node to explore details or ask a what-if question.`,
        type: 'text',
      });
    } catch (err) {
      console.error(err);
      store.updateChatMessage(placeholderId, {
        content: '⚠️ Failed to generate scenario graph. Please try again.',
        type: 'text',
      });
    } finally {
      store.setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.sessionId, store.pendingResponses, store.session]);

  // ── What-if expansion ─────────────────────────────────────────────────────────
  const expandNode = useCallback(async (targetNodeId: string, query: string) => {
    const sessionId = store.sessionId;
    if (!sessionId) return;

    store.setLoading(true, 'Expanding scenario...');
    try {
      const result = await expandWhatIf(sessionId, targetNodeId, query);
      store.setScenarioGraph(result.scenario_graph);

      // Update session cache
      const current = store.session;
      if (current) {
        const updated: UnifiedSession = {
          ...current,
          scenario_graph: result.scenario_graph,
        };
        store.setSession(updated);
        await cacheSession(updated);
      }

      store.addChatMessage(
        mkMsg(
          'ai',
          `What-if expansion complete. Added **${result.scenario_graph.node_count - (store.scenarioGraph?.node_count || 0)} new nodes** branching from node ${targetNodeId}.`
        )
      );
    } catch (err) {
      console.error(err);
      store.addChatMessage(mkMsg('ai', '⚠️ What-if expansion failed. Please try again.'));
    } finally {
      store.setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.sessionId, store.session, store.scenarioGraph]);

  return { initSession, loadSession, submitAllAnswers, expandNode };
};
