"use client";

export default function Home() {
  return (
    <main className="min-h-screen bg-black">
      <iframe
        src="/dashboard.html"
        title="MarketWatch AI Dashboard"
        className="h-screen w-full border-0"
      />
    </main>
  );
}