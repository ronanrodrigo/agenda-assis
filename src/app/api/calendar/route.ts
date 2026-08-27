import { NextResponse } from 'next/server';
import { buildContainer } from '@/application/app-container';
import { BuildAgendaService } from '@/application/services/calendar-service';
import { toAgendaResponse } from '@/interface-adapters/http/calendar-response';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { gateway } = buildContainer();
    const view = await new BuildAgendaService(gateway).execute();
    const res = NextResponse.json(toAgendaResponse(view));
    res.headers.set('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    return res;
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 });
  }
}
