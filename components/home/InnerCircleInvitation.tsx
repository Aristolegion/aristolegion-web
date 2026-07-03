import { Container } from "@/components/layout/Container";
import { Section } from "@/components/layout/Section";
import { Card } from "@/components/ui/Card";
import { SectionHeading } from "@/components/ui/SectionHeading";

export function InnerCircleInvitation() {
  return (
    <Section id="inner-circle" background="navy">
      <Container>
        <Card tone="navy" className="mx-auto max-w-2xl p-8 text-center md:p-12">
          <SectionHeading
            eyebrow="The Inner Circle"
            title="An Application-Based Cohort"
            description="Membership is by application, not subscription. The Inner Circle follows a deliberate path — application, selection, cohort, learning experience, and community — for individuals ready to deepen their judgment and capability alongside serious peers."
            tone="navy"
          />
        </Card>
      </Container>
    </Section>
  );
}
