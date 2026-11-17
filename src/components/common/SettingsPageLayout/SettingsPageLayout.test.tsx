import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import SettingsPageLayout from './SettingsPageLayout';

const strings = {
  aboutTitle: 'About this page',
  breadcrumbLabel: 'Breadcrumb',
  closeLabel: 'Close',
  drawerHint:
    'Tap the i button, or swipe in from the right edge, to open this anytime.',
};
const knowledge = [{ title: 'What it stores', text: 'Your saved chats.' }];

describe('SettingsPageLayout', () => {
  test('desktop: breadcrumb, title with status, knowledge strip, then the cards', () => {
    render(
      <SettingsPageLayout
        title="Vector DB Connection"
        section="BYOK Settings"
        status={<span>Connected</span>}
        knowledge={knowledge}
        strings={strings}
      >
        <p>cards</p>
      </SettingsPageLayout>
    );
    expect(
      screen.getByRole('navigation', { name: 'Breadcrumb' })
    ).toHaveTextContent('BYOK Settings');
    expect(
      screen.getByRole('heading', { level: 1, name: 'Vector DB Connection' })
    ).toBeInTheDocument();
    expect(screen.getByText('Connected')).toBeInTheDocument();
    expect(screen.getByText('What it stores')).toBeInTheDocument();
    expect(screen.getByText('cards')).toBeInTheDocument();
  });

  test('a page without a section shows only its own name in the breadcrumb', () => {
    render(
      <SettingsPageLayout
        title="Developer"
        knowledge={knowledge}
        strings={strings}
      >
        <p>cards</p>
      </SettingsPageLayout>
    );
    const crumbs = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(crumbs).toHaveTextContent(/^Developer$/);
  });

  test('phone: only the cards, knowledge in a drawer that opens and closes', () => {
    const onInfoClose = jest.fn();
    const { rerender } = render(
      <SettingsPageLayout
        title="Vector DB Connection"
        knowledge={knowledge}
        narrow
        strings={strings}
        onInfoClose={onInfoClose}
      >
        <p>cards</p>
      </SettingsPageLayout>
    );
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
    expect(screen.queryByText('What it stores')).not.toBeInTheDocument();

    rerender(
      <SettingsPageLayout
        title="Vector DB Connection"
        knowledge={knowledge}
        narrow
        infoOpen
        strings={strings}
        onInfoClose={onInfoClose}
      >
        <p>cards</p>
      </SettingsPageLayout>
    );
    const drawer = screen.getByRole('dialog', { name: 'About this page' });
    expect(drawer).toHaveTextContent('What it stores');
    expect(drawer).toHaveTextContent('Vector DB Connection');
    expect(drawer).toHaveTextContent(strings.drawerHint);
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onInfoClose).toHaveBeenCalled();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onInfoClose).toHaveBeenCalledTimes(2);
  });
});
