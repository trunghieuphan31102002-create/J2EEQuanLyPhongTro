import { useEffect, useState } from 'react';
import { getFullReport } from '@/api/admin';
import { useToast } from '@/components/Toast';
import { fmtNumber } from '@/lib/format';

// Loosely typed — backend returns a complex nested shape
interface FullReport {
  overview: {
    currentMonth: { actual: number; expected: number; collectionRate: number };
    rooms: { total: number; occupied: number; available: number; maintenance: number; occupancyRate: number };
    overdueDebt: number;
    maintenanceCost: number;
    netProfit: number;
    contracts: { active: number; newThisMonth: number; terminatedThisMonth: number };
  };
  monthlyRevenue: Array<{ month: string; actual: number; expected: number }>;
  occupancyTrend: Array<{ month: string; rate: number }>;
  topOverdueRooms: Array<{ roomNo: string; buildingName: string; debt: number }>;
  retention: { retentionRate: number };
}

export default function ReportsSection() {
  const toast = useToast();
  const [data, setData] = useState<FullReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getFullReport()
      .then((d) => setData(d as unknown as FullReport))
      .catch(() => toast.error('Không tải được báo cáo'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <div className="loading"><span className="spinner" /> Đang tải...</div>;
  if (!data || !data.overview) {
    return (
      <div className="section-card">
        <div className="empty"><div className="empty-icon">📊</div><p>Không có dữ liệu báo cáo</p></div>
      </div>
    );
  }

  const ov = data.overview;
  const cm = ov.currentMonth;

  const kpiCards = [
    { label: 'Doanh thu tháng này', value: `${fmtNumber(cm.actual)} đ`, icon: 'fa-money-bill-trend-up', color: '#2ecc71', bg: 'rgba(46,204,113,.1)' },
    { label: 'Doanh thu kỳ vọng',    value: `${fmtNumber(cm.expected)} đ`, icon: 'fa-bullseye', color: '#3b82f6', bg: 'rgba(59,130,246,.1)' },
    { label: 'Tỷ lệ thu',            value: `${cm.collectionRate}%`, icon: 'fa-percent', color: cm.collectionRate >= 80 ? '#2ecc71' : '#ef4444', bg: cm.collectionRate >= 80 ? 'rgba(46,204,113,.1)' : 'rgba(239,68,68,.1)' },
    { label: 'Tỷ lệ lấp đầy',         value: `${ov.rooms.occupancyRate}%`, icon: 'fa-building-circle-check', color: '#8b5cf6', bg: 'rgba(139,92,246,.1)' },
    { label: 'Nợ xấu',                value: `${fmtNumber(ov.overdueDebt)} đ`, icon: 'fa-triangle-exclamation', color: '#ef4444', bg: 'rgba(239,68,68,.1)' },
    { label: 'Chi phí bảo trì',       value: `${fmtNumber(ov.maintenanceCost)} đ`, icon: 'fa-screwdriver-wrench', color: '#f59e0b', bg: 'rgba(245,158,11,.1)' },
    { label: 'Lợi nhuận ròng',        value: `${fmtNumber(ov.netProfit)} đ`, icon: 'fa-chart-line', color: ov.netProfit >= 0 ? '#2ecc71' : '#ef4444', bg: ov.netProfit >= 0 ? 'rgba(46,204,113,.1)' : 'rgba(239,68,68,.1)' },
    { label: 'HĐ mới tháng này',      value: String(ov.contracts.newThisMonth), icon: 'fa-file-circle-plus', color: '#3b82f6', bg: 'rgba(59,130,246,.1)' },
  ];

  const maxRevenue = Math.max(...(data.monthlyRevenue ?? []).map((d) => Math.max(d.actual || 0, d.expected || 0)), 1);

  // Room donut (conic-gradient)
  const total = ov.rooms.total || 1;
  const segments = [
    { label: 'Đang thuê', count: ov.rooms.occupied, color: '#2ecc71' },
    { label: 'Trống',     count: ov.rooms.available, color: '#3b82f6' },
    { label: 'Bảo trì',   count: ov.rooms.maintenance, color: '#f59e0b' },
  ];
  let offset = 0;
  const grad = segments.map((s) => {
    const pct = (s.count / total) * 100;
    const part = `${s.color} ${offset}% ${offset + pct}%`;
    offset += pct;
    return part;
  });
  if (offset < 100) grad.push(`#e2e8f0 ${offset}% 100%`);

  // Retention
  const retRate = data.retention?.retentionRate ?? 0;
  const retColor = retRate >= 90 ? '#2ecc71' : retRate >= 70 ? '#f59e0b' : '#ef4444';

  return (
    <>
      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 14, marginBottom: 20 }}>
        {kpiCards.map((c, i) => (
          <div key={i} style={{ background: '#fff', borderRadius: 14, padding: 18, border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 46, height: 46, borderRadius: 12, background: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <i className={`fa-solid ${c.icon}`} style={{ fontSize: 18, color: c.color }} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-light)', fontWeight: 600 }}>{c.label}</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>{c.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Revenue chart */}
      <div className="section-card" style={{ marginBottom: 20 }}>
        <div className="section-head">
          <h3><i className="fa-solid fa-chart-column" style={{ color: 'var(--primary)' }} /> Doanh thu 12 tháng</h3>
        </div>
        <div style={{ padding: 16, overflowX: 'auto' }}>
          {!data.monthlyRevenue || data.monthlyRevenue.length === 0 ? (
            <div className="empty">Không có dữ liệu</div>
          ) : (
            <>
              <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 200, paddingBottom: 28, position: 'relative', borderBottom: '1px solid var(--border)' }}>
                {data.monthlyRevenue.map((d, i) => {
                  const aH = Math.max(((d.actual || 0) / maxRevenue) * 180, 4);
                  const eH = Math.max(((d.expected || 0) / maxRevenue) * 180, 4);
                  const label = d.month.substring(5);
                  return (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, position: 'relative' }}>
                      <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', width: '100%', justifyContent: 'center' }}>
                        <div title={`Kỳ vọng: ${fmtNumber(d.expected)} đ`} style={{ width: '40%', height: eH, background: 'rgba(59,130,246,.25)', borderRadius: '4px 4px 0 0' }} />
                        <div title={`Thực thu: ${fmtNumber(d.actual)} đ`} style={{ width: '40%', height: aH, background: 'var(--primary)', borderRadius: '4px 4px 0 0' }} />
                      </div>
                      <span style={{ fontSize: 10, color: 'var(--text-light)', position: 'absolute', bottom: -22 }}>{label}</span>
                    </div>
                  );
                })}
              </div>
              <div style={{ display: 'flex', gap: 16, marginTop: 12, fontSize: 12, color: 'var(--text-light)' }}>
                <span>
                  <span style={{ display: 'inline-block', width: 12, height: 12, background: 'var(--primary)', borderRadius: 3, verticalAlign: 'middle', marginRight: 4 }} />
                  Thực thu
                </span>
                <span>
                  <span style={{ display: 'inline-block', width: 12, height: 12, background: 'rgba(59,130,246,.25)', borderRadius: 3, verticalAlign: 'middle', marginRight: 4 }} />
                  Kỳ vọng
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Row 2: Occupancy + Room donut */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginBottom: 20 }}>
        <div className="section-card">
          <div className="section-head">
            <h3><i className="fa-solid fa-chart-area" style={{ color: '#3b82f6' }} /> Tỷ lệ lấp đầy</h3>
          </div>
          <div style={{ padding: 16 }}>
            {!data.occupancyTrend || data.occupancyTrend.length === 0 ? (
              <div className="empty">Không có dữ liệu</div>
            ) : (
              <div style={{ position: 'relative', height: 180, borderBottom: '1px solid var(--border)', paddingBottom: 28 }}>
                <svg viewBox={`0 0 ${data.occupancyTrend.length * 60} 160`} style={{ width: '100%', height: 152 }} preserveAspectRatio="none">
                  <polyline
                    fill="rgba(59,130,246,.1)"
                    stroke="none"
                    points={`0,160 ${data.occupancyTrend.map((d, i) => `${i * 60 + 30},${160 - d.rate * 1.5}`).join(' ')} ${(data.occupancyTrend.length - 1) * 60 + 30},160`}
                  />
                  <polyline
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={data.occupancyTrend.map((d, i) => `${i * 60 + 30},${160 - d.rate * 1.5}`).join(' ')}
                  />
                  {data.occupancyTrend.map((d, i) => (
                    <circle key={i} cx={i * 60 + 30} cy={160 - d.rate * 1.5} r={4} fill="#3b82f6" />
                  ))}
                </svg>
                <div style={{ display: 'flex', justifyContent: 'space-between', position: 'absolute', bottom: 0, left: 0, right: 0 }}>
                  {data.occupancyTrend.map((d, i) => (
                    <span key={i} style={{ fontSize: 10, color: 'var(--text-light)' }}>{d.month.substring(5)}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="section-card">
          <div className="section-head">
            <h3><i className="fa-solid fa-chart-pie" style={{ color: '#8b5cf6' }} /> Trạng thái phòng</h3>
          </div>
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 140, height: 140, borderRadius: '50%', background: `conic-gradient(${grad.join(',')})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 90, height: 90, borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)' }}>{total}</div>
                <div style={{ fontSize: 10, color: 'var(--text-light)' }}>phòng</div>
              </div>
            </div>
            <div style={{ display: 'grid', gap: 6, width: '100%' }}>
              {segments.map((s) => (
                <div key={s.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13 }}>
                  <span>
                    <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: s.color, marginRight: 6 }} />
                    {s.label}
                  </span>
                  <strong>
                    {s.count} <span style={{ color: 'var(--text-light)', fontWeight: 500 }}>({total > 0 ? Math.round((s.count / total) * 100) : 0}%)</span>
                  </strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: Top overdue + Retention */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div className="section-card">
          <div className="section-head">
            <h3><i className="fa-solid fa-triangle-exclamation" style={{ color: 'var(--danger)' }} /> Top phòng nợ xấu</h3>
          </div>
          <div style={{ padding: '0 16px 16px' }}>
            {!data.topOverdueRooms || data.topOverdueRooms.length === 0 ? (
              <div className="empty" style={{ padding: 20 }}>
                <div className="empty-icon"><i className="fa-solid fa-check-circle" style={{ fontSize: 32, color: 'var(--success)' }} /></div>
                <p>Không có nợ xấu</p>
              </div>
            ) : (
              <table style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Phòng</th>
                    <th>Tòa nhà</th>
                    <th style={{ textAlign: 'right' }}>Số nợ</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topOverdueRooms.map((d, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 700, color: i < 3 ? 'var(--danger)' : 'var(--text-light)' }}>{i + 1}</td>
                      <td><strong>{d.roomNo}</strong></td>
                      <td style={{ color: 'var(--text-light)' }}>{d.buildingName}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--danger)' }}>{fmtNumber(d.debt)} đ</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="section-card">
          <div className="section-head">
            <h3><i className="fa-solid fa-user-check" style={{ color: 'var(--success)' }} /> Giữ chân Tenant</h3>
          </div>
          <div style={{ padding: 16, textAlign: 'center' }}>
            <div style={{ position: 'relative', width: 140, height: 140, margin: '0 auto 16px' }}>
              <svg viewBox="0 0 36 36" style={{ width: 140, height: 140, transform: 'rotate(-90deg)' }}>
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e2e8f0" strokeWidth="3" />
                <circle
                  cx="18" cy="18" r="15.9"
                  fill="none"
                  stroke={retColor}
                  strokeWidth="3"
                  strokeDasharray={`${retRate} ${100 - retRate}`}
                  strokeLinecap="round"
                />
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                <div style={{ fontSize: 28, fontWeight: 800, color: retColor }}>{retRate}%</div>
                <div style={{ fontSize: 10, color: 'var(--text-light)' }}>Giữ chân</div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              <div style={{ background: 'var(--bg)', padding: 10, borderRadius: 10 }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)' }}>{ov.contracts.active}</div>
                <div style={{ fontSize: 10, color: 'var(--text-light)' }}>Đang thuê</div>
              </div>
              <div style={{ background: 'rgba(46,204,113,.08)', padding: 10, borderRadius: 10 }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#2ecc71' }}>{ov.contracts.newThisMonth}</div>
                <div style={{ fontSize: 10, color: 'var(--text-light)' }}>Mới</div>
              </div>
              <div style={{ background: 'rgba(239,68,68,.08)', padding: 10, borderRadius: 10 }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#ef4444' }}>{ov.contracts.terminatedThisMonth}</div>
                <div style={{ fontSize: 10, color: 'var(--text-light)' }}>Rời đi</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
