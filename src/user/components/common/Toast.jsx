import React, { useEffect } from 'react';
import { Check, Info, AlertTriangle, X, Bell } from 'lucide-react';
const TOAST_TYPES = {
  success: {
    icon: Check,
    bgColor: 'bg-green-500',
    textColor: 'text-white'
  },
  info: {
    icon: Info,
    bgColor: 'bg-blue-500',
    textColor: 'text-white'
  },
  warning: {
    icon: AlertTriangle,
    bgColor: 'bg-yellow-500',
    textColor: 'text-white'
  },
  error: {
    icon: X,
    bgColor: 'bg-red-500',
    textColor: 'text-white'
  },
  waiter: {
    icon: Bell,
    bgColor: 'bg-primary-600',
    textColor: 'text-white'
  }
};
export function Toast({
  message,
  type = 'info',
  duration = 5000,
  onClose,
  id
}) {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose(id);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, id, onClose]);
  const {
    icon: Icon,
    bgColor,
    textColor
  } = TOAST_TYPES[type] || TOAST_TYPES.info;
  return <div className={`pointer-events-auto ${bgColor} ${textColor} mb-2 w-full rounded-lg p-4 shadow-lg transform transition-all duration-300 animate-in slide-in-from-right-full`}>
      <div className="flex items-center space-x-3">
        <Icon className="h-5 w-5 flex-shrink-0" />
        <p className="flex-1 font-medium text-sm">{message}</p>
        <button onClick={() => onClose(id)} className="flex-shrink-0 p-1 hover:bg-black hover:bg-opacity-20 rounded-full transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>;
}
export function ToastContainer({
  toasts,
  onRemoveToast
}) {
  if (toasts.length === 0) return null;
  return <div className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+0.75rem)] z-[80] flex justify-center px-3 sm:top-4 sm:justify-end sm:px-4">
      <div className="w-full max-w-sm space-y-2">
      {toasts.map(toast => <Toast key={toast.id} id={toast.id} message={toast.message} type={toast.type} duration={toast.duration} onClose={onRemoveToast} />)}
      </div>
    </div>;
}
