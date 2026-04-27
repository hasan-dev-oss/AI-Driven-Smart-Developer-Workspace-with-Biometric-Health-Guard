import { createContext, useContext, useState, useEffect } from "react";

const UserContext = createContext();

const PROXIMITY_DEFAULTS = {
  proximityEnabled: true,
  proximityThreshold: 2, // feet
  distanceUnit: 'feet', // 'feet' or 'cm'
};

export const UserProvider = ({ children }) => {
  const [userName, setUserName] = useState("");
  const [proximitySettings, setProximitySettings] = useState(PROXIMITY_DEFAULTS);

  useEffect(() => {
    const name = localStorage.getItem("name");
    if (name) setUserName(name);

    // Load proximity settings
    const stored = localStorage.getItem("proximitySettings");
    if (stored) {
      try {
        setProximitySettings(JSON.parse(stored));
      } catch (err) {
        console.error('Failed to parse proximity settings:', err);
        setProximitySettings(PROXIMITY_DEFAULTS);
      }
    }
  }, []);

  const updateUserName = (name) => {
    localStorage.setItem("name", name);
    setUserName(name);
  };

  const updateProximitySettings = (newSettings) => {
    const updated = { ...proximitySettings, ...newSettings };
    setProximitySettings(updated);
    localStorage.setItem("proximitySettings", JSON.stringify(updated));
  };

  const updateProximityThreshold = (threshold) => {
    updateProximitySettings({ proximityThreshold: Math.max(0.5, Math.min(10, threshold)) });
  };

  const toggleProximity = () => {
    updateProximitySettings({ proximityEnabled: !proximitySettings.proximityEnabled });
  };

  const setDistanceUnit = (unit) => {
    if (['feet', 'cm'].includes(unit)) {
      updateProximitySettings({ distanceUnit: unit });
    }
  };

  return (
    <UserContext.Provider 
      value={{ 
        userName, 
        updateUserName,
        proximitySettings,
        updateProximitySettings,
        updateProximityThreshold,
        toggleProximity,
        setDistanceUnit,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);
