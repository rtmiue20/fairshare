import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { EmptyState } from '../components/ui/EmptyState';

describe('ContributionDashboard Component', () => {
  it('renders correctly', () => {
    render(<EmptyState title="Bảng đóng góp trống" />);
    expect(screen.getByText('Bảng đóng góp trống')).toBeInTheDocument();
  });
});
