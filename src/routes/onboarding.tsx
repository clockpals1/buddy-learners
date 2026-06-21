import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  ArrowRight, ArrowLeft, Check, Sparkles, UserPlus, CreditCard, 
  GraduationCap, Mail, Lock, User, ChevronRight, X, Info, HelpCircle 
} from "lucide-react";
import TutorialSlides from "@/components/onboarding/TutorialSlides";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Get Started · Leafva Academy" },
      { name: "description", content: "Create your account and start your child's learning journey." },
    ],
  }),
  component: OnboardingWizard,
});

type Step = "welcome" | "signup" | "add-kids" | "select-plan" | "complete";

function OnboardingWizard() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("welcome");
  const [loading, setLoading] = useState(false);
  
  // Signup data
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [agreed, setAgreed] = useState(false);
  
  // Kids data
  const [kids, setKids] = useState<Array<{ name: string; age: string; track: string }>>([]);
  const [currentKid, setCurrentKid] = useState({ name: "", age: "", track: "spark_cubs" });
  
  // Plan data
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [showTutorial, setShowTutorial] = useState(false);
  
  const steps: Step[] = ["welcome", "signup", "add-kids", "select-plan", "complete"];
  const currentStepIndex = steps.indexOf(step);
  
  // Fetch plans on mount
  useEffect(() => {
    supabase.from("plans").select("*").eq("is_active", true).order("price_cents").then(({ data }) => {
      setPlans(data ?? []);
    });
  }, []);
  
  async function handleSignup() {
    if (!agreed) {
      toast.error("Please accept the Terms and Privacy Policy");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
        },
      });
      if (error) throw error;
      
      if (data.user) {
        // Create profile record
        await supabase.from("profiles").insert({
          id: data.user.id,
          full_name: fullName,
        });
        
        // Record consents
        await supabase.from("consent_records").insert([
          { parent_id: data.user.id, document_type: "terms", document_version: "v1.0" },
          { parent_id: data.user.id, document_type: "privacy", document_version: "v1.0" },
          { parent_id: data.user.id, document_type: "parental_consent", document_version: "v1.0" },
        ]);
        
        // Assign parent role
        await supabase.from("user_roles").insert({
          user_id: data.user.id,
          role: "parent",
        });
      }
      
      toast.success("Account created!");
      setStep("add-kids");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }
  
  function addKid() {
    if (!currentKid.name || !currentKid.age) {
      toast.error("Please fill in your child's name and age");
      return;
    }
    setKids([...kids, { ...currentKid }]);
    setCurrentKid({ name: "", age: "", track: "spark_cubs" });
  }
  
  function removeKid(index: number) {
    setKids(kids.filter((_, i) => i !== index));
  }
  
  async function handleComplete() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      
      // Add kids to database
      for (const kid of kids) {
        await supabase.from("children").insert({
          parent_id: user.id,
          display_name: kid.name,
          age: parseInt(kid.age),
          track: kid.track as any,
        });
      }
      
      // If plan selected, go to checkout
      if (selectedPlan && selectedPlan !== "free") {
        navigate({ to: "/checkout", search: { plan: selectedPlan } });
      } else {
        navigate({ to: "/portal" });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }
  
  const stepVariants = {
    enter: { x: 50, opacity: 0 },
    center: { x: 0, opacity: 1 },
    exit: { x: -50, opacity: 0 },
  };
  
  return (
    <div className="min-h-dvh bg-gradient-sunrise flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        {/* Help button */}
        <button
          onClick={() => setShowTutorial(true)}
          className="absolute top-4 right-4 p-3 bg-white/20 backdrop-blur rounded-full shadow-lg hover:shadow-xl transition"
        >
          <HelpCircle className="h-6 w-6 text-white" />
        </button>

        {/* Tutorial modal */}
        {showTutorial && <TutorialSlides onClose={() => setShowTutorial(false)} />}

        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {steps.map((s, i) => (
              <div key={s} className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition ${
                  i <= currentStepIndex 
                    ? "bg-white text-coral" 
                    : "bg-white/20 text-white/60"
                }`}>
                  {i < currentStepIndex ? <Check className="h-5 w-5" /> : i + 1}
                </div>
                {i < steps.length - 1 && (
                  <div className={`w-16 h-1 mx-2 transition ${
                    i < currentStepIndex ? "bg-white" : "bg-white/20"
                  }`} />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between text-sm text-white/70">
            <span>Welcome</span>
            <span>Account</span>
            <span>Kids</span>
            <span>Plan</span>
            <span>Done</span>
          </div>
        </div>
        
        {/* Step content */}
        <AnimatePresence mode="wait">
          {step === "welcome" && (
            <motion.div
              key="welcome"
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3 }}
              className="bg-white/10 backdrop-blur rounded-3xl shadow-2xl p-8 md:p-12 text-white"
            >
              <div className="text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring" }}
                  className="w-24 h-24 mx-auto mb-6 bg-white/20 backdrop-blur rounded-full flex items-center justify-center"
                >
                  <Sparkles className="h-12 w-12 text-white" />
                </motion.div>
                <h1 className="text-4xl md:text-5xl font-700 mb-4">
                  Welcome to Leafva Academy
                </h1>
                <p className="text-xl text-white/85 mb-8 max-w-2xl mx-auto">
                  Where curious kids become code-savvy creators through games, AI tutors, and live mentor sessions.
                </p>
                
                <div className="grid md:grid-cols-3 gap-6 mb-8">
                  {[
                    { icon: GraduationCap, title: "3 Learning Tracks", desc: "Tuned to age 6-15" },
                    { icon: User, title: "AI Tutor", desc: "Hints, not answers" },
                    { icon: CreditCard, title: "Flexible Plans", desc: "Start free, upgrade anytime" },
                  ].map((item, i) => (
                    <motion.div
                      key={i}
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.3 + i * 0.1 }}
                      className="p-4 rounded-xl bg-white/10 backdrop-blur"
                    >
                      <item.icon className="h-8 w-8 text-coral mx-auto mb-2" />
                      <h3 className="font-semibold">{item.title}</h3>
                      <p className="text-sm text-white/70">{item.desc}</p>
                    </motion.div>
                  ))}
                </div>
                
                <button
                  onClick={() => setStep("signup")}
                  className="inline-flex items-center gap-2 px-8 py-4 bg-white text-coral rounded-full font-semibold text-lg shadow-pop hover:scale-[1.02] transition"
                >
                  Get Started
                  <ArrowRight className="h-5 w-5" />
                </button>
              </div>
            </motion.div>
          )}
          
          {step === "signup" && (
            <motion.div
              key="signup"
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3 }}
              className="bg-white/10 backdrop-blur rounded-3xl shadow-2xl p-8 md:p-12 text-white"
            >
              <div className="max-w-md mx-auto">
                <h2 className="text-3xl font-700 mb-2">Create your account</h2>
                <p className="text-white/70 mb-8">Enter your details to get started</p>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/50" />
                      <input
                        type="text"
                        placeholder="John Doe"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 rounded-xl border border-white/20 bg-white/10 focus:outline-none focus:ring-2 focus:ring-coral text-white placeholder-white/50"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/50" />
                      <input
                        type="email"
                        placeholder="john@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 rounded-xl border border-white/20 bg-white/10 focus:outline-none focus:ring-2 focus:ring-coral text-white placeholder-white/50"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/50" />
                      <input
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        minLength={8}
                        className="w-full pl-12 pr-4 py-3 rounded-xl border border-white/20 bg-white/10 focus:outline-none focus:ring-2 focus:ring-coral text-white placeholder-white/50"
                      />
                    </div>
                  </div>
                  
                  <label className="flex items-start gap-3 text-sm text-white/70">
                    <input
                      type="checkbox"
                      checked={agreed}
                      onChange={(e) => setAgreed(e.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-white/30 accent-coral"
                    />
                    <span>
                      I am the parent or legal guardian and agree to the{" "}
                      <a href="/terms" className="text-coral hover:underline">Terms</a> and{" "}
                      <a href="/privacy" className="text-coral hover:underline">Privacy Policy</a>
                    </span>
                  </label>
                </div>
                
                <div className="flex gap-4 mt-8">
                  <button
                    onClick={() => setStep("welcome")}
                    className="flex-1 py-3 rounded-xl border border-white/20 font-semibold hover:bg-white/10 transition"
                  >
                    <ArrowLeft className="h-5 w-5 inline mr-2" />
                    Back
                  </button>
                  <button
                    onClick={handleSignup}
                    disabled={loading}
                    className="flex-1 py-3 rounded-xl bg-white text-coral font-semibold shadow-pop hover:scale-[1.02] transition disabled:opacity-50"
                  >
                    {loading ? "Creating..." : "Continue"}
                    <ArrowRight className="h-5 w-5 inline ml-2" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
          
          {step === "add-kids" && (
            <motion.div
              key="add-kids"
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3 }}
              className="bg-white/10 backdrop-blur rounded-3xl shadow-2xl p-8 md:p-12 text-white"
            >
              <div className="max-w-2xl mx-auto">
                <h2 className="text-3xl font-700 mb-2">Add your children</h2>
                <p className="text-white/70 mb-8">Tell us about your kids so we can personalize their learning</p>
                
                {/* Added kids list */}
                {kids.length > 0 && (
                  <div className="mb-6 space-y-3">
                    {kids.map((kid, i) => (
                      <div key={i} className="flex items-center justify-between p-4 bg-white/10 backdrop-blur rounded-xl">
                        <div>
                          <p className="font-semibold">{kid.name}</p>
                          <p className="text-sm text-white/60">Age {kid.age} · {kid.track}</p>
                        </div>
                        <button
                          onClick={() => removeKid(i)}
                          className="p-2 text-coral hover:bg-white/10 rounded-lg transition"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Add kid form */}
                <div className="bg-white/10 backdrop-blur rounded-xl p-6 mb-6">
                  <h3 className="font-semibold mb-4">Add a child</h3>
                  <div className="grid md:grid-cols-3 gap-4">
                    <input
                      type="text"
                      placeholder="Child's name"
                      value={currentKid.name}
                      onChange={(e) => setCurrentKid({ ...currentKid, name: e.target.value })}
                      className="px-4 py-3 rounded-xl border border-white/20 bg-white/10 focus:outline-none focus:ring-2 focus:ring-coral text-white placeholder-white/50"
                    />
                    <input
                      type="number"
                      placeholder="Age"
                      value={currentKid.age}
                      onChange={(e) => setCurrentKid({ ...currentKid, age: e.target.value })}
                      min={6}
                      max={15}
                      className="px-4 py-3 rounded-xl border border-white/20 bg-white/10 focus:outline-none focus:ring-2 focus:ring-coral text-white placeholder-white/50"
                    />
                    <select
                      value={currentKid.track}
                      onChange={(e) => setCurrentKid({ ...currentKid, track: e.target.value })}
                      className="px-4 py-3 rounded-xl border border-white/20 bg-white/10 focus:outline-none focus:ring-2 focus:ring-coral text-white"
                    >
                      <option value="spark_cubs">Spark Cubs (6-9)</option>
                      <option value="code_rangers">Code Rangers (10-12)</option>
                      <option value="cyber_pioneers">Cyber Pioneers (13-15)</option>
                    </select>
                  </div>
                  <button
                    onClick={addKid}
                    className="mt-4 w-full py-3 rounded-xl border-2 border-dashed border-white/30 text-white/70 font-semibold hover:border-coral hover:text-coral transition"
                  >
                    <UserPlus className="h-5 w-5 inline mr-2" />
                    Add Child
                  </button>
                </div>
                
                <div className="flex gap-4">
                  <button
                    onClick={() => setStep("signup")}
                    className="flex-1 py-3 rounded-xl border border-white/20 font-semibold hover:bg-white/10 transition"
                  >
                    <ArrowLeft className="h-5 w-5 inline mr-2" />
                    Back
                  </button>
                  <button
                    onClick={() => setStep("select-plan")}
                    disabled={kids.length === 0}
                    className="flex-1 py-3 rounded-xl bg-white text-coral font-semibold shadow-pop hover:scale-[1.02] transition disabled:opacity-50"
                  >
                    Continue
                    <ArrowRight className="h-5 w-5 inline ml-2" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
          
          {step === "select-plan" && (
            <motion.div
              key="select-plan"
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3 }}
              className="bg-white/10 backdrop-blur rounded-3xl shadow-2xl p-8 md:p-12 text-white"
            >
              <div className="max-w-4xl mx-auto">
                <h2 className="text-3xl font-700 mb-2">Choose your plan</h2>
                <p className="text-white/70 mb-8">Select the best plan for your family</p>
                
                <div className="grid md:grid-cols-3 gap-6 mb-8">
                  {plans.map((plan) => {
                    const isSelected = selectedPlan === plan.slug;
                    const isHighlighted = plan.kind === "family";
                    return (
                      <div
                        key={plan.id}
                        onClick={() => setSelectedPlan(plan.slug)}
                        className={`relative p-6 rounded-2xl border-2 cursor-pointer transition ${
                          isSelected 
                            ? "border-coral bg-white/20" 
                            : isHighlighted 
                              ? "border-white/40 bg-white/10" 
                              : "border-white/20 bg-white/5 hover:border-white/30"
                        }`}
                      >
                        {isHighlighted && (
                          <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-coral text-white text-xs font-semibold rounded-full">
                            Popular
                          </div>
                        )}
                        <h3 className="text-xl font-700 mb-2">{plan.name}</h3>
                        <p className="text-3xl font-700 mb-2">
                          ${(plan.price_cents / 100).toFixed(0)}
                          {plan.kind !== "free" && <span className="text-sm font-normal text-white/60">/month</span>}
                        </p>
                        <p className="text-sm text-white/60 mb-4">{plan.description}</p>
                        {isSelected && (
                          <div className="flex items-center text-coral font-semibold">
                            <Check className="h-5 w-5 mr-2" />
                            Selected
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                
                <div className="flex gap-4">
                  <button
                    onClick={() => setStep("add-kids")}
                    className="flex-1 py-3 rounded-xl border border-white/20 font-semibold hover:bg-white/10 transition"
                  >
                    <ArrowLeft className="h-5 w-5 inline mr-2" />
                    Back
                  </button>
                  <button
                    onClick={handleComplete}
                    disabled={loading || !selectedPlan}
                    className="flex-1 py-3 rounded-xl bg-white text-coral font-semibold shadow-pop hover:scale-[1.02] transition disabled:opacity-50"
                  >
                    {loading ? "Completing..." : "Complete Setup"}
                    <Check className="h-5 w-5 inline ml-2" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
          
          {step === "complete" && (
            <motion.div
              key="complete"
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3 }}
              className="bg-white/10 backdrop-blur rounded-3xl shadow-2xl p-8 md:p-12 text-center text-white"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring" }}
                className="w-24 h-24 mx-auto mb-6 bg-white/20 backdrop-blur rounded-full flex items-center justify-center"
              >
                <Check className="h-12 w-12 text-coral" />
              </motion.div>
              <h2 className="text-3xl font-700 mb-2">You're all set!</h2>
              <p className="text-white/70 mb-8">
                Your account is ready. {kids.length} child{kids.length !== 1 ? "ren have" : " has"} been added.
              </p>
              <button
                onClick={() => navigate({ to: "/portal" })}
                className="inline-flex items-center gap-2 px-8 py-4 bg-white text-coral rounded-full font-semibold text-lg shadow-pop hover:scale-[1.02] transition"
              >
                Go to Dashboard
                <ChevronRight className="h-5 w-5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
