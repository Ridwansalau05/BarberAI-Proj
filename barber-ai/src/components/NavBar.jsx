import React from "react";
import { Scissors } from "lucide-react";
import { Link } from "react-router-dom";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 text-white border-b border-white/10 bg-gradient-to-b from-[#203149] to-[#0f1b2d]">
      <div className="w-full h-14 flex items-center justify-between px-10">

        <Link to="/" className="flex items-center gap-2 text-white">
          <Scissors className="h-6 w-6 text-brand-gold" />
          <span className="text-lg font-semibold hover:text-black">BarberAI</span>
        </Link>

        <nav className="hidden sm:flex items-center gap-8 text-white/80">
          <a href="#features" className="hover:text-black">Features</a>
          <a href="#stats" className="hover:text-black">Usage</a>
          <a href="#reviews" className="hover:text-black">Reviews</a>
        </nav>

        <div className="flex items-center gap-3">
          <Link to="/login" className="hidden sm:inline text-white/80 hover:text-black">Login</Link>
          <Link to="/signup" className="btn btn-primary hover:text-white">Sign Up</Link>
        </div>
      </div>
    </header>
  );
}
