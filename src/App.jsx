import { useEffect } from "react";
import { Mail } from "lucide-react";
import RayBurst from "./components/RayBurst.jsx";
import GroupCard from "./components/GroupCard.jsx";
import { groups, page } from "./data/groups.js";
import logo from "./assets/ymr-logo.png";
import "./App.css";

export default function App() {
  useEffect(() => {
    document.title = `${page.title} — Join a Group`;
  }, []);

  return (
    <div className="page">
      <RayBurst />

      <header className="hero">
        <img src={logo} alt="YMR Global" className="hero__logo" />
        <p className="hero__kicker">{page.kicker}</p>
        <h1 className="hero__title">{page.title}</h1>
        <p className="hero__subtitle">{page.subtitle}</p>
      </header>

      <main className="groups">
        {groups.map((group, i) => (
          <GroupCard key={group.name} group={group} index={i} />
        ))}
      </main>

      <footer className="footer">
        <div className="footer__rule" />
        <p className="footer__note">{page.footerNote}</p>
        <a href={`mailto:${page.footerContact}`} className="footer__contact">
          <Mail size={13} /> {page.footerContact}
        </a>
      </footer>
    </div>
  );
}
