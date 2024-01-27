export interface FieldTypeMap<T> {
    ascii: string;
    bigint: number;
    blob: any;
    boolean: boolean;
    counter: number;
    date: number | string;
    decimal: number;
    double: number;
    duration: number;
    float: number;
    inet: string;
    int: number;
    smallint: number;
    text: string;
    time: number | string;
    timestamp: number | string;
    timeuuid: string;
    tinyint: number;
    uuid: string;
    varchar: string;
    varint: string;
}
export type SchemaOptionsFieldType<T> = keyof FieldTypeMap<T> | `set<${keyof FieldTypeMap<T>}>` | `list<${keyof FieldTypeMap<T>}>` | `map<${keyof FieldTypeMap<T>},${keyof FieldTypeMap<T>}>` | FrozenType;
export declare class FrozenType {
    readonly udt: string;
    constructor(udt: string);
}
export interface SchemaOptionsField<T> {
    partitionKey?: boolean;
    cluseringKey?: boolean;
    type: SchemaOptionsFieldType<T>;
}
export interface UDTSchemaOptionsField<T> {
    type: SchemaOptionsField<T>["type"];
}
interface DefaultFields {
    id: SchemaOptionsField<any>;
    created_at: SchemaOptionsField<any>;
    edited_at: SchemaOptionsField<any>;
}
export type Query<T> = Partial<keyof DefaultFields> | keyof T;
export type SchemaDefinition<T> = {
    [key in keyof Omit<T, keyof DefaultFields>]: SchemaOptionsField<T>;
} & {
    id?: SchemaOptionsField<T> | null;
    created_at?: (SchemaOptionsField<T> & {
        type: "timestamp";
    }) | null;
    edited_at?: (SchemaOptionsField<T> & {
        type: "timestamp";
    }) | null;
};
interface SchemaOptions<T> {
    sortBy: {
        column: keyof T;
        order: "ASC" | "DESC";
    };
}
export type UDTSchemaDefinition<T> = {
    [key in keyof T]: {
        type: SchemaOptionsField<T>["type"];
    };
};
export type MVSchemaDefinition<T> = {
    [key in keyof Partial<T>]: {
        type: SchemaOptionsField<T>["type"];
    };
} & {
    id?: SchemaOptionsField<T> | null;
    created_at?: (SchemaOptionsField<T> & {
        type: "timestamp";
    }) | null;
    edited_at?: (SchemaOptionsField<T> & {
        type: "timestamp";
    }) | null;
};
export declare class Schema<T> {
    readonly definition: SchemaDefinition<T>;
    readonly options?: SchemaOptions<T> | undefined;
    constructor(definition: SchemaDefinition<T>, options?: SchemaOptions<T> | undefined);
}
export declare class UDTSchema<T> {
    readonly definition: UDTSchemaDefinition<T>;
    constructor(definition: UDTSchemaDefinition<T>);
}
export declare class MVSchema<T> {
    readonly definition: MVSchemaDefinition<T>;
    constructor(definition: MVSchemaDefinition<T>);
}
export {};
