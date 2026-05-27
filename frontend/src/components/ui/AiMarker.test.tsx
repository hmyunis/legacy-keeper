import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AiMarker } from './AiMarker';

describe('AiMarker', () => {
  it('renders default label and compact state', () => {
    render(<AiMarker compact />);
    expect(screen.getByLabelText('AI-generated content')).toBeInTheDocument();
  });

  it('renders custom label and text in non-compact mode', () => {
    render(<AiMarker label="AI caption" />);
    expect(screen.getByLabelText('AI caption')).toBeInTheDocument();
    expect(screen.getByText('AI')).toBeInTheDocument();
  });
});
