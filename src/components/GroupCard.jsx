import { useState } from "react";
import { MessageCircle, Users, ArrowUpRight, Copy, Check } from "lucide-react";

export default function GroupCard({ group, index }) {
  const [copied, setCopied] = useState(false);

  const copyLink = (e) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard?.writeText(group.link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <a
      href={group.link}
      target="_blank"
      rel="noopener noreferrer"
      className="group-card"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="group-card__icon">
        <MessageCircle size={22} color="#fff" strokeWidth={2.2} />
      </div>

      <div className="group-card__body">
        <div className="group-card__heading">
          <span className="group-card__name">{group.name}</span>
          {group.tag && <span className="group-card__tag">{group.tag}</span>}
        </div>
        <p className="group-card__desc">{group.desc}</p>
        {group.members && (
          <div className="group-card__members">
            <Users size={11} />
            <span>{group.members} members</span>
          </div>
        )}
      </div>

      <button
        onClick={copyLink}
        title="Copy invite link"
        className={`group-card__copy${copied ? " group-card__copy--copied" : ""}`}
      >
        {copied ? <Check size={16} /> : <Copy size={15} />}
      </button>

      <ArrowUpRight size={18} className="group-card__arrow" />
    </a>
  );
}
