import { BatchStatement } from "./Client";
import { WhereClause } from "./types";
export declare const BatchInsert: <T>({ name, data }: {
    name: string;
    data: Partial<Record<keyof T, T[keyof T]>>;
}) => BatchStatement;
export declare const BatchDelete: <T>({ name, where, limit }: {
    name: string;
    where: WhereClause<T>[];
    limit?: number | undefined;
}) => BatchStatement;
export declare const BatchUpdate: <T>({ name, set, where, limit }: {
    name: string;
    set: Partial<Record<keyof T, T[keyof T]>>;
    where: WhereClause<T>[];
    limit?: number | undefined;
}) => BatchStatement;
