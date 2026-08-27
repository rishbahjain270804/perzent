import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@perzent/database';
import { authErrorResponse, jsonError, requireSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const SiteSchema = z.object({
  name: z.string().trim().min(2, 'Site name is required').max(120),
  address: z.string().trim().max(300).optional().or(z.literal('')),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  radius_meters: z.number().min(10).max(5000).optional(),
});

export async function GET(request: Request) {
  try {
    const session = await requireSession(request, ['OWNER', 'MANAGER', 'EMPLOYEE']);
    const sites = await prisma.geofenceSite.findMany({
      where: { company_id: session.companyId, is_active: true },
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(sites);
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireSession(request, ['OWNER', 'MANAGER']);
    const body = SiteSchema.parse(await request.json());
    const site = await prisma.geofenceSite.create({
      data: {
        company_id: session.companyId,
        name: body.name,
        address: body.address || null,
        latitude: body.latitude,
        longitude: body.longitude,
        radius_meters: body.radius_meters ?? 150,
        is_active: true,
      },
    });
    return NextResponse.json(site, { status: 201 });
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await requireSession(request, ['OWNER', 'MANAGER']);
    const id = new URL(request.url).searchParams.get('id');
    if (!id) return jsonError('Site ID is required', 400, 'VALIDATION');
    const result = await prisma.geofenceSite.updateMany({
      where: { id, company_id: session.companyId, is_active: true },
      data: { is_active: false },
    });
    if (result.count === 0) return jsonError('Site not found', 404, 'NOT_FOUND');
    return NextResponse.json({ success: true });
  } catch (error) {
    return authErrorResponse(error);
  }
}
