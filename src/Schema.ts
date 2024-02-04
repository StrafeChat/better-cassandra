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

export type SchemaOptionsFieldType<T> =
  | keyof FieldTypeMap<T>
  | `set<${keyof FieldTypeMap<T>}>`
  | `list<${keyof FieldTypeMap<T>}>`
  | `map<${keyof FieldTypeMap<T>},${keyof FieldTypeMap<T>}>`
  | FrozenType;

export class FrozenType {
  constructor(public readonly udt: string) {}
}

export interface SchemaOptionsField<T> {
  partitionKey?: boolean;
  cluseringKey?: boolean;
  type: SchemaOptionsFieldType<T>;
}

export interface UDTSchemaOptionsField<T> {
  type: SchemaOptionsField<T>["type"];
}

export type Query<T> = keyof T;

export type SchemaDefinition<T> = {
  [key in keyof T]: SchemaOptionsField<T>;
};

interface SchemaOptions<T> {
  sortBy: {
    column: keyof T;
    order: "ASC" | "DESC";
  };
}

export type UDTSchemaDefinition<T> = {
  [key in keyof T]: { type: SchemaOptionsField<T>["type"] };
};

export type MVSchemaDefinition<T> = {
  [key in keyof Partial<T>]: { type: SchemaOptionsField<T>["type"] };
}

export class Schema<T> {
  constructor(
    public readonly definition: SchemaDefinition<T>,
    public readonly options?: SchemaOptions<T>
  ) {}
};

export class UDTSchema<T> {
  constructor(public readonly definition: UDTSchemaDefinition<T>) {};
}

export class MVSchema<T> {
  constructor(public readonly definition: MVSchemaDefinition<T>) {};
}
