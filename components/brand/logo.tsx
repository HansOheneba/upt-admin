import Image from "next/image";

const RATIO = 192 / 711;

export function Logo({
  width = 180,
  priority = false,
}: {
  width?: number;
  priority?: boolean;
}) {
  const height = Math.round(width * RATIO);

  return (
    <Image
      src="/brand/logo.webp"
      alt="United Pension Trustees"
      width={width}
      height={height}
      priority={priority}
    />
  );
}
