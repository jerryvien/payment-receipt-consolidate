import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { claimsApi } from '../api/claims';
import type { Claim } from '../api/claims';

const statuses = ['All', 'Draft', 'Submitted', 'Approved', 'Rejected'];

export default function ClaimsListPage() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');

  const load = async () => {
    setLoading(true);
    try {
      const status = filter === 'All' ? undefined : filter;
      const res = await claimsApi.getAll(status);
      setClaims(res.data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [filter]);

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this claim permanently?')) return;
    await claimsApi.delete(id);
    load();
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-MY', { day: '2-digit', month: 'short', year: 'numeric' });

  const formatAmount = (n: number) =>
    new Intl.NumberFormat('en-MY', { style: 'currency', currency: 'MYR' }).format(n);

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Receipt Claims</h2>
          <p>Manage and track all expense claims</p>
        </div>
        <Link to="/claims/new" className="btn btn-primary">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Claim
        </Link>
      </div>

      <div className="filter-bar">
        {statuses.map(s => (
          <button
            key={s}
            className={`filter-btn ${filter === s ? 'active' : ''}`}
            onClick={() => setFilter(s)}
          >
            {s}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loader"><div className="spinner" /></div>
      ) : claims.length === 0 ? (
        <div className="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
          <h3>No claims yet</h3>
          <p>Create your first receipt claim to get started.</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Submitted By</th>
                <th>Date</th>
                <th>Files</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {claims.map(c => (
                <tr key={c.id}>
                  <td>
                    <Link to={`/claims/${c.id}`} style={{ color: 'var(--text-primary)', textDecoration: 'none', fontWeight: 500 }}>
                      {c.title}
                    </Link>
                  </td>
                  <td className="amount">{formatAmount(c.amount)}</td>
                  <td>
                    <span className={`badge badge-${c.status.toLowerCase()}`}>
                      {c.status}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-secondary)' }}>{c.submittedBy}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{formatDate(c.createdAt)}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{c.files.length}</td>
                  <td>
                    <div className="table-actions">
                      <Link to={`/claims/${c.id}`} className="btn btn-outline btn-sm">View</Link>
                      {c.status === 'Draft' && (
                        <>
                          <Link to={`/claims/${c.id}/edit`} className="btn btn-outline btn-sm">Edit</Link>
                          <button onClick={() => handleDelete(c.id)} className="btn btn-danger btn-sm">Delete</button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
