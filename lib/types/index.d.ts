export type WhereClause<T> = {
    [K in keyof Partial<T>]: {
        equals?: [K, Partial<T>[K]];
        notEquals?: [K, Partial<T>[K]];
        in?: [K, Partial<T>[K][]];
        notIn?: [K, Partial<T>[K][]];
        greaterThanOrEqual?: [K, Partial<T>[K]];
        lessThanOrEqual?: [K, Partial<T>[K]];
        moreThan?: [K, Partial<T>[K]];
        lessThan?: [K, Partial<T>[K]];
        contains?: [K, Partial<T>[K]];
        notContains?: [K, Partial<T>[K]];
    };
}[keyof Partial<T>];
