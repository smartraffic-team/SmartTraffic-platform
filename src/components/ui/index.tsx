import * as DialogPrimitive from '@radix-ui/react-dialog';
import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
} from 'react';
import { X } from 'lucide-react';
import { cva } from 'class-variance-authority';
import { cn } from '../../lib/cn';
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'btn-primary',
        secondary: 'btn-secondary',
        ghost: 'btn-ghost',
        danger: 'btn-danger',
      },
    },
    defaultVariants: { variant: 'primary' },
  },
);
export function Button({
  className,
  variant = 'primary',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
}) {
  return (
    <button
      className={cn('btn', buttonVariants({ variant }), className)}
      {...props}
    />
  );
}
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('card', className)} {...props} />;
}
export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input className="input" {...props} />;
}
export function Select({
  label,
  value,
  onChange,
  options,
}: {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="field">
      {label && <span>{label}</span>}
      <select
        className="input"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
export function Badge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: 'success' | 'warning' | 'danger' | 'neutral' | 'info';
}) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}
export function Modal({
  open,
  onOpenChange,
  title,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="dialog-overlay" />
        <DialogPrimitive.Content className="dialog-content">
          <div className="dialog-header">
            <DialogPrimitive.Title>{title}</DialogPrimitive.Title>
            <DialogPrimitive.Close className="icon-button" aria-label="Fechar">
              <X size={18} />
            </DialogPrimitive.Close>
          </div>
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
export function Empty({
  message = 'Nenhum dado encontrado para os filtros selecionados.',
}: {
  message?: string;
}) {
  return <div className="empty">{message}</div>;
}
export function Skeleton() {
  return <div className="skeleton" aria-label="Carregando dados" />;
}
export function ErrorState() {
  return (
    <Card className="empty">
      Não foi possível carregar os dados demonstrativos. Atualize a página para
      tentar novamente.
    </Card>
  );
}
