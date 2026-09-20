import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../../services/api';
import { useAdminToast } from '../hooks/useAdminToast';
import { authService } from '../../../services/auth';

type ViewState = 'lookup' | 'logging' | 'daily_sheet' | 'team_overview';

export const CallTrackerTab: React.FC = () => {
  const { addToast } = useAdminToast();
  const [view, setView] = useState<ViewState>('lookup');
  
  // Lookup State
  const [phone, setPhone] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [lookupResult, setLookupResult] = useState<any>(null);
  const [newLeadName, setNewLeadName] = useState('');

  // Logging State
  const [outcome, setOutcome] = useState('');
  const [funnelStage, setFunnelStage] = useState('');
  const [notes, setNotes] = useState('');
  const [proofImage, setProofImage] = useState<string | null>(null);
  const [isLogging, setIsLogging] = useState(false);
  
  // Daily Sheet State
  const [dailyLogs, setDailyLogs] = useState<any[]>([]);
  const [isLoadingSheet, setIsLoadingSheet] = useState(false);
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [expandedHistory, setExpandedHistory] = useState<any[] | null>(null);
  
  // Team Overview State
  const [teamStats, setTeamStats] = useState<any>(null);
  const [globalLogs, setGlobalLogs] = useState<any[]>([]);
  const [isLoadingTeam, setIsLoadingTeam] = useState(false);
  
  const adminUser = authService.getAdminUser();
  const adminId = adminUser?.id;
  const isSuperAdmin = adminUser?.role === 'SUPER_ADMIN';

  const handleCheckNumber = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || phone.length < 7) return;

    setIsChecking(true);
    setLookupResult(null);
    try {
      const res = await api.checkCallNumber(phone);
      if (res.success) {
        setLookupResult(res.data);
      } else {
        addToast(res.message || 'Error checking number', 'error');
      }
    } catch (err: any) {
      addToast(err.message || 'Failed to connect to server', 'error');
    } finally {
      setIsChecking(false);
    }
  };

  const handleLockAndCall = async () => {
    if (!lookupResult?.lead?.id) return;
    try {
      const res = await api.lockCallNumber(lookupResult.lead.id);
      if (res.success) {
        setView('logging');
      } else {
        addToast(res.message || 'Failed to lock number', 'error');
      }
    } catch (err: any) {
      addToast(err.message, 'error');
    }
  };

  const handleCreateNewLeadAndCall = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLeadName.trim() || !phone) return;
    
    setIsChecking(true);
    try {
      const res = await api.createLead({ name: newLeadName, phone, inquiryType: 'OTHER' });
      if (res.success) {
        addToast('New lead created successfully', 'success');
        // Instantly simulate a positive lookup result so they can lock and call
        setLookupResult({
          status: 'AVAILABLE',
          message: '✅ New lead created. Go ahead!',
          lead: {
            id: res.data.id,
            name: res.data.name,
            phone: res.data.phone,
            totalCallAttempts: 0,
          }
        });
        setNewLeadName('');
      } else {
        addToast(res.message || 'Failed to create lead', 'error');
      }
    } catch (err: any) {
      addToast(err.message, 'error');
    } finally {
      setIsChecking(false);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      addToast('Image must be under 5MB', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setProofImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleLogCall = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!outcome) {
      addToast('Please select an outcome', 'error');
      return;
    }

    setIsLogging(true);
    try {
      const res = await api.logCall({
        leadId: lookupResult.lead.id,
        outcome,
        funnelStage: funnelStage || undefined,
        notes,
        proofImage,
      });

      if (res.success) {
        addToast('Call logged successfully', 'success');
        resetLookup();
      } else {
        addToast(res.message || 'Failed to log call', 'error');
      }
    } catch (err: any) {
      addToast(err.message, 'error');
    } finally {
      setIsLogging(false);
    }
  };

  const resetLookup = () => {
    setPhone('');
    setLookupResult(null);
    setOutcome('');
    setFunnelStage('');
    setNotes('');
    setProofImage(null);
    setView('lookup');
  };

  const fetchDailySheet = async () => {
    setIsLoadingSheet(true);
    try {
      const res = await api.getDailySheet();
      if (res.success) {
        setDailyLogs(res.data.logs);
      }
    } catch (err: any) {
      addToast('Failed to load daily sheet', 'error');
    } finally {
      setIsLoadingSheet(false);
    }
  };

  const fetchTeamOverview = async () => {
    setIsLoadingTeam(true);
    try {
      const [statsRes, logsRes] = await Promise.all([
        api.getCallStats(),
        api.getAllCallLogs(30, 1),
      ]);
      if (statsRes.success) setTeamStats(statsRes.data);
      if (logsRes.success) {
        // Deduplicate logs by leadId to show only the latest status per lead globally
        const uniqueLogs: any[] = [];
        const seenLeads = new Set<string>();
        for (const log of logsRes.data) {
          if (!seenLeads.has(log.leadId)) {
            seenLeads.add(log.leadId);
            uniqueLogs.push(log);
          }
        }
        setGlobalLogs(uniqueLogs);
      }
    } catch (err: any) {
      addToast('Failed to load team overview', 'error');
    } finally {
      setIsLoadingTeam(false);
    }
  };

  useEffect(() => {
    if (view === 'daily_sheet') fetchDailySheet();
    if (view === 'team_overview') fetchTeamOverview();
  }, [view]);

  const handleUpdateStage = (log: any) => {
    setPhone(log.leadPhone);
    setLookupResult({
      status: 'AVAILABLE',
      message: 'Updating existing lead...',
      lead: {
        id: log.leadId,
        name: log.leadName,
        phone: log.leadPhone,
        totalCallAttempts: 1, // mock
      }
    });
    // Set the previous outcome and funnel stage so it's easier to edit
    setOutcome(log.outcome);
    setFunnelStage(log.funnelStage || '');
    setView('logging');
  };

  const handleViewHistory = async (log: any) => {
    if (expandedRowId === log.id) {
      setExpandedRowId(null);
      return;
    }
    setExpandedRowId(log.id);
    setExpandedHistory(null);
    try {
      const res = await api.getCallHistory(log.leadId);
      if (res.success && res.data) {
        setExpandedHistory(res.data);
      } else {
        setExpandedHistory([]);
      }
    } catch (err: any) {
      addToast(err.message || 'Failed to fetch history', 'error');
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="flex gap-4 mb-8">
        <button
          onClick={() => setView('lookup')}
          className={`px-4 py-2 rounded-lg font-bold transition-colors ${view === 'lookup' || view === 'logging' ? 'bg-primary text-black' : 'bg-surface-variant text-on-surface'}`}
        >
          📞 Make a Call
        </button>
        <button
          onClick={() => setView('daily_sheet')}
          className={`px-4 py-2 rounded-lg font-bold transition-colors ${view === 'daily_sheet' ? 'bg-primary text-black' : 'bg-surface-variant text-on-surface'}`}
        >
          📋 My Daily Sheet
        </button>
        {isSuperAdmin && (
          <button
            onClick={() => setView('team_overview')}
            className={`px-4 py-2 rounded-lg font-bold transition-colors ${view === 'team_overview' ? 'bg-primary text-black' : 'bg-surface-variant text-on-surface'}`}
          >
            📊 Team Overview
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {view === 'lookup' && (
          <motion.div
            key="lookup"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-surface rounded-xl p-6 border border-outline-variant/30"
          >
            <h2 className="text-xl font-bold mb-4">Check Phone Number</h2>
            <form onSubmit={handleCheckNumber} className="flex gap-4 mb-8">
              <input
                type="text"
                placeholder="Enter phone number..."
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="flex-1 bg-surface-variant border border-outline-variant/50 rounded-lg px-4 py-2 focus:border-primary focus:outline-none"
              />
              <button
                type="submit"
                disabled={isChecking || !phone}
                className="bg-primary text-black px-6 py-2 rounded-lg font-bold disabled:opacity-50"
              >
                {isChecking ? 'Checking...' : 'Check'}
              </button>
            </form>

            {lookupResult && (
              <div className="mt-6">
                <div className={`p-4 rounded-lg mb-6 ${lookupResult.status === 'AVAILABLE' ? 'bg-green-500/10 border border-green-500/30' : 'bg-red-500/10 border border-red-500/30'}`}>
                  <p className="font-bold text-lg">{lookupResult.message}</p>
                </div>

                {lookupResult.status === 'NOT_IN_SYSTEM' && (
                  <form onSubmit={handleCreateNewLeadAndCall} className="mt-4 p-6 bg-surface-variant/50 rounded-xl border border-outline-variant/30 flex flex-col gap-4">
                    <h3 className="font-bold text-primary mb-2">Create New Lead</h3>
                    <input
                      type="text"
                      placeholder="Enter Lead Name..."
                      value={newLeadName}
                      onChange={(e) => setNewLeadName(e.target.value)}
                      className="bg-surface border border-outline-variant/50 rounded-lg px-4 py-3 focus:border-primary focus:outline-none"
                      required
                    />
                    <button
                      type="submit"
                      disabled={isChecking || !newLeadName.trim()}
                      className="bg-primary text-black px-6 py-3 rounded-lg font-bold disabled:opacity-50 mt-2"
                    >
                      {isChecking ? 'Creating...' : 'Create Lead & Start Call'}
                    </button>
                  </form>
                )}

                {lookupResult.status === 'AVAILABLE' && lookupResult.lead && (
                  <div className="bg-surface-variant rounded-lg p-6">
                    <h3 className="font-bold text-xl mb-2">{lookupResult.lead.name}</h3>
                    <p className="text-on-surface-variant mb-6">Past calls: {lookupResult.lead.totalCallAttempts}</p>
                    
                    <button
                      onClick={handleLockAndCall}
                      className="w-full bg-primary text-black font-bold py-3 rounded-lg hover:brightness-110 transition-all text-lg shadow-[0_0_20px_rgba(255,184,0,0.3)]"
                    >
                      Lock Number & Call Now
                    </button>
                  </div>
                )}
                
                {/* Call History Display */}
                {lookupResult.callHistory && lookupResult.callHistory.length > 0 && (
                  <div className="mt-8 bg-[#0E131F] rounded-xl p-6 border border-outline-variant/30">
                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                      <span className="material-symbols-outlined text-secondary">history</span>
                      Past Call History
                    </h3>
                    <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-outline-variant/30 before:to-transparent">
                      {lookupResult.callHistory.map((log: any, idx: number) => (
                        <div key={log.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                          <div className="flex items-center justify-center w-10 h-10 rounded-full border border-outline-variant/50 bg-[#131929] text-on-surface-variant group-[.is-active]:text-primary group-[.is-active]:border-primary shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                            <span className="material-symbols-outlined text-sm">call</span>
                          </div>
                          <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-outline-variant/30 bg-surface-variant/50 shadow">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-bold text-sm text-primary">{log.adminName}</span>
                              <span className="text-xs text-on-surface-variant">{new Date(log.calledAt).toLocaleDateString()}</span>
                            </div>
                            <div className="mb-2">
                              <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                log.outcome === 'ANSWERED_POSITIVE' ? 'bg-green-500/20 text-green-400' :
                                log.outcome === 'ANSWERED_NEGATIVE' ? 'bg-red-500/20 text-red-400' :
                                'bg-outline-variant/30 text-on-surface'
                              }`}>
                                {log.outcome.replace('_', ' ')}
                              </span>
                              {log.funnelStage && (
                                <span className="inline-block ml-2 px-2 py-0.5 rounded bg-secondary/20 text-secondary text-[10px] font-bold">
                                  {log.funnelStage}
                                </span>
                              )}
                            </div>
                            {log.notes && (
                              <p className="text-xs text-on-surface-variant mt-2 italic border-l-2 border-outline-variant/50 pl-2">
                                "{log.notes}"
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}

        {view === 'logging' && (
          <motion.div
            key="logging"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-surface rounded-xl p-6 border border-primary shadow-[0_0_30px_rgba(255,184,0,0.15)]"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-primary">Log Call Result</h2>
              <div className="flex flex-col items-end">
                <span className="bg-red-500/20 text-red-400 px-3 py-1 rounded-full text-sm font-bold animate-pulse">
                  Dialing Lock Active (30m)
                </span>
                <span className="text-[10px] text-on-surface-variant mt-1 max-w-[200px] text-right">
                  Prevents other operatives from dialing this number while you are on the call.
                </span>
              </div>
            </div>

            <div className="mb-6 p-4 bg-surface-variant rounded-lg">
              <p className="text-sm text-on-surface-variant uppercase tracking-wider">Calling</p>
              <p className="text-xl font-bold">{lookupResult?.lead?.name}</p>
              <p className="text-lg">{lookupResult?.lead?.phone}</p>
            </div>

            <form onSubmit={handleLogCall} className="space-y-6">
              <div>
                <label className="block text-sm font-bold mb-2">Call Outcome <span className="text-red-500">*</span></label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    { id: 'ANSWERED_POSITIVE', label: '✅ Answered - Positive' },
                    { id: 'ANSWERED_NEGATIVE', label: '❌ Answered - Negative' },
                    { id: 'NO_ANSWER', label: '📵 No Answer' },
                    { id: 'CALLBACK_REQUESTED', label: '⏰ Callback Requested' },
                    { id: 'WRONG_NUMBER', label: '🚫 Wrong Number' }
                  ].map(o => (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => setOutcome(o.id)}
                      className={`p-3 rounded-lg border text-sm font-bold transition-all ${outcome === o.id ? 'bg-primary text-black border-primary' : 'bg-surface-variant border-outline-variant/30 hover:border-primary/50'}`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>

              {outcome === 'ANSWERED_POSITIVE' && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                  <label className="block text-sm font-bold mb-2">Funnel Stage Reached</label>
                  <select
                    value={funnelStage}
                    onChange={(e) => setFunnelStage(e.target.value)}
                    className="w-full bg-surface-variant border border-outline-variant/50 rounded-lg p-3 focus:border-primary focus:outline-none"
                  >
                    <option value="">-- Select Stage --</option>
                    <option value="APPROACH">1. Approach (Intro)</option>
                    <option value="TRUST">2. Trust (Building Rapport)</option>
                    <option value="MONEY">3. Money (Pricing Discussed)</option>
                    <option value="CLOSING">4. Closing (Final Push)</option>
                    <option value="SIGNED_UP">🎉 5. SIGNED UP (Enrolled)</option>
                  </select>
                </motion.div>
              )}

              <div>
                <label className="block text-sm font-bold mb-2">Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="What was discussed?"
                  className="w-full bg-surface-variant border border-outline-variant/50 rounded-lg p-3 h-24 focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-2">Attach Screenshot (Optional)</label>
                <div className="flex items-center gap-4">
                  <label className="cursor-pointer bg-surface border border-outline-variant/50 hover:border-primary/50 text-sm font-bold px-4 py-2 rounded-lg transition-colors flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm">upload_file</span>
                    Choose Image
                    <input type="file" accept="image/png, image/jpeg, image/webp" className="hidden" onChange={handleImageSelect} />
                  </label>
                  {proofImage && (
                    <div className="relative">
                      <img src={proofImage} alt="Proof Thumbnail" className="h-12 w-12 object-cover rounded border border-outline-variant/50" />
                      <button type="button" onClick={() => setProofImage(null)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">×</button>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={resetLookup}
                  className="px-6 py-3 rounded-lg font-bold bg-surface-variant hover:bg-surface-variant/80 transition-colors"
                >
                  Cancel / Release Lock
                </button>
                <button
                  type="submit"
                  disabled={isLogging || !outcome}
                  className="flex-1 bg-primary text-black font-bold py-3 rounded-lg hover:brightness-110 transition-all disabled:opacity-50"
                >
                  {isLogging ? 'Saving...' : 'Save Call & Release Lock'}
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {view === 'daily_sheet' && (
          <motion.div
            key="daily"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-surface rounded-xl p-6 border border-outline-variant/30"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">My Daily Call Sheet</h2>
              <button onClick={fetchDailySheet} className="text-primary hover:underline text-sm font-bold">
                Refresh
              </button>
            </div>

            {isLoadingSheet ? (
              <p className="text-center text-on-surface-variant py-8">Loading...</p>
            ) : dailyLogs.length === 0 ? (
              <p className="text-center text-on-surface-variant py-8 bg-surface-variant rounded-lg">No calls logged today.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-outline-variant/30 text-on-surface-variant text-sm font-label-caps">
                      <th className="pb-3 font-medium">Time</th>
                      <th className="pb-3 font-medium">Lead Name</th>
                      <th className="pb-3 font-medium">Phone</th>
                      <th className="pb-3 font-medium">Outcome</th>
                      <th className="pb-3 font-medium">Stage</th>
                      <th className="pb-3 font-medium text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dailyLogs.map((log) => (
                      <React.Fragment key={log.id}>
                        <tr className="border-b border-outline-variant/10 hover:bg-surface-variant/30 transition-colors">
                          <td className="py-3 text-sm text-on-surface-variant">{new Date(log.calledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                          <td className="py-3 font-medium">{log.leadName}</td>
                          <td className="py-3 text-sm">{log.leadPhone}</td>
                          <td className="py-3">
                            <span className={`text-xs px-2 py-1 rounded-full font-bold ${
                              log.outcome === 'ANSWERED_POSITIVE' ? 'bg-green-500/20 text-green-400' :
                              log.outcome === 'ANSWERED_NEGATIVE' ? 'bg-red-500/20 text-red-400' :
                              'bg-surface-variant text-on-surface-variant'
                            }`}>
                              {log.outcome.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="py-3 text-sm">{log.funnelStage || '-'}</td>
                          <td className="py-3 text-right flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleViewHistory(log)}
                              className="px-3 py-1 rounded bg-surface-variant hover:bg-secondary hover:text-black border border-outline-variant/30 text-xs font-bold transition-colors"
                            >
                              {expandedRowId === log.id ? 'Close' : 'View'}
                            </button>
                            <button
                              onClick={() => handleUpdateStage(log)}
                              className="px-3 py-1 rounded bg-surface-variant hover:bg-primary hover:text-black border border-outline-variant/30 text-xs font-bold transition-colors"
                            >
                              Update
                            </button>
                          </td>
                        </tr>
                        
                        {/* Expanded History Row */}
                        {expandedRowId === log.id && (
                          <tr className="bg-surface-variant/10 border-b border-outline-variant/20">
                            <td colSpan={6} className="p-0">
                              <div className="p-6">
                                {!expandedHistory ? (
                                  <div className="flex justify-center items-center py-4">
                                    <span className="material-symbols-outlined animate-spin text-secondary">autorenew</span>
                                    <span className="ml-2 text-sm text-on-surface-variant">Loading history...</span>
                                  </div>
                                ) : expandedHistory.length === 0 ? (
                                  <p className="text-sm text-on-surface-variant italic text-center">No past call history found.</p>
                                ) : (
                                  <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-outline-variant/30 before:to-transparent">
                                    {expandedHistory.map((hlog: any) => (
                                      <div key={hlog.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                        <div className="flex items-center justify-center w-10 h-10 rounded-full border border-outline-variant/50 bg-[#131929] text-on-surface-variant group-[.is-active]:text-secondary group-[.is-active]:border-secondary shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                                          <span className="material-symbols-outlined text-sm">history</span>
                                        </div>
                                        <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-outline-variant/30 bg-surface-variant/50 shadow">
                                          <div className="flex items-center justify-between mb-1">
                                            <span className="font-bold text-sm text-primary">{hlog.adminName}</span>
                                            <span className="text-xs text-on-surface-variant">{new Date(hlog.calledAt).toLocaleString()}</span>
                                          </div>
                                          <div className="mb-2">
                                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                              hlog.outcome === 'ANSWERED_POSITIVE' ? 'bg-green-500/20 text-green-400' :
                                              hlog.outcome === 'ANSWERED_NEGATIVE' ? 'bg-red-500/20 text-red-400' :
                                              'bg-outline-variant/30 text-on-surface'
                                            }`}>
                                              {hlog.outcome.replace('_', ' ')}
                                            </span>
                                            {hlog.funnelStage && (
                                              <span className="inline-block ml-2 px-2 py-0.5 rounded bg-secondary/20 text-secondary text-[10px] font-bold">
                                                {hlog.funnelStage}
                                              </span>
                                            )}
                                          </div>
                                          {hlog.notes && (
                                            <p className="text-xs text-on-surface-variant mt-2 italic border-l-2 border-outline-variant/50 pl-2">
                                              "{hlog.notes}"
                                            </p>
                                          )}
                                          {hlog.proofData && (
                                            <div className="mt-3">
                                              <img src={hlog.proofData} alt="Proof" className="max-h-32 rounded-lg border border-outline-variant/30 hover:scale-[1.5] transition-transform origin-top-left cursor-pointer shadow-md" />
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        )}

        {view === 'team_overview' && isSuperAdmin && (
          <motion.div
            key="team_overview"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-8"
          >
            {isLoadingTeam ? (
              <div className="bg-surface rounded-xl p-8 border border-outline-variant/30 flex justify-center items-center">
                <span className="material-symbols-outlined animate-spin text-primary text-3xl">autorenew</span>
                <span className="ml-3 font-bold text-on-surface-variant">Loading Command Center...</span>
              </div>
            ) : (
              <>
                {/* Leaderboard Section */}
                <div className="bg-surface rounded-xl p-6 border border-outline-variant/30">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary">leaderboard</span>
                      Team Leaderboard (Today)
                    </h2>
                    <button onClick={fetchTeamOverview} className="text-primary hover:underline text-sm font-bold">
                      Refresh Data
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-surface-variant rounded-lg p-4 border border-outline-variant/20">
                      <p className="text-sm text-on-surface-variant uppercase tracking-wider mb-1">Total Calls</p>
                      <p className="text-3xl font-black text-primary">{teamStats?.today?.total || 0}</p>
                    </div>
                    <div className="bg-surface-variant rounded-lg p-4 border border-outline-variant/20">
                      <p className="text-sm text-on-surface-variant uppercase tracking-wider mb-1">Positive Contacts</p>
                      <p className="text-3xl font-black text-[#2ED573]">{teamStats?.totalPositiveContacts || 0}</p>
                    </div>
                    <div className="bg-surface-variant rounded-lg p-4 border border-outline-variant/20">
                      <p className="text-sm text-on-surface-variant uppercase tracking-wider mb-1">Sign-Ups</p>
                      <p className="text-3xl font-black text-secondary">{teamStats?.totalSignedUp || 0}</p>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-outline-variant/30 text-on-surface-variant text-sm font-label-caps">
                          <th className="pb-3 font-medium">Rank</th>
                          <th className="pb-3 font-medium">Operator</th>
                          <th className="pb-3 font-medium text-right">Calls Made</th>
                          <th className="pb-3 font-medium text-right">Sign-Ups</th>
                        </tr>
                      </thead>
                      <tbody>
                        {teamStats?.topCallers?.map((caller: any, idx: number) => (
                          <tr key={caller.name} className="border-b border-outline-variant/10 hover:bg-surface-variant/30 transition-colors">
                            <td className="py-3 font-bold text-on-surface-variant">#{idx + 1}</td>
                            <td className="py-3 font-medium">{caller.name}</td>
                            <td className="py-3 text-right font-mono-data text-primary">{caller.calls}</td>
                            <td className="py-3 text-right font-mono-data text-secondary">{caller.signUps}</td>
                          </tr>
                        ))}
                        {(!teamStats?.topCallers || teamStats.topCallers.length === 0) && (
                          <tr>
                            <td colSpan={4} className="py-8 text-center text-on-surface-variant italic">No calls made today yet.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Global Live Feed */}
                <div className="bg-surface rounded-xl p-6 border border-outline-variant/30">
                  <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#FF4757] animate-pulse">live_tv</span>
                    Global Live Feed
                  </h2>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-outline-variant/30 text-on-surface-variant text-sm font-label-caps">
                          <th className="pb-3 font-medium">Time</th>
                          <th className="pb-3 font-medium">Operator</th>
                          <th className="pb-3 font-medium">Lead</th>
                          <th className="pb-3 font-medium">Outcome</th>
                          <th className="pb-3 font-medium text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {globalLogs.slice(0, 20).map((log) => (
                          <React.Fragment key={log.id}>
                            <tr className="border-b border-outline-variant/10 hover:bg-surface-variant/30 transition-colors">
                              <td className="py-3 text-sm text-on-surface-variant">{new Date(log.calledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                              <td className="py-3 font-medium text-primary text-sm">{log.adminName.split('@')[0]}</td>
                              <td className="py-3 font-medium text-sm">{log.leadName}</td>
                              <td className="py-3">
                                <span className={`text-[10px] px-2 py-1 rounded-full font-bold ${
                                  log.outcome === 'ANSWERED_POSITIVE' ? 'bg-green-500/20 text-green-400' :
                                  log.outcome === 'ANSWERED_NEGATIVE' ? 'bg-red-500/20 text-red-400' :
                                  'bg-surface-variant text-on-surface-variant'
                                }`}>
                                  {log.outcome.replace('_', ' ')}
                                </span>
                                {log.funnelStage && (
                                  <span className="text-[10px] ml-2 text-secondary font-bold">({log.funnelStage})</span>
                                )}
                              </td>
                              <td className="py-3 text-right">
                                <button
                                  onClick={() => handleViewHistory(log)}
                                  className="px-3 py-1 rounded bg-surface-variant hover:bg-secondary hover:text-black border border-outline-variant/30 text-xs font-bold transition-colors"
                                >
                                  {expandedRowId === log.id ? 'Close' : 'View'}
                                </button>
                              </td>
                            </tr>
                            {/* Expanded History Row */}
                            {expandedRowId === log.id && (
                              <tr className="bg-surface-variant/10 border-b border-outline-variant/20">
                                <td colSpan={5} className="p-0">
                                  <div className="p-6">
                                    {!expandedHistory ? (
                                      <div className="flex justify-center items-center py-4">
                                        <span className="material-symbols-outlined animate-spin text-secondary">autorenew</span>
                                        <span className="ml-2 text-sm text-on-surface-variant">Loading history...</span>
                                      </div>
                                    ) : expandedHistory.length === 0 ? (
                                      <p className="text-sm text-on-surface-variant italic text-center">No past call history found.</p>
                                    ) : (
                                      <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-outline-variant/30 before:to-transparent">
                                        {expandedHistory.map((hlog: any) => (
                                          <div key={hlog.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                            <div className="flex items-center justify-center w-10 h-10 rounded-full border border-outline-variant/50 bg-[#131929] text-on-surface-variant group-[.is-active]:text-secondary group-[.is-active]:border-secondary shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                                              <span className="material-symbols-outlined text-sm">history</span>
                                            </div>
                                            <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-outline-variant/30 bg-surface-variant/50 shadow">
                                              <div className="flex items-center justify-between mb-1">
                                                <span className="font-bold text-sm text-primary">{hlog.adminName}</span>
                                                <span className="text-xs text-on-surface-variant">{new Date(hlog.calledAt).toLocaleString()}</span>
                                              </div>
                                              <div className="mb-2">
                                                <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                                  hlog.outcome === 'ANSWERED_POSITIVE' ? 'bg-green-500/20 text-green-400' :
                                                  hlog.outcome === 'ANSWERED_NEGATIVE' ? 'bg-red-500/20 text-red-400' :
                                                  'bg-outline-variant/30 text-on-surface'
                                                }`}>
                                                  {hlog.outcome.replace('_', ' ')}
                                                </span>
                                                {hlog.funnelStage && (
                                                  <span className="inline-block ml-2 px-2 py-0.5 rounded bg-secondary/20 text-secondary text-[10px] font-bold">
                                                    {hlog.funnelStage}
                                                  </span>
                                                )}
                                              </div>
                                              {hlog.notes && (
                                                <p className="text-xs text-on-surface-variant mt-2 italic border-l-2 border-outline-variant/50 pl-2">
                                                  "{hlog.notes}"
                                                </p>
                                              )}
                                              {hlog.proofData && (
                                                <div className="mt-3">
                                                  <img src={hlog.proofData} alt="Proof" className="max-h-32 rounded-lg border border-outline-variant/30 hover:scale-[1.5] transition-transform origin-top-left cursor-pointer shadow-md" />
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        ))}
                        {globalLogs.length === 0 && (
                          <tr>
                            <td colSpan={5} className="py-8 text-center text-on-surface-variant italic">No global activity to display.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
