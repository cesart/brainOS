"use client";

import { useEffect, useState } from "react";

export function LoginLayout({ children }: { children: React.ReactNode }) {
  const [height, setHeight] = useState<string>("100dvh");

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    function update() {
      setHeight(`${vv!.height}px`);
    }
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);

  return (
    <div
      className="flex flex-col items-center justify-center bg-background px-4 overflow-hidden"
      style={{ height }}
    >
      {children}
    </div>
  );
}
