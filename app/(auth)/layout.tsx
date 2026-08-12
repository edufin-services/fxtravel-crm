import Image from "next/image";
import Link from "next/link";

const HIGHLIGHTS = [
  "Unify WhatsApp, Instagram & TikTok chats in one inbox",
  "Automate follow-ups with AI-powered workflows",
  "Track every lead from first message to closed deal",
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen w-full bg-white">
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-gradient-to-br from-brand-600 via-emerald-600 to-brand-800 p-12 text-white lg:flex">
        <Link href="/" className="inline-flex items-center bg-white px-5 py-3 rounded-2xl shadow-sm hover:opacity-95 transition-opacity w-fit">
          <Image src="/logo.png" alt="Fxpertise" width={200} height={60} className="h-12 w-auto object-contain" priority />
        </Link>

        <div className="relative z-10 max-w-md">
          <h2 className="text-3xl font-semibold leading-tight">
            The AI CRM built for messenger-based sales
          </h2>
          <ul className="mt-8 space-y-4">
            {HIGHLIGHTS.map((item) => (
              <li key={item} className="flex items-start gap-3 text-brand-100">
                <span className="mt-1 flex h-5 w-5 flex-none items-center justify-center rounded-full bg-white/15">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M5 13l4 4L19 7"
                      stroke="white"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative z-10 text-sm text-brand-200">
          Trusted by thousands of sales teams worldwide.
        </p>

        <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -top-16 -left-16 h-56 w-56 rounded-full bg-white/10" />
      </div>

      <div className="flex w-full flex-col items-center justify-center px-6 py-12 lg:w-1/2">
        <div className="mb-8 lg:hidden">
          <Link href="/" className="inline-flex items-center bg-white px-4 py-2.5 rounded-xl shadow-sm border border-zinc-100">
            <Image src="/logo.png" alt="Fxpertise" width={180} height={50} className="h-10 w-auto object-contain" priority />
          </Link>
        </div>
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
