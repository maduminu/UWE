import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../services/api';
import { authService } from '../../services/auth';
import { safeGetStorage } from '../../utils/storage';
import { MastermindQASkeleton } from './ShimmerSkeletons';
import { MarkdownRenderer } from './MarkdownRenderer';
import { useRealtimeEvent } from '../../services/realtime';

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
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [isPolling, setIsPolling] = useState(false);
  const [selectedDirective, setSelectedDirective] = useState<string>('all');
  const [postCourseSlug, setPostCourseSlug] = useState<string>(
    currentCourseSlug && currentCourseSlug !== 'all' ? currentCourseSlug : 'bmb'
  );
  const [newQuestionText, setNewQuestionText] = useState('');
  const [drillTopic, setDrillTopic] = useState('General Mastermind Q&A');
  const [submitting, setSubmitting] = useState(false);
  const [filterTopic, setFilterTopic] = useState('ALL');
  const [toastMsg, setToastMsg] = useState('');
  const [newlyArrivedIds, setNewlyArrivedIds] = useState<Set<string>>(new Set());
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());

  // ── Threaded Replies State ──
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());
  const [replyInputOpen, setReplyInputOpen] = useState<Set<string>>(new Set());
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [replySubmitting, setReplySubmitting] = useState<Set<string>>(new Set());

  const previousIdsRef = useRef<Set<string>>(new Set());

  const activeUser = currentUser || authService.getStudentUser() || safeGetStorage<any>('uwe_user_account', null);

  // ── Initial & Full Feed Fetch ──
  const fetchQuestions = async (isBackground = false, pageToFetch = 1, append = false) => {
    try {
      if (!isBackground && !append) setLoading(true);
      else if (append) setLoadingMore(true);
      else setIsPolling(true);

      const res = await api.getMastermindQuestions(selectedDirective, {
        page: pageToFetch,
        limit: 15,
        topic: filterTopic !== 'ALL' ? filterTopic : undefined,
      });

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

        if (append) {
          setQuestions((prev) => [...prev, ...incoming]);
        } else {
          setQuestions(incoming);
        }

        setPage(pageToFetch);
        setHasMore(res.pagination?.hasMore ?? false);
        if (typeof res.totalCount === 'number') {
          setTotalQuestions(res.totalCount);
        }
        setLastSyncTime(new Date());
      }
    } catch (err) {
      console.error('Failed to load questions:', err);
    } finally {
      if (!isBackground && !append) setLoading(false);
      setLoadingMore(false);
      setIsPolling(false);
    }
  };

  // Fetch when selected directive or filter changes
  useEffect(() => {
    previousIdsRef.current = new Set();
    setNewlyArrivedIds(new Set());
    fetchQuestions(false, 1, false);
  }, [selectedDirective, filterTopic]);

  // ── 15-Second Background Polling Loop ──
  useEffect(() => {
    const pollInterval = setInterval(() => {
      fetchQuestions(true);
    }, 15000);

    return () => clearInterval(pollInterval);
  }, [selectedDirective]);

  const handlePostQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestionText.trim()) return;

    setSubmitting(true);

    const targetCourse = postCourseSlug || (selectedDirective !== 'all' ? selectedDirective : 'bmb');
    const payload = {
      courseSlug: targetCourse,
      userId: activeUser?.id,
      authorName: activeUser?.name || 'Operative',
      authorBadge: activeUser?.role === 'SUPER_ADMIN' ? 'COMMAND COUNCIL' : 'ENROLLED OPERATIVE',
      question: newQuestionText.trim(),
      drillTopic,
    };

    // Optimistic: insert placeholder question instantly (0ms perceived latency)
    const optimisticId = `optimistic_${Date.now()}`;
    const optimisticQuestion = {
      id: optimisticId,
      ...payload,
      upvotes: 0,
      answers: [],
      createdAt: new Date().toISOString(),
      _optimistic: true,
    };

    const previousQuestions = [...questions];
    setQuestions((prev) => [optimisticQuestion as any, ...prev]);
    setNewQuestionText('');
    setToastMsg('✓ Question transmitted to Commander Council!');
    setTimeout(() => setToastMsg(''), 4000);

    try {
      const res = await api.postMastermindQuestion(payload);
      if (res.data) {
        // Swap optimistic placeholder with confirmed server data
        setQuestions((prev) =>
          prev.map((q) => (q.id === optimisticId ? res.data : q))
        );
        previousIdsRef.current.add(res.data.id);
      }
    } catch (err: any) {
      console.error(err);
      // Rollback: restore previous state on network failure
      setQuestions(previousQuestions);
      setToastMsg('❌ Failed to transmit question — rolled back');
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
    const previousUpvoted = new Set(upvotedIds);
    const previousQuestions = [...questions];

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

    // Optimistically update question count (0ms perceived latency)
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
      // Rollback on network failure
      setUpvotedIds(previousUpvoted);
      setQuestions(previousQuestions);
      try {
        localStorage.setItem('uwe_upvoted_qa_ids', JSON.stringify(Array.from(previousUpvoted)));
      } catch { /* ignore */ }
      setToastMsg('⚠️ Upvote sync failed — rolled back');
      setTimeout(() => setToastMsg(''), 4000);
    }
  };

  // ── Toggle Reply Thread visibility ──
  const toggleReplies = (qId: string) => {
    setExpandedReplies((prev) => {
      const next = new Set(prev);
      if (next.has(qId)) next.delete(qId);
      else next.add(qId);
      return next;
    });
  };

  // ── Toggle Reply Input Box ──
  const toggleReplyInput = (qId: string) => {
    setReplyInputOpen((prev) => {
      const next = new Set(prev);
      if (next.has(qId)) next.delete(qId);
      else next.add(qId);
      return next;
    });
  };

  // ── Post a Threaded Reply ──
  const handlePostReply = async (qId: string) => {
    const body = replyText[qId]?.trim();
    if (!body) return;

    setReplySubmitting((prev) => new Set(prev).add(qId));
    try {
      const studentName = activeUser?.name || 'Enrolled Operative';
      const studentBadge = activeUser?.rankTitle || (activeUser?.role === 'SUPER_ADMIN' ? 'COMMAND COUNCIL' : 'OPERATIVE');
      const res = await api.postMastermindReply(qId, body, {
        asCoach: false,
        authorName: studentName,
        authorBadge: studentBadge,
      });
      if (res.data) {
        // Append reply optimistically into local state
        setQuestions((prev) =>
          prev.map((q) =>
            q.id === qId
              ? { ...q, replies: [...(q.replies || []), res.data] }
              : q
          )
        );
        setReplyText((prev) => ({ ...prev, [qId]: '' }));
        // Auto-expand thread to show new reply
        setExpandedReplies((prev) => new Set(prev).add(qId));
        setToastMsg('✓ Reply transmitted to thread!');
        setTimeout(() => setToastMsg(''), 3500);
      }
    } catch (err) {
      console.error('Reply failed:', err);
      setToastMsg('❌ Failed to post reply');
      setTimeout(() => setToastMsg(''), 3500);
    } finally {
      setReplySubmitting((prev) => { const s = new Set(prev); s.delete(qId); return s; });
    }
  };

  // ── Mark / Un-mark Reply as Solution ──
  const handleMarkSolution = async (qId: string, replyId: string) => {
    try {
      const res = await api.markReplyAsSolution(qId, replyId);
      setQuestions((prev) =>
        prev.map((q) => {
          if (q.id !== qId) return q;
          return {
            ...q,
            isSolved: res.isSolved,
            solutionReplyId: res.isSolved ? replyId : null,
            replies: (q.replies || []).map((r: any) => ({
              ...r,
              isSolution: res.isSolved && r.id === replyId,
            })),
          };
        })
      );
      setToastMsg(res.isSolved ? '✅ Solution marked!' : '↩ Solution badge removed.');
      setTimeout(() => setToastMsg(''), 3500);
    } catch (err) {
      console.error('Mark solution failed:', err);
    }
  };

  // ── Live SSE: incoming reply on any question ──
  useRealtimeEvent('mastermind:reply', useCallback(({ questionId, reply }: any) => {
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === questionId
          ? { ...q, replies: [...(q.replies || []).filter((r: any) => r.id !== reply.id), reply] }
          : q
      )
    );
  }, []));

  // ── Live SSE: solution badge toggled ──
  useRealtimeEvent('mastermind:solved', useCallback(({ questionId, replyId, isSolved }: any) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== questionId) return q;
        return {
          ...q,
          isSolved,
          solutionReplyId: isSolved ? replyId : null,
          replies: (q.replies || []).map((r: any) => ({
            ...r,
            isSolution: isSolved && r.id === replyId,
          })),
        };
      })
    );
  }, []));

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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-secondary font-bold mb-1 uppercase text-[10px]">
              Directive Program
            </label>
            <select
              value={postCourseSlug}
              onChange={(e) => setPostCourseSlug(e.target.value)}
              className="w-full p-2.5 rounded-lg bg-[#141B2D] border border-outline-variant/40 text-on-surface focus:border-secondary outline-none text-xs cursor-pointer"
            >
              <option value="bmb">Beyond Mind Boundaries (BMB)</option>
              <option value="leadership">Leadership Academy (Command)</option>
              <option value="ignit">IGNIT Enterprise Incubator</option>
            </select>
          </div>

          <div>
            <label className="block text-secondary font-bold mb-1 uppercase text-[10px]">
              Drill / Mastermind Topic
            </label>
            <select
              value={drillTopic}
              onChange={(e) => setDrillTopic(e.target.value)}
              className="w-full p-2.5 rounded-lg bg-[#141B2D] border border-outline-variant/40 text-on-surface focus:border-secondary outline-none text-xs cursor-pointer"
            >
              <option value="General Mastermind Q&A">General Mastermind Q&amp;A</option>
              <option value="Neuro-Anchoring & Identity Drills">Neuro-Anchoring &amp; Identity Drills</option>
              <option value="Overthinking & State Control">Overthinking &amp; State Control</option>
              <option value="High-Ticket Sales & Negotiation">High-Ticket Sales &amp; Negotiation</option>
              <option value="Subconscious Fear Deconstruction">Subconscious Fear Deconstruction</option>
              <option value="Tactical Command & Delegation">Tactical Command &amp; Delegation</option>
              <option value="Zero-to-One Venture Launch">Zero-to-One Venture Launch</option>
            </select>
          </div>

          <div>
            <label className="block text-secondary font-bold mb-1 uppercase text-[10px]">
              Your Question / Blocker *
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                required
                value={newQuestionText}
                onChange={(e) => setNewQuestionText(e.target.value)}
                placeholder="e.g. How do I anchor a calm state?"
                className="w-full p-2.5 rounded-lg bg-[#141B2D] border border-outline-variant/40 text-on-surface focus:border-secondary outline-none text-xs"
              />
              <button
                type="submit"
                disabled={submitting || !newQuestionText.trim()}
                className="px-4 py-2.5 rounded-lg bg-secondary text-black font-bold uppercase hover:bg-secondary-container transition-all cursor-pointer whitespace-nowrap disabled:opacity-50 text-xs"
              >
                {submitting ? '...' : 'TRANSMIT'}
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

      {/* Directive & Topic Filters */}
      <div className="space-y-2.5">
        {/* Directive Program Filter */}
        <div className="flex items-center gap-2 flex-wrap font-mono-data text-[11px]">
          <span className="text-secondary font-bold uppercase text-[10px]">Directive:</span>
          {[
            { id: 'all', label: 'All Directives' },
            { id: 'bmb', label: 'BMB (Mind)' },
            { id: 'leadership', label: 'Leadership (Command)' },
            { id: 'ignit', label: 'IGNIT (Incubator)' },
          ].map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => setSelectedDirective(d.id)}
              className={`px-3 py-1 rounded-full border transition-all cursor-pointer text-xs ${
                selectedDirective === d.id
                  ? 'bg-secondary text-black font-black border-secondary shadow-[0_0_12px_rgba(255,184,0,0.35)]'
                  : 'bg-[#0E1322] text-on-surface-variant hover:text-on-surface border-outline-variant/40'
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>

        {/* Topic Filters */}
        <div className="flex items-center gap-2 flex-wrap font-mono-data text-[11px]">
          <span className="text-on-surface-variant text-[10px]">Topic:</span>
          {['ALL', 'General Mastermind Q&A', 'Neuro-Anchoring & Identity Drills', 'High-Ticket Sales & Negotiation', 'Tactical Command & Delegation'].map((t) => (
            <button
              key={t}
              onClick={() => setFilterTopic(t)}
              className={`px-2.5 py-0.5 rounded-full border transition-all cursor-pointer text-[10px] ${
                filterTopic === t
                  ? 'bg-secondary/20 text-secondary border-secondary font-bold shadow-[0_0_10px_rgba(255,184,0,0.2)]'
                  : 'bg-surface-variant/20 text-on-surface-variant border-outline-variant/30 hover:border-secondary/40'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Questions Feed */}
      <div className="space-y-4 font-mono-data text-xs">
        {loading && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-[11px] text-secondary/80 font-mono-data px-1">
              <span className="w-2 h-2 rounded-full bg-secondary animate-ping" />
              <span>SYNCHRONIZING TACTICAL TRANSMISSIONS...</span>
            </div>
            <MastermindQASkeleton count={3} />
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

                  {/* Upvote Button with spring micro-interaction */}
                  <motion.button
                    whileTap={{ scale: 0.85 }}
                    whileHover={{ scale: 1.05 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                    onClick={() => handleUpvote(q.id)}
                    title={upvotedIds.has(q.id) ? 'Remove your upvote' : 'Upvote this question (1 vote max)'}
                    className={`px-3 py-1 rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer select-none ${
                      upvotedIds.has(q.id)
                        ? 'bg-secondary text-black font-black border-secondary shadow-[0_0_15px_rgba(255,184,0,0.5)] ring-1 ring-secondary/50'
                        : 'bg-surface-variant/30 hover:bg-secondary/20 text-on-surface hover:text-secondary border-outline-variant/30 hover:border-secondary/50'
                    }`}
                  >
                    <motion.span
                      key={upvotedIds.has(q.id) ? 'voted' : 'unvoted'}
                      initial={{ scale: 0.5, y: 2 }}
                      animate={{ scale: 1, y: 0 }}
                      className="font-bold text-xs"
                    >
                      ▲
                    </motion.span>
                    <motion.span
                      key={q.upvotes || 0}
                      initial={{ opacity: 0.3, y: -2 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="font-bold text-xs"
                    >
                      {q.upvotes || 0}
                    </motion.span>
                  </motion.button>
                </div>

                {/* Question Text */}
                <p className="text-on-surface text-sm font-medium leading-relaxed pl-1 border-l-2 border-secondary/60">
                  "{q.question}"
                </p>

                {/* Solved badge on question */}
                {q.isSolved && (
                  <div className="flex items-center gap-1.5">
                    <span className="px-2.5 py-0.5 rounded-full bg-[#2ED573]/15 border border-[#2ED573]/50 text-[#2ED573] font-mono-data text-[10px] font-bold flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">verified</span>
                      SOLVED
                    </span>
                  </div>
                )}

                {/* Legacy Coach Answer Box (backward compat) */}
                {q.answer && (
                  <div className="p-3.5 rounded-lg bg-[#070B14] border border-[#00D2FF]/40 space-y-1.5 text-xs">
                    <div className="flex items-center gap-1.5 text-[#00D2FF] font-bold text-[11px]">
                      <span className="material-symbols-outlined text-sm">verified_user</span>
                      <span>COMMAND COUNCIL RESPONSE • {q.answeredBy || 'Master Coach'}</span>
                    </div>
                    <p className="text-on-surface text-xs leading-relaxed">{q.answer}</p>
                  </div>
                )}

                {/* ── Threaded Replies ── */}
                {(() => {
                  const replies: any[] = q.replies || [];
                  const replyCount = replies.length;
                  const isOpen = expandedReplies.has(q.id);
                  const isReplyBoxOpen = replyInputOpen.has(q.id);
                  const isAuthor = activeUser?.id && q.userId === activeUser.id;
                  const isCoach = activeUser?.role === 'SUPER_ADMIN' || activeUser?.role === 'COMMANDER' || activeUser?.role === 'COACH';

                  return (
                    <div className="space-y-2 pt-1 border-t border-outline-variant/20">
                      {/* Thread toggle + Reply action */}
                      <div className="flex items-center gap-3 flex-wrap">
                        {replyCount > 0 && (
                          <button
                            type="button"
                            onClick={() => toggleReplies(q.id)}
                            className="flex items-center gap-1.5 text-[11px] text-secondary hover:text-secondary/80 font-bold cursor-pointer transition-colors"
                          >
                            <span className="material-symbols-outlined text-sm">
                              {isOpen ? 'expand_less' : 'chat_bubble_outline'}
                            </span>
                            {isOpen ? 'COLLAPSE THREAD' : `VIEW THREAD (${replyCount})`}
                          </button>
                        )}
                        {activeUser && (
                          <button
                            type="button"
                            onClick={() => toggleReplyInput(q.id)}
                            className="flex items-center gap-1.5 text-[11px] text-on-surface-variant hover:text-secondary cursor-pointer transition-colors"
                          >
                            <span className="material-symbols-outlined text-sm">reply</span>
                            {isReplyBoxOpen ? 'CANCEL' : 'REPLY'}
                          </button>
                        )}
                        {!q.answer && !q.isSolved && replyCount === 0 && (
                          <span className="flex items-center gap-1 text-[11px] text-yellow-400/60 italic">
                            <span className="material-symbols-outlined text-xs">schedule</span>
                            Queued for Live Mastermind Breakdown
                          </span>
                        )}
                      </div>

                      {/* Expanded Replies List */}
                      <AnimatePresence>
                        {isOpen && replies.map((reply: any) => (
                          <motion.div
                            key={reply.id}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -8 }}
                            className={`ml-4 pl-3 border-l-2 rounded-r-lg p-3 space-y-2 ${
                              reply.isSolution
                                ? 'border-[#2ED573] bg-[#2ED573]/8'
                                : reply.isCoach
                                ? 'border-[#00D2FF] bg-[#00D2FF]/5'
                                : 'border-outline-variant/40 bg-[#0A0F1C]'
                            }`}
                          >
                            {/* Reply header */}
                            <div className="flex items-center gap-2 flex-wrap">
                              {reply.isSolution && (
                                <span className="px-2 py-0.5 rounded-full bg-[#2ED573]/20 border border-[#2ED573]/50 text-[#2ED573] font-mono-data text-[9px] font-bold flex items-center gap-1">
                                  <span className="material-symbols-outlined text-xs">verified</span>
                                  SOLUTION
                                </span>
                              )}
                              {reply.isCoach && (
                                <span className="flex items-center gap-1 text-[#00D2FF] font-bold text-[10px]">
                                  <span className="material-symbols-outlined text-xs">verified_user</span>
                                  COMMAND COUNCIL
                                </span>
                              )}
                              <span className="text-on-surface font-bold text-[11px]">{reply.authorName}</span>
                              <span className="text-on-surface-variant text-[10px]">[{reply.authorBadge}]</span>
                              <span className="text-on-surface-variant text-[10px]">
                                • {new Date(reply.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>

                            {/* Reply body with Markdown */}
                            <MarkdownRenderer content={reply.body} />

                            {/* Mark as Solution button */}
                            {(isAuthor || isCoach) && (
                              <button
                                type="button"
                                onClick={() => handleMarkSolution(q.id, reply.id)}
                                className={`flex items-center gap-1 text-[10px] font-bold transition-colors cursor-pointer ${
                                  reply.isSolution
                                    ? 'text-[#2ED573] hover:text-[#2ED573]/70'
                                    : 'text-on-surface-variant hover:text-[#2ED573]'
                                }`}
                              >
                                <span className="material-symbols-outlined text-xs">
                                  {reply.isSolution ? 'check_circle' : 'check_circle_outline'}
                                </span>
                                {reply.isSolution ? 'UNMARK SOLUTION' : 'MARK AS SOLUTION'}
                              </button>
                            )}
                          </motion.div>
                        ))}
                      </AnimatePresence>

                      {/* Reply Input Box */}
                      <AnimatePresence>
                        {isReplyBoxOpen && activeUser && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="ml-4 space-y-2"
                          >
                            <div className="text-[10px] text-on-surface-variant font-mono-data mb-1">
                              Supports **bold**, `code`, bullet lists (Markdown)
                            </div>
                            <textarea
                              value={replyText[q.id] || ''}
                              onChange={(e) => setReplyText((prev) => ({ ...prev, [q.id]: e.target.value }))}
                              placeholder="Type your reply... (Markdown supported)"
                              rows={3}
                              className="w-full p-3 rounded-lg bg-[#141B2D] border border-outline-variant/40 focus:border-secondary outline-none text-on-surface text-xs font-mono-data resize-none transition-colors"
                            />
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                disabled={!replyText[q.id]?.trim() || replySubmitting.has(q.id)}
                                onClick={() => handlePostReply(q.id)}
                                className="px-4 py-1.5 rounded-lg bg-secondary text-black font-bold text-xs uppercase hover:bg-secondary-container transition-all cursor-pointer disabled:opacity-50"
                              >
                                {replySubmitting.has(q.id) ? 'SENDING...' : 'SEND REPLY'}
                              </button>
                              <span className="text-[10px] text-on-surface-variant">
                                Replying as <span className="text-secondary">{activeUser?.name || 'Operative'}</span>
                              </span>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })()}
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Tactical Load More Mastermind Questions */}
        {hasMore && (
          <div className="pt-3 flex justify-center">
            <button
              onClick={() => fetchQuestions(false, page + 1, true)}
              disabled={loadingMore}
              className="px-6 py-3 rounded-xl bg-[#0E1424] hover:bg-secondary/15 border border-secondary/40 hover:border-secondary text-secondary font-mono-data text-xs font-bold transition-all cursor-pointer flex items-center gap-2.5 shadow-[0_0_20px_rgba(255,184,0,0.15)] disabled:opacity-50"
            >
              {loadingMore ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-secondary/30 border-t-secondary rounded-full animate-spin" />
                  <span>SYNCHRONIZING ARCHIVED QUESTIONS...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-base">expand_more</span>
                  <span>LOAD MORE TRANSMISSIONS ({questions.length} OF {totalQuestions || questions.length})</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
