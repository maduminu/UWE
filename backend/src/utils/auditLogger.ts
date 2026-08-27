import { prisma } from '../config/db';
import { logger } from './logger';

export interface AuditLogParams {
  adminId?: string;
  adminEmail?: string;
  action: string;
  targetEntity: string;
  targetId?: string;
  details?: any;
  ipAddress?: string;
}

/**
 * Records an immutable administrative audit event
 */
export const recordAdminAudit = async (params: AuditLogParams): Promise<void> => {
  try {
    await prisma.adminAuditLog.create({
      data: {
        adminId: params.adminId || null,
        adminEmail: params.adminEmail || null,
        action: params.action,
        targetEntity: params.targetEntity,
        targetId: params.targetId || null,
        details: params.details ? (typeof params.details === 'string' ? params.details : JSON.stringify(params.details)) : null,
        ipAddress: params.ipAddress || null,
      },
    });
    logger.info(`[AUDIT] ${params.action} on ${params.targetEntity}:${params.targetId || 'N/A'} by ${params.adminEmail || 'Admin'}`, 'AUDIT');
  } catch (error: any) {
    // Log audit failure but do not crash the primary request
    logger.error(`Failed to write audit log: ${error.message}`, 'AUDIT', { error, params });
  }
};
