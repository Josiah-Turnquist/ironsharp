import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronDown, Search, X, Mail } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { HELP_SECTIONS, TOTAL_ARTICLES, type HelpSection } from "@/data/helpArticles";

const SUPPORT_EMAIL = "support@ironsharp.app";

const HelpCenter = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [openArticle, setOpenArticle] = useState<string | null>(null);

  const isSearching = query.trim().length > 0;

  const filteredSections = useMemo<HelpSection[]>(() => {
    const q = query.trim().toLowerCase();
    return HELP_SECTIONS
      .filter(s => isSearching || activeCategory === "all" || activeCategory === s.id)
      .map(s => ({
        ...s,
        articles: q
          ? s.articles.filter(
              a => a.q.toLowerCase().includes(q) || a.a.toLowerCase().includes(q),
            )
          : s.articles,
      }))
      .filter(s => s.articles.length > 0);
  }, [query, activeCategory, isSearching]);

  const toggleSection = (id: string) =>
    setCollapsed(prev => ({ ...prev, [id]: !prev[id] }));

  const toggleArticle = (key: string) =>
    setOpenArticle(prev => (prev === key ? null : key));

  return (
    <AppLayout>
      <div className="mx-auto max-w-2xl px-5 py-6 pb-24">
        <button
          onClick={() => navigate(-1)}
          className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" /> Back
        </button>

        {/* Header */}
        <div className="mb-6 text-center">
          <h1 className="font-serif text-3xl font-bold">Help Center</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {TOTAL_ARTICLES} articles to help you get the most out of IronSharp
          </p>
        </div>

        {/* Search */}
        <div className="relative mx-auto mb-5 max-w-[520px]">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search for answers..."
            className="h-12 w-full rounded-2xl border border-border bg-card pl-11 pr-11 font-serif text-sm text-foreground placeholder:text-muted-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Category pills */}
        {!isSearching && (
          <div className="mb-6 -mx-5 overflow-x-auto px-5">
            <div className="flex gap-2 whitespace-nowrap pb-1">
              <button
                onClick={() => setActiveCategory("all")}
                className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
                  activeCategory === "all"
                    ? "bg-primary text-primary-foreground"
                    : "bg-card text-muted-foreground hover:text-foreground"
                }`}
              >
                All topics
              </button>
              {HELP_SECTIONS.map(s => {
                const active = activeCategory === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => setActiveCategory(s.id)}
                    className="rounded-full px-4 py-1.5 text-xs font-medium transition-colors"
                    style={
                      active
                        ? { background: s.accent, color: "#fff" }
                        : undefined
                    }
                  >
                    <span
                      className={
                        active ? "" : "text-muted-foreground hover:text-foreground"
                      }
                    >
                      {s.icon} {s.title}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Sections */}
        {filteredSections.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <p className="font-serif text-base text-foreground">
              No results for "{query}"
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Try different words, or contact us at{" "}
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="text-primary hover:underline"
              >
                {SUPPORT_EMAIL}
              </a>
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredSections.map(section => {
              const isCollapsed = !isSearching && collapsed[section.id];
              return (
                <div
                  key={section.id}
                  className="overflow-hidden rounded-2xl border border-border bg-card"
                >
                  <button
                    onClick={() => toggleSection(section.id)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors"
                    style={{ background: section.accentPale }}
                  >
                    <span
                      className="flex h-10 w-10 items-center justify-center rounded-xl text-lg"
                      style={{ background: section.accent, color: "#fff" }}
                    >
                      {section.icon}
                    </span>
                    <div className="flex-1">
                      <div className="font-serif text-base font-semibold text-foreground">
                        {section.title}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {section.articles.length} article
                        {section.articles.length === 1 ? "" : "s"}
                      </div>
                    </div>
                    <ChevronDown
                      className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${
                        isCollapsed ? "" : "rotate-180"
                      }`}
                    />
                  </button>

                  {!isCollapsed && (
                    <div>
                      {section.articles.map((article, idx) => {
                        const key = `${section.id}-${idx}`;
                        const open = openArticle === key;
                        return (
                          <div
                            key={key}
                            className={
                              idx < section.articles.length - 1
                                ? "border-b border-border"
                                : ""
                            }
                          >
                            <button
                              onClick={() => toggleArticle(key)}
                              className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
                            >
                              <span
                                className={`font-serif text-[15px] leading-snug ${
                                  open ? "font-semibold" : "text-foreground"
                                }`}
                                style={open ? { color: section.accent } : undefined}
                              >
                                {article.q}
                              </span>
                              <ChevronDown
                                className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${
                                  open ? "rotate-180" : ""
                                }`}
                              />
                            </button>
                            {open && (
                              <div
                                className="ml-5 mr-5 mb-4 border-l-[3px] pl-4"
                                style={{ borderColor: section.accent }}
                              >
                                <p className="font-serif text-[14px] leading-[1.85] text-muted-foreground">
                                  {article.a}
                                </p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Contact footer */}
        <div className="mt-8 rounded-2xl border border-border bg-card p-6 text-center">
          <h3 className="font-serif text-lg font-bold text-foreground">
            Still need help?
          </h3>
          <p className="mt-1 text-sm italic text-muted-foreground">
            We're a small team and we read every message.
          </p>
          <Button asChild className="mt-4 h-11 rounded-xl">
            <a href={`mailto:${SUPPORT_EMAIL}`}>
              <Mail className="mr-2 h-4 w-4" /> Email {SUPPORT_EMAIL}
            </a>
          </Button>
        </div>
      </div>
    </AppLayout>
  );
};

export default HelpCenter;