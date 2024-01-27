import { BatchStatement } from "./Client";
import { WhereClause } from "./types";

export const BatchInsert = <T>({ name, data }: { name: string, data: Partial<Record<keyof T, T[keyof T]>> }): BatchStatement => {
    const columns = Object.keys(data);
    const values = Object.values(data) as Partial<T>[];

    return {
        query: `
        INSERT INTO {keyspace}.${name} (${columns.join(", ")})
        VALUES (${columns.map(() => '?').join(", ")})
        `,
        params: values
    }
}

export const BatchDelete = <T>({ name, where, limit }: { name: string, where: WhereClause<T>[], limit?: number }): BatchStatement => {
    const conditions: [string[], any[]] = [[], []];

    const conditionHandlers: Record<string, (key: string, value: any) => void> = {
        equals: (k, v) => conditions[0].push(`${k}=?`) && conditions[1].push(v),
        notEquals: (k, v) => conditions[0].push(`${k}=?`) && conditions[1].push(v),
        in: (k, v) => conditions[0].push(`${k} IN (${v.map(() => '?').join(", ")})`) && conditions[1].push(v),
        notIn: (k, v) => conditions[0].push(`${k} IN (${v.map(() => '?').join(", ")})`) && conditions[1].push(v),
        greaterThanOrEqual: (k, v) => conditions[0].push(`${k}>=?`) && conditions[1].push(v),
        lessThanOrEqual: (k, v) => conditions[0].push(`${k}<=?`) && conditions[1].push(v),
        contains: (k, v) => conditions[0].push(`${k} CONTAINS ?`) && conditions[1].push(v),
        notContains: (k, v) => conditions[0].push(`${k} DOES NOT CONTAIN ?`) && conditions[1].push(v),
    };

    for (const condition of where) {
        const [operator, args] = Object.entries(condition)[0];
        const [k, v] = args as [string, any];
        conditionHandlers[operator](k.toString(), v);
    }

    const limitClause = limit ? `LIMIT ${Math.max(1, Math.floor(limit))}` : '';

    return {
        query: `
        DELETE FROM {keyspace}.${name}
        WHERE ${conditions[0].map((cond) => cond).join(" AND ")}
        ${limitClause};
        `,
        params: conditions[1],
    }
}

export const BatchUpdate = <T>({ name, set, where, limit }: { name: string, set: Partial<Record<keyof T, T[keyof T]>>, where: WhereClause<T>[], limit?: number }): BatchStatement => {

    const conditions: [string[], any[]] = [[], []];
    const columns = Object.keys(set);
    const values = Object.values(set);

    const conditionHandlers: Record<string, (key: string, value: any) => void> = {
        equals: (k, v) => conditions[0].push(`${k}=?`) && conditions[1].push(v),
        notEquals: (k, v) => conditions[0].push(`${k}=?`) && conditions[1].push(v),
        in: (k, v) => conditions[0].push(`${k} IN (${v.map(() => '?').join(", ")})`) && conditions[1].push(v),
        notIn: (k, v) => conditions[0].push(`${k} IN (${v.map(() => '?').join(", ")})`) && conditions[1].push(v),
        greaterThanOrEqual: (k, v) => conditions[0].push(`${k}>=?`) && conditions[1].push(v),
        lessThanOrEqual: (k, v) => conditions[0].push(`${k}<=?`) && conditions[1].push(v),
        contains: (k, v) => conditions[0].push(`${k} CONTAINS ?`) && conditions[1].push(v),
        notContains: (k, v) => conditions[0].push(`${k} DOES NOT CONTAIN ?`) && conditions[1].push(v),
    };

    for (const condition of where) {
        const [operator, args] = Object.entries(condition)[0];
        const [k, v] = args as [string, any];
        conditionHandlers[operator](k.toString(), v);
    }

    const limitClause = limit ? `LIMIT ${Math.max(1, Math.floor(limit))}` : '';

    return {
        query: `
        UPDATE {keyspace}.${name}
        SET ${columns.map((col) => `${col} = ?`).join(" AND ")}
        WHERE ${conditions[0].map((cond) => cond).join(" AND ")}
        ${limitClause};
        `,
        params: [...values, ...conditions[1]]
    }
}