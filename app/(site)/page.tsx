import Image from "next/image";
import Link from "next/link";
import { Icon, type IconName } from "@/components/Icon";
import { BookButton, ChatLink } from "@/components/site/booking";
import { Reveal, SiteHeader } from "@/components/site/Chrome";
import { Fleet } from "@/components/site/Fleet";
import { HeroSearch } from "@/components/site/HeroSearch";
import { EMAIL, PHONE_DISPLAY, WHATSAPP_NUMBER } from "@/lib/config";

const STEPS: { icon: IconName; num: string; title: string; text: string }[] = [
  { icon: "car", num: "01", title: "Choose your car", text: "Pick from city cars, family SUVs and safari-ready 4x4s. Prices are per day, insurance included." },
  { icon: "whatsapp", num: "02", title: "Book on WhatsApp", text: "We confirm availability within minutes. Pay by MoMo, card or cash on delivery." },
  { icon: "key", num: "03", title: "Get the keys", text: "We bring the car to the airport, your hotel or your home, with a full tank and a quick walk-around." },
];

const PERKS: { icon: IconName; title: string; text: string }[] = [
  { icon: "plane", title: "Airport delivery", text: "Meet & greet at KGL arrivals" },
  { icon: "shield", title: "Fully insured", text: "Comprehensive cover on every car" },
  { icon: "steering", title: "Local drivers", text: "English, French & Kinyarwanda" },
  { icon: "clock", title: "24/7 support", text: "One call, any time, anywhere" },
];

const PLACES = [
  "Kigali International Airport",
  "Kigali City Centre (KN 4 Ave)",
  "Kimihurura, Nyarutarama, Kacyiru, Remera",
  "Free delivery to any Kigali hotel",
];

export default function HomePage() {
  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <SiteHeader />

      <main id="main">
        <section className="hero">
          <div className="hero__glow" aria-hidden="true" />
          <div className="container hero__inner">
            <h1 className="display hero__title">Premium car<br />rental in Kigali</h1>
            <p className="hero__sub">Clean, reliable cars delivered to the airport, your hotel or your door. Self-drive or with a local driver.</p>
            <HeroSearch />
          </div>

          <div className="hero__stage">
            <div className="hero__band" aria-hidden="true" />
            <Icon name="asterisk" className="spark spark--hero" />
            <div className="container">
              <figure className="hero__car">
                <Image src="/images/hero.jpg" alt="White SUV on a red-earth road" width={1800} height={1200} sizes="(max-width: 1012px) 100vw, 980px" priority />
              </figure>
            </div>
            <a href="#about" className="scroll-cue" aria-label="Scroll to learn more"><Icon name="arrow-down" /></a>
          </div>
        </section>

        <section className="about section" id="about">
          <div className="container about__grid">
            <Reveal className="about__text">
              <p className="eyebrow">Made in Kigali</p>
              <h2 className="display h2">Drive Rwanda<br />your way</h2>
              <p>SCARS is a Kigali car rental company for visitors, families and businesses. Every car is serviced between rentals, fully insured and ready for city streets or the road to Akagera, Nyungwe and Volcanoes National Park.</p>
              <p>Book in a couple of minutes on WhatsApp. We meet you at Kigali International Airport, your hotel or anywhere in the city, with clear daily prices in Rwandan francs and no surprise fees.</p>
              <ul className="stats">
                <li><strong>40+</strong><span>cars in the fleet</span></li>
                <li><strong>24/7</strong><span>roadside support</span></li>
                <li><strong>4.9</strong><span>average guest rating</span></li>
              </ul>
              <a href="#fleet" className="btn btn--dark">See all our cars <Icon name="arrow-right" /></a>
            </Reveal>
            <Reveal as="figure" className="about__img">
              <Image src="/images/about.jpg" alt="Car driving along an open road at sunset" width={1200} height={800} sizes="(max-width: 860px) 100vw, 600px" />
              <Icon name="asterisk" className="spark spark--about" />
            </Reveal>
          </div>
        </section>

        <section className="how section" id="how">
          <div className="container">
            <h2 className="display h2 center">How it works</h2>
            <ol className="steps">
              {STEPS.map((s) => (
                <Reveal as="li" className="step" key={s.num}>
                  <span className="step__icon"><Icon name={s.icon} /></span>
                  <span className="step__num">{s.num}</span>
                  <h3>{s.title}</h3>
                  <p>{s.text}</p>
                </Reveal>
              ))}
            </ol>
          </div>
        </section>

        <section className="fleet section" id="fleet">
          <div className="container">
            <h2 className="display h2 center">Pick your car today</h2>
            <Fleet />
            <p className="fleet__note">Prices per day in Rwandan francs, insurance included. Driver available from 25,000 RWF/day. Weekly and monthly rates on request.</p>
          </div>
        </section>

        <section className="perks" aria-label="Why SCARS">
          <div className="container perks__grid">
            {PERKS.map((p) => (
              <div className="perk" key={p.title}>
                <Icon name={p.icon} />
                <div><strong>{p.title}</strong><span>{p.text}</span></div>
              </div>
            ))}
          </div>
        </section>

        <section className="cta section" id="locations">
          <div className="container">
            <div className="cta__card">
              <Icon name="asterisk" className="spark spark--cta" />
              <div className="cta__text">
                <h2 className="display h2">Ready when<br />you land</h2>
                <p>Tell us when you need it. We&apos;ll have your car waiting.</p>
                <ul className="places">
                  {PLACES.map((p) => <li key={p}><Icon name="pin" />{p}</li>)}
                </ul>
                <BookButton className="btn btn--dark btn--lg">Book your car</BookButton>
              </div>
              <div className="chat" aria-hidden="true">
                <div className="chat__top"><span className="chat__avatar">S</span><div><strong>SCARS Kigali</strong><small>online</small></div></div>
                <p className="bubble bubble--me">Hi! I&apos;d like the RAV4 from Friday to Monday.</p>
                <p className="bubble">Muraho! The RAV4 is available: 3 days × 85,000 RWF. Where should we bring it?</p>
                <p className="bubble bubble--me">Perfect, book it.</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="container">
          <div className="footer__top">
            <h2 className="display footer__title">Questions? We reply<br />in minutes.</h2>
            <div className="footer__contact">
              <ChatLink><Icon name="whatsapp" />{PHONE_DISPLAY}</ChatLink>
              <a href={`tel:+${WHATSAPP_NUMBER}`}><Icon name="phone" />Call us</a>
              <a href={`mailto:${EMAIL}`}><Icon name="mail" />{EMAIL}</a>
            </div>
          </div>
          <div className="footer__cols">
            <div>
              <a href="#top" className="logo logo--light">SCARS<span className="logo__dot" aria-hidden="true" /></a>
              <p className="footer__blurb">Car rental in Kigali, Rwanda. Self-drive, with driver, airport delivery.</p>
            </div>
            <nav aria-label="Rent">
              <h3>Rent</h3>
              <a href="#fleet">Our fleet</a><a href="#how">How it works</a><a href="#locations">Locations</a>
            </nav>
            <nav aria-label="Company">
              <h3>Company</h3>
              <a href="#about">About us</a><ChatLink message="Hello SCARS! I'd like to ask about business hire.">Business hire</ChatLink>
            </nav>
            <div>
              <h3>Follow us</h3>
              <div className="social">
                <a href="#" aria-label="SCARS on Instagram"><Icon name="instagram" /></a>
                <a href="#" aria-label="SCARS on Facebook"><Icon name="facebook" /></a>
                <ChatLink aria-label="SCARS on WhatsApp"><Icon name="whatsapp" /></ChatLink>
              </div>
            </div>
          </div>
          <div className="footer__bottom">
            <span>© {new Date().getFullYear()} SCARS Ltd. Kigali, Rwanda.</span>
            <span>Privacy · Rental terms · <Link href="/admin">Admin</Link></span>
          </div>
        </div>
      </footer>
    </>
  );
}
