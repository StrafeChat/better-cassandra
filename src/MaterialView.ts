import { Client } from "./Client";

export interface MaterialViewOptions<T> {
  tableName: string;
  columns: {
    name: keyof T;
    primary?: boolean;
  }[];
  include?: (keyof T)[];
}

export class MaterialView<T> {
  public client!: Client;

  constructor(
    public readonly name: string,
    public readonly options: MaterialViewOptions<T> // schema?
  ) {}

  public async load(client: Client) {
    try {
      const partitionKey: (string | number | symbol)[][] = [[], []];

      for (const column of this.options.columns) {
        if (column.primary) partitionKey[0].push(column.name);
        else partitionKey[1].push(column.name);
      }
      this.client = client;

      const query = `
      CREATE MATERIALIZED VIEW IF NOT EXISTS ${client.cassandara.keyspace}.${
        this.name
      } AS
      SELECT ${
        this.options.include
          ? this.options.include.map((col) => col.toString()).join(", ")
          : "*"
      } FROM ${client.cassandara.keyspace}.${this.options.tableName}
      WHERE ${this.options.columns
        .map((key) => `${key.name.toString()} IS NOT NULL`)
        .join(" AND ")}
      PRIMARY KEY ((${partitionKey[0].map((key) => key).join(", ")}), ${partitionKey[1].map((key) => key).join(", ")});`;

      await client.cassandara.execute(query);

      client.materialViews.set(this.name, this);
      client.logging.success(`Loaded material view: \`${this.name}\``);
    } catch (error) {
      this.client.logging.error(
        `Error creating materialized view ${this.name}: ${error}`
      );
    }
  }
}
