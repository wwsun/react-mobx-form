import React from 'react';
import styled from 'styled-components';
import { useFormEnv, useModel } from './form';
import { Button } from '@alifd/next';
import { submit, reset } from './utils';

export interface FormLayoutParams {
  labelPosition?: 'left' | 'top';
  labelWidth?: string | number;
  controlWidth?: string | number;
  formItemGap?: string | number;
  inlineError?: boolean;
}

export interface FormLayoutProps extends Partial<FormLayoutParams> {
  style?: React.CSSProperties;
  className?: string;
  children?: React.ReactNode;
}

export const FormLayoutContiner = styled.div``;

export function FormLayout({
  children,
  className,
  style,
  labelPosition = 'left',
  labelWidth = labelPosition === 'left' ? 120 : 'auto',
  formItemGap = labelPosition === 'left' ? 12 : 16,
  controlWidth = 320,
  inlineError,
}: FormLayoutProps) {
  return <FormLayoutContiner>{children}</FormLayoutContiner>;
}

const FormItemGroupDiv = styled.div``;

export interface FormItemGroupProps {
  label?: React.ReactNode;
  tip?: React.ReactNode;
  required?: boolean;
  children?: React.ReactNode;
  labelWidth?: number | string;
  controlWidth?: number | string;
  className?: string;
  style?: React.CSSProperties;
  inline?: boolean;
}

export const FormItemGroup = ({
  label,
  required,
  tip,
  children,
  labelWidth,
  controlWidth,
  className,
  style,
  inline,
}: FormItemGroupProps) => {
  const { isPreview } = useFormEnv();

  return (
    <FormItemGroupDiv>
      {label == null && tip == null ? null : (
        <div className="form-item-label">
          {required && <span className="form-item-required-indicator">*</span>}
          {label && <span className="form-item-label-text">{label}</span>}
          {tip && <span>{tip}</span>}
        </div>
      )}
      <div className="form-item-group-content">{children}</div>
    </FormItemGroupDiv>
  );
};

export interface FormItemViewProps {
  htmlId?: string;
  label?: React.ReactNode;
  help?: React.ReactNode;
  tip?: React.ReactNode;
  required: boolean;
  error?: string;
  children?: React.ReactNode;
  style?: React.ReactNode;
  className?: string;
  labelWidth?: string | number;
  controlWidth?: string | number;
  rightNode?: React.ReactNode;
}

export function FormItemView({
  htmlId,
  label,
  help,
  tip,
  required,
  error,
  children,
  style,
  className,
  labelWidth,
  controlWidth,
  rightNode,
}: FormItemViewProps) {
  return (
    <div>
      {label == null && tip == null ? null : (
        <label className="form-item-label" htmlFor={htmlId}>
          {required && <span className="required-indicator">*</span>}
          {label && <span className="form-item-label-text">{label}</span>}
          {tip && <span>{tip}</span>}
        </label>
      )}

      <div className="form-item-control">
        {children}
        {help}
        {error}
      </div>

      {rightNode}
    </div>
  );
}

type ButtonProps = React.PropsWithChildren<React.ComponentProps<typeof Button>>;

export function FormSubmit({ type = 'primary', children = 'submit', ...props }: ButtonProps) {
  const model = useModel();
  const formEnv = useFormEnv();

  return <Button onClick={() => submit(model, formEnv)} type={type} children={children} {...props} />;
}

export function FormReset({ children = 'Reset', ...props }: ButtonProps) {
  const model = useModel();
  const formEnv = useFormEnv();

  return <Button onClick={() => reset(model, formEnv)} children={children} {...props} />;
}
