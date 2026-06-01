import { NextResponse } from 'next/server';
import { requireErpAuth } from '@/lib/api-auth';
import { ensureOrderNo } from '@/lib/order-no';
import { sanitizeEmpty } from '@/lib/po-to-ro';

// GET /api/purchase-returns?q=&status=
export async function GET(request) {
  const { error: authErr, supabase } = await requireErpAuth()
  if (authErr) return authErr
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || '';
    const status = searchParams.get('status') || '';

    let query = supabase
      .from('purchase_returns')
      .select('*')
      .order('created_at', { ascending: false });

    if (q) {
      query = query.or(`return_no.ilike.%${q}%,vendor_name.ilike.%${q}%,original_po_no.ilike.%${q}%`);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/purchase-returns
export async function POST(request) {
  const { error: authErr, supabase } = await requireErpAuth()
  if (authErr) return authErr
  try {
    const body = await request.json();
    const { items, ...rawHeader } = body;
    const header = sanitizeEmpty(rawHeader);
    // 統一單號：YYYYMMDD + 4 位序號，依 return_date 計算
    header.return_no = await ensureOrderNo(supabase, 'purchase_returns', header.return_date, header.return_no);

    // Insert header
    const { data: returnData, error: returnError } = await supabase
      .from('purchase_returns')
      .insert([header])
      .select()
      .single();

    if (returnError) throw returnError;

    // Insert items
    if (items && items.length > 0) {
      const itemsWithReturnId = items.map((item, index) => ({
        ...item,
        return_id: returnData.id,
        sort_order: index + 1,
      }));

      const { error: itemsError } = await supabase
        .from('purchase_return_items')
        .insert(itemsWithReturnId);

      if (itemsError) throw itemsError;
    }

    return NextResponse.json(returnData, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
