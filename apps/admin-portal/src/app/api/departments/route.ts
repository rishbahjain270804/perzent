import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@perzent/database';
import { authErrorResponse, jsonError, requireSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const view = (department: { id: string; name: string; created_at: Date; _count: { users: number } }) => ({
  id: department.id,
  name: department.name,
  user_count: department._count.users,
  created_at: department.created_at.toISOString(),
});

export async function GET(request: Request) {
  try {
    const session = await requireSession(request, ['OWNER', 'MANAGER']);
    const departments = await prisma.department.findMany({
      where: { company_id: session.companyId },
      include: { _count: { select: { users: true } } },
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(departments.map(view));
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireSession(request, ['OWNER']);
    const { name } = z.object({ name: z.string().trim().min(2, 'Department name is required').max(80) }).parse(await request.json());
    const existing = await prisma.department.findUnique({ where: { company_id_name: { company_id: session.companyId, name } } });
    if (existing) return jsonError('A department with this name already exists', 409, 'CONFLICT');
    const department = await prisma.department.create({
      data: { company_id: session.companyId, name },
      include: { _count: { select: { users: true } } },
    });
    return NextResponse.json(view(department), { status: 201 });
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await requireSession(request, ['OWNER']);
    const id = new URL(request.url).searchParams.get('id');
    if (!id) return jsonError('Department id is required', 400, 'VALIDATION');
    const department = await prisma.department.findFirst({
      where: { id, company_id: session.companyId },
      include: { _count: { select: { users: true } } },
    });
    if (!department) return jsonError('Department not found', 404, 'NOT_FOUND');
    if (department._count.users > 0) return jsonError('Move its employees to another department first', 400, 'CONFLICT');
    await prisma.department.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return authErrorResponse(error);
  }
}
