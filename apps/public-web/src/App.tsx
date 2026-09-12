import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { Button, Card, Badge, EmptyState } from '@study-karnataka/ui';

const HeaderPlaceholder: React.FC = () => (
  <header
    style={{
      backgroundColor: '#FFFFFF',
      borderBottom: '1px solid #E6EAF0',
      padding: '16px 32px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      position: 'sticky',
      top: 0,
      zIndex: 50,
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <div
        style={{
          width: '32px',
          height: '32px',
          backgroundColor: '#EF2323',
          color: '#FFFFFF',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 800,
          fontSize: '16px',
        }}
      >
        SK
      </div>
      <span style={{ fontSize: '18px', fontWeight: 700, color: '#111827' }}>Study Karnataka</span>
    </div>

    <nav style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
      <Link to="/" style={{ textDecoration: 'none', color: '#334155', fontWeight: 500, fontSize: '14px' }}>
        Home
      </Link>
      <a href="#about" style={{ textDecoration: 'none', color: '#64748B', fontWeight: 500, fontSize: '14px' }}>
        About Exams
      </a>
      <a href="#features" style={{ textDecoration: 'none', color: '#64748B', fontWeight: 500, fontSize: '14px' }}>
        Features
      </a>
      <Button variant="primary" size="sm">
        Student Portal
      </Button>
    </nav>
  </header>
);

const FooterPlaceholder: React.FC = () => (
  <footer
    style={{
      backgroundColor: '#FFFFFF',
      borderTop: '1px solid #E6EAF0',
      padding: '32px 24px',
      textAlign: 'center',
      color: '#64748B',
      fontSize: '14px',
    }}
  >
    <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
      <div>
        <strong style={{ color: '#111827' }}>Study Karnataka Platform</strong>
        <p style={{ margin: '4px 0 0 0' }}>Premier prep platform for KPSC, KAS, PSI, FDA, SDA exams.</p>
      </div>
      <div style={{ display: 'flex', gap: '16px' }}>
        <span>English & Kannada Prep</span>
        <span>•</span>
        <span>State Syllabus Aligned</span>
      </div>
    </div>
    <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #F1F5F9', fontSize: '12px' }}>
      © 2026 Study Karnataka Platform. All rights reserved.
    </div>
  </footer>
);

const HomePage: React.FC = () => {
  const [apiConnected, setApiConnected] = useState<boolean | null>(null);

  useEffect(() => {
    fetch('http://localhost:4000/health')
      .then((res) => res.json())
      .then((data) => setApiConnected(data.success === true))
      .catch(() => setApiConnected(false));
  }, []);

  return (
    <main style={{ maxWidth: '1000px', margin: '40px auto', padding: '0 24px', flex: 1 }}>
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <Badge label="Public Application Shell" variant="info" />
          <Badge
            label={apiConnected === true ? 'API Connected' : apiConnected === false ? 'API Offline' : 'Checking API...'}
            variant={apiConnected === true ? 'success' : 'warning'}
          />
        </div>
        <h1 style={{ fontSize: '38px', fontWeight: 800, color: '#111827', margin: '8px 0 16px 0', lineHeight: 1.2 }}>
          Karnataka Competitive Exam Preparation Platform
        </h1>
        <p style={{ fontSize: '16px', color: '#475569', maxWidth: '680px', margin: '0 auto 24px auto' }}>
          Targeted study plans, bilingual question banks, and Karnataka current affairs tailored for state exams.
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <Button variant="primary" size="lg">
            Explore Preparation Plans
          </Button>
          <Button variant="outline" size="lg">
            Learn More
          </Button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
        <Card title="KPSC & KAS Exam Focus" subtitle="State Civil Services Preparation">
          Structured roadmaps covering General Studies, Karnataka History, Geography, and Polity.
        </Card>
        <Card title="Bilingual Study Resources" subtitle="English & Kannada Medium">
          High-yield notes and question banks available in both English and Kannada.
        </Card>
        <Card title="PSI / FDA / SDA Module" subtitle="Sub-Inspector & Executive Exams">
          Dedicated objective tests and rapid recall notes for state recruitment.
        </Card>
      </div>
    </main>
  );
};

const NotFoundPage: React.FC = () => (
  <main style={{ maxWidth: '600px', margin: '60px auto', padding: '0 24px', flex: 1, textAlign: 'center' }}>
    <EmptyState
      title="404 — Page Not Found"
      description="The public page you are looking for does not exist."
      actionLabel="Back to Home"
      onAction={() => (window.location.href = '/')}
    />
  </main>
);

export const App: React.FC = () => (
  <BrowserRouter>
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#F7F8FC', fontFamily: 'Inter, sans-serif' }}>
      <HeaderPlaceholder />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      <FooterPlaceholder />
    </div>
  </BrowserRouter>
);

export default App;
