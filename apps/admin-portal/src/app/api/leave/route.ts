import { NextResponse } from 'next/server';
import { prisma } from '@perzent/database';
import { LeaveRequestSchema, LeaveReviewSchema } from '@perzent/shared-types';
import { authErrorResponse, jsonError, requireSession } from '@/lib/auth';
import { workDateFromString } from '@/lib/time';

export const dynamic = 'force-dynamic';

const LEAVE_STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'] as const;
type LeaveStatus = (typeof LEAVE_STATUSES)[number];

const balanceField = (type: string) =>
  type === 'PAID' ? 'paid_leave_balance' : type === 'SICK' ? 'sick_leave_balance' : type === 'CASUAL' ? 'casual_leave_balance' : null;

export async function GET(request: Request) {
  try {
    const session = await requireSession(request, ['OWNER', 'MANAGER', 'EMPLOYEE']);
    const statusParam = new URL(request.url).searchParams.get('status');
    if (statusParam && !(LEAVE_STATUSES as readonly string[]).includes(statusParam)) {
      return jsonError('Invalid status filter', 400, 'VALIDATION');
    }
    const status = statusParam as LeaveStatus | null;
    // ?mine=1 — the caller wants their own requests and balances regardless of role (the app's
    // My Leaves tab; managers otherwise get their team's requests and no balances).
    const mine = new URL(request.url).searchParams.get('mine') === '1';

    if (session.role === 'EMPLOYEE' || mine) {
      const [requests, user] = await Promise.all([
        prisma.leaveRequest.findMany({ where: { user_id: session.userId, ...(status ? { status } : {}) }, orderBy: { created_at: 'desc' } }),
        prisma.user.findUniqueOrThrow({
          where: { id: session.userId },
          select: { paid_leave_balance: true, sick_leave_balance: true, casual_leave_balance: true },
        }),
      ]);
      return NextResponse.json({
        balances: { paid: user.paid_leave_balance, sick: user.sick_leave_balance, casual: user.casual_leave_balance },
        requests,
      });
    }

    const requests = await prisma.leaveRequest.findMany({
      where: {
        company_id: session.companyId,
        ...(session.role === 'MANAGER' ? { user: { manager_id: session.userId } } : {}),
        ...(status ? { status } : {}),
      },
      include: {
        user: {
          select: {
            id: true,
            full_name: true,
            phone: true,
            designation: true,
            paid_leave_balance: true,
            sick_leave_balance: true,
            casual_leave_balance: true,
            department: { select: { name: true } },
          },
        },
        reviewer: { select: { full_name: true } },
      },
      orderBy: { created_at: 'desc' },
      take: 500,
    });
    return NextResponse.json({ requests });
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireSession(request, ['MANAGER', 'EMPLOYEE']);
    const body = LeaveRequestSchema.parse(await request.json());
    const start = workDateFromString(body.start_date);
    const end = workDateFromString(body.end_date);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
      return jsonError('Invalid date range', 400, 'VALIDATION');
    }
    const totalDays = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
    if (totalDays > 60) return jsonError('Leave requests are limited to 60 days', 400, 'VALIDATION');

    const overlapping = await prisma.leaveRequest.findFirst({
      where: {
        user_id: session.userId,
        status: { in: ['PENDING', 'APPROVED'] },
        start_date: { lte: end },
        end_date: { gte: start },
      },
    });
    if (overlapping) return jsonError('You already have a leave request covering these dates', 409, 'CONFLICT');

    const field = balanceField(body.leave_type);
    if (field) {
      const user = await prisma.user.findUniqueOrThrow({ where: { id: session.userId }, select: { [field]: true } as any });
      const balance = Number((user as any)[field] ?? 0);
      if (balance < totalDays) return jsonError(`Insufficient ${body.leave_type.toLowerCase()} leave balance (${balance} day(s) left)`, 400, 'VALIDATION');
    }

    const created = await prisma.leaveRequest.create({
      data: {
        company_id: session.companyId,
        user_id: session.userId,
        leave_type: body.leave_type,
        start_date: start,
        end_date: end,
        total_days: totalDays,
        reason: body.reason,
        status: 'PENDING',
      },
    });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await requireSession(request, ['OWNER', 'MANAGER']);
    const body = LeaveReviewSchema.parse(await request.json());

    const leave = await prisma.leaveRequest.findFirst({
      where: {
        id: body.id,
        company_id: session.companyId,
        ...(session.role === 'MANAGER' ? { user: { manager_id: session.userId } } : {}),
      },
      include: { user: true },
    });
    if (!leave) return jsonError('Leave request not found', 404, 'NOT_FOUND');
    if (leave.status !== 'PENDING') return jsonError(`Request has already been ${leave.status.toLowerCase()}`, 409, 'CONFLICT');

    const newStatus = body.action === 'APPROVE' ? 'APPROVED' : 'REJECTED';
    const field = balanceField(leave.leave_type);

    const result = await prisma.$transaction(async (tx) => {
      if (newStatus === 'APPROVED' && field) {
        const fresh = await tx.user.findUniqueOrThrow({ where: { id: leave.user_id } });
        const balance = Number((fresh as any)[field] ?? 0);
        if (balance < leave.total_days) {
          throw Object.assign(new Error(`Employee has only ${balance} ${leave.leave_type.toLowerCase()} day(s) left`), { status: 409 });
        }
        await tx.user.update({ where: { id: leave.user_id }, data: { [field]: { decrement: leave.total_days } } });
      }
      return tx.leaveRequest.update({
        where: { id: leave.id },
        data: {
          status: newStatus,
          reviewed_by_id: session.userId,
          reviewed_at: new Date(),
          review_notes: body.review_notes || null,
        },
      });
    });
    return NextResponse.json({ success: true, request: result });
  } catch (error: any) {
    if (error?.status === 409) return jsonError(error.message, 409, 'CONFLICT');
    return authErrorResponse(error);
  }
}
