import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { claimsApi } from '../api/claims';
import type { Claim } from '../api/claims';

function getFileIcon(contentType: string): { label: string; cls: string } {
  if (contentType.includes('pdf')) return { label: 'PDF', cls: 'pdf' };
  if (contentType.includes('image')) return { label: 'IMG', cls: 'image' };
  if (contentType.includes('sheet') || contentType.includes('excel') || contentType.includes('csv'))
    return { label: 'XLS', cls: 'excel' };
  return { label: 'FILE', cls: 'other' };
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

const formatAmount = (n: number) =>
  new Intl.NumberFormat('en-MY', { style: 'currency', currency: 'MYR' }).format(n);

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('en-MY', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });

export default function ClaimDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [claim, setClaim] = useState<Claim | null>(null);
  const [loading, setLoading] = useState(true);

  // Review modal
  const [showReview, setShowReview] = useState<'approve' | 'reject' | null>(null);
  const [reviewedBy, setReviewedBy] = useState('');
  const [reviewNotes, setReviewNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await claimsApi.getOne(Number(id));
      setClaim(res.data);
    } catch {
      navigate('/claims');
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  const handleSubmitClaim = async () => {
    if (!claim) return;
    await claimsApi.submit(claim.id);
    load();
  };

  const handleReview = async () => {
    if (!claim || !showReview) return;
    setProcessing(true);
    try {
      const dto = { reviewedBy, reviewNotes };
      if (showReview === 'approve') {
        await claimsApi.approve(claim.id, dto);
      } else {
        await claimsApi.reject(claim.id, dto);
      }
      setShowReview(null);
      load();
    } catch (err) {
      console.error(err);
    }
    setProcessing(false);
  };

  const handleDelete = async () => {
    if (!claim || !confirm('Delete this claim permanently?')) return;
    await claimsApi.delete(claim.id);
    navigate('/claims');
  };

  if (loading || !claim) return <div className="loader"><div className="spinner" /></div>;

  return (
    <div>
      <Link to="/claims" className="back-link">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
        Back to Claims
      </Link>

      <div className="detail-header">
        <div>
          <h2>{claim.title}</h2>
          <div style={{ marginTop: 8 }}>
            <span className={`badge badge-${claim.status.toLowerCase()}`}>{claim.status}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {claim.status === 'Draft' && (
            <>
              <button onClick={handleSubmitClaim} className="btn btn-primary">Submit for Review</button>
              <Link to={`/claims/${claim.id}/edit`} className="btn btn-outline">Edit</Link>
              <button onClick={handleDelete} className="btn btn-danger">Delete</button>
            </>
          )}
        </div>
      </div>

      <div className="detail-meta">
        <div className="meta-card">
          <div className="label">Amount</div>
          <div className="value amount">{formatAmount(claim.amount)}</div>
        </div>
        <div className="meta-card">
          <div className="label">Submitted By</div>
          <div className="value">{claim.submittedBy}</div>
        </div>
        <div className="meta-card">
          <div className="label">Created</div>
          <div className="value" style={{ fontSize: 14 }}>{formatDate(claim.createdAt)}</div>
        </div>
        <div className="meta-card">
          <div className="label">Last Updated</div>
          <div className="value" style={{ fontSize: 14 }}>{formatDate(claim.updatedAt)}</div>
        </div>
      </div>

      {/* Description / Justification */}
      {claim.description && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="section-title">Justification</div>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
            {claim.description}
          </p>
        </div>
      )}

      {/* Review info if reviewed */}
      {claim.reviewedBy && (
        <div className="card" style={{ marginBottom: 24, borderColor: claim.status === 'Approved' ? 'var(--success)' : 'var(--danger)' }}>
          <div className="section-title">Review Decision</div>
          <div style={{ display: 'grid', gap: 12 }}>
            <div>
              <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Reviewed By: </span>
              <span style={{ fontWeight: 500 }}>{claim.reviewedBy}</span>
            </div>
            {claim.reviewNotes && (
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Notes: </span>
                <span style={{ color: 'var(--text-secondary)' }}>{claim.reviewNotes}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Files */}
      <div className="card">
        <div className="section-title">Attachments ({claim.files.length})</div>
        {claim.files.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No files attached.</p>
        ) : (
          <div className="file-list">
            {claim.files.map(f => {
              const icon = getFileIcon(f.contentType);
              const url = claimsApi.getFileUrl(claim.id, f.id);
              const isImage = f.contentType.startsWith('image/');
              return (
                <div key={f.id}>
                  <div className="file-item">
                    <div className={`file-icon ${icon.cls}`}>{icon.label}</div>
                    <div className="file-info">
                      <div className="name">{f.fileName}</div>
                      <div className="meta">{formatSize(f.fileSize)} · Uploaded {formatDate(f.uploadedAt)}</div>
                    </div>
                    <a href={url} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm">
                      Download
                    </a>
                  </div>
                  {isImage && (
                    <img src={url} alt={f.fileName} className="file-preview-img" />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Board review panel (only for Submitted claims) */}
      {claim.status === 'Submitted' && (
        <div className="review-panel">
          <h3>Board Review</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 16 }}>
            This claim is pending review. Approve or reject with notes.
          </p>
          <div className="review-actions">
            <button onClick={() => setShowReview('approve')} className="btn btn-success">
              ✓ Approve
            </button>
            <button onClick={() => setShowReview('reject')} className="btn btn-danger">
              ✕ Reject
            </button>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {showReview && (
        <div className="modal-overlay" onClick={() => setShowReview(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>{showReview === 'approve' ? 'Approve Claim' : 'Reject Claim'}</h3>
            <div className="form-group">
              <label>Your Name</label>
              <input
                className="form-control"
                value={reviewedBy}
                onChange={e => setReviewedBy(e.target.value)}
                placeholder="Board member name"
                required
              />
            </div>
            <div className="form-group">
              <label>Notes (Optional)</label>
              <textarea
                className="form-control"
                value={reviewNotes}
                onChange={e => setReviewNotes(e.target.value)}
                placeholder="Add review notes..."
                rows={3}
              />
            </div>
            <div className="modal-actions">
              <button onClick={() => setShowReview(null)} className="btn btn-outline">Cancel</button>
              <button
                onClick={handleReview}
                className={`btn ${showReview === 'approve' ? 'btn-success' : 'btn-danger'}`}
                disabled={!reviewedBy || processing}
              >
                {processing ? 'Processing...' : showReview === 'approve' ? 'Confirm Approve' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
