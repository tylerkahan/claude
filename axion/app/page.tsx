import Link from 'next/link'

export default function HomePage() {
  return (
    <div style={{ minHeight: '100vh', background: '#03040d', color: '#e8eaf6', fontFamily: 'Inter, sans-serif', overflowX: 'hidden' }}>

      {/* Nav */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, height: '64px', background: 'rgba(3,4,13,0.8)', borderBottom: '1px solid rgba(0,100,255,0.1)', backdropFilter: 'blur(20px)', display: 'flex', alignItems: 'center', padding: '0 40px', gap: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
          <div style={{ width: '30px', height: '30px', background: 'linear-gradient(135deg,#0055ff,#00aaff)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 16px rgba(0,120,255,0.4)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M12 2L4 19h16L12 2z"/></svg>
          </div>
          <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: '20px', fontWeight: 800, color: '#fff', letterSpacing: '.07em' }}>AXION</span>
        </div>
        <div style={{ display: 'flex', gap: '28px' }}>
          {['Features', 'Security', 'Pricing', 'Attorneys'].map(item => (
            <a key={item} href={`#${item.toLowerCase()}`} style={{ fontSize: '14px', color: '#6b7ab8', textDecoration: 'none', transition: 'color .15s' }}>{item}</a>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '10px', flex: 1, justifyContent: 'flex-end' }}>
          <Link href="/login" style={{ padding: '8px 18px', background: 'transparent', border: '1px solid rgba(0,100,255,0.25)', borderRadius: '8px', color: '#6b7ab8', textDecoration: 'none', fontSize: '14px', fontWeight: 600 }}>Sign In</Link>
          <Link href="/login" style={{ padding: '8px 18px', background: 'linear-gradient(135deg,#0055ff,#00aaff)', borderRadius: '8px', color: '#fff', textDecoration: 'none', fontSize: '14px', fontWeight: 700, boxShadow: '0 0 20px rgba(0,120,255,0.3)' }}>Get Started Free</Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ paddingTop: '140px', paddingBottom: '100px', textAlign: 'center', padding: '140px 40px 100px', position: 'relative' }}>
        {/* Background glow */}
        <div style={{ position: 'absolute', top: '10%', left: '50%', transform: 'translateX(-50%)', width: '600px', height: '400px', background: 'radial-gradient(ellipse,rgba(0,80,255,0.12) 0%,transparent 70%)', pointerEvents: 'none' }} />

        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 14px', background: 'rgba(0,170,255,0.08)', border: '1px solid rgba(0,170,255,0.2)', borderRadius: '100px', fontSize: '12px', fontWeight: 600, color: '#00aaff', marginBottom: '28px' }}>
          <span style={{ width: '6px', height: '6px', background: '#00aaff', borderRadius: '50%', boxShadow: '0 0 8px #00aaff', display: 'inline-block' }} />
          Now in Beta · Free to start
        </div>

        <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: '64px', fontWeight: 800, color: '#fff', lineHeight: 1.1, marginBottom: '24px', maxWidth: '800px', margin: '0 auto 24px' }}>
          Your estate,{' '}
          <span style={{ background: 'linear-gradient(135deg,#0055ff,#00aaff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            organized forever.
          </span>
        </h1>

        <p style={{ fontSize: '20px', color: '#6b7ab8', maxWidth: '560px', margin: '0 auto 40px', lineHeight: '1.7' }}>
          Axion is the estate platform that keeps everything — your documents, assets, beneficiaries, and wishes — in one secure place for the people you love.
        </p>

        <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/login" style={{ padding: '14px 32px', background: 'linear-gradient(135deg,#0055ff,#00aaff)', borderRadius: '12px', color: '#fff', textDecoration: 'none', fontSize: '16px', fontWeight: 700, boxShadow: '0 0 30px rgba(0,120,255,0.35)', display: 'inline-block' }}>
            Start for Free →
          </Link>
          <a href="#features" style={{ padding: '14px 32px', background: 'transparent', border: '1px solid rgba(0,100,255,0.25)', borderRadius: '12px', color: '#6b7ab8', textDecoration: 'none', fontSize: '16px', fontWeight: 600, display: 'inline-block' }}>
            See features
          </a>
        </div>

        <div style={{ marginTop: '60px', display: 'flex', gap: '40px', justifyContent: 'center', flexWrap: 'wrap' }}>
          {[{ val: '256-bit', label: 'Encryption' }, { val: 'SOC 2', label: 'Compliant' }, { val: '$0', label: 'To start' }, { val: '10 min', label: 'Setup' }].map(s => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: '24px', fontWeight: 800, color: '#fff' }}>{s.val}</div>
              <div style={{ fontSize: '12px', color: '#6b7ab8', marginTop: '2px' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" style={{ padding: '80px 40px', maxWidth: '1100px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '56px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#00aaff', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: '12px' }}>Everything you need</div>
          <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: '40px', fontWeight: 800, color: '#fff', marginBottom: '14px' }}>Built for real life, not just lawyers</h2>
          <p style={{ fontSize: '16px', color: '#6b7ab8', maxWidth: '500px', margin: '0 auto' }}>Every feature you need to organize your estate and give your family peace of mind.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
          {[
            { icon: '🔒', title: 'Document Vault', desc: 'Store your will, trust, insurance policies, and property deeds with 256-bit encryption.' },
            { icon: '📈', title: 'Net Worth Tracker', desc: 'Track all your assets — real estate, investments, crypto, and business interests — in one place.' },
            { icon: '👥', title: 'Beneficiary Management', desc: 'Designate beneficiaries, executors, trustees, and healthcare proxies with clear roles.' },
            { icon: '⚖️', title: 'Attorney Connect', desc: 'Request consultations with licensed estate attorneys directly through the platform.' },
            { icon: '🤖', title: 'AI Advisor', desc: 'Ask plain-English questions about estate planning and get instant, knowledgeable answers.' },
            { icon: '✅', title: 'Compliance Checklist', desc: 'See exactly what\'s missing from your estate plan with an interactive readiness score.' },
            { icon: '₿', title: 'Digital Assets', desc: 'Catalog your crypto wallets, online accounts, and leave clear after-death instructions.' },
            { icon: '🌳', title: 'Entity Tree', desc: 'Visualize how your assets flow through trusts, LLCs, and other legal structures.' },
            { icon: '📊', title: 'Tax Optimizer', desc: 'Understand your estate tax exposure and explore strategies to minimize it.' },
          ].map(f => (
            <div key={f.title} style={{ background: 'rgba(8,14,40,0.7)', border: '1px solid rgba(0,100,255,0.14)', borderRadius: '16px', padding: '24px', backdropFilter: 'blur(20px)', transition: 'border-color .2s' }}>
              <div style={{ fontSize: '28px', marginBottom: '12px' }}>{f.icon}</div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>{f.title}</div>
              <div style={{ fontSize: '13px', color: '#6b7ab8', lineHeight: '1.65' }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Security */}
      <section id="security" style={{ padding: '80px 40px', background: 'rgba(0,40,140,0.04)', borderTop: '1px solid rgba(0,100,255,0.08)', borderBottom: '1px solid rgba(0,100,255,0.08)' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '60px', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#00aaff', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: '12px' }}>Security first</div>
            <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: '36px', fontWeight: 800, color: '#fff', marginBottom: '16px', lineHeight: 1.2 }}>Your estate data stays yours. Always.</h2>
            <p style={{ fontSize: '15px', color: '#6b7ab8', lineHeight: '1.7', marginBottom: '28px' }}>
              We use bank-grade 256-bit AES encryption at rest and TLS 1.3 in transit. Your documents are stored in isolated, encrypted buckets. We never sell your data or use it to train AI models.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {['256-bit AES encryption at rest', 'TLS 1.3 in transit', 'SOC 2 Type II compliant storage', 'Private isolated document buckets', 'Zero third-party data sharing'].map(item => (
                <div key={item} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: '#e8eaf6' }}>
                  <span style={{ color: '#00cc66', fontWeight: 700 }}>✓</span> {item}
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            {[
              { icon: '🔒', label: 'Encrypted Vault', color: '#0055ff' },
              { icon: '🛡', label: 'SOC 2 Compliant', color: '#6644ff' },
              { icon: '🔑', label: 'Zero Knowledge', color: '#00cc66' },
              { icon: '🌐', label: 'TLS 1.3', color: '#00aaff' },
            ].map(b => (
              <div key={b.label} style={{ background: `${b.color}10`, border: `1px solid ${b.color}30`, borderRadius: '14px', padding: '20px', textAlign: 'center' }}>
                <div style={{ fontSize: '28px', marginBottom: '8px' }}>{b.icon}</div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>{b.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" style={{ padding: '80px 40px', maxWidth: '900px', margin: '0 auto', textAlign: 'center' }}>
        <div style={{ fontSize: '12px', fontWeight: 700, color: '#00aaff', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: '12px' }}>Simple pricing</div>
        <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: '40px', fontWeight: 800, color: '#fff', marginBottom: '14px' }}>Start free. Upgrade when ready.</h2>
        <p style={{ fontSize: '16px', color: '#6b7ab8', marginBottom: '48px' }}>No credit card required to get started.</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
          {[
            { name: 'Free', price: '$0', period: 'forever', features: ['Document Vault (5 docs)', 'Net Worth tracking', 'Beneficiary management', 'Compliance checklist', 'AI Advisor (10 msgs/mo)'], cta: 'Get Started', primary: false },
            { name: 'Pro', price: '$19', period: '/month', features: ['Unlimited documents', 'Unlimited assets', 'Attorney Connect', 'Unlimited AI Advisor', 'Entity Tree', 'Priority support'], cta: 'Start Free Trial', primary: true },
            { name: 'Family', price: '$39', period: '/month', features: ['Everything in Pro', 'Up to 5 family members', 'Shared vault access', 'Dedicated attorney match', 'Estate review calls', 'White-glove onboarding'], cta: 'Contact Us', primary: false },
          ].map(plan => (
            <div key={plan.name} style={{ background: plan.primary ? 'rgba(0,80,200,0.1)' : 'rgba(8,14,40,0.7)', border: `1px solid ${plan.primary ? 'rgba(0,170,255,0.35)' : 'rgba(0,100,255,0.14)'}`, borderRadius: '20px', padding: '28px 24px', backdropFilter: 'blur(20px)', position: 'relative' }}>
              {plan.primary && <div style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(135deg,#0055ff,#00aaff)', borderRadius: '20px', padding: '4px 16px', fontSize: '11px', fontWeight: 700, color: '#fff', whiteSpace: 'nowrap' }}>Most Popular</div>}
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#6b7ab8', marginBottom: '8px' }}>{plan.name}</div>
              <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: '40px', fontWeight: 800, color: '#fff', lineHeight: 1 }}>{plan.price}<span style={{ fontSize: '14px', color: '#6b7ab8', fontWeight: 400 }}>{plan.period}</span></div>
              <div style={{ margin: '24px 0', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {plan.features.map(f => (
                  <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#e8eaf6', textAlign: 'left' }}>
                    <span style={{ color: '#00cc66', flexShrink: 0 }}>✓</span> {f}
                  </div>
                ))}
              </div>
              <Link href="/login" style={{ display: 'block', padding: '11px', background: plan.primary ? 'linear-gradient(135deg,#0055ff,#00aaff)' : 'transparent', border: plan.primary ? 'none' : '1px solid rgba(0,100,255,0.25)', borderRadius: '10px', color: plan.primary ? '#fff' : '#6b7ab8', textDecoration: 'none', fontSize: '14px', fontWeight: 700, textAlign: 'center' }}>
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '80px 40px', textAlign: 'center', borderTop: '1px solid rgba(0,100,255,0.08)' }}>
        <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: '40px', fontWeight: 800, color: '#fff', marginBottom: '16px' }}>Your family deserves a plan.</h2>
        <p style={{ fontSize: '16px', color: '#6b7ab8', marginBottom: '32px' }}>Set up your estate in minutes. Free to start, no lawyer required.</p>
        <Link href="/login" style={{ padding: '15px 36px', background: 'linear-gradient(135deg,#0055ff,#00aaff)', borderRadius: '12px', color: '#fff', textDecoration: 'none', fontSize: '16px', fontWeight: 700, boxShadow: '0 0 30px rgba(0,120,255,0.35)', display: 'inline-block' }}>
          Get Started Free →
        </Link>
      </section>

      {/* Footer */}
      <footer style={{ padding: '32px 40px', borderTop: '1px solid rgba(0,100,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '22px', height: '22px', background: 'linear-gradient(135deg,#0055ff,#00aaff)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="white"><path d="M12 2L4 19h16L12 2z"/></svg>
          </div>
          <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 800, color: '#fff', letterSpacing: '.07em' }}>AXION</span>
          <span style={{ fontSize: '12px', color: '#3d4a7a', marginLeft: '8px' }}>© 2026 Axion Estate Platform</span>
        </div>
        <div style={{ display: 'flex', gap: '24px' }}>
          {['Privacy', 'Terms', 'Security', 'Contact'].map(item => (
            <a key={item} href="#" style={{ fontSize: '13px', color: '#3d4a7a', textDecoration: 'none' }}>{item}</a>
          ))}
        </div>
      </footer>
    </div>
  )
}
