import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, User, Mail, Lock, ArrowRight, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    username: "", // Changed from 'name' to 'username' to match your backend
    email: "",
    password: "",
  });

  /* Holographic Cursor Effect */
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

    // 1. Determine Endpoint based on mode
    // Assuming you mounted your auth routes at /api/auth
    const endpoint = isLogin 
      ? "http://localhost:5050/api/auth/login" 
      : "http://localhost:5050/api/auth/signup";

    try {
      // 2. Prepare payload (Signup needs username, Login doesn't)
      const payload = isLogin 
        ? { email: formData.email, password: formData.password }
        : { username: formData.username, email: formData.email, password: formData.password };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Authentication failed");
      }

      // 3. Handle Success
      if (isLogin) {
        // Store Token AND User ID (Required for your analyze endpoint)
        localStorage.setItem("token", data.token);
        localStorage.setItem("userId", data.user.id); 
        localStorage.setItem("username", data.user.username);
        
        navigate("/dashboard");
      } else {
        alert("Account created! Please log in.");
        setIsLogin(true); // Switch to login view
      }

    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 overflow-hidden">
      <div id="holo-auth" className="holo-light"></div>

      <motion.div
        initial={{ opacity: 0, y: 25 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-[10]"
      >
        <div className="text-center mb-8">
          <motion.div 
            whileHover={{ scale: 1.05 }}
            className="inline-flex items-center justify-center size-16 rounded-2xl shadow-xl bg-primary mb-4"
          >
            <Shield className="size-8 text-white" />
          </motion.div>
          <h1 className="text-3xl font-medium tracking-tight">VeriNews AI</h1>
          <p className="text-muted-foreground mt-2">Identity Verification</p>
        </div>

        <div className="bg-card rounded-2xl shadow-2xl p-8 border border-border backdrop-blur-xl">
          {/* Toggle Buttons */}
          <div className="flex bg-muted p-1 rounded-lg mb-6">
            <button
              className={`flex-1 py-2 rounded-md text-sm font-medium transition ${isLogin ? "bg-card shadow text-foreground" : "text-muted-foreground"}`}
              onClick={() => setIsLogin(true)}
            >
              Login
            </button>
            <button
              className={`flex-1 py-2 rounded-md text-sm font-medium transition ${!isLogin ? "bg-card shadow text-foreground" : "text-muted-foreground"}`}
              onClick={() => setIsLogin(false)}
            >
              Register
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
             <AnimatePresence mode="popLayout">
              {!isLogin && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                  <div className="relative">
                    <User className="absolute left-4 top-3.5 size-5 text-muted-foreground" />
                    <input 
                      name="username" 
                      type="text" 
                      placeholder="Username" 
                      required={!isLogin} // Only required for signup
                      className="w-full bg-input-background border border-border rounded-lg pl-12 pr-4 py-3 focus:ring-2 focus:ring-primary outline-none" 
                      onChange={handleChange} 
                      value={formData.username}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="relative">
              <Mail className="absolute left-4 top-3.5 size-5 text-muted-foreground" />
              <input name="email" type="email" placeholder="Email" required className="w-full bg-input-background border border-border rounded-lg pl-12 pr-4 py-3 focus:ring-2 focus:ring-primary outline-none" onChange={handleChange} value={formData.email} />
            </div>

            <div className="relative">
              <Lock className="absolute left-4 top-3.5 size-5 text-muted-foreground" />
              <input name="password" type="password" placeholder="Password" required className="w-full bg-input-background border border-border rounded-lg pl-12 pr-4 py-3 focus:ring-2 focus:ring-primary outline-none" onChange={handleChange} value={formData.password} />
            </div>

            <button type="submit" disabled={loading} className="mt-2 w-full bg-primary text-primary-foreground py-3 rounded-lg font-medium hover:opacity-90 transition flex items-center justify-center gap-2">
              {loading ? <Loader2 className="animate-spin size-5" /> : <>{isLogin ? "Enter System" : "Create Account"} <ArrowRight className="size-5" /></>}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

export default AuthPage;