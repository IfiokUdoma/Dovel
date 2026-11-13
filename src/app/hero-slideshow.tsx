"use client";

import { useEffect, useState } from "react";

type FeaturedStory = {
  id: string;
  title: string;
  genre: string;
  synopsis: string | null;
  poster_url: string | null;
};

export function HeroSlideshow({ stories }: { stories: FeaturedStory[] }) {
  const slides = stories.filter((story) => story.poster_url);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (slides.length < 2) return;
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % slides.length);
    }, 3000);
    return () => window.clearInterval(timer);
  }, [slides.length]);

  const featured = slides[activeIndex];

  return (
    <div className="relative isolate flex min-h-[470px] items-end overflow-hidden rounded-2xl border border-white/10 bg-[#1b1010] sm:min-h-[540px]">
      {slides.map((story, index) => (
        <img
          key={story.id}
          src={story.poster_url ?? ""}
          alt=""
          aria-hidden="true"
          className={`absolute inset-0 -z-20 h-full w-full object-cover object-center transition-opacity duration-700 ${index === activeIndex ? "opacity-100" : "opacity-0"}`}
          fetchPriority={index === 0 ? "high" : "auto"}
        />
      ))}
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-black via-black/80 to-black/15" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/90 via-transparent to-black/15" />
      <div className="max-w-2xl px-6 py-10 sm:px-12 sm:py-14">
        <div className="mb-5 flex items-center gap-2 text-[10px] font-bold tracking-[.24em] text-[#f5b942]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#f5b942]" />
          {featured ? "FEATURED ON DOVEL" : "THE FUTURE OF STORYTELLING"}
        </div>
        {featured ? (
          <>
            <p className="mb-3 text-xs font-bold tracking-[.2em] text-white/60">DOVEL ORIGINAL • {featured.genre}</p>
            <h1 className="max-w-xl text-4xl font-black leading-[1.04] tracking-[-1.8px] sm:text-6xl">{featured.title}</h1>
            <p className="mt-5 line-clamp-3 max-w-lg text-sm leading-6 text-white/75">{featured.synopsis || "Discover an original AI-powered story, only on Dovel."}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a href={`/watch/${featured.id}`} className="btn-primary">▶ &nbsp; Watch now</a>
              <a href="/explore" className="btn-quiet">＋ &nbsp; Explore stories</a>
            </div>
            {slides.length > 1 && (
              <div className="mt-7 flex items-center gap-2" aria-label="Featured stories">
                {slides.map((story, index) => (
                  <button
                    key={story.id}
                    type="button"
                    onClick={() => setActiveIndex(index)}
                    aria-label={`Show ${story.title}`}
                    aria-current={index === activeIndex}
                    className={`h-1.5 rounded-full transition-all ${index === activeIndex ? "w-8 bg-[#f5b942]" : "w-3 bg-white/40 hover:bg-white/70"}`}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <p className="mb-3 text-xs font-bold tracking-[.2em] text-white/50">DOVEL ORIGINALS PRESENT</p>
            <h1 className="text-4xl font-black leading-[1.04] tracking-[-1.8px] sm:text-6xl">Stories beyond <span className="text-[#ef625b]">imagination.</span></h1>
            <p className="mt-5 max-w-md text-sm leading-6 text-white/65">Enter a new world of AI-powered films, bite-sized dramas and original stories made to keep you watching.</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a href="/explore" className="btn-primary">▶ &nbsp; Explore stories</a>
              <a href="/studio" className="btn-quiet">＋ &nbsp; Create on Dovel</a>
            </div>
          </>
        )}
        <div className="mt-8 flex flex-wrap items-center gap-4 text-[9px] font-semibold tracking-[.18em] text-white/50 sm:gap-5">
          <span>AI ORIGINALS</span><span>•</span><span>MICRO-DRAMAS</span><span>•</span><span>MADE FOR YOU</span>
        </div>
      </div>
    </div>
  );
}
