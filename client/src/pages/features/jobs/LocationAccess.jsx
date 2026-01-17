import { Button } from "../../../ui/button"
import { MapPin, Briefcase } from "lucide-react"
import FloatingLines from "../../../ui/FloatingLines"

export default function LocationAccess({ onRequestLocation, isLoadingLocation, onSkip }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 relative overflow-hidden bg-zinc-950">
      
      {/* Background Effect */}
      <div className="absolute inset-0 z-0 opacity-30 pointer-events-none">
        <FloatingLines />
      </div>

      {/* Main Card */}
      <div className="max-w-md w-full space-y-8 bg-zinc-900/50 p-8 rounded-2xl border border-zinc-800/50 backdrop-blur-md shadow-2xl relative z-10">
        
        {/* Large Icon */}
        <div className="flex justify-center">
          <div className="h-20 w-20 rounded-full bg-blue-500/10 flex items-center justify-center shadow-inner ring-1 ring-blue-500/20">
            <MapPin className="h-10 w-10 text-blue-500" />
          </div>
        </div>

        {/* Headings */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-white tracking-tight">Enable Location</h1>
          <p className="text-zinc-400 text-sm leading-relaxed">
            We need your location to find the best job opportunities nearby and calculate accurate commute times.
          </p>
        </div>

        {/* Info Box */}
         <div className="bg-zinc-900/60 border border-zinc-800/50 rounded-xl p-4 space-y-3">
          <div className="flex gap-3">
            <Briefcase className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-white text-sm font-semibold">Better Matches</p>
              <p className="text-zinc-400 text-xs mt-1 leading-normal">
                Your location helps us show you relevant work in your area. It is not shared publicly.
              </p>
            </div>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="space-y-3">
            <Button
              onClick={onRequestLocation}
              disabled={isLoadingLocation}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-6 text-lg rounded-xl shadow-lg shadow-white-900/20 transition-all hover:scale-[1.02] border-none"
            >
            {isLoadingLocation ? (
                <span className="flex items-center gap-2">
                <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full items-center justify-center"></span>
                Detecting...
                </span>
            ) : (
                "Allow Access"
            )}
            </Button>

            <button 
                onClick={onSkip}
                className="w-full text-zinc-500 hover:text-zinc-300 text-sm font-medium py-2 transition-colors"
            >
            Skip for now
            </button>
        </div>
      </div>
    </div>
  )
}