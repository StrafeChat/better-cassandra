"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BatchUpdate = exports.BatchDelete = exports.BatchInsert = void 0;
const BatchInsert = ({ name, data }) => {
    const columns = Object.keys(data);
    const values = Object.values(data);
    return {
        query: `
        INSERT INTO {keyspace}.${name} (${columns.join(", ")})
        VALUES (${columns.map(() => '?').join(", ")})
        `,
        params: values
    };
};
exports.BatchInsert = BatchInsert;
const BatchDelete = ({ name, where, limit }) => {
    const conditions = [[], []];
    const conditionHandlers = {
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
        const [k, v] = args;
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
    };
};
exports.BatchDelete = BatchDelete;
const BatchUpdate = ({ name, set, where, limit }) => {
    const conditions = [[], []];
    const columns = Object.keys(set);
    const values = Object.values(set);
    const conditionHandlers = {
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
        const [k, v] = args;
        conditionHandlers[operator](k.toString(), v);
    }
    const limitClause = limit ? `LIMIT ${Math.max(1, Math.floor(limit))}` : '';
    return {
        query: `
        UPDATE {keyspace}.${name}
        SET ${columns.map((col) => `${col} = ?`).join(", ")}
        WHERE ${conditions[0].map((cond) => cond).join(" AND ")}
        ${limitClause};
        `,
        params: [...values, ...conditions[1]]
    };
};
exports.BatchUpdate = BatchUpdate;
