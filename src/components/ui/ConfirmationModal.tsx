import React from 'react';
import { Card } from './Card';
import { Button } from './Button';
import { AlertTriangle, CheckCircle, Info } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type?: 'confirm' | 'alert' | 'info';
  onConfirm?: () => void;
  confirmText?: string;
  cancelText?: string;
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
}) => {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'alert':
        return <AlertTriangle className="text-red-600" size={24} />;
      case 'info':
        return <Info className="text-blue-600" size={24} />;
      default:
        return <CheckCircle className="text-green-600" size={24} />;
    }
  };

  const getIconBgColor = () => {
    switch (type) {
      case 'alert':
        return 'bg-red-100';
      case 'info':
        return 'bg-blue-100';
      default:
        return 'bg-green-100';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-sm">
        <div className="p-6 text-center">
          <div className={`w-16 h-16 ${getIconBgColor()} rounded-full flex items-center justify-center mx-auto mb-4`}>
            {getIcon()}
          </div>
          
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {title}
          </h3>
          
          <p className="text-gray-600 mb-6 text-sm leading-relaxed">
            {message}
          </p>
          
          <div className="flex gap-3">
            {type === 'confirm' && onConfirm ? (
              <>
                <Button
                  variant="outline"
                  onClick={onClose}
                  className="flex-1"
                >
                  {cancelText}
                </Button>
                <Button
                  onClick={() => {
                    onConfirm();
                    onClose();
                  }}
                  className="flex-1"
                >
                  {confirmText}
                </Button>
              </>
            ) : (
              <Button
                onClick={onClose}
                className="w-full"
              >
                OK
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};