import { NextResponse } from 'next/server';
import { prisma } from '@perzent/database';
import { authErrorResponse, requireSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await requireSession(request, ['OWNER', 'MANAGER', 'EMPLOYEE']);
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    if (session.role === 'EMPLOYEE') {
      const [requests, user] = await Promise.all([
        prisma.leaveRequest.findMany({
          where: {
            user_id: session.userId,
            ...(status ? { status: status as any } : {}),
          },
          orderBy: { created_at: 'desc' },
        }),
        prisma.user.findUnique({
          where: { id: session.userId },
          select: {
            paid_leave_balance: true,
            sick_leave_balance: true,
            casual_leave_balance: true,
          },
        }),
      ]);

      return NextResponse.json({
        balances: {
          paid: user?.paid_leave_balance || 0,
          sick: user?.sick_leave_balance || 0,
          casual: user?.casual_leave_balance || 0,
        },
        requests,
      });
    }

    // OWNER or MANAGER
    const requests = await prisma.leaveRequest.findMany({
      where: {
        company_id: session.companyId,
        ...(session.role === 'MANAGER' ? { user: { manager_id: session.userId } } : {}),
        ...(status ? { status: status as any } : {}),
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
        reviewer: {
          select: { full_name: true },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    return NextResponse.json({ requests });
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireSession(request, ['OWNER', 'MANAGER', 'EMPLOYEE']);
    const body = await request.json();
    const { leave_type, start_date, end_date, reason } = body;

    if (!leave_type || !start_date || !end_date || !reason?.trim()) {
      return NextResponse.json({ error: 'Leave type, start date, end date, and reason are required' }, { status: 400 });
    }

    const start = new Date(start_date);
    const end = new Date(end_date);

    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
      return NextResponse.json({ error: 'Invalid date range provided' }, { status: 400 });
    }

    const diffDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        paid_leave_balance: true,
        sick_leave_balance: true,
        casual_leave_balance: true,
      },
    });

    // Check balance if applicable
    if (leave_type === 'PAID' && (user?.paid_leave_balance || 0) < diffDays) {
      return NextResponse.json({ error: `Insufficient paid leave balance (${user?.paid_leave_balance} remaining)` }, { status: 400 });
    }
    if (leave_type === 'SICK' && (user?.sick_leave_balance || 0) < diffDays) {
      return NextResponse.json({ error: `Insufficient sick leave balance (${user?.sick_leave_balance} remaining)` }, { status: 400 });
    }
    if (leave_type === 'CASUAL' && (user?.casual_leave_balance || 0) < diffDays) {
      return NextResponse.json({ error: `Insufficient casual leave balance (${user?.casual_leave_balance} remaining)` }, { status: 400 });
    }

    const created = await prisma.leaveRequest.create({
      data: {
        company_id: session.companyId,
        user_id: session.userId,
        leave_type,
        start_date: start,
        end_date: end,
        total_days: diffDays,
        reason: reason.trim(),
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
    const body = await request.json();
    const { id, action, review_notes } = body;

    if (!id || !['APPROVE', 'REJECT'].includes(action)) {
      return NextResponse.json({ error: 'Valid request ID and action (APPROVE/REJECT) are required' }, { status: 400 });
    }

    const leave = await prisma.leaveRequest.findFirst({
      where: {
        id,
        company_id: session.companyId,
        ...(session.role === 'MANAGER' ? { user: { manager_id: session.userId } } : {}),
      },
      include: { user: true },
    });

    if (!leave) {
      return NextResponse.json({ error: 'Leave request not found' }, { status: 404 });
    }

    if (leave.status !== 'PENDING') {
      return NextResponse.json({ error: `Request has already been ${leave.status.toLowerCase()}` }, { status: 409 });
    }

    const newStatus = action === 'APPROVE' ? 'APPROVED' : 'REJECTED';

    const result = await prisma.$transaction(async (tx: any) => {
      const updated = await tx.leaveRequest.update({
        where: { id },
        data: {
          status: newStatus,
          reviewed_by_id: session.userId,
          reviewed_at: new Date(),
          review_notes: review_notes?.trim() || null,
        },
      });

      // If approved, deduct leave balance
      if (newStatus === 'APPROVED') {
        if (leave.leave_type === 'PAID') {
          await tx.user.update({
            where: { id: leave.user_id },
            data: { paid_leave_balance: { decrement: leave.total_days } },
          });
        } else if (leave.leave_type === 'SICK') {
          await tx.user.update({
            where: { id: leave.user_id },
            data: { sick_leave_balance: { decrement: leave.total_days } },
          });
        } else if (leave.leave_type === 'CASUAL') {
          await tx.user.update({
            where: { id: leave.user_id },
            data: { casual_leave_balance: { decrement: leave.total_days } },
          });
        }
      }

      return updated;
    });

    return NextResponse.json({ success: true, request: result });
  } catch (error) {
    return authErrorResponse(error);
  }
}
