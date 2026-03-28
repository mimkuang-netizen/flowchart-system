'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const statusMap = {
  draft: { label: '草稿', color: 'bg-gray-100 text-gray-800' },
  confirmed: { label: '已確認', color: 'bg-purple-100 text-purple-800' },
  completed: { label: '已完成', color: 'bg-green-100 text-green-800' },
  cancelled: { label: '已取消', color: 'bg-red-100 text-red-800' },
};

export default function PurchaseReturnsPage() {
  const router = useRouter();
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState("created_at");
  const [sortDir, setSortDir] = useState("desc");
  const PAGE_SIZE = 20;

  const SortTh = ({ field, children, className = "" }) => (
    <th className={`px-6 py-3 text-left text-xs font-medium text-purple-700 uppercase tracking-wider cursor-pointer hover:text-purple-900 select-none ${className}`}
      onClick={() => { if (sortKey === field) setSortDir(d => d === "asc" ? "desc" : "asc"); else { setSortKey(field); setSortDir("asc") } }}>
      <span className="flex items-center gap-1">{children} {sortKey === field ? (sortDir === "asc" ? "↑" : "↓") : ""}</span>
    </th>
  );

  const sorted = [...returns].sort((a, b) => {
    let va = a[sortKey], vb = b[sortKey];
    if (va == null) va = ""; if (vb == null) vb = "";
    if (typeof va === "string") va = va.toLowerCase();
    if (typeof vb === "string") vb = vb.toLowerCase();
    if (va < vb) return sortDir === "asc" ? -1 : 1;
    if (va > vb) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  const fetchReturns = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('q', searchQuery);
      if (statusFilter) params.set('status', statusFilter);
      const res = await fetch(`/api/purchase-returns?${params.toString()}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setReturns(data);
      }
    } catch (error) {
      console.error('載入失敗:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
    fetchReturns();
  }, [statusFilter]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchReturns();
  };

  const handleDelete = async (id) => {
    if (!confirm('確定要刪除此進貨退出單嗎？')) return;
    try {
      const res = await fetch(`/api/purchase-returns/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchReturns();
      } else {
        alert('刪除失敗');
      }
    } catch (error) {
      alert('刪除失敗');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-purple-900">進貨退出管理</h1>
            <p className="text-purple-600 mt-1">管理所有進貨退出單據</p>
          </div>
          <Link
            href="/purchase-returns/new"
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            新增退出單
          </Link>
        </div>

        {/* Search & Filter */}
        <div className="bg-white rounded-lg shadow-sm border border-purple-100 p-4 mb-6">
          <form onSubmit={handleSearch} className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <input
                type="text"
                placeholder="搜尋退出單號、廠商名稱、原進貨單號..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full border border-purple-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-purple-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">全部狀態</option>
              <option value="draft">草稿</option>
              <option value="confirmed">已確認</option>
              <option value="completed">已完成</option>
              <option value="cancelled">已取消</option>
            </select>
            <button
              type="submit"
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg transition-colors"
            >
              搜尋
            </button>
          </form>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-sm border border-purple-100 overflow-hidden">
          {loading ? (
            <div className="text-center py-12 text-purple-400">載入中...</div>
          ) : returns.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <svg className="mx-auto h-12 w-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-3-3v6m-7 4h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <p>尚無進貨退出單</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-purple-100">
                <thead className="bg-purple-50">
                  <tr>
                    <SortTh field="return_no">退出單號</SortTh>
                    <SortTh field="vendor_name">廠商名稱</SortTh>
                    <SortTh field="return_date">退出日期</SortTh>
                    <th className="px-6 py-3 text-left text-xs font-medium text-purple-700 uppercase tracking-wider">原進貨單號</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-purple-700 uppercase tracking-wider">退出原因</th>
                    <SortTh field="status">狀態</SortTh>
                    <SortTh field="total" className="text-right">總金額</SortTh>
                    <th className="px-6 py-3 text-center text-xs font-medium text-purple-700 uppercase tracking-wider">操作</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-purple-50">
                  {sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((item) => (
                    <tr key={item.id} className="hover:bg-purple-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link href={`/purchase-returns/${item.id}`} className="text-purple-600 hover:text-purple-900 font-medium">
                          {item.return_no}
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-700">{item.vendor_name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-700">{item.return_date}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-700">{item.original_po_no || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-700">{item.reason || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusMap[item.status]?.color || 'bg-gray-100 text-gray-800'}`}>
                          {statusMap[item.status]?.label || item.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-gray-700">
                        {Number(item.total || 0).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => router.push(`/purchase-returns/${item.id}`)}
                            className="text-purple-600 hover:text-purple-900 text-sm font-medium"
                          >
                            編輯
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="text-red-500 hover:text-red-700 text-sm font-medium"
                          >
                            刪除
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {Math.ceil(returns.length / PAGE_SIZE) > 1 && (
          <div className="flex items-center justify-center gap-2 mt-4">
            <button onClick={() => setPage(1)} disabled={page === 1} className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-30 hover:bg-gray-50">第一頁</button>
            <button onClick={() => setPage(p => p - 1)} disabled={page === 1} className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-30 hover:bg-gray-50">上一頁</button>
            <span className="px-3 py-1.5 text-sm">{page} / {Math.ceil(returns.length / PAGE_SIZE)}</span>
            <button onClick={() => setPage(p => p + 1)} disabled={page === Math.ceil(returns.length / PAGE_SIZE)} className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-30 hover:bg-gray-50">下一頁</button>
            <button onClick={() => setPage(Math.ceil(returns.length / PAGE_SIZE))} disabled={page === Math.ceil(returns.length / PAGE_SIZE)} className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-30 hover:bg-gray-50">最後一頁</button>
          </div>
        )}
        <p className="text-base text-gray-400 mt-2">共 {returns.length} 筆</p>
      </div>
    </div>
  );
}
