"use client";

import * as Dialog from "@radix-ui/react-dialog";
import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export const Modal = Object.assign(({ children }: { children: ReactNode }) => <>{children}</>, {
  Backdrop({
    children,
    isOpen,
    onOpenChange,
  }: {
    children: ReactNode;
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
  }) {
    return (
      <Dialog.Root open={isOpen} onOpenChange={onOpenChange}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm" />
          {children}
        </Dialog.Portal>
      </Dialog.Root>
    );
  },
  Container({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
    return (
      <div
        className={cn("fixed inset-0 z-50 flex items-center justify-center p-3", className)}
        {...props}
      />
    );
  },
  Dialog({ className, ...props }: Dialog.DialogContentProps) {
    return <Dialog.Content className={cn("relative rounded-lg p-0", className)} {...props} />;
  },
  CloseTrigger({ className, ...props }: Dialog.DialogCloseProps) {
    return <Dialog.Close className={className} {...props} />;
  },
  Header({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
    return <div className={cn("px-4 pt-4 sm:px-6 sm:pt-6", className)} {...props} />;
  },
  Heading({ className, ...props }: Dialog.DialogTitleProps) {
    return <Dialog.Title className={cn("text-base font-semibold", className)} {...props} />;
  },
  Description({ className, ...props }: Dialog.DialogDescriptionProps) {
    return <Dialog.Description className={cn("text-sm text-muted", className)} {...props} />;
  },
  Body({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
    return <div className={cn("px-4 py-4 sm:px-6", className)} {...props} />;
  },
  Footer({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
    return (
      <div className={cn("flex justify-end gap-2 px-4 pb-4 sm:px-6 sm:pb-6", className)} {...props} />
    );
  },
});
