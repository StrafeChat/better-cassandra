import { DseClientOptions, Client as CassandraClient } from "cassandra-driver";
import { Model } from "./Model";
import { UDT } from "./UDT";
import { MaterialView } from "./MaterialView";
interface Logger {
    success: (text: string) => void;
    info: (text: string) => void;
    error: (text: string) => void;
}
type KeyspaceReplication = ({
    class: "SimpleStrategy";
    factor: number;
} | {
    class: "NetworkTopologyStrategy";
    datacenters: {
        name: string;
        factor: number;
    }[];
}) & {
    durableWrites?: boolean;
};
export interface BatchStatement {
    query: string;
    params: any[];
}
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
     * Your path for loading your material views.
     */
    materialViewsPath?: string;
    /**
     * Set your preferred logging function. (Wraps text in a function)
     */
    logging?: Logger;
}
/**
 * The Better Cassandra Client for interacting with Cassandra.
 */
export declare class Client {
    private options;
    /**
     * Cassandra Driver Client
     */
    readonly cassandara: CassandraClient;
    /**
     * A map of all the user defined types.
     */
    readonly types: Map<string, UDT<any>>;
    /**
     * A map of all loaded models.
     */
    readonly models: Map<string, Model<any>>;
    /**
     * A map of all loaded material views.
     */
    readonly materialViews: Map<string, MaterialView<any>>;
    readonly logging: Logger;
    /**
     * Construct an instance of the Better Cassandra Client.
     * @param options Options for configuring Better Cassandra.
     */
    constructor(options: Options);
    /**
     * Load all models and setup Better Cassandra.
     */
    connect(): Promise<void>;
    /**
     * Alter the keyspace in the Cassandra database by modifying its replication strategy,
     * keyspace name, and other configuration options.
     *
     * @param {string} name - The name of the keyspace to be altered.
     * @param {KeyspaceReplication} replication - The replication strategy and configuration for the keyspace.
     *
     * @throws {Error} Throws an error if an unsupported replication strategy is provided.
     *
     * @example
     * // Alter keyspace with SimpleStrategy replication
     * await alterKeyspace('myKeyspace', { class: 'SimpleStrategy', factor: 3, durableWrites: true });
     *
     * // Alter keyspace with NetworkTopologyStrategy replication
     * await alterKeyspace('myKeyspace', {
     *   class: 'NetworkTopologyStrategy',
     *   datacenters: [
     *     { name: 'dc1', factor: 2 },
     *     { name: 'dc2', factor: 1 },
     *   ],
     *   durableWrites: false
     * });
     */
    alterKeyspace(name: string, replication: KeyspaceReplication): Promise<void>;
    batch(operations: BatchStatement[], { prepare }?: {
        prepare?: boolean;
    }): Promise<void>;
    /**
     * Create a new keyspace in the Cassandra database with the specified name and replication strategy.
     *
     * @param {string} name - The name of the keyspace to be created.
     * @param {KeyspaceReplication} replication - The replication strategy and configuration for the keyspace.
     *
     * @throws {Error} Throws an error if an unsupported replication strategy is provided.
     *
     * @example
     * // Create keyspace with SimpleStrategy replication
     * await createKeyspace('myKeyspace', { class: 'SimpleStrategy', factor: 3, durableWrites: true });
     *
     * // Create keyspace with NetworkTopologyStrategy replication
     * await createKeyspace('myKeyspace', {
     *   class: 'NetworkTopologyStrategy',
     *   datacenters: [
     *     { name: 'dc1', factor: 2 },
     *     { name: 'dc2', factor: 1 },
     *   ],
     *   durableWrites: false
     * });
     */
    createKeyspace(name: string, replication: KeyspaceReplication): Promise<void>;
    /**
     * Drop (delete) an existing keyspace in the Cassandra database.
     *
     * @param {string} name - The name of the keyspace to be dropped.
     *
     * @throws {Error} Throws an error if the keyspace does not exist or if there's an issue with the execution.
     *
     * @example
     * // Drop an existing keyspace
     * await dropKeyspace('myKeyspace');
     */
    dropKeyspace(name: string): Promise<void>;
}
export {};
