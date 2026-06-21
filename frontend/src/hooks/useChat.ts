'use client';
import { useSessionStore } from '@/store/sessionStore';

/**
 * useChat – Simple derived state from sessionStore for chat messages.
 */
export const useChat = () => {
  const chatMessages = useSessionStore((s) => s.chatMessages);
  const isLoading = useSessionStore((s) => s.isLoading);
  const questions = useSessionStore((s) => s.session?.discovery?.questions || []);
  const pendingResponses = useSessionStore((s) => s.pendingResponses);

  const answeredCount = Object.keys(pendingResponses).length;
  const progress = questions.length > 0 ? (answeredCount / questions.length) * 100 : 0;
  const allAnswered = answeredCount >= questions.length && questions.length > 0;

  return { chatMessages, isLoading, progress, allAnswered };
};
