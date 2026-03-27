'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

const taxTypes = [
  { value: 'taxable', label: '應稅' },
  { value: 'tax_free', label: '免稅' },
  { value: 'zero_tax', label: '零稅率' },
];

const statusOptions = [
  { value: 'draft', label: '草稿' },
  { value: 'confirmed', label: '已確認' },
  { value: 'completed', label: '已完成' },
  { value: 'cancelled', label: '已取消' },
];

const generateReturnNo = () => {
  return 'PRT' + Date.now();
};

const calcTotals = (items, taxType) => {
  const subtotal = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  let taxAmount = 0;
  if (taxType === 'taxable') {
    taxAmount = Math.round(subtotal * 0.05);
  }
  const total = subtotal + taxAmount;
  return { subtotal, taxAmount, total };
};

export default function PurchaseReturnFormPage() {
  const router = useRouter();
  const { id } = useParams();
  const isNew = id === 'new';

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [vendors, setVendors] = useState([]);
  const [showProductModal, setShowProductModal] = useState(false);
  const [products, setProducts] = useState([]);
  const [productSearch, setProductSearch] = useState('');

  const [form, setForm] = useState({
    return_no: generateReturnNo(),
    vendor_id: '',
    vendor_name: '',
    return_date: new Date().toISOString().split('T')[0],
    original_po_no: '',
    reason: '',
    status: 'draft',
    tax_type: 'taxable',
    subtotal: 0,
    tax_amount: 0,
    total: 0,
    notes: '',
  });

  const [items, setItems] = useState([]);

  // Fetch vendors
  useEffect(() => {
    const fetchVendors = async () => {
      try {
        const res = await fetch('/api/vendors');
        const data = await res.json();
        if (Array.isArray(data)) {
          setVendors(data);
        }
      } catch (error) {
        console.error('載入廠商失敗:', error);
      }
    };
    fetchVendors();
  }, []);

  // Fetch existing data
  useEffect(() => {
    if (!isNew) {
      const fetchData = async () => {
        try {
          const res = await fetch(`/api/purchase-returns/${id}`);
          const data = await res.json();
          if (data && !data.error) {
            const { purchase_return_items, ...header } = data;
            setForm({
              return_no: header.return_no || '',
              vendor_id: header.vendor_id || '',
              vendor_name: header.vendor_name || '',
              return_date: header.return_date || '',
              original_po_no: header.original_po_no || '',
              reason: header.reason || '',
              status: header.status || 'draft',
              tax_type: header.tax_type || 'taxable',
              subtotal: header.subtotal || 0,
              tax_amount: header.tax_amount || 0,
              total: header.total || 0,
              notes: header.notes || '',
            });
            if (purchase_return_items && purchase_return_items.length > 0) {
              const sortedItems = purchase_return_items.sort((a, b) => a.sort_order - b.sort_order);
              setItems(sortedItems);
            }
          }
        } catch (error) {
          console.error('載入失敗:', error);
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    }
  }, [id, isNew]);

  // Recalculate totals when items or tax_type change
  const recalculate = useCallback(() => {
    const { subtotal, taxAmount, total } = calcTotals(items, form.tax_type);
    setForm((prev) => ({
      ...prev,
      subtotal,
      tax_amount: taxAmount,
      total,
    }));
  }, [items, form.tax_type]);

  useEffect(() => {
    recalculate();
  }, [recalculate]);

  const handleFormChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleVendorChange = (vendorId) => {
    const vendor = vendors.find((v) => String(v.id) === String(vendorId));
    setForm((prev) => ({
      ...prev,
      vendor_id: vendorId,
      vendor_name: vendor ? vendor.name : '',
    }));
  };

  // Item operations
  const updateItem = (index, field, value) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      // Recalculate amount
      const qty = Number(updated[index].quantity) || 0;
      const price = Number(updated[index].unit_price) || 0;
      const discount = Number(updated[index].discount) || 0;
      updated[index].amount = qty * price - discount;
      return updated;
    });
  };

  const removeItem = (index) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const addEmptyItem = () => {
    setItems((prev) => [
      ...prev,
      {
        sort_order: prev.length + 1,
        product_code: '',
        product_name: '',
        unit: '',
        quantity: 1,
        unit_price: 0,
        discount: 0,
        amount: 0,
        remark: '',
      },
    ]);
  };

  // Product picker modal
  const openProductModal = async () => {
    setShowProductModal(true);
    try {
      const res = await fetch('/api/products');
      const data = await res.json();
      if (Array.isArray(data)) {
        setProducts(data);
      }
    } catch (error) {
      console.error('載入產品失敗:', error);
    }
  };

  const selectProduct = (product) => {
    setItems((prev) => [
      ...prev,
      {
        sort_order: prev.length + 1,
        product_code: product.code || product.product_code || '',
        product_name: product.name || product.product_name || '',
        unit: product.unit || '',
        quantity: 1,
        unit_price: product.price || product.unit_price || 0,
        discount: 0,
        amount: product.price || product.unit_price || 0,
        remark: '',
      },
    ]);
    setShowProductModal(false);
    setProductSearch('');
  };

  const filteredProducts = products.filter(
    (p) =>
      (p.name || p.product_name || '').includes(productSearch) ||
      (p.code || p.product_code || '').includes(productSearch)
  );

  // Save
  const handleSave = async () => {
    if (!form.vendor_name) {
      alert('請選擇廠商');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        items: items.map(({ id: itemId, return_id, ...rest }) => rest),
      };

      const url = isNew ? '/api/purchase-returns' : `/api/purchase-returns/${id}`;
      const method = isNew ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        router.push('/purchase-returns');
      } else {
        const err = await res.json();
        alert('儲存失敗: ' + (err.error || '未知錯誤'));
      }
    } catch (error) {
      alert('儲存失敗: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-purple-400">載入中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-purple-900">
              {isNew ? '新增進貨退出單' : '編輯進貨退出單'}
            </h1>
            <p className="text-purple-600 mt-1">{form.return_no}</p>
          </div>
          <Link
            href="/purchase-returns"
            className="text-purple-600 hover:text-purple-800 flex items-center gap-1"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            返回列表
          </Link>
        </div>

        {/* Form */}
        <div className="bg-white rounded-lg shadow-sm border border-purple-100 p-6 mb-6">
          <h2 className="text-lg font-semibold text-purple-800 mb-4">基本資訊</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* 退出單號 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">退出單號</label>
              <input
                type="text"
                value={form.return_no}
                readOnly
                className="w-full border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 text-gray-500"
              />
            </div>

            {/* 廠商名稱 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                廠商名稱 <span className="text-red-500">*</span>
              </label>
              <select
                value={form.vendor_id}
                onChange={(e) => handleVendorChange(e.target.value)}
                className="w-full border border-purple-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">請選擇廠商</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 退出日期 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">退出日期</label>
              <input
                type="date"
                value={form.return_date}
                onChange={(e) => handleFormChange('return_date', e.target.value)}
                className="w-full border border-purple-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {/* 原進貨單號 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">原進貨單號</label>
              <input
                type="text"
                value={form.original_po_no}
                onChange={(e) => handleFormChange('original_po_no', e.target.value)}
                placeholder="輸入原進貨單號"
                className="w-full border border-purple-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {/* 退出原因 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">退出原因</label>
              <input
                type="text"
                value={form.reason}
                onChange={(e) => handleFormChange('reason', e.target.value)}
                placeholder="輸入退出原因"
                className="w-full border border-purple-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {/* 狀態 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">狀態</label>
              <select
                value={form.status}
                onChange={(e) => handleFormChange('status', e.target.value)}
                className="w-full border border-purple-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {statusOptions.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            {/* 稅別 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">稅別</label>
              <select
                value={form.tax_type}
                onChange={(e) => handleFormChange('tax_type', e.target.value)}
                className="w-full border border-purple-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {taxTypes.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="bg-white rounded-lg shadow-sm border border-purple-100 p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-purple-800">退出明細</h2>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={openProductModal}
                className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-lg text-sm transition-colors"
              >
                選擇產品
              </button>
              <button
                type="button"
                onClick={addEmptyItem}
                className="border border-purple-300 text-purple-600 hover:bg-purple-50 px-3 py-1.5 rounded-lg text-sm transition-colors"
              >
                新增空白行
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-purple-100">
              <thead className="bg-purple-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-purple-700">#</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-purple-700">產品編號</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-purple-700">產品名稱</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-purple-700">單位</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-purple-700">數量</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-purple-700">單價</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-purple-700">折扣</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-purple-700">金額</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-purple-700">備註</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-purple-700">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-50">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan="10" className="px-3 py-8 text-center text-gray-400">
                      尚無明細，請點擊「選擇產品」或「新增空白行」
                    </td>
                  </tr>
                ) : (
                  items.map((item, index) => (
                    <tr key={index} className="hover:bg-purple-50">
                      <td className="px-3 py-2 text-sm text-gray-500">{index + 1}</td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={item.product_code}
                          onChange={(e) => updateItem(index, 'product_code', e.target.value)}
                          className="w-24 border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={item.product_name}
                          onChange={(e) => updateItem(index, 'product_name', e.target.value)}
                          className="w-32 border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={item.unit}
                          onChange={(e) => updateItem(index, 'unit', e.target.value)}
                          className="w-16 border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                          className="w-20 border border-gray-200 rounded px-2 py-1 text-sm text-right focus:outline-none focus:ring-1 focus:ring-purple-500"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          value={item.unit_price}
                          onChange={(e) => updateItem(index, 'unit_price', e.target.value)}
                          className="w-24 border border-gray-200 rounded px-2 py-1 text-sm text-right focus:outline-none focus:ring-1 focus:ring-purple-500"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          value={item.discount}
                          onChange={(e) => updateItem(index, 'discount', e.target.value)}
                          className="w-20 border border-gray-200 rounded px-2 py-1 text-sm text-right focus:outline-none focus:ring-1 focus:ring-purple-500"
                        />
                      </td>
                      <td className="px-3 py-2 text-right text-sm font-medium text-gray-700">
                        {Number(item.amount || 0).toLocaleString()}
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={item.remark || ''}
                          onChange={(e) => updateItem(index, 'remark', e.target.value)}
                          className="w-24 border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
                        />
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button
                          onClick={() => removeItem(index)}
                          className="text-red-500 hover:text-red-700 text-sm"
                        >
                          刪除
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Totals */}
        <div className="bg-white rounded-lg shadow-sm border border-purple-100 p-6 mb-6">
          <div className="flex flex-col md:flex-row justify-between gap-6">
            {/* Notes */}
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">備註</label>
              <textarea
                value={form.notes}
                onChange={(e) => handleFormChange('notes', e.target.value)}
                rows={3}
                placeholder="輸入備註..."
                className="w-full border border-purple-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {/* Summary */}
            <div className="w-full md:w-72 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">小計</span>
                <span className="font-medium">{Number(form.subtotal).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">稅額</span>
                <span className="font-medium">{Number(form.tax_amount).toLocaleString()}</span>
              </div>
              <div className="border-t border-purple-200 pt-2 flex justify-between">
                <span className="text-purple-800 font-semibold">總金額</span>
                <span className="text-purple-800 font-bold text-lg">
                  {Number(form.total).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Link
            href="/purchase-returns"
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            取消
          </Link>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            {saving ? '儲存中...' : '儲存'}
          </button>
        </div>
      </div>

      {/* Product Picker Modal */}
      {showProductModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="p-4 border-b border-purple-100 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-purple-800">選擇產品</h3>
              <button
                onClick={() => {
                  setShowProductModal(false);
                  setProductSearch('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 border-b border-purple-100">
              <input
                type="text"
                placeholder="搜尋產品編號或名稱..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="w-full border border-purple-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {filteredProducts.length === 0 ? (
                <div className="text-center text-gray-400 py-8">沒有找到產品</div>
              ) : (
                <div className="space-y-2">
                  {filteredProducts.map((product) => (
                    <div
                      key={product.id}
                      onClick={() => selectProduct(product)}
                      className="flex justify-between items-center p-3 rounded-lg border border-purple-100 hover:bg-purple-50 cursor-pointer transition-colors"
                    >
                      <div>
                        <div className="font-medium text-gray-800">
                          {product.name || product.product_name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {product.code || product.product_code}
                          {product.unit ? ` / ${product.unit}` : ''}
                        </div>
                      </div>
                      <div className="text-purple-600 font-medium">
                        ${Number(product.price || product.unit_price || 0).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
