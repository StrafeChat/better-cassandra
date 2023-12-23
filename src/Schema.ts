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

export class FrozenType {
    constructor(public readonly udt: string) { };
}

export interface SchemaOptionsField<T> {
    primaryKey?: boolean;
    type: | keyof FieldTypeMap<T>
    | `set<${keyof FieldTypeMap<T>}>`
    | `list<${keyof FieldTypeMap<T>}>`
    | `map<${keyof FieldTypeMap<T>},${keyof FieldTypeMap<T>}>` | FrozenType;
}

export interface UDTSchemaOptionsField<T> {
    type: SchemaOptionsField<T>["type"];
}

interface DefaultFields {
    id: SchemaOptionsField<any>;
    created_at: SchemaOptionsField<any>;
    edited_at: SchemaOptionsField<any>;
}

export type SchemaOptions<T> = {
    [key in keyof Omit<T, keyof DefaultFields>]: SchemaOptionsField<T>;
} & {
    id?: SchemaOptionsField<T> & { primaryKey: true };
    created_at?: SchemaOptionsField<T> & { type: 'timestamp' };
    edited_at?: SchemaOptionsField<T> & { type: 'timestamp' };
};

export type UDTSchemaOptions<T> = {
    [key in keyof T]: { type: SchemaOptionsField<T>["type"] };
}

export class Schema<T> {
    constructor(public readonly options: SchemaOptions<T>) { }
}

export class UDTSchema<T> {
    constructor(public readonly options: UDTSchemaOptions<T>) { };
}