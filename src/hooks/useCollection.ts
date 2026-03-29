import { useState, useEffect, useMemo, useCallback } from 'react';
import { db } from '../db/database';
import { updatePurchasePrice } from '../db/operations';
import type { CollectionItem, SortConfig } from '../db/types';

export function useCollection() {
  const [items, setItems] = useState<CollectionItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    field: 'dateAdded',
    direction: 'desc',
  });
  const [isLoading, setIsLoading] = useState(true);

  const loadItems = useCallback(async () => {
    try {
      const allItems = await db.collection.toArray();
      setItems(allItems);
    } catch (error) {
      console.error('Failed to load collection:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const filteredAndSortedItems = useMemo(() => {
    let result = [...items];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(
        (item) =>
          item.artist.toLowerCase().includes(query) ||
          item.title.toLowerCase().includes(query)
      );
    }

    result.sort((a, b) => {
      const { field, direction } = sortConfig;
      const multiplier = direction === 'asc' ? 1 : -1;

      let aVal: string | number | null;
      let bVal: string | number | null;

      if (field === 'purchasePrice') {
        aVal = a.purchasePrice;
        bVal = b.purchasePrice;
        if (aVal === null && bVal === null) return 0;
        if (aVal === null) return 1;
        if (bVal === null) return -1;
        return (aVal - bVal) * multiplier;
      }

      aVal = a[field] ?? '';
      bVal = b[field] ?? '';

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return aVal.localeCompare(bVal) * multiplier;
      }

      return 0;
    });

    return result;
  }, [items, searchQuery, sortConfig]);

  const handleSort = useCallback(
    (field: SortConfig['field']) => {
      setSortConfig((prev) => {
        if (prev.field === field) {
          if (prev.direction === 'asc') {
            return { field, direction: 'desc' };
          }
          return { field: 'dateAdded', direction: 'desc' };
        }
        return { field, direction: 'asc' };
      });
    },
    []
  );

  const handleUpdatePrice = useCallback(
    async (id: number, price: number | null) => {
      await updatePurchasePrice(id, price);
      setItems((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, purchasePrice: price } : item
        )
      );
    },
    []
  );

  const priceTotal = useMemo(() => {
    return filteredAndSortedItems.reduce(
      (sum, item) => sum + (item.purchasePrice ?? 0),
      0
    );
  }, [filteredAndSortedItems]);

  return {
    items: filteredAndSortedItems,
    totalCount: items.length,
    filteredCount: filteredAndSortedItems.length,
    isLoading,
    searchQuery,
    setSearchQuery,
    sortConfig,
    handleSort,
    handleUpdatePrice,
    refreshItems: loadItems,
    priceTotal,
  };
}
