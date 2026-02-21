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

  const [averages, setAverages] = useState({})

  // ── NEW: LH states ──
  const [lhResult, setLhResult]   = useState(null)
  const [lhLoading, setLhLoading] = useState(false)

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

  // Day 1 — polls real ESP32 via /api/latest
  const startRealReading = () => {
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

  // Days 2/3/4 — generates dummy readings locally
  const startDummyReading = () => {
    if (isRunning) return
    setIsRunning(true)
    setLiveHR(null)
    setLiveHRV(null)
    setLiveTemp(null)

    let hr   = 72 + Math.random() * 10
    let hrv  = 45 + Math.random() * 15
    let temp = 36.4 + Math.random() * 0.3

    pollRef.current = setInterval(() => {
      hr   = Math.max(60, Math.min(100, hr   + (Math.random() - 0.5) * 2))
      hrv  = Math.max(30, Math.min(80,  hrv  + (Math.random() - 0.5) * 3))
      temp = Math.max(36.0, Math.min(37.2, temp + (Math.random() - 0.5) * 0.05))

      setLiveHR(hr.toFixed(1))
      setLiveHRV(hrv.toFixed(1))
      setLiveTemp(temp.toFixed(2))
    }, 1000)
  }

  const startReading = () => {
    if (activeDayIndex === 0) startRealReading()
    else startDummyReading()
  }

  // Day 1 stop — calls Flask to get real average
  const stopRealReading = async () => {
    clearInterval(pollRef.current)
    setIsRunning(false)

    try {
      const res  = await fetch(`${SERVER}/api/day/close`, { method: "POST" })
      const data = await res.json()

      console.log("Day close response:", data)

      if (data.error) {
        alert("Error from server: " + data.error)
        return
      }

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
      alert("Could not reach server: " + e.message)
    }

    setLiveHR(null)
    setLiveHRV(null)
    setLiveTemp(null)
  }

  // Days 2/3/4 stop — calls Flask simulate to get day-specific avg
  const stopDummyReading = async () => {
    clearInterval(pollRef.current)
    setIsRunning(false)

    try {
      const res  = await fetch(`${SERVER}/api/day/simulate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ day: activeDayIndex + 1 })
      })
      const data = await res.json()

      console.log(`Simulated Day ${activeDayIndex + 1} response:`, data)

      setAverages(prev => ({
        ...prev,
        [activeDayIndex]: {
          avgHR:   data.avg_hr,
          avgHRV:  data.avg_hrv,
          avgTemp: data.avg_temp,
          samples: "sim",
        }
      }))

    } catch (e) {
      console.error("Simulate stop error:", e)
      alert("Could not reach server: " + e.message)
    }

    setLiveHR(null)
    setLiveHRV(null)
    setLiveTemp(null)
  }

  const stopReading = () => {
    if (activeDayIndex === 0) stopRealReading()
    else stopDummyReading()
  }

  // ── NEW: LH analyze function ──
  const analyzeLH = async (file) => {
    setLhImage(file)
    setLhLoading(true)
    setLhResult(null)

    try {
      const reader = new FileReader()
      reader.onload = async (e) => {
        const base64 = e.target.result.split(",")[1]

        const res  = await fetch(`${SERVER}/api/lh/analyze`, {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ image: base64 })
        })
        const data = await res.json()
        console.log("LH result:", data)
        setLhResult(data)
        setLhLoading(false)
      }
      reader.readAsDataURL(file)
    } catch (e) {
      console.error("LH analyze error:", e)
      setLhLoading(false)
    }
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

          {/* Start / Stop — all days */}
          {activeDayIndex !== null && (
            <div className="mb-4 flex items-center gap-3">
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
              {activeDayIndex === 0 && (
                <span className="text-xs opacity-50">📡 Live ESP32</span>
              )}
              {activeDayIndex > 0 && (
                <span className="text-xs opacity-50">🔁 Simulated</span>
              )}
            </div>
          )}

          {/* LIVE display while running */}
          {isRunning && (
            <div className="bg-white/10 rounded-2xl p-4 border border-white/20 mb-4">
              <p className="text-sm opacity-70 mb-3">
                {activeDayIndex === 0 ? "📡 Live from ESP32..." : "🔁 Simulated reading..."}
              </p>
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
                ✅ Day {activeDayIndex + 1} Complete
                {averages[activeDayIndex].samples === "sim" ? " (Simulated)" : ` — ${averages[activeDayIndex].samples} samples`}
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

          {/* ── LH Strip Analysis — Day 3 only (UPDATED) ── */}
          {activeDayIndex === 2 && !isRunning && (
            <div className="mt-2 bg-white/10 rounded-2xl p-4 border border-yellow-400/30">
              <p className="text-sm text-yellow-300 mb-2">🧪 LH Strip Analysis (Day 3)</p>
              <p className="text-xs opacity-60 mb-3">Upload your LH strip photo for ovulation detection</p>

              <input
                type="file"
                accept="image/*"
                onChange={(e) => e.target.files[0] && analyzeLH(e.target.files[0])}
                className="text-sm w-full mb-3"
              />

              {lhLoading && (
                <p className="text-sm text-yellow-300 animate-pulse">🔍 Analyzing strip...</p>
              )}

              {lhResult && !lhLoading && (
                <div className={`mt-3 rounded-xl p-3 border ${
                  lhResult.result === "positive"   ? "bg-green-500/20 border-green-400/50" :
                  lhResult.result === "borderline" ? "bg-yellow-500/20 border-yellow-400/50" :
                  lhResult.result === "error"      ? "bg-red-500/20 border-red-400/50" :
                                                     "bg-white/10 border-white/20"
                }`}>
                  <p className="text-sm font-semibold mb-1">
                    {lhResult.result === "positive"   ? "✅ LH Positive"   :
                     lhResult.result === "borderline" ? "⚠️ LH Borderline" :
                     lhResult.result === "error"      ? "❌ Error"         :
                                                        "❌ LH Negative"}
                  </p>
                  <p className="text-xs opacity-80 mb-2">{lhResult.message}</p>
                  {lhResult.result !== "error" && (
                    <>
                      <p className="text-xs opacity-60 mb-1">Confidence: {lhResult.confidence}%</p>
                      <div className="w-full bg-white/20 rounded-full h-2 mb-2">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            lhResult.confidence >= 90 ? "bg-green-400" :
                            lhResult.confidence >= 50 ? "bg-yellow-400" :
                                                        "bg-red-400"
                          }`}
                          style={{ width: `${lhResult.confidence}%` }}
                        />
                      </div>
                      <p className="text-xs opacity-50">
                        T/C ratio: {lhResult.ratio} | Lines detected: {lhResult.peaks_found}
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          <p className="text-sm opacity-50 mt-4">
            Day 1 uses live ESP32 sensor. Days 2–4 use simulated readings.
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