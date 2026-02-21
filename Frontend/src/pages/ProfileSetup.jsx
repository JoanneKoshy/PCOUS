import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { auth, db } from "../firebase"
import { doc, setDoc } from "firebase/firestore"

export default function ProfileSetup() {
  const navigate = useNavigate()

  const [form, setForm] = useState({
    name: "",
    age: "",
    avg_cycle_gap: "",
    acne: "",
    stress_level: ""
  })

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

const handleSubmit = async () => {
  console.log("SAVE CLICKED")

  try {
    const user = auth.currentUser
    console.log("Current user:", user)

    if (!user) {
      alert("User not authenticated.")
      return
    }

    await setDoc(doc(db, "users", user.uid), {
      ...form,
      uid: user.uid
    })

    console.log("Profile successfully saved")

    navigate("/dashboard")

  } catch (error) {
    console.error("Firestore error:", error)
    alert(error.message)
  }
}
  return (
    <div className="min-h-screen flex items-center justify-center 
      bg-gradient-to-br from-[#1f1147] via-[#3c1b74] to-[#982598] 
      text-white px-4">

      <div className="bg-white/10 backdrop-blur-lg 
        rounded-3xl p-8 w-full max-w-md 
        border border-white/20 shadow-xl">

        <h2 className="text-2xl font-bold mb-6">
          Complete Your Profile
        </h2>

        <label className="text-sm opacity-80">Full Name</label>
        <input
          name="name"
          value={form.name}
          onChange={handleChange}
          placeholder="Enter your name"
          className="w-full mt-1 mb-4 p-3 rounded-xl text-black"
        />

        <label className="text-sm opacity-80">Age</label>
        <input
          type="number"
          name="age"
          value={form.age}
          onChange={handleChange}
          placeholder="Enter your age"
          className="w-full mt-1 mb-4 p-3 rounded-xl text-black"
        />

        <label className="text-sm opacity-80">
          Average Cycle Length (in days)
        </label>
        <p className="text-xs opacity-60 mb-1">
          Example: 28–35 is typical. If irregular, enter your average.
        </p>
        <input
          type="number"
          name="avg_cycle_gap"
          value={form.avg_cycle_gap}
          onChange={handleChange}
          placeholder="e.g. 32"
          className="w-full mb-4 p-3 rounded-xl text-black"
        />

        <label className="text-sm opacity-80">
          Do you frequently experience acne?
        </label>
        <p className="text-xs opacity-60 mb-1">
          Acne can sometimes be linked to hormonal imbalance.
        </p>
        <select
          name="acne"
          value={form.acne}
          onChange={handleChange}
          className="w-full mb-4 p-3 rounded-xl text-black"
        >
          <option value="">Select</option>
          <option value="Yes">Yes</option>
          <option value="No">No</option>
        </select>

        <label className="text-sm opacity-80">
          How would you describe your daily stress level?
        </label>
        <p className="text-xs opacity-60 mb-1">
          Low – rarely stressed  
          Medium – occasionally stressed  
          High – frequently stressed
        </p>
        <select
          name="stress_level"
          value={form.stress_level}
          onChange={handleChange}
          className="w-full mb-6 p-3 rounded-xl text-black"
        >
          <option value="">Select</option>
          <option value="Low">Low</option>
          <option value="Medium">Medium</option>
          <option value="High">High</option>
        </select>

        <button
          onClick={handleSubmit}
          className="w-full py-3 rounded-xl 
          bg-gradient-to-r from-[#982598] to-[#B93DB9] 
          font-semibold text-white transition"
        >
          Save Profile
        </button>

      </div>
    </div>
  )
}