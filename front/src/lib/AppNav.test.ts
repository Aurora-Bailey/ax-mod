import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import AppNav from './AppNav.svelte';

describe('AppNav', () => {
  it('renders camera and Mongo Word navigation links', () => {
    render(AppNav, {
      props: {
        currentPath: '/mongoword'
      }
    });

    expect(screen.getByRole('link', { name: 'Camera' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'Mongo Word' })).toHaveAttribute(
      'href',
      '/mongoword'
    );
  });
});
