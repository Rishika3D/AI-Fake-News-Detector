import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, User, Mail, Lock, ArrowRight, Loader2 } from "lucide-react";

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true); // Toggle state
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });

  /* ------------------------------ */
  /* HOLOGRAPHIC CURSOR GLOW     */
  /* ------------------------------ */
  useEffect(() => {
    const holo = document.getElementById("holo-auth");
    if (!holo) return;
    const move = (e) => {
      holo.style.left = `${e.clientX}px`;
      holo.style.top = `${e.clientY}px`;
      holo.style.transform = `translate(-50%, -50%)`;
    };
    window.addEventListener("mousemove", move);
    return () => window.removeEventListener("mousemove", move);
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Mock API Call
    setTimeout(() => {
      console.log(isLogin ? "Logging in..." : "Signing up...", formData);
      setLoading(false);
      // Here you would redirect the user or save the token
    }, 1500);
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4">
      {/* Unique ID for Auth page holo to avoid conflicts if rendered together */}
      <div id="holo-auth" className="holo-light"></div>

      <motion.div
        initial={{ opacity: 0, y: 25 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-xl relative z-[10]"
      >
        <div className="text-center mb-10">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center justify-center size-20 rounded-3xl shadow-xl bg-[#030213]"
          >
            <Shield className="size-10 text-white" />
          </motion.div>
          <h1 className="text-4xl font-medium tracking-tight mt-4">
            {isLogin ? "Welcome Back" : "Join VeriNews"}
          </h1>
          <p className="text-muted-foreground mt-2">
            {isLogin 
              ? "Authenticate to access the verification engine." 
              : "Create an account to start analyzing content."}
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="bg-card rounded-2xl shadow-xl p-8 border border-border backdrop-blur-md"
        >
          {/* Toggle between Login and Signup */}
          <div className="flex bg-muted p-1 rounded-lg mb-8">
            <button
              className={`flex-1 py-2 rounded-md text-sm font-medium transition ${
                isLogin ? "bg-card shadow text-foreground" : "text-muted-foreground"
              }`}
              onClick={() => setIsLogin(true)}
            >
              Login
            </button>
            <button
              className={`flex-1 py-2 rounded-md text-sm font-medium transition ${
                !isLogin ? "bg-card shadow text-foreground" : "text-muted-foreground"
              }`}
              onClick={() => setIsLogin(false)}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <AnimatePresence mode="popLayout">
              {/* Name Field (Only for Sign Up) */}
              {!isLogin && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <label className="font-medium block mb-2">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-4 top-3.5 size-5 text-muted-foreground" />
                    <input
                      name="name"
                      type="text"
                      placeholder="Agent Smith"
                      required
                      className="w-full bg-input-background border border-border rounded-lg pl-12 pr-4 py-3 focus:ring-2 focus:ring-primary outline-none"
                      value={formData.name}
                      onChange={handleChange}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Email Field */}
            <div>
              <label className="font-medium block mb-2">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-3.5 size-5 text-muted-foreground" />
                <input
                  name="email"
                  type="email"
                  placeholder="name@example.com"
                  required
                  className="w-full bg-input-background border border-border rounded-lg pl-12 pr-4 py-3 focus:ring-2 focus:ring-primary outline-none"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="font-medium block mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-3.5 size-5 text-muted-foreground" />
                <input
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  required
                  className="w-full bg-input-background border border-border rounded-lg pl-12 pr-4 py-3 focus:ring-2 focus:ring-primary outline-none"
                  value={formData.password}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="mt-4 w-full bg-primary text-primary-foreground py-3 rounded-lg text-base font-medium hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 className="animate-spin size-5" />
              ) : (
                <>
                  {isLogin ? "Access System" : "Create Account"}
                  <ArrowRight className="size-5" />
                </>
              )}
            </button>
          </form>

          {/* Footer Text */}
          <div className="mt-6 text-center text-sm text-muted-foreground">
            {isLogin ? "Forgot your password? " : "By joining, you agree to our "}
            <a href="#" className="text-primary font-medium hover:underline">
              {isLogin ? "Reset credentials" : "Terms of Service"}
            </a>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default AuthPage;