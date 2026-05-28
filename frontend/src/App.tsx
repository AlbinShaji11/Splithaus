import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import SplitTool from './pages/SplitTool'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/split" element={<SplitTool />} />
      </Routes>
    </BrowserRouter>
  )
}
