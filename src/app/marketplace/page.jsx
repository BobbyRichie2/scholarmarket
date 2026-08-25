// Marketplace page: discovery filters are reflected in the URL for shareable searches.
// PERF-AUDIT: See docs/tasks/marketplace-performance-audit.md for full findings.
// Slow components: force-dynamic SSR bypass, eager RecentlyViewedMaterials load,
// per-mount /api/subjects fetch, framer-motion on every card, no Suspense boundaries.

"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FaExchangeAlt,
  FaFilePdf,
  FaFilePowerpoint,
  FaFileWord,
  FaFilter,
  FaHeart,
  FaRegClock,
  FaSearch,
  FaShoppingCart,
  FaStar,
} from "react-icons/fa";
import { motion } from "framer-motion";

import Navbar from "@/components/Navbar";
import ScrollToTop from "@/components/ScrollToTop";
import Pagination from "@/components/ui/Pagination";
import PrimaryButton from "@/components/ui/PrimaryButton";
import SaveMaterialButton from "@/components/materials/SaveMaterialButton";
import RecentlyViewedMaterials from "@/components/materials/RecentlyViewedMaterials";
import ResourceStatusBadge from "@/components/materials/ResourceStatusBadge";
import { useMarketplaceMaterials } from "@/hooks/api/useMaterials";
import { useCart } from "@/hooks/useCart";
import { useComparison } from "@/hooks/useComparison";

export const dynamic = "force-dynamic";

const ALL_SUBJECT = { id: "all", label: "All" };

const DEFAULT_SUBJECTS = [
  ALL_SUBJECT,
  { id: "mathematics", label: "Math" },
  { id: "science", label: "Science" },
  { id: "law", label: "Law" },
  { id: "technology", label: "Technology" },
  { id: "business", label: "Business" },
  { id: "medicine", label: "Medicine" },
  { id: "arts", label: "Arts" },
];

const LEVEL_OPTIONS = [
  { id: "", label: "Any level" },
  { id: "beginner", label: "Beginner" },
  { id: "intermediate", label: "Intermediate" },
  { id: "advanced", label: "Advanced" },
  { id: "all-levels", label: "All Levels" },
];

const FALLBACK_IMAGE = "/images/image1.jpg";

function getPreviewImage(material) {
  return material.coverImageUrl || material.thumbnailUrl || material.image || FALLBACK_IMAGE;
}

function MaterialThumbnail({ material }) {
  const [src, setSrc] = useState(() => getPreviewImage(material));

  return (
    <Image
      src={src}
      alt={material.title}
      fill
      className="object-cover group-hover:scale-105 transition-transform duration-500"
      onError={() => setSrc(FALLBACK_IMAGE)}
      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
    />
  );
}

function normalizeSubjectOptions(subjects) {
  if (!Array.isArray(subjects) || subjects.length === 0) return DEFAULT_SUBJECTS;

  const seen = new Set(["all"]);
  const normalized = subjects
    .map((subject) => {
      if (typeof subject === "string") {
        return subject.toLowerCase() === "all" ? ALL_SUBJECT : { id: subject, label: subject };
      }

      return {
        id: subject?.id || subject?.label,
        label: subject?.label || subject?.id,
      };
    })
    .filter((subject) => subject.id && subject.label)
    .filter((subject) => {
      const key = subject.id.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  return [ALL_SUBJECT, ...normalized];
}

function getAverageScore(material) {
  const score = Number(material.averageScore ?? material.rating);
  return Number.isFinite(score) && score > 0 ? score.toFixed(1) : "New";
}

function getFeedbackCount(material) {
  return Number(material.feedbackCount ?? material.reviewsCount ?? 0) || 0;
}

export default function MarketPage() {
  const { addToCart, cartItems } = useCart();
  const { addToComparison, comparedItems } = useComparison();
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSubject, setActiveSubject] = useState("All");
  const [activeCategory, setActiveCategory] = useState("All");
  const [activeLevel, setActiveLevel] = useState("");
  const [formatFilter, setFormatFilter] = useState("");
  const [sortBy, setSortBy] = useState("Popular");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [creator, setCreator] = useState("");
  const [usageRights, setUsageRights] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [hydrated, setHydrated] = useState(false);
  const [subjects, setSubjects] = useState(["All"]);
  const [categories, setCategories] = useState([]);
  const [subjectsLoading, setSubjectsLoading] = useState(true);

  const itemsPerPage = 12;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    setSearchQuery(params.get("search") || "");
    setActiveSubject(params.get("subject") || "All");
    setActiveCategory(params.get("category") || "All");
    setActiveLevel(params.get("level") || "");
    setFormatFilter(params.get("format") || "");
    setSortBy(params.get("sortBy") || "Popular");
    setMinPrice(params.get("minPrice") || "");
    setMaxPrice(params.get("maxPrice") || "");
    setCreator(params.get("creator") || "");
    setUsageRights(params.get("usageRights") || "");
    setCurrentPage(Number(params.get("page") || 1));
    setHydrated(true);
  }, []);

  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return undefined;
    }

    const timeoutId = setTimeout(async () => {
      try {
        const response = await fetch(`/api/materials/search?q=${encodeURIComponent(trimmed)}&page=1&pageSize=5`);
        if (!response.ok) {
          setSuggestions([]);
          setShowSuggestions(false);
          return;
        }

        const data = await response.json();
        const titles = [...new Set((data.items || [])
          .map((material) => material.title)
          .filter(Boolean)
          .map((title) => String(title).trim()))]
          .slice(0, 6);

        setSuggestions(titles);
        setShowSuggestions(titles.length > 0);
      } catch {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 250);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  useEffect(() => {
    async function loadSubjects() {
      try {
        setSubjectsLoading(true);
        const response = await fetch("/api/subjects");

        if (response.ok) {
          const data = await response.json();
          const normalized = normalizeSubjectOptions(data.subjects || data);
          setSubjects(normalized.map((subject) => subject.label || subject.id || String(subject)));
          setCategories(data.categories || []);
        }
      } catch {
        // keep default subjects on error
      } finally {
        setSubjectsLoading(false);
      }
    }

    loadSubjects();
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    const params = new URLSearchParams();

    if (searchQuery) params.set("search", searchQuery);
    if (activeSubject && activeSubject !== "All") params.set("subject", activeSubject);
    if (activeCategory !== "All") params.set("category", activeCategory);
    if (activeLevel) params.set("level", activeLevel);
    if (formatFilter) params.set("format", formatFilter);
    if (sortBy && sortBy !== "Popular") params.set("sortBy", sortBy);
    if (minPrice) params.set("minPrice", minPrice);
    if (maxPrice) params.set("maxPrice", maxPrice);
    if (creator) params.set("creator", creator);
    if (usageRights) params.set("usageRights", usageRights);
    if (currentPage > 1) params.set("page", String(currentPage));

    router.replace(`/marketplace?${params.toString()}`);
  }, [hydrated, searchQuery, activeSubject, activeCategory, activeLevel, formatFilter, sortBy, minPrice, maxPrice, creator, usageRights, currentPage, router]);

  const { data, isLoading, isError, error } = useMarketplaceMaterials({
    search: searchQuery,
    subject: activeSubject !== "All" ? activeSubject : undefined,
    category: activeCategory !== "All" ? activeCategory : undefined,
    level: activeLevel || undefined,
    contentType: formatFilter || undefined,
    sortBy:
      sortBy === "Popular"
        ? "popular"
        : sortBy === "Price: Low to High"
          ? "price_asc"
          : sortBy === "Price: High to Low"
            ? "price_desc"
            : sortBy === "Newest"
              ? "newest"
              : sortBy === "Top Rated"
                ? "top_rated"
                : undefined,
    minPrice: minPrice || undefined,
    maxPrice: maxPrice || undefined,
    creator: creator || undefined,
    usageRights: usageRights || undefined,
    page: currentPage,
    pageSize: itemsPerPage,
  });

  const materials = data?.items || [];
  const totalPages = data?.totalPages || 1;

  const getFileIcon = (type) => {
    switch (type) {
      case "pdf":
        return <FaFilePdf className="text-red-500" />;
      case "doc":
        return <FaFileWord className="text-blue-500" />;
      case "ppt":
        return <FaFilePowerpoint className="text-orange-500" />;
      default:
        return <FaFilePdf className="text-gray-500" />;
    }
  };

  const resetFilters = () => {
    setSearchQuery("");
    setActiveSubject("All");
    setActiveCategory("All");
    setActiveLevel("");
    setFormatFilter("");
    setSortBy("Popular");
    setMinPrice("");
    setMaxPrice("");
    setCreator("");
    setUsageRights("");
    setCurrentPage(1);
  };

  return (
    <>
      <Navbar />

      <section className="flex flex-col lg:flex-row min-h-screen bg-[#fffaf6]">
        <div className="lg:hidden w-full bg-white border-b border-gray-200">
          <nav aria-label="Subject filters" className="overflow-x-auto px-4 py-3 hide-scrollbar flex gap-2">
            {subjectsLoading ? (
              <div className="px-4 py-1.5 text-sm text-gray-500">Loading subjects...</div>
            ) : (
              subjects.map((subject) => (
                <button
                  key={subject}
                  type="button"
                  onClick={() => {
                    setActiveSubject(subject);
                    setCurrentPage(1);
                  }}
                  role="tab"
                  aria-selected={activeSubject === subject}
                  className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm transition-all focus-visible:ring-2 focus-visible:ring-blue-500 ${
                    activeSubject === subject ? "bg-blue-600 text-white font-medium shadow-sm" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {subject}
                </button>
              ))
            )}
          </nav>

          {categories.length > 0 && (
            <nav aria-label="Category filters" className="overflow-x-auto px-4 pb-3 hide-scrollbar flex gap-2">
              {[{ id: "All", label: "All" }, ...categories].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setActiveCategory(cat.id);
                    setCurrentPage(1);
                  }}
                  role="tab"
                  aria-selected={activeCategory === cat.id}
                  className={`whitespace-nowrap px-3 py-1 rounded-full text-xs transition-all focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                    activeCategory === cat.id ? "bg-indigo-600 text-white font-medium shadow-sm" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </nav>
          )}
        </div>

        <aside className="hidden lg:block w-72 bg-white border-r border-gray-200 px-6 py-10 sticky top-0 h-screen overflow-y-auto">
          <nav aria-label="Subject filters">
            <h3 className="text-sm font-bold text-gray-900 mb-6 uppercase tracking-wider">Subjects</h3>
            <ul role="list" className="space-y-1">
              {subjectsLoading ? (
                <li role="listitem"><div className="px-3 py-2 text-sm text-gray-500">Loading subjects...</div></li>
              ) : (
                subjects.map((subject) => (
                  <li key={subject} role="listitem">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveSubject(subject);
                        setCurrentPage(1);
                      }}
                      role="tab"
                      aria-selected={activeSubject === subject}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all focus-visible:ring-2 focus-visible:ring-blue-500 ${
                        activeSubject === subject ? "bg-blue-50 text-blue-700 font-semibold" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                      }`}
                    >
                      {subject}
                    </button>
                  </li>
                ))
              )}
            </ul>
          </nav>

          {categories.length > 0 && (
            <nav aria-label="Category filters" className="mt-8">
              <h3 className="text-sm font-bold text-gray-900 mb-6 uppercase tracking-wider">Categories</h3>
              <ul role="list" className="space-y-1">
                {[{ id: "All", label: "All Categories" }, ...categories].map((cat) => (
                  <li key={cat.id} role="listitem">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveCategory(cat.id);
                        setCurrentPage(1);
                      }}
                      role="tab"
                      aria-selected={activeCategory === cat.id}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all focus-visible:ring-2 focus-visible:ring-blue-500 ${
                        activeCategory === cat.id ? "bg-indigo-50 text-indigo-700 font-semibold" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                      }`}
                    >
                      {cat.label}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
          )}
        </aside>

        <main className="flex-1 px-4 md:px-8 py-8 md:py-10 overflow-x-hidden">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="bg-linear-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-6 mb-8"
          >
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">Academic Marketplace</h1>
            <p className="text-gray-600 text-sm mb-4">Search by title, description, and author.</p>
            <button type="button" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-sm focus-visible:ring-2 focus-visible:ring-blue-500">
              Share Your Notes
            </button>
          </motion.div>

          <RecentlyViewedMaterials />

          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-8 flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:max-w-md">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search materials..."
                aria-label="Search materials"
                value={searchQuery}
                onChange={(event) => {
                  setSearchQuery(event.target.value);
                  setCurrentPage(1);
                }}
                onFocus={() => setShowSuggestions(Boolean(searchQuery.trim()))}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus-visible:ring-2 focus-visible:ring-blue-500"
              />

              {showSuggestions && suggestions.length > 0 && (
                <ul className="absolute z-20 mt-2 w-full rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
                  {suggestions.map((suggestion) => (
                    <li key={suggestion}>
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery(suggestion);
                          setShowSuggestions(false);
                          setCurrentPage(1);
                        }}
                        className="w-full rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                      >
                        {suggestion}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex items-center gap-3 overflow-x-auto">
              <div className="flex items-center bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                <FaFilter className="text-gray-400 mr-2 text-xs" />
                <select
                  value={activeSubject}
                  onChange={(event) => {
                    setActiveSubject(event.target.value);
                    setCurrentPage(1);
                  }}
                  aria-label="Filter by subject"
                  className="bg-transparent text-sm focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  <option value="All">All Subjects</option>
                  {subjects.slice(1).map((subject) => (
                    <option key={subject} value={subject}>{subject}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 hidden md:flex">
                <span className="text-gray-500 text-sm mr-2">Level:</span>
                <select
                  value={activeLevel}
                  onChange={(event) => {
                    setActiveLevel(event.target.value);
                    setCurrentPage(1);
                  }}
                  aria-label="Filter by level"
                  className="bg-transparent text-sm focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  {LEVEL_OPTIONS.map((option) => (
                    <option key={option.id} value={option.id}>{option.label}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 hidden md:flex">
                <span className="text-gray-500 text-sm mr-2">Format:</span>
                <select
                  value={formatFilter}
                  onChange={(event) => {
                    setFormatFilter(event.target.value);
                    setCurrentPage(1);
                  }}
                  aria-label="Filter by format"
                  className="bg-transparent text-sm focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  <option value="">Any format</option>
                  <option value="pdf">PDF</option>
                  <option value="word">Word</option>
                  <option value="presentation">Presentation</option>
                  <option value="text">Text</option>
                </select>
              </div>

              <div className="flex items-center bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                <span className="text-gray-500 text-sm mr-2">Sort:</span>
                <select
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value)}
                  aria-label="Sort materials"
                  className="bg-transparent text-sm focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  <option>Popular</option>
                  <option>Price: Low to High</option>
                  <option>Price: High to Low</option>
                  <option>Newest</option>
                  <option>Top Rated</option>
                </select>
              </div>
            </div>
          </div>

          <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-end">
              <div className="flex-1">
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Price</label>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="number"
                    value={minPrice}
                    onChange={(event) => {
                      setMinPrice(event.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="Min"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                  <input
                    type="number"
                    value={maxPrice}
                    onChange={(event) => {
                      setMaxPrice(event.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="Max"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <PrimaryButton type="button" variant="secondary" onClick={resetFilters}>Clear filters</PrimaryButton>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-600">Loading materials...</div>
          ) : isError ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center text-rose-700">
              {error?.message || "Unable to load materials right now."}
            </div>
          ) : materials.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center">
              <h3 className="text-lg font-semibold text-gray-900">No materials match your filters</h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                {searchQuery
                  ? `No results for "${searchQuery}". Try different keywords or browse by subject.`
                  : "Try adjusting your filters to find what you're looking for."}
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button type="button" onClick={resetFilters} className="inline-flex items-center justify-center px-5 py-2.5 bg-blue-600 text-white font-medium text-sm rounded-lg hover:bg-blue-700 transition">
                  Clear all filters
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setCurrentPage(1);
                  }}
                  className="inline-flex items-center justify-center px-5 py-2.5 border border-gray-200 text-gray-700 font-medium text-sm rounded-lg hover:bg-gray-50 transition"
                >
                  Browse all materials
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex justify-between items-end mb-4 px-1">
                <h2 className="text-lg font-bold text-gray-800">{activeSubject === "All" ? "All Materials" : `${activeSubject} Materials`}</h2>
                <span className="text-sm text-gray-500">{data?.total || 0} results</span>
              </div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4 }}
                role="list"
                aria-live="polite"
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
              >
                {materials.map((material) => {
                  const materialId = material._id || material.id;
                  const isAlreadyInCart = cartItems.some((item) => (item._id || item.id) === materialId);
                  const isAlreadyInComp = comparedItems.some((item) => (item._id || item.id) === materialId);
                  const creatorAddress = material.userAddress || material.ownerAddress || "default";

                  return (
                    <article
                      key={materialId}
                      role="listitem"
                      className="relative bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md hover:border-blue-300 transition-all duration-300 flex flex-col group"
                    >
                      <SaveMaterialButton material={material} />

                      <Link href={`/marketplace/${materialId}`} className="relative w-full h-36 bg-gray-100 overflow-hidden block">
                        <MaterialThumbnail material={material} />
                        {material.subject && (
                          <span className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm text-gray-700 font-semibold text-[10px] px-2 py-0.5 rounded-md border border-gray-200 shadow-sm">
                            {material.subject}
                          </span>
                        )}
                        {material.level && (
                          <span className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm text-blue-700 font-semibold text-[10px] px-2 py-0.5 rounded-md border border-blue-200 shadow-sm">
                            {LEVEL_OPTIONS.find((option) => option.id === material.level)?.label || material.level}
                          </span>
                        )}
                      </Link>

                      <div className="p-4 flex-1 flex flex-col gap-2">
                        <Link href={`/marketplace/${materialId}`}>
                          <h3 className="text-sm font-bold text-gray-900 line-clamp-2 leading-snug hover:text-blue-600 transition-colors">
                            {material.title}
                          </h3>
                        </Link>

                        <p className="text-xs text-gray-500">
                          by <Link href={`/creator/${creatorAddress}`} className="font-semibold text-blue-600 hover:underline">{material.author || "Anonymous"}</Link>
                        </p>

                        <ResourceStatusBadge material={material} max={3} />

                        <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">
                          {material.shortSummary || material.description || "No description"}
                        </p>

                        <div className="mt-auto pt-3 border-t border-gray-100 space-y-3">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-1">
                              <FaStar className="text-yellow-400 w-3.5 h-3.5" />
                              <span className="text-xs font-semibold text-gray-700">{getAverageScore(material)}</span>
                              <span className="text-[11px] text-gray-400">({getFeedbackCount(material)})</span>
                            </div>

                            <div className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg text-sm font-bold border border-blue-100">
                              {material.price}
                              <span className="text-[10px] font-medium text-blue-500 ml-1">XLM</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-gray-400">
                            <div className="flex items-center gap-3">
                              <span className="flex items-center gap-1">
                                {getFileIcon(material.fileType)}
                                <span className="uppercase font-medium">{material.fileType || "pdf"}</span>
                              </span>
                              <span className="flex items-center gap-1">
                                <FaHeart className="w-3 h-3" />
                                {material.likes || 0}
                              </span>
                              {material.pages && (
                                <span className="flex items-center gap-1">
                                  <FaRegClock className="w-3 h-3" />
                                  {material.pages} pgs
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => addToComparison(material)}
                              className={`flex items-center justify-center gap-1 py-2 rounded-lg font-bold text-[11px] border transition-all focus-visible:ring-2 focus-visible:ring-blue-500 ${
                                isAlreadyInComp ? "bg-amber-500 border-amber-600 text-white" : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                              }`}
                            >
                              <FaExchangeAlt className="w-3 h-3" />
                              {isAlreadyInComp ? "Contrasted" : "Contrast"}
                            </button>

                            <button
                              type="button"
                              onClick={() => addToCart(material)}
                              className={`flex items-center justify-center gap-1 py-2 rounded-lg font-bold text-[11px] border transition-all focus-visible:ring-2 focus-visible:ring-blue-500 ${
                                isAlreadyInCart ? "bg-emerald-600 border-emerald-700 text-white" : "bg-blue-600 hover:bg-blue-700 border-blue-700 text-white"
                              }`}
                            >
                              <FaShoppingCart className="w-3 h-3" />
                              {isAlreadyInCart ? "In Cart" : "Add to Cart"}
                            </button>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </motion.div>

              {totalPages > 1 && (
                <Pagination page={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
              )}
            </>
          )}
        </main>
      </section>

      <ScrollToTop />
    </>
  );
}
