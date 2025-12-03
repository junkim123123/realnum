import Hero from "./(sections)/hero"
import ProductAnalyzer from "./(sections)/product-analyzer"
import HowItWorks from "./(sections)/how-it-works"
import WhoIsThisFor from "./(sections)/who-is-this-for"
import Footer from "./(sections)/footer"
import Link from 'next/link'

export default function Home({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  const source = searchParams?.source as string || 'direct';

  return (
    <main>
      <Hero />
      <ProductAnalyzer source={source} />
      <HowItWorks />
      <WhoIsThisFor />
      <Footer />
    </main>
  )
}

