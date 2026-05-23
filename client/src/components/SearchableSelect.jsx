import React, { useState, useRef, useEffect } from "react";
import { Search, ChevronDown } from "lucide-react";

export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Select an option...",
  className = "p-3 border border-[var(--border-color)] rounded-xl text-sm font-bold themed-input"
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const wrapperRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find((opt) => String(opt.value) === String(value));

  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <div
        className={`flex items-center justify-between w-full cursor-pointer outline-none transition ${className}`}
        onClick={() => {
          setIsOpen(!isOpen);
          setSearchTerm("");
        }}
      >
        <span className={`truncate ${selectedOption ? "" : "opacity-60"}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown size={16} className={`shrink-0 transition-transform ${isOpen ? "rotate-180" : "opacity-50"}`} />
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 themed-modal border border-[var(--border-color)] rounded-xl shadow-2xl max-h-60 flex flex-col overflow-hidden">
          <div className="p-2 border-b border-[var(--border-color)] flex items-center gap-2 bg-white/5 shrink-0">
            <Search size={14} className="text-muted shrink-0" />
            <input
              type="text"
              autoFocus
              placeholder="Search..."
              className="w-full bg-transparent text-sm font-medium outline-none text-themed"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="overflow-y-auto flex-1">
            {filteredOptions.length === 0 ? (
              <div className="p-3 text-center text-xs text-muted font-bold">No results found</div>
            ) : (
              filteredOptions.map((opt) => (
                <div
                  key={opt.value}
                  className={`px-3 py-2 text-sm font-medium cursor-pointer transition ${
                    String(opt.value) === String(value)
                      ? "bg-indigo-500/20 text-indigo-400 font-bold"
                      : "hover:bg-white/5 text-themed"
                  }`}
                  onClick={() => {
                    onChange({ target: { value: opt.value } });
                    setIsOpen(false);
                  }}
                >
                  {opt.label}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
