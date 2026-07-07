export class ModalDialog extends HTMLElement {
  static get observedAttributes(): string[] {
    return ['heading'];
  }

  private dialogEl?: HTMLDialogElement;

  attributeChangedCallback(name: string, _old: string, value: string): void {
    if (name === 'heading' && this.dialogEl) {
      this.querySelector('.modal-header h2')!.textContent = value;
    }
  }

  connectedCallback(): void {
    if (this.dialogEl) return;
    const heading = this.getAttribute('heading') ?? '';
    const children = Array.from(this.childNodes);
    this.innerHTML = `
      <dialog>
        <div class="modal-header">
          <h2>${heading}</h2>
          <button type="button" class="close-btn" aria-label="Close">
            <app-icon name="close"></app-icon>
          </button>
        </div>
        <div class="modal-body"></div>
      </dialog>
    `;
    const body = this.querySelector('.modal-body')!;
    children.forEach((child) => body.appendChild(child));
    this.dialogEl = this.querySelector('dialog')!;
    this.querySelector('.close-btn')!.addEventListener('click', () => this.close());
  }

  open(): void {
    this.dialogEl?.showModal();
  }

  close(): void {
    this.dialogEl?.close();
  }
}

customElements.define('modal-dialog', ModalDialog);
