import Link from "next/link";
import Image from "next/image";
import { Container } from "@/components/layout/Container";
import { Section } from "@/components/layout/Section";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { libraryItems } from "@/lib/content/homepage";

export function Library() {
  return (
    <Section id="library" background="navy">
      <Container>
        <Eyebrow className="mb-4">The Library</Eyebrow>
        <h2 className="font-display text-balance text-3xl font-semibold text-ivory md:text-5xl">
          Library
        </h2>
        <p className="mt-6 max-w-2xl font-body text-base text-ivory-muted">
  A curated collection of research publications, executive journals,
  essays, and intellectual works exploring capability, judgment,
  authority, resilience, and human excellence.
</p>

        <ul className="mt-12 grid gap-8 md:grid-cols-2 xl:grid-cols-3">
  {libraryItems.map((item) => (
 <li
 key={item.id}
 className="group overflow-hidden border border-gold-muted bg-navy-elevated transition-all duration-300 hover:-translate-y-1 hover:border-gold"
>
 <Link href={item.href}>

   <div className="relative aspect-[3/4] overflow-hidden">
     <Image
       src={item.image}
       alt={item.title}
       fill
       className="object-cover transition-transform duration-500 group-hover:scale-105"
     />
   </div>

   <div className="p-6">
     <span>{item.category}</span>

     <h3>{item.title}</h3>

     <p>{item.description}</p>

     <div>
       Explore →
     </div>
   </div>

 </Link>
</li>
  ))}
</ul>
      </Container>
    </Section>
  );
}
