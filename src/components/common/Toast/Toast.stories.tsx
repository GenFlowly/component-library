import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Toast, ToastContainer, ToastMessage } from './Toast';

const meta: Meta<typeof Toast> = {
  title: 'Components/Toast',
  component: Toast,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Toast>;

// Toast auto-dismisses via internal timers (default 3s + 300ms exit animation),
// so every story keeps its own list state and lets the user re-add toasts.
function ToastDemo({
  makeToast,
  buttonLabel,
}: {
  makeToast: (n: number) => ToastMessage;
  buttonLabel: string;
}) {
  const counter = React.useRef(0);
  const [toasts, setToasts] = React.useState<ToastMessage[]>(() => [
    makeToast(0),
  ]);

  const addToast = () => {
    counter.current += 1;
    setToasts(prev => [...prev, makeToast(counter.current)]);
  };
  const removeToast = React.useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <>
      <button onClick={addToast}>{buttonLabel}</button>
      <ToastContainer>
        {toasts.map(toast => (
          <Toast key={toast.id} toast={toast} onRemove={removeToast} />
        ))}
      </ToastContainer>
    </>
  );
}

export const Default: Story = {
  render: () => (
    <ToastDemo
      buttonLabel="Show toast"
      makeToast={n => ({
        id: `toast-${n}`,
        message: `Settings saved (#${n + 1})`,
      })}
    />
  ),
};

export const LongDuration: Story = {
  render: () => (
    <ToastDemo
      buttonLabel="Show 8s toast"
      makeToast={n => ({
        id: `slow-${n}`,
        message: `This toast sticks around for 8 seconds (#${n + 1})`,
        duration: 8000,
      })}
    />
  ),
};

export const Stacked: Story = {
  render: function Render() {
    const counter = React.useRef(0);
    const [toasts, setToasts] = React.useState<ToastMessage[]>([]);
    const removeToast = React.useCallback((id: string) => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, []);
    const addThree = () => {
      const next = Array.from({ length: 3 }).map((_, i) => {
        counter.current += 1;
        return {
          id: `stack-${counter.current}`,
          message: `Notification ${counter.current}`,
          duration: 4000 + i * 1500,
        };
      });
      setToasts(prev => [...prev, ...next]);
    };
    return (
      <>
        <button onClick={addThree}>Show 3 stacked toasts</button>
        <ToastContainer>
          {toasts.map(toast => (
            <Toast key={toast.id} toast={toast} onRemove={removeToast} />
          ))}
        </ToastContainer>
      </>
    );
  },
};
