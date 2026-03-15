import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import ClassicMode from './pages/ClassicMode';
import PerksMode from './pages/PerksMode';
import ZoomMode from './pages/ZoomMode';
import ConnectionsMode from './pages/ConnectionsMode';

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="classic" element={<ClassicMode />} />
          <Route path="perks" element={<PerksMode />} />
          <Route path="zoom" element={<ZoomMode />} />
          <Route path="connections" element={<ConnectionsMode />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default App;
