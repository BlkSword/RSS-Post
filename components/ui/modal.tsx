/**
 * 模态框组件 - 基于 Ant Design Modal
 * 为了保持兼容性，保留原有接口
 */

'use client';

import * as React from 'react';
import { Modal as AntModal, ModalProps as AntModalProps, Button } from 'antd';
import { cn } from '@/lib/utils';

export interface ModalProps extends Omit<AntModalProps, 'open' | 'onCancel' | 'width'> {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
  footer?: React.ReactNode;
}

const sizeMap = {
  sm: 400,
  md: 520,
  lg: 640,
  xl: 800,
  full: 'calc(100vw - 32px)',
};

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  showCloseButton = true,
  closeOnOverlayClick = true,
  className,
  ...props
}: ModalProps) {
  return (
    <AntModal
      open={isOpen}
      onCancel={closeOnOverlayClick ? onClose : undefined}
      title={
        title ? (
          <div>
            <div className="text-lg font-semibold">{title}</div>
            {description && (
              <div className="text-sm text-muted-foreground mt-1 font-normal">
                {description}
              </div>
            )}
          </div>
        ) : undefined
      }
      footer={footer}
      width={sizeMap[size]}
      closable={showCloseButton}
      maskClosable={closeOnOverlayClick}
      className={cn('', className)}
      {...props}
    >
      {children}
    </AntModal>
  );
}

interface ConfirmModalProps extends Omit<ModalProps, 'children' | 'footer'> {
  onConfirm: () => void;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: 'primary' | 'danger';
  isConfirmLoading?: boolean;
}

export function ConfirmModal({
  onConfirm,
  confirmText = '确认',
  cancelText = '取消',
  confirmVariant = 'primary',
  isConfirmLoading = false,
  ...props
}: ConfirmModalProps) {
  return (
    <Modal
      {...props}
      footer={
        <div className="flex justify-end gap-2">
          <Button onClick={props.onClose} disabled={isConfirmLoading}>
            {cancelText}
          </Button>
          <Button
            type="primary"
            danger={confirmVariant === 'danger'}
            onClick={onConfirm}
            loading={isConfirmLoading}
          >
            {confirmText}
          </Button>
        </div>
      }
    >
      <p className="text-sm text-muted-foreground">
        {props.description || '此操作无法撤销，是否继续？'}
      </p>
    </Modal>
  );
}

export default Modal;
