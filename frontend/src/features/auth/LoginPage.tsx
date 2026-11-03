import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { useAuth } from './useAuth';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [validationError, setValidationError] = useState<string | null>(null);

  const { login, loginDemo, loading, error, clearError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const redirectPath =
    (location.state as { from?: { pathname?: string } } | null)?.from?.pathname || '/dashboard';

  const validateForm = (): boolean => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setValidationError('Vui lòng nhập địa chỉ email của bạn.');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setValidationError('Địa chỉ email không đúng định dạng.');
      return false;
    }
    if (!password) {
      setValidationError('Vui lòng nhập mật khẩu.');
      return false;
    }
    if (password.length < 6) {
      setValidationError('Mật khẩu phải có ít nhất 6 ký tự.');
      return false;
    }
    setValidationError(null);
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    if (!validateForm()) return;

    try {
      await login({ email: email.trim(), password });
      navigate(redirectPath, { replace: true });
    } catch {
      // Error state is handled by useAuth
    }
  };

  const handleQuickDemo = () => {
    clearError();
    setValidationError(null);
    loginDemo();
    navigate('/dashboard', { replace: true });
  };

  const displayError = validationError || error;

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #eff6ff 0%, #f8fafc 50%, #e0f2fe 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 16px',
      }}
    >
      <div
        style={{
          maxWidth: '940px',
          width: '100%',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: '28px',
          alignItems: 'stretch',
        }}
      >
        {/* Left column: Brand & Feature Highlights */}
        <div
          style={{
            background: 'linear-gradient(145deg, #1e40af 0%, #2563eb 60%, #1d4ed8 100%)',
            borderRadius: '16px',
            padding: '36px 32px',
            color: '#ffffff',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: '0 10px 25px -5px rgba(37, 99, 235, 0.35)',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '18px',
                }}
              >
                FS
              </div>
              <div>
                <div style={{ fontSize: '20px', fontWeight: 700, letterSpacing: '-0.3px' }}>
                  FairShare
                </div>
                <div style={{ fontSize: '12px', color: '#bfdbfe' }}>
                  UEH – Quản lý dự án CNTT
                </div>
              </div>
            </div>

            <h1 style={{ fontSize: '26px', fontWeight: 700, lineHeight: 1.3, marginBottom: '14px' }}>
              Đo lường & minh bạch hóa mức đóng góp đồ án nhóm
            </h1>

            <p style={{ fontSize: '14px', color: '#dbeafe', lineHeight: 1.6, marginBottom: '28px' }}>
              Giải quyết triệt để tình trạng free-rider bằng dữ liệu hoạt động thực tế từ Trello và đánh giá đồng đẳng ẩn danh.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {[
                'Tự động đồng bộ thẻ công việc hoàn thành từ Trello',
                'Truy vết bằng chứng đóng góp chi tiết cho từng thành viên',
                'Chấm chéo ẩn danh cuối mỗi Sprint (ngưỡng an toàn ≥ 3 lượt)',
              ].map((feature) => (
                <div key={feature} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
                  <CheckCircle2 size={17} color="#86efac" style={{ flexShrink: 0 }} />
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              marginTop: '32px',
              paddingTop: '16px',
              borderTop: '1px solid rgba(255, 255, 255, 0.2)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '12px',
              color: '#bfdbfe',
            }}
          >
            <ShieldCheck size={16} />
            <span>Tuân thủ chính sách đồng thuận dữ liệu (Consent Policy)</span>
          </div>
        </div>

        {/* Right column: Login Form */}
        <Card
          title="Đăng nhập FairShare"
          subtitle="Nhập thông tin tài khoản của bạn để truy cập bảng đóng góp"
          style={{
            borderRadius: '16px',
            padding: '32px 28px',
            boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.08)',
          }}
        >
          {displayError && (
            <div
              role="alert"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 12px',
                borderRadius: '8px',
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#dc2626',
                marginBottom: '16px',
                fontSize: '13px',
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{displayError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label
                htmlFor="login-email"
                style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: '#334155' }}
              >
                Email
              </label>
              <div style={{ position: 'relative' }}>
                <Mail
                  size={16}
                  color="#94a3b8"
                  style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
                />
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (validationError) setValidationError(null);
                  }}
                  placeholder="phucvuong.31241025017@st.ueh.edu.vn"
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px 10px 38px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '14px',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="login-password"
                style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: '#334155' }}
              >
                Mật khẩu
              </label>
              <div style={{ position: 'relative' }}>
                <Lock
                  size={16}
                  color="#94a3b8"
                  style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
                />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (validationError) setValidationError(null);
                  }}
                  placeholder="Nhập mật khẩu (tối thiểu 6 ký tự)"
                  required
                  style={{
                    width: '100%',
                    padding: '10px 38px 10px 38px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '14px',
                    outline: 'none',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#64748b',
                    padding: '4px',
                    display: 'inline-flex',
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '13px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#475569', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span>Ghi nhớ đăng nhập</span>
              </label>
              <span style={{ color: '#2563eb', fontSize: '12px', fontWeight: 500 }}>
                Hỗ trợ tài khoản sinh viên UEH
              </span>
            </div>

            <Button type="submit" isLoading={loading} style={{ width: '100%', padding: '10px 16px', marginTop: '4px' }}>
              Đăng nhập
            </Button>

            <div style={{ position: 'relative', textAlign: 'center', margin: '4px 0' }}>
              <span style={{ fontSize: '12px', color: '#94a3b8' }}>hoặc trải nghiệm nhanh</span>
            </div>

            <button
              type="button"
              onClick={handleQuickDemo}
              style={{
                width: '100%',
                padding: '9px 14px',
                borderRadius: '8px',
                border: '1px dashed #93c5fd',
                backgroundColor: '#eff6ff',
                color: '#1d4ed8',
                fontSize: '13px',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: 'pointer',
              }}
            >
              <Sparkles size={15} />
              <span>Vào nhanh bằng Tài khoản Demo (M1 – Phúc Vương)</span>
            </button>

            <div style={{ textAlign: 'center', fontSize: '14px', marginTop: '8px', color: '#475569' }}>
              Chưa có tài khoản?{' '}
              <Link to="/register" style={{ fontWeight: 600, color: '#2563eb' }}>
                Đăng ký ngay
              </Link>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};
