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
  created_at?: SchemaOptionsField<T> & { type: "timestamp" } | null;
  edited_at?: SchemaOptionsField<T> & { type: "timestamp" } | null;
};

interface SchemaOptions<T> {
  sortBy: {
    column: keyof T;
    order: "ASC" | "DESC";
  };
}

export type UDTSchemaOptions<T> = {
  [key in keyof T]: { type: SchemaOptionsField<T>["type"] };
};

export class Schema<T> {
  constructor(
    public readonly definition: SchemaDefinition<T>,
    public readonly options?: SchemaOptions<T>
  ) {}
}

export class UDTSchema<T> {
  constructor(public readonly options: UDTSchemaOptions<T>) {}
}
