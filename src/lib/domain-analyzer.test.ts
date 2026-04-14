import { describe, it, expect } from 'vitest';
import { analyzeDomainInput, isIpAddress } from './domain-analyzer';

describe('domain-analyzer', () => {
  it('isIpAddress should correctly validate IP addresses', () => {
    expect(isIpAddress('192.168.1.1')).toBe(true);
    expect(isIpAddress('0.0.0.0')).toBe(true);
    expect(isIpAddress('255.255.255.255')).toBe(true);

    // Invalid ranges
    expect(isIpAddress('999.999.999.999')).toBe(false);
    expect(isIpAddress('256.256.256.256')).toBe(false);

    // Invalid formats
    expect(isIpAddress('1.2.3')).toBe(false);
    expect(isIpAddress('1.2.3.4.5')).toBe(false);
    expect(isIpAddress('not.an.ip')).toBe(false);
  });

  it('should return low risk for official domains', () => {
    const result = analyzeDomainInput('cert.by');
    expect(result.verdict).toBe('low');
    expect(result.reasons.some(r => r.title === 'Совпадение с официальным доменом')).toBe(true);
  });

  it('should detect legitimate whitelist domains', () => {
    const result = analyzeDomainInput('discord.gg');
    // For 'discord.gg', it has a critical TLD? No, .gg isn't in critical but it's not .by.
    // Let's check reasons.
    expect(result.reasons.some(r => r.title === 'Легитимный домен из whitelist')).toBe(true);
  });

  it('should detect typosquatting for protected brands', () => {
    const result = analyzeDomainInput('sberbank-login.ru');
    expect(result.verdict).toBe('high');
    expect(result.reasons.some(r => r.title.includes('бренд'))).toBe(true);
  });

  it('should detect phishing prefixes', () => {
    const result = analyzeDomainInput('free-steam-nitro.ru');
    expect(result.verdict).toBe('high');
    expect(result.reasons.some(r => r.title === 'Подозрительный префикс')).toBe(true);
  });

  it('should handle URL shorteners', () => {
    const result = analyzeDomainInput('bit.ly/123456');
    expect(result.verdict).toBe('medium');
    expect(result.reasons.some(r => r.title === 'Сокращённая ссылка')).toBe(true);
  });

  it('should return error for invalid input', () => {
    const result = analyzeDomainInput('invalid-domain');
    expect(result.verdict).toBe('medium'); // As fallback for invalid
    expect(result.summary).toBe('Нужен домен с точкой, например `portal.example`.');
  });

  it('should detect punycode and homoglyphs', () => {
    // 'a' and 'e' are cyrillic here, which turns into punycode when parsed by URL constructor
    const result = analyzeDomainInput('stеаmcommunity.com');
    expect(result.verdict).toBe('high');
    expect(result.reasons.some(r => r.title.includes('Punycode-маскировка'))).toBe(true);
    expect(result.reasons.some(r => r.title.includes('Смешение письменностей'))).toBe(true);
  });

  it('should detect mixed scripts when cyrillic characters are inserted into a latin domain', () => {
    // The 'а' in pаypal is Cyrillic, triggering a mixed script warning before Punycode conversion.
    const result = analyzeDomainInput('pаypal.com');
    expect(result.verdict).toBe('high');
    expect(result.reasons.some(r => r.title.includes('Смешение письменностей'))).toBe(true);
  });

  it('should detect IP addresses', () => {
      const result = analyzeDomainInput('http://192.168.1.1/login');
      expect(result.reasons.some(r => r.title === 'Прямой IP-адрес')).toBe(true);
  });
});
