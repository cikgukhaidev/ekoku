import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { ArrowUpAZ, ArrowDownAZ, Search, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface SearchBarProps<T> {
  data: T[];
  searchKey: keyof T;
  onFilteredData: (filtered: T[]) => void;
  placeholder?: string;
}

function SearchBar<T>({ 
  data, 
  searchKey, 
  onFilteredData, 
  placeholder = "Cari..." 
}: SearchBarProps<T>) {
  const [query, setQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc" | "">("");

  useEffect(() => {
    const lowerCaseQuery = query.toLowerCase().trim();
    let results = data.filter((item) => {
      const value = item[searchKey];
      if (typeof value === 'string') {
        return value.toLowerCase().includes(lowerCaseQuery);
      }
      return false;
    });

    if (sortOrder === "asc") {
      results.sort((a, b) => {
        const aVal = a[searchKey];
        const bVal = b[searchKey];
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return aVal.localeCompare(bVal);
        }
        return 0;
      });
    } else if (sortOrder === "desc") {
      results.sort((a, b) => {
        const aVal = a[searchKey];
        const bVal = b[searchKey];
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return bVal.localeCompare(aVal);
        }
        return 0;
      });
    }

    onFilteredData(results);
  }, [query, sortOrder, data, searchKey, onFilteredData]);

  const clearSearch = () => {
    setQuery("");
  };

  return (
    <div className="flex items-center gap-2">
      {/* Search Bar with Icon */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder={placeholder}
          className="pl-9 pr-9"
          onChange={(e) => setQuery(e.target.value)}
          value={query}
        />
        {query && (
          <button
            onClick={clearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Sort Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" className="flex-shrink-0">
            {sortOrder === "asc" ? (
              <ArrowUpAZ className="h-4 w-4" />
            ) : sortOrder === "desc" ? (
              <ArrowDownAZ className="h-4 w-4" />
            ) : (
              <ArrowUpAZ className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={() => setSortOrder("asc")}
            className="flex justify-between items-center gap-2"
          >
            A ke Z
            <ArrowUpAZ className="h-4 w-4" />
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setSortOrder("desc")}
            className="flex justify-between items-center gap-2"
          >
            Z ke A
            <ArrowDownAZ className="h-4 w-4" />
          </DropdownMenuItem>
          {sortOrder && (
            <DropdownMenuItem
              onClick={() => setSortOrder("")}
              className="text-muted-foreground"
            >
              Reset
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export { SearchBar };
