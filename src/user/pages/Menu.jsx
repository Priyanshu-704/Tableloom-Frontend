import { logger } from "../../common/utils/logger.js";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Filter, Loader2, Search, SlidersHorizontal } from "lucide-react";
import { useTranslation } from "../hooks/useTranslation";
import menuService from "../../common/services/menuService";
import { MenuItem } from "../components/menu/MenuItem";
import { MenuFilterSidebar } from "../components/menu/MenuFilterSidebar";
const DEFAULT_FILTERS = {
  searchTerm: "",
  category: "all",
  sizeIds: [],
  minPrice: "",
  maxPrice: "",
  tags: [],
  dietary: [],
  spiceLevels: [],
  sortBy: ""
};
const PAGE_SIZE = 20;
const getDiscountedPrice = (price, discount) => {
  const basePrice = Number(price || 0);
  if (!discount?.isActive || !Number(discount?.value || 0)) {
    return basePrice;
  }
  const nextDiscount = discount.type === "fixed" ? Number(discount.value || 0) : basePrice * Number(discount.value || 0) / 100;
  return Math.max(basePrice - nextDiscount, 0);
};
const transformMenuItem = item => {
  const discount = item.activeDiscount || item.discount;
  const sizes = item.prices?.map(priceEntry => {
    const size = priceEntry?.size || priceEntry?.sizeId || null;
    const originalPrice = Number(priceEntry?.price || 0);
    return {
      id: size?._id || size?.id || size || null,
      name: size?.name || "",
      code: size?.code || "",
      price: getDiscountedPrice(originalPrice, discount),
      originalPrice
    };
  }).filter(size => size.id && size.price > 0) || [];
  return {
  id: item._id,
  name: item.name,
  description: item.description,
  image: item.image,
  category: item.category?.name || "Uncategorized",
  categoryId: item.category?._id || null,
  price: sizes[0]?.price || getDiscountedPrice(item.prices?.[0]?.price || 0, discount),
  prices: item.prices || [],
  sizes,
  activeDiscount: discount || null,
  isAvailable: item.isAvailable,
  isActive: item.isActive,
  isVegetarian: item.isVegetarian,
  isVegan: item.isVegan,
  isNonVegetarian: item.isNonVegetarian,
  isGlutenFree: item.isGlutenFree,
  spiceLevel: item.spiceLevel || 0,
  orderCount: item.orderCount || 0,
  preparationTime: item.preparationTime,
  tags: item.tags || []
  };
};
export function Menu() {
  const {
    t
  } = useTranslation();
  const categoryRefs = useRef({});
  const loadMoreRef = useRef(null);
  const requestIdRef = useRef(0);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [categories, setCategories] = useState([]);
  const [filterOptions, setFilterOptions] = useState({
    sizes: [],
    popularTags: [],
    priceRange: {
      min: 0,
      max: 0
    },
    spiceLevels: [],
    dietary: {}
  });
  const [menuItems, setMenuItems] = useState([]);
  const [activeCategoryKey, setActiveCategoryKey] = useState("all");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [loadingFilters, setLoadingFilters] = useState(true);
  const [loadingMenuItems, setLoadingMenuItems] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(null);
  useEffect(() => {
    const loadFilterData = async () => {
      try {
        setLoadingFilters(true);
        setError(null);
        const [categoriesResponse, filterResponse] = await Promise.all([menuService.getCategories(true, undefined, {
          view: "customer"
        }), menuService.getMenuFilterOptions()]);
        const categoryArray = Array.isArray(categoriesResponse?.data) ? categoriesResponse.data : categoriesResponse?.data?.data || [];
        setCategories(categoryArray.filter(category => category.isActive).sort((a, b) => a.displayOrder - b.displayOrder));
        setFilterOptions(filterResponse?.data || {});
      } catch (err) {
        logger.error("Failed to load menu filters:", err);
        setError(err.message || "Failed to load menu filters");
      } finally {
        setLoadingFilters(false);
      }
    };
    loadFilterData();
  }, []);
  useEffect(() => {
    setMenuItems([]);
    setPage(1);
    setHasMore(true);
    setActiveCategoryKey(filters.category === "all" ? "all" : filters.category);
  }, [filters]);
  useEffect(() => {
    const loadMenuItems = async () => {
      const currentRequestId = ++requestIdRef.current;
      try {
        if (page === 1) {
          setLoadingMenuItems(true);
        } else {
          setLoadingMore(true);
        }
        const response = await menuService.getMenuItems({
          query: filters.searchTerm.trim() || undefined,
          category: filters.category !== "all" ? filters.category : undefined,
          sizeIds: filters.sizeIds,
          minPrice: filters.minPrice || undefined,
          maxPrice: filters.maxPrice || undefined,
          tags: filters.tags,
          dietary: filters.dietary,
          spiceLevels: filters.spiceLevels,
          sortBy: filters.sortBy || undefined,
          isAvailable: true,
          activeOnly: true,
          availableOnly: true,
          page,
          limit: PAGE_SIZE,
          view: "customer"
        });
        if (currentRequestId !== requestIdRef.current) {
          return;
        }
        const itemsArray = Array.isArray(response?.data) ? response.data : response?.data?.data || [];
        const pagination = response?.data?.pagination || {};
        const transformedItems = itemsArray.filter(item => item.isAvailable === true).map(transformMenuItem);
        setMenuItems(current => page === 1 ? transformedItems : [...current, ...transformedItems]);
        setHasMore(pagination.page < pagination.pages);
        setError(null);
      } catch (err) {
        if (currentRequestId !== requestIdRef.current) {
          return;
        }
        logger.error("Failed to fetch menu items:", err);
        setError(err.message || "Failed to load menu items");
      } finally {
        if (currentRequestId === requestIdRef.current) {
          setLoadingMenuItems(false);
          setLoadingMore(false);
        }
      }
    };
    loadMenuItems();
  }, [filters, page]);
  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target || loadingMenuItems || loadingMore || !hasMore) {
      return undefined;
    }
    const observer = new IntersectionObserver(entries => {
      const [entry] = entries;
      if (entry?.isIntersecting) {
        setPage(current => current + 1);
      }
    }, {
      rootMargin: "400px 0px"
    });
    observer.observe(target);
    return () => observer.disconnect();
  }, [hasMore, loadingMenuItems, loadingMore]);
  const itemsByCategory = useMemo(() => {
    const grouped = {};
    menuItems.forEach(item => {
      if (!grouped[item.category]) {
        grouped[item.category] = [];
      }
      grouped[item.category].push(item);
    });
    return grouped;
  }, [menuItems]);
  const visibleCategories = useMemo(() => {
    const derivedCategories = new Map();
    menuItems.forEach(item => {
      if (!item.category || item.category === "Uncategorized") {
        return;
      }
      const derivedKey = item.categoryId || item.category;
      if (!derivedCategories.has(derivedKey)) {
        derivedCategories.set(derivedKey, {
          _id: item.categoryId || item.category,
          name: item.category,
          displayOrder: Number.MAX_SAFE_INTEGER,
          isActive: true
        });
      }
    });

    const knownCategories = Array.isArray(categories) ? categories.filter(category => {
      if (!category?.isActive) {
        return false;
      }
      return derivedCategories.has(category._id) || derivedCategories.has(category.name);
    }) : [];

    if (!knownCategories.length) {
      return Array.from(derivedCategories.values()).sort((a, b) => a.name.localeCompare(b.name));
    }

    derivedCategories.forEach((value, key) => {
      const exists = knownCategories.some(category => category._id === key || category.name === value.name);
      if (!exists) {
        knownCategories.push(value);
      }
    });

    return knownCategories.sort((a, b) => {
      const orderA = Number.isFinite(a.displayOrder) ? a.displayOrder : Number.MAX_SAFE_INTEGER;
      const orderB = Number.isFinite(b.displayOrder) ? b.displayOrder : Number.MAX_SAFE_INTEGER;
      return orderA === orderB ? a.name.localeCompare(b.name) : orderA - orderB;
    });
  }, [categories, menuItems]);
  const categoryMeta = useMemo(() => {
    const map = new Map();
    visibleCategories.forEach(category => {
      map.set(category.name, category);
    });
    return map;
  }, [visibleCategories]);
  const sortedCategoryKeys = useMemo(() => {
    return Object.keys(itemsByCategory).sort((a, b) => {
      const categoryA = categoryMeta.get(a);
      const categoryB = categoryMeta.get(b);
      if (!categoryA && !categoryB) {
        return a.localeCompare(b);
      }
      if (!categoryA) {
        return 1;
      }
      if (!categoryB) {
        return -1;
      }
      return categoryA.displayOrder - categoryB.displayOrder;
    });
  }, [categoryMeta, itemsByCategory]);
  useEffect(() => {
    if (!sortedCategoryKeys.length) {
      return undefined;
    }
    const sections = sortedCategoryKeys.map(key => categoryRefs.current[key]).filter(Boolean);
    if (!sections.length) {
      return undefined;
    }
    const observer = new IntersectionObserver(entries => {
      const visibleEntries = entries.filter(entry => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio);
      if (!visibleEntries.length) {
        return;
      }
      const categoryName = visibleEntries[0].target.getAttribute("data-category");
      const matchedCategory = visibleCategories.find(category => category.name === categoryName);
      if (filters.category === "all") {
        setActiveCategoryKey(matchedCategory?._id || "all");
      }
    }, {
      rootMargin: "-180px 0px -55% 0px",
      threshold: [0.1, 0.25, 0.5]
    });
    sections.forEach(section => observer.observe(section));
    return () => observer.disconnect();
  }, [visibleCategories, filters.category, sortedCategoryKeys]);
  const isLoading = loadingFilters || loadingMenuItems;
  const activeFilterCount = filters.sizeIds.length + filters.tags.length + filters.dietary.length + filters.spiceLevels.length + (filters.category !== "all" ? 1 : 0) + (filters.minPrice ? 1 : 0) + (filters.maxPrice ? 1 : 0) + (filters.sortBy ? 1 : 0);
  const updateFilters = partial => setFilters(current => ({
    ...current,
    ...partial
  }));
  const clearFilters = () => setFilters(DEFAULT_FILTERS);
  const handleCategoryClick = categoryId => {
    setActiveCategoryKey(categoryId);
    if (categoryId === "all") {
      updateFilters({
        category: "all"
      });
      window.scrollTo({
        top: 0,
        behavior: "smooth"
      });
      return;
    }
    if (filters.category !== "all") {
      updateFilters({
        category: categoryId
      });
      return;
    }
    const targetCategory = categoryId === "all" ? sortedCategoryKeys[0] : visibleCategories.find(category => category._id === categoryId)?.name;
    if (targetCategory && categoryRefs.current[targetCategory]) {
      categoryRefs.current[targetCategory].scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }
  };
  return <div className="mx-auto max-w-7xl px-4 pb-24 pt-3 lg:px-6">
      <div className="grid gap-6 lg:grid-cols-[20rem_minmax(0,1fr)]">
        <MenuFilterSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} filterOptions={filterOptions} filters={filters} onFiltersChange={updateFilters} onClearFilters={clearFilters} />

        <div className="min-w-0">
          <div className="sticky top-[4.5rem] z-30 -mx-4 space-y-3 border-b border-slate-200 bg-gray-50/95 px-4 pb-3 pt-2 backdrop-blur lg:top-0 lg:mx-0 lg:px-0">
            <div className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input type="text" placeholder={t("searchMenuItems")} value={filters.searchTerm} onChange={event => updateFilters({
                searchTerm: event.target.value
              })} className="w-full rounded-xl border border-gray-300 py-3 pl-10 pr-4 focus:border-transparent focus:ring-2 focus:ring-primary-500" disabled={isLoading} />
              </div>

              <button type="button" onClick={() => setIsSidebarOpen(true)} className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700 sm:w-auto lg:hidden">
                <SlidersHorizontal className="h-4 w-4" />
                Filters {activeFilterCount > 0 ? `(${activeFilterCount})` : ""}
              </button>
            </div>

            <div className="overflow-x-auto">
              <div className="flex min-w-max items-center gap-2 pb-1">
                <button type="button" onClick={() => handleCategoryClick("all")} className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${filters.category === "all" && activeCategoryKey === "all" || !sortedCategoryKeys.length && filters.category === "all" ? "bg-primary-600 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"}`}>
                  All
                </button>

                {visibleCategories.map(category => <button key={category._id} type="button" onClick={() => filters.category === "all" ? handleCategoryClick(category._id) : updateFilters({
                category: category._id
              })} className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${filters.category === "all" && activeCategoryKey === category._id || filters.category === category._id ? "bg-primary-600 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"}`}>
                    {category.name}
                  </button>)}
              </div>
            </div>
          </div>

          {activeFilterCount > 0 ? <div className="mb-4 mt-4 flex flex-wrap gap-2">
              <span className="rounded-full bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-600">
                {activeFilterCount} active filters
              </span>
            </div> : null}

          {isLoading ? <div className="py-12 text-center">
              <Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin text-primary-500" />
              <p className="text-gray-600">Loading menu...</p>
            </div> : error ? <div className="py-12 text-center">
              <Filter className="mx-auto mb-4 h-12 w-12 text-gray-300" />
              <p className="text-lg text-gray-500">Failed to load menu</p>
              <p className="text-gray-400">{error}</p>
              <button type="button" onClick={() => window.location.reload()} className="mt-4 rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-700">
                Retry
              </button>
            </div> : menuItems.length === 0 ? <div className="py-12 text-center">
              <Filter className="mx-auto mb-4 h-12 w-12 text-gray-300" />
              <p className="text-lg text-gray-500">No items found</p>
              <p className="text-gray-400">Try adjusting your search or filter</p>
            </div> : <>
              <div className="space-y-8 pt-4">
                {sortedCategoryKeys.map(category => <section key={category} ref={element => {
              categoryRefs.current[category] = element;
            }} data-category={category}>
                    <h2 className="sticky top-[10.6rem] z-20 mb-4 border-b border-slate-200 bg-gray-50/95 py-3 text-xl font-bold text-gray-900 backdrop-blur sm:text-2xl lg:top-[5.35rem]">
                      {category}
                    </h2>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      {itemsByCategory[category].map(item => <MenuItem key={item.id} item={item} />)}
                    </div>
                  </section>)}
              </div>

              <div ref={loadMoreRef} className="py-8 text-center">
                {loadingMore ? <div className="inline-flex items-center gap-2 text-sm text-slate-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading more items...
                  </div> : hasMore ? <span className="text-sm text-slate-400">
                    Scroll to load more menu items
                  </span> : <span className="text-sm text-slate-400">
                    You&apos;ve reached the end of the menu
                  </span>}
              </div>
            </>}
        </div>
      </div>
    </div>;
}
