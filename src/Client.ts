import { DseClientOptions, Client as CassandraClient } from "cassandra-driver";
import fs from "fs";
import path from "path";
import { Model } from "./Model";
import { UDT } from "./UDT";

interface Logger {
  success: (text: string) => void;
  info: (text: string) => void;
  error: (text: string) => void;
}

type KeyspaceReplication = (
  | {
      class: "SimpleStrategy";
      factor: number;
    }
  | {
      class: "NetworkTopologyStrategy";
      datacenters: { name: string; factor: number }[];
    }
) & {
  durableWrites?: boolean;
};

interface Options extends DseClientOptions {
  /**
   * Your path for loading your user defined types.
   */
  typesPath?: string;
  /**
   * Your path for loading your models.
   */
  modelsPath?: string;

  /**
   * Set your preferred logging function. (Wraps text in a function)
   */
  logging?: Logger;
  /**
   * Used for generating snowflake id's
   */
  epoch?: number;
}

/**
 * The Better Cassandra Client for interacting with Cassandra.
 */
export class Client {
  /**
   * Cassandra Driver Client
   */
  public readonly cassandara!: CassandraClient;

  /**
   * A map of all the user defined types.
   */
  public readonly types: Map<string, UDT<any>> = new Map<string, UDT<any>>();

  /**
   * A map of all loaded models.
   */
  public readonly models: Map<string, Model<any>> = new Map<
    string,
    Model<any>
  >();

  public readonly logging!: Logger;

  /**
   * Construct an instance of the Better Cassandra Client.
   * @param options Options for configuring Better Cassandra.
   */
  constructor(private options: Options) {
    this.cassandara = new CassandraClient(this.options);
    this.logging = this.options.logging ?? {
      success: console.log,
      info: console.info,
      error: console.error,
    };
  }

  /**
   * Load all models and setup Better Cassandra.
   */
  public async connect() {
    await this.cassandara.connect();
    if (this.options.typesPath) {
      const files = fs.readdirSync(this.options.typesPath);
      for (const file of files) {
        const filePath = path.join(this.options.typesPath, file);
        let type: UDT<any> | undefined;
        if (path.extname(file) == ".ts") type = require(filePath).default;
        else if (path.extname(file) == ".js") type = require(filePath);
        else return;

        if (type && typeof type.init === "function") {
          await (async () => {
            await type.init(this);
          })();
        }
      }
    }

    // if (!this.options.modelsPath) return;
    if (this.options.modelsPath) {
      const files = fs.readdirSync(this.options.modelsPath);
      for (const file of files) {
        const filePath = path.join(this.options.modelsPath, file);
        let model: Model<any> | undefined;
        if (path.extname(file) == ".ts") model = require(filePath).default;
        else if (path.extname(file) == ".js") model = require(filePath);
        else return;

        if (model && typeof model.load === "function") {
          await (async () => {
            await model.load(this);
          })();
        }
      }
    }
  }

  public async alterKeyspace(name: string, replication: KeyspaceReplication) {
    let query = `ALTER KEYSPACE ${name}\n`;
    switch (replication.class) {
      case "SimpleStrategy":
        query = `
            ALTER KEYSPACE ${name}
                WITH REPLICATION = {
                    'class': '${replication.class}',
                    'replication_factor': ${replication.factor}
                }`;
        break;
      case "NetworkTopologyStrategy":
        query = `
            ALTER KEYSPACE ${name}
                WITH REPLICATION = {
                    'class': '${replication.class}',
                    ${replication.datacenters.map(
                      (dc) => `'${dc.name}': ${dc.factor}`
                    )}
                }`;
        break;
      default:
        throw new Error(
          `The only available replication strategies are 'SimpleStrategy' and 'NetworkTopologyStrategy'`
        );
    }

    query += replication.durableWrites
      ? `\n    AND DURABLE WRITES = ${replication.durableWrites};`
      : ";";
    await this.cassandara.execute(query);
  }

  public async createKeyspace(name: string, replication: KeyspaceReplication) {
    let query = `CREATE KEYSPACE ${name}`;

    switch (replication.class) {
      case "SimpleStrategy":
        query += `
        WITH REPLICATION = {
            'class': '${replication.class}',
            'replication_factor': ${replication.factor}
        }`;
        break;
      case "NetworkTopologyStrategy":
        query = `
        WITH REPLICATION = {
            'class': '${replication.class}',
            ${replication.datacenters.map((dc) => `'${dc.name}': ${dc.factor}`)}
            }`;
        break;
      default:
        throw new Error(
          `The only available replication strategies are 'SimpleStrategy' and 'NetworkTopologyStrategy'`
        );
    }

    query += replication.durableWrites
      ? `\n    AND DURABLE WRITES = ${replication.durableWrites};`
      : ";";
    await this.cassandara.execute(query);
  }

  public async dropKeyspace(name: string) {
    await this.cassandara.execute(`DROP KEYSPACE ${name};`);
  }
}
