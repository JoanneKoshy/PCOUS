import { useNavigate } from "react-router-dom"
import { signOut } from "firebase/auth"
import { auth, db } from "../firebase"
import { doc, getDoc } from "firebase/firestore"
import { useEffect, useState, useRef } from "react"

const SERVER = "http://192.168.2.181:5000"

export default function Dashboard() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)

  const [days, setDays] = useState([])
  const [activeDayIndex, setActiveDayIndex] = useState(null)
  const [lhImage, setLhImage] = useState(null)
  const [isRunning, setIsRunning] = useState(false)

  const [liveHR, setLiveHR]     = useState(null)
  const [liveHRV, setLiveHRV]   = useState(null)
  const [liveTemp, setLiveTemp] = useState(null)

  // Stores final averages per day separately so they never get wiped
  const [averages, setAverages] = useState({})

  const pollRef = useRef(null)

  useEffect(() => {
    const fetchProfile = async () => {
      const user = auth.currentUser
      if (!user) return
      const snap = await getDoc(doc(db, "users", user.uid))
      if (snap.exists()) setProfile(snap.data())
    }
    fetchProfile()
  }, [])

  const handleLogout = async () => {
    await signOut(auth)
    navigate("/")
  }

  const handleAddDay = () => {
    if (days.length >= 4) return
    const newIndex = days.length
    setDays(prev => [...prev, { label: `Day ${newIndex + 1}` }])
    setActiveDayIndex(newIndex)
  }

  const startReading = () => {
    if (isRunning) return
    setIsRunning(true)
    setLiveHR(null)
    setLiveHRV(null)
    setLiveTemp(null)

    pollRef.current = setInterval(async () => {
      try {
        const res  = await fetch(`${SERVER}/api/latest`)
        const data = await res.json()
        if (data.hr   != null) setLiveHR(parseFloat(data.hr).toFixed(1))
        if (data.hrv  != null) setLiveHRV(parseFloat(data.hrv).toFixed(1))
        if (data.temp != null) setLiveTemp(parseFloat(data.temp).toFixed(2))
      } catch (e) {
        console.error("Poll error:", e)
      }
    }, 1000)
  }

  const stopReading = async () => {
    clearInterval(pollRef.current)
    setIsRunning(false)

    try {
      const res  = await fetch(`${SERVER}/api/day/close`, { method: "POST" })
      const data = await res.json()

      console.log("Day close response:", data)

      // Save averages into a separate object keyed by day index
      // This never gets wiped unlike days[]
      setAverages(prev => ({
        ...prev,
        [activeDayIndex]: {
          avgHR:   data.avg_hr,
          avgHRV:  data.avg_hrv,
          avgTemp: data.avg_temp,
          samples: data.total_samples,
        }
      }))

    } catch (e) {
      console.error("Stop error:", e)
    }

    // Clear live values but keep activeDayIndex so averages show
    setLiveHR(null)
    setLiveHRV(null)
    setLiveTemp(null)
  }

  const completedCount = Object.keys(averages).length

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

      <div className="grid grid-cols-12 gap-6">

        {/* LEFT – PROFILE */}
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
            {completedCount > 0 ? (
              <div className="text-sm space-y-1">
                <p>HR: {(Object.values(averages).reduce((s,d) => s + d.avgHR, 0) / completedCount).toFixed(1)} bpm</p>
                <p>HRV: {(Object.values(averages).reduce((s,d) => s + d.avgHRV, 0) / completedCount).toFixed(1)} ms</p>
                <p>Temp: {(Object.values(averages).reduce((s,d) => s + d.avgTemp, 0) / completedCount).toFixed(2)} °C</p>
              </div>
            ) : (
              <>
                <p className="text-sm opacity-80">HR: Establishing</p>
                <p className="text-sm opacity-80">HRV: Establishing</p>
                <p className="text-sm opacity-80">Temp: Establishing</p>
              </>
            )}
          </div>
        </div>

        {/* CENTER */}
        <div className="col-span-6 bg-white/10 backdrop-blur-lg rounded-3xl p-6 shadow-lg border border-white/20">
          <h2 className="text-xl font-semibold mb-6">Simulation – Month 1</h2>

          {/* Day circles */}
          <div className="flex items-center space-x-4 mb-6">
            {days.map((day, index) => (
              <div
                key={index}
                onClick={() => !isRunning && setActiveDayIndex(index)}
                className={`w-20 h-20 rounded-full flex flex-col items-center justify-center backdrop-blur-md border cursor-pointer transition
                  ${activeDayIndex === index
                    ? "bg-white/30 border-white scale-105"
                    : "bg-white/20 border-white/30"}`}
              >
                <span className="text-sm font-medium">Day {index + 1}</span>
                {averages[index] ? (
                  <span className="text-xs text-green-300">HR {averages[index].avgHR}</span>
                ) : (
                  <span className="text-xs opacity-60">Not Recorded</span>
                )}
                {index === 2 && (
                  <span className="text-[9px] text-yellow-300">
                    LH {lhImage ? "✔" : "(opt)"}
                  </span>
                )}
              </div>
            ))}

            {days.length < 4 && (
              <button
                onClick={handleAddDay}
                disabled={isRunning}
                className="w-20 h-20 rounded-full border-2 border-dashed border-white/40 flex items-center justify-center hover:bg-white/10 transition text-2xl disabled:opacity-40"
              >
                +
              </button>
            )}
          </div>

          {/* Start / Stop buttons */}
          {activeDayIndex !== null && (
            <div className="mb-4">
              {!isRunning ? (
                <button
                  onClick={startReading}
                  className="px-6 py-2 bg-green-500 hover:bg-green-600 rounded-lg font-medium transition"
                >
                  ▶ Start Reading
                </button>
              ) : (
                <button
                  onClick={stopReading}
                  className="px-6 py-2 bg-red-500 hover:bg-red-600 rounded-lg font-medium transition animate-pulse"
                >
                  ■ Stop & Save
                </button>
              )}
            </div>
          )}

          {/* LIVE display while running */}
          {isRunning && (
            <div className="bg-white/10 rounded-2xl p-4 border border-white/20 mb-4">
              <p className="text-sm opacity-70 mb-3">📡 Live from ESP32...</p>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-3xl font-bold">{liveHR ?? "..."}</p>
                  <p className="text-xs opacity-60 mt-1">HR (bpm)</p>
                </div>
                <div>
                  <p className="text-3xl font-bold">{liveHRV ?? "..."}</p>
                  <p className="text-xs opacity-60 mt-1">HRV (ms)</p>
                </div>
                <div>
                  <p className="text-3xl font-bold">{liveTemp ?? "..."}</p>
                  <p className="text-xs opacity-60 mt-1">Temp (°C)</p>
                </div>
              </div>
            </div>
          )}

          {/* AVERAGE display after stop */}
          {!isRunning && activeDayIndex !== null && averages[activeDayIndex] && (
            <div className="bg-green-500/20 rounded-2xl p-4 border border-green-400/50 mb-4">
              <p className="text-sm text-green-300 font-medium mb-3">
                ✅ Day {activeDayIndex + 1} Complete — {averages[activeDayIndex].samples} samples
              </p>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-3xl font-bold">{averages[activeDayIndex].avgHR}</p>
                  <p className="text-xs opacity-60 mt-1">Avg HR</p>
                </div>
                <div>
                  <p className="text-3xl font-bold">{averages[activeDayIndex].avgHRV}</p>
                  <p className="text-xs opacity-60 mt-1">Avg HRV</p>
                </div>
                <div>
                  <p className="text-3xl font-bold">{averages[activeDayIndex].avgTemp}</p>
                  <p className="text-xs opacity-60 mt-1">Avg Temp</p>
                </div>
              </div>
            </div>
          )}

          {/* LH Upload Day 3 */}
          {activeDayIndex === 2 && !isRunning && (
            <div className="mt-2">
              <p className="text-sm opacity-70 mb-1">Upload LH Strip (optional)</p>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setLhImage(e.target.files[0])}
                className="text-sm"
              />
            </div>
          )}

          <p className="text-sm opacity-50 mt-4">
            Click + to add a day, select it, then press Start Reading.
          </p>
        </div>

        {/* RIGHT – PHASE */}
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
                <div
                  className="bg-white h-3 rounded-full transition-all duration-500"
                  style={{ width: `${(completedCount / 3) * 100}%` }}
                />
              </div>
              <p className="text-xs opacity-60 mt-1">{completedCount}/3 days complete</p>
            </div>
          </div>

          <div className="mt-6">
            <h3 className="text-sm mb-2 opacity-80">Stress Index</h3>
            <div className="bg-white/20 rounded-full h-3">
              <div className="bg-red-400 h-3 rounded-full w-[60%]" />
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}