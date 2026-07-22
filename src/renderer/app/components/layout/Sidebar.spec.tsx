import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import { ThemeProvider } from '@mui/material';
import { cdPalette, cdTheme } from '@renderer/theme';
import { createI18n } from '@renderer/i18n';
import { useShellStore } from '@renderer/app/store/shell-store';
import { Sidebar } from './Sidebar';

const i18n = createI18n('es');
const LIME_RGB = 'rgb(175, 252, 65)';

function renderSidebar(path = '/project/p1/crm/objects') {
  return render(
    <I18nextProvider i18n={i18n}>
      <ThemeProvider theme={cdTheme}>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path="/project/:projectId/*" element={<Sidebar />} />
          </Routes>
        </MemoryRouter>
      </ThemeProvider>
    </I18nextProvider>,
  );
}

beforeEach(async () => {
  await i18n.changeLanguage('es');
  useShellStore.setState({ sidebarCollapsed: false });
});

describe('Sidebar', () => {
  it('marca con aria-current el item de la ruta activa', () => {
    const { container } = renderSidebar('/project/p1/crm/objects');
    const active = container.querySelector('[aria-current="page"]');
    expect(active).toBeTruthy();
    expect(active).toHaveTextContent(i18n.t('sidebar.objects'));
  });

  it('aplica noWrap a los labels para truncar con elipsis en vez de cortarlos', () => {
    const { container } = renderSidebar();
    expect(container.querySelector('.MuiTypography-noWrap')).toBeTruthy();
  });

  it('el indicador de selección no usa el verde lima (marca CD)', () => {
    const { container } = renderSidebar('/project/p1/crm/objects');
    const active = container.querySelector('[aria-current="page"]') as HTMLElement;
    expect(getComputedStyle(active).borderLeftColor).not.toBe(LIME_RGB);
    expect(cdPalette.accent.toUpperCase()).toBe('#AFFC41');
  });

  it('conserva el label completo en el DOM aunque sea largo (catalán)', async () => {
    await i18n.changeLanguage('ca');
    renderSidebar();
    expect(screen.getByText(i18n.t('sidebar.objects'))).toBeInTheDocument();
  });
});
