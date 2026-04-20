/**
 * @vitest-environment jsdom
 */
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SiteHeader } from './SiteHeader';
import { navItems } from '@/lib/site-content';

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', async () => {
  const actual = await vi.importActual('framer-motion');
  return {
    ...actual,
    motion: {
      div: ({ children, className, layoutId }: any) => (
        <div className={className} data-layoutid={layoutId}>{children}</div>
      ),
    },
  };
});

describe('SiteHeader', () => {
  it('renders the logo text correctly', () => {
    render(<SiteHeader activePath="/" />);
    expect(screen.getByText('Доменный светофор')).toBeTruthy();
    expect(screen.getByText('.ai')).toBeTruthy();
  });

  it('renders all navigation items from site-content', () => {
    render(<SiteHeader activePath="/" />);
    navItems.forEach((item) => {
      const links = screen.getAllByText(item.label);
      expect(links.length).toBeGreaterThan(0);
    });
  });

  it('applies active styles to the active path link', () => {
    // /method is one of the navItems
    const { container } = render(<SiteHeader activePath="/method" />);

    // The link uses "relative px-4 py-2 ... text-white bg-white/5" for active
    const activeLink = container.querySelector('nav a[href="#/method"]');
    expect(activeLink).toBeTruthy();
    expect(activeLink?.className).toContain('bg-white/5');

    // The link uses "relative px-4 py-2 ... text-white/50 hover:text-white hover:bg-white/[0.03]" for inactive
    const inactiveLink = container.querySelector('nav a[href="#/"]');
    expect(inactiveLink).toBeTruthy();
    expect(inactiveLink?.className).toContain('text-white/50');
  });

  it('toggles the mobile menu when the menu button is clicked', () => {
    render(<SiteHeader activePath="/" />);

    // Initially closed
    expect(screen.queryByLabelText('Закрыть меню')).toBeNull();

    // There might be multiple buttons matching the label depending on the markup.
    const menuButton = screen.getAllByLabelText('Открыть меню')[0];
    expect(menuButton).toBeTruthy();

    // Click to open
    fireEvent.click(menuButton);
    expect(screen.getAllByLabelText('Закрыть меню')[0]).toBeTruthy();

    // Check if mobile menu is rendered by checking another instance of navItems
    const analyzerButtons = screen.getAllByText('Открыть Анализатор');
    expect(analyzerButtons.length).toBeGreaterThan(1);

    // Click to close
    fireEvent.click(screen.getAllByLabelText('Закрыть меню')[0]);
    expect(screen.getAllByLabelText('Открыть меню')[0]).toBeTruthy();
  });

  it('closes the mobile menu when a navigation link inside it is clicked', () => {
    render(<SiteHeader activePath="/" />);

    const menuButton = screen.getAllByLabelText('Открыть меню')[0];
    fireEvent.click(menuButton);
    expect(screen.getAllByLabelText('Закрыть меню')[0]).toBeTruthy();

    // Find a link in the mobile menu and click it
    // Desktop links and mobile links have the same text, so we get the second one
    const mobileLink = screen.getAllByText('Методика')[1];
    fireEvent.click(mobileLink);

    // Menu should be closed
    expect(screen.getAllByLabelText('Открыть меню')[0]).toBeTruthy();
  });
});
