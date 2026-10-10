import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Team } from '../../types/team';
import { teamApi } from '../../api/team.api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { Spinner } from '../../components/ui/Spinner';

export const TeamListPage: React.FC = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    teamApi.getTeams()
      .then((res) => {
        if (res.data) setTeams(res.data);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
        <Spinner size="large" />
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 600 }}>Danh sách nhóm đồ án</h2>
        <Button>+ Tạo nhóm mới</Button>
      </div>

      {teams.length === 0 ? (
        <EmptyState
          title="Chưa tham gia nhóm nào"
          description="Tạo nhóm mới hoặc nhờ nhóm trưởng gửi mã mời tham gia."
          action={<Button>+ Tạo nhóm mới</Button>}
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
          {teams.map((t) => (
            <Card key={t.id} title={t.name} subtitle={t.courseName}>
              <p style={{ fontSize: '14px', color: '#475569', marginBottom: '16px' }}>
                {t.description || 'Không có mô tả'}
              </p>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Link to={`/teams/${t.id}`}>
                  <Button variant="outline">Xem chi tiết</Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
