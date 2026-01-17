import { Routes, Route, useLocation } from "react-router-dom";
import Home from "./pages/Home";
import ProtectedRoute from "./auth/ProtectedRoute";
import CivicHub from "./pages/CivicHub";
import FireResult from "./pages/administration/gee/FireResult";
import DeforestationResult from "./pages/administration/gee/DeforestationResult";
import WomenSafety from "./pages/features/women";
import EnvironmentalHub from "./pages/administration/gee";
import Garbage from "./pages/features/garbage";
import NGO from "./pages/features/ngo";
import Jobs from "./pages/features/jobs";
import CoastalResult from "./pages/administration/gee/CoastalResult";
import FloodResult from "./pages/administration/gee/FloodResult";
import Deforestation from "./pages/administration/gee/Deforestation";
import Fire from "./pages/administration/gee/Fire";
import CoastalErosion from "./pages/administration/gee/CoastalErosion";
import Flood from "./pages/administration/gee/Flood";
import Pollutants from "./pages/administration/gee/Pollutants";
import SurfaceHeat from "./pages/administration/gee/SurfaceHeat";
import PollutionResult from "./pages/administration/gee/PollutionResult";
import Mission from "./pages/Mission";
import AboutUs from "./pages/AboutUs";
import Navbar from "./components/Navbar";
import GarbageFeature from "./pages/features/garbage/Garbage"
import SurfaceHeatResult from "./pages/administration/gee/SurfaceResult";
import CityAdminHub from "./pages/administration/administration";
import WomenSafetyAdmin from "./pages/administration/women/WomenSafetyAdmin";
import WomenSafetyZoneDetails from "./pages/administration/women/WomenSafetyZoneDetails";
import WomenSafetyRoom from "./pages/administration/women/WomenSafetyRoom"
import GarbageAdmin from "./pages/administration/garbage/garbage";


function App() {
  const location = useLocation();
  const showNavbar = ["/", "/mission", "/about"].includes(location.pathname);

  return (
    <>
      {showNavbar && <Navbar />} 
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/mission" element={<Mission />} />
        <Route path="/about" element={<AboutUs />} />
        
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <CivicHub />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/administration/garbage"
          element={
            <ProtectedRoute>
              <GarbageAdmin />
            </ProtectedRoute>
          }
        />
        <Route
          path="/administration"
          element={
            <ProtectedRoute>
              <CityAdminHub/>
            </ProtectedRoute>
          }
        />
        <Route
          path="/administration/womenSafety/:geohashId"
          element={
            <ProtectedRoute>
              <WomenSafetyZoneDetails />
            </ProtectedRoute>
          }
        />
        <Route 
          path="/administration/womenSafety/:geohashId/:roomId"
          element={
            <ProtectedRoute>
              <WomenSafetyRoom />
            </ProtectedRoute>
          }
        />
        <Route
          path="/sisterhood"
          element={
            <ProtectedRoute>
              <WomenSafety />
            </ProtectedRoute>
          }
        />
        <Route
          path="/administration/geoscope"
          element={
            <ProtectedRoute>
              <EnvironmentalHub />
            </ProtectedRoute>
          }
        />
        <Route
          path="/administration/womenSafety"
          element={
            <ProtectedRoute>
              <WomenSafetyAdmin />
            </ProtectedRoute>
          }
        />

        <Route
        path="/ecosnap"
        element={
          <ProtectedRoute>
            <GarbageFeature />
          </ProtectedRoute>
        }
      />
        <Route
          path="/kindshare"
          element={
            <ProtectedRoute>
              <NGO />
            </ProtectedRoute>
          }
        />
        <Route
          path="/garbage"
          element={
            <ProtectedRoute>
              <Garbage />
            </ProtectedRoute>
          }
        />
       <Route
        path="/ngo/*"
        element={
          <ProtectedRoute>
            <NGO />
          </ProtectedRoute>
        }
      />
        <Route
          path="/streetgigs"
          element={
            <ProtectedRoute>
              <Jobs />
            </ProtectedRoute>
          }
        />

        <Route
          path="/deforestation"
          element={
            <ProtectedRoute>
              <Deforestation />
            </ProtectedRoute>
          }
        />
        <Route
          path="/deforestation/result"
          element={
            <ProtectedRoute>
              <DeforestationResult />
            </ProtectedRoute>
          }
        />
        <Route
          path="/fire"
          element={
            <ProtectedRoute>
              <Fire />
            </ProtectedRoute>
          }
        />
        <Route
          path="/fire/result"
          element={
            <ProtectedRoute>
              <FireResult />
            </ProtectedRoute>
          }
        />
        <Route
          path="/coastal-erosion"
          element={
            <ProtectedRoute>
              <CoastalErosion />
            </ProtectedRoute>
          }
        />
        <Route
          path="/coastal-erosion/result"
          element={
            <ProtectedRoute>
              <CoastalResult />
            </ProtectedRoute>
          }
        ></Route>
        <Route
          path="/flood"
          element={
            <ProtectedRoute>
              <Flood />
            </ProtectedRoute>
          }
        />
        <Route
          path="/flood/result"
          element={
            <ProtectedRoute>
              <FloodResult />
            </ProtectedRoute>
          }
        ></Route>
        <Route
          path="/pollutants"
          element={
            <ProtectedRoute>
              <Pollutants />
            </ProtectedRoute>
          }
        />
        <Route 
          path="/pollutants/result"
          element={
            <ProtectedRoute>
              <PollutionResult />
            </ProtectedRoute>
          }
        />
        <Route
          path="/surface-heat"
          element={
            <ProtectedRoute>
              <SurfaceHeat />
            </ProtectedRoute>
          }
        />
        <Route
          path="/surface-heat/result"
          element={
            <ProtectedRoute>
              <SurfaceHeatResult />
            </ProtectedRoute>
          }
        />
      </Routes>
    </>

  );
}

export default App;
