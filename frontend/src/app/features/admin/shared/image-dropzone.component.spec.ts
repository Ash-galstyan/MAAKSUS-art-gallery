// frontend/src/app/features/admin/shared/image-dropzone.component.spec.ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ImageDropzoneComponent } from './image-dropzone.component';
import { I18nService } from '../../../core/i18n/i18n.service';

function makeFile(name: string, type: string, size = 100): File {
  const file = new File([new Uint8Array(size)], name, { type });
  return file;
}

describe('ImageDropzoneComponent', () => {
  let fixture: ComponentFixture<ImageDropzoneComponent>;
  let component: ImageDropzoneComponent;
  let createObjectURLSpy: jasmine.Spy;
  let revokeObjectURLSpy: jasmine.Spy;
  let urlCounter: number;

  beforeEach(() => {
    urlCounter = 0;
    createObjectURLSpy = spyOn(URL, 'createObjectURL').and.callFake(() => `blob:fake-${urlCounter++}`);
    revokeObjectURLSpy = spyOn(URL, 'revokeObjectURL');

    const i18nStub = { locale: signal('en'), t: (k: string) => k } as unknown as I18nService;
    TestBed.configureTestingModule({
      imports: [ImageDropzoneComponent],
      providers: [{ provide: I18nService, useValue: i18nStub }],
    });
    fixture = TestBed.createComponent(ImageDropzoneComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  function inputEvent(files: File[]): Event {
    const input = document.createElement('input');
    Object.defineProperty(input, 'files', { value: files });
    return { target: input } as unknown as Event;
  }

  it('stages a valid file and emits it', () => {
    const emitted: File[][] = [];
    component.filesSelected.subscribe((f) => emitted.push(f));
    const file = makeFile('a.jpg', 'image/jpeg');
    component.onFileInput(inputEvent([file]));
    expect(component.staged().length).toBe(1);
    expect(component.staged()[0].file).toBe(file);
    expect(component.error()).toBeNull();
    expect(emitted).toEqual([[file]]);
  });

  it('rejects an unsupported MIME type with an error message and no staging', () => {
    const file = makeFile('a.gif', 'image/gif');
    component.onFileInput(inputEvent([file]));
    expect(component.staged()).toEqual([]);
    expect(component.error()).toContain('Unsupported file type');
    expect(createObjectURLSpy).not.toHaveBeenCalled();
  });

  it('rejects a file larger than maxBytes', () => {
    fixture.componentRef.setInput('maxBytes', 10);
    const file = makeFile('big.jpg', 'image/jpeg', 100);
    component.onFileInput(inputEvent([file]));
    expect(component.staged()).toEqual([]);
    expect(component.error()).toContain('too large');
  });

  it('clears the input value after handling the change event', () => {
    const input = document.createElement('input');
    Object.defineProperty(input, 'files', { value: [makeFile('a.jpg', 'image/jpeg')] });
    input.value = 'C:\\fakepath\\a.jpg';
    component.onFileInput({ target: input } as unknown as Event);
    expect(input.value).toBe('');
  });

  it('appends to staged files across multiple selections in multiple mode', () => {
    component.onFileInput(inputEvent([makeFile('a.jpg', 'image/jpeg')]));
    component.onFileInput(inputEvent([makeFile('b.png', 'image/png')]));
    expect(component.staged().length).toBe(2);
  });

  it('replaces the staged file and revokes the previous URL in single mode', () => {
    fixture.componentRef.setInput('multiple', false);
    component.onFileInput(inputEvent([makeFile('a.jpg', 'image/jpeg')]));
    const firstUrl = component.staged()[0].previewUrl;
    component.onFileInput(inputEvent([makeFile('b.jpg', 'image/jpeg')]));
    expect(component.staged().length).toBe(1);
    expect(component.staged()[0].file.name).toBe('b.jpg');
    expect(revokeObjectURLSpy).toHaveBeenCalledWith(firstUrl);
  });

  it('accepts only the valid files from a mixed batch and reports the last error', () => {
    component.onFileInput(
      inputEvent([makeFile('good.jpg', 'image/jpeg'), makeFile('bad.gif', 'image/gif')]),
    );
    expect(component.staged().length).toBe(1);
    expect(component.error()).toContain('bad.gif');
  });

  it('does nothing when the file list is empty', () => {
    component.onFileInput(inputEvent([]));
    expect(component.staged()).toEqual([]);
    expect(component.error()).toBeNull();
  });

  describe('drag and drop', () => {
    it('onDragOver sets isDragging true and prevents default', () => {
      const ev = jasmine.createSpyObj<DragEvent>('DragEvent', ['preventDefault']);
      component.onDragOver(ev);
      expect(component.isDragging()).toBeTrue();
      expect(ev.preventDefault).toHaveBeenCalled();
    });

    it('onDragLeave sets isDragging false', () => {
      component.isDragging.set(true);
      const ev = jasmine.createSpyObj<DragEvent>('DragEvent', ['preventDefault']);
      component.onDragLeave(ev);
      expect(component.isDragging()).toBeFalse();
    });

    it('onDrop accepts dropped files and resets isDragging', () => {
      component.isDragging.set(true);
      const file = makeFile('a.jpg', 'image/jpeg');
      const ev = {
        preventDefault: jasmine.createSpy('preventDefault'),
        dataTransfer: { files: [file] },
      } as unknown as DragEvent;
      component.onDrop(ev);
      expect(component.isDragging()).toBeFalse();
      expect(component.staged().length).toBe(1);
    });
  });

  describe('removeAt', () => {
    it('revokes the URL, removes the item, and re-emits', () => {
      component.onFileInput(inputEvent([makeFile('a.jpg', 'image/jpeg'), makeFile('b.jpg', 'image/jpeg')]));
      const urlToRevoke = component.staged()[0].previewUrl;
      const emitted: File[][] = [];
      component.filesSelected.subscribe((f) => emitted.push(f));

      component.removeAt(0);

      expect(component.staged().length).toBe(1);
      expect(component.staged()[0].file.name).toBe('b.jpg');
      expect(revokeObjectURLSpy).toHaveBeenCalledWith(urlToRevoke);
      expect(emitted[emitted.length - 1]).toEqual([component.staged()[0].file]);
    });

    it('is a no-op for an out-of-range index', () => {
      component.onFileInput(inputEvent([makeFile('a.jpg', 'image/jpeg')]));
      component.removeAt(5);
      expect(component.staged().length).toBe(1);
    });
  });

  it('reset() clears staged files, revokes URLs, and clears the error', () => {
    component.onFileInput(inputEvent([makeFile('bad.gif', 'image/gif')])); // sets an error
    component.onFileInput(inputEvent([makeFile('a.jpg', 'image/jpeg')]));
    const url = component.staged()[0].previewUrl;
    component.reset();
    expect(component.staged()).toEqual([]);
    expect(component.error()).toBeNull();
    expect(revokeObjectURLSpy).toHaveBeenCalledWith(url);
  });

  it('openFilePicker() clicks the hidden file input', () => {
    const clickSpy = spyOn(component.fileInput().nativeElement, 'click');
    component.openFilePicker();
    expect(clickSpy).toHaveBeenCalled();
  });

  it('revokes all staged preview URLs on destroy', () => {
    component.onFileInput(inputEvent([makeFile('a.jpg', 'image/jpeg'), makeFile('b.jpg', 'image/jpeg')]));
    const urls = component.staged().map((s) => s.previewUrl);
    fixture.destroy();
    for (const url of urls) {
      expect(revokeObjectURLSpy).toHaveBeenCalledWith(url);
    }
  });
});
