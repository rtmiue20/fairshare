import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  Mail,
  ShieldCheck,
  User,
} from 'lucide-react';
import { useAuth } from './useAuth';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';

function getPasswordStrength(password: string): { label: string; color: string; percent: number } {
  if (!password) return { label: 'Chưa nhập', color: '#cbd5e1', percent: 0 };
  if (password.length < 6) return { label: 'Quá ngắn (< 6 ký tự)', color: '#ef4444', percent: 30 };
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  if (password.length >= 8 && hasLetter && hasNumber) {
    return { label: 'Mạnh', color: '#16a34a', percent: 100 };
  }
  return { label: 'Trung bình', color: '#eab308', percent: 65 };
}

export const RegisterPage: React.FC = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreedTerms, setAgreedTerms] = useState(true);
  const [validationError, setValidationError] = useState<string | null>(null);

  const { register, loading, error, clearError } = useAuth();
  const navigate = useNavigate();

  const strength = getPasswordStrength(password);

  const validateForm = (): boolean => {
    if (fullName.trim().length < 2) {
      setValidationError('Họ và tên phải có ít nhất 2 ký tự.');
      return false;
    }
    const trimmedEmail = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setValidationError('Vui lòng nhập địa chỉ email hợp lệ.');
      return false;
    }
    if (password.length < 6) {
      setValidationError('Mật khẩu phải có tối thiểu 6 ký tự.');
      return false;
    }
    if (confirmPassword && password !== confirmPassword) {
      setValidationError('Mật khẩu xác nhận không khớp.');
      return false;
    }
    if (!agreedTerms) {
      setValidationError('Bạn cần đồng ý với chính sách minh bạch dữ liệu để tiếp tục.');
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
      await register({
        email: email.trim(),
        password,
        fullName: fullName.trim(),
      });
      navigate('/dashboard', { replace: true });
    } catch {
      // Error state is handled in useAuth
    }
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
          maxWidth: '500px',
          width: '100%',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
              color: '#ffffff',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '18px',
              marginBottom: '8px',
              boxShadow: '0 4px 10px rgba(37, 99, 235, 0.25)',
            }}
          >
            FS
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
            FairShare – Tạo tài khoản mới
          </h1>
          <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
            Tham gia nhóm đồ án và theo dõi đóng góp minh bạch theo từng Sprint
          </p>
        </div>

        <Card
          title="Đăng ký tài khoản FairShare"
          style={{
            borderRadius: '16px',
            padding: '28px',
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

          <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div>
              <label
                htmlFor="register-fullname"
                style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: '#334155' }}
              >
                Họ và tên
              </label>
              <div style={{ position: 'relative' }}>
                <User
                  size={16}
                  color="#94a3b8"
                  style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
                />
                <input
                  id="register-fullname"
                  type="text"
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    if (validationError) setValidationError(null);
                  }}
                  placeholder="VD: Nguyễn Phúc Vương"
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
                htmlFor="register-email"
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
                  id="register-email"
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
                htmlFor="register-password"
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
                  id="register-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (validationError) setValidationError(null);
                  }}
                  placeholder="Tối thiểu 6 ký tự"
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

              {password && (
                <div style={{ marginTop: '6px' }}>
                  <div
                    style={{
                      height: '4px',
                      width: '100%',
                      backgroundColor: '#e2e8f0',
                      borderRadius: '999px',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${strength.percent}%`,
                        backgroundColor: strength.color,
                        transition: 'all 0.2s ease',
                      }}
                    />
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '3px' }}>
                    Độ mạnh mật khẩu: <strong style={{ color: strength.color }}>{strength.label}</strong>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label
                htmlFor="register-confirm-password"
                style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: '#334155' }}
              >
                Xác nhận mật khẩu
              </label>
              <div style={{ position: 'relative' }}>
                <CheckCircle2
                  size={16}
                  color="#94a3b8"
                  style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
                />
                <input
                  id="register-confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (validationError) setValidationError(null);
                  }}
                  placeholder="Nhập lại mật khẩu"
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

            <label
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px',
                fontSize: '12px',
                color: '#475569',
                cursor: 'pointer',
                padding: '8px 10px',
                borderRadius: '8px',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
              }}
            >
              <input
                type="checkbox"
                checked={agreedTerms}
                onChange={(e) => setAgreedTerms(e.target.checked)}
                style={{ marginTop: '2px' }}
              />
              <span>
                Tôi đồng ý với <strong>Chính sách minh bạch & đồng thuận dữ liệu (Consent)</strong> của FairShare.
              </span>
            </label>

            <Button type="submit" isLoading={loading} style={{ width: '100%', padding: '10px 16px', marginTop: '4px' }}>
              Đăng ký
            </Button>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                fontSize: '12px',
                color: '#64748b',
              }}
            >
              <ShieldCheck size={14} color="#16a34a" />
              <span>Dữ liệu cá nhân được bảo vệ theo nguyên tắc tối thiểu</span>
            </div>

            <div style={{ textAlign: 'center', fontSize: '14px', marginTop: '4px', color: '#475569' }}>
              Đã có tài khoản?{' '}
              <Link to="/login" style={{ fontWeight: 600, color: '#2563eb' }}>
                Đăng nhập
              </Link>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};
