import { BrowserRouter, Routes, Route } from 'react-router-dom';
import WeatherDashboard from './components/WeatherDashboard';
import './styles.css';

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<WeatherDashboard />} />
                <Route path="*" element={<WeatherDashboard />} />
            </Routes>
        </BrowserRouter>
    );
}



export default App;