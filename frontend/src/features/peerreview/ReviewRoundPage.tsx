import React, { useState } from 'react';
import { ReviewForm } from './ReviewForm';
import { ReviewResultCard } from './ReviewResultCard';
import { PeerReviewResult, ReviewCriterion } from '../../api/peerReview.api';

interface RevieweeOption {
  id: number;
  name: string;
  role: string;
}

const REVIEWEE_OPTIONS: RevieweeOption[] = [
  { id: 1, name: 'Nguyễn Văn Minh Triều', role: 'Trưởng nhóm' },
  { id: 3, name: 'Nguyễn Phúc Vương', role: 'Kỹ sư Backend & Tích hợp' },
  { id: 4, name: 'Ngô Trọng Phúc', role: 'Phát triển Frontend & Dữ liệu' },
  { id: 5, name: 'Triệu Nguyễn Huỳnh Khang', role: 'Chấm chéo ẩn danh' },
  { id: 6, name: 'Khiếu Hoàng Nam Anh', role: 'Kiểm thử & QA/QC' },
];

export const ReviewRoundPage: React.FC = () => {
  const [selectedReviewee, setSelectedReviewee] = useState<RevieweeOption>(REVIEWEE_OPTIONS[0]);

  const criteria: ReviewCriterion[] = [
    { id: 1, name: 'Tiến độ & khối lượng công việc cam kết', weight: 1.0 },
    { id: 2, name: 'Chất lượng đầu ra kỹ thuật (Clean Code, ít lỗi, tài liệu rõ ràng)', weight: 1.0 },
    { id: 3, name: 'Tinh thần hợp tác, phối hợp & chủ động hỗ trợ đồng đội', weight: 1.0 },
    { id: 4, name: 'Tuân thủ kỷ luật nhóm, cập nhật Trello và Git thường xuyên', weight: 1.0 },
  ];

  const results: PeerReviewResult[] = [
    {
      userId: 2,
      userName: 'Hà Ngọc Thiện (Bạn)',
      averageScore: 4.85,
      submissionCount: 5,
      isAnonymousValid: true,
    },
    {
      userId: 1,
      userName: 'Nguyễn Văn Minh Triều',
      averageScore: 4.90,
      submissionCount: 5,
      isAnonymousValid: true,
    },
    {
      userId: 3,
      userName: 'Nguyễn Phúc Vương',
      averageScore: 4.75,
      submissionCount: 5,
      isAnonymousValid: true,
    },
    {
      userId: 4,
      userName: 'Ngô Trọng Phúc',
      averageScore: 4.70,
      submissionCount: 5,
      isAnonymousValid: true,
    },
    {
      userId: 5,
      userName: 'Triệu Nguyễn Huỳnh Khang',
      averageScore: 4.80,
      submissionCount: 5,
      isAnonymousValid: true,
    },
    {
      userId: 6,
      userName: 'Khiếu Hoàng Nam Anh',
      averageScore: 4.75,
      submissionCount: 5,
      isAnonymousValid: true,
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 600, color: '#f8fafc' }}>
            Chấm chéo ẩn danh thành viên
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '13px', marginTop: '4px' }}>
            Hạn chót: 23:59 03/11/2026 • Bảo vệ dữ liệu cá nhân theo Nghị định 13/2023/NĐ-CP
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '13px', color: '#94a3b8' }}>Đánh giá cho:</span>
          <select
            value={selectedReviewee.id}
            onChange={(e) => {
              const opt = REVIEWEE_OPTIONS.find((o) => o.id === Number(e.target.value));
              if (opt) setSelectedReviewee(opt);
            }}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              backgroundColor: '#0c0d12',
              color: '#f8fafc',
              fontSize: '13px',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            {REVIEWEE_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id} style={{ backgroundColor: '#121318', color: '#f8fafc' }}>
                {opt.name} ({opt.role})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <ReviewForm
          roundId={1}
          revieweeId={selectedReviewee.id}
          revieweeName={selectedReviewee.name}
          criteria={criteria}
          onSuccess={() => alert('Đã ghi nhận đánh giá ẩn danh thành công')}
        />
        <ReviewResultCard results={results} />
      </div>
    </div>
  );
};
