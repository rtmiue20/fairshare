import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from './useAuth';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';

export const RegisterPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const { register, loading, error } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await register({ email, password, fullName });
      navigate('/dashboard');
    } catch {
      // Error handled in useAuth
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '80px auto', padding: '0 16px' }}>
      <Card title="Đăng ký tài khoản FairShare">
        {error && (
          <div style={{ color: '#dc2626', marginBottom: '16px', fontSize: '14px' }}>
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px' }}>Họ và tên</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px' }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px' }}>Mật khẩu</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
            />
          </div>
          <Button type="submit" isLoading={loading} style={{ width: '100%', marginTop: '8px' }}>
            Đăng ký
          </Button>
          <div style={{ textAlign: 'center', fontSize: '14px', marginTop: '12px' }}>
            Đã có tài khoản? <Link to="/login">Đăng nhập</Link>
          </div>
        </form>
      </Card>
    </div>
  );
};
