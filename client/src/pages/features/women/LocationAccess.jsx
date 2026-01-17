import { Button } from "../../../ui/button"
import { MapPin, AlertCircle, House } from "lucide-react"

export default function LocationAccess({ onRequestLocation, isLoadingLocation, onSkip }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 relative z-10">
      
      <div className="max-w-md w-full space-y-8 bg-zinc-900/50 p-8 rounded-2xl border border-zinc-800/50 backdrop-blur-sm shadow-2xl">
        <div className="flex justify-center">
          <div className="h-20 w-20 rounded-full bg-white-600/10 flex items-center justify-center shadow-inner">
            <MapPin className="h-10 w-10 text-white" />
          </div>
        </div>

        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-white tracking-tight">Enable Location</h1>
          <p className="text-zinc-400 text-sm leading-relaxed">
            We need your location to find safe routes and enable real-time emergency tracking.
          </p>
        </div>

         <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 space-y-3">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-white text-sm font-semibold">Privacy First</p>
              <p className="text-zinc-400 text-xs mt-1 leading-normal">
                Your location is encrypted and only shared with emergency contacts when you trigger an SOS.
              </p>
            </div>
          </div>
        </div>

        {/* CTA Button */}
        <div className="space-y-3">
            <Button
            onClick={onRequestLocation}
            disabled={isLoadingLocation}
            className="w-full bg-white hover:bg-zinc-800 text-white font-bold py-6 text-lg rounded-xl shadow-lg shadow-white-100 transition-all hover:scale-[1.02]"
            >
            {isLoadingLocation ? (
                <span className="flex items-center gap-2">
                <span className="animate-spin h-5 w-5 border-2 border-t-transparent rounded-full items-center justify-center"></span>
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