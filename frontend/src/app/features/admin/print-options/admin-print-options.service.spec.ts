// frontend/src/app/features/admin/print-options/admin-print-options.service.spec.ts
import { TestBed } from '@angular/core/testing';
import {
  AdminPrintOptionsService,
  type AdminFrameOption,
  type AdminFrameOptionInput,
  type AdminPrintSize,
  type AdminPrintSizeInput,
} from './admin-print-options.service';
import { ApiService } from '../../../core/http/api.service';

describe('AdminPrintOptionsService', () => {
  let service: AdminPrintOptionsService;
  let api: jasmine.SpyObj<ApiService>;

  const size: AdminPrintSize = {
    id: 's1',
    code: 'M',
    widthCm: 40,
    heightCm: 30,
    priceMultiplier: 1.5,
    isActive: true,
    position: 0,
    translations: [{ locale: 'EN', label: 'Medium' }],
  };

  const frame: AdminFrameOption = {
    id: 'f1',
    code: 'WOOD',
    frameType: 'WOOD',
    colorHex: '#6b4423',
    additionalPrice: 5000,
    isActive: true,
    position: 0,
    translations: [{ locale: 'EN', label: 'Wood' }],
  };

  beforeEach(() => {
    api = jasmine.createSpyObj<ApiService>('ApiService', ['get', 'post', 'patch', 'del']);
    TestBed.configureTestingModule({ providers: [{ provide: ApiService, useValue: api }] });
    service = TestBed.inject(AdminPrintOptionsService);
  });

  describe('sizes', () => {
    it('listSizes() GETs /print-options/sizes/admin', async () => {
      api.get.and.returnValue(Promise.resolve([size]));
      const result = await service.listSizes();
      expect(api.get).toHaveBeenCalledWith('/print-options/sizes/admin');
      expect(result).toEqual([size]);
    });

    it('createSize() POSTs to /print-options/sizes', async () => {
      const input: AdminPrintSizeInput = {
        code: 'M',
        widthCm: 40,
        heightCm: 30,
        priceMultiplier: 1.5,
        translations: [{ locale: 'EN', label: 'Medium' }],
      };
      api.post.and.returnValue(Promise.resolve(size));
      await service.createSize(input);
      expect(api.post).toHaveBeenCalledWith('/print-options/sizes', input);
    });

    it('updateSize() PATCHes /print-options/sizes/:id', async () => {
      api.patch.and.returnValue(Promise.resolve(size));
      await service.updateSize('s1', { isActive: false });
      expect(api.patch).toHaveBeenCalledWith('/print-options/sizes/s1', { isActive: false });
    });

    it('removeSize() DELETEs /print-options/sizes/:id', async () => {
      api.del.and.returnValue(Promise.resolve());
      await service.removeSize('s1');
      expect(api.del).toHaveBeenCalledWith('/print-options/sizes/s1');
    });
  });

  describe('frames', () => {
    it('listFrames() GETs /print-options/frames/admin', async () => {
      api.get.and.returnValue(Promise.resolve([frame]));
      const result = await service.listFrames();
      expect(api.get).toHaveBeenCalledWith('/print-options/frames/admin');
      expect(result).toEqual([frame]);
    });

    it('createFrame() POSTs to /print-options/frames', async () => {
      const input: AdminFrameOptionInput = {
        code: 'WOOD',
        frameType: 'WOOD',
        colorHex: '#6b4423',
        additionalPrice: 5000,
        translations: [{ locale: 'EN', label: 'Wood' }],
      };
      api.post.and.returnValue(Promise.resolve(frame));
      await service.createFrame(input);
      expect(api.post).toHaveBeenCalledWith('/print-options/frames', input);
    });

    it('updateFrame() PATCHes /print-options/frames/:id', async () => {
      api.patch.and.returnValue(Promise.resolve(frame));
      await service.updateFrame('f1', { additionalPrice: 6000 });
      expect(api.patch).toHaveBeenCalledWith('/print-options/frames/f1', { additionalPrice: 6000 });
    });

    it('removeFrame() DELETEs /print-options/frames/:id', async () => {
      api.del.and.returnValue(Promise.resolve());
      await service.removeFrame('f1');
      expect(api.del).toHaveBeenCalledWith('/print-options/frames/f1');
    });
  });
});
