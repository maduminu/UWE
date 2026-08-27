import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../services/api';

interface MastermindQABoardProps {
  currentCourseSlug: string;
  currentUser?: {
    id?: string;
    name?: string;
    role?: string;
  };
}

export const MastermindQABoard: React.FC<MastermindQABoardProps> = ({
  currentCourseSlug,
  currentUser,
}) => {
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPolling, setIsPolling] = useState(false);
  const [newQuestionText, setNewQuestionText] = useState('');
  const [drillTopic, setDrillTopic] = useState('General Mastermind Q&A');
  const [submitting, setSubmitting] = useState(false);
  const [filterTopic, setFilterTopic] = useState('ALL');
  const [toastMsg, setToastMsg] = useState('');
  const [newlyArrivedIds, setNewlyArrivedIds] = useState<Set<string>>(new Set());
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());

  const previousIdsRef = useRef<Set<string>>(new Set());

  // ── Initial & Full Feed Fetch ──
  const fetchQuestions = async (isBackground = false) => {
    try {
      if (!isBackground) setLoading(true);
      else setIsPolling(true);

      const res = await api.getMastermindQuestions(currentCourseSlug);
      if (res.data) {
        const incoming = res.data;

        // Detect newly arrived questions in background poll
        if (isBackground && previousIdsRef.current.size > 0) {
          const freshIds: string[] = [];
          incoming.forEach((q: any) => {
            if (!previousIdsRef.current.has(q.id)) {
              freshIds.push(q.id);
            }
          });

          if (freshIds.length > 0) {
            setNewlyArrivedIds((prev) => {
              const updated = new Set(prev);
              freshIds.forEach((id) => updated.add(id));
              return updated;
            });
            setToastMsg(`⚡ ${freshIds.length} new question(s) received from live mastermind!`);
            setTimeout(() => setToastMsg(''), 5000);
          }
        }

        const currentIds = new Set<string>(incoming.map((q: any) => q.id));
        previousIdsRef.current = currentIds;
        setQuestions(incoming);
        setLastSyncTime(new Date());
      }
    } catch (err) {
      console.error('Failed to load questions:', err);
    } finally {
      if (!isBackground) setLoading(false);
      setIsPolling(false);
    }
  };

  // Fetch when course slug changes
  useEffect(() => {
    previousIdsRef.current = new Set();
    setNewlyArrivedIds(new Set());
    fetchQuestions(false);
  }, [currentCourseSlug]);

  // ── 15-Second Background Polling Loop ──
  useEffect(() => {
    const pollInterval = setInterval(() => {
      fetchQuestions(true);
    }, 15000);

    return () => clearInterval(pollInterval);
  }, [currentCourseSlug]);

  const handlePostQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestionText.trim()) return;

    setSubmitting(true);
    try {
      const payload = {
        courseSlug: currentCourseSlug,
        userId: currentUser?.id,
        authorName: currentUser?.name || 'Operative',
        authorBadge: currentUser?.role === 'SUPER_ADMIN' ? 'COMMAND COUNCIL' : 'ENROLLED OPERATIVE',
        question: newQuestionText.trim(),
        drillTopic,
      };

      const res = await api.postMastermindQuestion(payload);
      if (res.data) {
        setQuestions((prev) => [res.data, ...prev]);
        previousIdsRef.current.add(res.data.id);
        setNewQuestionText('');
        setToastMsg('✓ Question transmitted to Commander Council!');
        setTimeout(() => setToastMsg(''), 4000);
      }
    } catch (err: any) {
      console.error(err);
      setToastMsg('❌ Failed to transmit question');
      setTimeout(() => setToastMsg(''), 4000);
    } finally {
      setSubmitting(false);
    }
  };

  const [upvotedIds, setUpvotedIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('uwe_upvoted_qa_ids');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  const handleUpvote = async (qId: string) => {
    const isCurrentlyUpvoted = upvotedIds.has(qId);
    const newUpvoted = new Set(upvotedIds);
    if (isCurrentlyUpvoted) {
      newUpvoted.delete(qId);
    } else {
      newUpvoted.add(qId);
    }
    setUpvotedIds(newUpvoted);
    try {
      localStorage.setItem('uwe_upvoted_qa_ids', JSON.stringify(Array.from(newUpvoted)));
    } catch { /* ignore */ }

    // Optimistically update question count
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === qId
          ? { ...q, upvotes: Math.max(0, (q.upvotes || 0) + (isCurrentlyUpvoted ? -1 : 1)) }
          : q
      )
    );

    try {
      const effectiveUserId = currentUser?.id || currentUser?.name || 'guest_operative';
      const res = await api.upvoteMastermindQuestion(qId, effectiveUserId);
      if (res.data && typeof res.data.upvotes === 'number') {
        setQuestions((prev) =>
          prev.map((q) => (q.id === qId ? { ...q, upvotes: res.data.upvotes } : q))
        );
      }
    } catch (err) {
      console.error('Failed to register upvote:', err);
    }
  };

  const filteredQuestions = filterTopic === 'ALL'
    ? questions
    : questions.filter((q) => q.drillTopic === filterTopic);

  return (
    <div className="p-6 md:p-8 rounded-2xl bg-[#090D18] border border-secondary/40 space-y-6 shadow-2xl">
      {/* Header & Live Polling Status Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-outline-variant/30 pb-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="material-symbols-outlined text-secondary text-2xl">forum</span>
            <h3 className="font-display text-lg font-black text-on-surface uppercase tracking-wider">
              Live Mastermind Q&amp;A <span className="text-secondary">&amp; Drill Submissions</span>
            </h3>
            {/* Live Indicator Pulse */}
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#2ED573]/15 border border-[#2ED573]/40 text-[#2ED573] font-mono-data text-[10px] font-bold">
              <span className="w-2 h-2 rounded-full bg-[#2ED573] animate-pulse" />
              LIVE FEED
            </span>
          </div>
          <p className="font-mono-data text-xs text-on-surface-variant mt-1">
            Submit tactical questions, execution blockers, or drill breakdowns for live coach review.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-mono-data text-[10px] text-on-surface-variant hidden md:inline">
            Sync: {lastSyncTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
          <button
            onClick={() => fetchQuestions(false)}
            disabled={isPolling || loading}
            className="px-3.5 py-1.5 rounded-xl bg-surface-variant/40 hover:bg-surface-variant text-on-surface text-xs font-mono-data flex items-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50"
          >
            <span className={`material-symbols-outlined text-sm text-secondary ${isPolling ? 'animate-spin' : ''}`}>
              refresh
            </span>
            <span>{isPolling ? 'SYNCING...' : 'SYNC FEED'}</span>
          </button>
        </div>
      </div>

      {/* Post Question Box */}
      <form onSubmit={handlePostQuestion} className="space-y-3 font-mono-data text-xs bg-[#0F1424] p-4 rounded-xl border border-outline-variant/30">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="w-full sm:w-1/3">
            <label className="block text-secondary font-bold mb-1 uppercase text-[10px]">
              Drill / Mastermind Topic
            </label>
            <select
              value={drillTopic}
              onChange={(e) => setDrillTopic(e.target.value)}
              className="w-full p-2.5 rounded-lg bg-[#141B2D] border border-outline-variant/40 text-on-surface focus:border-secondary outline-none"
            >
              <option value="General Mastermind Q&A">General Mastermind Q&amp;A</option>
              <option value="Neuro-Anchoring & Identity Drills">Neuro-Anchoring &amp; Identity Drills</option>
              <option value="Overthinking & State Control">Overthinking &amp; State Control</option>
              <option value="High-Ticket Sales & Negotiation">High-Ticket Sales &amp; Negotiation</option>
              <option value="Subconscious Fear Deconstruction">Subconscious Fear Deconstruction</option>
            </select>
          </div>

          <div className="w-full sm:w-2/3">
            <label className="block text-secondary font-bold mb-1 uppercase text-[10px]">
              Your Question / Execution Blocker *
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                required
                value={newQuestionText}
                onChange={(e) => setNewQuestionText(e.target.value)}
                placeholder="e.g. How do I anchor a calm state when presenting to hostile board members?"
                className="w-full p-2.5 rounded-lg bg-[#141B2D] border border-outline-variant/40 text-on-surface focus:border-secondary outline-none"
              />
              <button
                type="submit"
                disabled={submitting || !newQuestionText.trim()}
                className="px-5 py-2.5 rounded-lg bg-secondary text-black font-bold uppercase hover:bg-secondary-container transition-all cursor-pointer whitespace-nowrap disabled:opacity-50"
              >
                {submitting ? 'SENDING...' : 'TRANSMIT'}
              </button>
            </div>
          </div>
        </div>

        {toastMsg && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-[11px] text-secondary font-bold flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-xs">notifications_active</span>
            <span>{toastMsg}</span>
          </motion.div>
        )}
      </form>

      {/* Feed Filters */}
      <div className="flex items-center gap-2 flex-wrap font-mono-data text-[11px]">
        <span className="text-on-surface-variant">Filter Topic:</span>
        {['ALL', 'General Mastermind Q&A', 'Neuro-Anchoring & Identity Drills', 'High-Ticket Sales & Negotiation'].map((t) => (
          <button
            key={t}
            onClick={() => setFilterTopic(t)}
            className={`px-3 py-1 rounded-full border transition-all cursor-pointer ${
              filterTopic === t
                ? 'bg-secondary/20 text-secondary border-secondary font-bold shadow-[0_0_10px_rgba(255,184,0,0.2)]'
                : 'bg-surface-variant/20 text-on-surface-variant border-outline-variant/30 hover:border-secondary/40'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Questions Feed */}
      <div className="space-y-4 font-mono-data text-xs">
        {loading && (
          <div className="p-8 text-center text-on-surface-variant flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-secondary animate-spin">sync</span>
            <span>⚡ Synchronizing Mastermind Transmission Feed...</span>
          </div>
        )}

        {!loading && filteredQuestions.length === 0 && (
          <div className="p-8 text-center text-on-surface-variant bg-[#0F1424] rounded-xl border border-outline-variant/30">
            No questions logged for this topic yet. Be the first operative to transmit!
          </div>
        )}

        <AnimatePresence>
          {filteredQuestions.map((q) => {
            const isFresh = newlyArrivedIds.has(q.id);

            return (
              <motion.div
                key={q.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`p-5 rounded-xl border transition-all space-y-3 ${
                  isFresh
                    ? 'bg-gradient-to-r from-[#1E2846] to-[#0F1424] border-secondary ring-1 ring-secondary shadow-[0_0_25px_rgba(255,184,0,0.3)]'
                    : q.isPinned
                    ? 'bg-gradient-to-r from-[#171F36] to-[#0F1424] border-secondary shadow-[0_0_20px_rgba(255,184,0,0.15)]'
                    : 'bg-[#0E1322] border-outline-variant/30 hover:border-secondary/40'
                }`}
              >
                {/* Question Top Row */}
                <div className="flex justify-between items-start flex-wrap gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {isFresh && (
                      <span className="px-2 py-0.5 rounded bg-[#2ED573] text-black font-bold text-[9px] uppercase tracking-wider animate-pulse">
                        NEW ARRIVAL
                      </span>
                    )}
                    {q.isPinned && (
                      <span className="px-2 py-0.5 rounded bg-secondary text-black font-bold text-[9px] uppercase tracking-wider flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">push_pin</span> PINNED
                      </span>
                    )}
                    <span className="px-2 py-0.5 rounded bg-secondary/15 text-secondary border border-secondary/30 text-[10px] font-bold">
                      {q.drillTopic}
                    </span>
                    <span className="text-on-surface font-bold">
                      {q.authorName}
                    </span>
                    <span className="text-[10px] text-on-surface-variant">
                      [{q.authorBadge || 'OPERATIVE'}]
                    </span>
                    <span className="text-[10px] text-on-surface-variant">
                      • {new Date(q.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {/* Upvote Button (1 vote per user) */}
                  <button
                    onClick={() => handleUpvote(q.id)}
                    title={upvotedIds.has(q.id) ? 'Remove your upvote' : 'Upvote this question (1 vote max)'}
                    className={`px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer ${
                      upvotedIds.has(q.id)
                        ? 'bg-secondary/25 text-secondary border-secondary shadow-[0_0_12px_rgba(255,184,0,0.35)] font-bold'
                        : 'bg-surface-variant/30 hover:bg-secondary/20 text-on-surface hover:text-secondary border-outline-variant/30'
                    }`}
                  >
                    <span className={upvotedIds.has(q.id) ? 'text-secondary font-bold' : ''}>▲</span>
                    <span className="font-bold">{q.upvotes || 0}</span>
                  </button>
                </div>

                {/* Question Text */}
                <p className="text-on-surface text-sm font-medium leading-relaxed pl-1 border-l-2 border-secondary/60">
                  "{q.question}"
                </p>

                {/* Coach Answer Box */}
                {q.answer ? (
                  <div className="p-3.5 rounded-lg bg-[#070B14] border border-[#00D2FF]/40 space-y-1.5 text-xs">
                    <div className="flex items-center gap-1.5 text-[#00D2FF] font-bold text-[11px]">
                      <span className="material-symbols-outlined text-sm">verified_user</span>
                      <span>COMMAND COUNCIL RESPONSE • {q.answeredBy || 'Master Coach'}</span>
                    </div>
                    <p className="text-on-surface text-xs leading-relaxed">
                      {q.answer}
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-[11px] text-yellow-400/80 italic pl-1">
                    <span className="material-symbols-outlined text-xs">schedule</span>
                    <span>Queued for Live Zoom Mastermind Breakdown</span>
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
};
