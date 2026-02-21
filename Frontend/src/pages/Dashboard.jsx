import { useNavigate } from "react-router-dom"
import { signOut } from "firebase/auth"
import { auth, db } from "../firebase"
import { doc, getDoc } from "firebase/firestore"
import { useEffect, useState } from "react"

export default function Dashboard() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)

  // Simulation State
  const [days, setDays] = useState([])
  const [activeDayIndex, setActiveDayIndex] = useState(null)
  const [intervalRef, setIntervalRef] = useState(null)
  const [lhImage, setLhImage] = useState(null)

  useEffect(() => {
    const fetchProfile = async () => {
      const user = auth.currentUser
      if (!user) return
      const snap = await getDoc(doc(db, "users", user.uid))
      if (snap.exists()) {
        setProfile(snap.data())
      }
    }
    fetchProfile()
  }, [])

  const handleLogout = async () => {
    await signOut(auth)
    navigate("/")
  }

  // Add new day
  const handleAddDay = () => {
    if (days.length >= 4) return

    const newDay = {
      readings: [],
      avgHR: null,
      avgHRV: null,
      avgTemp: null,
      running: false,
    }

    setDays([...days, newDay])
  }

  // Start simulation
  const startReading = (index) => {
    if (days[index].running) return

    const updatedDays = [...days]
    updatedDays[index].running = true
    setDays(updatedDays)
    setActiveDayIndex(index)

    const interval = setInterval(() => {
      setDays(prev => {
        const copy = [...prev]
        const hr = Math.floor(68 + Math.random() * 8)
        const hrv = Math.floor(45 + Math.random() * 10)
        const temp = 36.3 + Math.random() * 0.3

        copy[index].readings.push({ hr, hrv, temp })
        return copy
      })
    }, 1000)

    setIntervalRef(interval)
  }

  // Stop simulation + calculate average
  const stopReading = (index) => {
    clearInterval(intervalRef)

    setDays(prev => {
      const copy = [...prev]
      const readings = copy[index].readings

      if (readings.length === 0) return copy

      const avgHR =
        readings.reduce((sum, r) => sum + r.hr, 0) / readings.length
      const avgHRV =
        readings.reduce((sum, r) => sum + r.hrv, 0) / readings.length
      const avgTemp =
        readings.reduce((sum, r) => sum + r.temp, 0) / readings.length

      copy[index] = {
        ...copy[index],
        avgHR: Math.round(avgHR),
        avgHRV: Math.round(avgHRV),
        avgTemp: avgTemp.toFixed(2),
        running: false,
      }

      return copy
    })

    setActiveDayIndex(null)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1f1147] via-[#3c1b74] to-[#982598] p-8 text-white">

      {/* TOP BAR */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold tracking-wide">PCO-US Dashboard</h1>
        <button
          onClick={handleLogout}
          className="bg-white/20 backdrop-blur-md px-4 py-2 rounded-xl hover:bg-white/30 transition"
        >
          Logout
        </button>
      </div>

      {/* MAIN GRID */}
      <div className="grid grid-cols-12 gap-6">

        {/* LEFT PANEL – PROFILE */}
        <div className="col-span-3 bg-white/10 backdrop-blur-lg rounded-3xl p-6 shadow-lg border border-white/20">
          <h2 className="text-xl font-semibold mb-4">Profile Summary</h2>

          <div className="space-y-3 text-sm">
            <p><span className="opacity-70">Name:</span> {profile?.name || "-"}</p>
            <p><span className="opacity-70">Age:</span> {profile?.age || "-"}</p>
            <p><span className="opacity-70">Cycle Gap:</span> {profile?.avg_cycle_gap || "-"} days</p>
            <p><span className="opacity-70">Stress Level:</span> {profile?.stress_level || "-"}</p>
            <p><span className="opacity-70">Acne:</span> {profile?.acne || "-"}</p>
          </div>

          <div className="mt-6 border-t border-white/20 pt-4">
            <h3 className="font-medium mb-2">Baseline</h3>
            <p className="text-sm opacity-80">HR: Establishing</p>
            <p className="text-sm opacity-80">HRV: Establishing</p>
            <p className="text-sm opacity-80">Temp: Establishing</p>
          </div>
        </div>

        {/* CENTER PANEL – SIMULATION */}
        <div className="col-span-6 bg-white/10 backdrop-blur-lg rounded-3xl p-6 shadow-lg border border-white/20">
          <h2 className="text-xl font-semibold mb-6">Simulation – Month 1</h2>

          <div className="flex items-center space-x-4 mb-6">

            {days.map((day, index) => (
              <div
                key={index}
                onClick={() => setActiveDayIndex(index)}
                className="w-20 h-20 rounded-full bg-white/20 flex flex-col items-center justify-center backdrop-blur-md border border-white/30 relative cursor-pointer"
              >
                <span className="text-sm font-medium">Day {index + 1}</span>

                {day.avgHR ? (
                  <span className="text-xs opacity-70">HR {day.avgHR}</span>
                ) : (
                  <span className="text-xs opacity-70">Not Recorded</span>
                )}

                {index === 2 && (
                  <div className="absolute bottom-1 text-[10px] text-yellow-300">
                    LH {lhImage ? "✔" : "(optional)"}
                  </div>
                )}
              </div>
            ))}

            {days.length < 4 && (
              <button
                onClick={handleAddDay}
                className="w-20 h-20 rounded-full border-2 border-dashed border-white/40 flex items-center justify-center hover:bg-white/10 transition"
              >
                +
              </button>
            )}

          </div>

          {/* Start / Stop Controls */}
          {activeDayIndex !== null && (
            <div className="mb-4">
              {!days[activeDayIndex].running ? (
                <button
                  onClick={() => startReading(activeDayIndex)}
                  className="px-4 py-2 bg-green-500 rounded-lg mr-3"
                >
                  Start
                </button>
              ) : (
                <button
                  onClick={() => stopReading(activeDayIndex)}
                  className="px-4 py-2 bg-red-500 rounded-lg"
                >
                  Stop
                </button>
              )}
            </div>
          )}

          {/* LH Upload (Day 3 only, after stop) */}
          {activeDayIndex === 2 && !days[2]?.running && (
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setLhImage(e.target.files[0])}
            />
          )}

          <div className="text-sm opacity-80 mt-3">
            Add nightly sensor entry to begin baseline generation.
          </div>
        </div>

        {/* RIGHT PANEL – PHASE */}
        <div className="col-span-3 bg-white/10 backdrop-blur-lg rounded-3xl p-6 shadow-lg border border-white/20">
          <h2 className="text-xl font-semibold mb-4">Current Phase</h2>

          <div className="bg-white/20 rounded-2xl p-4 backdrop-blur-md border border-white/20">
            <p className="text-lg font-semibold mb-2">Baseline Establishing</p>
            <p className="text-sm opacity-80">
              System requires 3 days of data before activation.
            </p>

            <div className="mt-4">
              <p className="text-sm">Confidence</p>
              <div className="w-full bg-white/20 rounded-full h-3 mt-1">
                <div className="bg-white h-3 rounded-full w-[25%]"></div>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <h3 className="text-sm mb-2 opacity-80">Stress Index</h3>
            <div className="bg-white/20 rounded-full h-3">
              <div className="bg-red-400 h-3 rounded-full w-[60%]"></div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}