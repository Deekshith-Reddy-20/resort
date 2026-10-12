import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="font-serif text-4xl">Page not found</h1>
      <p className="mt-3 text-forest/70">That path is not part of the V-Farms site.</p>
      <Link href="/" className="mt-6 inline-block text-dragon">
        Return home
      </Link>
    </main>
  );
}
