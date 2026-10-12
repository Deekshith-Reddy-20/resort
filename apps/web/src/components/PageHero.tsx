export function PageHero({
  title,
  kicker,
  body,
  image = "/images/estate/vfarms_4k_hdr_style_09.jpg",
}: {
  title: string;
  kicker?: string;
  body?: string;
  image?: string;
}) {
  return (
    <header className="relative overflow-hidden bg-evergreen px-4 py-24 text-ivory md:px-6 md:py-28">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={image} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover opacity-40" />
      <div className="absolute inset-0 bg-evergreen/70" />
      <div className="relative mx-auto max-w-5xl">
        {kicker ? <p className="text-[11px] uppercase tracking-[0.3em] text-ivory/70">{kicker}</p> : null}
        <h1 className="mt-3 max-w-3xl font-serif text-4xl leading-tight sm:text-5xl md:text-6xl">{title}</h1>
        {body ? <p className="mt-5 max-w-2xl text-base leading-relaxed text-ivory/85 md:text-lg">{body}</p> : null}
      </div>
    </header>
  );
}
