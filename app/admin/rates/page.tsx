import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function AdminRatesPage() {
  const session = await getSession();
  if (!session?.isAdmin) redirect("/login");

  const currencies = [
    { code: "USD", name: "US Dollar", baseRate: 83.45, cnMargin: 0.25, cardMargin: 0.15, ttMargin: 0.35, status: "Active" },
    { code: "EUR", name: "Euro", baseRate: 90.80, cnMargin: 0.30, cardMargin: 0.20, ttMargin: 0.40, status: "Active" },
    { code: "GBP", name: "British Pound", baseRate: 106.10, cnMargin: 0.35, cardMargin: 0.25, ttMargin: 0.45, status: "Active" },
    { code: "AED", name: "UAE Dirham", baseRate: 22.72, cnMargin: 0.10, cardMargin: 0.08, ttMargin: 0.15, status: "Active" },
    { code: "CAD", name: "Canadian Dollar", baseRate: 61.20, cnMargin: 0.25, cardMargin: 0.18, ttMargin: 0.30, status: "Active" },
    { code: "AUD", name: "Australian Dollar", baseRate: 54.60, cnMargin: 0.22, cardMargin: 0.16, ttMargin: 0.28, status: "Active" },
  ];

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200/80 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black text-zinc-900 tracking-tight">Forex Rate Master &amp; Margin Tiers</h1>
            <span className="rounded-full bg-rose-100 text-rose-800 text-xs font-bold px-2.5 py-0.5 border border-rose-200">
              Admin Master
            </span>
          </div>
          <p className="mt-1 text-xs text-zinc-500 font-medium">
            Configure global base exchange rates and profit margins for Clean Notes (CN), Forex Cards, and Wire Remittance
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
          <h2 className="text-sm font-bold text-zinc-900">Supported Currencies &amp; Profit Margins</h2>
          <span className="text-xs text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
            Live Feed Online
          </span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-zinc-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-3">Currency</th>
                <th className="px-4 py-3">Base Interbank Rate</th>
                <th className="px-4 py-3">CN Margin (₹)</th>
                <th className="px-4 py-3">Card Margin (₹)</th>
                <th className="px-4 py-3">TT / DD Margin (₹)</th>
                <th className="px-4 py-3">Selling Price (Card)</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 font-medium">
              {currencies.map((curr) => {
                const cardSell = (curr.baseRate + curr.cardMargin).toFixed(2);
                return (
                  <tr key={curr.code} className="hover:bg-zinc-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-900 text-white font-black text-xs">
                          {curr.code[0]}
                        </span>
                        <div>
                          <p className="font-bold text-zinc-900">{curr.code}</p>
                          <p className="text-[10px] text-zinc-400">{curr.name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-bold text-zinc-900">₹{curr.baseRate.toFixed(2)}</td>
                    <td className="px-4 py-3 text-zinc-700">+{curr.cnMargin.toFixed(2)}</td>
                    <td className="px-4 py-3 text-zinc-700">+{curr.cardMargin.toFixed(2)}</td>
                    <td className="px-4 py-3 text-zinc-700">+{curr.ttMargin.toFixed(2)}</td>
                    <td className="px-4 py-3 font-black text-emerald-700">₹{cardSell}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-emerald-100 text-emerald-800 px-2.5 py-0.5 text-[10px] font-bold border border-emerald-200">
                        {curr.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
