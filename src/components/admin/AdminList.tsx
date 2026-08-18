"use client";

import { Fragment, type ReactNode } from "react";
import PageLoading from "@/components/PageLoading";
import Pagination from "./Pagination";

export interface AdminListPagination {
  page: number;
  totalPages: number;
  onGo: (page: number) => void;
}

export interface AdminListProps<T> {
  items: T[];
  loading?: boolean;
  getKey: (item: T) => string;
  renderRow: (item: T) => ReactNode;
  emptyMessage: string;
  emptyFilteredMessage?: string;
  isFiltered?: boolean;
  pagination?: AdminListPagination;
}

export default function AdminList<T>({
  items,
  loading,
  getKey,
  renderRow,
  emptyMessage,
  emptyFilteredMessage,
  isFiltered,
  pagination,
}: AdminListProps<T>) {
  if (loading) return <PageLoading />;

  if (items.length === 0) {
    return (
      <p className="text-sm text-center py-8" style={{ color: "var(--text-muted)" }}>
        {isFiltered && emptyFilteredMessage ? emptyFilteredMessage : emptyMessage}
      </p>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {items.map((item) => (
          <Fragment key={getKey(item)}>{renderRow(item)}</Fragment>
        ))}
      </div>
      {pagination && <Pagination {...pagination} />}
    </>
  );
}
