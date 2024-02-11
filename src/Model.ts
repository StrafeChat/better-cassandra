import { Client } from "./Client";
import {
  FieldTypeMap,
  FrozenType,
  Query,
  Schema,
  SchemaDefinition,
  SchemaOptionsField,
  SchemaOptionsFieldType,
} from "./Schema";
import { WhereClause } from "./types";

/**
 * A class used to perform actions on tables in Cassandra.
 */
export class Model<T> {
  /**
   * Instance of the Better Cassandra Client.
   */
  public client!: Client;
  public primaryKey: [string[], string[]] = [[], []];

  /**
   *
   * @param name The name of the model.
   * @param schema The schema that tells Better Cassandra what the table should look like and function.
   */
  constructor(
    public readonly name: string,
    public readonly schema: Schema<T>
  ) { }

  private async getColumnDefinition(
    fieldName: string,
    fieldOptions: SchemaOptionsField<T>
  ): Promise<string> {
    const typeMapping: Partial<Record<keyof FieldTypeMap<T>, string>> = {
      ascii: "ascii",
      bigint: "bigint",
      blob: "blob",
      boolean: "boolean",
      counter: "counter",
      date: "date",
      decimal: "decimal",
      double: "double",
      duration: "duration",
      float: "float",
      inet: "inet",
      int: "int",
      smallint: "smallint",
      text: "text",
      time: "time",
      timestamp: "timestamp",
      timeuuid: "timeuuid",
      tinyint: "tinyint",
      uuid: "uuid",
      varchar: "varchar",
      varint: "varint",
    };

    const fieldType = fieldOptions.type as keyof Partial<Record<keyof FieldTypeMap<T>, string>> | FrozenType;

    if (fieldType instanceof FrozenType) {
      let startPos = fieldType.udt.indexOf("<") + 1;
      let endPos = fieldType.udt.indexOf(">");

      const type = this.client.types.get(fieldType.udt) || this.client.types.get(fieldType.udt.substring(startPos, endPos));
      if (!type)
        throw new Error(
          `Model "${this.name}" requires the "${fieldType.udt}" user defined type which was not found!`
        );
      await type.load();
      return `${fieldName} frozen<${fieldType.udt}>`;
    } else {
      let startPos = fieldType.indexOf("<") + 1;
      let endPos = fieldType.indexOf(">");

      if (typeMapping[fieldType] || typeMapping[fieldType.substring(startPos, endPos) as keyof Partial<Record<keyof FieldTypeMap<T>, string>>]) {
        if (fieldOptions.partitionKey) this.primaryKey[0].push(fieldName);
        else if (fieldOptions.cluseringKey) this.primaryKey[1].push(fieldName);
        return `${fieldName} ${typeMapping[fieldType] || fieldType.split('<')[0] + '<' + typeMapping[fieldType.substring(startPos, endPos) as keyof Partial<Record<keyof FieldTypeMap<T>, string>>] + '>'}`;
      } else throw new Error(`Unsupported field type: ${fieldType}`);
    }
  }

  /**
   * Modify the structure of a Cassandra table by performing alterations such as changing column types,
   * adding new columns, dropping columns, and renaming columns.
   *
   * @param {Object} options - The alteration options.
   * @param {Object} options.$alter - Object containing alteration details.
   *   @property {Query<T>} column - The column to alter.
   *   @property {SchemaOptionsFieldType<T>} type - The new type for the column.
   * @param {Array<Object>} options.$add - Array of objects representing columns to add.
   *   Each object should have a single property representing the column name and its partial schema definition.
   * @param {Array<Query<T>>} options.$drop - Array of columns to drop from the table.
   * @param {Array<[Query<T>, string]>} options.$rename - Array used to rename a single column.
   *
   * @throws {Error} Throws an error if the alteration fails.
   *
   * @example
   * // Alter column type
   * await model.alter({ $alter: { column: 'column_name', type: 'new_column_type' } });
   *
   * // Add new columns
   * await model.alter({ $add: [{ new_column: { type: 'text' } }, { another_column: { type: 'int' } }] });
   *
   * // Drop columns
   * await model.alter({ $drop: ['column_to_drop', 'another_column_to_drop'] });
   *
   * // Rename columns
   * await model.alter({ $rename: ['old_column_name', 'new_column_name'] });
   *
   */
  public async alter({
    $alter,
    $add,
    $drop,
    $rename,
  }: {
    /**
     * Object containing alteration details.
     * @property {Query<T>} column - The column to alter.
     * @property {SchemaOptionsFieldType<T>} type - The new type for the column.
     * @deprecated - Cassandra dropped support for altering column types in Cassandra 3.10
     */
    $alter?: { column: Query<T>; type: SchemaOptionsFieldType<T> };
    $add?: Partial<SchemaDefinition<T>>[];
    $drop?: Query<T>[];
    $rename?: [Query<T>, string];
  }) {
    const queries: string[] = [];

    if ($alter)
      queries.push(`ALTER ${$alter.column.toString()} TYPE ${$alter.type}`);

    if ($add && $add.length > 0) {
      queries.push(
        `ADD ${$add
          .map((definition) => {
            const key = Object.keys(definition)[0] as keyof Partial<
              SchemaDefinition<T>
            >;
            return `${key.toString()} ${definition[key]?.type}`;
          })
          .join(", ")}`
      );
    }

    if ($drop && $drop.length > 0) queries.push(`DROP ${$drop.join(", ")}`);
    if ($rename && $rename.length > 1)
      queries.push(`RENAME ${$rename[0].toString()} TO ${$rename[1]}`);

    await this.client.cassandara.execute(
      `ALTER TABLE ${this.client.cassandara.keyspace}.${this.name
      }\n${queries.join("\n")};`
    );
  }

  /**
   * Count the number of records in the Cassandra table based on specified conditions.
   *
   * @async
   * @param {Object} params - Parameters for counting records.
   * @param {WhereClause[]} params.$where - An array of conditions specifying how to filter records.
   * @param {number} [params.$limit] - The maximum number of records to count. If provided, it is used in the LIMIT clause.
   * @param {boolean} [params.$prepare] - Indicates whether to prepare the statement. Defaults to `false`.
   * @returns {Promise<number>} - A Promise that resolves to the count of records based on the specified conditions.
   * @throws {Error} Throws an error if the execution fails or if invalid parameters are provided.
   *
   * @typedef {Object} WhereClause
   * @property {string} equals - Equals operator. Example: { equals: ['columnName', 'value'] }
   * @property {string} notEquals - Not equals operator. Example: { notEquals: ['columnName', 'value'] }
   * @property {string} in - In operator. Example: { in: ['columnName', ['value1', 'value2']] }
   * @property {string} notIn - Not in operator. Example: { notIn: ['columnName', ['value1', 'value2']] }
   * @property {string} greaterThanOrEqual - Greater than or equal operator. Example: { greaterThanOrEqual: ['columnName', 'value'] }
   * @property {string} lessThanOrEqual - Less than or equal operator. Example: { lessThanOrEqual: ['columnName', 'value'] }
   * @property {string} contains - Contains operator. Example: { contains: ['columnName', 'value'] }
   * @property {string} notContains - Does not contain operator. Example: { notContains: ['columnName', 'value'] }
   */
  public async count({ $where, $limit, $prepare }: { $where: WhereClause<T>[], $limit?: number, $prepare?: boolean }) {
    const conditions: [string[], any[]] = [[], []];

    const conditionHandlers: Record<string, (key: string, value: any) => void> = {
      equals: (k, v) => conditions[0].push(`${k}=?`) && conditions[1].push(v),
      notEquals: (k, v) => conditions[0].push(`${k}=?`) && conditions[1].push(v),
      in: (k, v) => conditions[0].push(`${k} IN ?`) && conditions[1].push(v),
      notIn: (k, v) => conditions[0].push(`${k} NOT IN ?`) && conditions[1].push(v),
      greaterThanOrEqual: (k, v) => conditions[0].push(`${k}>=?`) && conditions[1].push(v),
      lessThanOrEqual: (k, v) => conditions[0].push(`${k}<=?`) && conditions[1].push(v),
      contains: (k, v) => conditions[0].push(`${k} CONTAINS ?`) && conditions[1].push(v),
      notContains: (k, v) => conditions[0].push(`${k} DOES NOT CONTAIN ?`) && conditions[1].push(v),
    };


    for (const condition of $where) {
      const [operator, args] = Object.entries(condition)[0];
      const [k, v] = args as [string, any];
      conditionHandlers[operator](k.toString(), v);
    }

    const limitClause = $limit ? `LIMIT ${Math.max(1, Math.floor($limit))}` : '';

    const data = await this.client.cassandara.execute(`
      SELECT COUNT(*) 
      FROM ${this.client.cassandara.keyspace}.${this.name}
      WHERE ${conditions[0].map((cond) => cond).join(" AND ")}
      ${limitClause};`, conditions[1], { prepare: $prepare });

    return data.rows[0].get("count").high as number;
  }

  /**
   * Performs a DELETE operation on the Cassandra table based on specified conditions.
   *
   * @async
   * @param {Object} params - Parameters for the DELETE operation.
   * @param {WhereClause<T>[]} params.$where - An array of conditions specifying how to filter records.
   * @param {number} [params.$limit] - The maximum number of records to delete. If provided, it is used in the LIMIT clause.
   * @param {boolean} [params.$prepare] - Indicates whether to prepare the statement. Defaults to `false`.
   * @throws {Error} Throws an error if the execution fails or if invalid parameters are provided.
   *
   * @typedef {Object} WhereClause
   * @property {string} equals - Equals operator. Example: { equals: ['columnName', 'value'] }
   * @property {string} notEquals - Not equals operator. Example: { notEquals: ['columnName', 'value'] }
   * @property {string} in - In operator. Example: { in: ['columnName', ['value1', 'value2']] }
   * @property {string} notIn - Not in operator. Example: { notIn: ['columnName', ['value1', 'value2']] }
   * @property {string} greaterThanOrEqual - Greater than or equal operator. Example: { greaterThanOrEqual: ['columnName', 'value'] }
   * @property {string} lessThanOrEqual - Less than or equal operator. Example: { lessThanOrEqual: ['columnName', 'value'] }
   * @property {string} contains - Contains operator. Example: { contains: ['columnName', 'value'] }
   * @property {string} notContains - Does not contain operator. Example: { notContains: ['columnName', 'value'] }
   */
  public async delete({ $where, $limit, $prepare }: { $where: WhereClause<T>[], $limit?: number, $prepare?: boolean }) {
    const conditions: [string[], any[]] = [[], []];

    const conditionHandlers: Record<string, (key: string, value: any) => void> = {
      equals: (k, v) => conditions[0].push(`${k}=?`) && conditions[1].push(v),
      notEquals: (k, v) => conditions[0].push(`${k}=?`) && conditions[1].push(v),
      in: (k, v) => conditions[0].push(`${k} IN ?`) && conditions[1].push(v),
      notIn: (k, v) => conditions[0].push(`${k} NOT IN ?`) && conditions[1].push(v),
      greaterThanOrEqual: (k, v) => conditions[0].push(`${k}>=?`) && conditions[1].push(v),
      lessThanOrEqual: (k, v) => conditions[0].push(`${k}<=?`) && conditions[1].push(v),
      contains: (k, v) => conditions[0].push(`${k} CONTAINS ?`) && conditions[1].push(v),
      notContains: (k, v) => conditions[0].push(`${k} DOES NOT CONTAIN ?`) && conditions[1].push(v),
    };

    for (const condition of $where) {
      const [operator, args] = Object.entries(condition)[0];
      const [k, v] = args as [string, any];
      conditionHandlers[operator](k.toString(), v);
    }

    const limitClause = $limit ? `LIMIT ${Math.max(1, Math.floor($limit))}` : '';

    await this.client.cassandara.execute(`
      DELETE FROM ${this.client.cassandara.keyspace}.${this.name}
      WHERE ${conditions[0].map((cond) => cond).join(" AND ")}
      ${limitClause};`, conditions[1], { prepare: $prepare });
  }

  /**
   * Removes the table from the database if it exists.
   */
  public async drop() {
    await this.client.cassandara.execute(`DROP TABLE IF EXISTS ${this.client.cassandara.keyspace}.${this.name};`);
    this.client.models.delete(this.name);
    this.client.logging.success(
      `Successfully dropped the table: "${this.name}"`
    );
  }

  /**
   * Select data from the table
   *
   * @param {Object} options - Options for the SELECT query.
   * @param {Array.<string>} options.$include - Optional array of columns to include in the SELECT query.
   * @param {Array.<Object>} options.$where - Array of conditions for the WHERE clause.
   * @param {number} options.$limit - Optional limit for the number of results to retrieve.
   * @param {boolean} options.$prepare - Optional flag indicating whether to prepare the statement (default: true).
   *
   * @throws {Error} If the SELECT query execution fails.
   *
   * @example
   * const result = await myTable.select({
   *   $include: ['column1', 'column2'],
   *   $where: [
   *     { equals: ['column3', 'value'] },
   *     { greaterThanOrEqual: ['column4', 42] },
   *     { in: ['column5', [1, 2, 3]] },
   *   ],
   *   $limit: 10,
   *   $prepare: true,
   * });
   */
  public async select({ $include, $where, $limit, $prepare }: { $include?: (keyof T)[], $where: WhereClause<T>[], $limit?: number, $prepare?: boolean }) {
    const conditions: [string[], any[]] = [[], []];

    const conditionHandlers: Record<string, (key: string, value: any) => void> = {
      equals: (k, v) => conditions[0].push(`${k}=?`) && conditions[1].push(v),
      notEquals: (k, v) => conditions[0].push(`${k}=?`) && conditions[1].push(v),
      in: (k, v) => conditions[0].push(`${k} IN ?`) && conditions[1].push(v),
      notIn: (k, v) => conditions[0].push(`${k} NOT IN ?`) && conditions[1].push(v),
      greaterThanOrEqual: (k, v) => conditions[0].push(`${k}>=?`) && conditions[1].push(v),
      lessThanOrEqual: (k, v) => conditions[0].push(`${k}<=?`) && conditions[1].push(v),
      contains: (k, v) => conditions[0].push(`${k} CONTAINS ?`) && conditions[1].push(v),
      notContains: (k, v) => conditions[0].push(`${k} DOES NOT CONTAIN ?`) && conditions[1].push(v),
    };

    for (const condition of $where) {
      const [operator, args] = Object.entries(condition)[0];
      const [k, v] = args as [string, any];
      conditionHandlers[operator](k.toString(), v);
    }

    const limitClause = $limit ? `LIMIT ${Math.max(1, Math.floor($limit))}` : '';

    const data = await this.client.cassandara.execute(`
      SELECT ${$include ? $include.map((col) => col).join(", ") : '*'} 
      FROM ${this.client.cassandara.keyspace}.${this.name}
      WHERE ${conditions[0].map((cond) => cond).join(" AND ")}
      ${limitClause};`, conditions[1], { prepare: $prepare });

    return data.rows as unknown as Partial<T>[];
  }

  /**
   * Retrieves all rows from the database table associated with the model,
   * based on optional conditions and included columns.
   *
   * @param {Object} options - The options for the selection.
   * @param {Array<keyof T>} [options.$include] - Optional. An array of columns to include in the result.
   * @param {Array<WhereClause<T>>} options.$where - An array of conditions to filter the results.
   * @param {boolean} [options.$prepare] - Optional. Indicates whether to prepare the query.
   * 
   * @returns {Promise<Array<T | Partial<T>>> | null} A Promise that resolves to an array of retrieved rows,
   * or null if no rows match the specified conditions.
   * The result type dynamically adjusts based on the presence of $include.
   *
   * @throws {Error} If the selection operation fails, an error is logged.
   * 
   * @example
   * const results = await myTable.select({
   *   $include: ['column1', 'column2'],
   *   $where: [
   *     { equals: ['column3', 'value'] },
   *     { greaterThanOrEqual: ['column4', 42] },
   *     { in: ['column5', [1, 2, 3]] },
   *   ],
   *   $prepare: true,
   * });
   */
  public async selectAll({ $include, $where, $prepare }: { $include?: (keyof T)[], $where: WhereClause<T>[], $prepare?: boolean }) {
    const conditions: [string[], any[]] = [[], []];

    const conditionHandlers: Record<string, (key: string, value: any) => void> = {
      equals: (k, v) => conditions[0].push(`${k}=?`) && conditions[1].push(v),
      notEquals: (k, v) => conditions[0].push(`${k}=?`) && conditions[1].push(v),
      in: (k, v) => conditions[0].push(`${k} IN ?`) && conditions[1].push(v),
      notIn: (k, v) => conditions[0].push(`${k} NOT IN ?`) && conditions[1].push(v),
      greaterThanOrEqual: (k, v) => conditions[0].push(`${k}>=?`) && conditions[1].push(v),
      lessThanOrEqual: (k, v) => conditions[0].push(`${k}<=?`) && conditions[1].push(v),
      contains: (k, v) => conditions[0].push(`${k} CONTAINS ?`) && conditions[1].push(v),
      notContains: (k, v) => conditions[0].push(`${k} DOES NOT CONTAIN ?`) && conditions[1].push(v),
    };

    for (const condition of $where) {
      const [operator, args] = Object.entries(condition)[0];
      const [k, v] = args as [string, any];
      conditionHandlers[operator](k.toString(), v);
    }

    const data = await this.client.cassandara.execute(`
      SELECT ${$include ? $include.map((col) => col).join(", ") : '*'} 
      FROM ${this.client.cassandara.keyspace}.${this.name}
      WHERE ${conditions[0].map((cond) => cond).join(" AND ")}`, conditions[1], { prepare: $prepare });

    if (data.rowLength < 1) return null;

    if (!$include) return data.rows as T[];
    else return data.rows as unknown as Partial<T>[];
  }

  /**
   * Updates records in a Cassandra database table based on specified criteria.
   *
   * @param {Object} options - The options object containing update parameters.
   * @param {Partial<Record<keyof T, T[keyof T]>>} options.$set - The fields to be updated along with their new values.
   * @param {WhereClause<T>[]} options.$where - The conditions that records must meet to be updated.
   * @param {boolean} [options.$prepare] - Indicates whether to prepare the statement. Default is undefined.
   *  
   * @throws {Error} Throws an error if the Cassandra update query execution fails.
   * 
   * @example// Update user data where id is 1, setting the name to 'John' and age to 30
   * await update({
   *    $set: { name: 'John', age: 30 },
   *    $where: [{ equals: { id: 1 } }]
   *    $prepare: true
   * });
   */
  public async update({ $set, $where, $prepare }: { $set: Partial<Record<keyof T, T[keyof T]>>, $where: WhereClause<T>[], $prepare?: boolean }) {

    // SET NAME
    // SET DATA
    // WHERE NAME
    // WHERE DATA
    const conditions: [string[], any[], string[], any[]] = [
      [],
      [],
      [],
      []
    ];

    const entries = Object.entries($set);

    for (const entry of entries) {
      conditions[0].push(entry[0]);
      conditions[1].push(entry[1]);
    }

    const conditionHandlers: Record<string, (key: string, value: any) => void> = {
      equals: (k, v) => conditions[2].push(`${k}=?`) && conditions[3].push(v),
      notEquals: (k, v) => conditions[2].push(`${k}=?`) && conditions[3].push(v),
      in: (k, v) => conditions[2].push(`${k} IN ?`) && conditions[3].push(v),
      notIn: (k, v) => conditions[2].push(`${k} NOT IN ?`) && conditions[3].push(v),
      greaterThanOrEqual: (k, v) => conditions[2].push(`${k}>=?`) && conditions[3].push(v),
      lessThanOrEqual: (k, v) => conditions[2].push(`${k}<=?`) && conditions[3].push(v),
      contains: (k, v) => conditions[2].push(`${k} CONTAINS ?`) && conditions[3].push(v),
      notContains: (k, v) => conditions[2].push(`${k} DOES NOT CONTAIN ?`) && conditions[3].push(v),
    };

    for (const condition of $where) {
      const [operator, args] = Object.entries(condition)[0];
      const [k, v] = args as [string, any];
      conditionHandlers[operator](k.toString(), v);
    }

    await this.client.cassandara.execute(`
    UPDATE ${this.client.cassandara.keyspace}.${this.name}
    SET ${conditions[0].map((name) => `${name}=?`).join(", ")}
    WHERE ${conditions[2].map((cond) => cond).join(" AND ")}
    IF EXISTS;
    `, [...conditions[1], ...conditions[3]], { prepare: $prepare });
  }

  /**
   * Inserts data into the Cassandra table represented by this instance.
   *
   * @param {Partial<Record<keyof T, T[keyof T]>>} data - The data to be inserted, where keys are column names and values are corresponding values.
   * @returns {Promise<void>} - A promise that resolves when the insertion is successful and rejects on failure.
   * @throws {Error} If the insertion fails, an error is thrown with details.
   *
   * @example
   * const dataToInsert = {
   *   columnName1: value1,
   *   columnName2: value2,
   *   // ...
   * };
   * await yourInstance.insert(dataToInsert);
   */
  public async insert(data: Partial<Record<keyof T, T[keyof T]>>, { prepare }: { prepare?: boolean }) {
    const columns = Object.keys(data);
    const values = Object.values(data);

    await this.client.cassandara.execute(`
      INSERT INTO ${this.client.cassandara.keyspace}.${this.name} (${columns.join(", ")})
      VALUES (${columns.map(() => '?').join(", ")})
      IF NOT EXISTS;
      `, values, { prepare });
  }

  /**
   * Create the table if it does not exist already. Better Cassandra already does this for you when you provide a `modelsPath`.
   * So there is no need to call this function unless neccessary.
   * @param client Better Cassandra Client.
   */
  public async load(client: Client) {
    this.client = client;
    const entries = Object.entries(this.schema.definition) as [
      string,
      SchemaOptionsField<T>
    ][];
    const columns: string[] = [];

    // Add columns for each entry in the schema.options
    for (const [key, value] of entries) {
      columns.push(await this.getColumnDefinition(key, value));
    }

    await client.cassandara.execute(
      `CREATE TABLE IF NOT EXISTS ${client.cassandara.keyspace}.${this.name} (
          ${columns.join(",\n")},
          PRIMARY KEY ((${this.primaryKey[0].join(", ")})${this.primaryKey[1].length > 0
        ? `, ${this.primaryKey[1].join(", ")}`
        : ""
      })
        );`
    );
    client.models.set(this.name, this);
    client.logging.success(`Loaded model \`${this.name}\``);
  }
}
