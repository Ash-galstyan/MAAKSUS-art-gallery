// frontend/src/app/shared/directives/intersection.directive.ts
/**
 * IntersectionObserver wrapper that emits when the host element enters the
 * viewport. Used by the gallery as the infinite-scroll sentinel.
 *
 * Inputs:
 *   threshold       - intersection ratio threshold (default 0.1)
 *   rootMargin      - same as IntersectionObserver's rootMargin
 * Outputs:
 *   visible         - emits once per "becomes visible" transition
 *
 * Cleans up its observer on destroy.
 */
import {
  Directive,
  ElementRef,
  OnDestroy,
  OnInit,
  inject,
  input,
  output,
} from '@angular/core';

@Directive({
  selector: '[appOnVisible]',
  standalone: true,
})
export class OnVisibleDirective implements OnInit, OnDestroy {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly threshold = input(0.1);
  readonly rootMargin = input('200px');
  readonly visible = output<void>();

  private observer: IntersectionObserver | null = null;

  ngOnInit(): void {
    this.observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) this.visible.emit();
        }
      },
      { threshold: this.threshold(), rootMargin: this.rootMargin() },
    );
    this.observer.observe(this.host.nativeElement);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    this.observer = null;
  }
}
