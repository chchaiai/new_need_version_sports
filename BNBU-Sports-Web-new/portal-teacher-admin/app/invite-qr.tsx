"use client";

import QRCode from "qrcode";
import Image from "next/image";
import { useEffect, useState } from "react";
import { createAndroidInviteQrPayload } from "./course-invite";

type InviteQrCodeProps = {
  code: string;
  alt: string;
  onReady?: (code: string, dataUrl: string) => void;
};

export function InviteQrCode({ code, alt, onReady }: InviteQrCodeProps) {
  const [generated, setGenerated] = useState<{
    key: string;
    source: string;
  } | null>(null);
  const key = code;
  const source = generated?.key === key ? generated.source : null;

  useEffect(() => {
    let cancelled = false;
    const payload = createAndroidInviteQrPayload(code);
    void QRCode.toDataURL(payload, {
      errorCorrectionLevel: "M",
      width: 840,
      margin: 3,
      color: { dark: "#172032", light: "#ffffff" },
    })
      .then((dataUrl) => {
        if (cancelled) return;
        setGenerated({ key, source: dataUrl });
        onReady?.(code, dataUrl);
      })
      .catch(() => {
        if (!cancelled) setGenerated(null);
      });
    return () => {
      cancelled = true;
    };
  }, [code, key, onReady]);

  return (
    <div className="invite-qr-image" aria-busy={!source}>
      {source ? (
        <Image src={source} alt={alt} width={840} height={840} unoptimized />
      ) : (
        <span>正在生成可扫码二维码…</span>
      )}
    </div>
  );
}
