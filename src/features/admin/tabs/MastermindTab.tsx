import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../../services/api';
import { exportToCSV } from '../utils/exportCsv';
import { authService } from '../../../services/auth';

interface MastermindTabProps {
  addToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}

export const MastermindTab: React.FC<MastermindTabProps> = ({ addToast }) => {
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'UNANSWERED' | 'STUDENT_REPLY' | 'ANSWERED' | 'PINNED'>('ALL');
  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);

  // Threaded reply state (coach can also reply via thread endpoint)
  const [threadReplyId, setThreadReplyId] = useState<string | null>(null);
  const [threadReplyText, setThreadReplyText] = useState('');
  const [submittingThreadReply, setSubmittingThreadReply] = useState(false);
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());

  const currentAdmin = authService.getAdminUser();

  const hasStudentFollowUp = (q: any): boolean => {
    const replies = q.replies || [];
    if (replies.length === 0) return false;
    const lastReply = replies[replies.length - 1];
    return !lastReply.isCoach;
  };

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      // Fetch questions for each course
      const courses = ['bmb', 'leadership', 'ignit'];
      const results = await Promise.all(
        courses.map((slug) => api.getMastermindQuestions(slug).catch(() => ({ data: [] })))
      );
      const combined: any[] = [];
      results.forEach((res) => {
        if (res.data && Array.isArray(res.data)) {
          combined.push(...res.data);
        }
      });
      // Sort by latest activity (question creation or latest thread reply)
      combined.sort((a, b) => {
        const aReplies = a.replies || [];
        const bReplies = b.replies || [];
        const aLatestReply = aReplies.length > 0 ? new Date(aReplies[aReplies.length - 1].createdAt).getTime() : 0;
        const bLatestReply = bReplies.length > 0 ? new Date(bReplies[bReplies.length - 1].createdAt).getTime() : 0;
        const aActivity = Math.max(new Date(a.updatedAt || a.createdAt).getTime(), aLatestReply);
        const bActivity = Math.max(new Date(b.updatedAt || b.createdAt).getTime(), bLatestReply);
        return bActivity - aActivity;
      });
      setQuestions(combined);
    } catch (err: any) {
      addToast(`❌ Failed to load questions: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, []);

  const handleSendAnswer = async (qId: string) => {
    if (!replyText.trim()) return;
    setSubmittingReply(true);
    try {
      const coachName = currentAdmin?.name ? `Commander ${currentAdmin.name}` : 'UWE Command Council';
      await api.answerMastermindQuestion(qId, {
        answer: replyText.trim(),
        answeredBy: coachName,
      });

      setQuestions((prev) =>
        prev.map((q) =>
          q.id === qId
            ? { ...q, answer: replyText.trim(), answeredBy: coachName, isAnswered: true }
            : q
        )
      );

      addToast('✅ Response transmitted to student dashboard!');
      setReplyingId(null);
      setReplyText('');
    } catch (err: any) {
      addToast(`❌ Failed to send answer: ${err.message}`, 'error');
    } finally {
      setSubmittingReply(false);
    }
  };

  const handlePostThreadReply = async (qId: string) => {
    if (!threadReplyText.trim()) return;
    setSubmittingThreadReply(true);
    try {
      const coachName = currentAdmin?.name ? `Commander ${currentAdmin.name}` : 'UWE Command Council';
      const res = await api.postMastermindReply(qId, threadReplyText.trim(), {
        asCoach: true,
        authorName: coachName,
        authorBadge: currentAdmin?.role ? `COMMAND ${currentAdmin.role}` : 'COMMAND COUNCIL',
      });
      if (res.data) {
        setQuestions((prev) =>
          prev.map((q) =>
            q.id === qId
              ? {
                  ...q,
                  isAnswered: true,
                  answeredBy: coachName,
                  replies: [...(q.replies || []), res.data],
                }
              : q
          )
        );
        setExpandedReplies((prev) => new Set(prev).add(qId));
        addToast('✅ Thread reply posted!', 'success');
        setThreadReplyId(null);
        setThreadReplyText('');
      }
    } catch (err: any) {
      addToast(`❌ Failed to post thread reply: ${err.message}`, 'error');
    } finally {
      setSubmittingThreadReply(false);
    }
  };

  const handleTogglePin = async (q: any) => {
    try {
      const newPinned = !q.isPinned;
      await api.answerMastermindQuestion(q.id, {
        answer: q.answer || '',
        answeredBy: q.answeredBy || 'Command Council',
        isPinned: newPinned,
      });
      setQuestions((prev) =>
        prev.map((item) => (item.id === q.id ? { ...item, isPinned: newPinned } : item))
      );
      addToast(newPinned ? '📌 Question pinned for Live Zoom' : 'Unpinned question');
    } catch (err: any) {
      addToast(`❌ Failed to update pin status: ${err.message}`, 'error');
    }
  };

  const handleDeleteQuestion = async (qId: string) => {
    if (!window.confirm('Are you sure you want to delete this question?')) return;
    try {
      await api.deleteMastermindQuestion(qId);
      setQuestions((prev) => prev.filter((q) => q.id !== qId));
      addToast('🗑️ Question deleted');
    } catch (err: any) {
      addToast(`❌ ${err.message}`, 'error');
    }
  };

  const filteredQuestions = questions.filter((q) => {
    const matchesCourse = selectedCourse === 'ALL' || q.courseSlug === selectedCourse.toLowerCase();
    if (!matchesCourse) return false;

    if (filterStatus === 'UNANSWERED') return (!q.isAnswered && !q.answer) || hasStudentFollowUp(q);
    if (filterStatus === 'STUDENT_REPLY') return hasStudentFollowUp(q);
    if (filterStatus === 'ANSWERED') return (q.isAnswered || Boolean(q.answer)) && !hasStudentFollowUp(q);
    if (filterStatus === 'PINNED') return q.isPinned;
    return true;
  });

  const studentFollowUpCount = questions.filter(hasStudentFollowUp).length;
  const unansweredCount = questions.filter((q) => (!q.isAnswered && !q.answer) || hasStudentFollowUp(q)).length;

  return (
    <motion.div
      key="mastermind"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className="space-y-6 font-mono-data text-xs"
    >
      {/* Header Banner */}
      <div className="flex justify-between items-center bg-[#0E131F] p-6 rounded-2xl border border-secondary/40 flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-secondary text-2xl">forum</span>
            <h3 className="font-headline-md text-lg text-on-surface font-bold">
              Student Mastermind Q&amp;A <span className="text-secondary">&amp; Drill Submissions</span>
            </h3>
            {unansweredCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full bg-red-500/20 border border-red-500/40 text-red-400 text-[10px] font-bold animate-pulse">
                {unansweredCount} PENDING ACTION
              </span>
            )}
            {studentFollowUpCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 text-[10px] font-bold animate-pulse">
                {studentFollowUpCount} STUDENT FOLLOW-UPS
              </span>
            )}
          </div>
          <p className="text-xs text-on-surface-variant mt-1">
            Review, answer, pin, and moderate student execution blockers submitted from the Student Dashboard.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={fetchQuestions}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl bg-surface-variant/40 hover:bg-surface-variant border border-outline-variant/40 text-on-surface text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <span className={`material-symbols-outlined text-sm text-secondary ${loading ? 'animate-spin' : ''}`}>
              refresh
            </span>
            <span>SYNC FEED</span>
          </button>

          <button
            onClick={() => exportToCSV('uwe_mastermind_qa', questions, addToast)}
            className="px-3.5 py-2 rounded-xl bg-secondary text-black text-xs font-bold hover:bg-secondary-container transition-all flex items-center gap-1.5 cursor-pointer shadow-[0_0_15px_rgba(255,184,0,0.3)]"
          >
            <span className="material-symbols-outlined text-sm">download</span>
            <span>EXPORT CSV</span>
          </button>
        </div>
      </div>

      {/* Filter Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0B0F19] p-4 rounded-xl border border-outline-variant/30">
        {/* Course Tabs */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-on-surface-variant text-[11px]">Course:</span>
          {['ALL', 'BMB', 'LEADERSHIP', 'IGNIT'].map((c) => (
            <button
              key={c}
              onClick={() => setSelectedCourse(c)}
              className={`px-3 py-1 rounded-lg text-xs transition-all cursor-pointer ${
                selectedCourse === c
                  ? 'bg-secondary text-black font-bold'
                  : 'bg-surface-variant/30 text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-on-surface-variant text-[11px]">Status:</span>
          {(['ALL', 'UNANSWERED', 'STUDENT_REPLY', 'ANSWERED', 'PINNED'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1 rounded-lg text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
                filterStatus === st
                  ? 'bg-secondary/20 text-secondary border border-secondary font-bold'
                  : 'bg-surface-variant/20 text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span>{st === 'STUDENT_REPLY' ? 'STUDENT FOLLOW-UP' : st}</span>
              {st === 'STUDENT_REPLY' && studentFollowUpCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-black text-[9px] font-black">
                  {studentFollowUpCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Questions Feed List */}
      <div className="space-y-4">
        {loading && (
          <div className="p-12 text-center text-on-surface-variant bg-[#0E131F] rounded-2xl border border-outline-variant/30 flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-secondary animate-spin">sync</span>
            <span>Loading mastermind feed...</span>
          </div>
        )}

        {!loading && filteredQuestions.length === 0 && (
          <div className="p-12 text-center text-on-surface-variant bg-[#0E131F] rounded-2xl border border-outline-variant/30">
            No questions match the selected filter.
          </div>
        )}

        <AnimatePresence>
          {filteredQuestions.map((q) => (
            <motion.div
              key={q.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`p-6 rounded-2xl border transition-all space-y-4 ${
                q.isPinned
                  ? 'bg-[#121829] border-secondary shadow-[0_0_20px_rgba(255,184,0,0.15)]'
                  : 'bg-[#0E131F] border-outline-variant/30'
              }`}
            >
              {/* Question Header */}
              <div className="flex justify-between items-start flex-wrap gap-2">
                <div className="flex items-center gap-2.5 flex-wrap">
                  {q.isPinned && (
                    <span className="px-2 py-0.5 rounded bg-secondary text-black font-bold text-[10px] uppercase flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">push_pin</span> PINNED FOR ZOOM
                    </span>
                  )}
                  {q.isSolved && (
                    <span className="px-2 py-0.5 rounded-full bg-[#2ED573]/15 border border-[#2ED573]/50 text-[#2ED573] font-bold text-[10px] flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">verified</span> SOLVED
                    </span>
                  )}
                  {hasStudentFollowUp(q) && (
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/60 text-amber-400 font-bold text-[10px] flex items-center gap-1 animate-pulse">
                      <span className="material-symbols-outlined text-xs">priority_high</span> STUDENT FOLLOW-UP
                    </span>
                  )}
                  {(q.replies?.length > 0) && (
                    <button
                      type="button"
                      onClick={() => setExpandedReplies((prev) => { const s = new Set(prev); s.has(q.id) ? s.delete(q.id) : s.add(q.id); return s; })}
                      className="px-2 py-0.5 rounded-full bg-surface-variant/30 text-on-surface-variant hover:text-secondary border border-outline-variant/30 text-[10px] flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <span className="material-symbols-outlined text-xs">chat_bubble_outline</span>
                      {q.replies.length} {expandedReplies.has(q.id) ? '▲' : '▼'}
                    </button>
                  )}
                  <span className="px-2.5 py-0.5 rounded bg-secondary/15 text-secondary border border-secondary/30 text-[10px] font-bold uppercase">
                    {q.courseSlug?.toUpperCase() || 'BMB'}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-surface-variant/30 text-on-surface-variant text-[10px]">
                    {q.drillTopic}
                  </span>
                  <span className="text-on-surface font-bold text-sm">
                    {q.authorName}
                  </span>
                  <span className="text-on-surface-variant text-[10px]">
                    [{q.authorBadge || 'OPERATIVE'}]
                  </span>
                  <span className="text-on-surface-variant text-[10px]">
                    • {new Date(q.createdAt).toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 rounded bg-surface-variant/20 text-on-surface text-xs flex items-center gap-1">
                    <span>▲</span>
                    <span className="font-bold">{q.upvotes || 0}</span>
                  </span>

                  <button
                    onClick={() => handleTogglePin(q)}
                    title={q.isPinned ? 'Unpin' : 'Pin to top for Zoom Mastermind'}
                    className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                      q.isPinned
                        ? 'bg-secondary text-black border-secondary'
                        : 'bg-surface-variant/30 text-on-surface-variant border-outline-variant/30 hover:text-secondary'
                    }`}
                  >
                    <span className="material-symbols-outlined text-sm">push_pin</span>
                  </button>

                  <button
                    onClick={() => handleDeleteQuestion(q.id)}
                    title="Delete question"
                    className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/30 transition-all cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm">delete</span>
                  </button>
                </div>
              </div>

              {/* Student Question Text */}
              <div className="bg-[#080C14] p-4 rounded-xl border border-outline-variant/20 text-on-surface text-sm leading-relaxed">
                "{q.question}"
              </div>

              {/* Coach Response Display */}
              {q.answer && (
                <div className="p-4 rounded-xl bg-[#06101E] border border-[#00D2FF]/40 space-y-1.5 text-xs">
                  <div className="flex items-center gap-1.5 text-[#00D2FF] font-bold text-[11px]">
                    <span className="material-symbols-outlined text-sm">verified_user</span>
                    <span>COACH RESPONSE • {q.answeredBy || 'Command Council'}</span>
                  </div>
                  <p className="text-on-surface leading-relaxed">
                    {q.answer}
                  </p>
                </div>
              )}

              {/* Action / Reply Bar */}
              <div className="pt-2 border-t border-outline-variant/20 flex justify-between items-center flex-wrap gap-2">
                <span className={`text-[11px] font-bold ${
                  hasStudentFollowUp(q)
                    ? 'text-amber-400 animate-pulse flex items-center gap-1'
                    : q.answer
                    ? 'text-[#2ED573]'
                    : 'text-yellow-400'
                }`}>
                  {hasStudentFollowUp(q)
                    ? '⚠️ Student Follow-up Awaiting Coach Response'
                    : q.answer
                    ? '✓ Official Answer Sent'
                    : '⏳ Awaiting Coach Response'}
                </span>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => {
                      setReplyingId(replyingId === q.id ? null : q.id);
                      setReplyText(q.answer || '');
                      setThreadReplyId(null);
                    }}
                    className="px-3.5 py-1.5 rounded-lg bg-surface-variant/40 hover:bg-surface-variant text-on-surface text-xs font-bold border border-outline-variant/30 transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm text-secondary">
                      {q.answer ? 'edit' : 'reply'}
                    </span>
                    <span>{q.answer ? 'EDIT OFFICIAL RESPONSE' : 'WRITE COACH RESPONSE'}</span>
                  </button>

                  <button
                    onClick={() => {
                      setThreadReplyId(threadReplyId === q.id ? null : q.id);
                      setThreadReplyText('');
                      setReplyingId(null);
                    }}
                    className="px-3.5 py-1.5 rounded-lg bg-[#00D2FF]/10 hover:bg-[#00D2FF]/20 text-[#00D2FF] text-xs font-bold border border-[#00D2FF]/30 transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm">forum</span>
                    <span>POST THREAD REPLY</span>
                  </button>
                </div>
              </div>

              {/* Thread Replies (expanded) */}
              {expandedReplies.has(q.id) && (q.replies || []).length > 0 && (
                <div className="space-y-2 pl-4 border-l-2 border-outline-variant/30">
                  {(q.replies || []).map((reply: any) => (
                    <div
                      key={reply.id}
                      className={`p-3 rounded-xl border text-xs space-y-1 ${
                        reply.isSolution
                          ? 'bg-[#2ED573]/8 border-[#2ED573]/40'
                          : reply.isCoach
                          ? 'bg-[#00D2FF]/5 border-[#00D2FF]/30'
                          : 'bg-[#0A0F1C] border-outline-variant/20'
                      }`}
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        {reply.isSolution && (
                          <span className="px-1.5 py-0.5 rounded-full bg-[#2ED573]/20 border border-[#2ED573]/50 text-[#2ED573] text-[9px] font-bold flex items-center gap-0.5">
                            <span className="material-symbols-outlined text-xs">verified</span> SOLUTION
                          </span>
                        )}
                        {reply.isCoach && (
                          <span className="text-[#00D2FF] font-bold text-[10px] flex items-center gap-0.5">
                            <span className="material-symbols-outlined text-xs">verified_user</span> COACH
                          </span>
                        )}
                        <span className="text-on-surface font-bold">{reply.authorName}</span>
                        <span className="text-on-surface-variant">[{reply.authorBadge}]</span>
                        <span className="text-on-surface-variant">
                          • {new Date(reply.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-on-surface leading-relaxed">{reply.body}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Thread Reply Form (coach) */}
              {threadReplyId === q.id && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-[#06101E] p-4 rounded-xl border border-[#00D2FF]/40 space-y-3"
                >
                  <label className="block text-[#00D2FF] font-bold text-[11px] uppercase">
                    Coach Thread Reply to {q.authorName} (Markdown supported):
                  </label>
                  <textarea
                    rows={3}
                    value={threadReplyText}
                    onChange={(e) => setThreadReplyText(e.target.value)}
                    placeholder="Type reply with **bold**, `code`, bullet points..."
                    className="w-full p-3 rounded-lg bg-[#0E1322] border border-outline-variant/40 text-on-surface focus:border-[#00D2FF] outline-none text-xs leading-relaxed font-mono"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setThreadReplyId(null)}
                      className="px-3.5 py-1.5 rounded-lg bg-surface-variant/30 text-on-surface-variant hover:text-on-surface text-xs cursor-pointer"
                    >
                      CANCEL
                    </button>
                    <button
                      onClick={() => handlePostThreadReply(q.id)}
                      disabled={submittingThreadReply || !threadReplyText.trim()}
                      className="px-4 py-1.5 rounded-lg bg-[#00D2FF] text-black text-xs font-bold hover:bg-[#00D2FF]/80 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-sm">forum</span>
                      <span>{submittingThreadReply ? 'SENDING...' : 'POST THREAD REPLY'}</span>
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Inline Reply Form */}
              {replyingId === q.id && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-[#070B14] p-4 rounded-xl border border-secondary/40 space-y-3"
                >
                  <label className="block text-secondary font-bold text-[11px] uppercase">
                    Official Command Council Answer for {q.authorName}:
                  </label>
                  <textarea
                    rows={3}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Type drill breakdown, neuro-anchoring feedback, or live session notes..."
                    className="w-full p-3 rounded-lg bg-[#0E1322] border border-outline-variant/40 text-on-surface focus:border-secondary outline-none text-xs leading-relaxed"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setReplyingId(null)}
                      className="px-3.5 py-1.5 rounded-lg bg-surface-variant/30 text-on-surface-variant hover:text-on-surface text-xs cursor-pointer"
                    >
                      CANCEL
                    </button>
                    <button
                      onClick={() => handleSendAnswer(q.id)}
                      disabled={submittingReply || !replyText.trim()}
                      className="px-4 py-1.5 rounded-lg bg-secondary text-black text-xs font-bold hover:bg-secondary-container transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-sm">send</span>
                      <span>{submittingReply ? 'TRANSMITTING...' : 'TRANSMIT ANSWER'}</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};
