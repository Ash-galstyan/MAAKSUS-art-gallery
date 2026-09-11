// frontend/src/app/shared/directives/intersection.directive.spec.ts
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OnVisibleDirective } from './intersection.directive';

class FakeIntersectionObserver {
  static instances: FakeIntersectionObserver[] = [];
  callback: IntersectionObserverCallback;
  options: IntersectionObserverInit | undefined;
  observed: Element[] = [];
  disconnected = false;

  constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
    this.callback = callback;
    this.options = options;
    FakeIntersectionObserver.instances.push(this);
  }
  observe(el: Element) {
    this.observed.push(el);
  }
  unobserve() {}
  disconnect() {
    this.disconnected = true;
  }
  takeRecords() {
    return [];
  }
  root = null;
  rootMargin = '';
  thresholds: ReadonlyArray<number> = [];
}

@Component({
  standalone: true,
  imports: [OnVisibleDirective],
  template: `<div appOnVisible [threshold]="threshold" [rootMargin]="rootMargin" (visible)="onVisible()"></div>`,
})
class HostComponent {
  threshold = 0.5;
  rootMargin = '10px';
  visibleCount = 0;
  onVisible() {
    this.visibleCount++;
  }
}

describe('OnVisibleDirective', () => {
  let fixture: ComponentFixture<HostComponent>;
  let originalIO: typeof IntersectionObserver;

  beforeEach(() => {
    originalIO = window.IntersectionObserver;
    FakeIntersectionObserver.instances = [];
    (window as unknown as { IntersectionObserver: unknown }).IntersectionObserver = FakeIntersectionObserver;
    TestBed.configureTestingModule({ imports: [HostComponent] });
    fixture = TestBed.createComponent(HostComponent);
  });

  afterEach(() => {
    window.IntersectionObserver = originalIO;
  });

  it('observes the host element with the given threshold/rootMargin inputs', () => {
    fixture.detectChanges();
    const instance = FakeIntersectionObserver.instances[0];
    expect(instance.options).toEqual({ threshold: 0.5, rootMargin: '10px' });
    expect(instance.observed.length).toBe(1);
  });

  it('emits `visible` once per intersecting entry', () => {
    fixture.detectChanges();
    const instance = FakeIntersectionObserver.instances[0];
    instance.callback(
      [{ isIntersecting: true } as IntersectionObserverEntry],
      instance as unknown as IntersectionObserver,
    );
    expect(fixture.componentInstance.visibleCount).toBe(1);
  });

  it('does not emit for non-intersecting entries', () => {
    fixture.detectChanges();
    const instance = FakeIntersectionObserver.instances[0];
    instance.callback(
      [{ isIntersecting: false } as IntersectionObserverEntry],
      instance as unknown as IntersectionObserver,
    );
    expect(fixture.componentInstance.visibleCount).toBe(0);
  });

  it('emits once per intersecting entry when multiple entries arrive', () => {
    fixture.detectChanges();
    const instance = FakeIntersectionObserver.instances[0];
    instance.callback(
      [
        { isIntersecting: true } as IntersectionObserverEntry,
        { isIntersecting: false } as IntersectionObserverEntry,
        { isIntersecting: true } as IntersectionObserverEntry,
      ],
      instance as unknown as IntersectionObserver,
    );
    expect(fixture.componentInstance.visibleCount).toBe(2);
  });

  it('disconnects the observer on destroy', () => {
    fixture.detectChanges();
    const instance = FakeIntersectionObserver.instances[0];
    fixture.destroy();
    expect(instance.disconnected).toBeTrue();
  });

  it('defaults threshold to 0.1 and rootMargin to 200px when inputs are unset', () => {
    @Component({
      standalone: true,
      imports: [OnVisibleDirective],
      template: `<div appOnVisible></div>`,
    })
    class DefaultsHost {}

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ imports: [DefaultsHost] });
    const f = TestBed.createComponent(DefaultsHost);
    f.detectChanges();
    const instance = FakeIntersectionObserver.instances[FakeIntersectionObserver.instances.length - 1];
    expect(instance.options).toEqual({ threshold: 0.1, rootMargin: '200px' });
  });
});
