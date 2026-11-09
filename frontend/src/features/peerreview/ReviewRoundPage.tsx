import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { teamApi } from '../../api/team.api';
import {
  peerReviewApi,
  ReviewRound,
  ReviewSprint,
  ReviewTeamMember,
} from '../../api/peerReview.api';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Team } from '../../types/team';
import { useAuthStore } from '../../store/authStore';
import { ReviewForm } from './ReviewForm';

function getErrorMessage(error: unknown): string {
  if (
    typeof error === 'object'
    && error !== null
    && 'response' in error
    && typeof error.response === 'object'
    && error.response !== null
    && 'data' in error.response
    && typeof error.response.data === 'object'
    && error.response.data !== null
    && 'message' in error.response.data
    && typeof error.response.data.message === 'string'
  ) {
    return error.response.data.message;
  }
  if (error instanceof Error) return error.message;
  return 'Không thể tải dữ liệu chấm chéo. Vui lòng thử lại.';
}

export const ReviewRoundPage: React.FC = () => {
  const currentUser = useAuthStore((state) => state.user);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<number>();
  const [rounds, setRounds] = useState<ReviewRound[]>([]);
  const [members, setMembers] = useState<ReviewTeamMember[]>([]);
  const [sprints, setSprints] = useState<ReviewSprint[]>([]);
  const [selectedRoundId, setSelectedRoundId] = useState<number>();
  const [selectedRevieweeId, setSelectedRevieweeId] = useState<number>();
  const [roundName, setRoundName] = useState('');
  const [selectedSprintId, setSelectedSprintId] = useState<number>();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [notice, setNotice] = useState('');

  const selectedTeam = teams.find((team) => team.id === selectedTeamId);
  const selectedRound = rounds.find((round) => round.id === selectedRoundId);
  const reviewees = useMemo(
    () => members.filter((member) => member.userId !== currentUser?.id),
    [members, currentUser?.id],
  );
  const canManageRounds = selectedTeam?.currentRole === 'LEADER';

  const refreshTeamData = useCallback(async (teamId: number) => {
    setLoading(true);
    setErrorMessage('');
    try {
      const [roundResponse, memberResponse, sprintResponse] = await Promise.all([
        peerReviewApi.getRoundsByTeam(teamId),
        peerReviewApi.getMembers(teamId),
        peerReviewApi.getSprints(teamId),
      ]);
      const nextRounds = roundResponse.data ?? [];
      const nextSprints = sprintResponse.data ?? [];
      setRounds(nextRounds);
      setMembers(memberResponse.data ?? []);
      setSprints(nextSprints);
      setSelectedSprintId((previous) => (
        nextSprints.some((sprint) => sprint.id === previous)
          ? previous
          : nextSprints[0]?.id
      ));
      setSelectedRoundId((previous) => (
        nextRounds.some((round) => round.id === previous)
          ? previous
          : nextRounds.find((round) => round.status === 'OPEN')?.id ?? nextRounds[0]?.id
      ));
    } catch (error: unknown) {
      setRounds([]);
      setMembers([]);
      setSprints([]);
      setErrorMessage(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    teamApi.getTeams()
      .then((response) => {
        if (!active) return;
        const availableTeams = response.data ?? [];
        setTeams(availableTeams);
        setSelectedTeamId((previous) => (
          availableTeams.some((team) => team.id === previous)
            ? previous
            : availableTeams[0]?.id
        ));
      })
      .catch((error: unknown) => {
        if (active) setErrorMessage(getErrorMessage(error));
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (selectedTeamId === undefined) {
      setRounds([]);
      setMembers([]);
      setSprints([]);
      return;
    }
    void refreshTeamData(selectedTeamId);
  }, [selectedTeamId, refreshTeamData]);

  useEffect(() => {
    if (!reviewees.some((member) => member.userId === selectedRevieweeId)) {
      setSelectedRevieweeId(reviewees[0]?.userId);
    }
  }, [reviewees, selectedRevieweeId]);

  const handleCreateRound = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (selectedSprintId === undefined || !roundName.trim()) {
      setErrorMessage('Vui lòng nhập tên đợt và chọn sprint.');
      return;
    }
    setSaving(true);
    setErrorMessage('');
    setNotice('');
    try {
      const response = await peerReviewApi.createRound(selectedSprintId, { name: roundName.trim() });
      setRoundName('');
      setSelectedRoundId(response.data?.id);
      setNotice('Đã tạo đợt chấm chéo ở trạng thái nháp.');
      if (selectedTeamId !== undefined) await refreshTeamData(selectedTeamId);
    } catch (error: unknown) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const handleRoundAction = async (action: 'open' | 'close') => {
    if (!selectedRound) return;
    setSaving(true);
    setErrorMessage('');
    setNotice('');
    try {
      if (action === 'open') await peerReviewApi.openRound(selectedRound.id);
      else await peerReviewApi.closeRound(selectedRound.id);
      setNotice(action === 'open' ? 'Đã mở đợt chấm chéo.' : 'Đã đóng đợt chấm chéo.');
      if (selectedTeamId !== undefined) await refreshTeamData(selectedTeamId);
    } catch (error: unknown) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h2 style={{ fontSize: '24px', fontWeight: 600, color: '#f8fafc' }}>
          Chấm chéo thành viên
        </h2>
        <p style={{ color: '#94a3b8', fontSize: '13px', marginTop: '4px' }}>
          Chọn đợt đang mở, đánh giá từng thành viên theo tiêu chí từ 1 đến 5.
        </p>
      </div>

      {errorMessage && <p role="alert" style={{ color: '#f87171', fontSize: '13px' }}>{errorMessage}</p>}
      {notice && <p role="status" style={{ color: '#34d399', fontSize: '13px' }}>{notice}</p>}

      <Card title="Chọn nhóm và đợt chấm">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'end' }}>
          <label style={{ display: 'grid', gap: '6px', color: '#cbd5e1', fontSize: '13px' }}>
            Nhóm
            <select
              aria-label="Nhóm"
              value={selectedTeamId ?? ''}
              onChange={(event) => {
                setSelectedTeamId(Number(event.target.value) || undefined);
                setSelectedRoundId(undefined);
                setNotice('');
              }}
            >
              <option value="">Chọn nhóm</option>
              {teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
            </select>
          </label>

          <label style={{ display: 'grid', gap: '6px', color: '#cbd5e1', fontSize: '13px' }}>
            Đợt chấm
            <select
              aria-label="Đợt chấm"
              value={selectedRoundId ?? ''}
              onChange={(event) => setSelectedRoundId(Number(event.target.value) || undefined)}
              disabled={!rounds.length}
            >
              <option value="">Chọn đợt chấm</option>
              {rounds.map((round) => (
                <option key={round.id} value={round.id}>
                  {round.name} · {round.status}
                </option>
              ))}
            </select>
          </label>
          {loading && <span role="status" style={{ color: '#94a3b8', fontSize: '13px' }}>Đang tải...</span>}
        </div>

        {canManageRounds && sprints.length > 0 && (
          <form
            onSubmit={handleCreateRound}
            style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '16px' }}
          >
            <input
              aria-label="Tên đợt chấm"
              value={roundName}
              onChange={(event) => setRoundName(event.target.value)}
              maxLength={255}
              placeholder="Tên đợt chấm"
              required
            />
            <select
              aria-label="Sprint"
              value={selectedSprintId ?? sprints[0]?.id ?? ''}
              onChange={(event) => setSelectedSprintId(Number(event.target.value) || undefined)}
            >
              {sprints.map((sprint) => (
                <option key={sprint.id} value={sprint.id}>{sprint.name}</option>
              ))}
            </select>
            <Button type="submit" isLoading={saving}>Tạo đợt nháp</Button>
          </form>
        )}

        {canManageRounds && selectedRound && (
          <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
            {selectedRound.status === 'DRAFT' && (
              <Button type="button" isLoading={saving} onClick={() => void handleRoundAction('open')}>
                Mở đợt chấm
              </Button>
            )}
            {selectedRound.status === 'OPEN' && (
              <Button type="button" variant="danger" isLoading={saving} onClick={() => void handleRoundAction('close')}>
                Đóng đợt chấm
              </Button>
            )}
          </div>
        )}
      </Card>

      {selectedRound?.status === 'OPEN' && selectedRevieweeId !== undefined && (
        <div style={{ maxWidth: '720px' }}>
          <label style={{ display: 'grid', gap: '6px', maxWidth: '360px', marginBottom: '16px', color: '#cbd5e1', fontSize: '13px' }}>
            Đánh giá cho
            <select
              aria-label="Thành viên cần đánh giá"
              value={selectedRevieweeId}
              onChange={(event) => setSelectedRevieweeId(Number(event.target.value))}
            >
              {reviewees.map((member) => (
                <option key={member.userId} value={member.userId}>{member.fullName}</option>
              ))}
            </select>
          </label>
          <ReviewForm
            key={`${selectedRound.id}-${selectedRevieweeId}`}
            roundId={selectedRound.id}
            revieweeId={selectedRevieweeId}
            revieweeName={reviewees.find((member) => member.userId === selectedRevieweeId)?.fullName ?? ''}
            onSuccess={() => setNotice('Đánh giá của bạn đã được lưu.')}
          />
        </div>
      )}

      {selectedRound && selectedRound.status !== 'OPEN' && (
        <p style={{ color: '#fbbf24', fontSize: '13px' }}>
          {selectedRound.status === 'DRAFT'
            ? 'Đợt này đang ở trạng thái nháp, chưa nhận đánh giá.'
            : 'Đợt chấm đã đóng, không thể gửi thêm đánh giá.'}
        </p>
      )}
      {selectedRound?.status === 'OPEN' && reviewees.length === 0 && (
        <p style={{ color: '#94a3b8', fontSize: '13px' }}>
          Nhóm chưa có thành viên khác để đánh giá.
        </p>
      )}
    </div>
  );
};
