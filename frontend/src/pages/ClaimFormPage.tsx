import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { claimsApi } from '../api/claims';
import type { ClaimFile as ClaimFileType } from '../api/claims';

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

export default function ClaimFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [submittedBy, setSubmittedBy] = useState('');
  const [existingFiles, setExistingFiles] = useState<ClaimFileType[]>([]);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dragover, setDragover] = useState(false);

  useEffect(() => {
    if (isEdit && id) {
      setLoading(true);
      claimsApi.getOne(Number(id)).then(res => {
        const c = res.data;
        setTitle(c.title);
        setDescription(c.description || '');
        setAmount(String(c.amount));
        setSubmittedBy(c.submittedBy);
        setExistingFiles(c.files);
      }).finally(() => setLoading(false));
    }
  }, [id, isEdit]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragover(false);
    const files = Array.from(e.dataTransfer.files);
    setPendingFiles(prev => [...prev, ...files]);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setPendingFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removePending = (idx: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const removeExisting = async (fileId: number) => {
    if (!id) return;
    await claimsApi.deleteFile(Number(id), fileId);
    setExistingFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      let claimId: number;

      if (isEdit && id) {
        await claimsApi.update(Number(id), { title, description, amount: parseFloat(amount) });
        claimId = Number(id);
      } else {
        const res = await claimsApi.create({
          title,
          description,
          amount: parseFloat(amount),
          submittedBy,
        });
        claimId = res.data.id;
      }

      if (pendingFiles.length > 0) {
        await claimsApi.uploadFiles(claimId, pendingFiles);
      }

      navigate(`/claims/${claimId}`);
    } catch (err) {
      console.error(err);
      alert('Failed to save claim. Check console for details.');
    }
    setSaving(false);
  };

  if (loading) return <div className="loader"><div className="spinner" /></div>;

  return (
    <div>
      <Link to="/claims" className="back-link">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
        Back to Claims
      </Link>

      <div className="page-header">
        <div>
          <h2>{isEdit ? 'Edit Claim' : 'New Claim'}</h2>
          <p>{isEdit ? 'Update claim details and attachments' : 'Create a new receipt claim with supporting documents'}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="card">
          <div className="form-row">
            <div className="form-group">
              <label>Title</label>
              <input
                className="form-control"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Office supplies purchase"
                required
              />
            </div>
            <div className="form-group">
              <label>Amount (MYR)</label>
              <input
                className="form-control"
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0.00"
                required
              />
            </div>
          </div>

          {!isEdit && (
            <div className="form-group">
              <label>Submitted By</label>
              <input
                className="form-control"
                value={submittedBy}
                onChange={e => setSubmittedBy(e.target.value)}
                placeholder="Your name"
                required
              />
            </div>
          )}

          <div className="form-group">
            <label>Justification / Description</label>
            <textarea
              className="form-control"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Explain the purpose of this expense and why it should be approved..."
              rows={4}
            />
          </div>
        </div>

        <div className="card" style={{ marginTop: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Attachments</h3>

          <div
            className={`file-dropzone ${dragover ? 'dragover' : ''}`}
            onDragOver={e => { e.preventDefault(); setDragover(true); }}
            onDragLeave={() => setDragover(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <p>Drag & drop files here, or <span className="highlight">browse</span></p>
            <p className="supported">Supported: PDF, JPG, PNG, Excel (.xlsx, .xls), CSV</p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.xlsx,.xls,.csv"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />

          {/* Existing files (edit mode) */}
          {existingFiles.length > 0 && (
            <div className="file-list">
              {existingFiles.map(f => {
                const icon = getFileIcon(f.contentType);
                return (
                  <div key={f.id} className="file-item">
                    <div className={`file-icon ${icon.cls}`}>{icon.label}</div>
                    <div className="file-info">
                      <div className="name">{f.fileName}</div>
                      <div className="meta">{formatSize(f.fileSize)}</div>
                    </div>
                    <button type="button" className="btn btn-danger btn-sm" onClick={() => removeExisting(f.id)}>
                      Remove
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pending new files */}
          {pendingFiles.length > 0 && (
            <div className="file-list">
              {pendingFiles.map((f, i) => {
                const icon = getFileIcon(f.type);
                return (
                  <div key={i} className="file-item">
                    <div className={`file-icon ${icon.cls}`}>{icon.label}</div>
                    <div className="file-info">
                      <div className="name">{f.name}</div>
                      <div className="meta">{formatSize(f.size)} · New</div>
                    </div>
                    <button type="button" className="btn btn-outline btn-sm" onClick={() => removePending(i)}>
                      Remove
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div style={{ marginTop: 24, display: 'flex', gap: 12 }}>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving...' : isEdit ? 'Update Claim' : 'Create Claim'}
          </button>
          <Link to="/claims" className="btn btn-outline">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
