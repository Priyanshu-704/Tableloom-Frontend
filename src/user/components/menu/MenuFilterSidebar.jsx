import React, { useEffect } from "react";
import { SlidersHorizontal, X } from "lucide-react";
const DIETARY_OPTIONS = [{
  value: "vegetarian",
  label: "Vegetarian"
}, {
  value: "vegan",
  label: "Vegan"
}, {
  value: "nonVegetarian",
  label: "Non-Vegetarian"
}, {
  value: "glutenFree",
  label: "Gluten Free"
}];
const SORT_OPTIONS = [{
  value: "",
  label: "Featured"
}, {
  value: "popular",
  label: "Most Popular"
}, {
  value: "price_low",
  label: "Price: Low to High"
}, {
  value: "price_high",
  label: "Price: High to Low"
}];
const toggleValue = (values = [], value) => values.includes(value) ? values.filter(item => item !== value) : [...values, value];
function FilterChip({
  active,
  onClick,
  children
}) {
  return <button type="button" onClick={onClick} className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${active ? "border-primary-600 bg-primary-600 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}>
      {children}
    </button>;
}
export function MenuFilterSidebar({
  isOpen,
  onClose,
  filterOptions = {},
  filters,
  onFiltersChange,
  onClearFilters
}) {
  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);
  const sidebarContent = <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-5 w-5 text-slate-500" />
          <h2 className="text-base font-semibold text-slate-900">Filters</h2>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={onClearFilters} className="text-sm font-medium text-primary-600 hover:text-primary-700">
            Clear All
          </button>
          {onClose ? <button type="button" onClick={onClose} className="rounded-full p-1 text-slate-500 hover:bg-slate-100 lg:hidden">
              <X className="h-4 w-4" />
            </button> : null}
        </div>
      </div>

      <div className="space-y-6 overflow-y-auto px-5 py-5">
        <section className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
            Sort
          </h3>
          <select value={filters.sortBy} onChange={event => onFiltersChange({
          sortBy: event.target.value
        })} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm">
            {SORT_OPTIONS.map(option => <option key={option.value} value={option.value}>
                {option.label}
              </option>)}
          </select>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
            Size
          </h3>
          <div className="flex flex-wrap gap-2">
            {(filterOptions.sizes || []).map(size => <FilterChip key={size._id} active={filters.sizeIds.includes(size._id)} onClick={() => onFiltersChange({
            sizeIds: toggleValue(filters.sizeIds, size._id)
          })}>
                {size.name}
              </FilterChip>)}
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
            Price
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <input type="number" min="0" value={filters.minPrice} onChange={event => onFiltersChange({
            minPrice: event.target.value
          })} placeholder={`Min ${filterOptions.priceRange?.min ?? 0}`} className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
            <input type="number" min="0" value={filters.maxPrice} onChange={event => onFiltersChange({
            maxPrice: event.target.value
          })} placeholder={`Max ${filterOptions.priceRange?.max ?? 0}`} className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
            Popular Tags
          </h3>
          <div className="flex flex-wrap gap-2">
            {(filterOptions.popularTags || []).map(tag => <FilterChip key={tag.value} active={filters.tags.includes(tag.value)} onClick={() => onFiltersChange({
            tags: toggleValue(filters.tags, tag.value)
          })}>
                {tag.value} ({tag.count})
              </FilterChip>)}
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
            Dietary
          </h3>
          <div className="flex flex-wrap gap-2">
            {DIETARY_OPTIONS.map(option => <FilterChip key={option.value} active={filters.dietary.includes(option.value)} onClick={() => onFiltersChange({
            dietary: toggleValue(filters.dietary, option.value)
          })}>
                {option.label}
              </FilterChip>)}
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
            Spicy Level
          </h3>
          <div className="flex flex-wrap gap-2">
            {(filterOptions.spiceLevels || []).map(entry => <FilterChip key={entry.level} active={filters.spiceLevels.includes(String(entry.level))} onClick={() => onFiltersChange({
            spiceLevels: toggleValue(filters.spiceLevels, String(entry.level))
          })}>
                Level {entry.level} ({entry.count})
              </FilterChip>)}
          </div>
        </section>
      </div>
    </div>;
  return <>
      <aside className="hidden lg:block">
        <div className="sticky top-24 h-[calc(100vh-7rem)] w-80 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          {sidebarContent}
        </div>
      </aside>

      {isOpen ? <div className="fixed inset-0 z-50 bg-slate-900/30 lg:hidden" onClick={onClose}>
          <div className="absolute bottom-0 left-0 right-0 max-h-[88vh] w-full rounded-t-3xl bg-white shadow-xl" onClick={event => event.stopPropagation()}>
            {sidebarContent}
          </div>
        </div> : null}
    </>;
}
export default MenuFilterSidebar;
