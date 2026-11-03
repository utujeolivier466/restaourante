import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Guest from './pages/Guest'
import Staff from './pages/Staff'
import Kitchen from './pages/Kitchen'
import Manager from './pages/Manager'
import Demo from './pages/Demo'
import QrSheet from './pages/QrSheet'
import Branding from './pages/Branding'
import './styles.css'

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <Routes>
      <Route path="/r/:slug/t/:table" element={<Guest />} />
      <Route path="/staff" element={<Staff />} />
      <Route path="/kitchen" element={<Kitchen />} />
      <Route path="/manager" element={<Manager />} />
      <Route path="/demo" element={<Demo />} />
      <Route path="/qr" element={<QrSheet />} />
      <Route path="/branding" element={<Branding />} />
      <Route path="*" element={<p className="pad">Scan the QR code on your table.</p>} />
    </Routes>
  </BrowserRouter>
)
