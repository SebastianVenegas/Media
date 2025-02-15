import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET(
  request: NextRequest,
  { params }: { params: { orderId: string } }
): Promise<NextResponse> {
  try {
    if (!params.orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    const orderIdInt = parseInt(params.orderId);
    if (isNaN(orderIdInt)) {
      return NextResponse.json({ error: 'Invalid Order ID' }, { status: 400 });
    }

    const result = await sql`
      SELECT 
        el.*,
        SUBSTRING(el.content, 1, 200) as preview
      FROM email_logs el
      WHERE el.order_id = ${orderIdInt}
      ORDER BY el.sent_at DESC;
    `;

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Error fetching email logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch email logs' },
      { status: 500 }
    );
  }
} 