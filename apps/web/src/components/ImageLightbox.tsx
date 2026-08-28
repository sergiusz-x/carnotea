import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X, ZoomIn } from 'lucide-react';

import { cn } from '@/lib/utils';

interface ImageLightboxProps {
  src: string;
  alt: string;
  openLabel: string;
  closeLabel: string;
  imageClassName?: string;
}

export function ImageLightbox({
  src,
  alt,
  openLabel,
  closeLabel,
  imageClassName,
}: ImageLightboxProps) {
  return (
    <DialogPrimitive.Root>
      <DialogPrimitive.Trigger asChild>
        <button
          type="button"
          className="group relative block w-full cursor-zoom-in overflow-hidden rounded-[inherit] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-label={[openLabel, alt].join(': ')}
        >
          <img src={src} alt={alt} className={cn('block h-auto w-full', imageClassName)} />
          <span className="absolute bottom-3 right-3 grid h-10 w-10 place-items-center rounded-full border border-white/15 bg-black/70 text-white opacity-80 shadow-lg transition group-hover:scale-105 group-hover:opacity-100 group-focus-visible:opacity-100">
            <ZoomIn className="h-5 w-5" aria-hidden="true" />
          </span>
        </button>
      </DialogPrimitive.Trigger>

      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[94vh] w-[96vw] max-w-[1600px] -translate-x-1/2 -translate-y-1/2 items-center justify-center focus:outline-none">
          <DialogPrimitive.Title className="sr-only">{alt}</DialogPrimitive.Title>
          <img
            src={src}
            alt={alt}
            className="max-h-[92vh] max-w-full rounded-xl border border-white/15 object-contain shadow-2xl"
          />
          <DialogPrimitive.Close
            aria-label={closeLabel}
            className="absolute right-2 top-2 grid h-11 w-11 place-items-center rounded-full border border-white/15 bg-black/80 text-white shadow-lg transition hover:bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:right-4 sm:top-4"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
