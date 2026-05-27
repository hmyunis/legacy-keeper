import { describe, it, expect, vi } from 'vitest';
import { downloadArtifact } from './files';

describe('downloadArtifact', () => {
  it('fetches and triggers download', async () => {
    const fakeBlob = new Blob(['ok'], { type: 'text/plain' });
    const mockResponse = { blob: vi.fn().mockResolvedValue(fakeBlob) } as any;
    global.fetch = vi.fn().mockResolvedValue(mockResponse) as any;

    const create = document.createElement.bind(document);
    const clicks: string[] = [];
    // mock createElement to capture the link
    const spyCreate = vi.spyOn(document, 'createElement').mockImplementation((tagName: any) => {
      const el: any = create(tagName);
      if (tagName === 'a') {
        el.click = () => clicks.push('clicked');
      }
      return el;
    });

    const createObj = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob://1');
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined as any);

    await downloadArtifact('/x', 'file.txt');

    expect(global.fetch).toHaveBeenCalledWith('/x');
    expect(createObj).toHaveBeenCalled();
    expect(clicks).toEqual(['clicked']);
    spyCreate.mockRestore();
    createObj.mockRestore();
    revoke.mockRestore();
  });
});
