"use client";

import { useParams } from "next/navigation";

export default function StockDetailPage() {
  const params = useParams();
  const symbol = String(params.symbol || "AAPL").toUpperCase();

  return (
    <main className="w-full h-screen bg-background">
      <iframe
        src={`/stock-detail.html?symbol=${symbol}`}
        title={`${symbol} Stock Detail`}
        className="w-full h-full border-0"
      />
    </main>
  );
}