import { useEffect, useState } from "react";
import { MessageCircle, Users, ArrowUpRight, Copy, Check, LockKeyhole } from "lucide-react";

export default function GroupCard({ group, index }) {
  const [copied, setCopied] = useState(false);
  const [groupImage, setGroupImage] = useState("");
  const inviteUrl = group.destination || group.link;

  useEffect(() => {
    let active = true;
    setGroupImage("");
    if (!inviteUrl?.startsWith("https://chat.whatsapp.com/")) return () => { active = false; };
    fetch(`/api/whatsapp-group-preview?url=${encodeURIComponent(inviteUrl)}`)
      .then((response) => response.ok ? response.json() : null)
      .then((preview) => { if (active && preview?.imageUrl) setGroupImage(preview.imageUrl); })
      .catch(() => {});
    return () => { active = false; };
  }, [inviteUrl]);

  const copyLink = (e) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard?.writeText(group.link).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const isOpen = group.isOpen !== false;
  const Card = isOpen ? "a" : "div";
  return (
    <Card
      {...(isOpen ? { href: group.link, target: "_blank", rel: "noopener noreferrer" } : { "aria-disabled": "true" })}
      className={`group-card${isOpen ? "" : " group-card--closed"}`}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="group-card__icon">
        {groupImage
          ? <img className="group-card__photo" src={groupImage} alt="" onError={() => setGroupImage("")} />
          : <MessageCircle size={22} color="#fff" strokeWidth={2.2} />}
      </div>

      <div className="group-card__body">
        <div className="group-card__heading">
          <span className="group-card__name">{group.name}</span>
          {group.tag && <span className="group-card__tag">{group.tag}</span>}
        </div>
        <p className="group-card__desc">{group.desc}</p>
        <div className={`group-card__members${isOpen ? "" : " group-card__members--closed"}`}>
          {isOpen ? <Users size={11} /> : <LockKeyhole size={11} />}
          <span>{isOpen ? "Open to all" : "Closed Group"}</span>
        </div>
      </div>

      {isOpen && <button
        type="button"
        onClick={copyLink}
        title="Copy invite link"
        aria-label="Copy invite link"
        className={`group-card__copy${copied ? " group-card__copy--copied" : ""}`}
      >
        {copied ? <Check size={16} /> : <Copy size={15} />}
      </button>}

      {isOpen ? <ArrowUpRight size={18} className="group-card__arrow" /> : <LockKeyhole size={16} className="group-card__arrow group-card__lock" />}
    </Card>
  );
}
