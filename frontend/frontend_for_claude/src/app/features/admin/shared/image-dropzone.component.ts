// frontend/src/app/features/admin/shared/image-dropzone.component.ts
/**
 * Drag-and-drop image picker. Accepts JPEG/PNG/WebP, validates client-side
 * before emitting, and shows a thumbnail preview of staged files.
 *
 * Design choices:
 *   - Single component handles both DnD and click-to-select. There's no
 *     value in offering two visually distinct flows; one zone, both inputs.
 *   - Preview thumbnails are created with URL.createObjectURL — cheaper
 *     than reading the file twice (once for preview, once for upload).
 *     We revoke them when the component is destroyed.
 *   - The component STAGES files locally and emits via filesSelected; it
 *     doesn't perform the upload itself. The parent (admin artworks dialog)
 *     handles the actual HTTP request. That keeps this component reusable
 *     for things like wall-photo upload, artist portraits, etc.
 *
 * Validation that lives here:
 *   - MIME type must be image/jpeg, image/png, or image/webp
 *   - Size must be ≤ maxBytes (default 20 MB to match backend)
 *
 * Validation that does NOT live here (correctly belongs to the backend):
 *   - Actual file content sniffing (extension can lie)
 *   - Quota / per-artwork limits
 *   - Virus scanning
 */
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';

const ACCEPT_MIME = ['image/jpeg', 'image/png', 'image/webp'];
const DEFAULT_MAX_BYTES = 20 * 1024 * 1024;

interface StagedFile {
  file: File;
  previewUrl: string;
}

@Component({
  selector: 'app-image-dropzone',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatButtonModule, MatIconModule, TranslatePipe],
  template: `
    <div
      class="dropzone"
      [class.dragging]="isDragging()"
      (click)="openFilePicker()"
      role="button"
      tabindex="0"
      (keydown.enter)="openFilePicker()"
    >
      <mat-icon class="big-icon">cloud_upload</mat-icon>
      <div class="title">{{ 'admin.dropzone.title' | translate }}</div>
      <div class="hint">{{ 'admin.dropzone.hint' | translate }}</div>
      <input
        #fileInput
        type="file"
        [accept]="ACCEPT_MIME.join(',')"
        [multiple]="multiple()"
        (change)="onFileInput($event)"
        hidden
      />
    </div>

    @if (staged().length > 0) {
      <div class="staged-grid">
        @for (item of staged(); track item.previewUrl; let i = $index) {
          <div class="staged">
            <img [src]="item.previewUrl" [alt]="item.file.name" />
            <button
              mat-icon-button
              type="button"
              class="remove-btn"
              [attr.aria-label]="'admin.dropzone.removeAria' | translate"
              (click)="removeAt(i); $event.stopPropagation()"
            >
              <mat-icon>close</mat-icon>
            </button>
            <div class="filename" [title]="item.file.name">{{ item.file.name }}</div>
          </div>
        }
      </div>
    }

    @if (error(); as msg) {
      <div class="error">{{ msg }}</div>
    }
  `,
  styles: [
    `
      :host { display: block; }
      .dropzone {
        border: 2px dashed #c5c5c5;
        border-radius: 8px;
        padding: 32px 16px;
        text-align: center;
        cursor: pointer;
        transition: background 120ms, border-color 120ms;
        outline: none;

        &:hover, &:focus-visible {
          border-color: #673ab7;
          background: #fafafa;
        }

        &.dragging {
          border-color: #673ab7;
          background: #f3e5f5;
        }
      }
      .big-icon {
        font-size: 40px;
        width: 40px;
        height: 40px;
        color: #757575;
      }
      .title { margin-top: 8px; font-weight: 500; }
      .hint { margin-top: 4px; font-size: 13px; color: #757575; }

      .staged-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
        gap: 12px;
        margin-top: 16px;
      }
      .staged {
        position: relative;
        border-radius: 6px;
        overflow: hidden;
        background: #f5f5f5;
        aspect-ratio: 1;

        img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
      }
      .remove-btn {
        position: absolute;
        top: 4px;
        right: 4px;
        background: rgba(0, 0, 0, 0.55);
        color: #fff;
        width: 32px;
        height: 32px;
        line-height: 32px;
      }
      .filename {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        padding: 4px 8px;
        background: rgba(0, 0, 0, 0.55);
        color: #fff;
        font-size: 11px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .error {
        margin-top: 12px;
        padding: 8px 12px;
        background: #fdecea;
        color: #8a2c2c;
        border-radius: 4px;
        font-size: 13px;
      }
    `,
  ],
})
export class ImageDropzoneComponent {
  /** Allow multiple files at once. Default true; set false for portrait upload. */
  readonly multiple = input<boolean>(true);
  /** Max single-file size in bytes. */
  readonly maxBytes = input<number>(DEFAULT_MAX_BYTES);

  readonly filesSelected = output<File[]>();

  readonly fileInput = viewChild.required<ElementRef<HTMLInputElement>>('fileInput');

  readonly isDragging = signal(false);
  readonly staged = signal<StagedFile[]>([]);
  readonly error = signal<string | null>(null);

  readonly ACCEPT_MIME = ACCEPT_MIME;

  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    this.destroyRef.onDestroy(() => {
      for (const item of this.staged()) {
        URL.revokeObjectURL(item.previewUrl);
      }
    });
  }

  // ─── Drag & drop ─────────────────────────────────────────────────────
  @HostListener('dragover', ['$event'])
  onDragOver(ev: DragEvent): void {
    ev.preventDefault();
    this.isDragging.set(true);
  }

  @HostListener('dragleave', ['$event'])
  onDragLeave(ev: DragEvent): void {
    ev.preventDefault();
    this.isDragging.set(false);
  }

  @HostListener('drop', ['$event'])
  onDrop(ev: DragEvent): void {
    ev.preventDefault();
    this.isDragging.set(false);
    const files = Array.from(ev.dataTransfer?.files ?? []);
    this.acceptFiles(files);
  }

  // ─── Click path ──────────────────────────────────────────────────────
  onFileInput(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    this.acceptFiles(files);
    // Clear so the same file can be re-selected after a remove + reselect cycle.
    input.value = '';
  }

  // ─── Validation + state update ───────────────────────────────────────
  private acceptFiles(files: File[]): void {
    this.error.set(null);
    if (files.length === 0) return;

    const accepted: StagedFile[] = [];
    for (const file of files) {
      if (!ACCEPT_MIME.includes(file.type)) {
        this.error.set(`Unsupported file type: ${file.name}. JPEG, PNG, or WebP only.`);
        continue;
      }
      if (file.size > this.maxBytes()) {
        const mb = Math.round(this.maxBytes() / (1024 * 1024));
        this.error.set(`${file.name} is too large. Max ${mb} MB.`);
        continue;
      }
      accepted.push({ file, previewUrl: URL.createObjectURL(file) });
    }

    if (accepted.length === 0) return;

    if (this.multiple()) {
      this.staged.update((curr) => [...curr, ...accepted]);
    } else {
      // Single-file mode: replace any existing staged file.
      for (const old of this.staged()) URL.revokeObjectURL(old.previewUrl);
      this.staged.set([accepted[0]!]);
    }

    this.filesSelected.emit(this.staged().map((s) => s.file));
  }

  removeAt(index: number): void {
    const item = this.staged()[index];
    if (item) URL.revokeObjectURL(item.previewUrl);
    this.staged.update((curr) => curr.filter((_, i) => i !== index));
    this.filesSelected.emit(this.staged().map((s) => s.file));
  }

  /** Called by parent after a successful upload to clear the dropzone. */
  reset(): void {
    for (const item of this.staged()) URL.revokeObjectURL(item.previewUrl);
    this.staged.set([]);
    this.error.set(null);
  }

  /**
   * Opens the hidden file input. Called by both click and Enter-key handlers.
   * Pulled into a method because compound access on a signal call
   * (fileInput().nativeElement.click()) confuses the template type checker.
   */
  openFilePicker(): void {
    this.fileInput().nativeElement.click();
  }
}