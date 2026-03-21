import { createContext, useContext, useState } from 'react';

const GUJARAT_CITIES = [
  { key: 'ahmedabad', name: 'Ahmedabad', center: [23.0225, 72.5714], zoom: 11 },
  { key: 'surat', name: 'Surat', center: [21.1702, 72.8311], zoom: 12 },
  { key: 'vadodara', name: 'Vadodara', center: [22.3072, 73.1812], zoom: 12 },
  { key: 'rajkot', name: 'Rajkot', center: [22.3039, 70.8022], zoom: 12 },
  { key: 'bhavnagar', name: 'Bhavnagar', center: [21.7645, 72.1519], zoom: 12 },
  { key: 'jamnagar', name: 'Jamnagar', center: [22.4707, 70.0577], zoom: 12 },
  { key: 'gandhinagar', name: 'Gandhinagar', center: [23.2156, 72.6369], zoom: 13 },
  { key: 'junagadh', name: 'Junagadh', center: [21.5222, 70.4579], zoom: 12 },
  { key: 'anand', name: 'Anand', center: [22.5645, 72.9289], zoom: 12 },
  { key: 'morbi', name: 'Morbi', center: [22.8120, 70.8370], zoom: 13 },
  { key: 'mehsana', name: 'Mehsana', center: [23.5880, 72.3693], zoom: 13 },
  { key: 'bharuch', name: 'Bharuch', center: [21.7051, 72.9959], zoom: 13 },
  { key: 'navsari', name: 'Navsari', center: [20.9467, 72.9520], zoom: 13 },
  { key: 'vapi', name: 'Vapi', center: [20.3893, 72.9106], zoom: 13 },
];

const CityContext = createContext(null);

export function CityProvider({ children }) {
  const [city, setCity] = useState(GUJARAT_CITIES[0]);

  const changeCity = (cityKey) => {
    const found = GUJARAT_CITIES.find(c => c.key === cityKey);
    if (found) setCity(found);
  };

  return (
    <CityContext.Provider value={{ city, cities: GUJARAT_CITIES, changeCity }}>
      {children}
    </CityContext.Provider>
  );
}

export const useCity = () => {
  const context = useContext(CityContext);
  if (!context) throw new Error('useCity must be used within CityProvider');
  return context;
};
