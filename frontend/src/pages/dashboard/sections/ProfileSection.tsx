import { useEffect, useRef, useState, type FormEvent } from 'react';
import { getMyProfile, updateProfile } from '@/api/profile';
import { uploadImage } from '@/api/upload';
import { verifyCccd } from '@/api/kyc';
import { useToast } from '@/components/Toast';
import { getErrorMessage } from '@/api/client';
import type { Profile } from '@/types/profile';

export default function ProfileSection() {
  const toast = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    fullName: '', phone: '', cccdNumber: '', bankAccount: '', bankName: '',
    avatarUrl: '', cccdFrontUrl: '', cccdBackUrl: '', zaloLink: '',
  });

  // Quet CCCD tu dong (eKYC)
  const [scanFront, setScanFront] = useState<File | null>(null);
  const [scanBack, setScanBack] = useState<File | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanInfo, setScanInfo] = useState<{ dob?: string; sex?: string; address?: string } | null>(null);
  const scanFrontRef = useRef<HTMLInputElement>(null);
  const scanBackRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getMyProfile()
      .then((p) => {
        setProfile(p);
        setForm({
          fullName: p.fullName ?? '',
          phone: p.phone ?? '',
          cccdNumber: p.cccdNumber ?? '',
          bankAccount: p.bankAccount ?? '',
          bankName: p.bankName ?? '',
          avatarUrl: p.avatarUrl ?? '',
          cccdFrontUrl: p.cccdFrontUrl ?? '',
          cccdBackUrl: p.cccdBackUrl ?? '',
          zaloLink: p.zaloLink ?? '',
        });
      })
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [toast]);

  const handleScan = async () => {
    if (!scanFront || !scanBack) {
      toast.error('Vui lòng chọn cả 2 ảnh CCCD (mặt trước và mặt sau)');
      return;
    }
    setScanning(true);
    try {
      const info = await verifyCccd(scanFront, scanBack);
      setForm((f) => ({
        ...f,
        cccdNumber: info.id || f.cccdNumber,
        fullName: info.name || f.fullName,
        cccdFrontUrl: info.cccdFrontUrl || f.cccdFrontUrl,
        cccdBackUrl: info.cccdBackUrl || f.cccdBackUrl,
      }));
      setScanInfo({ dob: info.dob, sex: info.sex, address: info.address });
      toast.success('Xác thực CCCD thành công! Thông tin đã được điền tự động.');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Xác thực CCCD thất bại'));
    } finally {
      setScanning(false);
    }
  };

  const handleUpload = async (field: 'avatarUrl' | 'cccdFrontUrl' | 'cccdBackUrl', file: File | null) => {
    if (!file) return;
    try {
      const url = await uploadImage(file);
      setForm((f) => ({ ...f, [field]: url }));
      toast.success('Upload thành công');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Upload thất bại'));
    }
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.fullName.trim()) {
      toast.error('Vui lòng nhập họ và tên');
      return;
    }
    setSaving(true);
    try {
      const updated = await updateProfile(form);
      setProfile(updated);
      toast.success('Đã lưu thông tin');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="loading"><span className="spinner" /> Đang tải...</div>;

  const initials = (form.fullName || profile?.email || '?')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <>
      {!profile?.profileComplete && (
        <div style={{ background: '#fff3cd', border: '1px solid #ffc107', borderRadius: 8, padding: '12px 18px', marginBottom: 16, fontSize: 13, color: '#856404', display: 'flex', alignItems: 'center', gap: 10 }}>
          <i className="fa-solid fa-triangle-exclamation" style={{ color: '#ffc107', fontSize: 18 }} />
          <span>Hồ sơ chưa hoàn thiện. Vui lòng điền đầy đủ thông tin để sử dụng đầy đủ tính năng.</span>
        </div>
      )}

      <div className="section-card" style={{ maxWidth: 700 }}>
        <div className="section-head">
          <h3><i className="fa-solid fa-id-card" style={{ color: 'var(--primary)' }} /> Thông tin cá nhân</h3>
        </div>
        <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: 18, padding: '4px 22px 22px' }}>
          {/* Avatar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
            <label
              style={{
                width: 80, height: 80, borderRadius: '50%',
                background: '#f3f4f6',
                border: '2px dashed var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', overflow: 'hidden',
                fontSize: 26, fontWeight: 800, color: 'var(--primary)',
                flexShrink: 0,
              }}
              title="Đổi ảnh đại diện"
            >
              {form.avatarUrl ? (
                <img src={form.avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                initials
              )}
              <input
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => handleUpload('avatarUrl', e.target.files?.[0] ?? null)}
              />
            </label>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-light)', marginBottom: 4 }}>Ảnh đại diện</div>
              <div style={{ fontSize: 12, color: '#9ca3af' }}>Nhấn vào ảnh để thay đổi. Chấp nhận JPG, PNG, WEBP (tối đa 5MB)</div>
            </div>
          </div>

          {/* Basic info */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div className="form-group">
              <label>Họ và tên *</label>
              <input type="text" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} placeholder="Nguyễn Văn A" />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input type="text" value={profile?.email ?? ''} disabled style={{ background: '#f3f4f6', color: '#9ca3af' }} />
            </div>
            <div className="form-group">
              <label>Số điện thoại *</label>
              <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="0901234567" />
            </div>
          </div>

          {/* eKYC - Quet CCCD tu dong */}
          <div style={{ paddingTop: 12, borderTop: '1px solid var(--border)' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>
              <i className="fa-solid fa-wand-magic-sparkles" style={{ color: '#10b981', marginRight: 6 }} />
              Xác thực CCCD tự động (eKYC)
            </div>
            <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 12 }}>
              Chọn ảnh 2 mặt CCCD, hệ thống sẽ tự động trích xuất thông tin và điền vào form.
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 10, alignItems: 'end' }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-light)', marginBottom: 4 }}>Ảnh mặt trước</div>
                <button
                  type="button"
                  onClick={() => scanFrontRef.current?.click()}
                  style={{
                    width: '100%', height: 40, borderRadius: 6,
                    border: '1px dashed var(--border)', background: '#f9fafb',
                    fontSize: 12, color: scanFront ? '#10b981' : '#6b7280',
                    cursor: 'pointer', padding: '0 10px',
                    textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap',
                  }}
                >
                  <i className={`fa-solid ${scanFront ? 'fa-circle-check' : 'fa-upload'}`} style={{ marginRight: 6 }} />
                  {scanFront ? scanFront.name : 'Chọn ảnh mặt trước'}
                </button>
                <input
                  ref={scanFrontRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={(e) => setScanFront(e.target.files?.[0] ?? null)}
                />
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-light)', marginBottom: 4 }}>Ảnh mặt sau</div>
                <button
                  type="button"
                  onClick={() => scanBackRef.current?.click()}
                  style={{
                    width: '100%', height: 40, borderRadius: 6,
                    border: '1px dashed var(--border)', background: '#f9fafb',
                    fontSize: 12, color: scanBack ? '#10b981' : '#6b7280',
                    cursor: 'pointer', padding: '0 10px',
                    textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap',
                  }}
                >
                  <i className={`fa-solid ${scanBack ? 'fa-circle-check' : 'fa-upload'}`} style={{ marginRight: 6 }} />
                  {scanBack ? scanBack.name : 'Chọn ảnh mặt sau'}
                </button>
                <input
                  ref={scanBackRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={(e) => setScanBack(e.target.files?.[0] ?? null)}
                />
              </div>
              <button
                type="button"
                onClick={handleScan}
                disabled={scanning || !scanFront || !scanBack}
                className="btn btn-primary"
                style={{ height: 40, whiteSpace: 'nowrap' }}
              >
                {scanning ? (
                  <><i className="fa-solid fa-spinner fa-spin" /> Đang quét...</>
                ) : (
                  <><i className="fa-solid fa-bolt" /> Quét tự động</>
                )}
              </button>
            </div>
            {scanInfo && (
              <div style={{
                marginTop: 10, padding: '10px 12px',
                background: '#ecfdf5', border: '1px solid #10b981',
                borderRadius: 6, fontSize: 12, color: '#065f46',
              }}>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>
                  <i className="fa-solid fa-circle-check" style={{ marginRight: 6 }} />
                  Thông tin trích xuất từ CCCD:
                </div>
                {scanInfo.dob && <div>• Ngày sinh: {scanInfo.dob}</div>}
                {scanInfo.sex && <div>• Giới tính: {scanInfo.sex}</div>}
                {scanInfo.address && <div>• Địa chỉ: {scanInfo.address}</div>}
              </div>
            )}
          </div>

          {/* CCCD */}
          <div style={{ paddingTop: 12, borderTop: '1px solid var(--border)' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>
              <i className="fa-solid fa-id-card" style={{ color: 'var(--primary)', marginRight: 6 }} />
              Căn cước công dân (CCCD)
            </div>
            <div className="form-group" style={{ maxWidth: 320, marginBottom: 12 }}>
              <label>Số CCCD / CMND *</label>
              <input type="text" value={form.cccdNumber} onChange={(e) => setForm({ ...form, cccdNumber: e.target.value })} placeholder="001234567890" maxLength={20} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {([
                ['cccdFrontUrl', 'Mặt trước CCCD *'],
                ['cccdBackUrl', 'Mặt sau CCCD *'],
              ] as const).map(([field, label]) => (
                <div key={field}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-light)', marginBottom: 6 }}>{label}</div>
                  <label
                    style={{
                      height: 100,
                      border: '2px dashed var(--border)',
                      borderRadius: 8,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      cursor: 'pointer',
                      overflow: 'hidden',
                      background: '#f3f4f6',
                    }}
                  >
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={(e) => handleUpload(field, e.target.files?.[0] ?? null)}
                    />
                    {form[field] ? (
                      <img src={form[field]} alt={label} style={{ maxWidth: '100%', maxHeight: 96, objectFit: 'cover' }} />
                    ) : (
                      <>
                        <i className="fa-solid fa-id-card" style={{ fontSize: 28, color: '#9ca3af' }} />
                        <span style={{ fontSize: 11, color: '#9ca3af' }}>Bấm để tải ảnh</span>
                      </>
                    )}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Bank */}
          <div style={{ paddingTop: 12, borderTop: '1px solid var(--border)' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>
              <i className="fa-solid fa-building-columns" style={{ color: 'var(--primary)', marginRight: 6 }} />
              Tài khoản ngân hàng
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div className="form-group">
                <label>Số tài khoản *</label>
                <input type="text" value={form.bankAccount} onChange={(e) => setForm({ ...form, bankAccount: e.target.value })} placeholder="1234567890" />
              </div>
              <div className="form-group">
                <label>Tên ngân hàng *</label>
                <input type="text" value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })} placeholder="Vietcombank" />
              </div>
            </div>
          </div>

          {/* Zalo */}
          <div style={{ paddingTop: 12, borderTop: '1px solid var(--border)' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>
              <i className="fa-solid fa-comment-dots" style={{ color: '#0068FF', marginRight: 6 }} />
              Liên hệ Zalo
            </div>
            <div className="form-group">
              <label>Link Zalo (zalo.me/... hoặc số điện thoại)</label>
              <input type="text" value={form.zaloLink} onChange={(e) => setForm({ ...form, zaloLink: e.target.value })} placeholder="VD: https://zalo.me/0901234567 hoặc 0901234567" />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 8 }}>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? (<><i className="fa-solid fa-spinner fa-spin" /> Đang lưu...</>) : (<><i className="fa-solid fa-floppy-disk" /> Lưu thông tin</>)}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
