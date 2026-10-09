import '@testing-library/jest-dom';

// jsdom has no PointerEvent, so fireEvent.pointer* would drop clientX and pointerType
if (typeof window !== 'undefined' && !window.PointerEvent) {
  class PointerEvent extends MouseEvent {
    pointerType: string;
    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init);
      this.pointerType = init.pointerType ?? 'mouse';
    }
  }
  window.PointerEvent = PointerEvent as typeof window.PointerEvent;
}
