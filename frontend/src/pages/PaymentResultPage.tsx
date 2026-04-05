import { useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

/**
 * Trang hien thi ket qua sau khi VNPay redirect ve.
 * URL dang: /payment/result?valid=true&code=00&billId=123&amount=500000
 *
 * VNPay response codes:
 *  - 00 = thanh cong
 *  - 07 = tru tien thanh cong nhung GD bi nghi ngo
 *  - 24 = user huy giao dich
 *  - 51 = tai khoan khong du so du
 *  - khac = loi
 */
export default function PaymentResultPage() {
  const [params] = useSearchParams();
  const valid = params.get('valid') === 'true';
  const code = params.get('code') ?? '';
  const billId = params.get('billId') ?? '';
  const amount = params.get('amount') ?? '';

  const { success, title, message, icon, color } = useMemo(() => {
    if (!valid) {
      return {
        success: false,
        title: 'Giao dịch không hợp lệ',
        message: 'Chữ ký giao dịch không khớp. Có thể đã bị can thiệp hoặc URL không đúng.',
        icon: 'fa-triangle-exclamation',
        color: '#dc2626',
      };
    }
    if (code === '00') {
      return {
        success: true,
        title: 'Thanh toán thành công!',
        message: `Hóa đơn #${billId} đã được thanh toán qua VNPay. Cảm ơn bạn!`,
        icon: 'fa-circle-check',
        color: '#16a34a',
      };
    }
    if (code === '24') {
      return {
        success: false,
        title: 'Bạn đã hủy giao dịch',
        message: 'Giao dịch không được thực hiện. Bạn có thể thử lại bất cứ lúc nào.',
        icon: 'fa-circle-xmark',
        color: '#6b7280',
      };
    }
    if (code === '51') {
      return {
        success: false,
        title: 'Tài khoản không đủ số dư',
        message: 'Vui lòng nạp thêm tiền vào thẻ hoặc chọn phương thức khác.',
        icon: 'fa-wallet',
        color: '#ea580c',
      };
    }
    return {
      success: false,
      title: 'Giao dịch thất bại',
      message: `Mã lỗi VNPay: ${code}. Vui lòng thử lại hoặc liên hệ hỗ trợ.`,
      icon: 'fa-circle-exclamation',
      color: '#dc2626',
    };
  }, [valid, code, billId]);

  // Format so tien (VNPay tra ve x100)
  const displayAmount = amount ? (parseInt(amount, 10) / 100).toLocaleString('vi-VN') : '';

  useEffect(() => {
    document.title = success ? 'Thanh toán thành công' : 'Thanh toán thất bại';
  }, [success]);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #f0fdf4 0%, #dbeafe 100%)',
      padding: 20,
    }}>
      <div style={{
        maxWidth: 460,
        width: '100%',
        background: 'white',
        borderRadius: 16,
        boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
        padding: 40,
        textAlign: 'center',
      }}>
        <div style={{
          width: 90,
          height: 90,
          borderRadius: '50%',
          background: `${color}15`,
          margin: '0 auto 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <i className={`fa-solid ${icon}`} style={{ fontSize: 44, color }} />
        </div>

        <h1 style={{
          fontSize: 24,
          fontWeight: 800,
          color: '#111827',
          marginBottom: 10,
        }}>
          {title}
        </h1>

        <p style={{
          fontSize: 14,
          color: '#6b7280',
          lineHeight: 1.6,
          marginBottom: 24,
        }}>
          {message}
        </p>

        {success && displayAmount && (
          <div style={{
            background: '#f9fafb',
            borderRadius: 10,
            padding: '14px 18px',
            marginBottom: 24,
            textAlign: 'left',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#6b7280', marginBottom: 6 }}>
              <span>Hóa đơn:</span>
              <span style={{ fontWeight: 700, color: '#111827' }}>#{billId}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#6b7280' }}>
              <span>Số tiền:</span>
              <span style={{ fontWeight: 700, color: '#16a34a' }}>{displayAmount}đ</span>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <Link
            to="/dashboard/bills"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '12px 24px',
              background: color,
              color: 'white',
              borderRadius: 10,
              textDecoration: 'none',
              fontWeight: 700,
              fontSize: 14,
            }}
          >
            <i className="fa-solid fa-arrow-left" />
            Về trang hóa đơn
          </Link>
          {!success && code !== '24' && (
            <Link
              to="/dashboard/bills"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '12px 24px',
                background: 'white',
                color: '#6b7280',
                border: '1.5px solid #e5e7eb',
                borderRadius: 10,
                textDecoration: 'none',
                fontWeight: 700,
                fontSize: 14,
              }}
            >
              <i className="fa-solid fa-rotate-right" />
              Thử lại
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
