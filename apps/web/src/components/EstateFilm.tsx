export function EstateFilm() {
  return (
    <section className="bg-evergreen py-20 text-ivory">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <p className="text-[11px] uppercase tracking-[0.28em] text-ivory/70">The estate film</p>
        <h2 className="mt-3 font-serif text-4xl md:text-5xl">The farm, as filmed</h2>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ivory/75">
          Aerial footage of the V-Farms guest building, plantation, and countryside. This is the original estate film,
          shown here rather than behind the homepage hero.
        </p>
        <div className="mt-8 overflow-hidden rounded-3xl bg-forest">
          <video
            className="aspect-video w-full object-cover"
            controls
            playsInline
            preload="metadata"
            poster="/images/estate/hero-poster.jpg"
            aria-label="Original aerial film of the V-Farms estate"
          >
            <source src="/videos/vfarms-resort.mp4" type="video/mp4" />
          </video>
        </div>
      </div>
    </section>
  );
}
