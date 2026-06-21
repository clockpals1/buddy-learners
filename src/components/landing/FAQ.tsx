import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    q: "Is this actually safe for my kid?",
    a: "Yes. We collect only what we need (a username and age — never real photos), every AI chat is moderated before anyone else sees it, and we follow a COPPA-style verifiable parental consent flow before any data is collected.",
  },
  {
    q: "How much screen time per week?",
    a: "Plan on 2–4 hours/week: one live session plus self-paced games. Kids can do more if they want, but the curriculum doesn't depend on long sessions.",
  },
  {
    q: "What if my child has never coded?",
    a: "Most haven't. The Spark Cubs and Code Rangers tracks start from zero — drag-and-drop blocks, story-driven games, and a friendly AI tutor that gives hints, not answers.",
  },
  {
    q: "Can siblings share an account?",
    a: "Each child gets their own profile (and their own progress, badges, projects), but you manage them all from one parent account. Sibling discount auto-applies at checkout.",
  },
  {
    q: "What do you use AI for?",
    a: "An AI Teaching Assistant gives age-appropriate hints, generates practice problems at the right difficulty, and drafts weekly progress emails for parents. Instructors always approve before anything goes to your kid.",
  },
];

export default function FAQ() {
  return (
    <section id="faq" className="py-24 px-6 bg-muted/40">
      <div className="mx-auto max-w-3xl">
        <p className="text-sm font-semibold text-indigo uppercase tracking-wider">FAQ</p>
        <h2 className="mt-3 text-4xl md:text-5xl font-700">Parent questions, answered.</h2>
        <Accordion type="single" collapsible className="mt-10">
          {faqs.map((f, i) => (
            <AccordionItem key={i} value={`q-${i}`}>
              <AccordionTrigger className="text-left text-lg font-600">
                {f.q}
              </AccordionTrigger>
              <AccordionContent className="text-base text-muted-foreground">
                {f.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
