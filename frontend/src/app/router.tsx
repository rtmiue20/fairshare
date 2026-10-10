import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { ProtectedRoute } from './ProtectedRoute';
import { LoginPage } from '../features/auth/LoginPage';
import { RegisterPage } from '../features/auth/RegisterPage';
import { ContributionDashboard } from '../features/dashboard/ContributionDashboard';
import { TeamListPage } from '../features/team/TeamListPage';
import { TeamDetailPage } from '../features/team/TeamDetailPage';
import { ConnectTrelloPage } from '../features/integration/ConnectTrelloPage';
import { ReviewRoundPage } from '../features/peerreview/ReviewRoundPage';
import { AlertList } from '../features/alerts/AlertList';

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
    path: '/',
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          {
            index: true,
            element: <Navigate to="/dashboard" replace />,
          },
          {
            path: 'dashboard',
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
            path: 'integration',
            element: <ConnectTrelloPage />,
          },
          {
            path: 'peer-review',
            element: <ReviewRoundPage />,
          },
          {
            path: 'alerts',
            element: <AlertList />,
          },
        ],
      },
    ],
  },
]);
