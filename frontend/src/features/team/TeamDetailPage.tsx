import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Team } from '../../types/team';
import { teamApi } from '../../api/team.api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { MemberTable } from './MemberTable';
import { ConsentDialog } from './ConsentDialog';
import { Spinner } from '../../components/ui/Spinner';

export const TeamDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [isConsentOpen, setIsConsentOpen] = useState(false);

  const fetchTeam = () => {
    if (!id) return;
    setLoading(true);
    teamApi.getTeamById(Number(id))
      .then((res) => {
        if (res.data) setTeam(res.data);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTeam();
  }, [id]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
        <Spinner size="large" />
      </div>
    );
  }

  if (!team) {
    return <div>Không tìm thấy thông tin nhóm</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 600 }}>{team.name}</h2>
          <p style={{ color: '#64748b', fontSize: '14px' }}>{team.courseName}</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <Button variant="outline" onClick={() => setIsConsentOpen(true)}>
            Cài đặt chia sẻ dữ liệu (Consent)
          </Button>
          <Button>+ Mời thành viên</Button>
        </div>
      </div>

      <Card title="Danh sách thành viên">
        <MemberTable members={team.members || []} />
      </Card>

      {team && (
        <ConsentDialog
          isOpen={isConsentOpen}
          onClose={() => setIsConsentOpen(false)}
          teamId={team.id}
          onSuccess={fetchTeam}
        />
      )}
    </div>
  );
};
