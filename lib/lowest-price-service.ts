import "server-only";
import { SUPPORTED_CURRENCIES } from "./constants";
import { dbConnect } from "./mongoose";
import { BranchModel, LowestPriceModel } from "./models";

export type LowestPriceItem = {
  id: string;
  city: string;
  currency: string;
  bestBuyRate: number;
  bestSellRate: number;
  bestBranchId: string;
  bestBranchName: string;
  updatedAt: string;
};

// Seed initial default branches if none exist so the platform operates out of the box
async function ensureSeedBranches() {
  await dbConnect();
  const count = await BranchModel.countDocuments();
  if (count > 0) return;

  const defaultBranches = [
    {
      id: "br-mumbai-01",
      name: "FXPertise Fort Branch (Main)",
      city: "Mumbai",
      address: "124 M.G. Road, Fort, Mumbai 400001",
      phone: "+91 98200 12345",
      email: "mumbai.fort@fxpertise.in",
      kycStatus: "verified",
      status: "active",
      walletBalance: 150000,
      margins: {
        USD: { buyMargin: -0.40, sellMargin: 0.50 },
        EUR: { buyMargin: -0.50, sellMargin: 0.60 },
        GBP: { buyMargin: -0.60, sellMargin: 0.70 },
        CAD: { buyMargin: -0.30, sellMargin: 0.45 },
        AUD: { buyMargin: -0.35, sellMargin: 0.50 },
        AED: { buyMargin: -0.15, sellMargin: 0.25 },
        SGD: { buyMargin: -0.30, sellMargin: 0.40 },
        THB: { buyMargin: -0.05, sellMargin: 0.08 },
        JPY: { buyMargin: -0.01, sellMargin: 0.02 },
      },
      createdAt: new Date().toISOString(),
    },
    {
      id: "br-mumbai-02",
      name: "FXPertise BKC Exchange Centre",
      city: "Mumbai",
      address: "G-Block, BKC, Bandra East, Mumbai 400051",
      phone: "+91 98200 67890",
      email: "mumbai.bkc@fxpertise.in",
      kycStatus: "verified",
      status: "active",
      walletBalance: 200000,
      margins: {
        USD: { buyMargin: -0.35, sellMargin: 0.45 },
        EUR: { buyMargin: -0.45, sellMargin: 0.55 },
        GBP: { buyMargin: -0.55, sellMargin: 0.65 },
        CAD: { buyMargin: -0.28, sellMargin: 0.40 },
        AUD: { buyMargin: -0.32, sellMargin: 0.48 },
        AED: { buyMargin: -0.12, sellMargin: 0.20 },
        SGD: { buyMargin: -0.25, sellMargin: 0.38 },
      },
      createdAt: new Date().toISOString(),
    },
    {
      id: "br-delhi-01",
      name: "FXPertise Connaught Place Branch",
      city: "Delhi NCR",
      address: "Inner Circle, CP, New Delhi 110001",
      phone: "+91 98100 11223",
      email: "delhi.cp@fxpertise.in",
      kycStatus: "verified",
      status: "active",
      walletBalance: 180000,
      margins: {
        USD: { buyMargin: -0.38, sellMargin: 0.48 },
        EUR: { buyMargin: -0.48, sellMargin: 0.58 },
        GBP: { buyMargin: -0.58, sellMargin: 0.68 },
        CAD: { buyMargin: -0.29, sellMargin: 0.42 },
        AUD: { buyMargin: -0.34, sellMargin: 0.49 },
        AED: { buyMargin: -0.14, sellMargin: 0.22 },
        SGD: { buyMargin: -0.28, sellMargin: 0.39 },
      },
      createdAt: new Date().toISOString(),
    },
  ];

  await BranchModel.insertMany(defaultBranches);
}

export async function recalculateLowestPricesForCity(city: string): Promise<LowestPriceItem[]> {
  await ensureSeedBranches();
  await dbConnect();

  const branches = await BranchModel.find({ city, status: "active", kycStatus: "verified" });
  if (branches.length === 0) {
    // Fallback to base rates if no branches found
    const now = new Date().toISOString();
    return SUPPORTED_CURRENCIES.map((c) => ({
      id: `lp-${city.toLowerCase()}-${c.code}`,
      city,
      currency: c.code,
      bestBuyRate: Math.round((c.baseRate - 0.40) * 100) / 100,
      bestSellRate: Math.round((c.baseRate + 0.50) * 100) / 100,
      bestBranchId: "br-mumbai-01",
      bestBranchName: "FXPertise Central Branch",
      updatedAt: now,
    }));
  }

  const results: LowestPriceItem[] = [];
  const now = new Date().toISOString();

  for (const c of SUPPORTED_CURRENCIES) {
    let bestSellRate = Infinity;
    let bestBuyRate = -Infinity;
    let selectedBranch = branches[0];

    for (const br of branches) {
      const margin = br.margins?.get?.(c.code) ?? br.margins?.[c.code];
      const buyMargin = margin?.buyMargin ?? -0.40;
      const sellMargin = margin?.sellMargin ?? 0.50;

      const calcSellRate = c.baseRate + sellMargin;
      const calcBuyRate = c.baseRate + buyMargin;

      if (calcSellRate < bestSellRate) {
        bestSellRate = calcSellRate;
        bestBuyRate = calcBuyRate;
        selectedBranch = br;
      }
    }

    if (bestSellRate === Infinity) {
      bestSellRate = c.baseRate + 0.50;
      bestBuyRate = c.baseRate - 0.40;
    }

    const item: LowestPriceItem = {
      id: `lp-${city.toLowerCase()}-${c.code}`,
      city,
      currency: c.code,
      bestBuyRate: Math.round(bestBuyRate * 100) / 100,
      bestSellRate: Math.round(bestSellRate * 100) / 100,
      bestBranchId: selectedBranch.id,
      bestBranchName: selectedBranch.name,
      updatedAt: now,
    };

    await LowestPriceModel.findOneAndUpdate(
      { city, currency: c.code },
      { $set: item },
      { upsert: true, new: true }
    );

    results.push(item);
  }

  return results;
}

export async function getLowestRates(city: string = "Mumbai"): Promise<LowestPriceItem[]> {
  await ensureSeedBranches();
  await dbConnect();

  const docs = await LowestPriceModel.find({ city });
  if (docs.length === 0) {
    return recalculateLowestPricesForCity(city);
  }

  return docs.map((d) => ({
    id: d.id,
    city: d.city,
    currency: d.currency,
    bestBuyRate: d.bestBuyRate,
    bestSellRate: d.bestSellRate,
    bestBranchId: d.bestBranchId,
    bestBranchName: d.bestBranchName,
    updatedAt: d.updatedAt,
  }));
}
