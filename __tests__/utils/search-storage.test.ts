// __tests__/utils/search-storage.test.ts

/*
 * Tests for the search localStorage utility.
 * Verifies that recent searches and recent queries are stored, deduplicated,
 * capped at 5, ordered newest-first, and clearable independently.
 */

import {
  addRecentQuery,
  addRecentSearch,
  clearRecentQueries,
  clearRecentSearches,
  getRecentQueries,
  getRecentSearches,
} from "@/lib/utils/search-storage";
import { RecentSearch } from "@/types/app-types";

const makeItem = (
  id: string,
  kind: "user" | "community" = "user",
): RecentSearch => ({
  id,
  kind,
  name: `Name ${id}`,
  username: kind === "user" ? `user_${id}` : null,
  image: null,
});

beforeEach(() => {
  localStorage.clear();
});

// getRecentSearches

describe("getRecentSearches", () => {
  it("should return an empty array when nothing is stored", () => {
    expect(getRecentSearches()).toEqual([]);
  });

  it("should return stored items", () => {
    const item = makeItem("u1");
    addRecentSearch(item);
    expect(getRecentSearches()).toHaveLength(1);
    expect(getRecentSearches()[0].id).toBe("u1");
  });
});

// addRecentSearch

describe("addRecentSearch", () => {
  it("should prepend new items so the most recent is first", () => {
    addRecentSearch(makeItem("a"));
    addRecentSearch(makeItem("b"));
    addRecentSearch(makeItem("c"));

    const stored = getRecentSearches();
    expect(stored[0].id).toBe("c");
    expect(stored[1].id).toBe("b");
    expect(stored[2].id).toBe("a");
  });

  it("should deduplicate: re-adding an existing item moves it to the top", () => {
    addRecentSearch(makeItem("a"));
    addRecentSearch(makeItem("b"));
    addRecentSearch(makeItem("a")); // re-add

    const stored = getRecentSearches();
    expect(stored).toHaveLength(2);
    expect(stored[0].id).toBe("a");
    expect(stored[1].id).toBe("b");
  });

  it("should keep user and community items with the same id as separate entries", () => {
    addRecentSearch(makeItem("health", "user"));
    addRecentSearch(makeItem("health", "community"));

    // Different kind - not a duplicate
    expect(getRecentSearches()).toHaveLength(2);
  });

  it("should cap the list at 5 items, dropping the oldest", () => {
    ["a", "b", "c", "d", "e", "f"].forEach((id) =>
      addRecentSearch(makeItem(id)),
    );

    const stored = getRecentSearches();
    expect(stored).toHaveLength(5);
    // "a" was the oldest and should be evicted
    expect(stored.map((s) => s.id)).not.toContain("a");
    expect(stored[0].id).toBe("f");
  });
});

// clearRecentSearches

describe("clearRecentSearches", () => {
  it("should remove all stored recent searches", () => {
    addRecentSearch(makeItem("a"));
    addRecentSearch(makeItem("b"));
    clearRecentSearches();
    expect(getRecentSearches()).toEqual([]);
  });

  it("should not affect stored recent queries", () => {
    addRecentSearch(makeItem("a"));
    addRecentQuery("fatigue");
    clearRecentSearches();

    expect(getRecentSearches()).toEqual([]);
    expect(getRecentQueries()).toHaveLength(1);
  });
});

// getRecentQueries

describe("getRecentQueries", () => {
  it("should return an empty array when nothing is stored", () => {
    expect(getRecentQueries()).toEqual([]);
  });

  it("should return stored query strings", () => {
    addRecentQuery("fatigue");
    expect(getRecentQueries()).toEqual(["fatigue"]);
  });
});

// addRecentQuery

describe("addRecentQuery", () => {
  it("should prepend queries so the most recent is first", () => {
    addRecentQuery("fatigue");
    addRecentQuery("pain");
    addRecentQuery("energy");

    expect(getRecentQueries()[0]).toBe("energy");
  });

  it("should deduplicate identical queries", () => {
    addRecentQuery("fatigue");
    addRecentQuery("pain");
    addRecentQuery("fatigue");

    const stored = getRecentQueries();
    expect(stored).toHaveLength(2);
    expect(stored[0]).toBe("fatigue");
  });

  it("should cap at 5 queries, dropping the oldest", () => {
    ["a", "b", "c", "d", "e", "f"].forEach((q) => addRecentQuery(q));

    const stored = getRecentQueries();
    expect(stored).toHaveLength(5);
    expect(stored).not.toContain("a");
    expect(stored[0]).toBe("f");
  });
});

// clearRecentQueries

describe("clearRecentQueries", () => {
  it("should remove all stored queries", () => {
    addRecentQuery("fatigue");
    clearRecentQueries();
    expect(getRecentQueries()).toEqual([]);
  });

  it("should not affect stored recent searches", () => {
    addRecentSearch(makeItem("u1"));
    addRecentQuery("fatigue");
    clearRecentQueries();

    expect(getRecentQueries()).toEqual([]);
    expect(getRecentSearches()).toHaveLength(1);
  });
});
