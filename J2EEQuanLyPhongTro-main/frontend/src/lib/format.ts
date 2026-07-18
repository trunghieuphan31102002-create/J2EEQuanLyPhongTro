const vnFmt = new Intl.NumberFormat('vi-VN');

export function fmtNumber(n: number | null | undefined): string {
  if (n == null) return '0';
  return vnFmt.format(n);
}

export function fmtCurrency(n: number | null | undefined): string {
  return fmtNumber(n) + 'đ';
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '--';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '--';
  return d.toLocaleDateString('vi-VN');
}

export function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return '--';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '--';
  return d.toLocaleString('vi-VN');
}

export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso).getTime();
  if (Number.isNaN(d)) return '';
  const diff = Math.floor((Date.now() - d) / 1000);
  if (diff < 60) return 'vừa xong';
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)} ngày trước`;
  return new Date(iso).toLocaleDateString('vi-VN');
}
