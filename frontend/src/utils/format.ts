export function formatPercent(value: number): string {
  if (isNaN(value)) return '0%';
  return `${(value * 100).toFixed(1)}%`;
}

export function formatScore(value: number): string {
  if (isNaN(value)) return '0.0';
  return value.toFixed(1);
}

const AVATAR_GRADIENTS = [
  'linear-gradient(135deg, #6366f1, #4f46e5)',
  'linear-gradient(135deg, #06b6d4, #0891b2)',
  'linear-gradient(135deg, #10b981, #059669)',
  'linear-gradient(135deg, #f59e0b, #d97706)',
  'linear-gradient(135deg, #ec4899, #db2777)',
  'linear-gradient(135deg, #8b5cf6, #7c3aed)',
  'linear-gradient(135deg, #3b82f6, #1d4ed8)',
  'linear-gradient(135deg, #14b8a6, #0d9488)',
];

/**
 * Tạo chữ viết tắt thông minh cho tên tiếng Việt (bỏ phần chức danh trong ngoặc nếu có).
 * VD: "Nguyễn Hoàng Nam (Trưởng nhóm)" -> "HN"
 */
export function getMemberInitials(name?: string): string {
  if (!name) return 'FS';
  const clean = name.replace(/\s*\([^)]*\)/g, '').trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'FS';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[parts.length - 2][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Tạo màu nền gradient nhất quán theo tên thành viên.
 */
export function getMemberAvatarGradient(name?: string): string {
  if (!name) return AVATAR_GRADIENTS[0];
  const clean = name.replace(/\s*\([^)]*\)/g, '').trim();
  let hash = 0;
  for (let i = 0; i < clean.length; i++) {
    hash = clean.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
}
