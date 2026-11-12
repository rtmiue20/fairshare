import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  AlertCircle,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Moon,
  Sun,
  User,
} from 'lucide-react';
import { useAuth } from './useAuth';
import { Button } from '../../components/ui/Button';
import { LandingRibbon } from '../landing/LandingRibbon';
import { FairShareLogo } from '../../components/ui/FairShareLogo';

function getPasswordStrength(password: string): { label: string; color: string; percent: number } {
  if (!password) return { label: 'Chưa nhập', color: 'var(--fg3)', percent: 0 };
  if (password.length < 6) return { label: 'Quá ngắn (< 6 ký tự)', color: 'var(--bad)', percent: 30 };
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  if (password.length >= 8 && hasLetter && hasNumber) {
    return { label: 'Mạnh', color: 'var(--ok)', percent: 100 };
  }
  return { label: 'Trung bình', color: 'var(--warn)', percent: 65 };
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

  useEffect(() => {
    document.title = 'Đăng Ký Tài Khoản · FairShare';
  }, []);

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
      setValidationError('Mật khẩu phải có ít nhất 6 ký tự.');
      return false;
    }
    if (password !== confirmPassword && confirmPassword) {
      setValidationError('Mật khẩu xác nhận không khớp.');
      return false;
    }
    if (!agreedTerms) {
      setValidationError('Bạn cần đồng ý với Chính sách bảo vệ dữ liệu để tiếp tục.');
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
      // Mặc định chuyển sang trang chủ Welcome / Landing theo mẫu UI
      navigate('/', { replace: true });
    } catch {
      // Error state is handled in useAuth
    }
  };

  const toggleTheme = () => {
    const r = document.documentElement;
    const cur = r.dataset.theme || ((typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: light)').matches) ? 'light' : 'dark');
    const next = cur === 'dark' ? 'light' : 'dark';
    r.dataset.theme = next;
    localStorage.setItem('fs-theme', next);
  };

  const isLight = document.documentElement.dataset.theme === 'light';
  const displayError = validationError || error;

  return (
    <div
      className="relative min-h-screen w-full flex flex-col justify-between overflow-x-hidden"
      style={{
        background:
          'radial-gradient(70% 60% at 68% 38%, color-mix(in srgb, var(--rb2) 14%, transparent), transparent 70%), radial-gradient(50% 50% at 12% 90%, color-mix(in srgb, var(--rb1) 12%, transparent), transparent 70%)',
        backgroundColor: 'var(--bg)',
        color: 'var(--fg)',
        fontFamily: 'var(--f-body)',
      }}
    >
      {/* 3D Helix Ribbon Canvas in the background */}
      <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 0 }}>
        <LandingRibbon scrollProgress={0} />
      </div>

      {/* Top minimal header bar */}
      <header
        className="relative z-10 w-full flex items-center justify-between px-6 sm:px-12 py-4"
        style={{
          borderBottom: '1px solid var(--line)',
          background: 'var(--glass)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
        }}
      >
        <Link to="/" className="brand flex items-center no-underline text-inherit" aria-label="FairShare, về trang chủ">
          <FairShareLogo size={24} />
        </Link>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleTheme}
            className="icon-btn p-2 rounded-full border border-[var(--line)] bg-[var(--surface)] text-[var(--fg)] hover:opacity-80 transition cursor-pointer flex items-center justify-center"
            aria-label="Đổi giao diện sáng/tối"
          >
            {isLight ? <Moon size={16} /> : <Sun size={16} />}
          </button>
          <Link
            to="/login"
            className="btn ghost sm text-xs font-semibold px-4 py-1.5 rounded-full border border-[var(--line)] text-[var(--fg)] hover:bg-[var(--surface2)] transition no-underline"
          >
            Đăng nhập
          </Link>
        </div>
      </header>

      {/* Main Register Workspace */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <div
            className="rounded-3xl p-6 sm:p-8 transition-all"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--line)',
              boxShadow: '0 24px 48px -12px rgba(0, 0, 0, 0.12)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
            }}
          >
            <div className="mb-6">
              <h2
                className="text-xl sm:text-2xl font-bold tracking-tight"
                style={{ color: 'var(--fg)', fontFamily: 'var(--f-body)' }}
              >
                Đăng ký tài khoản FairShare
              </h2>
              <p className="text-xs sm:text-sm mt-1" style={{ color: 'var(--fg3)' }}>
                Đăng ký để bắt đầu đo lường đóng góp đồ án nhóm
              </p>
            </div>

            {displayError && (
              <div
                role="alert"
                className="flex items-center gap-2 p-3 rounded-xl mb-4 text-xs font-medium"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--bad) 10%, transparent)',
                  border: '1px solid color-mix(in srgb, var(--bad) 25%, transparent)',
                  color: 'var(--bad)',
                }}
              >
                <AlertCircle size={15} style={{ flexShrink: 0 }} />
                <span>{displayError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
              <div>
                <label
                  htmlFor="register-fullname"
                  className="block mb-1.5 text-xs font-semibold"
                  style={{ color: 'var(--fg2)' }}
                >
                  Họ và tên
                </label>
                <div className="relative">
                  <User
                    size={15}
                    style={{
                      position: 'absolute',
                      left: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--fg3)',
                    }}
                  />
                  <input
                    id="register-fullname"
                    type="text"
                    value={fullName}
                    onChange={(e) => {
                      setFullName(e.target.value);
                      if (validationError) setValidationError(null);
                    }}
                    placeholder="Nguyễn Văn A"
                    required
                    className="w-full text-xs sm:text-sm rounded-xl py-2.5 pl-9 pr-3 outline-none transition"
                    style={{
                      background: 'var(--surface2)',
                      border: '1px solid var(--line)',
                      color: 'var(--fg)',
                    }}
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="register-email"
                  className="block mb-1.5 text-xs font-semibold"
                  style={{ color: 'var(--fg2)' }}
                >
                  Email
                </label>
                <div className="relative">
                  <Mail
                    size={15}
                    style={{
                      position: 'absolute',
                      left: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--fg3)',
                    }}
                  />
                  <input
                    id="register-email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (validationError) setValidationError(null);
                    }}
                    placeholder="email@example.com"
                    required
                    className="w-full text-xs sm:text-sm rounded-xl py-2.5 pl-9 pr-3 outline-none transition"
                    style={{
                      background: 'var(--surface2)',
                      border: '1px solid var(--line)',
                      color: 'var(--fg)',
                    }}
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="register-password"
                  className="block mb-1.5 text-xs font-semibold"
                  style={{ color: 'var(--fg2)' }}
                >
                  Mật khẩu
                </label>
                <div className="relative">
                  <Lock
                    size={15}
                    style={{
                      position: 'absolute',
                      left: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--fg3)',
                    }}
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
                    className="w-full text-xs sm:text-sm rounded-xl py-2.5 pl-9 pr-9 outline-none transition"
                    style={{
                      background: 'var(--surface2)',
                      border: '1px solid var(--line)',
                      color: 'var(--fg)',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 bg-transparent border-0 cursor-pointer"
                    style={{ color: 'var(--fg3)' }}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>

                {password && (
                  <div className="mt-2 flex items-center justify-between text-[11px]">
                    <span style={{ color: strength.color }}>Độ mạnh: {strength.label}</span>
                    <div className="w-24 h-1.5 rounded-full overflow-hidden bg-[var(--surface2)]">
                      <div
                        className="h-full transition-all duration-300"
                        style={{ width: `${strength.percent}%`, backgroundColor: strength.color }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label
                  htmlFor="register-confirm-password"
                  className="block mb-1.5 text-xs font-semibold"
                  style={{ color: 'var(--fg2)' }}
                >
                  Xác nhận mật khẩu
                </label>
                <div className="relative">
                  <Lock
                    size={15}
                    style={{
                      position: 'absolute',
                      left: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--fg3)',
                    }}
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
                    required
                    className="w-full text-xs sm:text-sm rounded-xl py-2.5 pl-9 pr-9 outline-none transition"
                    style={{
                      background: 'var(--surface2)',
                      border: '1px solid var(--line)',
                      color: 'var(--fg)',
                    }}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs pt-1">
                <input
                  type="checkbox"
                  checked={agreedTerms}
                  onChange={(e) => setAgreedTerms(e.target.checked)}
                  className="rounded"
                />
                <span style={{ color: 'var(--fg2)' }}>
                  Đồng ý với chính sách đồng thuận dữ liệu
                </span>
              </div>

              <Button
                type="submit"
                isLoading={loading}
                className="w-full py-2.5 mt-2"
              >
                Đăng ký
              </Button>

              <div className="text-center text-xs mt-2" style={{ color: 'var(--fg2)' }}>
                Đã có tài khoản?{' '}
                <Link
                  to="/login"
                  className="font-semibold underline ml-1"
                  style={{ color: 'var(--fg)' }}
                >
                  Đăng nhập
                </Link>
              </div>
            </form>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer
        className="relative z-10 w-full py-4 px-6 text-center text-xs"
        style={{
          borderTop: '1px solid var(--line)',
          background: 'var(--glass)',
          color: 'var(--fg3)',
          fontFamily: 'var(--f-mono)',
        }}
      >
        <span>FairShare · Nền tảng đo lường đóng góp đồ án nhóm</span>
      </footer>
    </div>
  );
};
