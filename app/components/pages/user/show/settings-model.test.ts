import { describe, expect, it } from 'vitest';

import { accountStatus, formatDate, securityTip, settingsSections, userInitial } from '@/app/components/pages/user/show/settings-model';

describe('accountStatus', () => {
  it('sinaliza o 2FA desativado como atenção e leva para a segurança', () => {
    const [twoFactor] = accountStatus({ totpEnabled: false, showValues: true, periodicSummaryEnabled: false });
    expect(twoFactor).toMatchObject({ value: 'Desativada', tone: 'attention', section: 'security' });
  });

  it('mostra o 2FA ativado como ok', () => {
    expect(accountStatus({ totpEnabled: true, showValues: true, periodicSummaryEnabled: true })[0]).toMatchObject({ value: 'Ativada', tone: 'ok' });
  });

  it('descreve valores e resumo semanal', () => {
    const items = accountStatus({ totpEnabled: true, showValues: false, periodicSummaryEnabled: true });
    expect(items.map((item) => item.value)).toEqual(['Ativada', 'Ocultos', 'Ativado']);
    expect(items[1].section).toBe('preferences');
  });
});

describe('securityTip', () => {
  it('só aparece sem 2FA', () => {
    expect(securityTip({ totpEnabled: true })).toBeNull();
    expect(securityTip({ totpEnabled: false })?.section).toBe('security');
  });
});

describe('helpers', () => {
  it('usa a inicial do nome, ou U sem nome', () => {
    expect(userInitial(' felipe')).toBe('F');
    expect(userInitial('   ')).toBe('U');
  });

  it('formata datas e tolera inválidas', () => {
    expect(formatDate('2026-10-23T12:00:00Z')).toMatch(/\d{2}\/\d{2}\/2026/);
    expect(formatDate('nada')).toBe('—');
  });

  it('mantém a zona de risco por último e marcada como perigosa', () => {
    const last = settingsSections[settingsSections.length - 1];
    expect(last).toMatchObject({ id: 'risk', danger: true });
    expect(new Set(settingsSections.map((section) => section.id)).size).toBe(settingsSections.length);
  });
});
