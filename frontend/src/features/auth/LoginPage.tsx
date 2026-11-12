import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Moon,
  Sparkles,
  Sun,
} from 'lucide-react';
import { useAuth } from './useAuth';
import { Button } from '../../components/ui/Button';
import { LandingRibbon } from '../landing/LandingRibbon';
import { FairShareLogo } from '../../components/ui/FairShareLogo';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [validationError, setValidationError] = useState<string | null>(null);

  const { login, loginDemo, loading, error, clearError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Mặc định sau khi login chuyển sang '/' (Welcome / Landing stage theo mẫu UI) chứ chưa vào dashboard
  const redirectPath =
    (location.state as { from?: { pathname?: string } } | null)?.from?.pathname || '/';

  useEffect(() => {
    document.title = 'Đăng Nhập · FairShare';
  }, []);

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

  const handleQuickDemo = async () => {
    clearError();
    setValidationError(null);
    try {
      await loginDemo();
      navigate('/', { replace: true });
    } catch {
      navigate('/', { replace: true });
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

      {/* Top minimal header bar matching FairShare UI */}
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
            title="Đổi giao diện sáng/tối"
          >
            {isLight ? <Moon size={16} /> : <Sun size={16} />}
          </button>
          <Link
            to="/register"
            className="btn ghost sm text-xs font-semibold px-4 py-1.5 rounded-full border border-[var(--line)] text-[var(--fg)] hover:bg-[var(--surface2)] transition no-underline"
          >
            Đăng ký
          </Link>
        </div>
      </header>

      {/* Main Login Workspace */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-10 sm:px-8">
        <div
          className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center"
        >
          {/* Left Hero Overview */}
          <div className="lg:col-span-7 flex flex-col gap-6 text-left">
            <span
              className="eyebrow"
              style={{
                font: '500 11px/1 var(--f-mono)',
                textTransform: 'uppercase',
                letterSpacing: '0.14em',
                color: 'var(--fg3)',
              }}
            >
              Dành cho đồ án nhóm
            </span>

            <h1
              className="h-xl font-light text-3xl sm:text-4xl lg:text-5xl tracking-tight leading-tight"
              style={{ color: 'var(--fg)', fontFamily: 'var(--f-body)' }}
            >
              Chia điểm{' '}
              <em
                className="it"
                style={{
                  fontFamily: 'var(--f-serif)',
                  fontStyle: 'italic',
                  color: 'var(--ital)',
                }}
              >
                công bằng
              </em>
              , dựa trên bằng chứng.
            </h1>

            <p
              className="lede text-sm sm:text-base leading-relaxed"
              style={{ color: 'var(--fg2)', maxWidth: '520px' }}
            >
              FairShare tự ghi nhận ai làm gì, bao nhiêu, khi nào, từ Trello và Google Docs. Giải quyết triệt để tình trạng free-rider bằng dữ liệu hoạt động thực tế.
            </p>

            <div className="flex flex-col gap-3 text-xs sm:text-sm" style={{ color: 'var(--fg)' }}>
              {[
                'Tự động đồng bộ thẻ công việc hoàn thành từ Trello & Docs',
                'Minh chứng truy vết chi tiết từng thành viên theo Sprint',
                'Chấm chéo ẩn danh chuẩn hóa đa chiều (Output, Reliability, Peer)',
              ].map((feat) => (
                <div key={feat} className="flex items-center gap-2.5">
                  <CheckCircle2 size={16} style={{ color: 'var(--ok)', flexShrink: 0 }} />
                  <span>{feat}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Card: Login Form */}
          <div className="lg:col-span-5 w-full">
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
                  Đăng nhập FairShare
                </h2>
                <p className="text-xs sm:text-sm mt-1" style={{ color: 'var(--fg3)' }}>
                  Nhập thông tin tài khoản của bạn để tiếp tục
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
                    htmlFor="login-email"
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
                      id="login-email"
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
                    htmlFor="login-password"
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
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (validationError) setValidationError(null);
                      }}
                      placeholder="Nhập mật khẩu (tối thiểu 6 ký tự)"
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
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <label className="flex items-center gap-2 cursor-pointer" style={{ color: 'var(--fg2)' }}>
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="rounded"
                    />
                    <span>Ghi nhớ đăng nhập</span>
                  </label>
                  <span style={{ color: 'var(--accent)', fontSize: '11px', fontWeight: 500 }}>
                    Hỗ trợ tài khoản sinh viên
                  </span>
                </div>

                <Button
                  type="submit"
                  isLoading={loading}
                  className="w-full py-2.5 mt-2"
                >
                  Đăng nhập
                </Button>

                <div className="relative text-center my-1">
                  <span
                    className="px-3 text-[11px]"
                    style={{
                      color: 'var(--fg3)',
                      background: 'var(--surface)',
                    }}
                  >
                    hoặc trải nghiệm nhanh
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleQuickDemo}
                  className="w-full py-2 px-3 rounded-full text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer"
                  style={{
                    border: '1px dashed var(--line)',
                    background: 'var(--surface2)',
                    color: 'var(--fg)',
                  }}
                >
                  <Sparkles size={14} style={{ color: 'var(--accent)' }} />
                  <span>Khám phá ngay bằng Tài khoản Demo</span>
                </button>

                <div className="text-center text-xs mt-2" style={{ color: 'var(--fg2)' }}>
                  Chưa có tài khoản?{' '}
                  <Link
                    to="/register"
                    className="font-semibold underline ml-1"
                    style={{ color: 'var(--fg)' }}
                  >
                    Đăng ký ngay
                  </Link>
                </div>
              </form>
            </div>
          </div>
        </div>
      </main>

      {/* Modern footer */}
      <footer
        className="relative z-10 w-full py-4 px-6 text-center text-xs"
        style={{
          borderTop: '1px solid var(--line)',
          background: 'var(--glass)',
          color: 'var(--fg3)',
          fontFamily: 'var(--f-mono)',
        }}
      >
        <span>FairShare · Nền tảng đo lường đóng góp đồ án nhóm · Tuân thủ NĐ 13/2023/NĐ-CP</span>
      </footer>
    </div>
  );
};
