import React from 'react';

interface ErrorAlertProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorAlert({ message, onRetry }: ErrorAlertProps) {
  return (
    <div
      className="alert alert-danger"
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
    >
      <span>{message}</span>
      {onRetry && (
        <button type="button" className="btn btn-sm btn-secondary" onClick={onRetry}>
          Thử lại
        </button>
      )}
    </div>
  );
}
