import Navbar from './Navbar';
import DateRangeControl from '../common/DateRangeControl';
import SaarthiWidget from '../common/SaarthiWidget';

export default function DashboardLayout({ children }) {
  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      <Navbar />
      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6">
        <div className="flex justify-end mb-4">
          <DateRangeControl />
        </div>
        {children}
        <SaarthiWidget />
      </main>
    </div>
  );
}
