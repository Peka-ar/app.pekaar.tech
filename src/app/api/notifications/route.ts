import { NextResponse } from 'next/server';
import { getRecentProjectActivity } from '@/lib/notifications';
import { UnauthenticatedError, ForbiddenError } from '@/lib/auth-guards';

export async function GET() {
  try {
    const notifications = await getRecentProjectActivity();
    return NextResponse.json(notifications);
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return NextResponse.json([], { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json([], { status: 403 });
    }
    console.error('Failed to fetch notifications:', error);
    return NextResponse.json([], { status: 500 });
  }
}