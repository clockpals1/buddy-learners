import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight, Info, GraduationCap, User, CreditCard, Sparkles } from "lucide-react";

interface TutorialSlidesProps {
  onClose: () => void;
}

const slides = [
  {
    icon: GraduationCap,
    title: "Welcome to Leafva Academy",
    description: "We're here to help your child learn coding, AI, and cybersecurity through fun games and interactive lessons.",
    color: "from-indigo-500 to-purple-500",
  },
  {
    icon: User,
    title: "Add Your Children",
    description: "Tell us about your kids - their names and ages. We'll use this to personalize their learning experience with age-appropriate content.",
    color: "from-coral-500 to-orange-500",
  },
  {
    icon: CreditCard,
    title: "Choose Your Plan",
    description: "Start with our free plan to explore, or upgrade to unlock all features including live mentor sessions and AI tutoring.",
    color: "from-green-500 to-teal-500",
  },
  {
    icon: Sparkles,
    title: "Start Learning",
    description: "Once setup is complete, your child can start their learning journey with games, lessons, and live sessions!",
    color: "from-pink-500 to-rose-500",
  },
];

export default function TutorialSlides({ onClose }: TutorialSlidesProps) {
  const [currentSlide, setCurrentSlide] = useState(0);

  const nextSlide = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      onClose();
    }
  };

  const prevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Info className="h-5 w-5 text-indigo-500" />
            <span className="font-semibold">Quick Guide</span>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Slides */}
        <div className="p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide}
              initial={{ x: 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -50, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="text-center"
            >
              {(() => {
                const Icon = slides[currentSlide].icon;
                return (
                  <>
                    <div className={`w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br ${slides[currentSlide].color} flex items-center justify-center`}>
                      <Icon className="h-10 w-10 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold mb-3">{slides[currentSlide].title}</h3>
                    <p className="text-gray-600">{slides[currentSlide].description}</p>
                  </>
                );
              })()}
            </motion.div>
          </AnimatePresence>

          {/* Progress dots */}
          <div className="flex justify-center gap-2 mt-8">
            {slides.map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition ${
                  i === currentSlide ? "bg-indigo-500 w-6" : "bg-gray-300"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t bg-gray-50">
          <button
            onClick={prevSlide}
            disabled={currentSlide === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </button>
          <button
            onClick={nextSlide}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-500 text-white hover:bg-indigo-600 transition"
          >
            {currentSlide === slides.length - 1 ? "Got it!" : "Next"}
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </motion.div>
    </div>
  );
}
