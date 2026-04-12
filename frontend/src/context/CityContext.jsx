import { createContext, useContext, useState, useEffect } from 'react';

const FALLBACK_CITIES = [
  { key: 'ahmedabad', name: 'Ahmedabad', center: [23.0225, 72.5714], zoom: 11 },
  { key: 'surat', name: 'Surat', center: [21.1702, 72.8311], zoom: 12 },
  { key: 'vadodara', name: 'Vadodara', center: [22.3072, 73.1812], zoom: 12 },
  { key: 'rajkot', name: 'Rajkot', center: [22.3039, 70.8022], zoom: 12 },
  { key: 'gandhinagar', name: 'Gandhinagar', center: [23.2156, 72.6369], zoom: 13 },
];

const CityContext = createContext(null);

export function CityProvider({ children }) {
  const [city, setCity] = useState(FALLBACK_CITIES[0]);
  const [cities, setCities] = useState(FALLBACK_CITIES);

  useEffect(() => {
    fetch('/api/v1/satellite/cities')
      .then(r => r.json())
      .then(allCities => {
        if (Array.isArray(allCities) && allCities.length > 0) {
          const mapped = allCities.map(c => ({
            key: c.key,
            name: c.name,
            center: c.center,
            bbox: c.bbox,
            zoom: 11,
            has_data: c.has_data,
            data_source: c.data_source,
          }));
          setCities(mapped);
        }
      })
      .catch(() => {});
  }, []);

  const changeCity = (cityKey) => {
    const found = cities.find(c => c.key === cityKey);
    if (found) setCity(found);
  };

  return (
    <CityContext.Provider value={{ city, cities, changeCity }}>
      {children}
    </CityContext.Provider>
  );
}

export const useCity = () => {
  const context = useContext(CityContext);
  if (!context) throw new Error('useCity must be used within CityProvider');
  return context;
};
