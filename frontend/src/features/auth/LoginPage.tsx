import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import {
  AlertCircle,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Moon,
  Sparkles,
  Sun,
  Layers,
  Cpu,
  ShieldCheck,
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
  const [isLight, setIsLight] = useState(() =>
    typeof document !== 'undefined' ? document.documentElement.dataset.theme === 'light' : false
  );

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
    setIsLight(next === 'light');
  };

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
        className="relative z-10 w-full flex items-center justify-between px-4 sm:px-12 py-3 sm:py-4"
        style={{
          borderBottom: '1px solid var(--line)',
          background: 'var(--glass)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
        }}
      >
        <Link to="/" className="brand flex items-center no-underline text-inherit" aria-label="FairShare, về trang chủ">
          <FairShareLogo size={22} textClassName="hidden min-[360px]:inline-block" />
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
      <main className="relative z-10 flex-1 flex items-center justify-center px-3.5 py-6 sm:py-10 sm:px-8">
        <div
          className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 lg:gap-12 items-center"
        >
          {/* Left Hero Overview */}
          <div className="order-2 lg:order-1 lg:col-span-7 flex flex-col gap-5 sm:gap-6 text-left">
            <div className="flex items-center gap-2">
              <span
                className="eyebrow inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold tracking-wider uppercase backdrop-blur-md"
                style={{
                  fontFamily: 'var(--f-mono)',
                  color: '#38bdf8',
                  background: 'rgba(56, 189, 248, 0.08)',
                  border: '1px solid rgba(56, 189, 248, 0.25)',
                  boxShadow: '0 0 16px rgba(56, 189, 248, 0.12)',
                }}
              >
                <Sparkles size={12} className="text-cyan-400" />
                Nền tảng đo lường đóng góp đồ án nhóm
              </span>
            </div>

            <h1
              className="h-xl font-light text-3xl sm:text-4xl lg:text-5xl tracking-tight leading-[1.18]"
              style={{ color: 'var(--fg)', fontFamily: 'var(--f-body)' }}
            >
              Chia điểm{' '}
              <span
                className="it font-normal italic text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-indigo-300 to-purple-400"
                style={{
                  fontFamily: 'var(--f-serif)',
                }}
              >
                công bằng
              </span>
              , dựa trên bằng chứng.
            </h1>

            <p
              className="lede text-sm sm:text-base leading-relaxed"
              style={{ color: 'var(--fg2)', maxWidth: '530px' }}
            >
              FairShare tự động ghi nhận ai làm gì, bao nhiêu, khi nào thông qua Phân hệ Task Board nội bộ, Git commits và khai báo minh chứng có duyệt chéo. Loại bỏ triệt để tình trạng free-rider bằng dữ liệu thực tế và mô hình toán học 4 tầng minh bạch.
            </p>

            <div className="flex flex-col gap-3 mt-1" style={{ maxWidth: '530px' }}>
              {[
                {
                  icon: Layers,
                  title: 'Task Board nội bộ & Truy vết tự động',
                  desc: 'Ghi nhận sự kiện thời gian thực từ Board Kanban, commits Git và đóng góp thủ công có duyệt chéo.',
                  accent: {
                    gradient: 'linear-gradient(135deg, rgba(56, 189, 248, 0.2), rgba(59, 130, 246, 0.25))',
                    border: 'rgba(56, 189, 248, 0.4)',
                    color: '#38bdf8',
                    shadow: '0 0 16px rgba(56, 189, 248, 0.25)',
                  },
                },
                {
                  icon: Cpu,
                  title: 'Mô hình toán học 4 tầng chống gian lận',
                  desc: 'Chuẩn hóa Robust z-score triệt tiêu chia nhỏ task, bù trừ khả dụng a_i và phát hiện bất thường.',
                  accent: {
                    gradient: 'linear-gradient(135deg, rgba(168, 85, 247, 0.2), rgba(99, 102, 241, 0.25))',
                    border: 'rgba(168, 85, 247, 0.4)',
                    color: '#c084fc',
                    shadow: '0 0 16px rgba(168, 85, 247, 0.25)',
                  },
                },
                {
                  icon: ShieldCheck,
                  title: 'Chấm chéo ẩn danh đa chiều D1–D4',
                  desc: 'Tổng hợp khách quan 4 trục: Sản lượng (D1), Tin cậy (D2), Phối hợp (D3) và Đánh giá đồng đội (D4).',
                  accent: {
                    gradient: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(20, 184, 166, 0.25))',
                    border: 'rgba(16, 185, 129, 0.4)',
                    color: '#34d399',
                    shadow: '0 0 16px rgba(16, 185, 129, 0.25)',
                  },
                },
              ].map((feat, idx) => {
                const IconComponent = feat.icon;
                return (
                  <div
                    key={idx}
                    className="group flex items-start gap-3.5 p-3 rounded-2xl transition-all duration-200"
                    style={{
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                      e.currentTarget.style.borderColor = feat.accent.border;
                      e.currentTarget.style.transform = 'translateX(4px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.06)';
                      e.currentTarget.style.transform = 'translateX(0)';
                    }}
                  >
                    {/* Aesthetic Glowing Badge */}
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-110"
                      style={{
                        background: feat.accent.gradient,
                        border: `1px solid ${feat.accent.border}`,
                        boxShadow: feat.accent.shadow,
                        color: feat.accent.color,
                      }}
                    >
                      <IconComponent size={18} strokeWidth={2.2} />
                    </div>

                    {/* Text Details */}
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span
                        className="text-xs sm:text-sm font-semibold tracking-tight"
                        style={{ color: 'var(--fg, #ffffff)' }}
                      >
                        {feat.title}
                      </span>
                      <span
                        className="text-[11px] sm:text-xs leading-relaxed"
                        style={{ color: 'var(--fg3, #94a3b8)' }}
                      >
                        {feat.desc}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Card: Login Form */}
          <div className="order-1 lg:order-2 lg:col-span-5 w-full">
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

                <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-1">
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
