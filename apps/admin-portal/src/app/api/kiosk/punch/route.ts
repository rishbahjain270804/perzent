import { NextResponse } from 'next/server';
import { compare } from 'bcryptjs';
import { prisma } from '@perzent/database';

export const dynamic = 'force-dynamic';

const todayIst = () => {
  const istDateStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
  return new Date(`${istDateStr}T00:00:00.000Z`);
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { phone, pin, selfie_url, site_id, action } = body;

    if (!phone || !pin) {
      return NextResponse.json({ error: 'Phone number and PIN are required' }, { status: 400 });
    }

    const user = await prisma.user.findFirst({
      where: { phone: phone.trim(), status: 'ACTIVE' },
      include: { company: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'Employee not found or inactive' }, { status: 404 });
    }

    const validPin = await compare(pin, user.password_hash);
    if (!validPin) {
      return NextResponse.json({ error: 'Invalid PIN entered' }, { status: 401 });
    }

    const workDate = todayIst();
    const now = new Date();

    const attendance = await prisma.attendanceRecord.findUnique({
      where: {
        user_id_work_date: {
          user_id: user.id,
          work_date: workDate,
        },
      },
    });

    // Handle check-in
    if (action === 'CHECK_IN' || (!action && (!attendance || attendance.status === 'CHECKED_OUT'))) {
      if (attendance) {
        if (['CHECKED_OUT', 'AUTO_CHECKED_OUT'].includes(attendance.status)) {
          return NextResponse.json({
            error: 'You have already completed your shift for today. Only 1 check-in is permitted per calendar date (IST).',
          }, { status: 409 });
        }
        return NextResponse.json({
          error: 'You are already checked in today.',
          status: attendance.status,
          punch_in_time: attendance.punch_in_time.toISOString(),
        }, { status: 409 });
      }

      const created = await prisma.attendanceRecord.create({
        data: {
          user_id: user.id,
          site_id: site_id || null,
          work_date: workDate,
          punch_in_time: now,
          punch_in_by: 'KIOSK',
          punch_in_selfie_url: selfie_url || null,
          is_face_verified: Boolean(selfie_url),
          status: 'CHECKED_IN',
        },
      });

      return NextResponse.json({
        success: true,
        action: 'CHECKED_IN',
        user_name: user.full_name,
        punch_in_time: created.punch_in_time.toISOString(),
        message: `Welcome, ${user.full_name}! Shift clocked in successfully.`,
      }, { status: 201 });
    }

    // Handle check-out
    if (action === 'CHECK_OUT' || (!action && attendance && attendance.status === 'CHECKED_IN')) {
      if (!attendance || ['CHECKED_OUT', 'AUTO_CHECKED_OUT'].includes(attendance.status)) {
        return NextResponse.json({ error: 'No active shift found to clock out.' }, { status: 409 });
      }

      const gross = Math.max(0, Math.round((now.getTime() - attendance.punch_in_time.getTime()) / 60000));
      const net = Math.max(0, gross - attendance.total_break_minutes);

      const updated = await prisma.attendanceRecord.update({
        where: { id: attendance.id },
        data: {
          status: 'CHECKED_OUT',
          punch_out_time: now,
          punch_out_by: 'KIOSK',
          punch_out_selfie_url: selfie_url || null,
          gross_worked_minutes: gross,
          net_worked_minutes: net,
        },
      });

      return NextResponse.json({
        success: true,
        action: 'CHECKED_OUT',
        user_name: user.full_name,
        punch_out_time: updated.punch_out_time?.toISOString(),
        worked_hours: (net / 60).toFixed(2),
        message: `Goodbye, ${user.full_name}! Shift clocked out. Total worked: ${(net / 60).toFixed(1)} hrs.`,
      });
    }

    return NextResponse.json({ error: 'Invalid kiosk operation' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Kiosk processing failed' }, { status: 500 });
  }
}
