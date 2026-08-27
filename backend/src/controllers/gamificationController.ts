import { Request, Response } from 'express';
import { prisma } from '../config/db';
import { cacheGet, cacheSet, cacheDel } from '../config/redis';

export interface RankInfo {
  tierNumber: number;
  rankTitle: string;
  minXp: number;
  nextRankXp: number;
  progressPercent: number;
  badgeIcon: string;
}

export function calculateRank(xp: number): RankInfo {
  if (xp >= 800) {
    return {
      tierNumber: 1,
      rankTitle: 'Tier-1 Commander',
      minXp: 800,
      nextRankXp: 1500,
      progressPercent: Math.min(100, Math.round(((xp - 800) / 700) * 100)),
      badgeIcon: 'military_tech',
    };
  }
  if (xp >= 400) {
    return {
      tierNumber: 2,
      rankTitle: 'Elite Vanguard',
      minXp: 400,
      nextRankXp: 800,
      progressPercent: Math.round(((xp - 400) / 400) * 100),
      badgeIcon: 'shield',
    };
  }
  if (xp >= 150) {
    return {
      tierNumber: 3,
      rankTitle: 'Tactical Specialist',
      minXp: 150,
      nextRankXp: 400,
      progressPercent: Math.round(((xp - 150) / 250) * 100),
      badgeIcon: 'psychology',
    };
  }
  return {
    tierNumber: 4,
    rankTitle: 'Novice Operative',
    minXp: 0,
    nextRankXp: 150,
    progressPercent: Math.round((xp / 150) * 100),
    badgeIcon: 'bolt',
  };
}

export const AVAILABLE_BADGES = [
  { id: 'RECRUIT', name: 'Empire Recruit', description: 'Enrolled in UWE Mind Protocol', icon: 'verified' },
  { id: 'NEURO_ARCHITECT', name: 'Neuro-Architect', description: 'Completed Subconscious Rewiring Drills', icon: 'psychology' },
  { id: 'COMMAND_STRIKER', name: 'Command Striker', description: 'Finished 5 Full Masterclass Modules', icon: 'bolt' },
  { id: 'MASTERMIND_COUNCIL', name: 'Command Council Contributor', description: 'Active contributor in Live Mastermind', icon: 'forum' },
  { id: 'STREAK_WARRIOR', name: 'Combat Readiness Streak (5D+)', description: '5 Consecutive Days of Tactical Drills', icon: 'local_fire_department' },
  { id: 'HONOR_GRADUATE', name: 'Empire Honor Distinction', description: 'Earned Official Verified Certificate', icon: 'military_tech' },
];

// @desc    Get Global Operative Leaderboard (Cached 30s)
// @route   GET /api/gamification/leaderboard
export const getLeaderboard = async (_req: Request, res: Response): Promise<void> => {
  try {
    const cacheKey = 'gamification:leaderboard';
    const cached = await cacheGet(cacheKey);
    if (cached) {
      res.status(200).json(cached);
      return;
    }

    const topUsers = await prisma.user.findMany({
      take: 20,
      orderBy: { xp: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        xp: true,
        streakDays: true,
        rankTitle: true,
        badges: true,
        enrolledCourseSlugs: true,
        createdAt: true,
      },
    });

    const leaderboard = topUsers.map((u, index) => {
      const rankInfo = calculateRank(u.xp);
      let parsedBadges: string[] = [];
      try {
        parsedBadges = JSON.parse(u.badges || '["RECRUIT"]');
      } catch {
        parsedBadges = ['RECRUIT'];
      }

      return {
        standing: index + 1,
        id: u.id,
        name: u.name,
        operativeId: `#UWE-OP-${u.id.slice(-4).toUpperCase()}`,
        xp: u.xp,
        streakDays: u.streakDays,
        rankTitle: rankInfo.rankTitle,
        tierNumber: rankInfo.tierNumber,
        badgeIcon: rankInfo.badgeIcon,
        badges: parsedBadges,
      };
    });

    const payload = { success: true, count: leaderboard.length, data: leaderboard };
    await cacheSet(cacheKey, payload, 30); // 30s TTL

    res.status(200).json(payload);
  } catch (error: any) {
    console.error('[getLeaderboard]', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve leaderboard.' });
  }
};

// @desc    Get single user's gamification profile and progression
// @route   GET /api/gamification/profile/:userId
export const getUserGamificationProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = String(req.params.userId);
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        xp: true,
        streakDays: true,
        rankTitle: true,
        badges: true,
        lastActiveAt: true,
        assignedCoachId: true,
        assignedCoachName: true,
        cohortTag: true,
      },
    });

    if (!user) {
      res.status(404).json({ success: false, message: 'User not found.' });
      return;
    }

    const rankInfo = calculateRank(user.xp);
    let parsedBadges: string[] = [];
    try {
      parsedBadges = JSON.parse(user.badges || '["RECRUIT"]');
    } catch {
      parsedBadges = ['RECRUIT'];
    }

    // Count completed modules
    const completedModulesCount = await prisma.videoProgress.count({
      where: { userId, isCompleted: true },
    });

    res.status(200).json({
      success: true,
      data: {
        ...user,
        operativeId: `#UWE-OP-${user.id.slice(-4).toUpperCase()}`,
        rankInfo,
        badges: parsedBadges,
        availableBadges: AVAILABLE_BADGES,
        completedModulesCount,
      },
    });
  } catch (error: any) {
    console.error('[getUserGamificationProfile]', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve profile.' });
  }
};

// @desc    Award XP and update streaks/badges
// @route   POST /api/gamification/award-xp
export const awardXp = async (req: Request, res: Response): Promise<void> => {
  try {
    const { actionType, xpAmount, badgeId } = req.body;
    const callerId = req.user?.id;
    const isAdmin = req.user?.type === 'admin';

    // Strict role gating: Only authenticated admins can specify target user or custom XP
    const targetUserId = isAdmin && req.body.userId ? String(req.body.userId) : callerId;

    if (!targetUserId) {
      res.status(400).json({ success: false, message: 'Authenticated user ID is required.' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!user) {
      res.status(404).json({ success: false, message: 'Operative account not found.' });
      return;
    }

    // Determine XP to award (Admins can override; regular students are strictly bound to server-side tables)
    let xpToAdd = 0;
    if (isAdmin && typeof xpAmount === 'number' && xpAmount > 0) {
      xpToAdd = Math.min(1000, Math.floor(xpAmount));
    } else {
      switch (actionType) {
        case 'VIDEO_COMPLETED':
          xpToAdd = 50;
          break;
        case 'DRILL_COMPLETED':
          xpToAdd = 100;
          break;
        case 'MASTERMIND_POST':
          xpToAdd = 20;
          break;
        case 'DAILY_STREAK':
          xpToAdd = 15;
          break;
        case 'HONOR_GRADUATE':
          xpToAdd = 250;
          break;
        default:
          xpToAdd = 10;
      }
    }

    // Calculate streak
    const now = new Date();
    const lastActive = new Date(user.lastActiveAt || user.createdAt);
    const msDiff = now.getTime() - lastActive.getTime();
    const hoursDiff = msDiff / (1000 * 60 * 60);

    let streakDays = user.streakDays || 1;
    if (hoursDiff >= 20 && hoursDiff <= 48) {
      streakDays += 1;
    } else if (hoursDiff > 48) {
      streakDays = 1;
    }

    // Calculate badges
    let currentBadges: string[] = [];
    try {
      currentBadges = JSON.parse(user.badges || '["RECRUIT"]');
      if (!Array.isArray(currentBadges)) currentBadges = ['RECRUIT'];
    } catch {
      currentBadges = ['RECRUIT'];
    }

    if (badgeId && typeof badgeId === 'string' && !currentBadges.includes(badgeId)) {
      currentBadges.push(badgeId);
    }

    // Atomically increment XP and update user fields inside a transaction
    const updatedUser = await prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id: targetUserId },
        data: {
          xp: { increment: xpToAdd },
          rankTitle: calculateRank((user.xp || 0) + xpToAdd).rankTitle,
          streakDays,
          lastActiveAt: now,
          badges: JSON.stringify(currentBadges),
        },
      });

      // Re-calculate rank and badges based on the authoritative post-increment XP
      const postXp = updated.xp;
      let updatedBadges: string[] = [...currentBadges];
      if (streakDays >= 5 && !updatedBadges.includes('STREAK_WARRIOR')) {
        updatedBadges.push('STREAK_WARRIOR');
      }
      if (postXp >= 400 && !updatedBadges.includes('COMMAND_STRIKER')) {
        updatedBadges.push('COMMAND_STRIKER');
      }
      if (postXp >= 800 && !updatedBadges.includes('HONOR_GRADUATE')) {
        updatedBadges.push('HONOR_GRADUATE');
      }

      const finalRank = calculateRank(postXp);

      // Second update only if badges or rank changed
      if (updatedBadges.length !== currentBadges.length || finalRank.rankTitle !== updated.rankTitle) {
        await tx.user.update({
          where: { id: targetUserId },
          data: {
            rankTitle: finalRank.rankTitle,
            badges: JSON.stringify(updatedBadges),
          },
        });
      }

      return { ...updated, xp: postXp, rankTitle: finalRank.rankTitle, badges: JSON.stringify(updatedBadges), _rankInfo: finalRank, _badges: updatedBadges };
    });

    await cacheDel('gamification:leaderboard');

    const newRankInfo = updatedUser._rankInfo;

    res.status(200).json({
      success: true,
      message: `Tactical award dispatched: +${xpToAdd} XP. Current Rank: ${newRankInfo.rankTitle}`,
      data: {
        xp: updatedUser.xp,
        xpAwarded: xpToAdd,
        rankTitle: newRankInfo.rankTitle,
        streakDays: updatedUser.streakDays,
        badges: updatedUser._badges,
        rankInfo: newRankInfo,
      },
    });
  } catch (error: any) {
    console.error('[awardXp]', error);
    res.status(500).json({ success: false, message: 'Failed to award XP.' });
  }
};
