import { NextResponse } from 'next/server';
import supabase from '@/lib/supabase';

// GET /api/purchase-returns/[id]
export async function GET(request, { params }) {
  try {
    const { id } = await params;

    const { data, error } = await supabase
      .from('purchase_returns')
      .select('*, purchase_return_items(*)')
      .eq('id', id)
      .single();

    if (error) throw error;

    if (!data) {
      return NextResponse.json({ error: '找不到此進貨退出單' }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT /api/purchase-returns/[id]
export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { items, ...header } = body;

    // Update created_at
    header.created_at = new Date().toISOString();

    // Update header
    const { data: returnData, error: returnError } = await supabase
      .from('purchase_returns')
      .update(header)
      .eq('id', id)
      .select()
      .single();

    if (returnError) throw returnError;

    // Delete existing items
    const { error: deleteError } = await supabase
      .from('purchase_return_items')
      .delete()
      .eq('return_id', id);

    if (deleteError) throw deleteError;

    // Insert new items
    if (items && items.length > 0) {
      const itemsWithReturnId = items.map((item, index) => ({
        ...item,
        return_id: id,
        sort_order: index + 1,
      }));

      const { error: itemsError } = await supabase
        .from('purchase_return_items')
        .insert(itemsWithReturnId);

      if (itemsError) throw itemsError;
    }

    return NextResponse.json(returnData);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/purchase-returns/[id]
export async function DELETE(request, { params }) {
  try {
    const { id } = await params;

    // Delete items first
    const { error: itemsError } = await supabase
      .from('purchase_return_items')
      .delete()
      .eq('return_id', id);

    if (itemsError) throw itemsError;

    // Delete header
    const { error: headerError } = await supabase
      .from('purchase_returns')
      .delete()
      .eq('id', id);

    if (headerError) throw headerError;

    return NextResponse.json({ message: '刪除成功' });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
