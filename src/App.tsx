import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Search, Droplets, 
  Sun, Moon, CloudRain, Clock, AlertTriangle,
  CloudLightning, Key, X, Globe, History, Heart, Activity,
  Wind, Eye, Gauge, Sunrise, Sunset, Zap, ShieldAlert
} from 'lucide-react';
import { XAxis, ResponsiveContainer, BarChart, Bar, AreaChart, Area } from 'recharts';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';

interface WeatherState {
  temp: number; high: number; low: number;
  condition: string; humidity: number; wind: number; windDeg: number;
  pressure: number; visibility: number;
  lat: number; lon: number; isReal: boolean;
  aqi: number; uvIndex: number;
  sunrise: string; sunset: string;
}

const initialMockData: WeatherState = {
  temp: 26, high: 29, low: 16, condition: 'Mostly Sunny', humidity: 45, wind: 14, windDeg: 90, pressure: 1012, visibility: 10, lat: 40.7128, lon: -74.0060, isReal: false,
  aqi: 2, uvIndex: 6, sunrise: '06:12 AM', sunset: '07:45 PM'
};

const mockTrendData = [
  { time: '12 AM', temp: 18 }, { time: '4 AM', temp: 16 }, { time: '8 AM', temp: 20 }, { time: '12 PM', temp: 26 }, { time: '4 PM', temp: 28 }, { time: '8 PM', temp: 22 }
];

const mockPrecipitation = [
  { time: 'Now', amount: 0 }, { time: '1h', amount: 10 }, { time: '2h', amount: 45 }, { time: '3h', amount: 80 }, { time: '4h', amount: 30 }, { time: '5h', amount: 5 }
];

function ChangeView({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 10);
  }, [center, map]);
  return null;
}

export default function App() {
  const [search, setSearch] = useState('New York');
  const [unit, setUnit] = useState<'C' | 'F'>('C');
  const [isNight, setIsNight] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());
  const [apiKey, setApiKey] = useState(localStorage.getItem('weather_api_key') || '');
  const [showApiInput, setShowApiInput] = useState(false);
  const [weatherData, setWeatherData] = useState<WeatherState>(initialMockData);
  const [loading, setLoading] = useState(false);
  const [scrubberOffset, setScrubberOffset] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchWeather = useCallback(async (targetCity: string = search) => {
    if (!apiKey) {
      const cityHash = targetCity.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      setWeatherData({
        ...initialMockData,
        temp: 15 + (cityHash % 20),
        condition: cityHash % 2 === 0 ? 'Clear Sky' : 'Broken Clouds',
        lat: 40.7128 + (cityHash % 5), lon: -74.0060 + (cityHash % 5),
        aqi: (cityHash % 5) + 1,
        uvIndex: (cityHash % 10),
        isReal: false
      });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${targetCity}&units=metric&appid=${apiKey}`);
      const data = await res.json();
      if (data.cod !== 200) throw new Error(data.message);

      const formatTime = (ts: number) => new Date(ts * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      setWeatherData({
        temp: Math.round(data.main.temp), high: Math.round(data.main.temp_max), low: Math.round(data.main.temp_min),
        condition: data.weather[0].main, humidity: data.main.humidity,
        wind: Math.round(data.wind.speed * 3.6), windDeg: data.wind.deg,
        pressure: data.main.pressure, visibility: data.visibility / 1000,
        lat: data.coord.lat, lon: data.coord.lon,
        aqi: 2, uvIndex: 5,
        sunrise: formatTime(data.sys.sunrise), sunset: formatTime(data.sys.sunset),
        isReal: true
      });
    } catch (err: any) { console.error(err.message); }
    finally { setLoading(false); }
  }, [apiKey, search]);

  useEffect(() => { fetchWeather(); }, [fetchWeather]);

  const currentDisplayWeather = useMemo(() => {
    if (scrubberOffset === 0) return weatherData;
    
    // Create futuristic simulation logic
    const factor = scrubberOffset / 4;
    const tempChange = Math.round(Math.sin(factor) * 5);
    const humidChange = Math.round(Math.cos(factor) * 10);
    const windChange = Math.round(Math.sin(factor * 2) * 8);
    
    return { 
      ...weatherData, 
      temp: weatherData.temp + tempChange, 
      humidity: Math.max(0, Math.min(100, weatherData.humidity + humidChange)),
      wind: Math.max(0, weatherData.wind + windChange),
      condition: scrubberOffset > 8 ? 'Thunderstorms' : (scrubberOffset > 4 ? 'Cloudy' : weatherData.condition),
      aqi: Math.max(1, Math.min(5, weatherData.aqi + (scrubberOffset % 2 === 0 ? 1 : -1))),
      uvIndex: Math.max(0, weatherData.uvIndex + (scrubberOffset > 6 ? -2 : 1)),
      isReal: false 
    };
  }, [weatherData, scrubberOffset]);

  const aqiLabel = useMemo(() => {
    const labels = ["Good", "Fair", "Moderate", "Poor", "Very Poor"];
    return labels[currentDisplayWeather.aqi - 1] || "Unknown";
  }, [currentDisplayWeather.aqi]);

  const healthSuggestion = useMemo(() => {
    const cond = currentDisplayWeather.condition.toLowerCase();
    const temp = currentDisplayWeather.temp;
    if (cond.includes('rain') || cond.includes('storm')) return "Atmospheric instability detected. High risk of precipitation. Emergency shelter protocols recommended.";
    if (cond.includes('clear') || cond.includes('sun')) {
      if (temp > 30) return "Extreme thermal radiation. Critical UV peak. Hydration levels must be maintained at 100%.";
      return "Optimal mission conditions. UV radiation within safety limits. Proceed with outdoor activities.";
    }
    if (cond.includes('cloud') || cond.includes('overcast')) return "Reduced visibility. Atmospheric saturation high. Respiratory risk: Nominal.";
    if (temp < 10) return "Thermal depletion risk. Advanced insulation required. Bio-metric strain: High.";
    return "Conditions stable. MetOS systems operating within nominal parameters.";
  }, [currentDisplayWeather]);

  useEffect(() => {
    if (isNight) document.body.classList.add('night-theme');
    else document.body.classList.remove('night-theme');
  }, [isNight]);

  const tempConvert = (val: number) => unit === 'C' ? val : Math.round((val * 9/5) + 32);

  return (
    <div className="container">
      <div className="panel" style={{borderLeft: '4px solid var(--color-emerald)', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
        <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
          <AlertTriangle className="text-emerald dynamic-icon" size={24} />
          <p style={{fontWeight: 800}}>MetOS Intelligence Uplink Active.</p>
        </div>
        <button className="btn btn--glass" onClick={() => setShowApiInput(true)}>Config API</button>
      </div>

      <header style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem', flexWrap: 'wrap', gap: '2rem'}}>
        <div>
          <h1 style={{display: 'flex', alignItems: 'center', gap: '1rem'}}><CloudLightning className="text-emerald dynamic-icon" size={48} />MetOS Intelligence</h1>
          <p className="text-label" style={{marginTop: '0.5rem'}}>{loading ? 'Syncing...' : 'Satellite Imagery Active'}</p>
        </div>
        <div style={{display: 'flex', gap: '1rem'}}>
          <div className="panel" style={{padding: '0.8rem 1.5rem', borderRadius: '12px', fontFamily: 'monospace', fontSize: '1.2rem', fontWeight: 900}}><Clock className="text-emerald" size={20} style={{marginRight: '0.5rem'}} /> {currentTime}</div>
          <button className="btn btn--glass" onClick={() => setUnit(unit === 'C' ? 'F' : 'C')}>&deg;{unit}</button>
          <button className="btn btn--glass" onClick={() => setIsNight(!isNight)}>{isNight ? <Moon size={20}/> : <Sun size={20}/>}</button>
        </div>
      </header>

      {showApiInput && (
        <div style={{position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', padding: '1rem'}}>
          <div className="panel" style={{maxWidth: '500px', width: '100%', margin: 'auto'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '2rem'}}><h3 style={{color: 'white'}}><Key className="text-emerald"/> API Config</h3><X style={{cursor: 'pointer'}} onClick={() => setShowApiInput(false)}/></div>
            <input type="password" className="input" placeholder="Paste OpenWeatherMap API Key..." value={apiKey} onChange={(e) => setApiKey(e.target.value)} style={{marginBottom: '1.5rem'}} />
            <button className="btn btn--primary" style={{width: '100%'}} onClick={() => {localStorage.setItem('weather_api_key', apiKey); setApiKey(apiKey); setShowApiInput(false);}}>Save & Initialize</button>
          </div>
        </div>
      )}

      <div className="panel" style={{marginBottom: '2rem', display: 'flex', gap: '1rem'}}>
        <div style={{flex: 1, position: 'relative'}}>
          <Search style={{position: 'absolute', left: '1.5rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-emerald)'}} size={24} />
          <input className="input" style={{paddingLeft: '4rem'}} placeholder="Search Station..." onKeyDown={(e) => { if (e.key === 'Enter') setSearch((e.target as HTMLInputElement).value); }} />
        </div>
        <button className="btn btn--primary" onClick={() => fetchWeather()}>Sync</button>
      </div>

      <main className="dashboard-grid">
        <div className="panel col-span-3 hero-station">
          <div className="hero-station__data">
            <div style={{display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem'}}><span className="text-label" style={{background: 'rgba(16, 185, 129, 0.1)', padding: '0.4rem 1rem', borderRadius: '100px', color: 'var(--color-emerald)'}}>Station: {search}</span><Heart className="text-emerald" size={24} /></div>
            <h2 className="hero-station__temp">{tempConvert(currentDisplayWeather.temp)}&deg;</h2>
            <p style={{fontSize: '2rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-emerald)'}}>{currentDisplayWeather.condition}</p>
          </div>
          <div style={{textAlign: 'center'}}>{currentDisplayWeather.condition.toLowerCase().includes('rain') || currentDisplayWeather.condition.toLowerCase().includes('storm') ? <CloudRain className="dynamic-icon" size={200} /> : <Sun className="dynamic-icon" size={200} />}</div>
        </div>

        <div className="panel" style={{display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center'}}>
          <div className="text-emerald" style={{marginBottom: '1rem'}}><ShieldAlert size={48} style={{margin: 'auto'}}/></div>
          <p className="text-label">Air Quality Index</p>
          <p style={{fontSize: '2.5rem', fontWeight: 900}}>{currentDisplayWeather.aqi}</p>
          <p className="text-emerald" style={{fontWeight: 800}}>{aqiLabel}</p>
        </div>

        <div className="panel" style={{display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center'}}>
          <div className="text-emerald" style={{marginBottom: '1rem'}}><Zap size={48} style={{margin: 'auto'}}/></div>
          <p className="text-label">UV Index</p>
          <p style={{fontSize: '2.5rem', fontWeight: 900}}>{currentDisplayWeather.uvIndex}</p>
          <p className="text-emerald" style={{fontWeight: 800}}>{currentDisplayWeather.uvIndex > 5 ? 'High Risk' : 'Low Risk'}</p>
        </div>

        <div className="panel" style={{display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center'}}>
          <div className="text-emerald" style={{marginBottom: '1rem'}}><Droplets size={48} style={{margin: 'auto'}}/></div>
          <p className="text-label">Humidity</p>
          <p style={{fontSize: '2.5rem', fontWeight: 900}}>{currentDisplayWeather.humidity}%</p>
        </div>

        <div className="panel" style={{display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center'}}>
          <div className="text-emerald" style={{marginBottom: '1rem'}}><Wind size={48} style={{margin: 'auto'}}/></div>
          <p className="text-label">Wind Velocity</p>
          <p style={{fontSize: '2.5rem', fontWeight: 900}}>{currentDisplayWeather.wind} <span style={{fontSize: '1rem'}}>km/h</span></p>
        </div>

        <div className="panel" style={{display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center'}}>
          <div className="text-emerald" style={{marginBottom: '1rem'}}><Gauge size={48} style={{margin: 'auto'}}/></div>
          <p className="text-label">Pressure</p>
          <p style={{fontSize: '2.5rem', fontWeight: 900}}>{currentDisplayWeather.pressure} <span style={{fontSize: '1rem'}}>hPa</span></p>
        </div>

        <div className="panel" style={{display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center'}}>
          <div className="text-emerald" style={{marginBottom: '1rem'}}><Eye size={48} style={{margin: 'auto'}}/></div>
          <p className="text-label">Visibility</p>
          <p style={{fontSize: '2.5rem', fontWeight: 900}}>{currentDisplayWeather.visibility} <span style={{fontSize: '1rem'}}>km</span></p>
        </div>

        <div className="panel col-span-3" style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2rem'}}>
          <div style={{display: 'flex', alignItems: 'center', gap: '1.5rem'}}>
            <Sunrise size={40} className="text-emerald"/>
            <div>
              <p className="text-label">Sunrise Telemetry</p>
              <p style={{fontSize: '1.5rem', fontWeight: 900}}>{currentDisplayWeather.sunrise}</p>
            </div>
          </div>
          <div style={{display: 'flex', alignItems: 'center', gap: '1.5rem'}}>
            <Sunset size={40} className="text-emerald"/>
            <div>
              <p className="text-label">Sunset Telemetry</p>
              <p style={{fontSize: '1.5rem', fontWeight: 900}}>{currentDisplayWeather.sunset}</p>
            </div>
          </div>
        </div>

        <div className="panel col-span-3">
          <h3 style={{color: 'white', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem'}}><Globe className="text-emerald"/> Live Satellite Telemetry</h3>
          <div className="radar-view" style={{height: '500px'}}>
            <MapContainer center={[weatherData.lat, weatherData.lon]} zoom={10} style={{ height: '100%', width: '100%', borderRadius: '20px' }} zoomControl={false}>
              <ChangeView center={[weatherData.lat, weatherData.lon]} />
              <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" attribution="&copy; Esri" />
            </MapContainer>
            <div style={{position: 'absolute', bottom: '2rem', right: '2rem', background: 'rgba(0,0,0,0.8)', padding: '0.5rem 1rem', borderRadius: '8px', fontSize: '0.7rem', fontWeight: 900, color: 'var(--color-emerald)', zIndex: 1000}}>SATELLITE LINK: ACTIVE</div>
          </div>
        </div>

        <div className="panel col-span-3">
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem'}}>
            <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}><History size={24} className="text-emerald"/><h3 style={{color: 'white', fontWeight: 900, textTransform: 'uppercase'}}>Temporal Projection Scrubber</h3></div>
            <span style={{color: scrubberOffset === 0 ? 'var(--color-emerald)' : 'var(--color-violet)', fontWeight: 900, fontSize: '1.2rem'}}>{scrubberOffset === 0 ? 'LIVE FEED' : `T + ${scrubberOffset}H FORECAST`}</span>
          </div>
          <input type="range" min="0" max="24" step="1" value={scrubberOffset} onChange={(e) => setScrubberOffset(parseInt(e.target.value))} className="scrubber-input" />
          <div style={{display: 'flex', justifyContent: 'space-between', marginTop: '1rem'}} className="text-label"><span>Current</span><span>+12 Hours</span><span>+24 Hours</span></div>
        </div>

        <div className="panel flex flex-col"><h3 className="text-label" style={{marginBottom: '2rem'}}>24h Performance</h3><div style={{height: '250px', width: '100%'}}><ResponsiveContainer width="100%" height="100%"><AreaChart data={mockTrendData}><XAxis dataKey="time" stroke="var(--text-muted)" fontSize={10} tickLine={false} /><Area type="monotone" dataKey="temp" stroke="var(--color-emerald)" strokeWidth={4} fill="rgba(16, 185, 129, 0.1)" /></AreaChart></ResponsiveContainer></div></div>
        <div className="panel"><h3 className="text-label" style={{marginBottom: '2rem'}}>Saturation</h3><div style={{height: '250px', width: '100%'}}><ResponsiveContainer width="100%" height="100%"><BarChart data={mockPrecipitation}><Bar dataKey="amount" fill="var(--color-emerald)" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div></div>

        <div className="panel col-span-3" style={{display: 'flex', alignItems: 'center', gap: '3rem', background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(15, 23, 42, 0.8) 100%)'}}>
          <div style={{background: 'var(--color-bg)', padding: '1.5rem', borderRadius: '50%', boxShadow: '0 0 20px var(--color-emerald-glow)'}}>
            <Activity className="text-emerald" size={48} />
          </div>
          <div>
            <h3 className="text-label" style={{color: 'var(--color-emerald)', marginBottom: '0.5rem'}}>Health & Wellness Intelligence</h3>
            <p style={{fontSize: '1.25rem', fontWeight: 700, color: 'white', lineHeight: '1.4'}}>{healthSuggestion}</p>
          </div>
        </div>
      </main>
      <div className="ticker"><div className="ticker__text">METOS GLOBAL FEED &bull; SATELLITE LINK STABLE &bull; {search.toUpperCase()} &bull; STATUS: {currentDisplayWeather.condition.toUpperCase()}</div></div>
    </div>
  );
}