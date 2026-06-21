'use client';
import { useState, useEffect, useRef } from 'react';
import { useSessionStore } from '@/store/sessionStore';
import { useSession } from '@/hooks/useSession';
import { DiscoveryQuestion, ChatMessage } from '@/types';

// ─── Single question card (collapsible) ──────────────────────────────────────

function QuestionCard({
  question,
  questionIndex,
  totalQuestions,
  onAnswer,
  isActive,
  isAnswered,
  existingAnswer,
}: {
  question: DiscoveryQuestion;
  questionIndex: number;
  totalQuestions: number;
  onAnswer: (qKey: string, value: string) => void;
  isActive: boolean;
  isAnswered: boolean;
  existingAnswer?: string;
}) {
  const [customValue, setCustomValue] = useState('');
  const [selectedOption, setSelectedOption] = useState(existingAnswer || '');

  const handleOptionClick = (opt: string) => {
    setSelectedOption(opt);
    onAnswer(`q_${question.id}`, opt);
  };

  const handleCustomSubmit = () => {
    if (customValue.trim()) {
      onAnswer(`q_${question.id}`, customValue.trim());
      setCustomValue('');
    }
  };

  const handleSkip = () => {
    onAnswer(`q_${question.id}`, '__skip__');
  };

  const accentColor = question.is_user_goal ? '#a78bfa' : '#6c63ff';

  return (
    <div
      style={{
        borderRadius: 12,
        border: `1px solid ${isActive ? accentColor + '60' : 'rgba(255,255,255,0.06)'}`,
        background: isActive
          ? `rgba(108,99,255,0.05)`
          : isAnswered
          ? 'rgba(34,197,94,0.04)'
          : 'rgba(255,255,255,0.02)',
        overflow: 'hidden',
        transition: 'all 0.2s ease',
      }}
    >
      {/* Question Header (always visible) */}
      <div
        style={{
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          cursor: isActive ? 'default' : 'pointer',
        }}
      >
        <div
          style={{
            width: 22,
            height: 22,
            borderRadius: '50%',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 10,
            fontWeight: 700,
            background: isAnswered
              ? 'rgba(34,197,94,0.2)'
              : isActive
              ? `${accentColor}25`
              : 'rgba(255,255,255,0.05)',
            border: `1px solid ${isAnswered ? '#22c55e60' : isActive ? accentColor + '50' : 'rgba(255,255,255,0.1)'}`,
            color: isAnswered ? '#22c55e' : isActive ? accentColor : '#8888aa',
          }}
        >
          {isAnswered ? '✓' : questionIndex + 1}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 11, color: isActive ? '#f0f0ff' : '#8888aa', fontWeight: isActive ? 600 : 400, lineHeight: 1.4 }}>
            {question.text}
          </p>
          {isAnswered && existingAnswer && existingAnswer !== '__skip__' && (
            <p style={{ fontSize: 10, color: '#22c55e', marginTop: 2 }}>✓ {existingAnswer}</p>
          )}
          {isAnswered && existingAnswer === '__skip__' && (
            <p style={{ fontSize: 10, color: '#8888aa', marginTop: 2 }}>Skipped</p>
          )}
        </div>
        {question.is_user_goal && (
          <span style={{ fontSize: 8, padding: '2px 5px', borderRadius: 4, background: '#a78bfa20', color: '#a78bfa', border: '1px solid #a78bfa40', flexShrink: 0 }}>
            GOAL
          </span>
        )}
      </div>

      {/* Expanded Options (only when active) */}
      {isActive && (
        <div style={{ padding: '0 14px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {question.context_tradeoff && (
            <p style={{ fontSize: 10, color: '#8888aa', fontStyle: 'italic', padding: '6px 8px', borderRadius: 6, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
              💡 {question.context_tradeoff}
            </p>
          )}

          {/* Option buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {question.options.map((opt) => (
              <button
                key={opt}
                onClick={() => handleOptionClick(opt)}
                style={{
                  textAlign: 'left',
                  padding: '8px 11px',
                  borderRadius: 8,
                  border: `1px solid ${selectedOption === opt ? accentColor + '80' : 'rgba(255,255,255,0.08)'}`,
                  background: selectedOption === opt ? `${accentColor}18` : 'transparent',
                  color: selectedOption === opt ? '#f0f0ff' : '#8888aa',
                  fontSize: 11,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {selectedOption === opt ? '◉ ' : '○ '}{opt}
              </button>
            ))}
          </div>

          {/* Custom answer */}
          {question.allow_custom && (
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                type="text"
                value={customValue}
                onChange={(e) => setCustomValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCustomSubmit()}
                placeholder="Type custom answer..."
                style={{
                  flex: 1,
                  padding: '7px 10px',
                  borderRadius: 7,
                  border: '1px solid rgba(255,255,255,0.08)',
                  background: 'rgba(0,0,0,0.2)',
                  color: '#f0f0ff',
                  fontSize: 11,
                  outline: 'none',
                }}
              />
              <button
                onClick={handleCustomSubmit}
                style={{
                  padding: '7px 12px',
                  borderRadius: 7,
                  border: 'none',
                  background: accentColor,
                  color: '#fff',
                  fontSize: 11,
                  cursor: 'pointer',
                }}
              >
                ↵
              </button>
            </div>
          )}

          {/* Skip */}
          {question.can_skip && (
            <button
              onClick={handleSkip}
              style={{
                background: 'none',
                border: 'none',
                color: '#8888aa',
                fontSize: 10,
                cursor: 'pointer',
                textAlign: 'left',
                padding: '2px 0',
                textDecoration: 'underline',
              }}
            >
              Skip this question
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Chat messages ────────────────────────────────────────────────────────────

function ChatBubble({ msg }: { msg: ChatMessage }) {
  const isAI = msg.role === 'ai';
  return (
    <div
      style={{
        display: 'flex',
        gap: 10,
        flexDirection: isAI ? 'row' : 'row-reverse',
        animation: 'fadeInUp 0.3s ease both',
      }}
    >
      {isAI && (
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: 'rgba(108,99,255,0.2)',
            border: '1px solid rgba(108,99,255,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 13,
            flexShrink: 0,
          }}
        >
          ✦
        </div>
      )}
      <div
        style={{
          maxWidth: '80%',
          padding: '8px 12px',
          borderRadius: isAI ? '4px 14px 14px 14px' : '14px 4px 14px 14px',
          background: isAI
            ? 'rgba(255,255,255,0.05)'
            : 'rgba(108,99,255,0.15)',
          border: `1px solid ${isAI ? 'rgba(255,255,255,0.06)' : 'rgba(108,99,255,0.3)'}`,
          fontSize: 12,
          color: '#f0f0ff',
          lineHeight: 1.55,
        }}
        dangerouslySetInnerHTML={{
          __html: msg.content
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n/g, '<br/>'),
        }}
      />
    </div>
  );
}

// ─── Main Discovery Panel ─────────────────────────────────────────────────────

export default function DiscoveryPanel() {
  const session = useSessionStore((s) => s.session);
  const chatMessages = useSessionStore((s) => s.chatMessages);
  const isLoading = useSessionStore((s) => s.isLoading);
  const loadingMessage = useSessionStore((s) => s.loadingMessage);
  const currentQuestionIndex = useSessionStore((s) => s.currentQuestionIndex);
  const pendingResponses = useSessionStore((s) => s.pendingResponses);
  const setPendingResponse = useSessionStore((s) => s.setPendingResponse);
  const setCurrentQuestionIndex = useSessionStore((s) => s.setCurrentQuestionIndex);

  const { submitAllAnswers } = useSession();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, currentQuestionIndex]);

  const questions = session?.discovery?.questions || [];
  const isComplete = session?.status === 'complete';
  const isGenerating = session?.status === 'generating' || isLoading;

  const answeredCount = Object.keys(pendingResponses).length;
  const allAnswered = answeredCount >= questions.length;
  const progress = questions.length > 0 ? (answeredCount / questions.length) * 100 : 0;

  const handleAnswer = (qKey: string, value: string) => {
    setPendingResponse(qKey, value);
    // Auto-advance to next question
    const currentIdx = parseInt(qKey.replace('q_', ''));
    const nextUnanswered = questions.findIndex(
      (q, i) => i > currentIdx && !pendingResponses[`q_${q.id}`]
    );
    if (nextUnanswered !== -1) {
      setCurrentQuestionIndex(nextUnanswered);
    } else {
      setCurrentQuestionIndex(questions.length); // all answered
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: 'var(--surface)',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid var(--border)',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: 'rgba(108,99,255,0.2)',
              border: '1px solid rgba(108,99,255,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 13,
            }}
          >
            ✦
          </div>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Career AI Advisor</p>
            <p style={{ fontSize: 10, color: 'var(--muted)' }}>Discovery Engine</p>
          </div>
          <div
            style={{
              marginLeft: 'auto',
              padding: '3px 8px',
              borderRadius: 20,
              fontSize: 10,
              background: isComplete ? 'rgba(34,197,94,0.1)' : 'rgba(108,99,255,0.1)',
              color: isComplete ? '#22c55e' : 'var(--accent)',
              border: `1px solid ${isComplete ? 'rgba(34,197,94,0.3)' : 'rgba(108,99,255,0.3)'}`,
            }}
          >
            {isComplete ? '✓ Complete' : isGenerating ? '⟳ Generating...' : '● Collecting'}
          </div>
        </div>

        {/* Progress bar */}
        {questions.length > 0 && !isComplete && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 10, color: 'var(--muted)' }}>Discovery Progress</span>
              <span style={{ fontSize: 10, color: 'var(--accent)' }}>{answeredCount}/{questions.length}</span>
            </div>
            <div style={{ height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.06)' }}>
              <div
                style={{
                  height: '100%',
                  borderRadius: 2,
                  background: 'linear-gradient(90deg, #6c63ff, #22d3ee)',
                  width: `${progress}%`,
                  transition: 'width 0.4s ease',
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Scrollable chat + questions */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 14px 0' }}>
        {/* Chat messages */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
          {chatMessages.map((msg) => (
            <ChatBubble key={msg.id} msg={msg} />
          ))}

          {isLoading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--muted)', fontSize: 12 }}>
              <span
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: '50%',
                  border: '2px solid rgba(108,99,255,0.3)',
                  borderTopColor: '#6c63ff',
                  display: 'inline-block',
                  animation: 'spin 1s linear infinite',
                }}
              />
              {loadingMessage || 'Processing...'}
            </div>
          )}
        </div>

        {/* Question cards - collapse/expand sequential pattern */}
        {questions.length > 0 && !isComplete && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
            <p style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 600, letterSpacing: '0.08em', marginBottom: 4 }}>
              DISCOVERY QUESTIONS
            </p>
            {questions.map((q, idx) => {
              const qKey = `q_${q.id}`;
              const isAnswered = !!pendingResponses[qKey];
              const isActive = idx === currentQuestionIndex && !isAnswered;

              return (
                <QuestionCard
                  key={q.id}
                  question={q}
                  questionIndex={idx}
                  totalQuestions={questions.length}
                  onAnswer={handleAnswer}
                  isActive={isActive}
                  isAnswered={isAnswered}
                  existingAnswer={pendingResponses[qKey]}
                />
              );
            })}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Footer: submit / status */}
      <div style={{ padding: 12, borderTop: '1px solid var(--border)', flexShrink: 0 }}>
        {!isComplete && questions.length > 0 && (
          <button
            onClick={submitAllAnswers}
            disabled={!allAnswered || isGenerating}
            style={{
              width: '100%',
              padding: '10px 0',
              borderRadius: 10,
              border: 'none',
              background: allAnswered && !isGenerating
                ? 'linear-gradient(135deg, #6c63ff, #22d3ee)'
                : 'rgba(255,255,255,0.05)',
              color: allAnswered && !isGenerating ? '#fff' : '#8888aa',
              fontSize: 12,
              fontWeight: 700,
              cursor: allAnswered && !isGenerating ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              letterSpacing: '0.04em',
              transition: 'all 0.2s ease',
            }}
          >
            {isGenerating ? (
              <>
                <span
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: '50%',
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderTopColor: '#fff',
                    display: 'inline-block',
                    animation: 'spin 1s linear infinite',
                  }}
                />
                Building Scenario Graph...
              </>
            ) : allAnswered ? (
              '✦ Generate Scenario Graph'
            ) : (
              `Answer all questions (${answeredCount}/${questions.length})`
            )}
          </button>
        )}
        {isComplete && (
          <div style={{ textAlign: 'center', fontSize: 11, color: '#22c55e' }}>
            ✓ Scenario graph complete. Click nodes to explore.
          </div>
        )}
      </div>
    </div>
  );
}
