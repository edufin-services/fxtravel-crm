import Link from "next/link";
import Image from "next/image";
import FxLogoIcon from "./FxLogoIcon";

export default function Logo({
  className = "",
  dark = false,
  compact = false,
}: {
  className?: string;
  dark?: boolean;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <Link href="/dashboard" className={`flex items-center justify-center ${className}`} title="Fxpertise CRM">
        <Image
          src="/fx-icon1.png"
          alt="Fxpertise"
          width={36}
          height={36}
          className="h-9 w-9 object-contain rounded-xl shadow-xs"
          priority
        />
      </Link>
    );
  }

  return (
    <Link href="/" className={`flex items-center gap-2 font-semibold ${className}`}>
      <Image
        src="/logo.png"
        alt="Fxpertise"
        width={180}
        height={50}
        className="h-11 max-w-[140px] w-auto object-contain"
        priority
      />
    </Link>
  );
}
