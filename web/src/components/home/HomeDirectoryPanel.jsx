"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import AppIcon from "@/components/shared/AppIcon";
import DirectoryCategoryHeader from "@/features/directory/components/DirectoryCategoryHeader";
import NonprofitCard from "@/features/nonprofits/components/NonprofitCard";
import { mapNonprofitCardRow } from "@/features/nonprofits/mappers/nonprofitCardMapper";
import { STATES, SERVICE_OPTIONS } from "@/lib/constants";
import { normalizeEinDigits } from "@/features/nonprofits/lib/einUtils";
import HomeDirectoryCategoryFocus from "@/components/home/HomeDirectoryCategoryFocus";

export default function HomeDirectoryPanel({
  filters,
  setFilters,
  results,
  status,
  meta,
  page,
  canGoNext,
  runSearch,
  clearSearch,
  isAuthenticated,
  favoriteEinSet,
  onToggleFavorite,
  onRequestSignIn,
}) {
  const [searchOpen, setSearchOpen] = useState(true);

  function applyFilters(next) {
    setFilters(next);
    if (next.state) {
      void runSearch(1, next);
    }
  }

  function onQuickCategory({ letter, audience }) {
    const next = {
      ...filters,
      service: letter || "",
      audience: audience || filters.audience || "all",
    };
    applyFilters(next);
    setSearchOpen(true);
    requestAnimationFrame(() => {
      document.getElementById("home-directory-search")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }

  return (
    <div className="homeDirectoryPanel card" id="home-directory">
      <div className="homeDirectoryPanel__head">
        <h3 className="homeDirectoryPanel__title">
          <Search className="homeDirectoryPanel__titleIcon" aria-hidden="true" />
          Nonprofit Directory
        </h3>
      </div>

      <HomeDirectoryCategoryFocus
        activeLetter={filters.service}
        activeAudience={filters.audience}
        onSelect={onQuickCategory}
      />

      <button
        type="button"
        className="homeDirectoryPanel__searchToggle"
        aria-expanded={searchOpen}
        onClick={() => setSearchOpen((o) => !o)}
      >
        {searchOpen ? "Hide search filters" : "Search directory"}
      </button>

      <div
        id="home-directory-search"
        className={`homeDirectoryPanel__search${searchOpen ? " isOpen" : ""}`}
        hidden={!searchOpen}
      >
        {filters.service ? <DirectoryCategoryHeader letter={filters.service} variant="compact" /> : null}
        <div className="form">
          <select
            value={filters.state}
            onChange={(e) => applyFilters({ ...filters, state: e.target.value })}
          >
            {STATES.map(([v, label]) => (
              <option key={v} value={v}>
                {label}
              </option>
            ))}
          </select>
          <input
            placeholder="City or Organization"
            value={filters.q}
            onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
          />
          <select
            value={filters.service}
            onChange={(e) => applyFilters({ ...filters, service: e.target.value })}
            aria-label="Service category letter"
          >
            {SERVICE_OPTIONS.map(([v, label]) => (
              <option key={v || "all"} value={v}>
                {label}
              </option>
            ))}
          </select>
          <select
            value={filters.audience}
            onChange={(e) => applyFilters({ ...filters, audience: e.target.value })}
          >
            <option value="all">All</option>
            <option value="veteran">Veterans</option>
            <option value="first_responder">First Responders</option>
          </select>
        </div>
        <div className="row">
          <button className="btnPrimary" onClick={() => runSearch(1)} type="button">
            Search
          </button>
          <button className="btnSoft" onClick={clearSearch} type="button">
            Clear
          </button>
        </div>
      </div>

      {status ? <p className="homeDirectoryPanel__meta">{status}</p> : null}
      {meta ? <p className="homeDirectoryPanel__meta">{meta}</p> : null}

      <div className="results">
        {!results.length && !status && (
          <div className="emptyState">
            <AppIcon name="search" />
            <div>
              <strong>{filters.state ? "Run search to browse organizations" : "Select a state to get started"}</strong>
              <p>Service category and audience filters are optional.</p>
            </div>
          </div>
        )}
        {results.map((r) => {
          const card = mapNonprofitCardRow(r, "directory");
          const einKey = normalizeEinDigits(card.ein);
          return (
            <NonprofitCard
              key={`${card.ein}-${card.name}`}
              card={card}
              actionMode="directory"
              favoritesEnabled={isAuthenticated}
              isFavorite={einKey.length === 9 && favoriteEinSet.has(einKey)}
              onToggleFavorite={onToggleFavorite}
              onRequestSignIn={onRequestSignIn}
            />
          );
        })}
      </div>

      <div className="row space directoryPager" role="navigation" aria-label="Directory pagination">
        <button className="btnSoft" disabled={page <= 1} onClick={() => runSearch(page - 1)} type="button">
          Prev
        </button>
        <span className="directoryPagerLabel">Page {page}</span>
        <button className="btnSoft" disabled={!canGoNext} onClick={() => runSearch(page + 1)} type="button">
          Next
        </button>
      </div>
    </div>
  );
}
