import Hero from '@/components/landing/Hero';
import DecisionInput from '@/components/landing/DecisionInput';
import FeatureCards from '@/components/landing/FeatureCards';

export default function LandingPage() {
  return (
    <main className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <Hero />
      <DecisionInput />
      <FeatureCards />
    </main>
  );
}
