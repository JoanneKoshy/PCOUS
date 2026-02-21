import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { signInWithEmailAndPassword, signInWithPopup } from "firebase/auth"
import { doc, getDoc } from "firebase/firestore"
import { auth, provider, db } from "../firebase"

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  // 🔥 Common redirect logic
  const checkProfileAndRedirect = async (user) => {
    const snap = await getDoc(doc(db, "users", user.uid))

    if (snap.exists()) {
      navigate("/dashboard")
    } else {
      navigate("/profile-setup")
    }
  }

  // Email Login
  const handleLogin = async (e) => {
    e.preventDefault()
    try {
      const result = await signInWithEmailAndPassword(auth, email, password)
      await checkProfileAndRedirect(result.user)
    } catch (error) {
      alert(error.message)
    }
  }

  // Google Login
  const handleGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, provider)
      await checkProfileAndRedirect(result.user)
    } catch (error) {
      alert(error.message)
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 
      bg-gradient-to-br from-[#F4E9FF] via-[#EAD4FF] to-[#E0C2FF] overflow-hidden">

      <div className="relative w-full max-w-md p-8 
        rounded-3xl bg-gradient-to-br from-white/40 to-white/20 
        backdrop-blur-xl border border-white/50 
        shadow-[0_20px_50px_rgba(0,0,0,0.15)]">

        <h2 className="text-3xl font-bold text-[#15173D] text-center mb-6">
          PCO-US Login
        </h2>

        <form onSubmit={handleLogin}>

          <input
            type="email"
            placeholder="Email"
            className="w-full px-4 py-3 mb-4 rounded-xl bg-white/70 border"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Password"
            className="w-full px-4 py-3 mb-6 rounded-xl bg-white/70 border"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-gradient-to-r 
            from-[#15173D] to-[#2A2C6C] text-white mb-4">
            Login
          </button>
        </form>

        <button
          onClick={handleGoogle}
          className="w-full py-3 rounded-xl bg-white/70 border">
          Continue with Google
        </button>

        <p className="text-center text-sm mt-6">
          Don’t have an account?{" "}
          <Link to="/signup" className="text-[#982598] font-semibold">
            Sign Up
          </Link>
        </p>

      </div>
    </div>
  )
}