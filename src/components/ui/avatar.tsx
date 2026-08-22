"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type ImageLoadingStatus = "idle" | "loading" | "loaded" | "error";

interface AvatarContextValue {
  status: ImageLoadingStatus;
  setStatus: (status: ImageLoadingStatus) => void;
  src?: string;
  setSrc: (src?: string) => void;
}

const AvatarContext = React.createContext<AvatarContextValue>({
  status: "idle",
  setStatus: () => {},
  src: undefined,
  setSrc: () => {},
});

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string;
  name?: string;
  size?: "sm" | "md" | "lg";
}

const GRADIENTS = [
  "from-blue-500 to-indigo-600 text-white",
  "from-violet-500 to-purple-600 text-white",
  "from-emerald-500 to-teal-600 text-white",
  "from-amber-500 to-orange-600 text-white",
  "from-rose-500 to-pink-600 text-white",
  "from-cyan-500 to-blue-600 text-white",
  "from-indigo-500 to-sky-600 text-white",
];

function getGradientForName(name?: string) {
  if (!name) return GRADIENTS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return GRADIENTS[Math.abs(hash) % GRADIENTS.length];
}

export function AvatarImage({
  src,
  alt = "Avatar",
  className,
  onLoad,
  onError,
  ...props
}: React.ImgHTMLAttributes<HTMLImageElement>) {
  const { status, setStatus, setSrc } = React.useContext(AvatarContext);

  React.useEffect(() => {
    setSrc(src);
    if (!src) {
      setStatus("error");
      return;
    }

    let isMounted = true;
    const image = new window.Image();
    image.referrerPolicy = "no-referrer";

    image.onload = () => {
      if (isMounted) {
        setStatus("loaded");
      }
    };
    image.onerror = () => {
      if (isMounted) {
        setStatus("error");
      }
    };

    setStatus("loading");
    image.src = src;

    return () => {
      isMounted = false;
    };
  }, [src, setStatus, setSrc]);

  if (status !== "loaded" || !src) {
    return null;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onLoad={onLoad}
      onError={onError}
      className={cn("aspect-square h-full w-full object-cover shrink-0 block", className)}
      {...props}
    />
  );
}

export function AvatarFallback({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  const { status } = React.useContext(AvatarContext);

  if (status === "loaded") {
    return null;
  }

  return (
    <span
      className={cn(
        "flex h-full w-full items-center justify-center font-semibold leading-none text-center select-none",
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

export function Avatar({
  src,
  name,
  size = "md",
  className,
  children,
  ...props
}: AvatarProps) {
  const [status, setStatus] = React.useState<ImageLoadingStatus>(src ? "loading" : "idle");
  const [currentSrc, setSrc] = React.useState<string | undefined>(src);

  React.useEffect(() => {
    if (!src) {
      if (!children) setStatus("idle");
      return;
    }

    let isMounted = true;
    const image = new window.Image();
    image.referrerPolicy = "no-referrer";

    image.onload = () => {
      if (isMounted) setStatus("loaded");
    };
    image.onerror = () => {
      if (isMounted) setStatus("error");
    };

    setStatus("loading");
    image.src = src;

    return () => {
      isMounted = false;
    };
  }, [src, children]);

  const getInitials = (text?: string) => {
    if (!text) return "U";
    const parts = text.trim().split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return text.substring(0, 2).toUpperCase();
  };

  const sizes = {
    sm: "h-7 w-7 text-[10px]",
    md: "h-9 w-9 text-xs",
    lg: "h-12 w-12 text-sm",
  };

  const gradientClass = getGradientForName(name);
  const showGradient = status !== "loaded";

  return (
    <AvatarContext.Provider value={{ status, setStatus, src: currentSrc, setSrc }}>
      <div
        data-slot="avatar"
        className={cn(
          "relative flex shrink-0 items-center justify-center rounded-full font-semibold overflow-hidden select-none border border-border/60 shadow-xs",
          sizes[size],
          showGradient && `bg-gradient-to-br ${gradientClass}`,
          className
        )}
        {...props}
      >
        {children ? (
          children
        ) : status === "loaded" && src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={name || "User Avatar"}
            referrerPolicy="no-referrer"
            className="aspect-square h-full w-full object-cover shrink-0 block"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center leading-none">
            {getInitials(name)}
          </span>
        )}
      </div>
    </AvatarContext.Provider>
  );
}
