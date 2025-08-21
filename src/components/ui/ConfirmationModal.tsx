import React from 'react';
import { Card } from './Card';
import { Button } from './Button';
import { AlertTriangle, CheckCircle, Info, X } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type?: 'confirm' | 'alert' | 'info';
  onConfirm?: () => void;
  confirmText?: React.ReactNode;
  cancelText?: React.ReactNode;
  disabled?: boolean;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  title,
  message,
  type = 'confirm',
  onConfirm,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  disabled = false,
}) => {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'alert':
        return <AlertTriangle className="text-white" size={28} />;
      case 'info':
        return <Info className="text-white" size={28} />;
      default:
        return <CheckCircle className="text-white" size={28} />;
    }
  };

  const getIconBgColor = () => {
    switch (type) {
      case 'alert':
        return 'from-red-500 to-red-600';
      case 'info':
        return 'from-blue-500 to-blue-600';
      default:
        return 'from-green-500 to-green-600';
    }
  };

  const getButtonColors = () => {
    switch (type) {
      case 'alert':
        return 'from-red-500 to-red-600 hover:from-red-600 hover:to-red-700';
      case 'info':
        return 'from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700';
      default:
        return 'from-green-500 to-green-600 hover:from-green-600 hover:to-green-700';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">
        {/* Header with gradient background */}
        <div className={`bg-gradient-to-r ${getIconBgColor()} p-6 text-center relative`}>
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/30 transition-all duration-200"
          >
            <X className="text-white" size={16} />
          </button>
          
          {/* Icon */}
          <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-white/30">
            {getIcon()}
          </div>
          
          {/* Title */}
          <h3 className="text-2xl font-bold text-white mb-2 drop-shadow-lg">
            {title}
          </h3>
        </div>
        
        {/* Content */}
        <div className="p-8 text-center">
          <p className="text-gray-700 mb-8 text-base leading-relaxed font-medium">
            {message}
          </p>
          
          {/* Action Buttons */}
          <div className="flex gap-4">
            {type === 'confirm' && onConfirm ? (
              <>
                <Button
                  variant="outline"
                  onClick={onClose}
                  className="flex-1 py-3 px-6 bg-white border-2 border-gray-200 text-gray-700 font-semibold rounded-2xl hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 shadow-lg hover:shadow-xl"
                  disabled={disabled}
                >
                  {cancelText}
                </Button>
                <Button
                  onClick={() => {
                    onConfirm();
                    // Don't auto-close if disabled (processing)
                    if (!disabled) {
                      onClose();
                    }
                  }}
                  className={`flex-1 py-3 px-6 bg-gradient-to-r ${getButtonColors()} text-white font-bold rounded-2xl transition-all duration-200 shadow-lg hover:shadow-xl disabled:from-gray-400 disabled:to-gray-500 disabled:shadow-none disabled:cursor-not-allowed`}
                  disabled={disabled}
                >
                  {confirmText}
                </Button>
              </>
            ) : (
              <Button
                onClick={onClose}
                className={`w-full py-3 px-6 bg-gradient-to-r ${getButtonColors()} text-white font-bold rounded-2xl transition-all duration-200 shadow-lg hover:shadow-xl`}
                disabled={disabled}
              >
                OK
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};