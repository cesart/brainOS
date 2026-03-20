"use client";

import { useEffect, useState } from "react";

export function Clock() {
  const [now, setNow] = useState<Date | null>(null);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => {
      setNow(new Date());
      setVisible((v) => !v);
    }, 1000);
    return () => clearInterval(id);
  }, []);

  if (!now) return null;

  const hours = now.getHours() % 12 || 12;
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");
  const ampm = now.getHours() >= 12 ? "PM" : "AM";

  return (
    <span className="tabular-nums">
      {hours}
      <span style={{ opacity: visible ? 1 : 0 }}>:</span>
      {minutes}
      <span style={{ opacity: visible ? 1 : 0 }}>:</span>
      {seconds} {ampm}
    </span>
  );
}
