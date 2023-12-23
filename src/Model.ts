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
  ) {}

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

    const fieldType = fieldOptions.type as
      | keyof Partial<Record<keyof FieldTypeMap<T>, string>>
      | FrozenType;

    if (fieldType instanceof FrozenType) {
      const type = this.client.types.get(fieldType.udt);
      if (!type)
        throw new Error(
          `Model "${this.name}" requires the "${fieldName}" user defined type which was not found!`
        );
      await type.load();
      return `${fieldName} frozen<${fieldType.udt}>`;
    } else if (typeMapping[fieldType]) {
      
      if (fieldOptions.partitionKey) this.primaryKey[0].push(fieldName);
      else if (fieldOptions.cluseringKey) this.primaryKey[1].push(fieldName);
      
      return `${fieldName} ${typeMapping[fieldType]}`;
    } else {
      throw new Error(`Unsupported field type: ${fieldType}`);
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
    try {
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
        `ALTER TABLE ${this.client.cassandara.keyspace}.${
          this.name
        }\n${queries.join("\n")};`
      );
    } catch (err) {
      this.client.logging.error(`Failed to alter table "${this.name}": ${err}`);
    }
  }

  /**
   * Removes the table from the database if it exists.
   */
  public async drop() {
    try {
      await this.client.cassandara.execute(
        `DROP TABLE IF EXISTS ${this.client.cassandara.keyspace}.${this.name};`
      );
      this.client.models.delete(this.name);
      this.client.logging.success(
        `Successfully dropped the table: "${this.name}"`
      );
    } catch (err) {
      this.client.logging.error(`Failed to drop table "${this.name}": ${err}`);
    }
  }

  /**
   * Create the table if it does not exist already. Better Cassandra already does this for you when you provide a `modelsPath`.
   * So there is no need to call this function unless neccessary.
   * @param client Better Cassandra Client.
   */
  public async load(client: Client) {
    try {
      this.client = client;
      const entries = Object.entries(this.schema.definition) as [
        string,
        SchemaOptionsField<T>
      ][];
      const columns: string[] = [];

      // Add columns for each entry in the schema.options
      for (const [key, value] of entries) {
        // Skip "edited_at" as it will be added separately
        if (key !== "edited_at") {
          columns.push(await this.getColumnDefinition(key, value));
        }
      }

      if (
        this.schema.definition.created_at == undefined ||
        this.schema.definition.created_at == null
      )
        columns.push(
          await this.getColumnDefinition("created_at", {
            cluseringKey: true,
            type: "timestamp",
          })
        );

      columns.push(
        await this.getColumnDefinition("edited_at", {
          partitionKey: false,
          type: "timestamp",
        })
      );

      if (
        this.schema.definition.id == undefined ||
        this.schema.definition.id == null
      )
        columns.push(
          await this.getColumnDefinition("id", {
            partitionKey: true,
            type: "uuid",
          })
        );

      await client.cassandara.execute(
        `CREATE TABLE IF NOT EXISTS ${client.cassandara.keyspace}.${this.name} (
          ${columns.join(",\n")},
          PRIMARY KEY ((${this.primaryKey[0].join(", ")})${
          this.primaryKey[1].length > 0
            ? `, ${this.primaryKey[1].join(", ")}`
            : ""
        })
        );`
      );
      client.models.set(this.name, this);
      client.logging.success(`Loaded model \`${this.name}\``);
    } catch (err) {
      client.logging.error(`Failed to load model "${this.name}": ${err}`);
    }
  }
}
