import { NextResponse } from 'next/server';
import { prisma } from '@perzent/database';
import { authErrorResponse, requireSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await requireSession(request, ['OWNER', 'MANAGER', 'EMPLOYEE']);
    const sites = await prisma.geofenceSite.findMany({
      where: {
        company_id: session.companyId,
        is_active: true,
      },
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
    const body = await request.json();
    const { name, address, latitude, longitude, radius_meters } = body;

    if (!name?.trim() || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return NextResponse.json({ error: 'Site name and valid coordinates are required' }, { status: 400 });
    }

    const site = await prisma.geofenceSite.create({
      data: {
        company_id: session.companyId,
        name: name.trim(),
        address: address?.trim() || null,
        latitude,
        longitude,
        radius_meters: Number.isFinite(radius_meters) && radius_meters > 10 ? radius_meters : 150.0,
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
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Site ID is required' }, { status: 400 });
    }

    await prisma.geofenceSite.updateMany({
      where: { id, company_id: session.companyId },
      data: { is_active: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return authErrorResponse(error);
  }
}
