import { ArrowRight } from "lucide-react";
import { Link } from "@tanstack/react-router";

export default function Register() {
  return (
    <section id="register" className="py-24 px-6">
      <div className="mx-auto max-w-4xl rounded-3xl bg-gradient-sunrise p-10 md:p-16 text-white shadow-pop relative overflow-hidden">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-white/15 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-indigo/30 blur-3xl" />
        <div className="relative">
          <h2 className="text-4xl md:text-5xl font-700">Ready to start the adventure?</h2>
          <p className="mt-4 text-lg text-white/90 max-w-xl">
            Create a parent account, add your child's profile, pick a track. Takes about
            two minutes. No card required to look around.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/onboarding"
              className="inline-flex h-12 items-center gap-2 px-6 rounded-full bg-white text-coral font-semibold shadow-pop hover:scale-[1.03] transition"
            >
              Get Started Free
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/auth"
              className="inline-flex h-12 items-center px-6 rounded-full border border-white/40 text-white font-medium hover:bg-white/10 transition"
            >
              I already have an account
            </Link>
          </div>
          <p className="mt-6 text-xs text-white/70">
            By signing up you agree to our Terms & Privacy Policy and confirm you are the
            parent or legal guardian of the child being enrolled.
          </p>
        </div>
      </div>
    </section>
  );
}
