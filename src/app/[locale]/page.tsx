// src/app/[locale]/page.tsx
"use client";

import { DailyMoodPreview } from "@/app/(components)/daily-mood-preview";
import { FeaturesGrid } from "@/app/(components)/features-grid";
import { Footer } from "@/app/(components)/footer";
import { Hero } from "@/app/(components)/hero";
import { Navbar } from "@/app/(components)/nav-bar";
import { useState } from "react";

export default function Page() {
  const [lockedMood, setLockedMood] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-background transition-colors duration-500">
      <Navbar />
      <Hero lockedMood={lockedMood} />
      <DailyMoodPreview onMoodSelect={setLockedMood} />
      <FeaturesGrid />
      <Footer />
    </div>
  );
}
