import React, { useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { teamApi } from '../../api/team.api';

export interface ConsentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  teamId: number;
  onSuccess: () => void;
}

export const ConsentDialog: React.FC<ConsentDialogProps> = ({
  isOpen,
  onClose,
  teamId,
  onSuccess,
}) => {
  const [shareTrello, setShareTrello] = useState(true);
  const [shareDocs, setShareDocs] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    try {
      setLoading(true);
      await teamApi.submitConsent(teamId, {
        consented: true,
        shareTrelloActivity: shareTrello,
        shareDocsActivity: shareDocs,
      });
      onSuccess();
      onClose();
    } catch {
      alert('Không thể lưu xác nhận chia sẻ dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Đồng ý chia sẻ dữ liệu (Consent)">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <p style={{ fontSize: '14px', color: '#475569', lineHeight: 1.6 }}>
          Theo chính sách bảo mật của FairShare và Nghị định 13/2023/NĐ-CP, hệ thống chỉ thu thập dữ liệu hoạt động tối thiểu để tính toán tỷ lệ đóng góp khi có sự đồng ý của bạn.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
            <input
              type="checkbox"
              checked={shareTrello}
              onChange={(e) => setShareTrello(e.target.checked)}
            />
            Đồng ý chia sẻ hoạt động Trello (các task hoàn thành)
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
            <input
              type="checkbox"
              checked={shareDocs}
              onChange={(e) => setShareDocs(e.target.checked)}
            />
            Đồng ý chia sẻ số lần chỉnh sửa tài liệu Google Docs
          </label>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Hủy
          </Button>
          <Button onClick={handleSubmit} isLoading={loading}>
            Xác nhận đồng ý
          </Button>
        </div>
      </div>
    </Modal>
  );
};
