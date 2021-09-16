import { BaseEntity } from "@entitify/core";

export interface Options<T = BaseEntity> {
  sortBy?: keyof T;
  sortDirection?: "ASC" | "DESC";
  paginate?: boolean;
  take?: number;
}

export const defaultOptions: Options = {
  sortBy: "id",
  paginate: true,
  sortDirection: "ASC",
  take: 50
};
