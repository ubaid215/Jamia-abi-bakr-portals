import React from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

const Pagination = ({
  currentPage,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  itemsPerPageOptions = [6, 12, 24, 48],
  showItemsPerPage = true,
  itemLabel = "items",
}) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  const getPageNumbers = () => {
    const delta = 2;
    const pages = [];
    const rangeStart = Math.max(2, currentPage - delta);
    const rangeEnd = Math.min(totalPages - 1, currentPage + delta);

    pages.push(1);
    if (rangeStart > 2) pages.push("...");
    for (let i = rangeStart; i <= rangeEnd; i++) pages.push(i);
    if (rangeEnd < totalPages - 1) pages.push("...");
    if (totalPages > 1) pages.push(totalPages);

    return pages;
  };

  const pageNumbers = getPageNumbers();

  if (totalItems === 0) return null;

  const navBtnBase =
    "flex items-center justify-center w-9 h-9 rounded-lg border text-sm transition-all duration-200 select-none";
  const navBtnActive =
    "border-gray-300 text-gray-600 hover:border-[#F59E0B] hover:text-[#D97706] hover:bg-[#FFFBEB] cursor-pointer";
  const navBtnDisabled =
    "border-gray-100 text-gray-300 cursor-not-allowed bg-gray-50";

  return (
    <div className="bg-white rounded-2xl px-4 sm:px-6 py-4 shadow-lg border border-gray-100">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">

        {/* Left: summary + per-page */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-gray-600 justify-center sm:justify-start">
          {/* Progress bar mini */}
          <div className="hidden sm:flex items-center gap-2">
            <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#F59E0B] to-[#D97706] rounded-full transition-all duration-300"
                style={{ width: `${(endItem / totalItems) * 100}%` }}
              />
            </div>
          </div>

          <span>
            Showing{" "}
            <span className="font-semibold text-gray-900">{startItem}</span>
            {" – "}
            <span className="font-semibold text-gray-900">{endItem}</span>
            {" of "}
            <span className="font-semibold text-gray-900">{totalItems}</span>{" "}
            {itemLabel}
          </span>

          {showItemsPerPage && onItemsPerPageChange && (
            <div className="flex items-center gap-2">
              <span className="text-gray-300 hidden sm:inline select-none">|</span>
              <label className="text-gray-400 text-xs font-medium uppercase tracking-wide">Per page</label>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  onItemsPerPageChange(Number(e.target.value));
                  onPageChange(1);
                }}
                className="border border-gray-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent shadow-sm bg-white cursor-pointer hover:border-[#F59E0B] transition-colors"
              >
                {itemsPerPageOptions.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Right: navigation */}
        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange(1)}
              disabled={currentPage === 1}
              className={`${navBtnBase} ${currentPage === 1 ? navBtnDisabled : navBtnActive}`}
              title="First page"
            >
              <ChevronsLeft className="h-4 w-4" />
            </button>

            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className={`${navBtnBase} ${currentPage === 1 ? navBtnDisabled : navBtnActive}`}
              title="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-1 mx-1">
              {pageNumbers.map((page, idx) =>
                page === "..." ? (
                  <span
                    key={`ellipsis-${idx}`}
                    className="w-9 h-9 flex items-center justify-center text-gray-400 text-sm select-none"
                  >
                    …
                  </span>
                ) : (
                  <button
                    key={page}
                    onClick={() => onPageChange(page)}
                    className={`w-9 h-9 rounded-lg border text-sm font-medium transition-all duration-200 ${
                      page === currentPage
                        ? "bg-gradient-to-br from-[#F59E0B] to-[#D97706] text-white border-[#F59E0B] shadow-md shadow-amber-200 scale-105"
                        : "border-gray-200 text-gray-700 hover:border-[#F59E0B] hover:text-[#D97706] hover:bg-[#FFFBEB]"
                    }`}
                  >
                    {page}
                  </button>
                )
              )}
            </div>

            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className={`${navBtnBase} ${currentPage === totalPages ? navBtnDisabled : navBtnActive}`}
              title="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </button>

            <button
              onClick={() => onPageChange(totalPages)}
              disabled={currentPage === totalPages}
              className={`${navBtnBase} ${currentPage === totalPages ? navBtnDisabled : navBtnActive}`}
              title="Last page"
            >
              <ChevronsRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Page indicator for single-page or mobile clarity */}
      {totalPages > 1 && (
        <div className="mt-3 pt-3 border-t border-gray-50 flex justify-center">
          <span className="text-xs text-gray-400">
            Page <span className="font-semibold text-gray-600">{currentPage}</span> of{" "}
            <span className="font-semibold text-gray-600">{totalPages}</span>
          </span>
        </div>
      )}
    </div>
  );
};

export default Pagination;