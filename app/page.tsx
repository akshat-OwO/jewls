"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  ArrowRight,
} from "lucide-react";

export default function Home() {
  return (
    <div className="bg-gradient-to-br from-purple-50 via-white to-pink-50">
      {/* Hero Section */}
      <section className="relative px-4 pt-20 text-center">
        <div className="mx-auto max-w-4xl">
          <Badge variant="outline" className="mb-6 px-4 py-2">
            ✨ AI-Powered Virtual Try-On Technology
          </Badge>

          <h1 className="mb-6 text-5xl font-bold tracking-tight text-gray-900 sm:text-6xl">
            Transform Your Jewelry
            <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              {" "}with AI Magic
            </span>
          </h1>

          <p className="mb-8 text-xl text-gray-600 max-w-2xl mx-auto">
            See how any jewelry piece looks on you instantly. Upload your jewelry images
            and let our AI create stunning, realistic try-on experiences in seconds.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button size="lg" asChild className="px-8 py-3">
              <Link href="/try-on">
                <Sparkles className="mr-2 h-5 w-5" />
                Start Creating
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
