import { useNavigate } from 'react-router-dom'

const VIDEO_URL =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260314_131748_f2ca2a28-fed7-44c8-b9a9-bd9acdd5ec31.mp4'

const NAV_LINKS = ['Home', 'Articles', 'Research', 'Videos', 'About']

export default function Landing() {
  const navigate = useNavigate()

  return (
    <div className="relative min-h-screen overflow-hidden bg-[hsl(201,100%,13%)] text-white">
      {/* Video background */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover z-0"
      >
        <source src={VIDEO_URL} type="video/mp4" />
      </video>

      {/* Subtle dark overlay so text stays readable */}
      <div className="absolute inset-0 z-[1] bg-black/30" />

      {/* Content */}
      <div className="relative z-10 flex flex-col min-h-screen">

        {/* Navigation */}
        <nav className="w-full max-w-7xl mx-auto px-8 py-6 flex items-center justify-between">
          {/* Logo */}
          <span className="text-3xl tracking-tight text-white select-none"
            style={{ fontFamily: "'Instrument Serif', serif" }}
          >
            Neuryn<sup className="text-xs align-super ml-0.5">®</sup>
          </span>

          {/* Nav links — desktop */}
          <div className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map((link, i) => (
              <button
                key={link}
                onClick={() => i > 0 && navigate('/browse')}
                className={`text-sm transition-colors ${
                  i === 0
                    ? 'text-white'
                    : 'text-[hsl(240,4%,66%)] hover:text-white'
                }`}
              >
                {link}
              </button>
            ))}
          </div>

          {/* Nav CTA */}
          <button
            onClick={() => navigate('/browse')}
            className="liquid-glass rounded-full px-6 py-2.5 text-sm text-white transition-transform hover:scale-[1.03] cursor-pointer"
          >
            Start Reading
          </button>
        </nav>

        {/* Hero */}
        <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-[90px]">
          <a
            href="https://anakin.io"
            target="_blank"
            rel="noopener noreferrer"
            className="animate-fade-rise liquid-glass group mb-8 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium text-white/90 transition-transform hover:scale-[1.03]"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            Live on Anakin
            <span className="text-white/50 transition-colors group-hover:text-white">↗</span>
          </a>

          <h1
            className="animate-fade-rise text-5xl sm:text-7xl md:text-8xl font-normal leading-[0.95] max-w-5xl"
            style={{
              fontFamily: "'Instrument Serif', serif",
              letterSpacing: '-2.46px',
            }}
          >
            Where <em className="not-italic text-[hsl(240,4%,66%)]">ideas</em> cut through{' '}
            <em className="not-italic text-[hsl(240,4%,66%)]">the noise.</em>
          </h1>

          <p className="animate-fade-rise-delay text-[hsl(240,4%,66%)] text-base sm:text-lg max-w-2xl mt-8 leading-relaxed">
            Neuryn is a curated collection of articles, research, videos, and essays
            for people who think carefully and build deliberately. No noise — only signal.
          </p>

          <button
            onClick={() => navigate('/browse')}
            className="animate-fade-rise-delay-2 liquid-glass rounded-full px-14 py-5 text-base text-white mt-12 transition-transform hover:scale-[1.03] cursor-pointer"
          >
            Enter Neuryn
          </button>
        </section>

      </div>
    </div>
  )
}
