"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { ApiError } from "./api";

export function useRateLimitCountdown() {
  const [countdown, setCountdown] = useState<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const clearCountdown = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setCountdown(null);
  }, []);

  const startCountdown = useCallback((seconds: number) => {
    if (seconds <= 0) {
      clearCountdown();
      return;
    }

    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    setCountdown(seconds);

    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null || prev <= 1) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  }, [clearCountdown]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const handleRateLimitError = useCallback((err: any): boolean => {
    const is429 =
      err?.status === 429 ||
      err?.response?.status === 429 ||
      err?.code === "RATE_LIMIT_EXCEEDED" ||
      err?.response?.data?.code === "RATE_LIMIT_EXCEEDED";

    const retrySeconds =
      err?.retry_after_seconds ||
      err?.response?.data?.retry_after_seconds ||
      (is429 ? 60 : null);

    if (retrySeconds && retrySeconds > 0) {
      startCountdown(retrySeconds);
      return true;
    }
    return false;
  }, [startCountdown]);

  return {
    countdown,
    isRateLimited: countdown !== null && countdown > 0,
    startCountdown,
    clearCountdown,
    handleRateLimitError,
  };
}
