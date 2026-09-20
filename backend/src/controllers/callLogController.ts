import { Request, Response } from 'express';
import { prisma } from '../config/db';
import { cacheDelPattern } from '../config/redis';
import { broadcastRealtimeEvent } from '../utils/realtimeEmitter';
import { logger } from '../utils/logger';
import { validateReceiptSignature } from '../utils/fileSignature';
import { uploadPrivateReceipt } from '../services/storageService';

const CALL_LOCK_MINUTES = 30;

function buildLeadSummary(lead: any) {
  return {
    id: lead.id, name: lead.name, phone: lead.phone, email: lead.email,
    courseSlug: lead.courseSlug, status: lead.status, funnelStage: lead.funnelStage,
    funnelOwnerName: lead.funnelOwnerName, isPositiveContact: lead.isPositiveContact,
    totalCallAttempts: lead.totalCallAttempts, lastCalledAt: lead.lastCalledAt,
    lastCalledBy: lead.lastCalledBy, lastCallOutcome: lead.lastCallOutcome,
    callLockUntil: lead.callLockUntil, callLockBy: lead.callLockBy,
  };
}

// @desc  Check a phone number before calling
// @route POST /api/calls/check-number
export const checkNumber = async (req: Request, res: Response): Promise<void> => {
  try {
    const { phone } = req.body;
    if (!phone || typeof phone !== 'string' || phone.trim().length < 7) {
      res.status(400).json({ success: false, message: 'A valid phone number is required.' });
      return;
    }
    const normalised = phone.trim().replace(/\s+/g, '');
    const lead = await prisma.lead.findFirst({
      where: { phone: { contains: normalised } },
      include: {
        callLogs: {
          orderBy: { calledAt: 'desc' }, take: 5,
          select: { id: true, adminName: true, calledAt: true, outcome: true, funnelStage: true, notes: true },
        },
      },
    });

    if (!lead) {
      res.json({ success: true, data: { status: 'NOT_IN_SYSTEM', message: 'This number is not in the leads database. Add them as a new lead first.' } });
      return;
    }
    if (lead.funnelStage === 'SIGNED_UP' || lead.status === 'ENROLLED') {
      res.json({ success: true, data: { status: 'ENROLLED', message: `${lead.name} is already an enrolled student. Do not contact.`, lead: buildLeadSummary(lead) } });
      return;
    }
    if (lead.isPositiveContact) {
      res.json({ success: true, data: { status: 'POSITIVE_CONTACT_LOCKED', message: `🔴 STOP — ${lead.funnelOwnerName || 'Another operator'} is handling this lead (Stage: ${lead.funnelStage || 'APPROACH'}). Do not contact.`, lead: buildLeadSummary(lead), callHistory: lead.callLogs } });
      return;
    }
    if (lead.callLockUntil && new Date(lead.callLockUntil) > new Date()) {
      if (lead.callLockBy === 'SYSTEM_COOLDOWN') {
        res.json({ success: true, data: { status: 'CALL_LOCKED', message: `🟡 COOL-DOWN: This lead was recently dropped/rejected. They are on a cool-down hold until ${new Date(lead.callLockUntil).toLocaleDateString()}.`, lead: buildLeadSummary(lead), lockedBy: lead.callLockBy, lockExpiresAt: lead.callLockUntil } });
      } else {
        res.json({ success: true, data: { status: 'CALL_LOCKED', message: `🟡 ${lead.callLockBy || 'Someone'} is currently calling this number. Lock expires at ${new Date(lead.callLockUntil).toLocaleTimeString()}.`, lead: buildLeadSummary(lead), lockedBy: lead.callLockBy, lockExpiresAt: lead.callLockUntil } });
      }
      return;
    }
    res.json({ success: true, data: { status: 'AVAILABLE', message: lead.totalCallAttempts === 0 ? '✅ Never been called. Go ahead!' : `✅ Available — called ${lead.totalCallAttempts}x before. Last: ${lead.lastCallOutcome || 'unknown'}.`, lead: buildLeadSummary(lead), callHistory: lead.callLogs } });
  } catch (err: any) {
    logger.error(`[CALL] checkNumber error: ${err.message}`, 'CALLS');
    res.status(500).json({ success: false, message: 'Failed to check number.' });
  }
};

// @desc  Lock a number — "I'm calling this person right now"
// @route POST /api/calls/lock/:leadId
export const lockNumber = async (req: Request, res: Response): Promise<void> => {
  try {
    const leadId = req.params.leadId as string;
    const adminName = String(req.user?.email || 'Unknown');
    const adminId   = String(req.user?.id || '');
    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) { res.status(404).json({ success: false, message: 'Lead not found.' }); return; }
    if (lead.isPositiveContact) { res.status(409).json({ success: false, message: `This lead is already owned by ${lead.funnelOwnerName}.` }); return; }
    if (lead.callLockUntil && new Date(lead.callLockUntil) > new Date() && lead.callLockById !== adminId) {
      res.status(409).json({ success: false, message: `${lead.callLockBy} is already calling this number.` }); return;
    }
    const lockExpiry = new Date(Date.now() + CALL_LOCK_MINUTES * 60 * 1000);
    const updated = await prisma.lead.update({ where: { id: leadId }, data: { callLockUntil: lockExpiry, callLockBy: adminName, callLockById: adminId } });
    broadcastRealtimeEvent('lead:locked', { leadId, lockedBy: adminName, lockExpiresAt: lockExpiry.toISOString() });
    logger.info(`[CALL] Lead ${leadId} locked by ${adminName}`, 'CALLS');
    res.json({ success: true, message: `Number locked for ${CALL_LOCK_MINUTES} minutes.`, data: { lockExpiresAt: updated.callLockUntil } });
  } catch (err: any) {
    logger.error(`[CALL] lockNumber error: ${err.message}`, 'CALLS');
    res.status(500).json({ success: false, message: 'Failed to lock number.' });
  }
};

// @desc  Log the result of a call
// @route POST /api/calls/log
export const logCall = async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      leadId, outcome, funnelStage, notes, callbackAt, 
      stageApproach = false, stageTrust = false, stageMoney = false, stageClosing = false, stageSignedUp = false,
      proofImage 
    } = req.body;
    const adminId   = req.user?.id || '';
    const adminName = req.user?.email || 'Unknown';
    if (!leadId || !outcome) { res.status(400).json({ success: false, message: 'leadId and outcome are required.' }); return; }
    const VALID_OUTCOMES = ['NO_ANSWER', 'ANSWERED_POSITIVE', 'ANSWERED_NEGATIVE', 'CALLBACK_REQUESTED', 'WRONG_NUMBER'];
    if (!VALID_OUTCOMES.includes(outcome)) { res.status(400).json({ success: false, message: `Invalid outcome. Must be: ${VALID_OUTCOMES.join(', ')}` }); return; }
    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) { res.status(404).json({ success: false, message: 'Lead not found.' }); return; }

    // Determine highest funnel stage
    let highestStage: string | null = funnelStage || null;
    if (stageSignedUp)      highestStage = 'SIGNED_UP';
    else if (stageClosing)  highestStage = 'CLOSING';
    else if (stageMoney)    highestStage = 'MONEY';
    else if (stageTrust)    highestStage = 'TRUST';
    else if (stageApproach) highestStage = 'APPROACH';

    const isPositive = outcome === 'ANSWERED_POSITIVE';
    const isSignedUp = Boolean(stageSignedUp);
    const stageOrder = ['APPROACH', 'TRUST', 'MONEY', 'CLOSING', 'SIGNED_UP'];
    const currentIdx = lead.funnelStage ? stageOrder.indexOf(lead.funnelStage) : -1;
    const newIdx     = highestStage ? stageOrder.indexOf(highestStage) : -1;

    const leadUpdate: any = {
      totalCallAttempts: { increment: 1 },
      lastCalledAt: new Date(), lastCalledBy: adminName, lastCallOutcome: outcome,
      callLockUntil: null, callLockBy: null, callLockById: null,
    };
    if (isPositive && !lead.isPositiveContact) {
      leadUpdate.isPositiveContact = true;
      leadUpdate.funnelOwnerId = adminId; leadUpdate.funnelOwnerName = adminName;
      leadUpdate.funnelUpdatedAt = new Date(); leadUpdate.status = 'CONTACTED';
    } else if (outcome === 'ANSWERED_NEGATIVE' || outcome === 'WRONG_NUMBER') {
      // If the lead was previously positive but now rejected, drop ownership
      leadUpdate.isPositiveContact = false;
      leadUpdate.funnelOwnerId = null;
      leadUpdate.funnelOwnerName = null;
      leadUpdate.funnelStage = null;
      leadUpdate.status = 'REJECTED';
      
      // 7-day cool-down hold before others can call
      leadUpdate.callLockUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      leadUpdate.callLockBy = 'SYSTEM_COOLDOWN';
    }

    if (isPositive && highestStage && newIdx > currentIdx) {
      leadUpdate.funnelStage = highestStage; leadUpdate.funnelUpdatedAt = new Date();
    }
    if (isSignedUp) { leadUpdate.status = 'ENROLLED'; leadUpdate.funnelStage = 'SIGNED_UP'; }

    // ── PROCESS PROOF IMAGE (SEC-9 COMPLIANT) ──
    let proofUrl: string | null = null;
    let proofData: string | null = null;

    if (proofImage) {
      if (typeof proofImage !== 'string' || (!proofImage.startsWith('data:') && !proofImage.match(/^[A-Za-z0-9+/=]+$/))) {
        res.status(400).json({ success: false, message: 'Invalid proof image format.' });
        return;
      }
      const validation = validateReceiptSignature(proofImage);
      if (!validation.isValid || !validation.buffer) {
        res.status(400).json({ success: false, message: validation.error || 'Invalid image file.' });
        return;
      }
      try {
        const uploadResult = await uploadPrivateReceipt(validation.buffer, validation.extension!, validation.mimeType!);
        proofUrl = uploadResult.storageKey;
        proofData = proofImage;
      } catch (uploadErr: any) {
        logger.error(`[CALL] proofImage upload failed: ${uploadErr.message}`, 'CALLS');
        res.status(500).json({ success: false, message: 'Failed to upload screenshot.' });
        return;
      }
    }

    const [callLog] = await prisma.$transaction([
      prisma.callLog.create({
        data: {
          leadId, leadName: lead.name, leadPhone: lead.phone, adminId, adminName, outcome,
          funnelStage: highestStage as any || null,
          notes: notes || null,
          callbackAt: callbackAt ? new Date(callbackAt) : null,
          stageApproach: Boolean(stageApproach), stageTrust: Boolean(stageTrust),
          stageMoney: Boolean(stageMoney), stageClosing: Boolean(stageClosing),
          stageSignedUp: Boolean(stageSignedUp),
          proofUrl,
          proofData,
        },
      }),
      prisma.lead.update({ where: { id: leadId }, data: leadUpdate }),
    ]);

    await cacheDelPattern('leads:*').catch(() => {});
    broadcastRealtimeEvent('calllog:updated', { leadId, outcome, funnelStage: highestStage, isPositiveContact: isPositive || lead.isPositiveContact, totalCallAttempts: lead.totalCallAttempts + 1 });
    if (isSignedUp) broadcastRealtimeEvent('lead:signed_up', { leadId, leadName: lead.name, adminName });
    logger.info(`[CALL] Call logged for lead ${leadId} by ${adminName}: ${outcome}`, 'CALLS');
    res.status(201).json({ success: true, data: callLog });
  } catch (err: any) {
    logger.error(`[CALL] logCall error: ${err.message}`, 'CALLS');
    res.status(500).json({ success: false, message: 'Failed to log call.' });
  }
};

// @desc  Get call history for a lead
// @route GET /api/calls/lead/:leadId
export const getCallHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const leadId = req.params.leadId as string;
    const logs = await prisma.callLog.findMany({ where: { leadId }, orderBy: { calledAt: 'desc' } });
    res.json({ success: true, data: logs });
  } catch (err: any) {
    logger.error(`[CALL] getCallHistory error: ${err.message}`, 'CALLS');
    res.status(500).json({ success: false, message: 'Failed to fetch call history.' });
  }
};

// @desc  Get all call logs (admin overview)
// @route GET /api/calls
export const getAllCallLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const { adminId, outcome, from, to, page = '1', limit = '50' } = req.query;
    const where: any = {};
    if (adminId) where.adminId = String(adminId);
    if (outcome) where.outcome = String(outcome);
    if (from || to) { where.calledAt = {}; if (from) where.calledAt.gte = new Date(String(from)); if (to) where.calledAt.lte = new Date(String(to)); }
    const skip = (parseInt(String(page)) - 1) * Math.min(100, parseInt(String(limit)));
    const take = Math.min(100, parseInt(String(limit)));
    const [logs, total] = await Promise.all([
      prisma.callLog.findMany({ where, orderBy: { calledAt: 'desc' }, skip, take }),
      prisma.callLog.count({ where }),
    ]);
    res.json({ success: true, data: logs, total, page: parseInt(String(page)), limit: take });
  } catch (err: any) {
    logger.error(`[CALL] getAllCallLogs error: ${err.message}`, 'CALLS');
    res.status(500).json({ success: false, message: 'Failed to fetch call logs.' });
  }
};

// @desc  Get call stats for analytics
// @route GET /api/calls/stats
export const getCallStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart  = new Date(todayStart); weekStart.setDate(weekStart.getDate() - 7);
    const [todayLogs, weekLogs, funnelCounts, totalPositive, totalSignedUp] = await Promise.all([
      prisma.callLog.findMany({ where: { calledAt: { gte: todayStart } } }),
      prisma.callLog.findMany({ where: { calledAt: { gte: weekStart } } }),
      prisma.lead.groupBy({ by: ['funnelStage'], _count: { _all: true }, where: { funnelStage: { not: null } } }),
      prisma.lead.count({ where: { isPositiveContact: true } }),
      prisma.lead.count({ where: { funnelStage: 'SIGNED_UP' } }),
    ]);
    const todayByOutcome: Record<string, number> = {};
    todayLogs.forEach(l => { todayByOutcome[l.outcome] = (todayByOutcome[l.outcome] || 0) + 1; });
    const callerMap: Record<string, { name: string; calls: number; signUps: number }> = {};
    todayLogs.forEach(l => { if (!callerMap[l.adminId]) callerMap[l.adminId] = { name: l.adminName, calls: 0, signUps: 0 }; callerMap[l.adminId].calls++; if (l.stageSignedUp) callerMap[l.adminId].signUps++; });
    const topCallers = Object.values(callerMap).sort((a, b) => b.calls - a.calls).slice(0, 10);
    const funnelBreakdown: Record<string, number> = {};
    funnelCounts.forEach(f => { funnelBreakdown[f.funnelStage as string] = f._count._all; });
    const conversionRate = totalPositive > 0 ? Math.round((totalSignedUp / totalPositive) * 1000) / 10 : 0;
    res.json({ success: true, data: { today: { total: todayLogs.length, byOutcome: todayByOutcome }, week: { total: weekLogs.length }, topCallers, funnelBreakdown, totalPositiveContacts: totalPositive, totalSignedUp, conversionRate } });
  } catch (err: any) {
    logger.error(`[CALL] getCallStats error: ${err.message}`, 'CALLS');
    res.status(500).json({ success: false, message: 'Failed to fetch call stats.' });
  }
};

// @desc  Get daily sheet for an operator
// @route GET /api/calls/daily-sheet
export const getDailySheet = async (req: Request, res: Response): Promise<void> => {
  try {
    const targetDate  = req.query.date    ? new Date(String(req.query.date))   : new Date();
    const targetAdmin = req.query.adminId ? String(req.query.adminId) : String(req.user?.id || '');
    const dayStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
    const dayEnd   = new Date(dayStart); dayEnd.setDate(dayEnd.getDate() + 1);
    const logs = await prisma.callLog.findMany({ where: { adminId: targetAdmin, calledAt: { gte: dayStart, lt: dayEnd } }, orderBy: { calledAt: 'desc' } });
    
    // Deduplicate to show only the LATEST status for each lead they handled today
    const uniqueLogs: any[] = [];
    const seenLeads = new Set<string>();
    for (const log of logs) {
      if (!seenLeads.has(log.leadId)) {
        seenLeads.add(log.leadId);
        uniqueLogs.push(log);
      }
    }
    
    res.json({ success: true, data: { date: dayStart.toISOString(), adminId: targetAdmin, totalCalls: uniqueLogs.length, signUps: uniqueLogs.filter(l => l.stageSignedUp).length, logs: uniqueLogs } });
  } catch (err: any) {
    logger.error(`[CALL] getDailySheet error: ${err.message}`, 'CALLS');
    res.status(500).json({ success: false, message: 'Failed to fetch daily sheet.' });
  }
};

// @desc  Delete a call log (SUPER_ADMIN only)
// @route DELETE /api/calls/:id
export const deleteCallLog = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const log = await prisma.callLog.findUnique({ where: { id } });
    if (!log) { res.status(404).json({ success: false, message: 'Call log not found.' }); return; }
    await prisma.$transaction([
      prisma.callLog.delete({ where: { id } }),
      prisma.lead.update({ where: { id: log.leadId }, data: { totalCallAttempts: { decrement: 1 } } }),
    ]);
    broadcastRealtimeEvent('calllog:updated', { leadId: log.leadId, deleted: true });
    logger.info(`[CALL] CallLog ${req.params.id} deleted by ${req.user?.email}`, 'CALLS');
    res.json({ success: true, message: 'Call log deleted.' });
  } catch (err: any) {
    logger.error(`[CALL] deleteCallLog error: ${err.message}`, 'CALLS');
    res.status(500).json({ success: false, message: 'Failed to delete call log.' });
  }
};

// Auto-unlock expired call locks — called by cron every 5 minutes
export const releaseExpiredCallLocks = async (): Promise<void> => {
  try {
    // Use AND to combine two conditions on the same field (Prisma syntax)
    const result = await prisma.lead.updateMany({
      where: {
        AND: [
          { callLockUntil: { not: null } },
          { callLockUntil: { lt: new Date() } },
        ],
      },
      data: { callLockUntil: null, callLockBy: null, callLockById: null },
    });
    if (result.count > 0) {
      logger.info(`[CALL] Released ${result.count} expired call lock(s)`, 'CALLS');
      broadcastRealtimeEvent('lead:unlocked', { count: result.count });
    }
  } catch (err: any) {
    logger.error(`[CALL] releaseExpiredCallLocks error: ${err.message}`, 'CALLS');
  }
};
