import { describe, expect, it } from 'vitest';

import { detectAttachmentMime, safeAttachmentFilename } from '@/app/lib/transactions/attachment-domain';

const pad = (head: number[]) => new Uint8Array([...head, ...new Array(16).fill(0)]);

describe('detectAttachmentMime', () => {
  it('reconhece JPEG, PNG, WebP e PDF pelos bytes', () => {
    expect(detectAttachmentMime(pad([0xff, 0xd8, 0xff, 0xe0]))).toBe('image/jpeg');
    expect(detectAttachmentMime(pad([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe('image/png');
    expect(detectAttachmentMime(new Uint8Array([0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x45, 0x42, 0x50, 0]))).toBe('image/webp');
    expect(detectAttachmentMime(pad([0x25, 0x50, 0x44, 0x46, 0x2d]))).toBe('application/pdf');
  });

  it('recusa o resto, inclusive HTML/SVG/executável com extensão enganosa e arquivos curtos demais', () => {
    expect(detectAttachmentMime(new TextEncoder().encode('<html><script>alert(1)</script></html>'))).toBeNull();
    expect(detectAttachmentMime(new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"></svg>'))).toBeNull();
    expect(detectAttachmentMime(pad([0x4d, 0x5a]))).toBeNull();
    // RIFF que não é WebP (ex.: WAV).
    expect(detectAttachmentMime(new Uint8Array([0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x41, 0x56, 0x45, 0]))).toBeNull();
    expect(detectAttachmentMime(new Uint8Array([0xff, 0xd8, 0xff]))).toBeNull();
  });
});

describe('safeAttachmentFilename', () => {
  it('tira caminho e caracteres perigosos e põe a extensão do tipo real', () => {
    expect(safeAttachmentFilename('C:\\Users\\eu\\nota fiscal.PNG', 'image/jpeg')).toBe('nota fiscal.jpg');
    expect(safeAttachmentFilename('../../etc/passwd', 'application/pdf')).toBe('passwd.pdf');
    expect(safeAttachmentFilename('a"b<c>d.pdf', 'application/pdf')).toBe('abcd.pdf');
    expect(safeAttachmentFilename('', 'image/webp')).toBe('comprovante.webp');
    expect(safeAttachmentFilename(null, 'image/png')).toBe('comprovante.png');
    expect(safeAttachmentFilename('x'.repeat(300) + '.jpg', 'image/jpeg').length).toBeLessThanOrEqual(104);
  });
});
