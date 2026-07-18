import { useState, type FormEvent } from 'react';
import { submitBugReport } from '@/api/notifications';
import { getErrorMessage } from '@/api/client';
import { useToast } from '@/components/Toast';

export default function BugReportSection() {
  const toast = useToast();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      toast.error('Vui lòng nhập đầy đủ tiêu đề và nội dung');
      return;
    }
    setSending(true);
    try {
      await submitBugReport(title.trim(), message.trim());
      toast.success('Đã gửi báo lỗi tới Admin. Cảm ơn bạn!');
      setTitle('');
      setMessage('');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="section-card">
      <div className="section-head">
        <h3>
          <i className="fa-solid fa-bug" style={{ color: 'var(--danger)' }} /> Báo lỗi tới Admin
        </h3>
      </div>
      <div style={{ padding: '0 22px 8px' }}>
        <p style={{ fontSize: 13, color: 'var(--text-light)', marginTop: 0 }}>
          Gặp lỗi hoặc có vấn đề khi sử dụng hệ thống? Hãy mô tả chi tiết để Admin có thể hỗ trợ và
          khắc phục nhanh nhất.
        </p>
      </div>
      <form onSubmit={submit} style={{ padding: '0 22px 20px' }}>
        <div style={{ display: 'grid', gap: 12, maxWidth: 640 }}>
          <div>
            <label
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: 'var(--text-light)',
                marginBottom: 4,
                display: 'block',
              }}
            >
              Tiêu đề
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="VD: [Thanh toán] Không thể thanh toán hoá đơn..."
              maxLength={255}
              style={{
                width: '100%',
                padding: '10px 14px',
                border: '1.5px solid var(--border)',
                borderRadius: 10,
                fontSize: 13,
                fontFamily: "'Nunito',sans-serif",
              }}
            />
          </div>
          <div>
            <label
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: 'var(--text-light)',
                marginBottom: 4,
                display: 'block',
              }}
            >
              Mô tả chi tiết lỗi
            </label>
            <textarea
              rows={6}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Mô tả các bước thực hiện, kết quả mong đợi và kết quả thực tế bạn gặp phải..."
              maxLength={1000}
              style={{
                width: '100%',
                padding: '10px 14px',
                border: '1.5px solid var(--border)',
                borderRadius: 10,
                fontSize: 13,
                fontFamily: "'Nunito',sans-serif",
                resize: 'vertical',
              }}
            />
            <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4, textAlign: 'right' }}>
              {message.length}/1000
            </div>
          </div>
          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: 'fit-content' }}
            disabled={sending}
          >
            {sending ? (
              <>
                <i className="fa-solid fa-spinner fa-spin" /> Đang gửi...
              </>
            ) : (
              <>
                <i className="fa-solid fa-paper-plane" /> Gửi báo lỗi tới Admin
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
