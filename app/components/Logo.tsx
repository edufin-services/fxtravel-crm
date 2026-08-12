import Link from "next/link";
import Image from "next/image";

export default function Logo({ className = "", dark = false }: { className?: string; dark?: boolean }) {
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
