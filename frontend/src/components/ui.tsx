import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

export const inputClassName =
  "w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-ink-950 shadow-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200";

export const labelClassName = "text-sm font-medium text-ink-700";

export const primaryButtonClassName =
  "inline-flex items-center justify-center rounded-md bg-ink-950 px-4 py-2 text-sm font-medium text-white hover:bg-ink-700 disabled:cursor-not-allowed disabled:opacity-60";

export const secondaryButtonClassName =
  "inline-flex items-center justify-center rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-ink-700 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60";

export const dangerButtonClassName =
  "inline-flex items-center justify-center rounded-md border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60";

type FieldProps = {
  label: string;
  children: ReactNode;
};

export function Field({ label, children }: FieldProps) {
  return (
    <label className="space-y-1">
      <span className={labelClassName}>{label}</span>
      {children}
    </label>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputClassName} ${props.className ?? ""}`} />;
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${inputClassName} min-h-24 ${props.className ?? ""}`} />;
}

export function SelectInput(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${inputClassName} ${props.className ?? ""}`} />;
}

export function InlineError({ message }: { message: string | null }) {
  if (!message) {
    return null;
  }

  return (
    <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
      {message}
    </div>
  );
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-md border border-dashed border-zinc-300 bg-white px-4 py-8 text-center">
      <h2 className="text-base font-semibold text-ink-950">{title}</h2>
      <p className="mt-2 text-sm text-ink-500">{description}</p>
    </div>
  );
}

export function LoadingState({ label }: { label: string }) {
  return <p className="rounded-md border border-zinc-200 bg-white px-4 py-3 text-sm text-ink-500">{label}</p>;
}

export function Button({
  variant = "secondary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" }) {
  const className = {
    primary: primaryButtonClassName,
    secondary: secondaryButtonClassName,
    danger: dangerButtonClassName
  }[variant];

  return <button {...props} className={`${className} ${props.className ?? ""}`} />;
}

export function Modal({ isOpen, onClose, title, children }: { isOpen: boolean; onClose: () => void; title: string; children: ReactNode }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-xl border border-zinc-200 bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink-950">{title}</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-800">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
