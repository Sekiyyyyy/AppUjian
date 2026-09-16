// Utility functions for dispatching custom events to GlobalAlert component
// This completely replaces SweetAlert2 with Shadcn UI & Tailwind Toasts.

export const showSuccessToast = (title: string) => {
  window.dispatchEvent(new CustomEvent('show-toast', {
    detail: { title, type: 'success' }
  }));
};

export const showErrorToast = (title: string) => {
  window.dispatchEvent(new CustomEvent('show-toast', {
    detail: { title, type: 'error' }
  }));
};

export const showWarningToast = (title: string) => {
  window.dispatchEvent(new CustomEvent('show-toast', {
    detail: { title, type: 'warning' }
  }));
};

// For confirmations, triggers the Shadcn AlertDialog
export const confirmAction = (title: string, text: string = ''): Promise<boolean> => {
  return new Promise((resolve) => {
    window.dispatchEvent(new CustomEvent('show-alert-dialog', {
      detail: { title, text, resolve }
    }));
  });
};
