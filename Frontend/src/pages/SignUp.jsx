import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { createUserWithEmailAndPassword, signInWithPopup } from "firebase/auth"
import { auth, provider } from "../firebase"

export default function SignUp() {
  const navigate = useNavigate()

  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  const handleSignup = async (e) => {
    e.preventDefault()
    try {
      await createUserWithEmailAndPassword(auth, email, password)

      // 🔥 Always go to profile setup after signup
      navigate("/profile-setup")

    } catch (error) {
      alert(error.message)
    }
  }

  const handleGoogleSignup = async () => {
    try {
      await signInWithPopup(auth, provider)

      // 🔥 Always go to profile setup
      navigate("/profile-setup")

    } catch (error) {
      alert(error.message)
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 
      bg-gradient-to-br from-[#F4E9FF] via-[#EAD4FF] to-[#E0C2FF] overflow-hidden">

      <div className="relative w-full max-w-md p-8 
        rounded-3xl 
        bg-gradient-to-br from-white/40 to-white/20 
        backdrop-blur-xl 
        border border-white/50 
        shadow-[0_20px_50px_rgba(0,0,0,0.15)]">

        <h2 className="text-3xl font-bold text-[#15173D] text-center mb-6">
          Create Account
        </h2>

        <form onSubmit={handleSignup}>

          <input
            type="text"
            placeholder="Username"
            className="w-full px-4 py-3 mb-4 rounded-xl bg-white/70 border"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />

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
            from-[#982598] to-[#B93DB9] text-white mb-4">
            Sign Up
          </button>
        </form>

        <button
          onClick={handleGoogleSignup}
          className="w-full py-3 rounded-xl bg-white/70 border">
          Continue with Google
        </button>

        <p className="text-center text-sm mt-6">
          Already have an account?{" "}
          <Link to="/" className="text-[#982598] font-semibold">
            Login
          </Link>
        </p>

      </div>
    </div>
  )
}