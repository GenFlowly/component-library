import React, { useEffect, useState } from 'react';
import styles from './Toast.module.scss';

export interface ToastMessage {
  id: string;
  message: string;
  duration?: number;
}

/**
 * Fixed-position wrapper that stacks toasts; hosts the module's
 * toastContainer class so consumers don't need access to the stylesheet.
 */
export const ToastContainer: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => <div className={styles.toastContainer}>{children}</div>;

interface ToastProps {
  toast: ToastMessage;
  onRemove: (id: string) => void;
  'data-testid'?: string;
}

export const Toast: React.FC<ToastProps> = ({
  toast,
  onRemove,
  'data-testid': testId,
}) => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const duration = toast.duration || 3000;

    const timer = setTimeout(() => {
      setIsExiting(true);
    }, duration);

    return () => clearTimeout(timer);
  }, [toast.duration]);

  // Wait for exit animation to finish before removing from DOM
  useEffect(() => {
    if (isExiting) {
      const timer = setTimeout(() => {
        onRemove(toast.id);
      }, 300); // Match animation duration
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isExiting, onRemove, toast.id]);

  return (
    <div
      className={`${styles.toast} ${isExiting ? styles.exiting : ''}`}
      role="status"
      aria-live="polite"
      data-testid={testId}
    >
      {toast.message}
    </div>
  );
};
