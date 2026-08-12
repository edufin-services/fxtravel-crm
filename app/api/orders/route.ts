import { NextRequest, NextResponse } from "next/server";
import { COMPLIANCE_LIMITS } from "@/lib/constants";
import { createForexOrder } from "@/lib/db";
import { getLowestRates } from "@/lib/lowest-price-service";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const {
    name,
    email,
    phone,
    serviceType,
    sourceCurrency = "INR",
    targetCurrency = "USD",
    sourceAmount,
    targetAmount,
    city = "Mumbai",
    fulfillmentType = "doorstep",
    deliveryAddress,
    panNumber,
    passportNumber,
    lrsPurpose,
    travelDate,
  } = body ?? {};

  if (!name || !email || !phone) {
    return NextResponse.json({ error: "Name, email, and phone number are required." }, { status: 400 });
  }

  if (!sourceAmount || Number(sourceAmount) <= 0) {
    return NextResponse.json({ error: "Please specify a valid transaction amount." }, { status: 400 });
  }

  // 1. Compliance Check: Pay on Delivery ₹49,999 Cap
  if (fulfillmentType === "doorstep" && Number(sourceAmount) > COMPLIANCE_LIMITS.PAY_ON_DELIVERY_INR_CAP) {
    return NextResponse.json(
      {
        error: `Pay-on-Delivery cash limit exceeded. Transactions over ₹${COMPLIANCE_LIMITS.PAY_ON_DELIVERY_INR_CAP.toLocaleString(
          "en-IN"
        )} require prepaid online bank transfer.`,
      },
      { status: 400 }
    );
  }

  // 2. Compliance Check: Physical Cash Notes $3,000 USD Limit
  if (serviceType === "Currency Exchange" && targetCurrency === "USD" && Number(targetAmount) > COMPLIANCE_LIMITS.CASH_NOTES_USD_CAP) {
    return NextResponse.json(
      {
        error: `RBI rules restrict physical currency note purchases to $${COMPLIANCE_LIMITS.CASH_NOTES_USD_CAP.toLocaleString(
          "en-US"
        )} USD per trip. Please load the remainder onto a multi-currency Forex Card.`,
      },
      { status: 400 }
    );
  }

  // 3. Compliance Check: LRS $250k Limit for Outward Remittance
  if (serviceType === "Outward Remittance" && Number(targetAmount) > COMPLIANCE_LIMITS.LRS_ANNUAL_USD_CAP) {
    return NextResponse.json(
      { error: `Transaction exceeds the RBI LRS annual limit of $${COMPLIANCE_LIMITS.LRS_ANNUAL_USD_CAP.toLocaleString("en-US")} USD per individual.` },
      { status: 400 }
    );
  }

  try {
    // Determine best vendor branch in selected city
    const rates = await getLowestRates(city);
    const matchedRate = rates.find((r) => r.currency === targetCurrency);
    const assignedBranchId = matchedRate?.bestBranchId || "br-mumbai-01";
    const assignedBranchName = matchedRate?.bestBranchName || "FXPertise Fort Branch (Main)";
    const exchangeRate = matchedRate?.bestSellRate || 86.50;

    const order = await createForexOrder({
      name,
      email,
      phone,
      serviceType: serviceType || "Currency Exchange",
      sourceCurrency,
      targetCurrency,
      exchangeRate,
      sourceAmount: Number(sourceAmount),
      targetAmount: Number(targetAmount || (Number(sourceAmount) / exchangeRate).toFixed(2)),
      city,
      fulfillmentType,
      deliveryAddress,
      panNumber,
      passportNumber,
      lrsPurpose,
      travelDate,
      assignedBranchId,
      assignedBranchName,
      stage: "Connected",
      channel: "Email",
      value: Number(sourceAmount),
    });

    return NextResponse.json({ success: true, order });
  } catch (err) {
    console.error("[api/orders] Failed to create order:", err);
    return NextResponse.json({ error: "Failed to place forex order. Please try again." }, { status: 500 });
  }
}
