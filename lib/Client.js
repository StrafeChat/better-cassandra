"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Client = void 0;
const cassandra_driver_1 = require("cassandra-driver");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
/**
 * The Better Cassandra Client for interacting with Cassandra.
 */
class Client {
    /**
     * Construct an instance of the Better Cassandra Client.
     * @param options Options for configuring Better Cassandra.
     */
    constructor(options) {
        var _a;
        this.options = options;
        /**
         * A map of all the user defined types.
         */
        this.types = new Map();
        /**
         * A map of all loaded models.
         */
        this.models = new Map();
        /**
         * A map of all loaded material views.
         */
        this.materialViews = new Map();
        this.cassandara = new cassandra_driver_1.Client(this.options);
        this.logging = (_a = this.options.logging) !== null && _a !== void 0 ? _a : {
            success: console.log,
            info: console.info,
            error: console.error,
        };
    }
    /**
     * Load all models and setup Better Cassandra.
     */
    connect() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.cassandara.connect();
            if (this.options.typesPath) {
                const files = fs_1.default.readdirSync(this.options.typesPath);
                for (const file of files) {
                    const filePath = path_1.default.join(this.options.typesPath, file);
                    let type;
                    if (path_1.default.extname(file) == ".ts")
                        type = require(filePath).default;
                    else if (path_1.default.extname(file) == ".js")
                        type = require(filePath);
                    else
                        return;
                    if (type && typeof type.init === "function") {
                        yield (() => __awaiter(this, void 0, void 0, function* () {
                            yield type.init(this);
                        }))();
                    }
                }
            }
            // if (!this.options.modelsPath) return;
            if (this.options.modelsPath) {
                const files = fs_1.default.readdirSync(this.options.modelsPath);
                for (const file of files) {
                    const filePath = path_1.default.join(this.options.modelsPath, file);
                    let model;
                    if (path_1.default.extname(file) == ".ts")
                        model = require(filePath).default;
                    else if (path_1.default.extname(file) == ".js")
                        model = require(filePath);
                    else
                        return;
                    if (model && typeof model.load === "function") {
                        yield (() => __awaiter(this, void 0, void 0, function* () {
                            yield model.load(this);
                        }))();
                    }
                }
            }
            if (this.options.materialViewsPath) {
                const files = fs_1.default.readdirSync(this.options.materialViewsPath);
                for (const file of files) {
                    const filePath = path_1.default.join(this.options.materialViewsPath, file);
                    let materialView;
                    if (path_1.default.extname(file) == ".ts")
                        materialView = require(filePath).default;
                    else if (path_1.default.extname(file) == ".js")
                        materialView = require(filePath);
                    else
                        return;
                    if (materialView && typeof materialView.load == "function") {
                        yield (() => __awaiter(this, void 0, void 0, function* () {
                            yield (materialView === null || materialView === void 0 ? void 0 : materialView.load(this));
                        }))();
                    }
                }
            }
        });
    }
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
    alterKeyspace(name, replication) {
        return __awaiter(this, void 0, void 0, function* () {
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
                    ${replication.datacenters.map((dc) => `'${dc.name}': ${dc.factor}`)}
                }`;
                    break;
                default:
                    throw new Error(`The only available replication strategies are 'SimpleStrategy' and 'NetworkTopologyStrategy'`);
            }
            query += replication.durableWrites
                ? `\n    AND DURABLE WRITES = ${replication.durableWrites};`
                : ";";
            yield this.cassandara.execute(query);
        });
    }
    batch(operations, { prepare } = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.cassandara.batch(operations.map((operation) => {
                return Object.assign(Object.assign({}, operation), { query: operation.query.replace("{keyspace}", this.cassandara.keyspace) });
            }), { prepare });
        });
    }
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
    createKeyspace(name, replication) {
        return __awaiter(this, void 0, void 0, function* () {
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
                    throw new Error(`The only available replication strategies are 'SimpleStrategy' and 'NetworkTopologyStrategy'`);
            }
            query += replication.durableWrites
                ? `\n    AND DURABLE WRITES = ${replication.durableWrites};`
                : ";";
            yield this.cassandara.execute(query);
        });
    }
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
    dropKeyspace(name) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.cassandara.execute(`DROP KEYSPACE ${name};`);
        });
    }
}
exports.Client = Client;
