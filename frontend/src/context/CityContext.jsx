import { createContext, useContext, useState, useEffect } from 'react';

const FALLBACK_CITIES = [
  { key: 'ahmedabad', name: 'Ahmedabad', center: [23.0225, 72.5714], zoom: 11, has_data: true, data_source: 'gee' },
  { key: 'surat', name: 'Surat', center: [21.1702, 72.8311], zoom: 12, has_data: true, data_source: 'gee' },
  { key: 'vadodara', name: 'Vadodara', center: [22.3072, 73.1812], zoom: 12, has_data: true, data_source: 'gee' },
  { key: 'rajkot', name: 'Rajkot', center: [22.3039, 70.8022], zoom: 12, has_data: true, data_source: 'gee' },
  { key: 'bhavnagar', name: 'Bhavnagar', center: [21.7645, 72.1519], zoom: 12, has_data: true, data_source: 'gee' },
  { key: 'jamnagar', name: 'Jamnagar', center: [22.4707, 70.0577], zoom: 12, has_data: true, data_source: 'gee' },
  { key: 'gandhinagar', name: 'Gandhinagar', center: [23.2156, 72.6369], zoom: 13, has_data: true, data_source: 'gee' },
  { key: 'junagadh', name: 'Junagadh', center: [21.5222, 70.4579], zoom: 12, has_data: true, data_source: 'gee' },
  { key: 'anand', name: 'Anand', center: [22.5645, 72.9289], zoom: 12, has_data: true, data_source: 'gee' },
  { key: 'morbi', name: 'Morbi', center: [22.8120, 70.8370], zoom: 13, has_data: true, data_source: 'gee' },
  { key: 'mehsana', name: 'Mehsana', center: [23.5880, 72.3693], zoom: 13, has_data: true, data_source: 'gee' },
  { key: 'bharuch', name: 'Bharuch', center: [21.7051, 72.9959], zoom: 13, has_data: true, data_source: 'gee' },
  { key: 'navsari', name: 'Navsari', center: [20.9467, 72.9520], zoom: 13, has_data: true, data_source: 'gee' },
  { key: 'vapi', name: 'Vapi', center: [20.3893, 72.9106], zoom: 13, has_data: true, data_source: 'gee' },
];

const GUJARAT_CITY_KEYS = new Set(FALLBACK_CITIES.map(city => city.key));

const CityContext = createContext(null);

export function CityProvider({ children }) {
  const [city, setCity] = useState(FALLBACK_CITIES[0]);
  const [cities, setCities] = useState(FALLBACK_CITIES);

  useEffect(() => {
    fetch('/api/v1/satellite/cities')
      .then(r => r.json())
      .then(allCities => {
        if (Array.isArray(allCities) && allCities.length > 0) {
          const mapped = allCities
            .filter(c => GUJARAT_CITY_KEYS.has(c.key))
            .map(c => ({
              key: c.key,
              name: c.name,
              center: c.center,
              bbox: c.bbox,
              zoom: c.zoom || 11,
              has_data: true,
              data_source: 'gee',
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
