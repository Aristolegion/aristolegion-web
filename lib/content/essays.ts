import type { Essay } from "./types";

export const essays: Essay[] = [
  {
    slug: "judgment-in-the-age-of-information-abundance",
    title: "Judgment in the Age of Information Abundance",
    subtitle:
      "More information was supposed to make decisions easier. It has made judgment more valuable, not less necessary.",
    category: "Judgment",
    author: "Uday Anshuman",
    publishDate: "2026-03-10",
    readingTime: "5 min read",
    excerpt:
      "Information abundance did not solve the judgment problem — it revealed how large that problem always was.",
    sections: [
      {
        heading: "The Abundance Problem",
        paragraphs: [
          "There has never been more information available to more people, and there has rarely been less consensus about what any of it means. The scarce resource was supposed to be data. It turned out to be judgment — the capacity to weigh evidence, discount noise, and decide well under uncertainty.",
          "This is not a nostalgia essay. Information abundance is, on balance, a genuine gain. But it has quietly shifted where the real advantage lives: not in who has access to more information, but in who can process it into better decisions faster than everyone else drowning in the same feed.",
        ],
      },
      {
        heading: "Why More Data Rarely Means Better Decisions",
        paragraphs: [
          "Give a person twice as much information and, past a certain point, you do not get twice as much clarity. You get twice as much to sort, weigh, and discard — and most people were never taught how to do that sorting well. The result is a strange paradox: institutions and individuals awash in data, making decisions that are, if anything, slower and more anxious than a generation ago.",
        ],
        quote:
          "Abundance did not solve the judgment problem. It revealed how large the judgment problem always was.",
      },
      {
        heading: "Judgment as a Trainable Discipline",
        paragraphs: [
          "The encouraging finding, if there is one, is that judgment is not a fixed trait. It behaves more like a compounding skill — built through deliberate exposure to real decisions, honest feedback, and the willingness to be wrong in public before you are right in private.",
          "Aristolegion treats this as a founding premise: an institution that helps people practice judgment deliberately has more to offer, in an age of abundance, than one more feed optimized for engagement.",
        ],
      },
      {
        heading: "A Closing Thought",
        paragraphs: [
          "The individuals and institutions that thrive from here will not be the ones with the most information. They will be the ones who built, deliberately and over time, the judgment to know what to do with it.",
        ],
      },
    ],
  },
  {
    slug: "capability-over-credentials",
    title: "Capability Over Credentials",
    subtitle:
      "Credentials were always a proxy for capability. The proxy is breaking down faster than most institutions are willing to admit.",
    category: "Capability",
    author: "Uday Anshuman",
    publishDate: "2026-05-05",
    readingTime: "5 min read",
    excerpt:
      "A credential is a claim, not a demonstration — and the gap between the two is widening.",
    sections: [
      {
        heading: "The Proxy Problem",
        paragraphs: [
          "A credential is a claim, not a demonstration. For most of the last century, that distinction did not matter much, because credentials were scarce enough to function as a reasonably reliable proxy for capability. That scarcity is gone.",
          "What remains is a widening fracture between what a degree or certificate certifies and what a role actually requires — a fracture serious enough to warrant its own research, and serious enough that it will not close on its own.",
        ],
      },
      {
        heading: "Why the Old Signal Is Failing",
        paragraphs: [
          "Credential issuance has expanded far faster than demonstrated capability. When everyone has the credential, the credential stops discriminating — and employers know it, even when their hiring processes have not yet caught up.",
        ],
        quote:
          "A signal that everyone can obtain is no longer a signal. It is a cost of entry.",
      },
      {
        heading: "What Replaces the Credential",
        paragraphs: [
          "The replacement is not a better credential. It is a better instrument for demonstrating capability directly — through published work, applied judgment, and a track record that can be inspected rather than merely claimed.",
          "This is a slower path than collecting certificates. It is also, for the individuals willing to walk it, a far more durable one.",
        ],
      },
      {
        heading: "A Closing Thought",
        paragraphs: [
          "Capability compounds. Credentials expire the moment the next cohort catches up. Institutions and individuals who understand the difference now will have a meaningful head start over those who do not.",
        ],
      },
    ],
  },
  {
    slug: "the-return-of-deep-work",
    title: "The Return of Deep Work",
    subtitle:
      "The future of work will not reward whoever responds fastest. It will reward whoever can still think clearly when everyone else cannot.",
    category: "Future of Work",
    author: "Uday Anshuman",
    publishDate: "2026-06-25",
    readingTime: "5 min read",
    excerpt:
      "As fragmented, shallow work is automated away, sustained attention becomes the scarcest competitive advantage.",
    sections: [
      {
        heading: "The Fragmentation of Attention",
        paragraphs: [
          "Most modern work is now organized around interruption: notifications, meetings scheduled in the gaps between other meetings, and a general expectation of continuous availability. The cost is rarely measured directly, because it does not show up as a single dramatic failure. It shows up as a slow erosion of the capacity for sustained, difficult thought.",
          "That erosion is expensive. The work that actually compounds — research, writing, strategy, judgment — has never rewarded fragmented attention. It has only ever rewarded depth.",
        ],
      },
      {
        heading: "Why Depth Is Becoming a Competitive Advantage",
        paragraphs: [
          "As automation and AI absorb more of the fragmented, shallow, easily-specified work, what remains disproportionately valuable is the kind of thinking that cannot be rushed or parallelized: original analysis, careful writing, and judgment formed over long, uninterrupted stretches of attention.",
        ],
        quote:
          "The scarcest resource in a distracted economy is not time. It is the capacity to use time well.",
      },
      {
        heading: "Rebuilding the Capacity for Depth",
        paragraphs: [
          "Deep work is a trained capacity, not a personality trait. It degrades with disuse and strengthens with deliberate practice — long blocks of undistracted attention, applied consistently, to work that actually matters.",
          "Aristolegion treats this as more than a productivity tactic. It is close to a precondition for the kind of judgment and capability the institution exists to cultivate.",
        ],
      },
      {
        heading: "A Closing Thought",
        paragraphs: [
          "The professionals who will matter most over the next decade will not be the ones who answered fastest. They will be the ones who could still think clearly, at length, after everyone else had stopped trying.",
        ],
      },
    ],
  },
];

export function getEssay(slug: string): Essay | undefined {
  return essays.find((essay) => essay.slug === slug);
}

export function getRelatedEssays(slug: string, limit = 3): Essay[] {
  return essays.filter((essay) => essay.slug !== slug).slice(0, limit);
}
