import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Guest from './pages/Guest'
import Staff from './pages/Staff'
import Kitchen from './pages/Kitchen'
import Manager from './pages/Manager'
import Dashboard from './pages/Dashboard'
import Demo from './pages/Demo'
import QrSheet from './pages/QrSheet'
import Branding from './pages/Branding'
import { Protect, LoginPage } from './lib/staff'
import './styles.css'

const M = ['manager'], W = ['manager', 'waiter'], K = ['manager', 'kitchen']
createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <Routes>
      <Route path="/r/:slug/t/:table" element={<Guest />} />
      <Route path="/demo" element={<Demo />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/staff" element={<Protect roles={W}><Staff /></Protect>} />
      <Route path="/kitchen" element={<Protect roles={K}><Kitchen /></Protect>} />
      <Route path="/manager" element={<Protect roles={M}><Dashboard /></Protect>} />
      <Route path="/menu" element={<Protect roles={M}><Manager /></Protect>} />
      <Route path="/qr" element={<Protect roles={M}><QrSheet /></Protect>} />
      <Route path="/branding" element={<Protect roles={M}><Branding /></Protect>} />
      <Route path="*" element={<p className="pad">Scan the QR code on your table.</p>} />
    </Routes>
  </BrowserRouter>
)
