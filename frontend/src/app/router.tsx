import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { ProtectedRoute } from './ProtectedRoute';
import { LoginPage } from '../features/auth/LoginPage';
import { RegisterPage } from '../features/auth/RegisterPage';
import { ContributionDashboard } from '../features/dashboard/ContributionDashboard';
import { TeamListPage } from '../features/team/TeamListPage';
import { TeamDetailPage } from '../features/team/TeamDetailPage';
import { BoardView } from '../features/board/BoardView';
import { ReviewRoundPage } from '../features/peerreview/ReviewRoundPage';
import { AlertList } from '../features/alerts/AlertList';
import { ProfileSettingsPage } from '../features/profile/ProfileSettingsPage';
import { LandingPage } from '../features/landing/LandingPage';
import { ReportPage } from '../features/report/ReportPage';
import { ManualContributionPage } from '../features/contribution/ManualContributionPage';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/register',
    element: <RegisterPage />,
  },
  {
    path: '/landing',
    element: <LandingPage />,
  },
  {
    path: '/',
    element: <ProtectedRoute />,
    children: [
      {
        index: true,
        // Sau khi login, người dùng vào màn hình Welcome / Landing (có 3D Ribbon & Hero) trước khi bấm vào Dashboard
        element: <LandingPage />,
      },
      {
        element: <AppLayout />,
        children: [
          {
            path: 'dashboard',
            element: <ContributionDashboard />,
          },
          {
            path: 'contributions',
            element: <ContributionDashboard />,
          },
          {
            path: 'dong-gop',
            element: <ContributionDashboard />,
          },
          {
            path: 'teams',
            element: <TeamListPage />,
          },
          {
            path: 'teams/:id',
            element: <TeamDetailPage />,
          },
          {
            path: 'teams/:id/board',
            element: <BoardView />,
          },
          {
            path: 'board',
            element: <BoardView />,
          },
          {
            path: 'peer-review',
            element: <ReviewRoundPage />,
          },
          {
            path: 'alerts',
            element: <AlertList />,
          },
          {
            path: 'report',
            element: <ReportPage />,
          },
          {
            path: 'contributions/manual',
            element: <ManualContributionPage />,
          },
          {
            path: 'profile',
            element: <ProfileSettingsPage />,
          },
        ],
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);
