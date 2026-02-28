"use client";

import Link from "next/link";
import { Building2, BadgeDollarSign, ArrowRight } from "lucide-react";

type Card = {
  href: string;
  title: string;
  desc: string;
  count: string | number;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
};

export function QuickAccessCards({ cards }: { cards: Card[] }) {
  return (
    <div>
      <h3 className="text-lg font-semibold text-[#0F172A]">Accesos rápidos</h3>
      <div className="mt-4 grid gap-6 sm:grid-cols-2">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.href}
              href={card.href}
              className="group relative flex flex-col rounded-[20px] border border-[#E2E8F0] bg-white p-8 shadow-[0_8px_20px_rgba(0,0,0,0.05)] transition-all duration-180 ease-out hover:-translate-y-1 hover:border-[#EF4444]/30 hover:shadow-md"
            >
              <span className="absolute right-6 top-6 flex h-10 w-10 items-center justify-center rounded-full bg-[#F1F5F9] text-sm font-bold text-[#0F172A]">
                {card.count}
              </span>
              <div
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl"
                style={{ backgroundColor: card.iconBg }}
              >
                <Icon className="h-7 w-7" style={{ color: card.iconColor }} />
              </div>
              <h4 className="mt-6 text-lg font-semibold text-[#0F172A] group-hover:text-[#EF4444]">
                {card.title}
              </h4>
              <p className="mt-2 flex-1 text-sm text-[#64748B]">{card.desc}</p>
              <span className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-[#EF4444] transition group-hover:gap-3">
                Ir a módulo
                <ArrowRight className="h-4 w-4" />
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
